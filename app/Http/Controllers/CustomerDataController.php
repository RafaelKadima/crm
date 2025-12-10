<?php

namespace App\Http\Controllers;

use App\Models\CustomerData;
use App\Models\Lead;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CustomerDataController extends Controller
{
    /**
     * Obtém dados do cliente de um lead
     */
    public function show(Lead $lead): JsonResponse
    {
        $customerData = $lead->customerData;

        if (!$customerData) {
            return response()->json([
                'customer_data' => null,
                'lead' => [
                    'id' => $lead->id,
                    'contact' => $lead->contact,
                    'products' => $lead->products()->with('images')->get(),
                    'value' => $lead->value,
                ],
            ]);
        }

        return response()->json([
            'customer_data' => $customerData,
            'lead' => [
                'id' => $lead->id,
                'contact' => $lead->contact,
                'products' => $lead->products()->with('images')->get(),
                'value' => $lead->value,
            ],
        ]);
    }

    /**
     * Salva ou atualiza dados do cliente
     */
    public function store(Request $request, Lead $lead): JsonResponse
    {
        $validated = $request->validate([
            'cpf' => 'nullable|string|max:14',
            'cnpj' => 'nullable|string|max:18',
            'rg' => 'nullable|string|max:20',
            'birth_date' => 'nullable|date',
            'address' => 'nullable|string|max:255',
            'address_number' => 'nullable|string|max:20',
            'address_complement' => 'nullable|string|max:100',
            'neighborhood' => 'nullable|string|max:100',
            'city' => 'nullable|string|max:100',
            'state' => 'nullable|string|max:2',
            'zip_code' => 'nullable|string|max:10',
            'payment_method' => 'nullable|string|max:50',
            'installments' => 'nullable|integer|min:1|max:24',
            'notes' => 'nullable|string',
            'extra_data' => 'nullable|array',
        ]);

        $validated['lead_id'] = $lead->id;

        $customerData = CustomerData::updateOrCreate(
            ['lead_id' => $lead->id],
            $validated
        );

        return response()->json([
            'message' => 'Dados do cliente salvos com sucesso.',
            'customer_data' => $customerData,
        ]);
    }

    /**
     * Busca endereço pelo CEP (via ViaCEP)
     */
    public function searchCep(Request $request): JsonResponse
    {
        $request->validate([
            'cep' => 'required|string|size:8',
        ]);

        $cep = preg_replace('/\D/', '', $request->cep);

        try {
            $response = \Illuminate\Support\Facades\Http::get("https://viacep.com.br/ws/{$cep}/json/");

            if ($response->successful()) {
                $data = $response->json();

                if (isset($data['erro'])) {
                    return response()->json([
                        'error' => 'CEP não encontrado.',
                    ], 404);
                }

                return response()->json([
                    'address' => $data['logradouro'] ?? '',
                    'neighborhood' => $data['bairro'] ?? '',
                    'city' => $data['localidade'] ?? '',
                    'state' => $data['uf'] ?? '',
                ]);
            }

            return response()->json([
                'error' => 'Erro ao buscar CEP.',
            ], 500);

        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Erro ao buscar CEP: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Valida CPF
     */
    public function validateCpf(Request $request): JsonResponse
    {
        $request->validate([
            'cpf' => 'required|string',
        ]);

        $cpf = preg_replace('/\D/', '', $request->cpf);

        $isValid = $this->isValidCpf($cpf);

        return response()->json([
            'valid' => $isValid,
            'formatted' => $isValid ? $this->formatCpf($cpf) : null,
        ]);
    }

    /**
     * Valida CNPJ
     */
    public function validateCnpj(Request $request): JsonResponse
    {
        $request->validate([
            'cnpj' => 'required|string',
        ]);

        $cnpj = preg_replace('/\D/', '', $request->cnpj);

        $isValid = $this->isValidCnpj($cnpj);

        return response()->json([
            'valid' => $isValid,
            'formatted' => $isValid ? $this->formatCnpj($cnpj) : null,
        ]);
    }

    /**
     * Verifica se CPF é válido
     */
    private function isValidCpf(string $cpf): bool
    {
        $cpf = preg_replace('/\D/', '', $cpf);

        if (strlen($cpf) != 11) return false;

        // Verifica sequências inválidas
        if (preg_match('/(\d)\1{10}/', $cpf)) return false;

        // Calcula dígitos verificadores
        for ($t = 9; $t < 11; $t++) {
            $d = 0;
            for ($c = 0; $c < $t; $c++) {
                $d += $cpf[$c] * (($t + 1) - $c);
            }
            $d = ((10 * $d) % 11) % 10;
            if ($cpf[$c] != $d) return false;
        }

        return true;
    }

    /**
     * Verifica se CNPJ é válido
     */
    private function isValidCnpj(string $cnpj): bool
    {
        $cnpj = preg_replace('/\D/', '', $cnpj);

        if (strlen($cnpj) != 14) return false;

        // Verifica sequências inválidas
        if (preg_match('/(\d)\1{13}/', $cnpj)) return false;

        // Calcula dígitos verificadores
        $soma = 0;
        $multiplicadores1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
        for ($i = 0; $i < 12; $i++) {
            $soma += $cnpj[$i] * $multiplicadores1[$i];
        }
        $resto = $soma % 11;
        $digito1 = $resto < 2 ? 0 : 11 - $resto;

        if ($cnpj[12] != $digito1) return false;

        $soma = 0;
        $multiplicadores2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
        for ($i = 0; $i < 13; $i++) {
            $soma += $cnpj[$i] * $multiplicadores2[$i];
        }
        $resto = $soma % 11;
        $digito2 = $resto < 2 ? 0 : 11 - $resto;

        return $cnpj[13] == $digito2;
    }

    /**
     * Formata CPF
     */
    private function formatCpf(string $cpf): string
    {
        return substr($cpf, 0, 3) . '.' . substr($cpf, 3, 3) . '.' . substr($cpf, 6, 3) . '-' . substr($cpf, 9, 2);
    }

    /**
     * Formata CNPJ
     */
    private function formatCnpj(string $cnpj): string
    {
        return substr($cnpj, 0, 2) . '.' . substr($cnpj, 2, 3) . '.' . substr($cnpj, 5, 3) . '/' . substr($cnpj, 8, 4) . '-' . substr($cnpj, 12, 2);
    }
}

