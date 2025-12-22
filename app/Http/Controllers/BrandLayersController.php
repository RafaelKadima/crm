<?php

namespace App\Http\Controllers;

use App\Models\BrandEditorialProfile;
use App\Models\AudienceProfile;
use App\Models\ProductPositioning;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

/**
 * Controller para gerenciar as 3 camadas do Content Creator:
 * - Brand Editorial Profiles (DNA da Marca)
 * - Audience Profiles (Perfil do Publico)
 * - Product Positionings (Posicionamento do Produto)
 */
class BrandLayersController extends Controller
{
    // ==================== BRAND EDITORIAL PROFILES ====================

    /**
     * Lista todos os perfis editoriais de marca do tenant
     * GET /api/brand-layers/brand-profiles
     */
    public function listBrandProfiles(Request $request): JsonResponse
    {
        $profiles = BrandEditorialProfile::where('tenant_id', $request->user()->tenant_id)
            ->orderBy('name')
            ->get()
            ->map(fn($profile) => [
                'id' => $profile->id,
                'name' => $profile->name,
                'brand_voice' => $profile->brand_voice,
                'brand_identity' => $profile->brand_identity,
                'beliefs_and_enemies' => $profile->beliefs_and_enemies,
                'content_pillars' => $profile->content_pillars,
                'created_at' => $profile->created_at->toISOString(),
                'updated_at' => $profile->updated_at->toISOString(),
            ]);

        return response()->json(['profiles' => $profiles]);
    }

    /**
     * Retorna um perfil editorial de marca especifico
     * GET /api/brand-layers/brand-profiles/{id}
     */
    public function showBrandProfile(Request $request, string $id): JsonResponse
    {
        $profile = BrandEditorialProfile::where('tenant_id', $request->user()->tenant_id)
            ->findOrFail($id);

        return response()->json(['profile' => $profile]);
    }

