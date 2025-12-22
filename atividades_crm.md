As **atividades no Pipedrive** são tarefas ou compromissos que você agenda para avançar seus negócios em direção ao fechamento. Aqui está como elas funcionam:

## O que são atividades?

No Pipedrive, as atividades representam qualquer ação agendada por você para fechar um negócio, incluindo ligações, reuniões, almoços, e-mails, etc. Podem ser agendadas atividades relacionadas a uma pessoa, organização, projeto, lead ou negócio.

## Tipos de atividades

O padrão configurado são os tipos chamada, tarefa, prazo, e-mail ou almoço, mas também é possível criar tipos personalizados para atividades específicas da sua empresa.

## Recursos principais

**Vinculação e organização:** Você pode vincular atividades a negócios, contatos, organizações, leads ou projetos, mantendo tudo conectado e rastreável.

**Calendário e sincronização:** Você pode associar atividades a negócios e ver toda a sua lista de tarefas em uma página fácil de navegar que pode ser sincronizada com os calendários do Google e Microsoft.

**Lembretes:** O Pipedrive ainda envia lembretes para o seu dispositivo móvel.

**Detecção de estagnação:** O Pipedrive oferece o recurso de estagnação, que destaca negócios negligenciados e lembra você de entrar em ação antes que eles esfriem.

## Gestão de equipe

Os gerentes podem ver as atividades planejadas ou atrasadas de cada membro da equipe, para saber como está o desempenho individual deles e ajudá-los a melhorar, se necessário.

## Fluxo de trabalho

O fluxo natural da interface é baseado em ações, ou seja, o CRM encoraja os usuários a adicionar as próximas atividades à medida que as agendadas são concluídas. Na visualização de funil, você pode ver claramente quais negócios possuem atividades programadas, atrasadas ou não atribuídas.

A filosofia por trás é simples: você pode não controlar o resultado de cada negociação, mas pode controlar as ações que levam ao fechamento.

Que ideia excelente! Isso vai aumentar muito o engajamento da equipe e padronizar o processo de vendas. Vou estruturar tudo:

Expansão do Plano - Atividades por Etapa + Gamificação
1. Conceito Geral
┌─────────────────────────────────────────────────────────────────┐
│                         FUNIL DE VENDAS                         │
├───────────┬───────────┬───────────┬───────────┬────────────────┤
│  Prospect │ Qualific. │  Proposta │ Negociação│    Fechamento  │
├───────────┼───────────┼───────────┼───────────┼────────────────┤
│ ⬜ Ligar  │ ⬜ Reunião│ ⬜ Enviar │ ⬜ Follow │ ⬜ Contrato     │
│ ⬜ Email  │ ⬜ Demo   │   proposta│    up     │ ⬜ Onboarding  │
│           │           │           │           │                │
│  +20 pts  │  +30 pts  │  +40 pts  │  +30 pts  │    +50 pts     │
└───────────┴───────────┴───────────┴───────────┴────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      SISTEMA DE GAMIFICAÇÃO                     │
├─────────────────────────────────────────────────────────────────┤
│  🥉 Bronze (0-500pts)    → Prêmio: Folga meio período          │
│  🥈 Prata (501-1500pts)  → Prêmio: Vale presente R$100         │
│  🥇 Ouro (1501-3000pts)  → Prêmio: Day off                     │
│  💎 Diamante (3001+)     → Prêmio: Bônus em dinheiro           │
└─────────────────────────────────────────────────────────────────┘

2. Modelagem de Dados Completa
sql-- =====================================================
-- PARTE 1: ATIVIDADES POR ETAPA DO KANBAN
-- =====================================================

-- Templates de atividades configuradas por etapa
stage_activity_templates
├── id
├── pipeline_id
├── stage_id
├── activity_type_id
├── title
├── description
├── is_required (obrigatória ou sugerida)
├── order (sequência)
├── default_duration (minutos)
├── default_due_days (vence em X dias após entrar na etapa)
├── points (pontos ao completar)
├── company_id
├── created_by
└── timestamps

