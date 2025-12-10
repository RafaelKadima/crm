# Plano de Implementação - Frontend CRM

## Visão Geral

Frontend moderno para o CRM Multitenant com:
- **Framework**: React 18 + TypeScript
- **Build**: Vite 5
- **Estilização**: Tailwind CSS 3.4
- **Componentes**: shadcn/ui (Radix UI)
- **Animações**: Framer Motion
- **Drag & Drop**: @dnd-kit
- **Estado**: Zustand + TanStack Query
- **Gráficos**: Recharts
- **Formulários**: React Hook Form + Zod

---

## ETAPA 1: Setup Inicial e Estrutura

### 1.1 Criar Projeto

```bash
npm create vite@latest crm-frontend -- --template react-ts
cd crm-frontend
npm install
```

### 1.2 Instalar Dependências

```bash
# UI e Estilização
npm install tailwindcss postcss autoprefixer
npm install class-variance-authority clsx tailwind-merge
npm install lucide-react
npm install @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-select @radix-ui/react-tabs @radix-ui/react-tooltip @radix-ui/react-avatar @radix-ui/react-popover @radix-ui/react-slot

# Animações
npm install framer-motion

# Drag and Drop (Kanban)
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities

# Estado e Data Fetching
npm install @tanstack/react-query axios zustand

# Formulários
npm install react-hook-form @hookform/resolvers zod

# Roteamento
npm install react-router-dom

# Gráficos
npm install recharts

# Utilitários
npm install date-fns
```

### 1.3 Estrutura de Pastas

```
crm-frontend/
├── public/
│   └── favicon.ico
├── src/
│   ├── api/                    # Configuração Axios e endpoints
│   │   ├── axios.ts
│   │   ├── auth.ts
│   │   ├── leads.ts
│   │   ├── contacts.ts
│   │   ├── tickets.ts
│   │   ├── pipelines.ts
│   │   ├── tasks.ts
│   │   ├── reports.ts
│   │   └── groups.ts
│   │
│   ├── components/
│   │   ├── ui/                 # shadcn/ui components
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── dropdown-menu.tsx
│   │   │   ├── select.tsx
│   │   │   ├── table.tsx
│   │   │   ├── tabs.tsx
│   │   │   ├── avatar.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── tooltip.tsx
│   │   │   └── ...
│   │   │
│   │   ├── layout/             # Layout components
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Header.tsx
│   │   │   ├── MainLayout.tsx
│   │   │   └── MobileNav.tsx
│   │   │
│   │   ├── kanban/             # Kanban components
│   │   │   ├── KanbanBoard.tsx
│   │   │   ├── KanbanColumn.tsx
│   │   │   ├── KanbanCard.tsx
│   │   │   └── LeadModal.tsx
│   │   │
│   │   ├── chat/               # Chat/Conversa components
│   │   │   ├── ChatWindow.tsx
│   │   │   ├── ChatMessage.tsx
│   │   │   ├── ChatInput.tsx
│   │   │   └── ChatHeader.tsx
│   │   │
│   │   ├── charts/             # Gráficos
│   │   │   ├── FunnelChart.tsx
│   │   │   ├── LineChart.tsx
│   │   │   ├── BarChart.tsx
│   │   │   └── PieChart.tsx
│   │   │
│   │   └── shared/             # Componentes compartilhados
│   │       ├── DataTable.tsx
│   │       ├── SearchInput.tsx
│   │       ├── DateRangePicker.tsx
│   │       ├── LoadingSpinner.tsx
│   │       ├── EmptyState.tsx
│   │       └── ConfirmDialog.tsx
│   │
│   ├── pages/                  # Páginas da aplicação
│   │   ├── auth/
│   │   │   ├── Login.tsx
│   │   │   └── ForgotPassword.tsx
│   │   │
│   │   ├── dashboard/
│   │   │   └── Dashboard.tsx
│   │   │
│   │   ├── leads/
│   │   │   ├── LeadsKanban.tsx
│   │   │   └── LeadDetail.tsx
│   │   │
│   │   ├── contacts/
│   │   │   ├── ContactsList.tsx
│   │   │   └── ContactDetail.tsx
│   │   │
│   │   ├── tickets/
│   │   │   ├── TicketsList.tsx
│   │   │   └── TicketDetail.tsx
│   │   │
│   │   ├── tasks/
│   │   │   └── TasksList.tsx
│   │   │
│   │   ├── reports/
│   │   │   ├── FunnelReport.tsx
│   │   │   ├── ProductivityReport.tsx
│   │   │   └── IaReport.tsx
│   │   │
│   │   ├── settings/
│   │   │   ├── Settings.tsx
│   │   │   ├── PipelineSettings.tsx
│   │   │   ├── TeamSettings.tsx
│   │   │   └── IntegrationSettings.tsx
│   │   │
│   │   └── group/              # Visão de Grupo (multi-loja)
│   │       ├── GroupDashboard.tsx
│   │       ├── GroupMetrics.tsx
│   │       └── GroupRanking.tsx
│   │
│   ├── hooks/                  # Custom hooks
│   │   ├── useAuth.ts
│   │   ├── useLeads.ts
│   │   ├── useContacts.ts
│   │   ├── useTickets.ts
│   │   ├── useTasks.ts
│   │   ├── useReports.ts
│   │   ├── useGroups.ts
│   │   └── useTheme.ts
│   │
│   ├── store/                  # Zustand stores
│   │   ├── authStore.ts
│   │   ├── uiStore.ts
│   │   └── filterStore.ts
│   │
│   ├── lib/                    # Utilitários
│   │   ├── utils.ts
│   │   ├── cn.ts
│   │   └── formatters.ts
│   │
│   ├── types/                  # TypeScript types
│   │   ├── auth.ts
│   │   ├── lead.ts
│   │   ├── contact.ts
│   │   ├── ticket.ts
│   │   ├── pipeline.ts
│   │   ├── task.ts
│   │   └── group.ts
│   │
│   ├── styles/
│   │   ├── globals.css         # Tailwind + CSS Variables
│   │   └── themes.css          # Temas personalizáveis
│   │
│   ├── App.tsx
│   ├── main.tsx
│   └── routes.tsx
│
├── .env
├── .env.example
├── tailwind.config.js
├── tsconfig.json
├── vite.config.ts
└── package.json
```

