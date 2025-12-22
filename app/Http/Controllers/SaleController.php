<?php

namespace App\Http\Controllers;

use App\Models\Lead;
use App\Models\Product;
use App\Models\Sale;
use App\Models\SaleItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SaleController extends Controller
{
    /**
     * Lista todas as vendas do tenant.
     */
    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'user_id' => 'nullable|uuid|exists:users,id',
        ]);

        $query = Sale::where('tenant_id', auth()->user()->tenant_id)
            ->with(['lead:id,name,email', 'closedBy:id,name', 'items'])
            ->orderByDesc('closed_at');

        if ($request->start_date && $request->end_date) {
            $query->inPeriod($request->start_date, $request->end_date);
        }

        if ($request->user_id) {
            $query->byUser($request->user_id);
        }

        $sales = $query->paginate(20);

        return response()->json($sales);
    }

    /**
     * Cria uma nova venda (fechamento de lead).
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'lead_id' => 'required|uuid|exists:leads,id|unique:sales,lead_id',
            'items' => 'nullable|array',
            'items.*.product_id' => 'nullable|uuid|exists:products,id',
            'items.*.description' => 'required_without:items.*.product_id|string|max:255',
            'items.*.quantity' => 'required|numeric|min:0.01',
            'items.*.unit_price' => 'required|numeric|min:0',
            'items.*.discount' => 'nullable|numeric|min:0',
            'items.*.notes' => 'nullable|string',
            'additional_value' => 'nullable|numeric|min:0',
            'additional_description' => 'nullable|string|max:255',
            'discount_value' => 'nullable|numeric|min:0',
            'discount_percentage' => 'nullable|numeric|min:0|max:100',
            'total_value' => 'nullable|numeric|min:0', // Para venda com valor direto
            'payment_method' => 'nullable|string|max:100',
            'installments' => 'nullable|integer|min:1|max:48',
            'notes' => 'nullable|string',
            'metadata' => 'nullable|array',
        ]);

        $lead = Lead::findOrFail($validated['lead_id']);

        // Verifica se o lead pertence ao tenant
        if ($lead->tenant_id !== auth()->user()->tenant_id) {
            return response()->json(['message' => 'Lead não encontrado.'], 404);
        }

        $sale = DB::transaction(function () use ($validated, $lead) {
            // Se tem items, calcula a partir deles
            $hasItems = !empty($validated['items']);
            $subtotalProducts = 0;

            if ($hasItems) {
                foreach ($validated['items'] as $item) {
                    $qty = $item['quantity'];
                    $price = $item['unit_price'];
                    $discount = $item['discount'] ?? 0;
                    $subtotalProducts += ($qty * $price) - $discount;
                }
            }

            // Calcula total
            $additionalValue = $validated['additional_value'] ?? 0;
            $discountValue = $validated['discount_value'] ?? 0;

            if (isset($validated['discount_percentage']) && $validated['discount_percentage'] > 0) {
                $baseForDiscount = $subtotalProducts + $additionalValue;
                $discountValue = $baseForDiscount * ($validated['discount_percentage'] / 100);
            }

            // Se passou total_value direto (modo simples), usa esse valor
            $totalValue = $validated['total_value'] ?? ($subtotalProducts + $additionalValue - $discountValue);

            // Cria a venda
            $sale = Sale::create([
                'tenant_id' => auth()->user()->tenant_id,
                'lead_id' => $lead->id,
                'closed_by' => auth()->id(),
                'closed_at' => now(),
                'subtotal_products' => $subtotalProducts,
                'additional_value' => $additionalValue,
                'additional_description' => $validated['additional_description'] ?? null,
                'discount_value' => $discountValue,
                'discount_percentage' => $validated['discount_percentage'] ?? null,
                'total_value' => $totalValue,
                'payment_method' => $validated['payment_method'] ?? null,
                'installments' => $validated['installments'] ?? 1,
                'notes' => $validated['notes'] ?? null,
                'metadata' => $validated['metadata'] ?? null,
            ]);

            // Cria os itens
            if ($hasItems) {
                foreach ($validated['items'] as $itemData) {
                    // Se tem product_id, pega descrição do produto
                    if (!empty($itemData['product_id'])) {
                        $product = Product::find($itemData['product_id']);
                        $itemData['description'] = $itemData['description'] ?? $product->name;
                    }

                    $qty = $itemData['quantity'];
                    $price = $itemData['unit_price'];
                    $discount = $itemData['discount'] ?? 0;

                    SaleItem::create([
                        'sale_id' => $sale->id,
                        'product_id' => $itemData['product_id'] ?? null,
                        'description' => $itemData['description'],
                        'quantity' => $qty,
                        'unit_price' => $price,
                        'discount' => $discount,
                        'total' => ($qty * $price) - $discount,
                        'notes' => $itemData['notes'] ?? null,
                    ]);
                }
            }

            // Atualiza o valor do lead
            $lead->update(['value' => $totalValue]);

            return $sale;
        });

        return response()->json([
            'message' => 'Venda registrada com sucesso.',
            'sale' => $sale->load(['items', 'lead:id,name', 'closedBy:id,name']),
        ], 201);
    }

    /**
     * Exibe uma venda específica.
     */
    public function show(Sale $sale): JsonResponse
    {
        // Verifica tenant
        if ($sale->tenant_id !== auth()->user()->tenant_id) {
            return response()->json(['message' => 'Venda não encontrada.'], 404);
        }

        $sale->load([
            'items.product:id,name,sku',
            'lead:id,name,email,phone',
            'closedBy:id,name',
        ]);

        return response()->json([
            'sale' => $sale,
            'stats' => $sale->getStats(),
        ]);
    }

    /**
     * Atualiza uma venda.
     */
    public function update(Request $request, Sale $sale): JsonResponse
    {
        // Verifica tenant
        if ($sale->tenant_id !== auth()->user()->tenant_id) {
            return response()->json(['message' => 'Venda não encontrada.'], 404);
        }

        $validated = $request->validate([
            'additional_value' => 'nullable|numeric|min:0',
            'additional_description' => 'nullable|string|max:255',
            'discount_value' => 'nullable|numeric|min:0',
            'discount_percentage' => 'nullable|numeric|min:0|max:100',
            'payment_method' => 'nullable|string|max:100',
            'installments' => 'nullable|integer|min:1|max:48',
            'notes' => 'nullable|string',
            'metadata' => 'nullable|array',
        ]);

        DB::transaction(function () use ($sale, $validated) {
            $sale->update($validated);
            $sale->recalculateAndSave();
        });

        return response()->json([
            'message' => 'Venda atualizada com sucesso.',
            'sale' => $sale->fresh(['items', 'lead:id,name']),
        ]);
    }

    /**
     * Adiciona um item à venda.
     */
    public function addItem(Request $request, Sale $sale): JsonResponse
    {
        // Verifica tenant
        if ($sale->tenant_id !== auth()->user()->tenant_id) {
            return response()->json(['message' => 'Venda não encontrada.'], 404);
        }

        $validated = $request->validate([
            'product_id' => 'nullable|uuid|exists:products,id',
            'description' => 'required_without:product_id|string|max:255',
            'quantity' => 'required|numeric|min:0.01',
            'unit_price' => 'required|numeric|min:0',
            'discount' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string',
        ]);

        // Se tem product_id, pega descrição do produto
        if (!empty($validated['product_id'])) {
            $product = Product::find($validated['product_id']);
            $validated['description'] = $validated['description'] ?? $product->name;
        }

        $qty = $validated['quantity'];
        $price = $validated['unit_price'];
        $discount = $validated['discount'] ?? 0;

        $item = SaleItem::create([
            'sale_id' => $sale->id,
            'product_id' => $validated['product_id'] ?? null,
            'description' => $validated['description'],
            'quantity' => $qty,
            'unit_price' => $price,
            'discount' => $discount,
            'total' => ($qty * $price) - $discount,
            'notes' => $validated['notes'] ?? null,
        ]);

        return response()->json([
            'message' => 'Item adicionado com sucesso.',
            'item' => $item,
            'sale' => $sale->fresh(['items']),
        ], 201);
    }

    /**
     * Remove um item da venda.
     */
    public function removeItem(Sale $sale, SaleItem $item): JsonResponse
    {
        // Verifica tenant
        if ($sale->tenant_id !== auth()->user()->tenant_id) {
            return response()->json(['message' => 'Venda não encontrada.'], 404);
        }

        // Verifica se o item pertence à venda
        if ($item->sale_id !== $sale->id) {
            return response()->json(['message' => 'Item não pertence a esta venda.'], 400);
        }

        $item->delete();

        return response()->json([
            'message' => 'Item removido com sucesso.',
            'sale' => $sale->fresh(['items']),
        ]);
    }

    /**
     * Busca a venda de um lead específico.
     */
    public function byLead(Lead $lead): JsonResponse
    {
        // Verifica tenant
        if ($lead->tenant_id !== auth()->user()->tenant_id) {
            return response()->json(['message' => 'Lead não encontrado.'], 404);
        }

        $sale = Sale::where('lead_id', $lead->id)
            ->with(['items.product:id,name,sku', 'closedBy:id,name'])
            ->first();

        if (!$sale) {
            return response()->json(['message' => 'Venda não encontrada.'], 404);
        }

        return response()->json([
            'sale' => $sale,
            'stats' => $sale->getStats(),
        ]);
    }

    /**
     * Estatísticas de vendas do usuário logado.
     */
    public function myStats(Request $request): JsonResponse
    {
        $request->validate([
            'period' => 'nullable|in:today,week,month,year',
        ]);

        $period = $request->period ?? 'month';
        $userId = auth()->id();
        $tenantId = auth()->user()->tenant_id;

        $query = Sale::where('tenant_id', $tenantId)
            ->where('closed_by', $userId);

        switch ($period) {
            case 'today':
                $query->whereDate('closed_at', today());
                break;
            case 'week':
                $query->whereBetween('closed_at', [now()->startOfWeek(), now()->endOfWeek()]);
                break;
            case 'month':
                $query->thisMonth();
                break;
            case 'year':
                $query->thisYear();
                break;
        }

        $sales = $query->get();

        return response()->json([
            'period' => $period,
            'stats' => [
                'total_sales' => $sales->count(),
                'total_value' => $sales->sum('total_value'),
                'average_ticket' => $sales->count() > 0
                    ? $sales->sum('total_value') / $sales->count()
                    : 0,
                'total_products_value' => $sales->sum('subtotal_products'),
                'total_additional_value' => $sales->sum('additional_value'),
                'total_discounts' => $sales->sum('discount_value'),
            ],
        ]);
    }

    /**
     * Busca produtos para adicionar à venda.
     */
    public function searchProducts(Request $request): JsonResponse
    {
        $request->validate([
            'q' => 'required|string|min:2',
        ]);

        $products = Product::where('tenant_id', auth()->user()->tenant_id)
            ->where('is_active', true)
            ->where(function ($query) use ($request) {
                $query->where('name', 'ilike', "%{$request->q}%")
                    ->orWhere('sku', 'ilike', "%{$request->q}%");
            })
            ->select(['id', 'name', 'sku', 'price', 'description'])
            ->limit(10)
            ->get();

        return response()->json([
            'products' => $products,
        ]);
    }
}