-- Atividades geradas a partir dos templates (por deal)
deal_stage_activities
├── id
├── deal_id
├── stage_id
├── stage_activity_template_id
├── activity_id (referência à atividade criada)
├── status (pending, completed, skipped)
├── completed_at
├── completed_by
├── points_earned
└── timestamps

-- =====================================================
-- PARTE 2: GAMIFICAÇÃO
-- =====================================================

-- Configuração de pontos por ação
point_rules
├── id
├── name (ex: "Completar ligação", "Fechar deal", "Avançar etapa")
├── action_type (activity_completed, deal_won, stage_advanced, etc.)
├── entity_type (nullable - Activity, Deal, Stage)
├── entity_id (nullable - tipo específico de atividade, etapa específica)
├── points
├── multiplier (ex: 1.5x em determinados períodos)
├── is_active
├── company_id
└── timestamps

-- Histórico de pontos ganhos
point_transactions
├── id
├── user_id
├── points
├── action_type
├── description
├── reference_type (Deal, Activity, etc.)
├── reference_id
├── point_rule_id
├── period (YYYY-MM para ranking mensal)
├── company_id
└── timestamps

-- Saldo consolidado do usuário
user_points
├── id
├── user_id
├── total_points (histórico total)
├── current_points (período atual)
├── period (YYYY-MM)
├── current_tier_id
├── company_id
└── timestamps

-- Fases/Níveis (Tiers)
gamification_tiers
├── id
├── name (Bronze, Prata, Ouro, Diamante)
├── icon
├── color
├── min_points
├── max_points (null para último nível)
├── order
├── company_id
└── timestamps

-- Prêmios/Recompensas
rewards
├── id
├── tier_id (prêmio vinculado a uma fase)
├── name
├── description
├── image_url
├── type (physical, digital, experience, bonus)
├── value (valor em R$ se aplicável)
├── is_active
├── company_id
└── timestamps

-- Prêmios resgatados/concedidos
user_rewards
├── id
├── user_id
├── reward_id
├── tier_id
├── status (pending, approved, delivered, rejected)
├── requested_at
├── approved_at
├── approved_by
├── delivered_at
├── notes
├── period (YYYY-MM - referente a qual período)
├── company_id
└── timestamps

-- Conquistas/Badges (opcional, mas legal)
achievements
├── id
├── name (ex: "Primeira venda", "10 ligações em um dia", "Streak 7 dias")
├── description
├── icon
├── condition_type
├── condition_value
├── points_bonus
├── is_active
├── company_id
└── timestamps

user_achievements
├── id
├── user_id
├── achievement_id
├── earned_at
└── timestamps

-- Configurações gerais de gamificação
gamification_settings
├── id
├── company_id
├── is_enabled
├── reset_period (monthly, quarterly, yearly, never)
├── show_leaderboard
├── show_points_to_users
├── notify_tier_change
├── notify_achievement
└── timestamps

3. Backend Laravel - Estrutura Expandida
Novos Models:
php// Models/StageActivityTemplate.php
class StageActivityTemplate extends Model
{
    public function stage() { return $this->belongsTo(Stage::class); }
    public function pipeline() { return $this->belongsTo(Pipeline::class); }
    public function activityType() { return $this->belongsTo(ActivityType::class); }
    
    // Gera atividades para um deal quando entra na etapa
    public function generateForDeal(Deal $deal): Activity
    {
        // Lógica de criação
    }
}

// Models/PointTransaction.php
class PointTransaction extends Model
{
    protected static function booted()
    {
        static::created(function ($transaction) {
            // Atualiza saldo do usuário
            app(GamificationService::class)->updateUserPoints($transaction->user_id);
        });
    }
}

// Models/GamificationTier.php
class GamificationTier extends Model
{
    public function rewards() { return $this->hasMany(Reward::class, 'tier_id'); }
    