---

## ETAPA 2: Sistema de Temas Personalizável

### 2.1 CSS Variables (globals.css)

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    /* Cores Base - Personalizável por tenant */
    --primary: 220 90% 56%;
    --primary-foreground: 0 0% 100%;
    
    --secondary: 220 14% 96%;
    --secondary-foreground: 220 9% 46%;
    
    --accent: 262 83% 58%;
    --accent-foreground: 0 0% 100%;
    
    --background: 0 0% 100%;
    --foreground: 222 47% 11%;
    
    --card: 0 0% 100%;
    --card-foreground: 222 47% 11%;
    
    --muted: 220 14% 96%;
    --muted-foreground: 220 9% 46%;
    
    --destructive: 0 84% 60%;
    --destructive-foreground: 0 0% 100%;
    
    --border: 220 13% 91%;
    --input: 220 13% 91%;
    --ring: 220 90% 56%;
    
    --radius: 0.5rem;
    
    /* Sidebar */
    --sidebar-bg: 222 47% 11%;
    --sidebar-text: 220 14% 96%;
    --sidebar-active: 220 90% 56%;
    
    /* Kanban Colors */
    --kanban-novo: 217 91% 60%;
    --kanban-qualificacao: 262 83% 58%;
    --kanban-apresentacao: 38 92% 50%;
    --kanban-proposta: 0 84% 60%;
    --kanban-negociacao: 330 81% 60%;
    --kanban-fechamento: 142 76% 36%;
  }
  
  .dark {
    --background: 222 47% 11%;
    --foreground: 220 14% 96%;
    
    --card: 223 47% 13%;
    --card-foreground: 220 14% 96%;
    
    --muted: 223 47% 17%;
    --muted-foreground: 220 9% 60%;
    
    --border: 223 47% 20%;
    --input: 223 47% 20%;
    
    --sidebar-bg: 223 47% 8%;
  }
}

