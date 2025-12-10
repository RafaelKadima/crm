<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class TenantSettingsController extends Controller
{
    /**
     * Retorna as configurações do tenant atual.
     */
    public function show(): JsonResponse
    {
        $tenant = auth()->user()->tenant;

        return response()->json([
            'tenant' => [
                'id' => $tenant->id,
                'name' => $tenant->name,
                'slug' => $tenant->slug,
                'whatsapp_number' => $tenant->whatsapp_number,
                'settings' => $tenant->settings,
                'plan' => $tenant->plan,
                'created_at' => $tenant->created_at,
            ],
        ]);
    }

    /**
     * Atualiza as configurações do tenant atual.
     */
    public function update(Request $request): JsonResponse
    {
        $tenant = auth()->user()->tenant;

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'whatsapp_number' => 'nullable|string|max:20',
            'email' => 'nullable|email|max:255',
            'phone' => 'nullable|string|max:20',
            'address' => 'nullable|string|max:500',
            'city' => 'nullable|string|max:100',
            'state' => 'nullable|string|max:2',
            'website' => 'nullable|url|max:255',
        ]);

        // Atualiza campos principais
        if (isset($validated['name'])) {
            $tenant->name = $validated['name'];
        }
        if (isset($validated['whatsapp_number'])) {
            $tenant->whatsapp_number = $validated['whatsapp_number'];
        }

        // Atualiza settings
        $settings = $tenant->settings ?? [];
        $settingsFields = ['email', 'phone', 'address', 'city', 'state', 'website'];
        
        foreach ($settingsFields as $field) {
            if (array_key_exists($field, $validated)) {
                $settings[$field] = $validated[$field];
            }
        }
        
        $tenant->settings = $settings;
        $tenant->save();

        return response()->json([
            'message' => 'Configurações atualizadas com sucesso.',
            'tenant' => [
                'id' => $tenant->id,
                'name' => $tenant->name,
                'slug' => $tenant->slug,
                'whatsapp_number' => $tenant->whatsapp_number,
                'settings' => $tenant->settings,
                'plan' => $tenant->plan,
            ],
        ]);
    }
}