    public static function getTierForPoints(int $points): ?self
    {
        return static::where('min_points', '<=', $points)
            ->where(fn($q) => $q->whereNull('max_points')->orWhere('max_points', '>=', $points))
            ->orderByDesc('min_points')
            ->first();
    }
}
Services:
php// Services/StageActivityService.php
class StageActivityService
{
    // Quando deal muda de etapa, gera atividades configuradas
    public function onDealStageChanged(Deal $deal, Stage $newStage): void
    {
        $templates = StageActivityTemplate::where('stage_id', $newStage->id)
            ->orderBy('order')
            ->get();
            
        foreach ($templates as $template) {
            $this->createActivityFromTemplate($deal, $template);
        }
    }
    
    // Verifica se todas atividades obrigatórias foram cumpridas
    public function canAdvanceStage(Deal $deal): bool
    {
        $pending = DealStageActivity::where('deal_id', $deal->id)
            ->where('stage_id', $deal->stage_id)
            ->whereHas('template', fn($q) => $q->where('is_required', true))
            ->where('status', 'pending')
            ->exists();
            
        return !$pending;
    }
    
    // Progresso das atividades da etapa atual
    public function getStageProgress(Deal $deal): array
    {
        $activities = DealStageActivity::where('deal_id', $deal->id)
            ->where('stage_id', $deal->stage_id)
            ->get();
            
        return [
            'total' => $activities->count(),
            'completed' => $activities->where('status', 'completed')->count(),
            'required_pending' => $activities->where('status', 'pending')
                ->filter(fn($a) => $a->template->is_required)->count(),
            'percentage' => // cálculo
        ];
    }
}

// Services/GamificationService.php
class GamificationService
{
    // Adiciona pontos por uma ação
    public function awardPoints(
        User $user, 
        string $actionType, 
        ?Model $reference = null,
        ?string $description = null
    ): ?PointTransaction {
        $rule = $this->findMatchingRule($actionType, $reference);
        
        if (!$rule) return null;
        
        $points = $rule->points * ($rule->multiplier ?? 1);
        
        $transaction = PointTransaction::create([
            'user_id' => $user->id,
            'points' => $points,
            'action_type' => $actionType,
            'description' => $description ?? $rule->name,
            'reference_type' => $reference ? get_class($reference) : null,
            'reference_id' => $reference?->id,
            'point_rule_id' => $rule->id,
            'period' => now()->format('Y-m'),
            'company_id' => $user->company_id,
        ]);
        
        $this->checkTierPromotion($user);
        $this->checkAchievements($user);
        
        return $transaction;
    }
    
    // Verifica se usuário subiu de tier
    public function checkTierPromotion(User $user): void
    {
        $userPoints = $user->currentPoints;
        $newTier = GamificationTier::getTierForPoints($userPoints->current_points);
        
        if ($newTier && $newTier->id !== $userPoints->current_tier_id) {
            $oldTier = $userPoints->currentTier;
            $userPoints->update(['current_tier_id' => $newTier->id]);
            
            event(new UserTierChanged($user, $oldTier, $newTier));
        }
    }
    
    // Ranking/Leaderboard
    public function getLeaderboard(string $period = null, int $limit = 10): Collection
    {
        $period = $period ?? now()->format('Y-m');
        
        return UserPoints::where('period', $period)
            ->with(['user', 'currentTier'])
            ->orderByDesc('current_points')
            ->limit($limit)
            ->get();
    }
    
