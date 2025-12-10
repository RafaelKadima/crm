<?php

namespace App\Services\AI;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class AudioService
{
    protected string $apiKey;
    protected string $baseUrl;

    // Configurações de TTS
    protected string $ttsModel = 'tts-1';
    protected string $ttsVoice = 'nova'; // alloy, echo, fable, onyx, nova, shimmer

    // Limite de caracteres para decidir se envia áudio
    protected int $audioThreshold = 500;

    public function __construct()
    {
        $this->apiKey = config('services.openai.api_key', '');
        $this->baseUrl = config('services.openai.base_url', 'https://api.openai.com/v1');
        $this->audioThreshold = config('services.openai.audio_threshold', 500);
    }

    /**
     * Transcreve áudio para texto usando Whisper.
     */
    public function transcribe(string $audioPath, ?string $language = 'pt'): ?array
    {
        if (empty($this->apiKey)) {
            Log::error('OpenAI API key not configured for audio transcription');
            return null;
        }

        try {
            // Verifica se é URL ou path local
            if (filter_var($audioPath, FILTER_VALIDATE_URL)) {
                $audioContent = Http::get($audioPath)->body();
                $filename = 'audio_' . Str::random(10) . '.ogg';
            } elseif (Storage::exists($audioPath)) {
                $audioContent = Storage::get($audioPath);
                $filename = basename($audioPath);
            } elseif (file_exists($audioPath)) {
                $audioContent = file_get_contents($audioPath);
                $filename = basename($audioPath);
            } else {
                Log::error('Audio file not found', ['path' => $audioPath]);
                return null;
            }

            $response = Http::withHeaders([
                'Authorization' => 'Bearer ' . $this->apiKey,
            ])->attach(
                'file', $audioContent, $filename
            )->post($this->baseUrl . '/audio/transcriptions', [
                'model' => 'whisper-1',
                'language' => $language,
                'response_format' => 'verbose_json',
            ]);

            if ($response->successful()) {
                $data = $response->json();
                
                return [
                    'text' => $data['text'] ?? '',
                    'language' => $data['language'] ?? $language,
                    'duration' => $data['duration'] ?? null,
                    'segments' => $data['segments'] ?? [],
                ];
            }

            Log::error('Whisper transcription error', [
                'status' => $response->status(),
                'body' => $response->body(),
            ]);

            return null;

        } catch (\Exception $e) {
            Log::error('Audio transcription exception', ['error' => $e->getMessage()]);
            return null;
        }
    }

    /**
     * Converte texto para áudio usando TTS.
     */
    public function textToSpeech(
        string $text,
        ?string $voice = null,
        ?string $model = null
    ): ?array {
        if (empty($this->apiKey)) {
            Log::error('OpenAI API key not configured for TTS');
            return null;
        }

        try {
            $response = Http::withHeaders([
                'Authorization' => 'Bearer ' . $this->apiKey,
                'Content-Type' => 'application/json',
            ])->post($this->baseUrl . '/audio/speech', [
                'model' => $model ?? $this->ttsModel,
                'input' => $text,
                'voice' => $voice ?? $this->ttsVoice,
                'response_format' => 'mp3',
            ]);

            if ($response->successful()) {
                $audioContent = $response->body();
                
                // Salva o arquivo temporariamente
                $filename = 'tts_' . Str::random(16) . '.mp3';
                $path = 'tts/' . $filename;
                
                Storage::put($path, $audioContent);

                return [
                    'path' => $path,
                    'url' => Storage::url($path),
                    'filename' => $filename,
                    'size' => strlen($audioContent),
                    'duration_estimate' => $this->estimateAudioDuration(strlen($text)),
                ];
            }

            Log::error('TTS error', [
                'status' => $response->status(),
                'body' => substr($response->body(), 0, 200),
            ]);

            return null;

        } catch (\Exception $e) {
            Log::error('TTS exception', ['error' => $e->getMessage()]);
            return null;
        }
    }

    /**
     * Decide se deve enviar resposta como áudio baseado no tamanho.
     */
    public function shouldSendAsAudio(string $text): bool
    {
        return strlen($text) >= $this->audioThreshold;
    }

    /**
     * Processa resposta e converte para áudio se necessário.
     */
    public function processResponseForAudio(string $text): array
    {
        $result = [
            'text' => $text,
            'send_as_audio' => false,
            'audio' => null,
        ];

        if ($this->shouldSendAsAudio($text)) {
            // Limpa texto para TTS (remove markdown, etc)
            $cleanText = $this->prepareTextForTts($text);
            
            $audio = $this->textToSpeech($cleanText);
            
            if ($audio) {
                $result['send_as_audio'] = true;
                $result['audio'] = $audio;
            }
        }

        return $result;
    }

    /**
     * Prepara texto para TTS (remove formatação markdown, etc).
     */
    protected function prepareTextForTts(string $text): string
    {
        // Remove markdown bold/italic
        $text = preg_replace('/\*\*([^*]+)\*\*/', '$1', $text);
        $text = preg_replace('/\*([^*]+)\*/', '$1', $text);
        $text = preg_replace('/__([^_]+)__/', '$1', $text);
        $text = preg_replace('/_([^_]+)_/', '$1', $text);
        
        // Remove links markdown
        $text = preg_replace('/\[([^\]]+)\]\([^)]+\)/', '$1', $text);
        
        // Remove código inline
        $text = preg_replace('/`([^`]+)`/', '$1', $text);
        
        // Remove headers
        $text = preg_replace('/^#+\s*/m', '', $text);
        
        // Remove listas
        $text = preg_replace('/^[-*]\s*/m', '', $text);
        $text = preg_replace('/^\d+\.\s*/m', '', $text);
        
        // Limpa espaços extras
        $text = preg_replace('/\n{3,}/', "\n\n", $text);
        $text = trim($text);
        
        return $text;
    }

    /**
     * Estima duração do áudio baseado no texto.
     * Média: ~150 palavras por minuto em português
     */
    protected function estimateAudioDuration(int $textLength): float
    {
        // ~5 caracteres por palavra, ~150 palavras por minuto
        $words = $textLength / 5;
        $minutes = $words / 150;
        return round($minutes * 60, 1); // em segundos
    }

    /**
     * Define o limite para enviar como áudio.
     */
    public function setAudioThreshold(int $characters): self
    {
        $this->audioThreshold = $characters;
        return $this;
    }

    /**
     * Define a voz do TTS.
     */
    public function setVoice(string $voice): self
    {
        $this->ttsVoice = $voice;
        return $this;
    }

    /**
     * Lista vozes disponíveis.
     */
    public function getAvailableVoices(): array
    {
        return [
            'alloy' => 'Alloy - Voz neutra e versátil',
            'echo' => 'Echo - Voz masculina suave',
            'fable' => 'Fable - Voz expressiva e narradora',
            'onyx' => 'Onyx - Voz masculina profunda',
            'nova' => 'Nova - Voz feminina jovem e energética',
            'shimmer' => 'Shimmer - Voz feminina suave e clara',
        ];
    }

    /**
     * Limpa arquivos TTS antigos (cleanup).
     */
    public function cleanupOldFiles(int $olderThanMinutes = 60): int
    {
        $count = 0;
        $files = Storage::files('tts');
        $threshold = now()->subMinutes($olderThanMinutes);

        foreach ($files as $file) {
            $lastModified = Storage::lastModified($file);
            if ($lastModified < $threshold->timestamp) {
                Storage::delete($file);
                $count++;
            }
        }

        return $count;
    }
}

