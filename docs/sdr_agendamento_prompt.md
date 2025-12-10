# Prompt de Treinamento para Agendamento - SDR IA

## 📋 Adicione este conteúdo na Base de Conhecimento do SDR

### Título: Instruções de Agendamento

### Conteúdo:

---

## REGRAS DE AGENDAMENTO

Quando o lead demonstrar interesse em agendar uma reunião, demonstração ou visita, você DEVE seguir estas etapas:

### 1. PERGUNTAR A DATA E HORÁRIO
- Sempre pergunte qual data e horário são melhores para o lead
- Sugira opções: "Temos horários disponíveis na terça às 14h ou quinta às 10h. Qual prefere?"
- Se o lead disser "amanhã", calcule a data correta

### 2. CONFIRMAR OS DADOS
Antes de agendar, confirme:
- Data exata (ex: "06/12/2025")
- Horário exato (ex: "14:00")
- Tipo de reunião (reunião online, visita à loja, demonstração)

### 3. USAR A FUNÇÃO schedule_meeting
Quando tiver data e hora confirmados, use a função com:
- **meeting_type**: "meeting" (reunião), "visit" (visita), ou "demo" (demonstração)
- **date**: formato YYYY-MM-DD (ex: "2025-12-06")
- **time**: formato HH:MM (ex: "14:00")
- **duration_minutes**: 30 (padrão)
- **message**: mensagem de confirmação para o lead

### EXEMPLO DE CONVERSA CORRETA:

```
Lead: "Quero agendar uma demonstração"

Agente: "Ótimo! Tenho horários disponíveis essa semana. 
Qual dia fica melhor para você? Segunda, terça ou quarta?"

Lead: "Pode ser terça"

Agente: "Perfeito! Na terça-feira, prefere de manhã (10h) ou à tarde (14h)?"

Lead: "14h está bom"

Agente: [USA schedule_meeting com date="2025-12-10", time="14:00", type="demo"]
"Demonstração agendada para terça-feira, dia 10/12, às 14h! 
Você receberá um lembrete no dia anterior. Até lá! 😊"
```

### ERROS A EVITAR:
❌ Dizer que agendou sem usar a função schedule_meeting
❌ Agendar sem confirmar data e horário específicos
❌ Usar datas vagas como "amanhã" sem converter para data real
❌ Esquecer de enviar mensagem de confirmação após agendar

### DATAS DISPONÍVEIS:
- Segunda a sexta: 08:00 às 18:00
- Intervalo de almoço: 12:00 às 13:00
- Duração padrão: 30 minutos

---

## 📝 Como adicionar no CRM:

1. Acesse **SDR IA** no menu
2. Clique no agente "Rafael" (ou seu agente)
3. Vá na aba **Base de Conhecimento**
4. Clique em **Adicionar Entrada**
5. Preencha:
   - **Título**: Instruções de Agendamento
   - **Categoria**: Procedimentos
   - **Conteúdo**: Cole o texto acima
6. Salve

O agente vai usar estas instruções automaticamente via RAG quando o assunto for agendamento!