/* Animações globais */
@layer utilities {
  .animate-fade-in {
    animation: fadeIn 0.3s ease-out;
  }
  
  .animate-slide-up {
    animation: slideUp 0.3s ease-out;
  }
  
  .animate-scale-in {
    animation: scaleIn 0.2s ease-out;
  }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes scaleIn {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}
```

### 2.2 Hook de Tema (useTheme.ts)

```typescript
// Carrega tema do tenant da API e aplica CSS Variables
interface TenantTheme {
  primaryColor: string;
  accentColor: string;
  logo: string;
  darkMode: boolean;
}

export function useTheme() {
  const applyTheme = (theme: TenantTheme) => {
    const root = document.documentElement;
    root.style.setProperty('--primary', theme.primaryColor);
    root.style.setProperty('--accent', theme.accentColor);
    // ... aplicar outras variáveis
  };
  
  return { applyTheme };
}
```

---

## ETAPA 3: Componentes Core

### 3.1 Layout Principal

**MainLayout.tsx** - Sidebar + Header + Content
- Sidebar colapsável
- Header com busca global, notificações, perfil
- Breadcrumbs
- Responsivo (mobile-first)

### 3.2 Kanban Board

**KanbanBoard.tsx** - Funcionalidades:
- Drag and drop entre colunas (@dnd-kit)
- Cores por estágio
- Cards com:
  - Avatar do contato
  - Nome
  - Valor
  - Tempo no estágio
  - Ícone de conversa (abre modal)
- Filtros (vendedor, canal, data)
- Busca
- Animações de transição (Framer Motion)

### 3.3 Modal de Conversa

**LeadModal.tsx** - Ao clicar no card:
- Informações do lead (editáveis)
- Histórico da conversa (scroll infinito)
- Input para enviar mensagem
- Ações: transferir, finalizar, agendar
- Timeline de atividades

### 3.4 DataTable

**DataTable.tsx** - Tabela reutilizável:
- Ordenação
- Paginação
- Filtros por coluna
- Busca
- Seleção múltipla
- Ações em lote
- Export CSV

---

## ETAPA 4: Páginas

### 4.1 Login
- Formulário com validação (Zod)
- Animação de entrada
- Logo personalizável
- Remember me
- Forgot password

### 4.2 Dashboard
- Cards de métricas (leads, tickets, conversões)
- Gráfico de funil
- Gráfico de evolução (linha)
- Tarefas do dia
- Leads recentes
- Tickets abertos

### 4.3 Kanban de Leads
- Board completo
- Modal lateral de detalhes
- Chat integrado
- Filtros avançados

### 4.4 Contatos
- Tabela com busca
- Detalhes do contato
- Histórico de interações
- Leads vinculados

### 4.5 Tickets
- Lista de tickets
- Filtros por status
- Detalhe com conversa
- Transferência

### 4.6 Tarefas
- Lista de tarefas
- Filtro por tipo/status
- Calendário
- Marcar como concluída

### 4.7 Relatórios
- Funil de vendas
- Produtividade por vendedor
- Performance da IA
- Distribuição Round-Robin

### 4.8 Configurações
- Perfil do usuário
- Configurações do pipeline
- Gerenciar equipe
- Integrações externas

### 4.9 Visão de Grupo (Multi-Loja)
- Dashboard consolidado
- Métricas por loja
- Ranking de vendedores
- Comparativo entre lojas

---

## ETAPA 5: Integrações API

### 5.1 Axios Config

```typescript
// src/api/axios.ts
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor para refresh token
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Redirect to login ou refresh token
    }
    return Promise.reject(error);
  }
);

export default api;
```

### 5.2 React Query Hooks

```typescript
// src/hooks/useLeads.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { leadsApi } from '@/api/leads';

export function useLeads(filters?: LeadFilters) {
  return useQuery({
    queryKey: ['leads', filters],
    queryFn: () => leadsApi.list(filters),
  });
}

export function useUpdateLeadStage() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ leadId, stageId }) => leadsApi.updateStage(leadId, stageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });
}
```

---

## ETAPA 6: Animações e Transições

### 6.1 Framer Motion - Page Transitions

```typescript
// Wrapper para páginas
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: -20 }}
  transition={{ duration: 0.3 }}
>
  {children}
</motion.div>
```

### 6.2 Animações do Kanban

```typescript
// Card animation ao arrastar
<motion.div
  layoutId={lead.id}
  whileHover={{ scale: 1.02 }}
  whileTap={{ scale: 0.98 }}
  transition={{ type: "spring", stiffness: 300, damping: 25 }}
