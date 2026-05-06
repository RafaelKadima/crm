// OmniFy Hub — Settings (todas as sub-telas em tabs)

const SETTINGS_TABS = [
  { k: "profile",      label: "Perfil",           icon: Icons.user },
  { k: "workspace",    label: "Workspace",        icon: Icons.building },
  { k: "team",         label: "Time",             icon: Icons.users },
  { k: "billing",      label: "Billing",          icon: Icons.dollar },
  { k: "integrations", label: "Integrações",      icon: Icons.link },
  { k: "pipelines",    label: "Pipelines",        icon: Icons.pipe },
  { k: "automations",  label: "Automações",       icon: Icons.zap },
  { k: "api",          label: "API & Webhooks",   icon: Icons.doc },
];

function Field({ label, hint, children, t }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 11.5, fontWeight: 600, color: t.text, marginBottom: 5 }}>{label}</div>
      {children}
      {hint && <div style={{ fontSize: 11, color: t.textMuted, marginTop: 5, lineHeight: 1.5 }}>{hint}</div>}
    </div>
  );
}

function TextField({ value, t, placeholder }) {
  return (
    <div style={{
      padding: "9px 12px", borderRadius: 8, background: t.surface,
      border: `1px solid ${t.border}`, fontSize: 13, color: t.text,
    }}>{value || <span style={{ color: t.textSubtle }}>{placeholder}</span>}</div>
  );
}

function Toggle({ on, t }) {
  return (
    <div style={{
      width: 36, height: 20, borderRadius: 999,
      background: on ? t.boldInk : t.borderStrong, padding: 2,
      display: "flex", justifyContent: on ? "flex-end" : "flex-start",
      cursor: "pointer", transition: "all 150ms",
    }}>
      <div style={{ width: 16, height: 16, borderRadius: 999, background: on ? "#0A0A0A" : "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }}/>
    </div>
  );
}

function SettingsProfile({ t }) {
  return (
    <div style={{ maxWidth: 640 }}>
      <SectionHeading t={t} title="Perfil" sub="Informações visíveis para o time e para contatos."/>
      <div style={{ display: "flex", gap: 20, alignItems: "center", marginBottom: 28, padding: 20, background: t.surface, borderRadius: 14, border: `1px solid ${t.border}` }}>
        <Avatar t={t} name="Marina Okano" size={72}/>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 2 }}>Marina Okano</div>
          <div style={{ fontSize: 12.5, color: t.textMuted }}>marina@acme.com · Head of Sales</div>
        </div>
        <Button t={t} variant="secondary" size="sm">Alterar foto</Button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <Field t={t} label="Nome"><TextField t={t} value="Marina Okano"/></Field>
        <Field t={t} label="Cargo"><TextField t={t} value="Head of Sales"/></Field>
        <Field t={t} label="Email"><TextField t={t} value="marina@acme.com"/></Field>
        <Field t={t} label="Telefone"><TextField t={t} value="+55 11 99823-1010"/></Field>
        <Field t={t} label="Fuso horário"><TextField t={t} value="America/São_Paulo (GMT-3)"/></Field>
        <Field t={t} label="Idioma"><TextField t={t} value="Português (Brasil)"/></Field>
      </div>

      <SectionHeading t={t} title="Notificações" sub="Como e quando receber alertas." style={{ marginTop: 32 }}/>
      {[
        { k: "Deal novo atribuído a você",       on: true },
        { k: "Follow-up da IA programado",       on: true },
        { k: "Lead quente capturado (score ≥80)", on: true },
        { k: "Resumo diário no email às 8:30",   on: false },
        { k: "Push no app móvel",                 on: true },
      ].map(n => (
        <div key={n.k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 0", borderBottom: `1px solid ${t.border}` }}>
          <div style={{ fontSize: 13 }}>{n.k}</div>
          <Toggle t={t} on={n.on}/>
        </div>
      ))}

      <SectionHeading t={t} title="Segurança" style={{ marginTop: 32 }}/>
      <div style={{ display: "flex", gap: 10 }}>
        <Button t={t} variant="secondary" size="sm" leading={<Icon d={Icons.settings} size={13}/>}>Trocar senha</Button>
        <Button t={t} variant="secondary" size="sm" leading={<Icon d={Icons.check} size={13}/>}>Ativar 2FA</Button>
        <Button t={t} variant="ghost" size="sm" leading={<Icon d={Icons.logout} size={13}/>} style={{ color: t.danger }}>Sair de todas as sessões</Button>
      </div>
    </div>
  );
}

function SettingsWorkspace({ t }) {
  return (
    <div style={{ maxWidth: 720 }}>
      <SectionHeading t={t} title="Workspace" sub="Gerencie a configuração da sua empresa no OmniFy."/>
      <div style={{ display: "flex", gap: 18, alignItems: "center", marginBottom: 28, padding: 20, background: t.surface, borderRadius: 14, border: `1px solid ${t.border}` }}>
        <div style={{ width: 60, height: 60, borderRadius: 14, background: t.bold, color: t.boldInk, display: "grid", placeItems: "center", fontSize: 24, fontWeight: 700, fontFamily: OMNIFY_FONTS.display }}>A</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 600 }}>Acme Inc</div>
          <div style={{ fontSize: 12, color: t.textMuted }}>acme.omnify.io · Plano Growth · 12 usuários</div>
        </div>
        <Button t={t} variant="secondary" size="sm">Editar logo</Button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 28 }}>
        <Field t={t} label="Nome da empresa"><TextField t={t} value="Acme Inc"/></Field>
        <Field t={t} label="Subdomínio" hint="Usado para login SSO e URLs públicas."><TextField t={t} value="acme.omnify.io"/></Field>
        <Field t={t} label="Indústria"><TextField t={t} value="SaaS B2B"/></Field>
        <Field t={t} label="Tamanho"><TextField t={t} value="50–200 funcionários"/></Field>
      </div>

      <SectionHeading t={t} title="Moeda & formato" style={{ marginTop: 8 }}/>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
        <Field t={t} label="Moeda padrão"><TextField t={t} value="BRL (R$)"/></Field>
        <Field t={t} label="Formato de data"><TextField t={t} value="DD/MM/YYYY"/></Field>
        <Field t={t} label="Semana começa em"><TextField t={t} value="Segunda-feira"/></Field>
      </div>

      <SectionHeading t={t} title="Zona de perigo" style={{ marginTop: 32 }}/>
      <div style={{ padding: 16, border: `1px solid ${t.dangerSoft}`, borderRadius: 12, background: t.dangerSoft, opacity: 0.9 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: t.danger, marginBottom: 4 }}>Excluir workspace</div>
        <div style={{ fontSize: 12, color: t.textMuted, marginBottom: 10 }}>Ação permanente. Todos os dados (deals, contatos, relatórios) serão apagados.</div>
        <Button t={t} variant="secondary" size="sm" style={{ color: t.danger, borderColor: t.danger }}>Excluir workspace</Button>
      </div>
    </div>
  );
}

function SettingsTeam({ t }) {
  const members = [
    { name: "Marina Okano",   email: "marina@acme.com",   role: "Owner",     status: "Ativo", last: "agora" },
    { name: "Rafael Lima",    email: "rafael@acme.com",   role: "Admin",     status: "Ativo", last: "há 5min" },
    { name: "Júlia Mendes",   email: "julia@acme.com",    role: "Gerente",   status: "Ativo", last: "há 30min" },
    { name: "Camila Ferraz",  email: "camila@acme.com",   role: "Vendedor",  status: "Ativo", last: "há 2h" },
    { name: "Henrique Dias",  email: "henrique@acme.com", role: "Vendedor",  status: "Ativo", last: "há 1d" },
    { name: "Beatriz Nogueira", email: "bia@acme.com",    role: "SDR",       status: "Convite", last: "–" },
  ];
  return (
    <div style={{ maxWidth: 900 }}>
      <SectionHeading t={t} title="Time" sub="12 membros · 3 vagas disponíveis no plano." right={
        <Button t={t} variant="bold" bold size="sm" leading={<Icon d={Icons.plus} size={13}/>}>Convidar membros</Button>
      }/>
      <div style={{ background: t.surface, borderRadius: 14, border: `1px solid ${t.border}`, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 80px", padding: "12px 18px", borderBottom: `1px solid ${t.border}`, background: t.bgSubtle, fontSize: 10.5, fontWeight: 700, color: t.textMuted, textTransform: "uppercase", letterSpacing: 1 }}>
          <div>Membro</div><div>Papel</div><div>Status</div><div>Último acesso</div><div></div>
        </div>
        {members.map((m, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 80px", padding: "14px 18px", borderBottom: i < members.length - 1 ? `1px solid ${t.border}` : "none", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Avatar t={t} name={m.name} size={32}/>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{m.name}</div>
                <div style={{ fontSize: 11, color: t.textMuted }}>{m.email}</div>
              </div>
            </div>
            <div><Pill t={t} color={m.role === "Owner" ? "primary" : "neutral"}>{m.role}</Pill></div>
            <div><Pill t={t} color={m.status === "Ativo" ? "success" : "warn"}>{m.status}</Pill></div>
            <div style={{ fontSize: 12, color: t.textMuted }}>{m.last}</div>
            <div style={{ textAlign: "right" }}><Icon d={Icons.dotsV} size={14} style={{ color: t.textMuted, cursor: "pointer" }}/></div>
          </div>
        ))}
      </div>

      <SectionHeading t={t} title="Papéis & permissões" sub="Defina o que cada tipo de usuário pode fazer." style={{ marginTop: 32 }}/>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10 }}>
        {[
          { k: "Owner",    n: 1,  desc: "Acesso total." },
          { k: "Admin",    n: 1,  desc: "Gerencia time e workspace." },
          { k: "Gerente",  n: 1,  desc: "Vê tudo do time." },
          { k: "Vendedor", n: 7,  desc: "Acesso aos próprios deals." },
        ].map(r => (
          <div key={r.k} style={{ padding: 16, background: t.surface, borderRadius: 12, border: `1px solid ${t.border}` }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 3 }}>{r.k}</div>
            <div style={{ fontSize: 11, color: t.textMuted, marginBottom: 8, lineHeight: 1.5 }}>{r.desc}</div>
            <div style={{ fontSize: 11, fontWeight: 500, color: t.textMuted }}>{r.n} membros</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SettingsBilling({ t }) {
  return (
    <div style={{ maxWidth: 820 }}>
      <SectionHeading t={t} title="Billing" sub="Plano, uso e histórico de faturas."/>

      {/* Current plan hero */}
      <div style={{ background: t.bold, color: "#F4F3EF", borderRadius: 16, padding: 24, marginBottom: 20, position: "relative", overflow: "hidden" }}>
        <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.6)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Plano atual</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 14 }}>
          <div style={{ fontSize: 36, fontWeight: 500, letterSpacing: -1, fontFamily: OMNIFY_FONTS.display }}>Growth</div>
          <div style={{ fontSize: 14, color: "rgba(255,255,255,0.7)" }}>R$ 149 / usuário / mês</div>
        </div>
        <div style={{ display: "flex", gap: 24 }}>
          <div><div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>Usuários</div><div style={{ fontSize: 16, fontWeight: 600, color: t.boldInk }}>12 / 15</div></div>
          <div><div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>Contatos</div><div style={{ fontSize: 16, fontWeight: 600 }}>8.4K / 25K</div></div>
          <div><div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>Próxima cobrança</div><div style={{ fontSize: 16, fontWeight: 600 }}>05 mai · R$ 1.788</div></div>
        </div>
        <div style={{ position: "absolute", top: 22, right: 22, display: "flex", gap: 8 }}>
          <Button t={t} variant="bold" bold size="sm">Fazer upgrade</Button>
        </div>
      </div>

      <SectionHeading t={t} title="Método de pagamento"/>
      <div style={{ padding: 16, background: t.surface, borderRadius: 12, border: `1px solid ${t.border}`, display: "flex", alignItems: "center", gap: 14, marginBottom: 28 }}>
        <div style={{ width: 44, height: 30, background: t.bgSubtle, borderRadius: 6, display: "grid", placeItems: "center", fontSize: 10, fontWeight: 700, color: t.text, letterSpacing: 1 }}>VISA</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 500 }}>•••• •••• •••• 4242</div>
          <div style={{ fontSize: 11, color: t.textMuted }}>Expira 08/2027 · Marina Okano</div>
        </div>
        <Button t={t} variant="secondary" size="sm">Atualizar</Button>
      </div>

      <SectionHeading t={t} title="Histórico de faturas"/>
      <div style={{ background: t.surface, borderRadius: 12, border: `1px solid ${t.border}`, overflow: "hidden" }}>
        {[
          { d: "05 abr 2026", a: "R$ 1.788,00", s: "Pago" },
          { d: "05 mar 2026", a: "R$ 1.639,00", s: "Pago" },
          { d: "05 fev 2026", a: "R$ 1.639,00", s: "Pago" },
          { d: "05 jan 2026", a: "R$ 1.490,00", s: "Pago" },
        ].map((inv, i, a) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 100px 80px", padding: "14px 18px", borderBottom: i < a.length - 1 ? `1px solid ${t.border}` : "none", alignItems: "center", fontSize: 13 }}>
            <div style={{ fontWeight: 500 }}>{inv.d}</div>
            <div style={{ fontFamily: OMNIFY_FONTS.display, fontSize: 14 }}>{inv.a}</div>
            <div><Pill t={t} color="success">{inv.s}</Pill></div>
            <div style={{ textAlign: "right" }}><Icon d={Icons.download} size={14} style={{ color: t.textMuted, cursor: "pointer" }}/></div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SettingsIntegrations({ t }) {
  const ints = [
    { k: "Gmail",     desc: "Sincronizar emails e assinaturas.",    cat: "Email",     on: true,  c: "#EA4335" },
    { k: "Outlook",   desc: "Calendário + emails corporativos.",    cat: "Email",     on: false, c: "#0078D4" },
    { k: "WhatsApp Business", desc: "Conversas bidirecionais.",     cat: "Mensagens", on: true,  c: "#25D366" },
    { k: "Slack",     desc: "Notificações em canais.",              cat: "Mensagens", on: true,  c: "#4A154B" },
    { k: "Google Ads", desc: "Importar leads de campanhas.",        cat: "Ads",       on: true,  c: "#4285F4" },
    { k: "Meta Ads",   desc: "Lead Ads do Facebook + Instagram.",   cat: "Ads",       on: false, c: "#1877F2" },
    { k: "Shopify",   desc: "Sincronizar clientes e pedidos.",      cat: "E-commerce", on: false, c: "#96BF47" },
    { k: "Stripe",    desc: "Receitas recorrentes no dashboard.",   cat: "Financeiro", on: true,  c: "#635BFF" },
    { k: "Zapier",    desc: "Conectar a 5000+ apps.",               cat: "Outros",    on: false, c: "#FF4A00" },
  ];

  const grouped = ints.reduce((acc, x) => ({ ...acc, [x.cat]: [...(acc[x.cat] || []), x] }), {});

  return (
    <div style={{ maxWidth: 900 }}>
      <SectionHeading t={t} title="Integrações" sub="Conecte o OmniFy aos apps que você já usa." right={
        <Button t={t} variant="secondary" size="sm" leading={<Icon d={Icons.search} size={13}/>}>Explorar marketplace</Button>
      }/>
      {Object.keys(grouped).map(cat => (
        <div key={cat} style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, color: t.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>{cat}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
            {grouped[cat].map(i => (
              <div key={i.k} style={{ display: "flex", alignItems: "center", gap: 14, padding: 14, background: t.surface, borderRadius: 12, border: `1px solid ${t.border}` }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: i.c, color: "#fff", display: "grid", placeItems: "center", fontSize: 13, fontWeight: 700 }}>{i.k[0]}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{i.k}</div>
                  <div style={{ fontSize: 11.5, color: t.textMuted, lineHeight: 1.4 }}>{i.desc}</div>
                </div>
                {i.on ? (
                  <Pill t={t} color="success">Conectado</Pill>
                ) : (
                  <Button t={t} variant="secondary" size="sm">Conectar</Button>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function SettingsPipelines({ t }) {
  const stages = ["Lead", "Qualificado", "Demo agendada", "Proposta", "Negociação", "Fechado"];
  return (
    <div style={{ maxWidth: 820 }}>
      <SectionHeading t={t} title="Pipelines" sub="Customize os estágios do seu funil de vendas." right={
        <Button t={t} variant="bold" bold size="sm" leading={<Icon d={Icons.plus} size={13}/>}>Novo pipeline</Button>
      }/>

      <div style={{ padding: 18, background: t.surface, borderRadius: 14, border: `1px solid ${t.border}`, marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>Vendas B2B</div>
            <div style={{ fontSize: 11.5, color: t.textMuted }}>Pipeline padrão · 6 estágios · 147 deals ativos</div>
          </div>
          <Pill t={t} color="primary">Padrão</Pill>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {stages.map((s, i) => (
            <div key={s} style={{ flex: 1, padding: "10px 12px", background: i === stages.length - 1 ? t.bold : t.bgSubtle, color: i === stages.length - 1 ? t.boldInk : t.text, borderRadius: 8, fontSize: 11.5, fontWeight: 600, textAlign: "center", position: "relative" }}>
              <div style={{ fontSize: 9, color: i === stages.length - 1 ? "rgba(255,255,255,0.5)" : t.textMuted, fontWeight: 700, textTransform: "uppercase", marginBottom: 2 }}>#{i + 1}</div>
              {s}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          <Button t={t} variant="secondary" size="sm" leading={<Icon d={Icons.edit} size={12}/>}>Editar estágios</Button>
          <Button t={t} variant="ghost" size="sm" leading={<Icon d={Icons.settings} size={12}/>}>Configurar</Button>
        </div>
      </div>

      <div style={{ padding: 18, background: t.surface, borderRadius: 14, border: `1px solid ${t.border}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>Enterprise (alto ticket)</div>
            <div style={{ fontSize: 11.5, color: t.textMuted }}>8 estágios · 23 deals ativos</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingsAutomations({ t }) {
  const autos = [
    { k: "Qualificar leads inbound", desc: "Quando: novo lead via formulário · Faz: SDR roda BANT + agenda call", on: true, runs: 142 },
    { k: "Follow-up silencioso",     desc: "Quando: 5 dias sem toque · Faz: envia email personalizado",        on: true, runs: 88 },
    { k: "Alerta deal em risco",     desc: "Quando: probabilidade cai 20%+ · Faz: notifica dono + gerente",    on: true, runs: 17 },
    { k: "Boas-vindas ao cliente",   desc: "Quando: deal fechado · Faz: email + task de onboarding",           on: false, runs: 0 },
    { k: "Reativação churn",         desc: "Quando: cliente inativo 30d · Faz: sequência de re-engajamento",   on: true, runs: 34 },
  ];
  return (
    <div style={{ maxWidth: 820 }}>
      <SectionHeading t={t} title="Automações" sub="Fluxos que rodam em background. Cada um é um gatilho + ação." right={
        <Button t={t} variant="bold" bold size="sm" leading={<Icon d={Icons.plus} size={13}/>}>Nova automação</Button>
      }/>
      {autos.map((a, i) => (
        <div key={i} style={{ padding: 16, background: t.surface, borderRadius: 12, border: `1px solid ${t.border}`, marginBottom: 8, display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: a.on ? t.boldInk : t.bgSubtle, color: a.on ? "#0A0A0A" : t.textMuted, display: "grid", placeItems: "center", flexShrink: 0 }}>
            <Icon d={Icons.zap} size={16}/>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 2 }}>{a.k}</div>
            <div style={{ fontSize: 11.5, color: t.textMuted, lineHeight: 1.5 }}>{a.desc}</div>
          </div>
          <div style={{ fontSize: 11, color: t.textMuted, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
            <div style={{ fontWeight: 600, color: t.text }}>{a.runs}</div>
            <div>execuções</div>
          </div>
          <Toggle t={t} on={a.on}/>
        </div>
      ))}
    </div>
  );
}

function SettingsApi({ t }) {
  return (
    <div style={{ maxWidth: 760 }}>
      <SectionHeading t={t} title="API & Webhooks" sub="Acesso programático ao OmniFy."/>

      <div style={{ padding: 16, background: t.surface, borderRadius: 12, border: `1px solid ${t.border}`, marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>Chave de API de produção</div>
          <Pill t={t} color="success">Ativa</Pill>
        </div>
        <div style={{ padding: "10px 14px", background: t.bgSubtle, borderRadius: 8, fontFamily: OMNIFY_FONTS.mono, fontSize: 12, color: t.text, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ flex: 1 }}>omf_prod_•••••••••••••••••••••••8a4f</span>
          <Icon d={Icons.doc} size={13} style={{ color: t.textMuted, cursor: "pointer" }}/>
        </div>
        <div style={{ fontSize: 11, color: t.textMuted, marginTop: 8 }}>Criada em 12 mar 2026 · Último uso há 3min</div>
      </div>

      <SectionHeading t={t} title="Webhooks" sub="URLs que recebem eventos do OmniFy em tempo real." right={
        <Button t={t} variant="secondary" size="sm" leading={<Icon d={Icons.plus} size={13}/>}>Novo webhook</Button>
      }/>
      {[
        { url: "https://api.acme.com/omnify/deals", events: "deal.created · deal.won",   status: 200 },
        { url: "https://hooks.zapier.com/hooks/...", events: "contact.created",           status: 200 },
        { url: "https://internal.acme.com/crm-sync", events: "*",                          status: 500 },
      ].map((w, i) => (
        <div key={i} style={{ padding: 14, background: t.surface, borderRadius: 10, border: `1px solid ${t.border}`, marginBottom: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <Pill t={t} color={w.status === 200 ? "success" : "danger"}>{w.status}</Pill>
            <span style={{ fontFamily: OMNIFY_FONTS.mono, fontSize: 12, color: t.text, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{w.url}</span>
            <Icon d={Icons.dotsV} size={14} style={{ color: t.textMuted, cursor: "pointer" }}/>
          </div>
          <div style={{ fontSize: 11, color: t.textMuted }}>{w.events}</div>
        </div>
      ))}
    </div>
  );
}

function SectionHeading({ t, title, sub, right, style }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 16, ...style }}>
      <div>
        <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: -0.3, fontFamily: OMNIFY_FONTS.sans }}>{title}</div>
        {sub && <div style={{ fontSize: 12, color: t.textMuted, marginTop: 3 }}>{sub}</div>}
      </div>
      {right}
    </div>
  );
}

function SettingsScreen({ t, theme, onToggleTheme, onNav }) {
  const [tab, setTab] = React.useState("profile");
  const tabs = {
    profile: <SettingsProfile t={t}/>,
    workspace: <SettingsWorkspace t={t}/>,
    team: <SettingsTeam t={t}/>,
    billing: <SettingsBilling t={t}/>,
    integrations: <SettingsIntegrations t={t}/>,
    pipelines: <SettingsPipelines t={t}/>,
    automations: <SettingsAutomations t={t}/>,
    api: <SettingsApi t={t}/>,
  };
  return (
    <div style={{ display: "flex", height: "100%", background: t.bg, color: t.text, fontFamily: OMNIFY_FONTS.sans, fontSize: 13 }}>
      <SidebarBold t={t} active="settings" onNav={onNav}/>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <header style={{ padding: "18px 28px 14px", background: t.bg, borderBottom: `1px solid ${t.border}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 10.5, color: t.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Workspace · Acme Inc</div>
              <h1 style={{ margin: 0, fontSize: 30, fontWeight: 500, letterSpacing: -0.8, fontFamily: OMNIFY_FONTS.display }}>Configurações</h1>
            </div>
            <Button t={t} variant="ghost" size="sm" onClick={onToggleTheme} leading={<Icon d={theme === "dark" ? Icons.sun : Icons.moon} size={14}/>}>
              {theme === "dark" ? "Claro" : "Escuro"}
            </Button>
          </div>
        </header>

        <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
          <nav style={{ width: 200, padding: "18px 14px", borderRight: `1px solid ${t.border}`, flexShrink: 0, background: t.bg }}>
            {SETTINGS_TABS.map(s => {
              const active = tab === s.k;
              return (
                <div key={s.k} onClick={() => setTab(s.k)} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "8px 12px", borderRadius: 8, marginBottom: 2,
                  fontSize: 13, fontWeight: active ? 600 : 500,
                  background: active ? t.bold : "transparent",
                  color: active ? "#F4F3EF" : t.textMuted,
                  cursor: "pointer", transition: "all 120ms",
                }}>
                  <Icon d={s.icon} size={15}/> {s.label}
                </div>
              );
            })}
          </nav>
          <div style={{ flex: 1, overflow: "auto", padding: "28px 32px" }}>
            {tabs[tab]}
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { SettingsScreen });
