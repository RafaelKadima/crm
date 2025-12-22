# Plano de Implementação: Sistema KPR/KPI com Atividades

## Resumo Executivo

Este documento detalha o plano de implementação do sistema de **KPR (Key Performance Results)**, **KPIs (Key Performance Indicators)**, e **Atividades** para o CRM, seguindo a lógica:

```
ATIVIDADES → ETAPAS DO FUNIL → KPIs → KPR (META FINAL)
```

---

## 1. Análise da Infraestrutura Existente

### 1.1 Modelos Disponíveis

| Modelo | Descrição | Utilização |
|--------|-----------|------------|
| `Lead` | Negociações com value, status (won/lost), stage_id | Base para cálculo de vendas |
| `Pipeline` | Funis de vendas | Organização das etapas |
| `PipelineStage` | Etapas do funil com order | Tracking de progresso |
| `DealStageActivity` | Atividades por lead/etapa | **Já existe** - será expandido |
| `StageActivityTemplate` | Templates de atividades | **Já existe** - base para atividades |
| `UserPoints` | Pontos do usuário por período | Gamificação existente |
| `PointTransaction` | Histórico de pontos | Rastreabilidade |
| `User` | Usuários com roles (admin/gestor/vendedor) | Hierarquia de acesso |

### 1.2 Sistema de Gamificação Existente
- Tiers (níveis)
- Achievements (conquistas)
- Points Rules (regras de pontuação)
- Rewards (recompensas)

### 1.3 Relatórios Existentes
- Funil de vendas
- Produtividade por vendedor
- Performance da IA
- Distribuição de leads

---

## 2. Arquitetura Proposta

### 2.1 Diagrama de Entidades

