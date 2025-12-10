<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\ProductImage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ProductController extends Controller
{
    /**
     * Lista produtos do tenant
     */
    public function index(Request $request): JsonResponse
    {
        $query = Product::with(['category', 'images'])
            ->where('tenant_id', auth()->user()->tenant_id);

        // Filtros
        if ($request->has('category_id')) {
            $query->where('category_id', $request->category_id);
        }

        if ($request->has('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'ilike', "%{$search}%")
                    ->orWhere('sku', 'ilike', "%{$search}%")
                    ->orWhere('description', 'ilike', "%{$search}%");
            });
        }

        // Ordenação
        $sortBy = $request->get('sort_by', 'order');
        $sortDir = $request->get('sort_dir', 'asc');
        $query->orderBy($sortBy, $sortDir);

        // Paginação
        $perPage = $request->get('per_page', 20);
        $products = $query->paginate($perPage);

        return response()->json($products);
    }

    /**
     * Cria novo produto
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'category_id' => 'nullable|uuid|exists:product_categories,id',
            'sku' => 'nullable|string|max:100',
            'description' => 'nullable|string',
            'short_description' => 'nullable|string|max:500',
            'specifications' => 'nullable|array',
            'price' => 'required|numeric|min:0',
            'promotional_price' => 'nullable|numeric|min:0',
            'cost_price' => 'nullable|numeric|min:0',
            'stock' => 'nullable|integer|min:0',
            'track_stock' => 'nullable|boolean',
            'is_active' => 'nullable|boolean',
            'show_on_landing_page' => 'nullable|boolean',
            'order' => 'nullable|integer',
        ]);

        $validated['tenant_id'] = auth()->user()->tenant_id;
        $validated['slug'] = Str::slug($validated['name']);

        // Verifica se slug já existe
        $slugExists = Product::where('tenant_id', $validated['tenant_id'])
            ->where('slug', $validated['slug'])
            ->exists();

        if ($slugExists) {
            $validated['slug'] .= '-' . Str::random(4);
        }

        $product = Product::create($validated);

        return response()->json([
            'message' => 'Produto criado com sucesso.',
            'product' => $product->load(['category', 'images']),
        ], 201);
    }

    /**
     * Mostra detalhes do produto
     */
    public function show(Product $product): JsonResponse
    {
        $product->load(['category', 'images', 'leads']);

        return response()->json($product);
    }

    /**
     * Atualiza produto
     */
    public function update(Request $request, Product $product): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'category_id' => 'nullable|uuid|exists:product_categories,id',
            'sku' => 'nullable|string|max:100',
            'description' => 'nullable|string',
            'short_description' => 'nullable|string|max:500',
            'specifications' => 'nullable|array',
            'price' => 'sometimes|numeric|min:0',
            'promotional_price' => 'nullable|numeric|min:0',
            'cost_price' => 'nullable|numeric|min:0',
            'stock' => 'nullable|integer|min:0',
            'track_stock' => 'nullable|boolean',
            'is_active' => 'nullable|boolean',
            'show_on_landing_page' => 'nullable|boolean',
            'order' => 'nullable|integer',
        ]);

        // Atualiza slug se nome mudou
        if (isset($validated['name']) && $validated['name'] !== $product->name) {
            $newSlug = Str::slug($validated['name']);
            $slugExists = Product::where('tenant_id', $product->tenant_id)
                ->where('slug', $newSlug)
                ->where('id', '!=', $product->id)
                ->exists();

            $validated['slug'] = $slugExists ? $newSlug . '-' . Str::random(4) : $newSlug;
        }

        $product->update($validated);

        return response()->json([
            'message' => 'Produto atualizado com sucesso.',
            'product' => $product->fresh(['category', 'images']),
        ]);
    }

    /**
     * Remove produto (soft delete)
     */
    public function destroy(Product $product): JsonResponse
    {
        $product->delete();

        return response()->json([
            'message' => 'Produto removido com sucesso.',
        ]);
    }

    /**
     * Upload de imagem
     */
    public function uploadImage(Request $request, Product $product): JsonResponse
    {
        $request->validate([
            'image' => 'required|image|mimes:jpeg,png,jpg,gif,webp|max:5120', // 5MB
            'alt' => 'nullable|string|max:255',
            'is_primary' => 'nullable|boolean',
        ]);

        $file = $request->file('image');
        $filename = Str::uuid() . '.' . $file->getClientOriginalExtension();
        $path = "products/{$product->tenant_id}/{$product->id}";
        
        // Salva arquivo
        $filePath = $file->storeAs($path, $filename, 'public');
        $url = Storage::disk('public')->url($filePath);

        // Se for primary, remove flag das outras
        if ($request->boolean('is_primary')) {
            $product->images()->update(['is_primary' => false]);
        }

        // Cria registro da imagem
        $image = ProductImage::create([
            'product_id' => $product->id,
            'path' => $filePath,
            'url' => $url,
            'alt' => $request->alt ?? $product->name,
            'order' => $product->images()->count(),
            'is_primary' => $request->boolean('is_primary') || $product->images()->count() === 0,
        ]);

        return response()->json([
            'message' => 'Imagem enviada com sucesso.',
            'image' => $image,
        ], 201);
    }

    /**
     * Remove imagem
     */
    public function deleteImage(Product $product, ProductImage $image): JsonResponse
    {
        if ($image->product_id !== $product->id) {
            return response()->json(['error' => 'Imagem não pertence a este produto.'], 403);
        }

        // Se era primary, define outra como primary
        if ($image->is_primary) {
            $nextImage = $product->images()->where('id', '!=', $image->id)->first();
            if ($nextImage) {
                $nextImage->update(['is_primary' => true]);
            }
        }

        $image->delete();

        return response()->json([
            'message' => 'Imagem removida com sucesso.',
        ]);
    }

    /**
     * Define imagem como principal
     */
    public function setPrimaryImage(Product $product, ProductImage $image): JsonResponse
    {
        if ($image->product_id !== $product->id) {
            return response()->json(['error' => 'Imagem não pertence a este produto.'], 403);
        }

        $product->images()->update(['is_primary' => false]);
        $image->update(['is_primary' => true]);

        return response()->json([
            'message' => 'Imagem definida como principal.',
            'image' => $image,
        ]);
    }

    /**
     * Reordena imagens
     */
    public function reorderImages(Request $request, Product $product): JsonResponse
    {
        $request->validate([
            'images' => 'required|array',
            'images.*.id' => 'required|uuid|exists:product_images,id',
            'images.*.order' => 'required|integer|min:0',
        ]);

        foreach ($request->images as $imageData) {
            ProductImage::where('id', $imageData['id'])
                ->where('product_id', $product->id)
                ->update(['order' => $imageData['order']]);
        }

        return response()->json([
            'message' => 'Ordem atualizada com sucesso.',
        ]);
    }

    /**
     * Duplica produto
     */
    public function duplicate(Product $product): JsonResponse
    {
        $newProduct = $product->replicate();
        $newProduct->name = $product->name . ' (Cópia)';
        $newProduct->slug = Str::slug($newProduct->name) . '-' . Str::random(4);
        $newProduct->save();

        // Duplica imagens
        foreach ($product->images as $image) {
            $newImage = $image->replicate();
            $newImage->product_id = $newProduct->id;
            $newImage->save();
        }

        return response()->json([
            'message' => 'Produto duplicado com sucesso.',
            'product' => $newProduct->load(['category', 'images']),
        ], 201);
    }

    /**
     * Lista produtos para landing page (público)
     */
    public function publicList(Request $request, string $tenantSlug): JsonResponse
    {
        $tenant = \App\Models\Tenant::where('slug', $tenantSlug)->firstOrFail();

        $products = Product::with(['category', 'images'])
            ->where('tenant_id', $tenant->id)
            ->where('is_active', true)
            ->where('show_on_landing_page', true)
            ->orderBy('order')
            ->get()
            ->map(function ($product) {
                // Remove preços para visualização pública
                return [
                    'id' => $product->id,
                    'name' => $product->name,
                    'slug' => $product->slug,
                    'short_description' => $product->short_description,
                    'description' => $product->description,
                    'specifications' => $product->specifications,
                    'category' => $product->category?->name,
                    'images' => $product->images->map(fn($img) => [
                        'url' => $img->url,
                        'alt' => $img->alt,
                        'is_primary' => $img->is_primary,
                    ]),
                    'primary_image' => $product->primary_image_url,
                ];
            });

        return response()->json([
            'tenant' => [
                'name' => $tenant->name,
                'logo' => $tenant->settings['logo'] ?? null,
            ],
            'products' => $products,
        ]);
    }
}

