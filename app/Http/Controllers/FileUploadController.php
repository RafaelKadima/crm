<?php

namespace App\Http\Controllers;

use App\Models\TicketMessageAttachment;
use App\Models\Ticket;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Log;

class FileUploadController extends Controller
{
    /**
     * Allowed MIME types and their categories
     */
    protected array $allowedTypes = [
        // Images
        'image/jpeg' => ['category' => 'image', 'max_size' => 16 * 1024 * 1024], // 16MB
        'image/png' => ['category' => 'image', 'max_size' => 16 * 1024 * 1024],
        'image/gif' => ['category' => 'image', 'max_size' => 16 * 1024 * 1024],
        'image/webp' => ['category' => 'image', 'max_size' => 16 * 1024 * 1024],
        
        // Videos
        'video/mp4' => ['category' => 'video', 'max_size' => 64 * 1024 * 1024], // 64MB
        'video/quicktime' => ['category' => 'video', 'max_size' => 64 * 1024 * 1024],
        'video/webm' => ['category' => 'video', 'max_size' => 64 * 1024 * 1024],
        
        // Audio
        'audio/mpeg' => ['category' => 'audio', 'max_size' => 16 * 1024 * 1024], // 16MB
        'audio/ogg' => ['category' => 'audio', 'max_size' => 16 * 1024 * 1024],
        'audio/wav' => ['category' => 'audio', 'max_size' => 16 * 1024 * 1024],
        'audio/webm' => ['category' => 'audio', 'max_size' => 16 * 1024 * 1024],
        
        // Documents
        'application/pdf' => ['category' => 'document', 'max_size' => 100 * 1024 * 1024], // 100MB
        'application/msword' => ['category' => 'document', 'max_size' => 100 * 1024 * 1024],
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document' => ['category' => 'document', 'max_size' => 100 * 1024 * 1024],
        'application/vnd.ms-excel' => ['category' => 'document', 'max_size' => 100 * 1024 * 1024],
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' => ['category' => 'document', 'max_size' => 100 * 1024 * 1024],
        'text/plain' => ['category' => 'document', 'max_size' => 10 * 1024 * 1024], // 10MB
    ];

