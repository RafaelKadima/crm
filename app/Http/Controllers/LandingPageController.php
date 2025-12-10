<?php

namespace App\Http\Controllers;

use App\Models\LandingPage;
use App\Models\Lead;
use App\Models\Contact;
use App\Models\LeadProduct;
use App\Models\Tenant;
use App\Enums\LeadStatusEnum;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class LandingPageController extends Controller
{
    /**
     * Lista landing pages do tenant
     */
    public function index(Request $request): JsonResponse
    {
        $query = LandingPage::with(['products', 'defaultPipeline', 'defaultStage'])
            ->where('tenant_id', auth()->user()->tenant_id);

        if ($request->has('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        $landingPages = $query->orderBy('created_at', 'desc')->get();

        // Adiciona limite do plano
        $tenant = auth()->user()->tenant;
        
        return response()->json([
            'landing_pages' => $landingPages,
            'limit' => $tenant->landing_pages_limit ?? 1,
            'used' => $landingPages->count(),
            'can_create' => $landingPages->count() < ($tenant->landing_pages_limit ?? 1),
        ]);
    }

    /**
     * Cria nova landing page
     */
    public function store(Request $request): JsonResponse
    {
        $tenant = auth()->user()->tenant;
        $currentCount = LandingPage::where('tenant_id', $tenant->id)->count();
        
        // Verifica limite do plano
        if ($currentCount >= ($tenant->landing_pages_limit ?? 1)) {
            return response()->json([
                'error' => 'Limite de landing pages atingido para seu plano.',
                'limit' => $tenant->landing_pages_limit ?? 1,
                'used' => $currentCount,
            ], 422);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'logo' => 'nullable|string',
            'background_image' => 'nullable|string',
            'primary_color' => 'nullable|string|max:20',
            'secondary_color' => 'nullable|string|max:20',
            'text_color' => 'nullable|string|max:20',
            'theme' => 'nullable|string|in:modern,minimal,bold,elegant',
            'hero_title' => 'nullable|string|max:255',
            'hero_subtitle' => 'nullable|string',
            'cta_text' => 'nullable|string|max:100',
            'cta_button_color' => 'nullable|string|max:20',
            'show_products' => 'nullable|boolean',
            'show_testimonials' => 'nullable|boolean',
            'show_faq' => 'nullable|boolean',
            'show_contact_info' => 'nullable|boolean',
            'testimonials' => 'nullable|array',
            'faq' => 'nullable|array',
            'contact_info' => 'nullable|array',
            'form_fields' => 'nullable|array',
            'success_message' => 'nullable|string',
            'redirect_url' => 'nullable|url',
            'meta_title' => 'nullable|string|max:255',
            'meta_description' => 'nullable|string',
            'facebook_pixel' => 'nullable|string',
            'google_analytics' => 'nullable|string',
            'gtm_id' => 'nullable|string',
            'default_pipeline_id' => 'nullable|uuid|exists:pipelines,id',
            'default_stage_id' => 'nullable|uuid|exists:pipeline_stages,id',
            'default_channel_id' => 'nullable|uuid|exists:channels,id',
            'products' => 'nullable|array',
            'products.*' => 'uuid|exists:products,id',
        ]);

        $validated['tenant_id'] = $tenant->id;
        $validated['slug'] = Str::slug($validated['name']) . '-' . Str::random(6);
        $validated['is_active'] = true;
        $validated['published_at'] = now(); // Publica automaticamente ao criar

        // Remove products do validated pois será tratado separadamente
        $productIds = $validated['products'] ?? [];
        unset($validated['products']);

        $landingPage = LandingPage::create($validated);

        // Vincula produtos
        if (!empty($productIds)) {
            foreach ($productIds as $index => $productId) {
                $landingPage->products()->attach($productId, ['order' => $index]);
            }
        }

        return response()->json([
            'message' => 'Landing page criada com sucesso.',
            'landing_page' => $landingPage->load(['products', 'defaultPipeline', 'defaultStage']),
        ], 201);
    }

    /**
     * Mostra detalhes da landing page
     */
    public function show(LandingPage $landingPage): JsonResponse
    {
        $landingPage->load(['products.images', 'defaultPipeline', 'defaultStage', 'defaultChannel', 'stats']);

        return response()->json($landingPage);
    }

    /**
     * Atualiza landing page
     */
    public function update(Request $request, LandingPage $landingPage): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'title' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'logo' => 'nullable|string',
            'background_image' => 'nullable|string',
            'primary_color' => 'nullable|string|max:20',
            'secondary_color' => 'nullable|string|max:20',
            'text_color' => 'nullable|string|max:20',
            'theme' => 'nullable|string|in:modern,minimal,bold,elegant',
            'hero_title' => 'nullable|string|max:255',
            'hero_subtitle' => 'nullable|string',
            'cta_text' => 'nullable|string|max:100',
            'cta_button_color' => 'nullable|string|max:20',
            'show_products' => 'nullable|boolean',
            'show_testimonials' => 'nullable|boolean',
            'show_faq' => 'nullable|boolean',
            'show_contact_info' => 'nullable|boolean',
            'testimonials' => 'nullable|array',
            'faq' => 'nullable|array',
            'contact_info' => 'nullable|array',
            'form_fields' => 'nullable|array',
            'blocks' => 'nullable|array',
            'global_settings' => 'nullable|array',
            'success_message' => 'nullable|string',
            'redirect_url' => 'nullable|url',
            'meta_title' => 'nullable|string|max:255',
            'meta_description' => 'nullable|string',
            'facebook_pixel' => 'nullable|string',
            'google_analytics' => 'nullable|string',
            'gtm_id' => 'nullable|string',
            'default_pipeline_id' => 'nullable|uuid|exists:pipelines,id',
            'default_stage_id' => 'nullable|uuid|exists:pipeline_stages,id',
            'default_channel_id' => 'nullable|uuid|exists:channels,id',
            'is_active' => 'nullable|boolean',
            'products' => 'nullable|array',
            'products.*' => 'uuid|exists:products,id',
        ]);

        // Atualiza produtos se enviados
        if (isset($validated['products'])) {
            $productIds = $validated['products'];
            unset($validated['products']);
            
            // Sync produtos com ordem
            $syncData = [];
            foreach ($productIds as $index => $productId) {
                $syncData[$productId] = ['order' => $index];
            }
            $landingPage->products()->sync($syncData);
        }

        $landingPage->update($validated);

        return response()->json([
            'message' => 'Landing page atualizada com sucesso.',
            'landing_page' => $landingPage->fresh(['products', 'defaultPipeline', 'defaultStage']),
        ]);
    }
    
    /**
     * Upload de imagem para landing page
     */
    public function uploadImage(Request $request, LandingPage $landingPage): JsonResponse
    {
        $validated = $request->validate([
            'image' => 'required|image|mimes:jpeg,png,jpg,gif,webp|max:5120', // 5MB max
            'type' => 'required|string|in:logo,background,block',
        ]);

        $path = $request->file('image')->store(
            "landing-pages/{$landingPage->id}/{$validated['type']}",
            'public'
        );

        $url = \Illuminate\Support\Facades\Storage::url($path);

        return response()->json([
            'url' => $url,
            'path' => $path,
        ]);
    }

    /**
     * Remove landing page
     */
    public function destroy(LandingPage $landingPage): JsonResponse
    {
        $landingPage->delete();

        return response()->json([
            'message' => 'Landing page removida com sucesso.',
        ]);
    }

    /**
     * Publica landing page
     */
    public function publish(LandingPage $landingPage): JsonResponse
    {
        $landingPage->update([
            'is_active' => true,
            'published_at' => now(),
        ]);

        return response()->json([
            'message' => 'Landing page publicada com sucesso.',
            'landing_page' => $landingPage,
        ]);
    }

    /**
     * Despublica landing page
     */
    public function unpublish(LandingPage $landingPage): JsonResponse
    {
        $landingPage->update([
            'is_active' => false,
        ]);

        return response()->json([
            'message' => 'Landing page despublicada.',
            'landing_page' => $landingPage,
        ]);
    }

    /**
     * Duplica landing page
     */
    public function duplicate(LandingPage $landingPage): JsonResponse
    {
        $tenant = auth()->user()->tenant;
        $currentCount = LandingPage::where('tenant_id', $tenant->id)->count();
        
        // Verifica limite do plano
        if ($currentCount >= ($tenant->landing_pages_limit ?? 1)) {
            return response()->json([
                'error' => 'Limite de landing pages atingido para seu plano.',
            ], 422);
        }

        $newLandingPage = $landingPage->replicate();
        $newLandingPage->name = $landingPage->name . ' (Cópia)';
        $newLandingPage->slug = Str::slug($newLandingPage->name) . '-' . Str::random(6);
        $newLandingPage->is_active = false;
        $newLandingPage->published_at = null;
        $newLandingPage->views_count = 0;
        $newLandingPage->leads_count = 0;
        $newLandingPage->save();

        // Copia produtos
        foreach ($landingPage->products as $product) {
            $newLandingPage->products()->attach($product->id, [
                'order' => $product->pivot->order,
                'is_featured' => $product->pivot->is_featured,
            ]);
        }

        return response()->json([
            'message' => 'Landing page duplicada com sucesso.',
            'landing_page' => $newLandingPage->load(['products']),
        ], 201);
    }

    /**
     * Estatísticas da landing page
     */
    public function stats(LandingPage $landingPage, Request $request): JsonResponse
    {
        $days = $request->get('days', 30);
        
        $stats = $landingPage->stats()
            ->where('date', '>=', now()->subDays($days))
            ->orderBy('date')
            ->get();

        return response()->json([
            'summary' => [
                'total_views' => $landingPage->views_count,
                'total_leads' => $landingPage->leads_count,
                'conversion_rate' => $landingPage->conversion_rate,
            ],
            'daily' => $stats,
        ]);
    }

    // ==================== ROTAS PÚBLICAS ====================

    /**
     * Visualiza landing page pública
     */
    public function publicShow(string $slug): JsonResponse
    {
        $landingPage = LandingPage::with(['products.images', 'tenant'])
            ->where('slug', $slug)
            ->published()
            ->firstOrFail();

        // Incrementa visualizações
        $landingPage->incrementViews();

        // Prepara dados públicos (sem preços)
        $publicProducts = $landingPage->products->map(function ($product) {
            return [
                'id' => $product->id,
                'name' => $product->name,
                'short_description' => $product->short_description,
                'description' => $product->description,
                'specifications' => $product->specifications,
                'images' => $product->images->map(fn($img) => [
                    'url' => $img->url,
                    'alt' => $img->alt,
                    'is_primary' => $img->is_primary,
                ]),
                'is_featured' => $product->pivot->is_featured,
            ];
        });

        return response()->json([
            'id' => $landingPage->id,
            'title' => $landingPage->title,
            'description' => $landingPage->description,
            'logo' => $landingPage->logo,
            'background_image' => $landingPage->background_image,
            'primary_color' => $landingPage->primary_color,
            'secondary_color' => $landingPage->secondary_color,
            'text_color' => $landingPage->text_color,
            'theme' => $landingPage->theme,
            'hero_title' => $landingPage->hero_title,
            'hero_subtitle' => $landingPage->hero_subtitle,
            'cta_text' => $landingPage->cta_text,
            'cta_button_color' => $landingPage->cta_button_color,
            'show_products' => $landingPage->show_products,
            'show_testimonials' => $landingPage->show_testimonials,
            'show_faq' => $landingPage->show_faq,
            'show_contact_info' => $landingPage->show_contact_info,
            'testimonials' => $landingPage->testimonials,
            'faq' => $landingPage->faq,
            'contact_info' => $landingPage->contact_info,
            'form_fields' => $landingPage->form_fields,
            'blocks' => $landingPage->blocks,
            'global_settings' => $landingPage->global_settings,
            'success_message' => $landingPage->success_message,
            'products' => $publicProducts,
            'tenant' => [
                'name' => $landingPage->tenant->name,
            ],
            'meta' => [
                'title' => $landingPage->meta_title ?? $landingPage->title,
                'description' => $landingPage->meta_description ?? $landingPage->description,
                'og_image' => $landingPage->og_image,
            ],
            'tracking' => [
                'facebook_pixel' => $landingPage->facebook_pixel,
                'google_analytics' => $landingPage->google_analytics,
                'gtm_id' => $landingPage->gtm_id,
            ],
        ]);
    }

    /**
     * Submissão de lead via landing page
     */
    public function publicSubmit(Request $request, string $slug): JsonResponse
    {
        $landingPage = LandingPage::with(['defaultPipeline', 'defaultStage', 'defaultChannel'])
            ->where('slug', $slug)
            ->published()
            ->firstOrFail();

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'nullable|email|max:255',
            'phone' => 'required|string|max:20',
            'product_id' => 'nullable|uuid|exists:products,id',
            'message' => 'nullable|string|max:1000',
            'extra_fields' => 'nullable|array',
        ]);

        return DB::transaction(function () use ($validated, $landingPage) {
            // Cria ou atualiza contato
            $contact = Contact::updateOrCreate(
                [
                    'tenant_id' => $landingPage->tenant_id,
                    'phone' => preg_replace('/\D/', '', $validated['phone']),
                ],
                [
                    'name' => $validated['name'],
                    'email' => $validated['email'] ?? null,
                    'custom_fields' => $validated['extra_fields'] ?? null,
                ]
            );

            // Define pipeline/stage padrão
            $pipelineId = $landingPage->default_pipeline_id;
            $stageId = $landingPage->default_stage_id;

            // Se não tem padrão, pega o primeiro do tenant
            if (!$pipelineId) {
                $pipeline = \App\Models\Pipeline::where('tenant_id', $landingPage->tenant_id)
                    ->where('is_default', true)
                    ->first();
                
                if ($pipeline) {
                    $pipelineId = $pipeline->id;
                    $stageId = $pipeline->stages()->orderBy('order')->first()?->id;
                }
            }

            // Cria lead
            $lead = Lead::create([
                'tenant_id' => $landingPage->tenant_id,
                'contact_id' => $contact->id,
                'pipeline_id' => $pipelineId,
                'stage_id' => $stageId,
                'channel_id' => $landingPage->default_channel_id,
                'status' => LeadStatusEnum::OPEN,
                'notes' => $validated['message'] ?? null,
            ]);

            // Vincula produto de interesse
            if (!empty($validated['product_id'])) {
                $product = \App\Models\Product::find($validated['product_id']);
                if ($product) {
                    LeadProduct::create([
                        'lead_id' => $lead->id,
                        'product_id' => $product->id,
                        'quantity' => 1,
                        'unit_price' => $product->current_price,
                    ]);

                    // Atualiza valor do lead
                    $lead->update(['value' => $product->current_price]);
                }
            }

            // Incrementa contador de leads
            $landingPage->incrementLeads();

            return response()->json([
                'success' => true,
                'message' => $landingPage->success_message ?? 'Obrigado! Em breve entraremos em contato.',
                'redirect_url' => $landingPage->redirect_url,
            ]);
        });
    }
}

