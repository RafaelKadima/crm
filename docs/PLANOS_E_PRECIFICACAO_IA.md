## Planos e Precificação (CRM AI 360°) — foco em tokens e agentes

Este documento transforma o CRM AI em **3 planos vendáveis** (R$ 800 / R$ 1.399 / R$ 1.899) com:
- **assinatura fixa** (software + suporte)
- **franquia mensal de IA** (tokens/créditos)
- **excedente** (cobrança por consumo) e **pacotes adicionais**

> Recomendação central: **não misture GPT‑4o e GPT‑4o mini no mesmo “balde” de tokens sem ponderação**, senão você corre risco de prejuízo.

---

## 1) Qual modelo usar (SDR e agentes)

### SDR (atendimento/qualificação via chat)
- **Padrão**: **GPT‑4o mini**
  - melhor custo/benefício para volume (responder rápido, qualificar, tirar dúvidas, conduzir conversa)
- **Escalonamento (“modo premium”)**: **GPT‑4o**
  - usar só quando: objeções complexas, negociação avançada, múltiplos produtos, contexto muito longo, ou necessidade de “tom perfeito”.

**Regra prática**:
- 80–95% das mensagens do SDR em **4o mini**
- 5–20% em **4o** (sob gatilhos)

### Ads/Marketing (estratégia, campanhas, textos)
- **Operacional e volume (gerar variações, análises rápidas)**: **GPT‑4o mini**
- **Estratégia e decisões críticas (briefing, plano de escala, recomendações finais)**: **GPT‑4o** (menos chamadas, mais qualidade)

---

## 2) Como cobrar tokens sem confundir (unidades de IA)

### O problema
Se você incluir “X tokens/mês” e o cliente usar muito **GPT‑4o**, o custo real pode ficar **muito maior** do que se ele usasse só **GPT‑4o mini**.

### A solução (simples e vendável): **Unidades de IA**
Você cobra em **Unidades**, e internamente converte tokens de cada modelo para unidades com um “peso”.

**Definição sugerida:**
- **1 Unidade de IA = 1.000 tokens no GPT‑4o mini**  
- **1.000 tokens no GPT‑4o = 12 Unidades de IA** (peso 12x)

> Por que 12x? É uma “trava de margem” (pode ser 8x, 10x, 12x, 15x). Comece com **12x** e ajuste com seus dados do primeiro mês.

### Como você cobra (fórmula)
- Você entrega **franquia mensal** de Unidades por plano.
- Ao ultrapassar: cobra **excedente por 1.000 Unidades** (ou por 10.000).

**Exemplo de cálculo (interno):**
- 300.000 tokens em 4o mini → 300 Unidades
- 50.000 tokens em 4o → 50 × 12 = 600 Unidades
- Total do mês → 900 Unidades

---

## 3) O que limitar para PME (minha recomendação)

Para pequenas e médias empresas, o modelo mais fácil de vender e de controlar custo é **híbrido**:

- **Limite por usuários** (porque a empresa entende valor: “quantas pessoas usando”)
- **Franquia de IA em Unidades** (porque IA varia conforme volume e canal)
- **Limites de add-ons que estouram custo**:
  - **Documentos/Knowledge (RAG)**: limite por “documentos processados/mês”
  - **Áudio**: limite por “minutos de transcrição/mês”
  - **Imagem**: limite por “análises de imagem/mês”

Isso evita que um cliente “pequeno” vire um cliente “enterprise” pelo consumo.

---

## 4) Planos (valores que você passou)

### Resumo dos planos (sugestão inicial)

| Plano | Preço mensal | Para quem | Usuários | IA incluída (Unidades/mês) | Modelo padrão |
|---|---:|---|---:|---:|---|
| **Essencial** | **R$ 800** | CRM + atendimento organizado | até **3** | **0** (IA opcional) | — |
| **Performance** | **R$ 1.399** | SDR com IA para vender mais | até **6** | **2.500** | 4o mini |
| **Growth** | **R$ 1.899** | IA + Ads Intelligence (escala) | até **10** | **4.500** | 4o mini + 4o (premium) |

> Observação: “IA incluída” aqui é **franquia** (você pode subir ou descer depois de 30 dias de dados).

---

## 5) O que entra em cada plano (escopo vendável)

### Plano Essencial — R$ 800/mês
- CRM: Leads + Kanban/Pipelines + Contatos + Tarefas
- Tickets/Atendimento: mensagens, transferências, encerrar/reabrir
- Canais/Filas: filas, menu de filas, round-robin, carteirização
- Relatórios básicos
- **Sem IA inclusa** (você vende como add-on por consumo)

**Add-ons comuns para o Essencial:**
- “IA por consumo” (Unidades pré-pagas)
- Agendamentos
- Landing Pages
- Produtos

### Plano Performance — R$ 1.399/mês
Tudo do Essencial +:
- **SDR com IA** (agentes, regras por estágio, templates)
- Learning (feedback 👍/👎, perguntas detectadas, memória do lead)
- **IA incluída:** **2.500 Unidades/mês**
- **RAG (documentos):** até **10 documentos/mês** processados (reprocesso conta)
- **Áudio:** até **120 min/mês** de transcrição (voz/áudio)
- **Imagem:** até **50 análises/mês**

### Plano Growth — R$ 1.899/mês
Tudo do Performance +:
- **Ads Intelligence** (criativos, copies, guardrails, automações, insights)
- **IA incluída:** **4.500 Unidades/mês**
- **RAG (documentos):** até **30 documentos/mês**
- **Áudio:** até **300 min/mês**
- **Imagem:** até **150 análises/mês**
- **Modo Premium (GPT‑4o)** habilitado (com peso 12x em Unidades)

---

## 6) Excedentes e pacotes adicionais (preço sugerido)

### Excedente (quando passar da franquia)
Escolha 1 forma (a mais simples é por “milhar”):

- **Excedente:** **R$ 29 por 1.000 Unidades**  
  - ou **R$ 249 por 10.000 Unidades** (desconto)

> Isso vira “preço de consumo” fácil de explicar: “passou da franquia, é R$ X por pacote”.

### Pacotes adicionais (pré-pagos, vendem muito)
- **Pack IA 10k Unidades**: **R$ 229**
- **Pack IA 30k Unidades**: **R$ 599**
- **Pack IA 80k Unidades**: **R$ 1.399**

### Pacotes de RAG/Áudio/Imagem (para evitar rombo)
- **Pack RAG +20 documentos/mês**: **R$ 179**
- **Pack Áudio +200 min/mês**: **R$ 249**
- **Pack Imagem +200 análises/mês**: **R$ 199**

> Ajuste esses valores conforme seu custo real. A estrutura é o que importa.

---

## 7) Políticas de proteção (para não estourar custo)

### Regras técnicas que viram cláusula comercial
- **Limite de tamanho/quantidade de anexos** por ticket/mês (evita abuso).
- **Reprocessamento de documento** sempre conta como “novo processamento”.
- **Modo GPT‑4o**:
  - habilitado só no Growth (ou cobrado como “Premium”)
  - ativado por regras (ex.: “mensagem longa”, “negociação”, “múltiplos produtos”)

### Fair use (opcional, mas ajuda)
Você pode adicionar uma linha:
- “Uso justo de IA sujeito a políticas anti-abuso e automação de segurança.”

---

## 8) Como explicar pro cliente (texto pronto)

“Seu plano inclui uma franquia mensal de IA (Unidades).  
As Unidades servem para manter o preço justo e estável, porque existem tarefas simples e tarefas complexas.  
Se ultrapassar a franquia, você compra pacotes adicionais ou paga excedente — sempre transparente.”

---

## 9) Próximos ajustes que eu recomendo (para fecharmos redondo)

Para eu cravar as franquias finais (2.500/4.500 etc.) sem chute, me diga:
1) Média de leads/mês por cliente (ex.: 200, 500, 1.000)?
2) Em média, quantas mensagens por lead até qualificar (ex.: 6, 10, 20)?
3) O SDR vai atender **WhatsApp**, **Instagram** ou ambos?
4) Você quer vender **Agendamentos** em qual plano (Performance ou add-on)?


