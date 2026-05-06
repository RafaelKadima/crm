<?php

namespace App\Http\Controllers;

use App\Models\Tag;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class TagController extends Controller
{
    public function index(): JsonResponse
    {
        $tags = Tag::query()->orderBy('name')->get();
        return response()->json(['data' => $tags]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:64',
            'color' => 'sometimes|string|max:7',
        ]);

        $tag = Tag::create([
            'tenant_id' => $request->user()->tenant_id,
            'name' => $validated['name'],
            'slug' => Str::slug($validated['name']),
            'color' => $validated['color'] ?? '#6b7280',
        ]);

        return response()->json(['data' => $tag], 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $tag = Tag::findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|string|max:64',
            'color' => 'sometimes|string|max:7',
        ]);

        if (isset($validated['name'])) {
            $validated['slug'] = Str::slug($validated['name']);
        }

        $tag->update($validated);

        return response()->json(['data' => $tag]);
    }

    public function destroy(string $id): JsonResponse
    {
        Tag::findOrFail($id)->delete();
        return response()->json(['message' => 'Tag excluída.']);
    }

    /**
     * Atribui uma tag a um ticket. POST /api/tickets/{ticket}/tags
     */
    public function attachToTicket(Request $request, string $ticketId): JsonResponse
    {
        $validated = $request->validate(['tag_id' => 'required|uuid|exists:tags,id']);

        $ticket = \App\Models\Ticket::findOrFail($ticketId);
        $tag = Tag::findOrFail($validated['tag_id']);

        if ($ticket->tenant_id !== $tag->tenant_id) {
            abort(422, 'Tag e ticket pertencem a tenants diferentes.');
        }

        $ticket->tags()->syncWithoutDetaching([$tag->id]);

        return response()->json(['message' => 'Tag adicionada.', 'tags' => $ticket->fresh()->tags]);
    }

    public function detachFromTicket(string $ticketId, string $tagId): JsonResponse
    {
        $ticket = \App\Models\Ticket::findOrFail($ticketId);
        $ticket->tags()->detach($tagId);

        return response()->json(['message' => 'Tag removida.']);
    }
}