>
  <KanbanCard lead={lead} />
</motion.div>
```

### 6.3 Micro-interações

- Hover em botões (scale + shadow)
- Click feedback
- Loading states com skeleton
- Success/Error toasts animados
- Modal slide-in
- Dropdown fade-in

---

## ETAPA 7: Responsividade

### 7.1 Breakpoints

```
sm: 640px   - Mobile landscape
md: 768px   - Tablet
lg: 1024px  - Desktop
xl: 1280px  - Large desktop
2xl: 1536px - Extra large
```

### 7.2 Mobile Adaptations

- Sidebar vira bottom navigation
- Kanban horizontal scrollável
- Tabelas viram cards
- Modal full-screen
- Touch-friendly (44px min tap target)

---

## Ordem de Implementação

| # | Tarefa | Prioridade |
|---|--------|------------|
| 1 | Setup projeto + Tailwind + shadcn/ui | Alta |
| 2 | Sistema de temas (CSS Variables) | Alta |
| 3 | Layout (Sidebar + Header) | Alta |
| 4 | Autenticação (Login + Auth Store) | Alta |
| 5 | Dashboard básico | Alta |
| 6 | Kanban Board (sem drag) | Alta |
| 7 | Kanban Drag & Drop | Alta |
| 8 | Modal de Lead + Chat | Alta |
| 9 | Página de Contatos | Média |
| 10 | Página de Tickets | Média |
| 11 | Página de Tarefas | Média |
| 12 | Relatórios + Gráficos | Média |
| 13 | Configurações | Média |
| 14 | Visão de Grupo | Média |
| 15 | Animações refinadas | Baixa |
| 16 | PWA (offline) | Baixa |
| 17 | Testes E2E | Baixa |

---

## Checklist de Implementação

### Setup
- [ ] Criar projeto Vite + React + TypeScript
- [ ] Configurar Tailwind CSS
- [ ] Instalar e configurar shadcn/ui
- [ ] Configurar React Router
- [ ] Configurar React Query
- [ ] Configurar Zustand
- [ ] Criar estrutura de pastas

### Componentes UI Base
- [ ] Button, Input, Card, Dialog
- [ ] Select, Dropdown, Tabs
- [ ] Table, Avatar, Badge
- [ ] Toast notifications
- [ ] Loading states

### Layout
- [ ] Sidebar com navegação
- [ ] Header com busca e perfil
- [ ] Mobile navigation
- [ ] Breadcrumbs

### Autenticação
- [ ] Página de Login
- [ ] Auth store (Zustand)
- [ ] Interceptors Axios
- [ ] Protected routes

### Dashboard
- [ ] Cards de métricas
- [ ] Gráfico de funil
- [ ] Gráfico de evolução
- [ ] Lista de tarefas
- [ ] Leads recentes

### Kanban
- [ ] KanbanBoard component
- [ ] KanbanColumn component
- [ ] KanbanCard component
- [ ] Drag and Drop (@dnd-kit)
- [ ] Filtros e busca
- [ ] Animações

### Lead Modal
- [ ] Informações do lead
- [ ] Chat/Conversa
- [ ] Timeline de atividades
- [ ] Ações (transferir, finalizar)

### Páginas Secundárias
- [ ] Contatos (lista + detalhe)
- [ ] Tickets (lista + detalhe)
- [ ] Tarefas (lista + calendário)
- [ ] Relatórios (4 tipos)
- [ ] Configurações

### Visão de Grupo
- [ ] Dashboard consolidado
- [ ] Métricas por loja
- [ ] Ranking vendedores

### Polimento
- [ ] Animações de página
- [ ] Micro-interações
- [ ] Tema dark mode
- [ ] Responsividade completa
- [ ] Acessibilidade (a11y)

---

## Arquivos de Configuração

### .env.example
```
VITE_API_URL=http://localhost:8000/api
VITE_APP_NAME=CRM
```

### vite.config.ts
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

### tailwind.config.js
```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: 'hsl(var(--primary))',
        secondary: 'hsl(var(--secondary))',
        accent: 'hsl(var(--accent))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        // ... outras cores
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}
```

