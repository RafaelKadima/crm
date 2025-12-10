<?php

namespace App\Http\Controllers;

use App\Jobs\ProcessLeadImport;
use App\Models\LeadImport;
use App\Models\PipelineStage;
use App\Services\LeadImportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class LeadImportController extends Controller
{
    public function __construct(
        protected LeadImportService $importService
    ) {}

    /**
     * Lista as importações do tenant.
     */
    public function index(Request $request): JsonResponse
    {
        $imports = LeadImport::with(['user:id,name', 'pipeline:id,name'])
            ->orderBy('created_at', 'desc')
            ->paginate(15);

        return response()->json($imports);
    }

    /**
     * Faz upload e inicia uma nova importação.
     * 
     * - Vendedor: importa para si mesmo automaticamente
     * - Admin/Gestor: pode escolher distribuir (Round-Robin) ou selecionar usuário específico
     * - Pipeline é sempre o padrão do sistema
     */
    public function store(Request $request): JsonResponse
    {
        $user = auth()->user();
        
        Log::info('LeadImport: Iniciando importação', [
            'user_id' => $user->id,
            'tenant_id' => $user->tenant_id,
            'role' => $user->role,
        ]);

        $isAdmin = in_array($user->role, ['admin', 'gestor', 'super_admin']);

        // Validação base
        $rules = [
            'file' => 'required|file|mimes:csv,txt|max:10240', // 10MB max
            'skip_duplicates' => 'boolean',
        ];

        // Admin pode escolher modo de distribuição e owner
        if ($isAdmin) {
            $rules['distribute_leads'] = 'boolean';
            $rules['owner_id'] = 'nullable|uuid|exists:users,id'; // Usuário específico
        }

        $request->validate($rules);

        try {
            $file = $request->file('file');
            
            // Gerar nome único para o arquivo
            $filename = Str::random(40) . '.csv';
            $relativePath = 'imports/' . $filename;
            $fullPath = storage_path('app/' . $relativePath);
            
            // Garantir que o diretório existe
            $directory = dirname($fullPath);
            if (!is_dir($directory)) {
                mkdir($directory, 0755, true);
            }
            
            // Mover o arquivo para o destino
            $file->move($directory, $filename);
            
            // Verificar se o arquivo foi salvo
            if (!file_exists($fullPath)) {
                Log::error('LeadImport: Arquivo não foi salvo', ['path' => $fullPath]);
                return response()->json([
                    'message' => 'Erro ao salvar arquivo',
                ], 500);
            }
            
            Log::info('LeadImport: Arquivo salvo', ['path' => $fullPath]);

            // Contar linhas
            $totalRows = $this->importService->countRows($fullPath);

            // Pipeline é sempre o padrão do sistema
            $pipelineId = $this->getDefaultPipelineId();
            
            Log::info('LeadImport: Pipeline selecionado', [
                'pipeline_id' => $pipelineId,
                'total_rows' => $totalRows,
                'filename' => $filename,
            ]);

            if (!$pipelineId) {
                return response()->json([
                    'message' => 'Nenhum pipeline configurado para este tenant',
                ], 422);
            }

            // Determinar owner baseado no tipo de usuário
            if ($isAdmin) {
                $distributeLeads = $request->boolean('distribute_leads', false);
                $specificOwnerId = $request->owner_id;
            } else {
                // Vendedor: sempre atribui a si mesmo
                $distributeLeads = false;
                $specificOwnerId = $user->id;
            }

            $stageId = $this->getFirstStageId($pipelineId);
            
            Log::info('LeadImport: Criando registro', [
                'pipeline_id' => $pipelineId,
                'stage_id' => $stageId,
                'distributeLeads' => $distributeLeads,
                'specificOwnerId' => $specificOwnerId,
            ]);

            $import = LeadImport::create([
                'tenant_id' => $user->tenant_id,
                'user_id' => $user->id,
                'pipeline_id' => $pipelineId,
                'stage_id' => $stageId,
                'filename' => $filename,
                'status' => 'pending',
                'total_rows' => $totalRows,
                'settings' => [
                    'distribute_leads' => $distributeLeads,
                    'skip_duplicates' => $request->boolean('skip_duplicates', true),
                    'specific_owner_id' => $specificOwnerId,
                    'original_filename' => $file->getClientOriginalName(),
                    'imported_by_role' => $user->role,
                ],
            ]);
            
            Log::info('LeadImport: Registro criado', ['import_id' => $import->id]);

            // Disparar job para processar em background
            ProcessLeadImport::dispatch($import);

            return response()->json([
                'message' => 'Importação iniciada com sucesso!',
                'import' => $import->load(['pipeline:id,name']),
            ], 201);

        } catch (\Exception $e) {
            Log::error('Erro ao iniciar importação', [
                'error' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString(),
            ]);
            
            return response()->json([
                'message' => 'Erro ao processar arquivo',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Obtém o pipeline padrão do tenant.
     */
    protected function getDefaultPipelineId(): string
    {
        return \App\Models\Pipeline::where('tenant_id', auth()->user()->tenant_id)
            ->where('is_default', true)
            ->value('id') 
            ?? \App\Models\Pipeline::where('tenant_id', auth()->user()->tenant_id)
                ->first()
                ?->id;
    }

    /**
     * Mostra o status de uma importação.
     */
    public function show(LeadImport $import): JsonResponse
    {
        $import->load(['user:id,name', 'pipeline:id,name', 'stage:id,name']);

        return response()->json([
            'import' => $import,
            'progress' => $import->progress,
        ]);
    }

    /**
     * Faz download do template de importação.
     */
    public function template(): BinaryFileResponse
    {
        $path = $this->importService->generateTemplate();

        return response()->download($path, 'template_importacao_leads.csv', [
            'Content-Type' => 'text/csv; charset=UTF-8',
        ]);
    }

    /**
     * Obtém o primeiro estágio de um pipeline.
     */
    protected function getFirstStageId(string $pipelineId): ?string
    {
        return PipelineStage::where('pipeline_id', $pipelineId)
            ->orderBy('order')
            ->value('id');
    }
}
