<?php

namespace App\Services;

use App\Models\Contact;
use App\Models\Lead;
use App\Models\LeadImport;
use App\Models\Pipeline;
use App\Models\PipelineStage;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class LeadImportService
{
    /**
     * Colunas esperadas no arquivo de importação.
     */
    public const EXPECTED_COLUMNS = [
        'nome',
        'email',
        'telefone',
        'empresa',
        'cargo',
        'origem',
        'valor_estimado',
        'observacoes',
    ];

    protected LeadAssignmentService $assignmentService;

    public function __construct(LeadAssignmentService $assignmentService)
    {
        $this->assignmentService = $assignmentService;
    }

    /**
     * Processa a importação.
     */
    public function processImport(LeadImport $import): void
    {
        $import->markAsProcessing();

        try {
            $path = storage_path('app/imports/' . $import->filename);

            if (!file_exists($path)) {
                throw new \Exception("Arquivo de importação não encontrado: {$import->filename}");
            }

            $rows = $this->readCsvFile($path);
            $settings = $import->settings ?? [];
            $skipDuplicates = $settings['skip_duplicates'] ?? true;
            $distributeLeads = $settings['distribute_leads'] ?? false;
            $specificOwnerId = $settings['specific_owner_id'] ?? null;

            // Atualizar total de linhas
            $import->update(['total_rows' => count($rows)]);

            // Determinar modo de atribuição:
            // 1. Se tem owner específico -> todos os leads vão para ele
            // 2. Se distribute_leads = true -> Round-Robin entre vendedores
            // 3. Se nenhum dos dois -> leads ficam sem owner
            
            // Obter canal padrão do tenant (primeiro disponível)
            $defaultChannel = \App\Models\Channel::where('tenant_id', $import->tenant_id)->first();
            if (!$defaultChannel) {
                throw new \Exception("Nenhum canal configurado para este tenant. Configure um canal antes de importar leads.");
            }
            $channelId = $defaultChannel->id;

            $sellers = collect();
            $sellerIndex = 0;
            $sellerCount = 0;

            if ($specificOwnerId) {
                // Owner específico - todos os leads vão para este usuário
                $specificOwner = User::find($specificOwnerId);
                if ($specificOwner) {
                    $sellers = collect([$specificOwner]);
                    $sellerCount = 1;
                }
            } elseif ($distributeLeads) {
                // Round-Robin entre vendedores ativos
                $sellers = User::where('tenant_id', $import->tenant_id)
                    ->where('role', 'seller')
                    ->where('is_active', true)
                    ->get();
                $sellerCount = $sellers->count();
            }

            foreach ($rows as $index => $row) {
                try {
                    $this->processRow(
                        $import,
                        $row,
                        $index + 2, // +2 porque linha 1 é cabeçalho
                        $skipDuplicates,
                        $sellers,
                        $sellerIndex,
                        $sellerCount,
                        $channelId
                    );
                    
                    // Só incrementa o índice se for Round-Robin (não tem owner específico)
                    if ($sellerCount > 1 && !$specificOwnerId) {
                        $sellerIndex = ($sellerIndex + 1) % $sellerCount;
                    }
                } catch (\Exception $e) {
                    $import->addError($index + 2, $e->getMessage());
                    $import->incrementProcessed(false);
                    
                    Log::warning("Erro ao importar linha " . ($index + 2) . ": " . $e->getMessage());
                }
            }

            $import->markAsCompleted();

        } catch (\Exception $e) {
            Log::error("Erro ao processar importação: " . $e->getMessage());
            $import->markAsFailed([['row' => 0, 'message' => $e->getMessage()]]);
            throw $e;
        }
    }

    /**
     * Processa uma linha do arquivo.
     */
    protected function processRow(
        LeadImport $import,
        array $row,
        int $rowNumber,
        bool $skipDuplicates,
        $sellers,
        int $sellerIndex,
        int $sellerCount,
        string $channelId
    ): void {
        // Validar dados obrigatórios
        $name = trim($row['nome'] ?? '');
        $phone = $this->normalizePhone($row['telefone'] ?? '');
        $email = trim($row['email'] ?? '');

        if (empty($name)) {
            throw new \Exception("Nome é obrigatório");
        }

        if (empty($phone)) {
            throw new \Exception("Telefone é obrigatório");
        }

        // Verificar duplicidade por telefone
        if ($skipDuplicates) {
            $existingContact = Contact::where('tenant_id', $import->tenant_id)
                ->where('phone', $phone)
                ->first();

            if ($existingContact) {
                throw new \Exception("Telefone já cadastrado: {$phone}");
            }
        }

        DB::transaction(function () use (
            $import, $row, $name, $phone, $email,
            $sellers, $sellerIndex, $sellerCount, $channelId
        ) {
            // Criar contato
            $contact = Contact::create([
                'tenant_id' => $import->tenant_id,
                'name' => $name,
                'phone' => $phone,
                'email' => $email ?: null,
                'company' => trim($row['empresa'] ?? '') ?: null,
                'extra_data' => [
                    'position' => trim($row['cargo'] ?? '') ?: null,
                    'imported_at' => now()->toISOString(),
                    'import_id' => $import->id,
                ],
            ]);

            // Determinar owner (Round-Robin)
            $ownerId = null;
            if ($sellerCount > 0) {
                $ownerId = $sellers[$sellerIndex]->id;
            }

            // Criar lead
            $lead = Lead::create([
                'tenant_id' => $import->tenant_id,
                'contact_id' => $contact->id,
                'channel_id' => $channelId,
                'pipeline_id' => $import->pipeline_id,
                'stage_id' => $import->stage_id,
                'owner_id' => $ownerId,
                'value' => $this->parseValue($row['valor_estimado'] ?? null),
                'status' => \App\Enums\LeadStatusEnum::OPEN,
                'custom_fields' => [
                    'source' => trim($row['origem'] ?? '') ?: 'import',
                    'notes' => trim($row['observacoes'] ?? '') ?: null,
                ],
            ]);

            $import->incrementProcessed(true);
        });
    }

    /**
     * Lê arquivo CSV e retorna as linhas.
     */
    protected function readCsvFile(string $path): array
    {
        $rows = [];
        $headers = [];

        if (($handle = fopen($path, 'r')) !== false) {
            $lineNumber = 0;
            
            while (($data = fgetcsv($handle, 0, ';')) !== false) {
                $lineNumber++;
                
                // Primeira linha são os cabeçalhos
                if ($lineNumber === 1) {
                    foreach ($data as $header) {
                        $headers[] = $this->normalizeHeader($header);
                    }
                    continue;
                }

                // Pular linhas vazias
                if (empty(array_filter($data))) {
                    continue;
                }

                // Mapear dados com cabeçalhos
                $rowData = [];
                foreach ($data as $index => $value) {
                    $header = $headers[$index] ?? "col_{$index}";
                    $rowData[$header] = $this->cleanValue($value);
                }

                $rows[] = $rowData;
            }
            
            fclose($handle);
        }

        return $rows;
    }

    /**
     * Limpa o valor removendo caracteres especiais de encoding.
     */
    protected function cleanValue(?string $value): string
    {
        if (empty($value)) {
            return '';
        }

        // Detectar e converter encoding se necessário
        $encoding = mb_detect_encoding($value, ['UTF-8', 'ISO-8859-1', 'Windows-1252'], true);
        if ($encoding && $encoding !== 'UTF-8') {
            $value = mb_convert_encoding($value, 'UTF-8', $encoding);
        }

        return trim($value);
    }

    /**
     * Normaliza o nome do cabeçalho.
     */
    protected function normalizeHeader(?string $header): string
    {
        if (empty($header)) {
            return '';
        }

        // Limpar encoding
        $header = $this->cleanValue($header);
        
        $header = mb_strtolower($header);
        $header = str_replace(['ã', 'á', 'à', 'â'], 'a', $header);
        $header = str_replace(['é', 'ê', 'è'], 'e', $header);
        $header = str_replace(['í', 'î', 'ì'], 'i', $header);
        $header = str_replace(['ó', 'ô', 'ò', 'õ'], 'o', $header);
        $header = str_replace(['ú', 'û', 'ù'], 'u', $header);
        $header = str_replace('ç', 'c', $header);
        $header = preg_replace('/[^a-z0-9_]/', '_', $header);
        $header = preg_replace('/_+/', '_', $header);
        $header = trim($header, '_');

        return $header;
    }

    /**
     * Normaliza o número de telefone.
     */
    protected function normalizePhone(?string $phone): string
    {
        if (empty($phone)) {
            return '';
        }

        // Remove tudo exceto números
        $phone = preg_replace('/[^0-9]/', '', $phone);

        // Adiciona código do país se necessário
        if (strlen($phone) === 10 || strlen($phone) === 11) {
            $phone = '55' . $phone;
        }

        return $phone;
    }

    /**
     * Converte valor para float.
     */
    protected function parseValue($value): ?float
    {
        if (empty($value)) {
            return null;
        }

        if (is_numeric($value)) {
            return (float) $value;
        }

        // Remove formatação brasileira
        $value = str_replace('.', '', $value);
        $value = str_replace(',', '.', $value);
        $value = preg_replace('/[^0-9.]/', '', $value);

        return is_numeric($value) ? (float) $value : null;
    }

    /**
     * Gera o template CSV para download.
     */
    public function generateTemplate(): string
    {
        $filename = 'template_importacao_leads.csv';
        $path = storage_path('app/templates/' . $filename);
        
        if (!is_dir(dirname($path))) {
            mkdir(dirname($path), 0755, true);
        }

        $handle = fopen($path, 'w');
        
        // BOM para UTF-8 (ajuda Excel a reconhecer encoding)
        fwrite($handle, "\xEF\xBB\xBF");

        // Cabeçalhos
        fputcsv($handle, [
            'Nome',
            'Email',
            'Telefone',
            'Empresa',
            'Cargo',
            'Origem',
            'Valor Estimado',
            'Observações',
        ], ';');

        // Exemplos de dados
        $examples = [
            ['João Silva', 'joao@email.com', '11999998888', 'Empresa ABC', 'Gerente', 'Site', '5000', 'Interessado no produto X'],
            ['Maria Santos', 'maria@email.com', '21988887777', 'Empresa XYZ', 'Diretora', 'Indicação', '10000', 'Agendou reunião'],
            ['Pedro Oliveira', '', '31977776666', '', '', 'WhatsApp', '', ''],
        ];

        foreach ($examples as $example) {
            fputcsv($handle, $example, ';');
        }

        fclose($handle);

        return $path;
    }

    /**
     * Conta linhas do arquivo CSV.
     */
    public function countRows(string $path): int
    {
        $count = 0;
        
        if (($handle = fopen($path, 'r')) !== false) {
            while (($data = fgetcsv($handle)) !== false) {
                if (!empty(array_filter($data))) {
                    $count++;
                }
            }
            fclose($handle);
        }

        return max(0, $count - 1); // -1 para descontar cabeçalho
    }
}
