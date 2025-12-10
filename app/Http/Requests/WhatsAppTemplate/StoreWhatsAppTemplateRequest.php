<?php

namespace App\Http\Requests\WhatsAppTemplate;

use App\Enums\WhatsAppTemplateCategoryEnum;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Request para criação de template do WhatsApp.
 */
class StoreWhatsAppTemplateRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     */
    public function rules(): array
    {
        return [
            'channel_id' => ['required', 'uuid', 'exists:channels,id'],
            'name' => [
                'required',
                'string',
                'min:3',
                'max:512',
                'regex:/^[a-zA-Z0-9_\s]+$/', // Apenas letras, números, underscores e espaços
            ],
            'category' => [
                'required',
                'string',
                Rule::in(array_column(WhatsAppTemplateCategoryEnum::cases(), 'value')),
            ],
            'language' => ['sometimes', 'string', 'max:10'],
            
            // Header
            'header_type' => ['nullable', 'string', Rule::in(['TEXT', 'IMAGE', 'VIDEO', 'DOCUMENT', 'NONE'])],
            'header_text' => ['nullable', 'required_if:header_type,TEXT', 'string', 'max:60'],
            'header_handle' => ['nullable', 'string'], // Media handle para imagens/vídeos/documentos
            
            // Body (obrigatório)
            'body_text' => ['required', 'string', 'min:1', 'max:1024'],
            
            // Footer
            'footer_text' => ['nullable', 'string', 'max:60'],
            
            // Buttons
            'buttons' => ['nullable', 'array', 'max:3'],
            'buttons.*.type' => ['required', 'string', Rule::in(['QUICK_REPLY', 'URL', 'PHONE_NUMBER', 'COPY_CODE'])],
            'buttons.*.text' => ['required_unless:buttons.*.type,COPY_CODE', 'string', 'max:25'],
            'buttons.*.url' => ['required_if:buttons.*.type,URL', 'nullable', 'url', 'max:2000'],
            'buttons.*.phone_number' => ['required_if:buttons.*.type,PHONE_NUMBER', 'nullable', 'string', 'max:20'],
            'buttons.*.example' => ['required_if:buttons.*.type,COPY_CODE', 'nullable', 'string', 'max:15'],
        ];
    }

    /**
     * Get custom messages for validator errors.
     */
    public function messages(): array
    {
        return [
            'name.required' => 'O nome do template é obrigatório.',
            'name.regex' => 'O nome do template pode conter apenas letras, números, underscores e espaços.',
            'name.min' => 'O nome do template deve ter pelo menos 3 caracteres.',
            'category.required' => 'A categoria do template é obrigatória.',
            'category.in' => 'Categoria inválida. Escolha entre MARKETING, AUTHENTICATION ou UTILITY.',
            'body_text.required' => 'O corpo da mensagem é obrigatório.',
            'body_text.max' => 'O corpo da mensagem não pode ter mais de 1024 caracteres.',
            'header_text.max' => 'O cabeçalho não pode ter mais de 60 caracteres.',
            'footer_text.max' => 'O rodapé não pode ter mais de 60 caracteres.',
            'buttons.max' => 'Máximo de 3 botões permitidos.',
            'buttons.*.text.max' => 'O texto do botão não pode ter mais de 25 caracteres.',
            'channel_id.exists' => 'Canal não encontrado.',
        ];
    }

    /**
     * Get custom attributes for validator errors.
     */
    public function attributes(): array
    {
        return [
            'channel_id' => 'canal',
            'name' => 'nome do template',
            'category' => 'categoria',
            'body_text' => 'corpo da mensagem',
            'header_text' => 'cabeçalho',
            'footer_text' => 'rodapé',
            'buttons' => 'botões',
        ];
    }
}

