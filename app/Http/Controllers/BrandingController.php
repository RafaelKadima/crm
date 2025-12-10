<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class BrandingController extends Controller
{
    /**
     * Retorna as configurações de branding do tenant atual.
     */
    public function show(): JsonResponse
    {
        $tenant = auth()->user()->tenant;

        return response()->json([
            'name' => $tenant->name,
            'logo_url' => $tenant->logo_url ? Storage::url($tenant->logo_url) : null,
            'logo_dark_url' => $tenant->logo_dark_url ? Storage::url($tenant->logo_dark_url) : null,
            'favicon_url' => $tenant->favicon_url ? Storage::url($tenant->favicon_url) : null,
            'branding' => $tenant->getFullBranding(),
        ]);
    }

    /**
     * Atualiza as configurações de branding.
     */
    public function update(Request $request): JsonResponse
    {
        $tenant = auth()->user()->tenant;

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'primary_color' => 'sometimes|string|max:20',
            'secondary_color' => 'sometimes|string|max:20',
            'accent_color' => 'sometimes|string|max:20',
            'sidebar_color' => 'sometimes|string|max:20',
            'sidebar_text_color' => 'sometimes|string|max:20',
            'header_color' => 'sometimes|string|max:20',
            'header_text_color' => 'sometimes|string|max:20',
            'button_radius' => 'sometimes|string|max:10',
            'font_family' => 'sometimes|string|max:100',
        ]);

        // Atualiza nome se fornecido
        if (isset($validated['name'])) {
            $tenant->name = $validated['name'];
            unset($validated['name']);
        }

        // Atualiza branding colors
        if (!empty($validated)) {
            $tenant->updateBranding($validated);
        } else {
            $tenant->save();
        }

        return response()->json([
            'message' => 'Branding atualizado com sucesso.',
            'name' => $tenant->name,
            'branding' => $tenant->getFullBranding(),
        ]);
    }

    /**
     * Upload de logo.
     */
    public function uploadLogo(Request $request): JsonResponse
    {
        $request->validate([
            'logo' => 'required|image|mimes:png,jpg,jpeg,svg,webp|max:2048',
            'type' => 'required|in:light,dark,favicon',
        ]);

        $tenant = auth()->user()->tenant;
        $file = $request->file('logo');
        $type = $request->input('type');

        // Define o campo e diretório baseado no tipo
        $fieldMap = [
            'light' => 'logo_url',
            'dark' => 'logo_dark_url',
            'favicon' => 'favicon_url',
        ];
        $field = $fieldMap[$type];

        // Remove logo anterior se existir
        if ($tenant->$field) {
            Storage::disk('public')->delete($tenant->$field);
        }

        // Salva novo arquivo
        $filename = "tenants/{$tenant->id}/branding/{$type}_" . Str::random(10) . '.' . $file->getClientOriginalExtension();
        $path = $file->storeAs('', $filename, 'public');

        // Atualiza tenant
        $tenant->$field = $path;
        $tenant->save();

        return response()->json([
            'message' => 'Logo enviada com sucesso.',
            'url' => Storage::url($path),
            'type' => $type,
        ]);
    }

    /**
     * Remove uma logo.
     */
    public function removeLogo(Request $request): JsonResponse
    {
        $request->validate([
            'type' => 'required|in:light,dark,favicon',
        ]);

        $tenant = auth()->user()->tenant;
        $type = $request->input('type');

        $fieldMap = [
            'light' => 'logo_url',
            'dark' => 'logo_dark_url',
            'favicon' => 'favicon_url',
        ];
        $field = $fieldMap[$type];

        // Remove arquivo
        if ($tenant->$field) {
            Storage::disk('public')->delete($tenant->$field);
            $tenant->$field = null;
            $tenant->save();
        }

        return response()->json([
            'message' => 'Logo removida com sucesso.',
        ]);
    }

    /**
     * Retorna branding público de um tenant (para páginas públicas).
     */
    public function publicBranding(string $slug): JsonResponse
    {
        $tenant = \App\Models\Tenant::where('slug', $slug)->first();

        if (!$tenant) {
            return response()->json(['error' => 'Tenant not found'], 404);
        }

        return response()->json([
            'name' => $tenant->name,
            'logo_url' => $tenant->logo_url ? Storage::url($tenant->logo_url) : null,
            'logo_dark_url' => $tenant->logo_dark_url ? Storage::url($tenant->logo_dark_url) : null,
            'favicon_url' => $tenant->favicon_url ? Storage::url($tenant->favicon_url) : null,
            'branding' => $tenant->getFullBranding(),
        ]);
    }

    /**
     * Reseta branding para os valores padrão.
     */
    public function reset(): JsonResponse
    {
        $tenant = auth()->user()->tenant;
        
        $tenant->branding = null;
        $tenant->save();

        return response()->json([
            'message' => 'Branding resetado para os valores padrão.',
            'branding' => $tenant->getFullBranding(),
        ]);
    }
}