    // Estatísticas do usuário
    public function getUserStats(User $user): array
    {
        $points = $user->currentPoints;
        $tier = $points->currentTier;
        $nextTier = GamificationTier::where('min_points', '>', $points->current_points)
            ->orderBy('min_points')
            ->first();
            
        return [
            'current_points' => $points->current_points,
            'total_points' => $points->total_points,
            'current_tier' => $tier,
            'next_tier' => $nextTier,
            'points_to_next_tier' => $nextTier ? $nextTier->min_points - $points->current_points : null,
            'rank' => $this->getUserRank($user),
            'achievements' => $user->achievements,
            'recent_transactions' => $user->pointTransactions()->latest()->limit(10)->get(),
        ];
    }
}
Events & Listeners:
php// Quando atividade é completada
class ActivityCompleted
{
    public function __construct(public Activity $activity, public User $user) {}
}

class AwardPointsForActivity
{
    public function handle(ActivityCompleted $event)
    {
        app(GamificationService::class)->awardPoints(
            $event->user,
            'activity_completed',
            $event->activity,
            "Completou: {$event->activity->title}"
        );
    }
}

// Quando deal avança de etapa
class DealStageChanged
{
    public function __construct(
        public Deal $deal, 
        public Stage $oldStage, 
        public Stage $newStage,
        public User $user
    ) {}
}

class HandleDealStageChange
{
    public function handle(DealStageChanged $event)
    {
        // Gera atividades da nova etapa
        app(StageActivityService::class)->onDealStageChanged(
            $event->deal, 
            $event->newStage
        );
        
        // Dá pontos por avançar
        app(GamificationService::class)->awardPoints(
            $event->user,
            'stage_advanced',
            $event->newStage,
            "Avançou deal para: {$event->newStage->name}"
        );
    }
}
Rotas API:
php// Atividades por Etapa
Route::prefix('pipelines/{pipeline}/stages/{stage}')->group(function () {
    Route::apiResource('activity-templates', StageActivityTemplateController::class);
    Route::post('activity-templates/reorder', [StageActivityTemplateController::class, 'reorder']);
});

Route::get('deals/{deal}/stage-activities', [DealStageActivityController::class, 'index']);
Route::post('deals/{deal}/stage-activities/{activity}/complete', [DealStageActivityController::class, 'complete']);
Route::post('deals/{deal}/stage-activities/{activity}/skip', [DealStageActivityController::class, 'skip']);
Route::get('deals/{deal}/stage-progress', [DealStageActivityController::class, 'progress']);

// Gamificação
Route::prefix('gamification')->group(function () {
    Route::get('my-stats', [GamificationController::class, 'myStats']);
    Route::get('leaderboard', [GamificationController::class, 'leaderboard']);
    Route::get('tiers', [GamificationController::class, 'tiers']);
    Route::get('achievements', [GamificationController::class, 'achievements']);
    Route::get('my-rewards', [GamificationController::class, 'myRewards']);
    Route::post('rewards/{reward}/claim', [GamificationController::class, 'claimReward']);
});

