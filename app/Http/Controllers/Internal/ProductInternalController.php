<?php

namespace App\Http\Controllers\Internal;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use App\Models\Product;

class ProductInternalController extends Controller
{
    /**
     * Retorna contexto detalhado do produto para criação de conteúdo.
     */
    public function getContext(Request $request, $id): JsonResponse
    {
        $tenantId = $request->header('X-Tenant-ID') ?? $request->header('X-Internal-Key');
        $tenantId = $request->header('X-Tenant-ID'); // Enforce

        $product = Product::where('tenant_id', $tenantId)->find($id);

        if (!$product) {
            return response()->json(['error' => 'Product not found'], 404);
        }

        // Simula dados enriquecidos se não existirem no banco
        // Em produção, isso viria de colunas JSON 'marketing_data' ou similar
        $context = [
            'id' => $product->id,
            'name' => $product->name,
            'description' => $product->description,
            'price' => $product->price,
            'category' => $product->category ? $product->category->name : null,

            // Dados de IA/Marketing (normalmente viriam do banco)
            'marketing_context' => $product->marketing_context ?? [
                'target_audience' => 'Jovens adultos interessados em tecnologia e produtividade',
                'pain_points' => [
                    'Falta de tempo para organizar tarefas',
                    'Ferramentas complexas demais',
                    'Esquecimento de compromissos importantes'
                ],
                'key_benefits' => [
                    'Interface intuitiva e simples',
                    'Sincronização em tempo real',
                    'Notificações inteligentes'
                ],
                'unique_selling_proposition' => 'O único app que organiza sua vida em 5 minutos por dia.',
                'brand_tone' => 'Inspirador, Prático e Moderno'
            ]
        ];

        return response()->json($context);
    }
}
