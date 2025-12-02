<?php

namespace App\Enums;

enum GroupRoleEnum: string
{
    case OWNER = 'owner';       // Dono do grupo - acesso total
    case ADMIN = 'admin';       // Admin do grupo - pode gerenciar
    case VIEWER = 'viewer';     // Apenas visualização de métricas
}