// Admin - Configuração
Route::prefix('admin/gamification')->middleware('admin')->group(function () {
    Route::apiResource('tiers', Admin\TierController::class);
    Route::apiResource('rewards', Admin\RewardController::class);
    Route::apiResource('point-rules', Admin\PointRuleController::class);
    Route::get('settings', [Admin\GamificationSettingsController::class, 'show']);
    Route::put('settings', [Admin\GamificationSettingsController::class, 'update']);
    Route::get('user-rewards', [Admin\UserRewardController::class, 'index']);
    Route::put('user-rewards/{userReward}/approve', [Admin\UserRewardController::class, 'approve']);
    Route::put('user-rewards/{userReward}/deliver', [Admin\UserRewardController::class, 'deliver']);
});
```

---

### 4. Frontend React - Componentes
```
src/
├── features/
│   ├── stage-activities/
│   │   ├── components/
│   │   │   ├── StageActivityChecklist.jsx    # Lista de atividades da etapa
│   │   │   ├── StageActivityItem.jsx         # Item individual
│   │   │   ├── StageProgressBar.jsx          # Barra de progresso
│   │   │   ├── StageActivityConfig.jsx       # Config admin por etapa
│   │   │   └── ActivityTemplateForm.jsx      # Form de template
│   │   └── hooks/
│   │       └── useStageActivities.js
│   │
│   └── gamification/
│       ├── components/
│       │   ├── UserPointsBadge.jsx           # Badge com pontos no header
│       │   ├── TierBadge.jsx                 # Badge do tier atual
│       │   ├── PointsAnimation.jsx           # Animação +XX pontos
│       │   ├── Leaderboard.jsx               # Ranking
│       │   ├── LeaderboardItem.jsx
│       │   ├── UserStatsCard.jsx             # Card com stats do usuário
│       │   ├── TierProgress.jsx              # Progresso para próximo tier
│       │   ├── AchievementsList.jsx          # Lista de conquistas
│       │   ├── AchievementBadge.jsx
│       │   ├── RewardsList.jsx               # Prêmios disponíveis
│       │   ├── RewardCard.jsx
│       │   ├── PointsHistory.jsx             # Histórico de transações
│       │   └── GamificationDashboard.jsx     # Dashboard completo
│       ├── admin/
│       │   ├── TierConfigForm.jsx
│       │   ├── RewardConfigForm.jsx
│       │   ├── PointRulesConfig.jsx
│       │   └── PendingRewardsTable.jsx
│       └── hooks/
│           ├── useGamification.js
│           ├── useLeaderboard.js
│           └── usePointsAnimation.js
Componentes Chave:
jsx// StageActivityChecklist.jsx - Mostra no card do deal
function StageActivityChecklist({ deal }) {
  const { activities, progress, completeActivity } = useStageActivities(deal.id);
  
  return (
    <div className="stage-activities">
      <div className="progress-header">
        <StageProgressBar percentage={progress.percentage} />
        <span>{progress.completed}/{progress.total} atividades</span>
      </div>
      
      <div className="activity-list">
        {activities.map(activity => (
          <StageActivityItem 
            key={activity.id}
            activity={activity}
            onComplete={() => completeActivity(activity.id)}
          />
        ))}
      </div>
      
      {progress.required_pending > 0 && (
        <Alert type="warning">
          Complete {progress.required_pending} atividade(s) obrigatória(s) 
          para avançar o deal
        </Alert>
      )}
    </div>
  );
}

// PointsAnimation.jsx - Feedback visual de pontos ganhos
function PointsAnimation({ points, onComplete }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.5 }}
      animate={{ opacity: 1, y: -30, scale: 1 }}
      exit={{ opacity: 0, y: -50 }}
      onAnimationComplete={onComplete}
      className="points-popup"
    >
      +{points} pts 🎉
    </motion.div>
  );
}

