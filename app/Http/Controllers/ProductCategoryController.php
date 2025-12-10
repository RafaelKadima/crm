<?php

namespace App\Http\Controllers;

use App\Models\ProductCategory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ProductCategoryController extends Controller
{
    /**
     * Lista categorias do tenant
     */
    public function index(Request $request): JsonResponse
    {
        $query = ProductCategory::withCount('products')
            ->where('tenant_id', auth()->user()->tenant_id);

        if ($request->has('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        $categories = $query->orderBy('order')->get();

        return response()->json($categories);
    }

    /**
     * Cria nova categoria
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'image' => 'nullable|string',
            'order' => 'nullable|integer',
            'is_active' => 'nullable|boolean',
        ]);

        $validated['tenant_id'] = auth()->user()->tenant_id;
        $validated['slug'] = Str::slug($validated['name']);

        // Verifica se slug já existe
        $slugExists = ProductCategory::where('tenant_id', $validated['tenant_id'])
            ->where('slug', $validated['slug'])
            ->exists();

        if ($slugExists) {
            $validated['slug'] .= '-' . Str::random(4);
        }

        $category = ProductCategory::create($validated);

        return response()->json([
            'message' => 'Categoria criada com sucesso.',
            'category' => $category,
        ], 201);
    }

    /**
     * Mostra detalhes da categoria
     */
    public function show(ProductCategory $category): JsonResponse
    {
        $category->load(['products' => function ($q) {
            $q->where('is_active', true)->orderBy('order');
        }]);

        return response()->json($category);
    }

    /**
     * Atualiza categoria
     */
    public function update(Request $request, ProductCategory $category): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'image' => 'nullable|string',
            'order' => 'nullable|integer',
            'is_active' => 'nullable|boolean',
        ]);

        // Atualiza slug se nome mudou
        if (isset($validated['name']) && $validated['name'] !== $category->name) {
            $newSlug = Str::slug($validated['name']);
            $slugExists = ProductCategory::where('tenant_id', $category->tenant_id)
                ->where('slug', $newSlug)
                ->where('id', '!=', $category->id)
                ->exists();

            $validated['slug'] = $slugExists ? $newSlug . '-' . Str::random(4) : $newSlug;
        }

        $category->update($validated);

        return response()->json([
            'message' => 'Categoria atualizada com sucesso.',
            'category' => $category->fresh(),
        ]);
    }

    /**
     * Remove categoria
     */
    public function destroy(ProductCategory $category): JsonResponse
    {
        // Verifica se há produtos vinculados
        if ($category->products()->exists()) {
            return response()->json([
                'error' => 'Não é possível excluir categoria com produtos vinculados.',
            ], 422);
        }

        $category->delete();

        return response()->json([
            'message' => 'Categoria removida com sucesso.',
        ]);
    }

    /**
     * Reordena categorias
     */
    public function reorder(Request $request): JsonResponse
    {
        $request->validate([
            'categories' => 'required|array',
            'categories.*.id' => 'required|uuid|exists:product_categories,id',
            'categories.*.order' => 'required|integer|min:0',
        ]);

        foreach ($request->categories as $categoryData) {
            ProductCategory::where('id', $categoryData['id'])
                ->where('tenant_id', auth()->user()->tenant_id)
                ->update(['order' => $categoryData['order']]);
        }

        return response()->json([
            'message' => 'Ordem atualizada com sucesso.',
        ]);
    }
}

