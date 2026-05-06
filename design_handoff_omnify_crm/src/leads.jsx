// OmniFy Hub — Leads screens (list + detail)

const LEADS = [
  { id: 1, name: "Marcelo Tavares", company: "Hiper Atacado",        source: "Ads · Google",      tag: "Inbound",  time: "8min", score: 92, status: "new",       email: "m.tavares@hiper.com.br", phone: "+55 11 98001-2233", note: "Baixou whitepaper sobre logística 3.0. Clicou no CTA de demo." },
  { id: 2, name: "Roberta Kim",     company: "Luz Studio",           source: "SDR · LinkedIn",    tag: "Outbound", time: "24min", score: 78, status: "new",       email: "roberta@luzstudio.co",   phone: "+55 11 97811-0042", note: "Respondeu primeiro toque. Mostrou interesse em integração com Shopify." },
  { id: 3, name: "André Cavalcanti", company: "Polo Construtora",    source: "Indicação",         tag: "Warm",     time: "1h", score: 85, status: "contacted", email: "andre.c@poloconstrucoes.com.br", phone: "+55 81 99223-1100", note: "Indicado pelo João (Nova Têxtil). Já conhece o produto." },
  { id: 4, name: "Débora Salles",   company: "Café Cidade",          source: "Formulário site",   tag: "Inbound",  time: "2h", score: 66, status: "contacted", email: "debora@cafecidade.com",  phone: "+55 11 97221-9983", note: "Solicitou orçamento via formulário. SMB, 3-5 usuários." },
  { id: 5, name: "Felipe Araújo",   company: "Gamma Tech",           source: "Ads · Meta",        tag: "Inbound",  time: "3h", score: 48, status: "new",       email: "felipe@gammatech.io",    phone: "+55 11 98122-3367", note: "Clicou em anúncio de retargeting 2x. Ainda não converteu." },
  { id: 6, name: "Isabela Moraes",  company: "Cristal Logística",    source: "SDR · LinkedIn",    tag: "Outbound", time: "5h", score: 71, status: "qualified", email: "isabela.m@cristallog.com.br", phone: "+55 11 96611-2289", note: "Diretora de Ops. Avalia 3 fornecedores. Prazo: junho." },
  { id: 7, name: "Carlos Mendes",   company: "Forte Alimentos",      source: "Evento",            tag: "Warm",     time: "1d", score: 83, status: "qualified", email: "carlos@fortealim.com.br", phone: "+55 11 97883-0012", note: "Conheceu no Web Summit. Pediu proposta enterprise." },
  { id: 8, name: "Natália Viana",   company: "EcoPack",              source: "Formulário site",   tag: "Inbound",  time: "1d", score: 54, status: "new",       email: "natalia@ecopack.com",    phone: "+55 21 98999-4411", note: "Startup. Possível SMB plan." },
  { id: 9, name: "Guilherme Pires", company: "Vila Mariana Med",     source: "SDR · Cold email",  tag: "Outbound", time: "2d", score: 38, status: "new",       email: "guilherme@vmmed.com.br", phone: "+55 11 97332-8877", note: "Respondeu em 2 linhas pedindo mais info. Saúde, 80 funcionários." },
  { id: 10, name: "Tatiane Souza",  company: "Orion Seguros",        source: "Indicação",         tag: "Warm",     time: "3d", score: 88, status: "qualified", email: "tatiane@orionseguros.com.br", phone: "+55 11 98221-0099", note: "Indicada pela Aurora Seguros. Decisor. Budget aprovado." },
];

const LEAD_STATUS = {
  new:       { label: "Novo",        color: "primary" },
  contacted: { label: "Contatado",   color: "warn"    },
  qualified: { label: "Qualificado", color: "success" },
};

function LeadRow({ l, t, onOpen }) {
  const [hover, setHover] = React.useState(false);
  return (
    <div
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      onClick={() => onOpen?.(l)}
      style={{
        display: "grid",
        gridTemplateColumns: "36px 2.2fr 1.6fr 1.2fr 1fr 0.9fr 0.9fr 60px",
        padding: "14px 28px", borderBottom: `1px solid ${t.border}`,
        alignItems: "center", cursor: "pointer",
        background: hover ? t.bgSubtle : "transparent",
      }}>
      <div><div style={{ width: 16, height: 16, borderRadius: 4, boxShadow: `inset 0 0 0 1px ${t.borderStrong}` }}/></div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
        <Avatar t={t} name={l.name} size={32}/>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{l.name}</div>
          <div style={{ fontSize: 11, color: t.textMuted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{l.email}</div>
        </div>
      </div>
      <div style={{ fontSize: 12.5, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{l.company}</div>
      <div style={{ fontSize: 12, color: t.textMuted }}>{l.source}</div>
      <div><Pill t={t} color={l.tag === "Inbound" ? "success" : l.tag === "Outbound" ? "primary" : "warn"}>{l.tag}</Pill></div>
      <div><Pill t={t} color={LEAD_STATUS[l.status].color}>{LEAD_STATUS[l.status].label}</Pill></div>
      <div style={{ fontSize: 11.5, color: t.textMuted }}>há {l.time}</div>
      <div style={{ display: "flex", justifyContent: "flex-end" }}><ScoreBadge score={l.score} t={t} bold/></div>
    </div>
  );
}

function LeadsScreen({ t, theme, onToggleTheme, onNav, onOpenLead }) {
  const [filter, setFilter] = React.useState("Todos");
  const filtered = filter === "Todos" ? LEADS :
    filter === "Novos" ? LEADS.filter(l => l.status === "new") :
    filter === "Qualificados" ? LEADS.filter(l => l.status === "qualified") :
    LEADS.filter(l => l.tag === filter);

  return (
    <div style={{ display: "flex", height: "100%", background: t.bg, color: t.text, fontFamily: OMNIFY_FONTS.sans, fontSize: 13 }}>
      <SidebarBold t={t} active="leads" onNav={onNav}/>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <header style={{ background: t.bg, borderBottom: `1px solid ${t.border}`, padding: "18px 28px 14px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 10.5, color: t.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>
                Funil · Topo
              </div>
              <h1 style={{ margin: 0, fontSize: 32, fontWeight: 500, letterSpacing: -0.8, fontFamily: OMNIFY_FONTS.display, display: "flex", alignItems: "baseline", gap: 12 }}>
                Leads
                <span style={{ fontFamily: OMNIFY_FONTS.sans, fontSize: 13, fontWeight: 500, color: t.textMuted, letterSpacing: 0 }}>
                  {LEADS.length} ativos · 6 qualificados esta semana
                </span>
              </h1>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Button t={t} variant="ghost" size="sm" onClick={onToggleTheme} leading={<Icon d={theme === "dark" ? Icons.sun : Icons.moon} size={14}/>}>
                {theme === "dark" ? "Claro" : "Escuro"}
              </Button>
              <Button t={t} variant="secondary" size="sm" leading={<Icon d={Icons.sparkle} size={13}/>}>SDR qualificar</Button>
              <Button t={t} variant="bold" size="sm" bold leading={<Icon d={Icons.plus} size={14}/>}>Novo lead</Button>
            </div>
          </div>

          {/* Funnel KPIs */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 14 }}>
            {[
              { k: "Capturados (7d)", v: "142", d: "+23%", up: true },
              { k: "Qualificados",    v: "38",  d: "+12%", up: true },
              { k: "Taxa qualif.",    v: "26.8%", d: "+3.4pp", up: true },
              { k: "Tempo m. 1º toque", v: "4min", d: "−18min", up: true },
            ].map((k, i) => (
              <div key={i} style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 12, padding: "12px 14px" }}>
                <div style={{ fontSize: 10.5, color: t.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 }}>{k.k}</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                  <div style={{ fontSize: 22, fontWeight: 500, letterSpacing: -0.4, fontFamily: OMNIFY_FONTS.display }}>{k.v}</div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: k.up ? t.success : t.danger }}>{k.d}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Filter chips */}
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {["Todos", "Novos", "Qualificados", "Inbound", "Outbound", "Warm"].map(f => (
              <div key={f} onClick={() => setFilter(f)} style={{
                padding: "6px 12px", borderRadius: 999,
                fontSize: 12, fontWeight: 600, cursor: "pointer",
                background: filter === f ? t.bold : t.surface,
                color: filter === f ? "#F4F3EF" : t.text,
                border: `1px solid ${filter === f ? t.bold : t.border}`,
              }}>{f}</div>
            ))}
            <div style={{ flex: 1 }}/>
            <Input t={t} placeholder="Buscar leads…" leading={<Icon d={Icons.search} size={14}/>} style={{ width: 240 }}/>
          </div>
        </header>

        <div style={{ flex: 1, overflow: "auto", background: t.surface }}>
          <div style={{
            display: "grid",
            gridTemplateColumns: "36px 2.2fr 1.6fr 1.2fr 1fr 0.9fr 0.9fr 60px",
            padding: "10px 28px", borderBottom: `1px solid ${t.border}`,
            background: t.bgSubtle, position: "sticky", top: 0, zIndex: 2,
            fontSize: 10.5, fontWeight: 700, color: t.textMuted,
            textTransform: "uppercase", letterSpacing: 1,
          }}>
            <div></div><div>Nome</div><div>Empresa</div><div>Origem</div><div>Tag</div><div>Status</div><div>Captura</div>
            <div style={{ textAlign: "right" }}>Score IA</div>
          </div>
          {filtered.map(l => <LeadRow key={l.id} l={l} t={t} onOpen={onOpenLead}/>)}
        </div>
      </div>
    </div>
  );
}

function LeadDetail({ t, theme, onToggleTheme, onNav, lead, onClose }) {
  const l = lead || LEADS[0];
  return (
    <div style={{ display: "flex", height: "100%", background: t.bg, color: t.text, fontFamily: OMNIFY_FONTS.sans, fontSize: 13 }}>
      <SidebarBold t={t} active="leads" onNav={onNav}/>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <header style={{ padding: "14px 28px", borderBottom: `1px solid ${t.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", background: t.bg }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12.5, color: t.textMuted }}>
            <span onClick={onClose} style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5 }}>
              <Icon d={Icons.chevL} size={13}/> Leads
            </span>
            <Icon d={Icons.chevR} size={11} style={{ color: t.textSubtle }}/>
            <span style={{ color: t.text, fontWeight: 600 }}>{l.name}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Button t={t} variant="ghost" size="sm" onClick={onToggleTheme} leading={<Icon d={theme === "dark" ? Icons.sun : Icons.moon} size={13}/>}>
              {theme === "dark" ? "Claro" : "Escuro"}
            </Button>
            <Button t={t} variant="secondary" size="sm" leading={<Icon d={Icons.x} size={13}/>}>Descartar</Button>
            <Button t={t} variant="secondary" size="sm" leading={<Icon d={Icons.check} size={13}/>}>Qualificar</Button>
            <Button t={t} variant="bold" size="sm" bold leading={<Icon d={Icons.arrowUR} size={13}/>}>Converter em deal</Button>
          </div>
        </header>

        <div style={{ padding: "28px 28px 20px", background: t.bg, borderBottom: `1px solid ${t.border}`, display: "flex", gap: 24, alignItems: "flex-start" }}>
          <div style={{ position: "relative" }}>
            <Avatar t={t} name={l.name} size={84}/>
            <div style={{
              position: "absolute", bottom: -4, right: -4,
              width: 22, height: 22, borderRadius: 999,
              background: l.score >= 80 ? t.success : l.score >= 60 ? t.warn : t.textMuted,
              boxShadow: `0 0 0 3px ${t.bg}`, display: "grid", placeItems: "center",
              color: "#fff", fontSize: 10, fontWeight: 700,
            }}>{l.score}</div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <h1 style={{ margin: 0, fontSize: 30, fontWeight: 500, letterSpacing: -0.8, fontFamily: OMNIFY_FONTS.display }}>{l.name}</h1>
              <Pill t={t} color={LEAD_STATUS[l.status].color}>{LEAD_STATUS[l.status].label}</Pill>
              <Pill t={t} color={l.tag === "Inbound" ? "success" : l.tag === "Outbound" ? "primary" : "warn"}>{l.tag}</Pill>
            </div>
            <div style={{ fontSize: 13.5, color: t.textMuted, marginBottom: 14 }}>
              <span style={{ color: t.text, fontWeight: 500 }}>{l.company}</span> · {l.source}
            </div>
            <div style={{ display: "flex", gap: 28 }}>
              {[
                { k: "Score IA", v: `${l.score}/100` },
                { k: "Capturado", v: "há " + l.time },
                { k: "Toques", v: "3" },
                { k: "Est. valor", v: "R$ 28K" },
              ].map((s, i) => (
                <div key={i} style={{ paddingRight: 24, borderRight: i < 3 ? `1px solid ${t.border}` : "none" }}>
                  <div style={{ fontSize: 10, color: t.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4, fontWeight: 600 }}>{s.k}</div>
                  <div style={{ fontSize: 14, fontWeight: 600, fontFamily: OMNIFY_FONTS.sans }}>{s.v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
          <aside style={{ width: 280, borderRight: `1px solid ${t.border}`, background: t.bg, padding: 22, overflow: "auto", flexShrink: 0 }}>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: t.textSubtle, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10 }}>Contato</div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 12, borderBottom: `1px dashed ${t.border}` }}>
                <span style={{ color: t.textMuted }}>Email</span><span style={{ fontWeight: 500 }}>{l.email}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 12, borderBottom: `1px dashed ${t.border}` }}>
                <span style={{ color: t.textMuted }}>Telefone</span><span style={{ fontWeight: 500 }}>{l.phone}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 12, borderBottom: `1px dashed ${t.border}` }}>
                <span style={{ color: t.textMuted }}>Origem</span><span style={{ fontWeight: 500 }}>{l.source}</span>
              </div>
            </div>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: t.textSubtle, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10 }}>Nota inicial</div>
              <div style={{ fontSize: 12.5, color: t.textMuted, lineHeight: 1.5, padding: 12, background: t.surface, borderRadius: 10, border: `1px solid ${t.border}` }}>
                {l.note}
              </div>
            </div>
          </aside>

          <div style={{ flex: 1, padding: 22, overflow: "auto" }}>
            {/* AI qualification card */}
            <div style={{ background: t.bold, color: "#F4F3EF", borderRadius: 14, padding: 18, marginBottom: 20, display: "flex", gap: 14 }}>
              <div style={{ width: 32, height: 32, borderRadius: 9, background: t.boldInk, color: "#0A0A0A", display: "grid", placeItems: "center", flexShrink: 0 }}>
                <Icon d={Icons.sparkle} size={16}/>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>SDR autônomo · qualificação</div>
                <div style={{ fontSize: 14, lineHeight: 1.55 }}>
                  Lead <strong style={{ color: t.boldInk }}>quente</strong>. Perfil BANT: Budget sim, Authority sim (decisor), Need claro, Timeline 30d. Recomendo agendar demo direto — pular pré-qualificação.
                </div>
                <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
                  <Button t={t} variant="bold" size="sm" bold>Agendar demo</Button>
                  <Button t={t} variant="ghost" size="sm" style={{ color: "#F4F3EF" }}>Ver scoring</Button>
                </div>
              </div>
            </div>

            {/* Timeline */}
            {[
              { icon: Icons.mail, c: t.warn, bg: t.warnSoft, title: "Email enviado · Sequência de boas-vindas", time: "há 5min", body: "Template 'primeiro contato inbound' disparado automaticamente. Abertura confirmada." },
              { icon: Icons.eye, c: t.text, bg: t.bgSubtle, title: "Visitou página de pricing", time: "há 12min", body: "Sessão de 3min. Focou no plano Enterprise." },
              { icon: Icons.sparkle, c: t.boldInk, bg: t.bold, title: "IA · Score atualizado para 92", time: "há 8min", body: "+24 pontos por: BANT confirmado, visita a pricing, indústria target." },
              { icon: Icons.download, c: t.primary, bg: t.primarySoft, title: "Baixou whitepaper", time: "há 8min", body: "Logística 3.0 — guia completo. Convertido via Google Ads." },
            ].map((e, i, a) => (
              <div key={i} style={{ display: "flex", gap: 14, paddingBottom: 18, position: "relative" }}>
                {i < a.length - 1 && <div style={{ position: "absolute", left: 17, top: 36, bottom: 0, width: 1, background: t.border }}/>}
                <div style={{ width: 36, height: 36, borderRadius: 10, background: e.bg, color: e.c === t.boldInk ? "#0A0A0A" : e.c, display: "grid", placeItems: "center", flexShrink: 0, boxShadow: `0 0 0 4px ${t.bg}` }}>
                  <Icon d={e.icon} size={16}/>
                </div>
                <div style={{ flex: 1, paddingTop: 4 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                    <span style={{ fontSize: 13.5, fontWeight: 600 }}>{e.title}</span>
                    <span style={{ fontSize: 11, color: t.textSubtle, marginLeft: "auto" }}>{e.time}</span>
                  </div>
                  <div style={{ fontSize: 12.5, color: t.textMuted, lineHeight: 1.55 }}>{e.body}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { LeadsScreen, LeadDetail, LEADS });
