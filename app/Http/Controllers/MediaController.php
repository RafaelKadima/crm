<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;
use Symfony\Component\HttpFoundation\StreamedResponse;

class MediaController extends Controller
{
    /**
     * Serve media files from S3 storage (authenticated route)
     * This proxy allows serving private S3 files through authenticated API
     */
    public function serve(Request $request, string $path): StreamedResponse
    {
        $disk = Storage::disk('media');

        if (!$disk->exists($path)) {
            abort(404, 'Mídia não encontrada');
        }

        $mimeType = $disk->mimeType($path) ?: 'application/octet-stream';
        $size = $disk->size($path);

        return response()->stream(
            function () use ($disk, $path) {
                $stream = $disk->readStream($path);
                fpassthru($stream);
                fclose($stream);
            },
            200,
            [
                'Content-Type' => $mimeType,
                'Content-Length' => $size,
                'Cache-Control' => 'public, max-age=86400', // Cache 24h
                'Accept-Ranges' => 'bytes',
            ]
        );
    }

    /**
     * Serve media files with signed URL (public route, no auth required)
     * URL signature validates access without requiring login
     */
    public function servePublic(Request $request, string $path): StreamedResponse
    {
        // Validate signed URL
        if (!$request->hasValidSignature()) {
            abort(403, 'URL expirada ou inválida');
        }

        $disk = Storage::disk('media');

        if (!$disk->exists($path)) {
            abort(404, 'Mídia não encontrada');
        }

        $mimeType = $disk->mimeType($path) ?: 'application/octet-stream';
        $size = $disk->size($path);

        return response()->stream(
            function () use ($disk, $path) {
                $stream = $disk->readStream($path);
                fpassthru($stream);
                fclose($stream);
            },
            200,
            [
                'Content-Type' => $mimeType,
                'Content-Length' => $size,
                'Cache-Control' => 'public, max-age=86400', // Cache 24h
                'Accept-Ranges' => 'bytes',
            ]
        );
    }

    /**
     * Generate a signed URL for media access
     * Returns a temporary URL that can be used without authentication
     */
    public function getSignedUrl(Request $request): \Illuminate\Http\JsonResponse
    {
        $validated = $request->validate([
            'path' => 'required|string',
        ]);

        $path = $validated['path'];
        
        // Remove leading /api/media/ if present
        $path = preg_replace('#^/?api/media/#', '', $path);
        
        $disk = Storage::disk('media');

        if (!$disk->exists($path)) {
            return response()->json(['error' => 'Mídia não encontrada'], 404);
        }

        // Generate signed URL valid for 1 hour
        $signedUrl = URL::temporarySignedRoute(
            'media.public',
            now()->addHour(),
            ['path' => $path]
        );

        return response()->json([
            'url' => $signedUrl,
            'expires_at' => now()->addHour()->toIso8601String(),
        ]);
    }
}

