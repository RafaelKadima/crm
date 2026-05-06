<?php

namespace App\Support;

/**
 * Catálogo central das permission keys do RBAC v2 (Custom Profiles).
 *
 * Inspirado no padrão ZPRO (35 keys agrupadas por feature). Manter
 * consistência: nunca renomear keys após shipping — só adicionar novas.
 * Renomear quebra todos os custom_profiles dos tenants.
 *
 * Quando adicionar uma key nova:
 *   1. Adicionar na PERMISSIONS abaixo
 *   2. Atualizar `groups()` se a categoria for nova
 *   3. Decidir se entra em ADMIN_ONLY_ACTIONS (whitelist de não-delegáveis)
 *   4. Aplicar via `$user->hasPermission('key')` ou `<Can permission="key">`
 *      onde a feature é gated
 */
final class CustomPermissions
{
    /**
     * 35 keys agrupadas por seção. Valor true = padrão habilitado em
     * profiles novos sem config explícita; false = padrão negado.
     */
    public const PERMISSIONS = [
        // Tickets
        'tickets_view'                => true,
        'tickets_create'              => true,
        'tickets_delete'              => false,
        'tickets_reopen'              => false,
        'tickets_reopen_others'       => false,
        'tickets_transfer'            => true,
        'tickets_pause'               => true,
        'tickets_close'               => true,

        // Contatos
        'contacts_view'               => true,
        'contacts_create'             => true,
        'contacts_edit'               => true,
        'contacts_delete'             => false,
        'contacts_export'             => false,

        // Mensagens
        'messages_send'               => true,
        'messages_send_media'         => true,
        'messages_quote'              => true,
        'messages_delete'             => false,

        // Broadcasts
        'broadcasts_view'             => true,
        'broadcasts_create'           => false,
        'broadcasts_send'             => false,

        // Templates WABA
        'templates_view'              => true,
        'templates_create'            => false,
        'templates_submit'            => false,

        // Kanban / pipeline
        'kanban_view'                 => true,
        'kanban_manage'               => false,

        // Relatórios
        'reports_view'                => true,
        'reports_export'              => false,

        // Filas
        'queues_view'                 => true,
        'queues_manage'               => false,

        // Respostas rápidas
        'quickreplies_manage_public'  => false,
        'quickreplies_manage_private' => true,

        // Admin / system
        'api_service_access'          => false,
        'audit_log_view'              => false,
        'sessions_manage'             => false,
        'users_manage'                => false,
    ];

    /**
     * Permissões que NUNCA podem ser delegadas via custom profile —
     * exigem o flag `is_super_admin` OU role enum ADMIN. Mesmo que um
     * profile seja criado com essas keys = true, o trait
     * HasCustomPermissions força denied se o user não for admin.
     *
     * Razão: ações irreversíveis ou que abrem brecha pra escalação.
     */
    public const ADMIN_ONLY_ACTIONS = [
        'tickets_delete',
        'tickets_reopen',
        'contacts_export',
        'users_manage',
        'sessions_manage',
        'api_service_access',
        'audit_log_view',
    ];

    /**
     * Agrupamento pra exibição em UI (form de criação de profile).
     */
    public static function groups(): array
    {
        return [
            'tickets' => ['tickets_view', 'tickets_create', 'tickets_delete', 'tickets_reopen', 'tickets_reopen_others', 'tickets_transfer', 'tickets_pause', 'tickets_close'],
            'contacts' => ['contacts_view', 'contacts_create', 'contacts_edit', 'contacts_delete', 'contacts_export'],
            'messages' => ['messages_send', 'messages_send_media', 'messages_quote', 'messages_delete'],
            'broadcasts' => ['broadcasts_view', 'broadcasts_create', 'broadcasts_send'],
            'templates' => ['templates_view', 'templates_create', 'templates_submit'],
            'kanban' => ['kanban_view', 'kanban_manage'],
            'reports' => ['reports_view', 'reports_export'],
            'queues' => ['queues_view', 'queues_manage'],
            'quickreplies' => ['quickreplies_manage_public', 'quickreplies_manage_private'],
            'admin' => ['api_service_access', 'audit_log_view', 'sessions_manage', 'users_manage'],
        ];
    }

    public static function allKeys(): array
    {
        return array_keys(self::PERMISSIONS);
    }

    public static function defaults(): array
    {
        return self::PERMISSIONS;
    }

    public static function isAdminOnly(string $key): bool
    {
        return in_array($key, self::ADMIN_ONLY_ACTIONS, true);
    }

    public static function exists(string $key): bool
    {
        return array_key_exists($key, self::PERMISSIONS);
    }

    /**
     * Sanitiza um array de permissions vindo do request — remove keys
     * desconhecidas, normaliza pra bool.
     */
    public static function sanitize(array $permissions): array
    {
        $clean = [];
        foreach (self::allKeys() as $key) {
            $clean[$key] = (bool) ($permissions[$key] ?? false);
        }
        return $clean;
    }
}