    /**
     * Cria um novo perfil editorial de marca
     * POST /api/brand-layers/brand-profiles
     */
    public function storeBrandProfile(Request $request): JsonResponse
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'brand_voice' => 'nullable|array',
            'brand_voice.personality_traits' => 'nullable|array',
            'brand_voice.tone_descriptors' => 'nullable|array',
            'brand_voice.vocabulary_style' => 'nullable|string',
            'brand_identity' => 'nullable|array',
            'brand_identity.mission' => 'nullable|string',
            'brand_identity.values' => 'nullable|array',
            'brand_identity.unique_proposition' => 'nullable|string',
            'beliefs_and_enemies' => 'nullable|array',
            'beliefs_and_enemies.core_beliefs' => 'nullable|array',
            'beliefs_and_enemies.industry_enemies' => 'nullable|array',
            'beliefs_and_enemies.contrarian_views' => 'nullable|array',
            'content_pillars' => 'nullable|array',
        ]);

        $profile = BrandEditorialProfile::create([
            'tenant_id' => $request->user()->tenant_id,
            'name' => $request->name,
            'brand_voice' => $request->brand_voice ?? [],
            'brand_identity' => $request->brand_identity ?? [],
            'beliefs_and_enemies' => $request->beliefs_and_enemies ?? [],
            'content_pillars' => $request->content_pillars ?? [],
        ]);

        return response()->json(['profile' => $profile], 201);
    }

    /**
     * Atualiza um perfil editorial de marca
     * PUT /api/brand-layers/brand-profiles/{id}
     */
    public function updateBrandProfile(Request $request, string $id): JsonResponse
    {
        $profile = BrandEditorialProfile::where('tenant_id', $request->user()->tenant_id)
            ->findOrFail($id);

        $request->validate([
            'name' => 'sometimes|string|max:255',
            'brand_voice' => 'nullable|array',
            'brand_identity' => 'nullable|array',
            'beliefs_and_enemies' => 'nullable|array',
            'content_pillars' => 'nullable|array',
        ]);

        $profile->update($request->only([
            'name',
            'brand_voice',
            'brand_identity',
            'beliefs_and_enemies',
            'content_pillars',
        ]));

        return response()->json(['profile' => $profile]);
    }

    /**
     * Deleta um perfil editorial de marca
     * DELETE /api/brand-layers/brand-profiles/{id}
     */
    public function destroyBrandProfile(Request $request, string $id): JsonResponse
    {
        $profile = BrandEditorialProfile::where('tenant_id', $request->user()->tenant_id)
            ->findOrFail($id);

        $profile->delete();

        return response()->json(['message' => 'Perfil deletado com sucesso']);
    }

    // ==================== AUDIENCE PROFILES ====================

    /**
     * Lista todos os perfis de audiencia do tenant
     * GET /api/brand-layers/audience-profiles
     */
    public function listAudienceProfiles(Request $request): JsonResponse
    {
        $profiles = AudienceProfile::where('tenant_id', $request->user()->tenant_id)
            ->orderBy('name')
            ->get()
            ->map(fn($profile) => [
                'id' => $profile->id,
                'name' => $profile->name,
                'demographics' => $profile->demographics,
                'psychographics' => $profile->psychographics,
                'objections' => $profile->objections,
                'language_patterns' => $profile->language_patterns,
                'created_at' => $profile->created_at->toISOString(),
                'updated_at' => $profile->updated_at->toISOString(),
            ]);

        return response()->json(['profiles' => $profiles]);
    }

    /**
     * Retorna um perfil de audiencia especifico
     * GET /api/brand-layers/audience-profiles/{id}
     */
    public function showAudienceProfile(Request $request, string $id): JsonResponse
    {
        $profile = AudienceProfile::where('tenant_id', $request->user()->tenant_id)
            ->findOrFail($id);

        return response()->json(['profile' => $profile]);
    }

    /**
     * Cria um novo perfil de audiencia
     * POST /api/brand-layers/audience-profiles
     */
    public function storeAudienceProfile(Request $request): JsonResponse
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'demographics' => 'nullable|array',
            'demographics.age_range' => 'nullable|string',
            'demographics.gender' => 'nullable|string',
            'demographics.location' => 'nullable|string',
            'demographics.income_level' => 'nullable|string',
            'demographics.education' => 'nullable|string',
            'psychographics' => 'nullable|array',
            'psychographics.pains' => 'nullable|array',
            'psychographics.desires' => 'nullable|array',
            'psychographics.fears' => 'nullable|array',
            'psychographics.dreams' => 'nullable|array',
            'objections' => 'nullable|array',
            'objections.common_objections' => 'nullable|array',
            'objections.trust_barriers' => 'nullable|array',
            'language_patterns' => 'nullable|array',
            'language_patterns.slang_terms' => 'nullable|array',
            'language_patterns.phrases_they_use' => 'nullable|array',
            'language_patterns.tone_preference' => 'nullable|string',
        ]);

        $profile = AudienceProfile::create([
            'tenant_id' => $request->user()->tenant_id,
            'name' => $request->name,
            'demographics' => $request->demographics ?? [],
            'psychographics' => $request->psychographics ?? [],
            'objections' => $request->objections ?? [],
            'language_patterns' => $request->language_patterns ?? [],
        ]);

        return response()->json(['profile' => $profile], 201);
    }

    /**
     * Atualiza um perfil de audiencia
     * PUT /api/brand-layers/audience-profiles/{id}
     */
    public function updateAudienceProfile(Request $request, string $id): JsonResponse
    {
        $profile = AudienceProfile::where('tenant_id', $request->user()->tenant_id)
            ->findOrFail($id);

        $request->validate([
            'name' => 'sometimes|string|max:255',
            'demographics' => 'nullable|array',
            'psychographics' => 'nullable|array',
            'objections' => 'nullable|array',
            'language_patterns' => 'nullable|array',
        ]);

        $profile->update($request->only([
            'name',
            'demographics',
            'psychographics',
            'objections',
            'language_patterns',
        ]));

        return response()->json(['profile' => $profile]);
    }

    /**
     * Deleta um perfil de audiencia
     * DELETE /api/brand-layers/audience-profiles/{id}
     */
    public function destroyAudienceProfile(Request $request, string $id): JsonResponse
    {
        $profile = AudienceProfile::where('tenant_id', $request->user()->tenant_id)
            ->findOrFail($id);

        $profile->delete();

        return response()->json(['message' => 'Perfil deletado com sucesso']);
    }

    // ==================== PRODUCT POSITIONINGS ====================

    /**
     * Lista todos os posicionamentos de produto do tenant
     * GET /api/brand-layers/product-positionings
     */
    public function listProductPositionings(Request $request): JsonResponse
    {
        $positionings = ProductPositioning::where('tenant_id', $request->user()->tenant_id)
            ->orderBy('name')
            ->get()
            ->map(fn($positioning) => [
                'id' => $positioning->id,
                'name' => $positioning->name,
                'transformation' => $positioning->transformation,
                'mechanism' => $positioning->mechanism,
                'promises' => $positioning->promises,
                'objection_handling' => $positioning->objection_handling,
                'created_at' => $positioning->created_at->toISOString(),
                'updated_at' => $positioning->updated_at->toISOString(),
            ]);

        return response()->json(['positionings' => $positionings]);
    }

    /**
     * Retorna um posicionamento de produto especifico
     * GET /api/brand-layers/product-positionings/{id}
     */
    public function showProductPositioning(Request $request, string $id): JsonResponse
    {
        $positioning = ProductPositioning::where('tenant_id', $request->user()->tenant_id)
            ->findOrFail($id);

        return response()->json(['positioning' => $positioning]);
    }

    /**
     * Cria um novo posicionamento de produto
     * POST /api/brand-layers/product-positionings
     */
    public function storeProductPositioning(Request $request): JsonResponse
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'transformation' => 'nullable|array',
            'transformation.before_state' => 'nullable|string',
            'transformation.after_state' => 'nullable|string',
            'transformation.journey_description' => 'nullable|string',
            'mechanism' => 'nullable|array',
            'mechanism.how_it_works' => 'nullable|string',
            'mechanism.unique_method' => 'nullable|string',
            'mechanism.differentiator' => 'nullable|string',
            'promises' => 'nullable|array',
            'promises.main_promise' => 'nullable|string',
            'promises.secondary_promises' => 'nullable|array',
            'promises.proof_points' => 'nullable|array',
            'objection_handling' => 'nullable|array',
        ]);

        $positioning = ProductPositioning::create([
            'tenant_id' => $request->user()->tenant_id,
            'name' => $request->name,
            'transformation' => $request->transformation ?? [],
            'mechanism' => $request->mechanism ?? [],
            'promises' => $request->promises ?? [],
            'objection_handling' => $request->objection_handling ?? [],
        ]);

        return response()->json(['positioning' => $positioning], 201);
    }

    /**
     * Atualiza um posicionamento de produto
     * PUT /api/brand-layers/product-positionings/{id}
     */
    public function updateProductPositioning(Request $request, string $id): JsonResponse
    {
        $positioning = ProductPositioning::where('tenant_id', $request->user()->tenant_id)
            ->findOrFail($id);

        $request->validate([
            'name' => 'sometimes|string|max:255',
            'transformation' => 'nullable|array',
            'mechanism' => 'nullable|array',
            'promises' => 'nullable|array',
            'objection_handling' => 'nullable|array',
        ]);

        $positioning->update($request->only([
            'name',
            'transformation',
            'mechanism',
            'promises',
            'objection_handling',
        ]));

        return response()->json(['positioning' => $positioning]);
    }

    /**
     * Deleta um posicionamento de produto
     * DELETE /api/brand-layers/product-positionings/{id}
     */
    public function destroyProductPositioning(Request $request, string $id): JsonResponse
    {
        $positioning = ProductPositioning::where('tenant_id', $request->user()->tenant_id)
            ->findOrFail($id);

        $positioning->delete();

        return response()->json(['message' => 'Posicionamento deletado com sucesso']);
    }

    // ==================== ALL LAYERS (for chat context) ====================

    /**
     * Retorna todas as camadas disponiveis para selecao no chat
     * GET /api/brand-layers/all
     */
    public function getAllLayers(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;

        $brandProfiles = BrandEditorialProfile::where('tenant_id', $tenantId)
            ->orderBy('name')
            ->get(['id', 'name']);

        $audienceProfiles = AudienceProfile::where('tenant_id', $tenantId)
            ->orderBy('name')
            ->get(['id', 'name']);

        $productPositionings = ProductPositioning::where('tenant_id', $tenantId)
            ->orderBy('name')
            ->get(['id', 'name']);

        return response()->json([
            'brand_profiles' => $brandProfiles,
            'audience_profiles' => $audienceProfiles,
            'product_positionings' => $productPositionings,
        ]);
    }
}
