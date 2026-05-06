// OmniFy Hub — Pipeline / Kanban (conservative + bold)

const PIPELINE_STAGES = [
  { k: "lead",    label: "Lead",        total: "R$ 142K", count: 12 },
  { k: "qual",    label: "Qualificado", total: "R$ 287K", count: 8 },
  { k: "demo",    label: "Demo",        total: "R$ 418K", count: 6 },
  { k: "proposal", label: "Proposta",   total: "R$ 612K", count: 5 },
  { k: "negotiation", label: "Negociação", total: "R$ 384K", count: 4 },
  { k: "won",     label: "Fechado",     total: "R$ 248K", count: 7 },
];

const PIPELINE_DEALS = {
  lead: [
    { co: "Cloud9 Tech",       owner: "Marina O.",   amt: "R$ 22K", days: 2, prob: 20 },
    { co: "Papelaria Alfa",    owner: "Júlia M.",    amt: "R$ 8K",  days: 4, prob: 15 },
    { co: "Luz & Sol",         owner: "Camila F.",   amt: "R$ 12K", days: 1, prob: 25 },
    { co: "Farma Vida",        owner: "Rafael L.",   amt: "R$ 18K", days: 3, prob: 18 },
  ],
  qual: [
    { co: "Estúdio Mar",       owner: "Júlia M.",    amt: "R$ 24K", days: 6, prob: 35 },
    { co: "Forma Arquitetura", owner: "Henrique D.", amt: "R$ 36K", days: 4, prob: 42 },
    { co: "Botanica Co",       owner: "Júlia M.",    amt: "R$ 14K", days: 2, prob: 45 },
  ],
  demo: [
    { co: "Vertex Indústria",  owner: "Henrique D.", amt: "R$ 128K", days: 5, prob: 55, hot: true },
    { co: "Sato Engenharia",   owner: "Rafael L.",   amt: "R$ 62K",  days: 3, prob: 50 },
    { co: "Helio Energia",     owner: "Camila F.",   amt: "R$ 48K",  days: 7, prob: 48 },
  ],
  proposal: [
    { co: "Grupo Norte",       owner: "Henrique D.", amt: "R$ 52K", days: 9, prob: 65, warn: true },
    { co: "Sato Engenharia",   owner: "Rafael L.",   amt: "R$ 18K", days: 4, prob: 70 },
    { co: "Cidade Verde",      owner: "Marina O.",   amt: "R$ 94K", days: 6, prob: 62 },
  ],
  negotiation: [
    { co: "Prime Logística",   owner: "Rafael L.",   amt: "R$ 84K", days: 3, prob: 80, hot: true },
    { co: "Aurora Seguros",    owner: "Marina O.",   amt: "R$ 112K", days: 5, prob: 75 },
  ],
  won: [
    { co: "Nova Têxtil",       owner: "Rafael L.",   amt: "R$ 42K", days: 0, prob: 100 },
    { co: "Meia Noite Café",   owner: "Camila F.",   amt: "R$ 6K",  days: 1, prob: 100 },
  ],
};

function DealCardC({ d, t, bold }) {
  const [hover, setHover] = React.useState(false);
  return (
    <div
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        background: t.surface, borderRadius: 10,
        border: `1px solid ${hover ? t.borderStrong : t.border}`,
        boxShadow: hover ? t.shadow : "none",
        padding: 12, marginBottom: 8,
        cursor: "grab", transition: "all 120ms ease",
        position: "relative",
      }}>
      {d.hot && (
        <div style={{ position: "absolute", top: 10, right: 10 }}>
          <Icon d={Icons.flame} size={13} style={{ color: t.danger }}/>
        </div>
      )}
      {d.warn && (
        <div style={{ position: "absolute", top: 10, right: 10 }}>
          <Icon d={Icons.clock} size={13} style={{ color: t.warn }}/>
        </div>
      )}
      <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 4, paddingRight: 18 }}>{d.co}</div>
      <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: -0.3, marginBottom: 8,
        fontFamily: bold ? OMNIFY_FONTS.display : "inherit",
      }}>{d.amt}</div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <Avatar t={t} name={d.owner} size={18} />
          <span style={{ fontSize: 10.5, color: t.textMuted }}>{d.owner.split(" ")[0]}</span>
        </div>
        <span style={{ fontSize: 10.5, color: t.textMuted }}>{d.days}d</span>
      </div>
      <div style={{ marginTop: 8 }}>
        <Bar t={t} value={d.prob} color={bold ? (d.prob >= 80 ? t.success : t.boldInk) : (d.prob >= 80 ? t.success : t.text)} height={3}/>
      </div>
    </div>
  );
}