    /**
     * Get presigned URL for direct upload to S3/R2
     */
    public function getPresignedUrl(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'filename' => 'required|string|max:255',
            'mime_type' => 'required|string',
            'file_size' => 'required|integer|min:1',
            'ticket_id' => 'required|uuid|exists:tickets,id',
        ]);

        // Validate MIME type
        if (!isset($this->allowedTypes[$validated['mime_type']])) {
            return response()->json([
                'error' => 'Tipo de arquivo não permitido.',
                'allowed_types' => array_keys($this->allowedTypes),
            ], 400);
        }

        $typeConfig = $this->allowedTypes[$validated['mime_type']];

        // Validate file size
        if ($validated['file_size'] > $typeConfig['max_size']) {
            return response()->json([
                'error' => 'Arquivo muito grande.',
                'max_size' => $typeConfig['max_size'],
                'max_size_mb' => round($typeConfig['max_size'] / 1024 / 1024, 1),
            ], 400);
        }

        // Verify ticket belongs to user's tenant
        $ticket = Ticket::find($validated['ticket_id']);
        if (!$ticket || $ticket->tenant_id !== auth()->user()->tenant_id) {
            return response()->json(['error' => 'Ticket não encontrado.'], 404);
        }

        $tenantId = auth()->user()->tenant_id;
        $extension = pathinfo($validated['filename'], PATHINFO_EXTENSION);
        $uniqueFilename = Str::uuid() . '.' . $extension;
        
        // Path structure: {tenant_id}/tickets/{ticket_id}/{uuid}.{ext}
        $path = "{$tenantId}/tickets/{$validated['ticket_id']}/{$uniqueFilename}";

        try {
            $disk = Storage::disk($this->getMediaDisk());
            
            // Check if using S3-compatible storage
            if ($this->isS3Compatible()) {
                // Generate presigned URL for S3/R2/MinIO
                $presignedUrl = $this->generatePresignedUrl($path, $validated['mime_type']);
                $expiresAt = now()->addMinutes(15);

                // Create pending attachment record
                $attachment = TicketMessageAttachment::create([
                    'tenant_id' => $tenantId,
                    'ticket_id' => $validated['ticket_id'],
                    'file_name' => $validated['filename'],
                    'file_path' => $path,
                    'file_type' => $typeConfig['category'],
                    'file_size' => $validated['file_size'],
                    'mime_type' => $validated['mime_type'],
                    'storage_disk' => $this->getMediaDisk(),
                    'status' => 'pending',
                    'presigned_expires_at' => $expiresAt,
                ]);

                return response()->json([
                    'success' => true,
                    'upload_url' => $presignedUrl,
                    'method' => 'PUT',
                    'attachment_id' => $attachment->id,
                    'path' => $path,
                    'expires_at' => $expiresAt->toIso8601String(),
                    'headers' => [
                        'Content-Type' => $validated['mime_type'],
                    ],
                ]);
            } else {
                // For local storage, return endpoint for traditional upload
                $attachment = TicketMessageAttachment::create([
                    'tenant_id' => $tenantId,
                    'ticket_id' => $validated['ticket_id'],
                    'file_name' => $validated['filename'],
                    'file_path' => $path,
                    'file_type' => $typeConfig['category'],
                    'file_size' => $validated['file_size'],
                    'mime_type' => $validated['mime_type'],
                    'storage_disk' => $this->getMediaDisk(),
                    'status' => 'pending',
                    'presigned_expires_at' => now()->addMinutes(15),
                ]);

                return response()->json([
                    'success' => true,
                    'upload_url' => route('files.upload-direct', ['attachment' => $attachment->id]),
                    'method' => 'POST',
                    'attachment_id' => $attachment->id,
                    'path' => $path,
                    'expires_at' => now()->addMinutes(15)->toIso8601String(),
                    'use_form_data' => true,
                ]);
            }
        } catch (\Exception $e) {
            Log::error('Failed to generate presigned URL', [
                'error' => $e->getMessage(),
                'ticket_id' => $validated['ticket_id'],
            ]);

            return response()->json([
                'error' => 'Erro ao gerar URL de upload.',
            ], 500);
        }
    }

    /**
     * Direct upload endpoint for local storage fallback
     */
    public function uploadDirect(Request $request, TicketMessageAttachment $attachment): JsonResponse
    {
        // Verify ownership
        if ($attachment->tenant_id !== auth()->user()->tenant_id) {
            return response()->json(['error' => 'Não autorizado.'], 403);
        }

        // Check if expired
        if ($attachment->presigned_expires_at && $attachment->presigned_expires_at->isPast()) {
            return response()->json(['error' => 'Link de upload expirado.'], 400);
        }

        // Check status
        if ($attachment->status !== 'pending') {
            return response()->json(['error' => 'Upload já foi realizado.'], 400);
        }

        $request->validate([
            'file' => 'required|file|max:102400', // 100MB max
        ]);

        $file = $request->file('file');

        // Verify MIME type matches
        if ($file->getMimeType() !== $attachment->mime_type) {
            return response()->json(['error' => 'Tipo de arquivo não corresponde.'], 400);
        }

        try {
            $disk = Storage::disk($attachment->storage_disk);
            $disk->put($attachment->file_path, file_get_contents($file->getRealPath()));

            $attachment->update([
                'status' => 'uploaded',
                'file_size' => $file->getSize(),
            ]);

            return response()->json([
                'success' => true,
                'attachment' => $attachment->fresh(),
            ]);
        } catch (\Exception $e) {
            Log::error('Direct upload failed', [
                'error' => $e->getMessage(),
                'attachment_id' => $attachment->id,
            ]);

            return response()->json(['error' => 'Falha no upload.'], 500);
        }
    }

    /**
     * Confirm upload was successful and associate with message
     */
    public function confirmUpload(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'attachment_id' => 'required|uuid|exists:ticket_message_attachments,id',
            'ticket_message_id' => 'nullable|uuid|exists:ticket_messages,id',
        ]);

        $attachment = TicketMessageAttachment::find($validated['attachment_id']);

        // Verify ownership
        if ($attachment->tenant_id !== auth()->user()->tenant_id) {
            return response()->json(['error' => 'Não autorizado.'], 403);
        }

        // For S3, verify the file exists
        if ($this->isS3Compatible() && $attachment->status === 'pending') {
            $disk = Storage::disk($attachment->storage_disk);
            
            if (!$disk->exists($attachment->file_path)) {
                return response()->json([
                    'error' => 'Arquivo não encontrado no storage. Upload pode não ter sido concluído.',
                ], 400);
            }
        }

        // Update attachment
        $attachment->update([
            'status' => 'confirmed',
            'ticket_message_id' => $validated['ticket_message_id'] ?? null,
        ]);

        // Generate download URL
        $downloadUrl = $this->generateDownloadUrl($attachment);

        return response()->json([
            'success' => true,
            'attachment' => array_merge($attachment->fresh()->toArray(), [
                'download_url' => $downloadUrl,
            ]),
        ]);
    }

    /**
     * Get download URL for an attachment
     */
    public function getDownloadUrl(Request $request, TicketMessageAttachment $attachment): JsonResponse
    {
        // Verify ownership
        if ($attachment->tenant_id !== auth()->user()->tenant_id) {
            return response()->json(['error' => 'Não autorizado.'], 403);
        }

        $url = $this->generateDownloadUrl($attachment);

        return response()->json([
            'success' => true,
            'download_url' => $url,
            'expires_at' => now()->addHour()->toIso8601String(),
        ]);
    }

    /**
     * List attachments for a ticket
     */
    public function listByTicket(Request $request, Ticket $ticket): JsonResponse
    {
        // Verify ownership
        if ($ticket->tenant_id !== auth()->user()->tenant_id) {
            return response()->json(['error' => 'Não autorizado.'], 403);
        }

        $attachments = TicketMessageAttachment::where('ticket_id', $ticket->id)
            ->where('status', 'confirmed')
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($attachment) {
                return array_merge($attachment->toArray(), [
                    'download_url' => $this->generateDownloadUrl($attachment),
                ]);
            });

        return response()->json([
            'success' => true,
            'data' => $attachments,
        ]);
    }

    /**
     * Delete an attachment
     */
    public function destroy(TicketMessageAttachment $attachment): JsonResponse
    {
        // Verify ownership
        if ($attachment->tenant_id !== auth()->user()->tenant_id) {
            return response()->json(['error' => 'Não autorizado.'], 403);
        }

        try {
            // Delete from storage
            $disk = Storage::disk($attachment->storage_disk);
            if ($disk->exists($attachment->file_path)) {
                $disk->delete($attachment->file_path);
            }

            $attachment->delete();

            return response()->json([
                'success' => true,
                'message' => 'Arquivo removido com sucesso.',
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to delete attachment', [
                'error' => $e->getMessage(),
                'attachment_id' => $attachment->id,
            ]);

            return response()->json(['error' => 'Erro ao remover arquivo.'], 500);
        }
    }

    /**
     * Get the media disk name
     */
    protected function getMediaDisk(): string
    {
        $driver = config('filesystems.disks.media.driver', 's3');
        
        // If media disk driver is s3 but no credentials, fallback to local
        if ($driver === 's3' && !config('filesystems.disks.media.key')) {
            return 'media_local';
        }

        return 'media';
    }

    /**
     * Check if using S3-compatible storage
     */
    protected function isS3Compatible(): bool
    {
        $disk = $this->getMediaDisk();
        return config("filesystems.disks.{$disk}.driver") === 's3';
    }

    /**
     * Generate presigned URL for S3 upload
     */
    protected function generatePresignedUrl(string $path, string $contentType): string
    {
        $disk = Storage::disk($this->getMediaDisk());
        $client = $disk->getClient();
        $bucket = config('filesystems.disks.' . $this->getMediaDisk() . '.bucket');

        $cmd = $client->getCommand('PutObject', [
            'Bucket' => $bucket,
            'Key' => $path,
            'ContentType' => $contentType,
        ]);

        $request = $client->createPresignedRequest($cmd, '+15 minutes');

        return (string) $request->getUri();
    }

    /**
     * Generate download URL for an attachment
     */
    protected function generateDownloadUrl(TicketMessageAttachment $attachment): string
    {
        $disk = Storage::disk($attachment->storage_disk);

        if (config("filesystems.disks.{$attachment->storage_disk}.driver") === 's3') {
            // Generate presigned download URL for S3
            return $disk->temporaryUrl($attachment->file_path, now()->addHour());
        }

        // For local storage, return a signed route
        return route('files.download', [
            'attachment' => $attachment->id,
            'signature' => $this->generateSignature($attachment->id),
        ]);
    }

    /**
     * Download file for local storage
     */
    public function download(Request $request, TicketMessageAttachment $attachment)
    {
        // Verify signature
        $signature = $request->query('signature');
        if (!$signature || $signature !== $this->generateSignature($attachment->id)) {
            abort(403);
        }

        // Verify ownership
        if ($attachment->tenant_id !== auth()->user()?->tenant_id) {
            abort(403);
        }

        $disk = Storage::disk($attachment->storage_disk);

        if (!$disk->exists($attachment->file_path)) {
            abort(404);
        }

        return $disk->download($attachment->file_path, $attachment->file_name);
    }

    /**
     * Generate signature for download URL
     */
    protected function generateSignature(string $attachmentId): string
    {
        return hash_hmac('sha256', $attachmentId, config('app.key'));
    }
}