```
┌─────────────────────────────────────────────────────────────────────┐
│                           NÍVEL EMPRESA                              │
├─────────────────────────────────────────────────────────────────────┤
│  Kpr (Meta Global)                                                   │
│  ├── name: "Meta Q1 2025"                                           │
│  ├── type: revenue | deals | activities                             │
│  ├── target_value: 1.000.000                                        │
│  ├── period_start: 2025-01-01                                       │
│  └── period_end: 2025-03-31                                         │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                           NÍVEL LOJA/EQUIPE                          │
├─────────────────────────────────────────────────────────────────────┤
│  KprAssignment (Distribuição)                                        │
│  ├── kpr_id: FK                                                     │
│  ├── assignable_type: team | user                                   │
│  ├── assignable_id: UUID                                            │
│  ├── target_value: 250.000 (25% da meta)                           │
│  └── weight: 25 (%)                                                 │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                           NÍVEL VENDEDOR                             │
├─────────────────────────────────────────────────────────────────────┤
│  KprAssignment (Individual)                                          │
│  ├── kpr_id: FK                                                     │
│  ├── assignable_type: user                                          │
│  ├── assignable_id: vendedor_uuid                                   │
│  ├── target_value: 50.000                                           │
│  └── parent_assignment_id: FK (team assignment)                     │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                           ATIVIDADES                                 │
├─────────────────────────────────────────────────────────────────────┤
│  DealStageActivity (Existente - Expandido)                          │
│  ├── lead_id, stage_id, template_id                                 │
│  ├── status: pending | completed | skipped                         │
│  ├── completed_at, completed_by                                     │
│  ├── kpi_contribution: valor calculado                              │ ← NOVO
│  └── points_earned                                                  │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                           KPIs (Calculados)                          │
├─────────────────────────────────────────────────────────────────────┤
│  Kpi (Indicadores)                                                   │
│  ├── name: "Taxa de Conversão", "Ticket Médio", etc.               │
│  ├── formula_type: ratio | sum | average | count                   │
│  ├── source: activities | leads | custom                           │
│  └── weight_in_kpr: 20 (%)                                         │
│                                                                      │
│  KpiValue (Snapshots)                                               │
│  ├── kpi_id, user_id, period                                        │
│  ├── calculated_value                                               │
│  └── contributing_activities: JSON                                  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. Novas Tabelas de Banco de Dados

### 3.1 Tabela `kprs` (Metas Globais)

```php
Schema::create('kprs', function (Blueprint $table) {
    $table->uuid('id')->primary();
    $table->foreignUuid('tenant_id')->constrained()->cascadeOnDelete();
    $table->string('name');                          // "Meta Q1 2025"
    $table->text('description')->nullable();
    $table->enum('type', ['revenue', 'deals', 'activities', 'custom']);
    $table->decimal('target_value', 15, 2);          // 1.000.000
    $table->date('period_start');
    $table->date('period_end');
    $table->enum('status', ['draft', 'active', 'completed', 'cancelled']);
    $table->foreignUuid('created_by')->nullable()->constrained('users');
    $table->timestamps();
    $table->softDeletes();

    $table->index(['tenant_id', 'status']);
    $table->index(['period_start', 'period_end']);
});
```

### 3.2 Tabela `kpr_assignments` (Distribuição de Metas)

```php
Schema::create('kpr_assignments', function (Blueprint $table) {
    $table->uuid('id')->primary();
    $table->foreignUuid('tenant_id')->constrained()->cascadeOnDelete();
    $table->foreignUuid('kpr_id')->constrained()->cascadeOnDelete();
    $table->uuidMorphs('assignable');                // team ou user
    $table->foreignUuid('parent_assignment_id')->nullable()
          ->constrained('kpr_assignments')->nullOnDelete();
    $table->decimal('target_value', 15, 2);
    $table->decimal('weight', 5, 2)->default(100);   // % da meta do pai
    $table->decimal('current_value', 15, 2)->default(0);
    $table->decimal('progress_percentage', 5, 2)->default(0);
    $table->timestamps();

    $table->index(['kpr_id', 'assignable_type', 'assignable_id']);
    $table->unique(['kpr_id', 'assignable_type', 'assignable_id']);
});
```

### 3.3 Tabela `kpis` (Indicadores)

```php
Schema::create('kpis', function (Blueprint $table) {
    $table->uuid('id')->primary();
    $table->foreignUuid('tenant_id')->constrained()->cascadeOnDelete();
    $table->string('name');                          // "Taxa de Conversão"
    $table->string('key')->unique();                 // "conversion_rate"
    $table->text('description')->nullable();
    $table->enum('formula_type', ['ratio', 'sum', 'average', 'count', 'custom']);
    $table->enum('source', ['leads', 'activities', 'stages', 'custom']);
    $table->json('formula_config')->nullable();      // Configuração da fórmula
    $table->string('unit')->default('%');            // %, R$, unidades
    $table->decimal('target_value', 15, 2)->nullable();
    $table->integer('weight')->default(100);         // Peso no cálculo do KPR
    $table->boolean('is_active')->default(true);
    $table->integer('display_order')->default(0);
    $table->timestamps();
});
```

### 3.4 Tabela `kpi_values` (Histórico de Valores)

```php
Schema::create('kpi_values', function (Blueprint $table) {
    $table->uuid('id')->primary();
    $table->foreignUuid('tenant_id')->constrained()->cascadeOnDelete();
    $table->foreignUuid('kpi_id')->constrained()->cascadeOnDelete();
    $table->foreignUuid('user_id')->nullable()->constrained()->nullOnDelete();
    $table->foreignUuid('team_id')->nullable()->constrained()->nullOnDelete();
    $table->string('period');                        // "2025-01" ou "2025-Q1"
    $table->decimal('calculated_value', 15, 4);
    $table->decimal('target_value', 15, 4)->nullable();
    $table->decimal('achievement_percentage', 5, 2)->default(0);
    $table->json('breakdown')->nullable();           // Detalhamento
    $table->json('contributing_items')->nullable();  // IDs de atividades/leads
    $table->timestamp('calculated_at');
    $table->timestamps();

    $table->index(['kpi_id', 'period']);
    $table->index(['user_id', 'period']);
});
```

### 3.5 Tabela `activity_kpi_mappings` (Mapeamento Atividade → KPI)

```php
Schema::create('activity_kpi_mappings', function (Blueprint $table) {
    $table->uuid('id')->primary();
    $table->foreignUuid('tenant_id')->constrained()->cascadeOnDelete();
    $table->foreignUuid('stage_activity_template_id')
          ->constrained()->cascadeOnDelete();
    $table->foreignUuid('kpi_id')->constrained()->cascadeOnDelete();
    $table->decimal('contribution_value', 10, 4)->default(1);  // Quanto contribui
    $table->enum('contribution_type', ['fixed', 'percentage', 'multiplier']);
    $table->boolean('is_active')->default(true);
    $table->timestamps();

    $table->unique(['stage_activity_template_id', 'kpi_id']);
});
```

### 3.6 Alteração na Tabela `deal_stage_activities`

```php
Schema::table('deal_stage_activities', function (Blueprint $table) {
    $table->json('kpi_contributions')->nullable()->after('points_earned');
    $table->decimal('revenue_contribution', 15, 2)->default(0)->after('kpi_contributions');
});
```

---

## 4. Models Laravel

### 4.1 Model Kpr

```php
// app/Models/Kpr.php
class Kpr extends Model
{
    use HasFactory, HasUuids, BelongsToTenant;