// ================================================================
//                 PIPELINE — CONSERVATIVE
// ================================================================
function PipelineConservative({ t, theme, onToggleTheme }) {
  return (
    <div style={{ display: "flex", height: "100%", background: t.bg, color: t.text,
      fontFamily: OMNIFY_FONTS.sans, fontSize: 13 }}>
      <SidebarConservative t={t} active="pipeline" />
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <TopbarConservative t={t}
          breadcrumbs={["Workspace", "Pipeline"]}
          theme={theme} onToggleTheme={onToggleTheme}
          right={<>
            <Button t={t} variant="secondary" size="sm" leading={<Icon d={Icons.filter} size={13}/>}>Filtros</Button>
            <Button t={t} variant="secondary" size="sm" leading={<Icon d={Icons.user} size={13}/>}>Todos os donos</Button>
            <Button t={t} variant="primary" size="sm" leading={<Icon d={Icons.plus} size={13}/>}>Novo deal</Button>
          </>}
        />

        <div style={{
          padding: "10px 20px",
          display: "flex", alignItems: "center", gap: 24,
          borderBottom: `1px solid ${t.border}`, background: t.surface,
        }}>
          <div>
            <div style={{ fontSize: 10, color: t.textSubtle, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.6 }}>Pipeline total</div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>R$ 2.09M <span style={{ fontSize: 11, color: t.success, fontWeight: 500 }}>+14%</span></div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: t.textSubtle, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.6 }}>Previsão abril</div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>R$ 418K</div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: t.textSubtle, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.6 }}>Deals ativos</div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>42</div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: t.textSubtle, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.6 }}>Taxa de conversão</div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>24.8%</div>
          </div>
        </div>

        <div style={{ flex: 1, overflow: "auto", padding: 16 }}>
          <div style={{ display: "flex", gap: 12, minWidth: "fit-content", height: "100%" }}>
            {PIPELINE_STAGES.map(stage => (
              <div key={stage.k} style={{
                width: 248, flexShrink: 0,
                background: t.surfaceAlt, borderRadius: 12,
                border: `1px solid ${t.border}`,
                display: "flex", flexDirection: "column",
                maxHeight: "100%",
              }}>
                <div style={{ padding: "12px 12px 8px", borderBottom: `1px solid ${t.border}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600 }}>{stage.label}</div>
                    <span style={{ fontSize: 10.5, color: t.textMuted, fontWeight: 600 }}>{stage.count}</span>
                  </div>
                  <div style={{ fontSize: 11, color: t.textMuted }}>{stage.total}</div>
                </div>
                <div style={{ padding: 8, flex: 1, overflow: "auto" }}>
                  {(PIPELINE_DEALS[stage.k] || []).map((d, i) => (
                    <DealCardC key={i} d={d} t={t}/>
                  ))}
                  <div style={{
                    padding: "10px", fontSize: 11.5, color: t.textMuted,
                    textAlign: "center", cursor: "pointer",
                    borderRadius: 8, border: `1px dashed ${t.border}`,
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
                  }}>
                    <Icon d={Icons.plus} size={12}/> Adicionar
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ================================================================
//                 PIPELINE — BOLD
// ================================================================
function PipelineBold({ t, theme, onToggleTheme }) {
  return (
    <div style={{ display: "flex", height: "100%", background: t.bg, color: t.text,
      fontFamily: OMNIFY_FONTS.sans, fontSize: 13 }}>
      <SidebarBold t={t} active="pipeline" />
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <header style={{
          background: t.bg, borderBottom: `1px solid ${t.border}`,
          padding: "18px 28px 14px",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, gap: 16, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 10.5, color: t.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>
                Q2 2026 · Vendas B2B
              </div>
              <h1 style={{
                margin: 0, fontSize: 28, fontWeight: 500, letterSpacing: -0.8,
                fontFamily: OMNIFY_FONTS.display,
                whiteSpace: "nowrap",
              }}>
                Pipeline <em style={{ fontStyle: "italic", color: t.textMuted }}>· R$ 2.09M</em>
              </h1>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Button t={t} variant="ghost" size="sm"
                onClick={onToggleTheme}
                leading={<Icon d={theme === "dark" ? Icons.sun : Icons.moon} size={14}/>}>
                {theme === "dark" ? "Claro" : "Escuro"}
              </Button>
              <Button t={t} variant="secondary" size="sm" leading={<Icon d={Icons.filter} size={13}/>}>Todos os donos</Button>
              <Button t={t} variant="bold" size="sm" bold leading={<Icon d={Icons.plus} size={14}/>}>Novo deal</Button>
            </div>
          </div>

          {/* Funnel bar */}
          <div style={{
            display: "flex", gap: 3, height: 44, alignItems: "stretch",
            background: t.bgSubtle, borderRadius: 10, padding: 4,
          }}>
            {PIPELINE_STAGES.map((s, i) => {
              const total = PIPELINE_STAGES.reduce((a, b) => a + b.count, 0);
              const pct = (s.count / total) * 100;
              const isWon = s.k === "won";
              return (
                <div key={s.k} style={{
                  flex: pct, minWidth: 60,
                  background: isWon ? t.boldInk : (i === 3 ? t.bold : t.surface),
                  color: isWon ? "#0A0A0A" : (i === 3 ? "#F4F3EF" : t.text),
                  borderRadius: 7, padding: "4px 10px",
                  display: "flex", flexDirection: "column", justifyContent: "center",
                  border: i === 3 || isWon ? "none" : `1px solid ${t.border}`,
                }}>
                  <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, opacity: 0.7 }}>
                    {s.label}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                    {s.count} · {s.total}
                  </div>
                </div>
              );
            })}
          </div>
        </header>

        <div style={{ flex: 1, overflow: "auto", padding: 20 }}>
          <div style={{ display: "flex", gap: 14, minWidth: "fit-content", height: "100%" }}>
            {PIPELINE_STAGES.map((stage, idx) => {
              const isWon = stage.k === "won";
              return (
                <div key={stage.k} style={{
                  width: 264, flexShrink: 0,
                  display: "flex", flexDirection: "column",
                  maxHeight: "100%",
                }}>
                  <div style={{
                    padding: "10px 12px 12px", marginBottom: 10,
                    borderBottom: `2px solid ${isWon ? t.boldInk : t.text}`,
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: t.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 2 }}>
                          #{String(idx + 1).padStart(2, "0")}
                        </div>
                        <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: -0.2 }}>{stage.label}</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{
                          fontSize: 16, fontWeight: 600, letterSpacing: -0.3,
                          fontFamily: OMNIFY_FONTS.display,
                          color: isWon ? t.success : t.text,
                        }}>{stage.total}</div>
                        <div style={{ fontSize: 10.5, color: t.textMuted, fontWeight: 500 }}>{stage.count} deals</div>
                      </div>
                    </div>
                  </div>
                  <div style={{ flex: 1, overflow: "auto" }}>
                    {(PIPELINE_DEALS[stage.k] || []).map((d, i) => (
                      <DealCardC key={i} d={d} t={t} bold/>
                    ))}
                    <div style={{
                      padding: "10px", fontSize: 11.5, color: t.textMuted,
                      textAlign: "center", cursor: "pointer",
                      borderRadius: 10, border: `1px dashed ${t.border}`,
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
                    }}>
                      <Icon d={Icons.plus} size={12}/> Adicionar
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { PipelineConservative, PipelineBold });