// GamificationDashboard.jsx
function GamificationDashboard() {
  const { stats, isLoading } = useGamification();
  
  return (
    <div className="gamification-dashboard">
      <div className="grid grid-cols-3 gap-6">
        {/* Stats do usuário */}
        <UserStatsCard stats={stats} />
        
        {/* Progresso para próximo tier */}
        <TierProgress 
          currentTier={stats.current_tier}
          nextTier={stats.next_tier}
          pointsToNext={stats.points_to_next_tier}
          currentPoints={stats.current_points}
        />
        
        {/* Conquistas recentes */}
        <AchievementsList achievements={stats.achievements} />
      </div>
      
      {/* Leaderboard */}
      <Leaderboard className="mt-8" />
      
      {/* Prêmios disponíveis */}
      <RewardsList 
        currentTier={stats.current_tier}
        className="mt-8" 
      />
    </div>
  );
}
```

---

### 5. Fluxo Visual
```
┌──────────────────────────────────────────────────────────────────────┐
│                        DEAL CARD NO KANBAN                           │
├──────────────────────────────────────────────────────────────────────┤
│  🏢 Empresa ABC                                         R$ 50.000    │
│  👤 João Silva                                                       │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  📋 Atividades da Etapa: Qualificação                         │  │
│  │  ████████░░░░░░░░░░░░░░░░░░░░ 40%                              │  │
│  │                                                                │  │
│  │  ✅ Ligação inicial (+20 pts)                                  │  │
│  │  ⬜ Reunião de descoberta (+30 pts) ⚠️ Obrigatória            │  │
│  │  ⬜ Enviar material (+15 pts)                                  │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ⚠️ Complete a reunião para avançar                                 │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│                           HEADER DO CRM                              │
├──────────────────────────────────────────────────────────────────────┤
│  🏠 Home  📊 Deals  👥 Contacts                    🏆 1.250 pts     │
│                                                    🥈 Prata          │
│                                           [Ver Ranking] [Meus Prêmios]│
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│                       LEADERBOARD (RANKING)                          │
├──────────────────────────────────────────────────────────────────────┤
│                        🏆 Dezembro 2024                              │
│                                                                      │
│  🥇 1º  Maria Santos      💎 Diamante    3.450 pts   ████████████   │
│  🥈 2º  Carlos Lima       🥇 Ouro        2.890 pts   ██████████     │
│  🥉 3º  Ana Costa         🥇 Ouro        2.650 pts   █████████      │
│     4º  Pedro Souza       🥈 Prata       1.890 pts   ██████         │
│  ➡️ 5º  Você             🥈 Prata       1.250 pts   ████           │
│     6º  Julia Alves       🥉 Bronze        890 pts   ███            │
│                                                                      │
│  📈 Faltam 251 pts para 🥇 Ouro                                     │
└──────────────────────────────────────────────────────────────────────┘
```

---

### 6. Admin - Telas de Configuração

**Configuração de Atividades por Etapa:**
```
┌──────────────────────────────────────────────────────────────────────┐
│  ⚙️ Configurar Atividades > Pipeline: Vendas B2B > Etapa: Proposta  │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  📋 Atividades desta etapa:                    [+ Adicionar]         │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │ ≡  📞 Ligação de apresentação                                 │  │
│  │    Tipo: Ligação | Prazo: 2 dias | Pontos: 25                 │  │
│  │    ⬜ Obrigatória                              [Editar] [🗑️]  │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │ ≡  📄 Enviar proposta comercial                               │  │
│  │    Tipo: Email | Prazo: 3 dias | Pontos: 40                   │  │
│  │    ✅ Obrigatória                              [Editar] [🗑️]  │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │ ≡  🤝 Reunião de negociação                                   │  │
│  │    Tipo: Reunião | Prazo: 5 dias | Pontos: 50                 │  │
│  │    ✅ Obrigatória                              [Editar] [🗑️]  │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

**Configuração de Gamificação:**
```
┌──────────────────────────────────────────────────────────────────────┐
│  ⚙️ Gamificação > Fases e Prêmios                                   │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  🔄 Reset de pontos: [Mensal ▼]     ✅ Exibir leaderboard           │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │  FASE           PONTOS          PRÊMIO                [Ações]  │ │
│  ├─────────────────────────────────────────────────────────────────┤ │
│  │  🥉 Bronze      0 - 500         Certificado digital   [✏️][🗑️]│ │
│  │  🥈 Prata       501 - 1500      Vale R$100           [✏️][🗑️]│ │
│  │  🥇 Ouro        1501 - 3000     Day Off              [✏️][🗑️]│ │
│  │  💎 Diamante    3001+           Bônus R$500          [✏️][🗑️]│ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                              [+ Adicionar Fase]      │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │  REGRAS DE PONTOS                                    [+ Regra] │ │
│  ├─────────────────────────────────────────────────────────────────┤ │
│  │  Completar ligação                              +15 pts        │ │
│  │  Completar reunião                              +30 pts        │ │
│  │  Avançar deal de etapa                          +20 pts        │ │
│  │  Fechar deal (ganho)                            +100 pts       │ │
│  │  Fechar deal > R$10.000                         +150 pts       │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