    protected $fillable = [
        'tenant_id', 'name', 'description', 'type',
        'target_value', 'period_start', 'period_end',
        'status', 'created_by'
    ];

    protected function casts(): array
    {
        return [
            'target_value' => 'decimal:2',
            'period_start' => 'date',
            'period_end' => 'date',
        ];
    }

    // Relacionamentos
    public function assignments(): HasMany;
    public function teamAssignments(): HasMany; // Filtrado por type=team
    public function userAssignments(): HasMany; // Filtrado por type=user
    public function creator(): BelongsTo;

    // Métodos
    public function getCurrentProgress(): float;
    public function isActive(): bool;
    public function getRemainingDays(): int;
    public function getProjectedResult(): float;
}
```

### 4.2 Model KprAssignment

```php
// app/Models/KprAssignment.php
class KprAssignment extends Model
{
    use HasFactory, HasUuids, BelongsToTenant;

    protected $fillable = [
        'tenant_id', 'kpr_id', 'assignable_type', 'assignable_id',
        'parent_assignment_id', 'target_value', 'weight',
        'current_value', 'progress_percentage'
    ];

    // Relacionamentos
    public function kpr(): BelongsTo;
    public function assignable(): MorphTo;  // Team ou User
    public function parent(): BelongsTo;
    public function children(): HasMany;

    // Métodos
    public function updateProgress(): void;
    public function getContributingActivities(): Collection;
    public function getContributingLeads(): Collection;
}
```

### 4.3 Model Kpi

```php
// app/Models/Kpi.php
class Kpi extends Model
{
    use HasFactory, HasUuids, BelongsToTenant;

    protected $fillable = [
        'tenant_id', 'name', 'key', 'description',
        'formula_type', 'source', 'formula_config',
        'unit', 'target_value', 'weight', 'is_active', 'display_order'
    ];

    // Métodos
    public function calculate(User $user, string $period): float;
    public function calculateForTeam(Team $team, string $period): float;
    public function getActivityMappings(): HasMany;
}
```

---

## 5. Services

### 5.1 KprCalculationService

```php
// app/Services/KprCalculationService.php
class KprCalculationService
{
    /**
     * Calcula o progresso de uma meta para um usuário.
     */
    public function calculateUserProgress(KprAssignment $assignment): array
    {
        $user = $assignment->assignable;
        $kpr = $assignment->kpr;

        // Busca leads ganhos no período
        $wonLeads = Lead::where('owner_id', $user->id)
            ->where('status', LeadStatusEnum::WON)
            ->whereBetween('updated_at', [$kpr->period_start, $kpr->period_end])
            ->get();

        // Calcula baseado no tipo de KPR
        $currentValue = match($kpr->type) {
            'revenue' => $wonLeads->sum('value'),
            'deals' => $wonLeads->count(),
            'activities' => $this->countCompletedActivities($user, $kpr),
            default => 0
        };

        return [
            'current_value' => $currentValue,
            'target_value' => $assignment->target_value,
            'progress_percentage' => ($currentValue / $assignment->target_value) * 100,
            'contributing_leads' => $wonLeads->pluck('id'),
            'remaining' => max(0, $assignment->target_value - $currentValue),
        ];
    }

    /**
     * Distribui a meta entre equipes/vendedores.
     */
    public function distributeToTeams(Kpr $kpr, array $distribution): void;

    /**
     * Recalcula o progresso de todas as atribuições de uma KPR.
     */
    public function recalculateAll(Kpr $kpr): void;
}
```

### 5.2 KpiCalculationService

```php
// app/Services/KpiCalculationService.php
class KpiCalculationService
{
    /**
     * Calcula todos os KPIs para um período.
     */
    public function calculateAll(string $tenantId, string $period): Collection
    {
        $kpis = Kpi::where('tenant_id', $tenantId)
            ->where('is_active', true)
            ->get();

        return $kpis->map(fn($kpi) => $this->calculate($kpi, $period));
    }

    /**
     * Calcula um KPI específico.
     */
    public function calculate(Kpi $kpi, string $period): KpiValue
    {
        $value = match($kpi->formula_type) {
            'count' => $this->calculateCount($kpi, $period),
            'sum' => $this->calculateSum($kpi, $period),
            'average' => $this->calculateAverage($kpi, $period),
            'ratio' => $this->calculateRatio($kpi, $period),
            'custom' => $this->calculateCustom($kpi, $period),
        };

        return KpiValue::updateOrCreate(
            ['kpi_id' => $kpi->id, 'period' => $period],
            ['calculated_value' => $value, 'calculated_at' => now()]
        );
    }

    /**
     * Exemplos de KPIs pré-definidos:
     */
    public function getConversionRate(string $tenantId, string $period): float
    {
        // Leads ganhos / Total de leads
    }

    public function getAverageTicket(string $tenantId, string $period): float
    {
        // Soma de valores / Quantidade de vendas
    }

    public function getActivitiesCompletionRate(string $tenantId, string $period): float
    {
        // Atividades concluídas / Total de atividades
    }

    public function getSalesVelocity(string $tenantId, string $period): float
    {
        // Tempo médio do primeiro contato até venda
    }
}
```

### 5.3 ActivityAnalysisService

```php
// app/Services/ActivityAnalysisService.php
class ActivityAnalysisService
{
    /**
     * Analisa como as atividades contribuíram para os resultados.
     */
    public function analyzeContribution(User $user, string $period): array
    {
        $activities = DealStageActivity::whereHas('lead', function($q) use ($user) {
                $q->where('owner_id', $user->id);
            })
            ->whereBetween('completed_at', [...])
            ->with(['template', 'lead'])
            ->get();

        // Agrupa por tipo de atividade
        $byType = $activities->groupBy('template.activity_type');

        // Calcula correlação com vendas
        $wonLeads = Lead::where('owner_id', $user->id)
            ->where('status', LeadStatusEnum::WON)
            ->whereBetween('updated_at', [...])
            ->get();

        return [
            'total_activities' => $activities->count(),
            'by_type' => $byType->map->count(),
            'completion_rate' => $this->getCompletionRate($user, $period),
            'activities_per_sale' => $activities->count() / max(1, $wonLeads->count()),
            'most_effective_activities' => $this->getMostEffective($activities, $wonLeads),
            'insight' => $this->generateInsight($activities, $wonLeads),
        ];
    }

    /**
     * Gera insight explicativo sobre o resultado.
     */
    public function generateInsight(Collection $activities, Collection $wonLeads): string
    {
        // Ex: "Você completou 45 atividades este mês.
        //      Leads com atividade 'Demo' tiveram 3x mais chance de conversão.
        //      Sugestão: Agende mais demos para aumentar suas vendas."
    }
}
```

---

## 6. Controllers e Rotas API

### 6.1 KprController

```php
// app/Http/Controllers/KprController.php
class KprController extends Controller
{
    // CRUD básico
    public function index(): JsonResponse;              // GET /api/kprs
    public function store(Request $request): JsonResponse;   // POST /api/kprs
    public function show(Kpr $kpr): JsonResponse;       // GET /api/kprs/{id}
    public function update(Request $request, Kpr $kpr); // PUT /api/kprs/{id}
    public function destroy(Kpr $kpr);                  // DELETE /api/kprs/{id}

    // Distribuição
    public function distribute(Request $request, Kpr $kpr); // POST /api/kprs/{id}/distribute

    // Progresso
    public function progress(Kpr $kpr): JsonResponse;   // GET /api/kprs/{id}/progress
    public function myProgress(): JsonResponse;         // GET /api/kprs/my-progress

    // Dashboard
    public function dashboard(): JsonResponse;          // GET /api/kprs/dashboard
}
```

### 6.2 KpiController

```php
// app/Http/Controllers/KpiController.php
class KpiController extends Controller
{
    public function index(): JsonResponse;              // Lista KPIs
    public function calculate(string $period): JsonResponse;  // Calcula todos
    public function userKpis(User $user, string $period): JsonResponse;  // KPIs de um usuário
    public function teamKpis(Team $team, string $period): JsonResponse;  // KPIs de uma equipe
    public function trends(string $kpiKey): JsonResponse;    // Tendência histórica
}
```

### 6.3 Rotas API

```php
// routes/api.php

// KPRs (Metas)
Route::prefix('kprs')->middleware('auth:api')->group(function () {
    Route::get('/', [KprController::class, 'index']);
    Route::post('/', [KprController::class, 'store']);
    Route::get('/my-progress', [KprController::class, 'myProgress']);
    Route::get('/dashboard', [KprController::class, 'dashboard']);
    Route::get('/{kpr}', [KprController::class, 'show']);
    Route::put('/{kpr}', [KprController::class, 'update']);
    Route::delete('/{kpr}', [KprController::class, 'destroy']);
    Route::post('/{kpr}/distribute', [KprController::class, 'distribute']);
    Route::get('/{kpr}/progress', [KprController::class, 'progress']);
});

// KPIs (Indicadores)
Route::prefix('kpis')->middleware('auth:api')->group(function () {
    Route::get('/', [KpiController::class, 'index']);
    Route::get('/calculate/{period}', [KpiController::class, 'calculate']);
    Route::get('/user/{user}/{period}', [KpiController::class, 'userKpis']);
    Route::get('/team/{team}/{period}', [KpiController::class, 'teamKpis']);
    Route::get('/trends/{kpiKey}', [KpiController::class, 'trends']);
});

// Análise de Atividades
Route::prefix('activity-analysis')->middleware('auth:api')->group(function () {
    Route::get('/contribution', [ActivityAnalysisController::class, 'contribution']);
    Route::get('/insights', [ActivityAnalysisController::class, 'insights']);
    Route::get('/stage-breakdown', [ActivityAnalysisController::class, 'stageBreakdown']);
});
```

---

## 7. Componentes Frontend React

### 7.1 Estrutura de Páginas

```
frontend/src/pages/
├── goals/                           # KPR Management
│   ├── GoalsDashboard.tsx          # Dashboard principal
│   ├── GoalsAdmin.tsx              # CRUD de metas (admin)
│   ├── GoalDistribution.tsx        # Distribuição para equipes
│   ├── MyGoals.tsx                 # Minhas metas (vendedor)
│   └── TeamGoals.tsx               # Metas da equipe (gestor)
├── kpis/                            # KPI Management
│   ├── KpisDashboard.tsx           # Painel de KPIs
│   ├── KpisConfig.tsx              # Configuração (admin)
│   └── KpiDetail.tsx               # Detalhe de um KPI
└── activities/                      # Expandir existente
    └── ActivityInsights.tsx        # Insights de atividades
```

### 7.2 Componentes Principais

```tsx
// components/goals/GoalProgressCard.tsx
interface GoalProgressCardProps {
  assignment: KprAssignment;
  showDetails?: boolean;
}

// components/goals/GoalDistributionForm.tsx
interface GoalDistributionFormProps {
  kpr: Kpr;
  teams: Team[];
  onDistribute: (distribution: Distribution[]) => void;
}

// components/kpis/KpiGauge.tsx
interface KpiGaugeProps {
  kpi: Kpi;
  value: number;
  target: number;
}

// components/kpis/KpiTrendChart.tsx
interface KpiTrendChartProps {
  kpiKey: string;
  period: 'week' | 'month' | 'quarter';
}

// components/activities/ActivityContributionChart.tsx
interface ActivityContributionChartProps {
  userId?: string;
  period: string;
}
```

### 7.3 Dashboard por Papel

```tsx
// Para ADMIN - Visão Global
<AdminGoalsDashboard>
  <GlobalKprProgress kprs={allKprs} />
  <TeamComparisonChart teams={teams} />
  <TopPerformers limit={10} />
  <KpiOverview kpis={globalKpis} />
</AdminGoalsDashboard>

// Para GESTOR - Visão da Equipe
<ManagerGoalsDashboard>
  <TeamKprProgress team={myTeam} />
  <VendorRanking team={myTeam} />
  <TeamKpis team={myTeam} />
  <ActivityInsights team={myTeam} />
</ManagerGoalsDashboard>

// Para VENDEDOR - Visão Individual
<SalesRepGoalsDashboard>
  <MyGoalProgress />
  <MyKpis />
  <MyActivityContribution />
  <ActionSuggestions />          {/* "Complete mais X para atingir Y" */}
</SalesRepGoalsDashboard>
```

---

## 8. KPIs Padrão Sugeridos

### 8.1 KPIs de Vendas

| KPI | Fórmula | Fonte |
|-----|---------|-------|
| Taxa de Conversão | Leads Ganhos / Total Leads | leads |
| Ticket Médio | Soma Valores / Qtd Vendas | leads |
| Ciclo de Venda | Média (data_ganho - data_criação) | leads |
| Valor Pipeline | Soma valores leads abertos | leads |

### 8.2 KPIs de Atividades

| KPI | Fórmula | Fonte |
|-----|---------|-------|
| Taxa de Conclusão | Atividades Concluídas / Total | activities |
| Atividades por Venda | Atividades / Leads Ganhos | activities + leads |
| Tempo Médio Atividade | Média (completed_at - created_at) | activities |
| Atividades Atrasadas | Count onde due_at < now e pending | activities |

### 8.3 KPIs por Etapa

| KPI | Fórmula | Fonte |
|-----|---------|-------|
| Taxa Passagem Etapa | Leads que passaram / Total na etapa | stages |
| Tempo Médio na Etapa | Média permanência | stages |
| Gargalo do Funil | Etapa com menor taxa de passagem | stages |

---

## 9. Cronograma de Implementação

### Fase 1: Backend Core (Prioridade Alta)
1. Criar migrações de banco de dados
2. Criar Models (Kpr, KprAssignment, Kpi, KpiValue)
3. Criar KprCalculationService
4. Criar KpiCalculationService
5. Criar Controllers e rotas básicas

### Fase 2: API e Integração
1. Expandir DealStageActivity com contribuições
2. Criar ActivityAnalysisService
3. Implementar endpoints de dashboard
4. Criar Jobs para recálculo periódico

### Fase 3: Frontend Básico
1. Criar páginas de Goals
2. Criar componentes de progresso
3. Integrar com API

### Fase 4: Frontend Avançado
1. Dashboards por papel
2. Gráficos e visualizações
3. Insights e sugestões

### Fase 5: Refinamento
1. Testes automatizados
2. Otimização de performance
3. Documentação

---

## 10. Considerações de Segurança

1. **Autorização por Papel**:
   - Admin: CRUD completo em KPRs e KPIs
   - Gestor: Visualização da equipe, distribuição de metas
   - Vendedor: Apenas visualização própria

2. **Isolamento Multi-tenant**:
   - Todas as queries filtradas por tenant_id
   - Usar BelongsToTenant trait em todos os models

3. **Auditoria**:
   - Log de alterações em metas
   - Histórico de distribuições

---

## 11. Próximos Passos

Após aprovação deste plano, a implementação seguirá esta ordem:

1. **Imediato**: Criar migrações e Models
2. **Em seguida**: Implementar Services de cálculo
3. **Depois**: Criar Controllers e rotas
4. **Por último**: Desenvolver Frontend

Confirme se deseja prosseguir com a implementação.
