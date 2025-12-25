<?php

namespace App\Http\Controllers;

use App\Enums\MessageDirectionEnum;
use App\Enums\SenderTypeEnum;
use App\Enums\TicketStatusEnum;
use App\Enums\ChannelTypeEnum;
use App\Models\Product;
use App\Models\Ticket;
use App\Models\TicketMessage;
use App\Services\WhatsAppService;
use App\Services\InstagramService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class ProductChatController extends Controller
{
    /**
     * Lista produtos ativos para o catálogo do chat
     */
    public function index(Request $request): JsonResponse
    {
        $query = Product::with(['images' => function ($q) {
                $q->orderBy('order')->orderBy('is_primary', 'desc');
            }])
            ->where('tenant_id', auth()->user()->tenant_id)
            ->where('is_active', true);

        // Busca por nome ou SKU
        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'ilike', "%{$search}%")
                    ->orWhere('sku', 'ilike', "%{$search}%");
            });
        }

        // Filtro por categoria
        if ($request->has('category_id') && $request->category_id) {
            $query->where('category_id', $request->category_id);
        }

        $products = $query->orderBy('name')->get()->map(function ($product) {
            return [
                'id' => $product->id,
                'name' => $product->name,
                'sku' => $product->sku,
                'price' => $product->price,
                'promotional_price' => $product->promotional_price,
                'short_description' => $product->short_description,
                'description' => $product->description,
                'primary_image' => $product->primary_image_url,
                'images' => $product->images->map(fn($img) => [
                    'id' => $img->id,
                    'url' => $img->url,
                    'alt' => $img->alt,
                ]),
            ];
        });

        return response()->json([
            'products' => $products,
        ]);
    }

    /**
     * Envia produto para o chat (texto + imagens)
     */
    public function sendToChat(Request $request, Ticket $ticket): JsonResponse
    {
        $validated = $request->validate([
            'product_id' => 'required|uuid|exists:products,id',
            'include_description' => 'boolean',
            'include_price' => 'boolean',
            'include_images' => 'boolean',
        ]);

        $product = Product::with(['images' => function ($q) {
            $q->orderBy('order')->orderBy('is_primary', 'desc');
        }])->findOrFail($validated['product_id']);

        // Verifica se produto pertence ao tenant
        if ($product->tenant_id !== auth()->user()->tenant_id) {
            return response()->json(['error' => 'Produto não encontrado.'], 404);
        }

        // Reabre o ticket se estiver fechado
        if ($ticket->status === TicketStatusEnum::CLOSED) {
            $ticket->update([
                'status' => TicketStatusEnum::OPEN,
                'closed_at' => null,
            ]);
        }

        // Monta mensagem de texto do produto
        $includeDescription = $validated['include_description'] ?? true;
        $includePrice = $validated['include_price'] ?? true;
        $includeImages = $validated['include_images'] ?? true;

        $messageText = $this->buildProductMessage($product, $includeDescription, $includePrice);

        // Cria mensagem de texto
        $textMessage = TicketMessage::create([
            'tenant_id' => $ticket->tenant_id,
            'ticket_id' => $ticket->id,
            'sender_type' => SenderTypeEnum::USER,
            'sender_id' => auth()->id(),
            'message' => $messageText,
            'direction' => MessageDirectionEnum::OUTBOUND,
            'sent_at' => now(),
            'metadata' => [
                'type' => 'product_catalog',
                'product_id' => $product->id,
            ],
        ]);

        // Envia via canal (WhatsApp/Instagram)
        $this->sendViaChannel($ticket, $messageText);

        // Envia imagens se solicitado
        $imagesSent = [];
        if ($includeImages && $product->images->count() > 0) {
            foreach ($product->images as $image) {
                $this->sendImageViaChannel($ticket, $image->url, $product->name);
                $imagesSent[] = [
                    'id' => $image->id,
                    'url' => $image->url,
                ];
            }
        }

        // Atualiza último contato do lead
        if ($ticket->lead) {
            $ticket->lead->updateLastInteraction(\App\Enums\InteractionSourceEnum::HUMAN);
        }

        return response()->json([
            'message' => 'Produto enviado com sucesso.',
            'ticket_message' => $textMessage,
            'images_sent' => $imagesSent,
            'product' => [
                'id' => $product->id,
                'name' => $product->name,
            ],
        ], 201);
    }

    /**
     * Monta mensagem formatada do produto
     */
    private function buildProductMessage(Product $product, bool $includeDescription, bool $includePrice): string
    {
        $lines = [];

        // Título
        $lines[] = "📦 *{$product->name}*";

        // SKU se existir
        if ($product->sku) {
            $lines[] = "Código: {$product->sku}";
        }

        $lines[] = "";

        // Descrição curta ou completa
        if ($includeDescription) {
            if ($product->short_description) {
                $lines[] = $product->short_description;
            } elseif ($product->description) {
                // Limita descrição a 300 caracteres
                $desc = strip_tags($product->description);
                if (strlen($desc) > 300) {
                    $desc = substr($desc, 0, 297) . '...';
                }
                $lines[] = $desc;
            }
            $lines[] = "";
        }

        // Preço
        if ($includePrice) {
            $price = number_format($product->price, 2, ',', '.');

            if ($product->promotional_price && $product->promotional_price < $product->price) {
                $promoPrice = number_format($product->promotional_price, 2, ',', '.');
                $lines[] = "~~De: R$ {$price}~~";
                $lines[] = "💰 *Por: R$ {$promoPrice}*";
            } else {
                $lines[] = "💰 *Preço: R$ {$price}*";
            }
        }

        return implode("\n", $lines);
    }

    /**
     * Envia mensagem via canal (WhatsApp/Instagram)
     */
    private function sendViaChannel(Ticket $ticket, string $message): void
    {
        try {
            $channel = $ticket->channel;
            $contact = $ticket->contact;

            if (!$channel || !$contact) {
                return;
            }

            $phone = $contact->phone;

            if ($channel->type === ChannelTypeEnum::WHATSAPP && $phone) {
                $whatsapp = new WhatsAppService($channel);
                $whatsapp->sendTextMessage($phone, $message);
            } elseif ($channel->type === ChannelTypeEnum::INSTAGRAM) {
                $igUserId = $contact->instagram_id ?? $contact->metadata['instagram_id'] ?? null;
                if ($igUserId) {
                    $instagram = new InstagramService($channel);
                    $instagram->sendTextMessage($igUserId, $message);
                }
            }
        } catch (\Exception $e) {
            Log::error('Erro ao enviar mensagem de produto via canal', [
                'ticket_id' => $ticket->id,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Envia imagem via canal (WhatsApp/Instagram)
     */
    private function sendImageViaChannel(Ticket $ticket, string $imageUrl, string $caption = ''): void
    {
        try {
            $channel = $ticket->channel;
            $contact = $ticket->contact;

            if (!$channel || !$contact) {
                return;
            }

            $phone = $contact->phone;

            if ($channel->type === ChannelTypeEnum::WHATSAPP && $phone) {
                $whatsapp = new WhatsAppService($channel);
                $whatsapp->sendMediaMessage($phone, 'image', $imageUrl, $caption);
            } elseif ($channel->type === ChannelTypeEnum::INSTAGRAM) {
                $igUserId = $contact->instagram_id ?? $contact->metadata['instagram_id'] ?? null;
                if ($igUserId) {
                    $instagram = new InstagramService($channel);
                    $instagram->sendMediaMessage($igUserId, $imageUrl);
                }
            }
        } catch (\Exception $e) {
            Log::error('Erro ao enviar imagem de produto via canal', [
                'ticket_id' => $ticket->id,
                'image_url' => $imageUrl,
                'error' => $e->getMessage(),
            ]);
        }
    }
}
