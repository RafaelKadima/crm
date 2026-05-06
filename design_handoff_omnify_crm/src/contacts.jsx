// OmniFy Hub — Contacts list (conservative + bold)

const CONTACTS = [
  { name: "Rafael Lima",       company: "Prime Logística",    title: "Diretor de Ops",    email: "rafael@primelog.com.br",   phone: "+55 11 98234-1020", tags: ["Hot", "Enterprise"], owner: "Marina O.",   last: "2h",  value: "R$ 84.000", stage: "Negociação", score: 92 },
  { name: "Júlia Mendes",      company: "Grupo Norte",        title: "CMO",               email: "julia.m@gruponorte.com",   phone: "+55 21 99823-4510", tags: ["Warm"], owner: "Henrique D.", last: "1d",  value: "R$ 52.500", stage: "Proposta",   score: 78 },
  { name: "Bruno Campos",      company: "Vertex Indústria",   title: "CEO",               email: "bruno@vertex.ind.br",      phone: "+55 11 97621-0934", tags: ["Hot"],  owner: "Camila F.",   last: "4h",  value: "R$ 128.000", stage: "Demo",       score: 85 },
  { name: "Paula Rocha",       company: "Estúdio Mar",        title: "Founder",           email: "paula@estudiomar.co",      phone: "+55 48 99120-8321", tags: ["SMB"],  owner: "Júlia M.",    last: "3d",  value: "R$ 24.000", stage: "Qualificado", score: 58 },
  { name: "Diego Ferreira",    company: "Sato Engenharia",    title: "Head Comercial",    email: "diego@sato.eng.br",        phone: "+55 11 98223-4410", tags: ["Warm", "Enterprise"],  owner: "Rafael L.",   last: "6h",  value: "R$ 18.500", stage: "Proposta",   score: 71 },
  { name: "Ana Beatriz Souza", company: "Cloud9 Tech",        title: "CTO",               email: "ana@cloud9.tech",          phone: "+55 11 96734-2219", tags: ["Cold"], owner: "Marina O.",   last: "12d", value: "—",          stage: "Lead",       score: 34 },
  { name: "Tiago Albuquerque", company: "Forma Arquitetura",  title: "Sócio",             email: "tiago@forma.arq",          phone: "+55 11 98712-4452", tags: ["Warm"], owner: "Henrique D.", last: "2d",  value: "R$ 36.000", stage: "Demo",       score: 66 },
  { name: "Renata Okuda",      company: "Nova Têxtil",        title: "Diretora Financeira", email: "renata@novatextil.ind",  phone: "+55 11 98834-0021", tags: ["Hot"],  owner: "Rafael L.",   last: "30min", value: "R$ 42.000", stage: "Fechado",    score: 98 },
  { name: "Lucas Pereira",     company: "Helio Energia",      title: "Head of Growth",    email: "lucas@helio.energy",       phone: "+55 11 97233-1105", tags: ["Warm"], owner: "Camila F.",   last: "1d",  value: "R$ 62.000", stage: "Negociação", score: 74 },
  { name: "Sofia Navarro",     company: "Botanica Co",        title: "Founder",           email: "sofia@botanica.co",        phone: "+55 11 98991-2267", tags: ["SMB", "Hot"],  owner: "Júlia M.",    last: "5h",  value: "R$ 14.000", stage: "Demo",       score: 81 },
];

const STAGE_COLORS = {
  Lead: "neutral", Qualificado: "neutral", Demo: "primary",
  Proposta: "warn", Negociação: "primary", Fechado: "success",
};

// Score badge with ring
function ScoreBadge({ score, t, bold }) {
  const color = score >= 80 ? t.success : score >= 60 ? (bold ? t.boldInk : t.primary) : score >= 40 ? t.warn : t.textMuted;
  const bg    = score >= 80 ? t.successSoft : score >= 60 ? t.primarySoft : score >= 40 ? t.warnSoft : t.bgSubtle;
  const r = 9, c = 2 * Math.PI * r;
  return (
    <div style={{ position: "relative", width: 28, height: 28 }}>
      <svg width="28" height="28" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="14" cy="14" r={r} fill="none" stroke={bg} strokeWidth="3"/>
        <circle cx="14" cy="14" r={r} fill="none" stroke={color} strokeWidth="3"
          strokeDasharray={c} strokeDashoffset={c * (1 - score / 100)} strokeLinecap="round"/>
      </svg>
      <div style={{
        position: "absolute", inset: 0, display: "grid", placeItems: "center",
        fontSize: 10, fontWeight: 700, color: t.text, fontVariantNumeric: "tabular-nums",
      }}>{score}</div>
    </div>
  );
}

// ================================================================
//                 CONTACTS — CONSERVATIVE
// ================================================================
function ContactsConservative({ t, theme, onToggleTheme, onOpenContact }) {
  const [tab, setTab] = React.useState("Todos");
  const [selected, setSelected] = React.useState(new Set());
  const toggle = (i) => {
    const next = new Set(selected);
    next.has(i) ? next.delete(i) : next.add(i);
    setSelected(next);
  };
  return (
    <div style={{ display: "flex", height: "100%", background: t.bg, color: t.text,
      fontFamily: OMNIFY_FONTS.sans, fontSize: 13 }}>
      <SidebarConservative t={t} active="contacts" />
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <TopbarConservative t={t}
          breadcrumbs={["Workspace", "Contatos"]}
          theme={theme} onToggleTheme={onToggleTheme}
          tabs={["Todos", "Meus", "Hot", "Cold", "Últimos 7 dias"]} activeTab={tab} onTab={setTab}
          right={<>
            <Button t={t} variant="secondary" size="sm" leading={<Icon d={Icons.download} size={13}/>}>Exportar</Button>
            <Button t={t} variant="primary" size="sm" leading={<Icon d={Icons.plus} size={13}/>}>Novo contato</Button>
          </>}
        />

        <div style={{
          padding: "12px 20px", display: "flex", alignItems: "center", gap: 10,
          borderBottom: `1px solid ${t.border}`, background: t.surface,
        }}>
          <Input t={t} placeholder="Buscar por nome, empresa, email…"
            leading={<Icon d={Icons.search} size={14}/>}
            style={{ minWidth: 280 }} />
          <Button t={t} variant="secondary" size="sm" leading={<Icon d={Icons.filter} size={13}/>}>Estágio</Button>
          <Button t={t} variant="secondary" size="sm" leading={<Icon d={Icons.tag} size={13}/>}>Tags</Button>
          <Button t={t} variant="secondary" size="sm" leading={<Icon d={Icons.user} size={13}/>}>Dono</Button>
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 11.5, color: t.textMuted }}>{CONTACTS.length} contatos · {selected.size} selecionados</span>
        </div>

        {/* Table */}
        <div style={{ flex: 1, overflow: "auto", background: t.surface }}>
          <div style={{
            display: "grid",
            gridTemplateColumns: "36px 2fr 1.8fr 1fr 1.2fr 0.9fr 0.9fr 0.8fr 60px",
            padding: "10px 20px", borderBottom: `1px solid ${t.border}`,
            background: t.surfaceAlt, position: "sticky", top: 0, zIndex: 2,
            fontSize: 10.5, fontWeight: 600, color: t.textSubtle,
            textTransform: "uppercase", letterSpacing: 0.5,
          }}>
            <div></div>
            <div>Nome</div>
            <div>Empresa · cargo</div>
            <div>Estágio</div>
            <div>Tags</div>
            <div>Valor</div>
            <div>Dono</div>
            <div>Último toque</div>
            <div style={{ textAlign: "right" }}>Score</div>
          </div>
          {CONTACTS.map((c, i) => (
            <ContactRow key={i} c={c} t={t} checked={selected.has(i)} onCheck={() => toggle(i)}
              onClick={() => onOpenContact?.(c)} />
          ))}
        </div>
      </div>
    </div>
  );
}

function ContactRow({ c, t, checked, onCheck, onClick, bold }) {
  const [hover, setHover] = React.useState(false);
  return (
    <div
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      onClick={onClick}
      style={{
        display: "grid",
        gridTemplateColumns: "36px 2fr 1.8fr 1fr 1.2fr 0.9fr 0.9fr 0.8fr 60px",
        padding: "12px 20px", borderBottom: `1px solid ${t.border}`,
        background: hover ? t.surfaceAlt : "transparent",
        cursor: "pointer", alignItems: "center",
      }}>
      <div onClick={(e) => { e.stopPropagation(); onCheck(); }}>
        <div style={{
          width: 16, height: 16, borderRadius: 4,
          background: checked ? (bold ? t.boldInk : t.text) : t.surface,
          boxShadow: `inset 0 0 0 1px ${checked ? (bold ? t.boldInk : t.text) : t.borderStrong}`,
          display: "grid", placeItems: "center", color: bold ? "#0A0A0A" : t.bg,
        }}>
          {checked && <Icon d={Icons.check} size={11} strokeWidth={3}/>}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
        <Avatar t={t} name={c.name} size={28}/>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.name}</div>
          <div style={{ fontSize: 11, color: t.textMuted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.email}</div>
        </div>
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 12.5, fontWeight: 500, color: t.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.company}</div>
        <div style={{ fontSize: 11, color: t.textMuted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.title}</div>
      </div>
      <div><Pill t={t} color={STAGE_COLORS[c.stage]}>{c.stage}</Pill></div>
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
        {c.tags.map(tag => <Pill key={tag} t={t} color={tag === "Hot" ? "danger" : tag === "Warm" ? "warn" : "neutral"}>{tag}</Pill>)}
      </div>
      <div style={{ fontSize: 12.5, fontWeight: 500, fontVariantNumeric: "tabular-nums" }}>{c.value}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
        <Avatar t={t} name={c.owner} size={20}/>
        <span style={{ fontSize: 11.5, color: t.textMuted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.owner}</span>
      </div>
      <div style={{ fontSize: 11.5, color: t.textMuted }}>{c.last}</div>
      <div style={{ display: "flex", justifyContent: "flex-end" }}><ScoreBadge score={c.score} t={t} bold={bold}/></div>
    </div>
  );
}

// ================================================================
//                 CONTACTS — BOLD
// ================================================================
function ContactsBold({ t, theme, onToggleTheme, onOpenContact }) {
  const [view, setView] = React.useState("list");
  return (
    <div style={{ display: "flex", height: "100%", background: t.bg, color: t.text,
      fontFamily: OMNIFY_FONTS.sans, fontSize: 13 }}>
      <SidebarBold t={t} active="contacts" />
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <header style={{
          background: t.bg, borderBottom: `1px solid ${t.border}`,
          padding: "18px 28px 14px",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 10.5, color: t.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>
                Workspace · Contatos
              </div>
              <h1 style={{
                margin: 0, fontSize: 32, fontWeight: 500, letterSpacing: -0.8,
                fontFamily: OMNIFY_FONTS.display,
                display: "flex", alignItems: "baseline", gap: 12,
              }}>
                Contatos
                <span style={{ fontFamily: OMNIFY_FONTS.sans, fontSize: 13, fontWeight: 500, color: t.textMuted, letterSpacing: 0 }}>
                  {CONTACTS.length} registros · 4 donos
                </span>
              </h1>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Button t={t} variant="ghost" size="sm"
                onClick={onToggleTheme}
                leading={<Icon d={theme === "dark" ? Icons.sun : Icons.moon} size={14}/>}>
                {theme === "dark" ? "Claro" : "Escuro"}
              </Button>
              <Button t={t} variant="secondary" size="sm" leading={<Icon d={Icons.download} size={13}/>}>Exportar</Button>
              <Button t={t} variant="bold" size="sm" bold leading={<Icon d={Icons.plus} size={14}/>}>Novo contato</Button>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Input t={t} placeholder="Buscar nome, empresa ou email…"
              leading={<Icon d={Icons.search} size={14}/>}
              trailing={<Kbd t={t}>⌘K</Kbd>}
              style={{ flex: 1, maxWidth: 360 }} />

            <div style={{ display: "flex", background: t.bgSubtle, borderRadius: 8, padding: 2, gap: 2 }}>
              {[
                { k: "list", label: "Lista", icon: Icons.sort },
                { k: "grid", label: "Grid", icon: Icons.kanban },
                { k: "map",  label: "Mapa", icon: Icons.globe },
              ].map(o => (
                <div key={o.k} onClick={() => setView(o.k)}
                  style={{
                    padding: "5px 10px", fontSize: 11.5, fontWeight: 600, borderRadius: 6, cursor: "pointer",
                    background: view === o.k ? t.surface : "transparent",
                    color: view === o.k ? t.text : t.textMuted,
                    boxShadow: view === o.k ? `0 0 0 1px ${t.border}` : "none",
                    display: "flex", alignItems: "center", gap: 5,
                  }}>
                  <Icon d={o.icon} size={12}/> {o.label}
                </div>
              ))}
            </div>

            <Button t={t} variant="secondary" size="sm" leading={<Icon d={Icons.filter} size={13}/>}>Filtros · 2</Button>
            <div style={{ flex: 1 }} />
            <Button t={t} variant="ghost" size="sm" leading={<Icon d={Icons.sparkle} size={13}/>} style={{ color: t.text }}>
              Enriquecer com IA
            </Button>
          </div>
        </header>

        <div style={{
          padding: "10px 28px", display: "flex", gap: 10, alignItems: "center", overflowX: "auto",
          background: t.bg, borderBottom: `1px solid ${t.border}`,
        }}>
          {[
            { k: "Hot",       n: 18, c: t.danger,    soft: t.dangerSoft },
            { k: "Warm",      n: 42, c: t.warn,      soft: t.warnSoft },
            { k: "Cold",      n: 73, c: t.textMuted, soft: t.bgSubtle },
            { k: "Enterprise", n: 24, c: t.primary,   soft: t.primarySoft },
            { k: "SMB",       n: 89, c: t.text,      soft: t.bgSubtle },
          ].map(s => (
            <div key={s.k} style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "8px 14px", borderRadius: 10,
              background: t.surface, border: `1px solid ${t.border}`,
              cursor: "pointer", flexShrink: 0,
            }}>
              <div style={{ width: 6, height: 6, borderRadius: 999, background: s.c }} />
              <span style={{ fontSize: 12, fontWeight: 600 }}>{s.k}</span>
              <span style={{ fontSize: 11, color: t.textMuted, fontVariantNumeric: "tabular-nums" }}>{s.n}</span>
            </div>
          ))}
        </div>

        <div style={{ flex: 1, overflow: "auto", background: t.surface }}>
          <div style={{
            display: "grid",
            gridTemplateColumns: "36px 2fr 1.8fr 1fr 1.2fr 0.9fr 0.9fr 0.8fr 60px",
            padding: "10px 28px", borderBottom: `1px solid ${t.border}`,
            background: t.bgSubtle, position: "sticky", top: 0, zIndex: 2,
            fontSize: 10.5, fontWeight: 700, color: t.textMuted,
            textTransform: "uppercase", letterSpacing: 1,
          }}>
            <div></div>
            <div>Nome</div>
            <div>Empresa · cargo</div>
            <div>Estágio</div>
            <div>Tags</div>
            <div>Valor</div>
            <div>Dono</div>
            <div>Último toque</div>
            <div style={{ textAlign: "right" }}>Score IA</div>
          </div>
          {CONTACTS.map((c, i) => (
            <div key={i} style={{
              display: "grid",
              gridTemplateColumns: "36px 2fr 1.8fr 1fr 1.2fr 0.9fr 0.9fr 0.8fr 60px",
              padding: "14px 28px", borderBottom: `1px solid ${t.border}`,
              alignItems: "center", cursor: "pointer",
              transition: "background 120ms ease",
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = t.bgSubtle}
            onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
            onClick={() => onOpenContact?.(c)}
            >
              <div>
                <div style={{ width: 16, height: 16, borderRadius: 4, boxShadow: `inset 0 0 0 1px ${t.borderStrong}` }} />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                <Avatar t={t} name={c.name} size={32}/>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.name}</div>
                  <div style={{ fontSize: 11, color: t.textMuted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.email}</div>
                </div>
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.company}</div>
                <div style={{ fontSize: 11, color: t.textMuted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.title}</div>
              </div>
              <div><Pill t={t} color={STAGE_COLORS[c.stage]}>{c.stage}</Pill></div>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {c.tags.map(tag => <Pill key={tag} t={t} color={tag === "Hot" ? "danger" : tag === "Warm" ? "warn" : "neutral"}>{tag}</Pill>)}
              </div>
              <div style={{ fontSize: 12.5, fontWeight: 600, fontFamily: OMNIFY_FONTS.display, fontVariantNumeric: "tabular-nums" }}>{c.value}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                <Avatar t={t} name={c.owner} size={22}/>
                <span style={{ fontSize: 11.5, color: t.textMuted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.owner}</span>
              </div>
              <div style={{ fontSize: 11.5, color: t.textMuted }}>{c.last}</div>
              <div style={{ display: "flex", justifyContent: "flex-end" }}><ScoreBadge score={c.score} t={t} bold/></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { ContactsConservative, ContactsBold, CONTACTS, ScoreBadge, STAGE_COLORS });
