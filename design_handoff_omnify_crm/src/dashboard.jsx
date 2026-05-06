// OmniFy Hub — Dashboards (conservative + bold)

// ====================== SHARED DATA ======================
const DASH_KPIS = [
  { label: "Receita (MRR)", value: "R$ 482.3K", delta: "+12.4%", up: true,  spark: [32,35,31,36,40,38,44,42,48,52,50,54] },
  { label: "Novos deals",   value: "147",        delta: "+8.1%",  up: true,  spark: [18,22,20,24,23,28,26,31,29,34,32,37] },
  { label: "Taxa de conv.", value: "24.8%",      delta: "−2.1%",  up: false, spark: [28,27,29,26,27,25,26,24,25,23,25,24] },
  { label: "Ticket médio",  value: "R$ 8.4K",    delta: "+5.2%",  up: true,  spark: [68,72,70,74,76,75,78,82,80,84,86,88] },
];

const DASH_ACTIVITIES = [
  { who: "Rafael Lima",      what: "fechou",  obj: "Acordo com Nova Têxtil", when: "2min", amt: "R$ 42.000", type: "win" },
  { who: "Júlia Mendes",     what: "ligou para", obj: "Bruno Campos", when: "18min", amt: null, type: "call" },
  { who: "SDR Autônomo",     what: "qualificou", obj: "14 leads de Ads", when: "1h", amt: null, type: "ai" },
  { who: "Camila Ferraz",    what: "enviou proposta para", obj: "Sato Engenharia", when: "3h", amt: "R$ 18.500", type: "mail" },
  { who: "Henrique Dias",    what: "agendou reunião com", obj: "Paula Rocha", when: "5h", amt: null, type: "cal" },
];

const DASH_DEALS = [
  { name: "Prime Logística",   stage: "Negociação",   amt: "R$ 84.000", owner: "Rafael L.", close: "28 abr", prob: 70 },
  { name: "Grupo Norte",       stage: "Proposta",     amt: "R$ 52.500", owner: "Júlia M.",  close: "02 mai", prob: 55 },
  { name: "Vertex Indústria",  stage: "Demo agendada", amt: "R$ 128.000", owner: "Henrique D.", close: "05 mai", prob: 40 },
  { name: "Estúdio Mar",       stage: "Qualificado",  amt: "R$ 24.000", owner: "Camila F.", close: "09 mai", prob: 30 },
];

// ====================== KPI CARD (CONSERVATIVE) ======================
function KpiCard({ kpi, t }) {
  return (
    <Card t={t} pad={14} interactive>
      <div style={{ fontSize: 11.5, color: t.textMuted, marginBottom: 8 }}>{kpi.label}</div>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 10 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 600, color: t.text, letterSpacing: -0.4, lineHeight: 1 }}>{kpi.value}</div>
          <div style={{
            marginTop: 6, fontSize: 11, fontWeight: 500,
            display: "inline-flex", alignItems: "center", gap: 3,
            color: kpi.up ? t.success : t.danger,
          }}>
            <Icon d={kpi.up ? Icons.arrowUp : Icons.arrowDn} size={12}/>
            {kpi.delta}
            <span style={{ color: t.textSubtle, fontWeight: 400 }}>vs. mês ant.</span>
          </div>
        </div>
        <Spark data={kpi.spark} width={72} height={28}
          color={kpi.up ? t.success : t.danger}
          fill={kpi.up ? t.successSoft : t.dangerSoft} />
      </div>
    </Card>
  );
}

// ====================== REVENUE CHART (simple SVG bars) ======================
function RevenueChart({ t, color, height = 180 }) {
  const data = [
    { m: "Jan", v: 32, g: 28 }, { m: "Fev", v: 38, g: 31 },
    { m: "Mar", v: 36, g: 34 }, { m: "Abr", v: 44, g: 37 },
    { m: "Mai", v: 48, g: 40 }, { m: "Jun", v: 52, g: 43 },
    { m: "Jul", v: 49, g: 46 }, { m: "Ago", v: 58, g: 49 },
    { m: "Set", v: 62, g: 52 }, { m: "Out", v: 66, g: 55 },
    { m: "Nov", v: 72, g: 58 }, { m: "Dez", v: 68, g: 61 },
  ];
  const max = 80;
  const barW = 22, gap = 16, chartW = data.length * (barW + gap) - gap;
  return (
    <div style={{ position: "relative" }}>
      {/* Y axis lines */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        {[0, 1, 2, 3].map(i => (
          <div key={i} style={{
            position: "absolute", left: 0, right: 0,
            top: `${(i / 3) * 100}%`,
            borderTop: `1px dashed ${t.border}`,
          }}/>
        ))}
      </div>
      <svg width={chartW} height={height} style={{ display: "block", overflow: "visible" }}>
        {data.map((d, i) => {
          const x = i * (barW + gap);
          const hV = (d.v / max) * height;
          const hG = (d.g / max) * height;
          return (
            <g key={i}>
              {/* goal (lighter) */}
              <rect x={x} y={height - hG} width={barW} height={hG}
                fill={t.bgSubtle} rx="4" />
              {/* value */}
              <rect x={x} y={height - hV} width={barW} height={hV}
                fill={color || t.text} rx="4" />
              <text x={x + barW/2} y={height + 14} textAnchor="middle"
                fontSize="10" fill={t.textMuted} fontFamily="inherit">{d.m}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ====================== ACTIVITY LIST ======================
function ActivityList({ t, bold }) {
  const typeIcon = {
    win:  { icon: Icons.check,  color: t.success, bg: t.successSoft },
    call: { icon: Icons.phone,  color: t.primary, bg: t.primarySoft },
    ai:   { icon: Icons.sparkle, color: bold ? "#0A0A0A" : t.text, bg: bold ? t.boldInk : t.bgSubtle },
    mail: { icon: Icons.mail,   color: t.warn,    bg: t.warnSoft },
    cal:  { icon: Icons.calendar, color: t.textMuted, bg: t.bgSubtle },
  };
  return (
    <div>
      {DASH_ACTIVITIES.map((a, i) => {
        const s = typeIcon[a.type];
        return (
          <div key={i} style={{
            display: "flex", alignItems: "flex-start", gap: 10,
            padding: "10px 0",
            borderBottom: i < DASH_ACTIVITIES.length - 1 ? `1px solid ${t.border}` : "none",
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8,
              background: s.bg, color: s.color,
              display: "grid", placeItems: "center", flexShrink: 0,
            }}>
              <Icon d={s.icon} size={13} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12.5, color: t.text, lineHeight: 1.4 }}>
                <span style={{ fontWeight: 600 }}>{a.who}</span>{" "}
                <span style={{ color: t.textMuted }}>{a.what}</span>{" "}
                <span style={{ fontWeight: 500 }}>{a.obj}</span>
                {a.amt && <span style={{ color: t.success, fontWeight: 600 }}> · {a.amt}</span>}
              </div>
              <div style={{ fontSize: 11, color: t.textSubtle, marginTop: 2 }}>há {a.when}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ====================== DEALS TABLE (simple) ======================
function DealsTable({ t, bold }) {
  return (
    <div>
      <div style={{
        display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr 0.8fr 0.8fr",
        padding: "8px 0 10px", borderBottom: `1px solid ${t.border}`,
        fontSize: 10.5, color: t.textSubtle, fontWeight: 600,
        textTransform: "uppercase", letterSpacing: 0.4,
      }}>
        <div>Deal</div><div>Estágio</div><div>Valor</div><div>Dono</div><div style={{ textAlign: "right" }}>Prob.</div>
      </div>
      {DASH_DEALS.map((d, i) => (
        <div key={i} style={{
          display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr 0.8fr 0.8fr",
          alignItems: "center",
          padding: "12px 0",
          borderBottom: i < DASH_DEALS.length - 1 ? `1px solid ${t.border}` : "none",
          fontSize: 12.5,
        }}>
          <div style={{ fontWeight: 600, color: t.text }}>{d.name}</div>
          <div><Pill t={t} color={d.stage === "Negociação" ? "primary" : d.stage === "Proposta" ? "warn" : "neutral"}>{d.stage}</Pill></div>
          <div style={{ color: t.text, fontWeight: 500 }}>{d.amt}</div>
          <div style={{ color: t.textMuted }}>{d.owner}</div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8 }}>
            <div style={{ width: 42 }}><Bar t={t} value={d.prob} color={bold ? t.boldInk : t.text}/></div>
            <span style={{ fontSize: 11, color: t.textMuted, fontVariantNumeric: "tabular-nums", width: 30, textAlign: "right" }}>{d.prob}%</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ================================================================
//                  DASHBOARD — CONSERVATIVE
// ================================================================
function DashboardConservative({ t, theme, onToggleTheme }) {
  return (
    <div style={{ display: "flex", height: "100%", background: t.bg, color: t.text,
      fontFamily: OMNIFY_FONTS.sans, fontSize: 13 }}>
      <SidebarConservative t={t} active="dashboard" />
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <TopbarConservative t={t}
          breadcrumbs={["Workspace", "Dashboard"]}
          theme={theme} onToggleTheme={onToggleTheme}
          right={<>
            <Button t={t} variant="secondary" size="sm" leading={<Icon d={Icons.filter} size={13}/>}>Abril 2026</Button>
            <Button t={t} variant="primary" size="sm" leading={<Icon d={Icons.plus} size={13}/>}>Novo deal</Button>
          </>} />

        <div style={{ flex: 1, padding: 24, overflow: "auto" }}>
          {/* greeting */}
          <div style={{ marginBottom: 20 }}>
            <h1 style={{ fontSize: 22, fontWeight: 600, margin: 0, letterSpacing: -0.4 }}>Bom dia, Marina</h1>
            <p style={{ fontSize: 13, color: t.textMuted, margin: "4px 0 0" }}>
              Você tem <span style={{ color: t.text, fontWeight: 500 }}>4 atividades</span> hoje e <span style={{ color: t.text, fontWeight: 500 }}>12 mensagens</span> não lidas no Inbox.
            </p>
          </div>

          {/* KPIs */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
            {DASH_KPIS.map((k, i) => <KpiCard key={i} kpi={k} t={t} />)}
          </div>

          {/* Charts + activity */}
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12, marginBottom: 16 }}>
            <Card t={t} pad={20}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Receita vs. meta</h3>
                  <p style={{ margin: "2px 0 0", fontSize: 11.5, color: t.textMuted }}>Últimos 12 meses</p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 11, color: t.textMuted }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: t.bold }}/>Receita
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: t.bgSubtle, boxShadow: `inset 0 0 0 1px ${t.border}` }}/>Meta
                  </span>
                </div>
              </div>
              <RevenueChart t={t} />
            </Card>

            <Card t={t} pad={16}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Atividade recente</h3>
                <Icon d={Icons.dots} size={14} style={{ color: t.textMuted, cursor: "pointer" }}/>
              </div>
              <ActivityList t={t} />
            </Card>
          </div>

          {/* Deals table */}
          <Card t={t} pad={20}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Deals priorizados pela IA</h3>
                <p style={{ margin: "2px 0 0", fontSize: 11.5, color: t.textMuted }}>Top 4 por probabilidade · atualizado há 12min</p>
              </div>
              <Button t={t} variant="ghost" size="sm" trailing={<Icon d={Icons.chevR} size={12}/>}>Ver pipeline</Button>
            </div>
            <DealsTable t={t} />
          </Card>
        </div>
      </div>
    </div>
  );
}

// ================================================================
//                  DASHBOARD — BOLD
// ================================================================
function DashboardBold({ t, theme, onToggleTheme }) {
  return (
    <div style={{ display: "flex", height: "100%", background: t.bg, color: t.text,
      fontFamily: OMNIFY_FONTS.sans, fontSize: 13 }}>
      <SidebarBold t={t} active="dashboard" />
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Custom bold topbar */}
        <header style={{
          background: t.bg, borderBottom: `1px solid ${t.border}`,
          padding: "14px 28px", display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 10.5, color: t.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>
              Terça, 22 de abril · Semana 17
            </div>
            <h1 style={{
              margin: 0, fontSize: 24, fontWeight: 500, letterSpacing: -0.6,
              fontFamily: OMNIFY_FONTS.display,
            }}>
              Bom dia, <em style={{ fontStyle: "italic" }}>Marina</em>.
              <span style={{
                marginLeft: 10, fontFamily: OMNIFY_FONTS.sans,
                fontSize: 13, fontWeight: 500, color: t.textMuted, letterSpacing: 0,
              }}>Sua receita subiu 12.4% este mês.</span>
            </h1>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Button t={t} variant="ghost" size="sm"
              onClick={onToggleTheme}
              leading={<Icon d={theme === "dark" ? Icons.sun : Icons.moon} size={14}/>}>
              {theme === "dark" ? "Claro" : "Escuro"}
            </Button>
            <div style={{
              padding: "6px 10px", borderRadius: 8,
              background: t.bgSubtle, display: "flex", alignItems: "center", gap: 8,
              fontSize: 12, color: t.textMuted,
            }}>
              <Icon d={Icons.search} size={13}/>
              Buscar…
              <Kbd t={t}>⌘K</Kbd>
            </div>
            <Button t={t} variant="bold" size="sm" bold leading={<Icon d={Icons.plus} size={14}/>}>Novo deal</Button>
          </div>
        </header>

        <div style={{ flex: 1, padding: 28, overflow: "auto" }}>
          {/* Hero KPI */}
          <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr 1fr", gap: 14, marginBottom: 14 }}>
            {/* Hero — MRR */}
            <div style={{
              background: t.bold, color: "#F4F3EF", borderRadius: 16, padding: 22,
              position: "relative", overflow: "hidden",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>
                  Receita recorrente · MRR
                </div>
                <Pill t={{ ...t, successSoft: "rgba(220,255,0,0.15)", success: t.boldInk }} color="success">
                  <Icon d={Icons.arrowUp} size={10}/> 12.4%
                </Pill>
              </div>
              <div style={{
                fontSize: 56, fontWeight: 500, letterSpacing: -2, lineHeight: 1.1,
                fontFamily: OMNIFY_FONTS.display,
                color: "#F4F3EF",
                paddingBottom: 6,
              }}>R$ 482<span style={{ color: t.boldInk }}>.3K</span></div>
              <div style={{ marginTop: 22, display: "flex", gap: 28, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Meta Q2</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>R$ 650K <span style={{ color: t.boldInk, fontWeight: 500 }}>· 74%</span></div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Novos clientes</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>23 <span style={{ color: "rgba(255,255,255,0.5)", fontWeight: 500 }}>este mês</span></div>
                </div>
              </div>
              {/* Decorative spark */}
              <div style={{ position: "absolute", right: -10, bottom: -10, opacity: 0.25 }}>
                <Spark data={[32,35,31,36,40,38,44,42,48,52,50,54,60]} width={260} height={80} color={t.boldInk}/>
              </div>
            </div>

            {/* Two smaller KPIs */}
            {DASH_KPIS.slice(1, 3).map((k, i) => (
              <div key={i} style={{
                background: t.surface, border: `1px solid ${t.border}`, borderRadius: 16, padding: 20,
                display: "flex", flexDirection: "column", justifyContent: "space-between",
              }}>
                <div>
                  <div style={{ fontSize: 11, color: t.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>
                    {k.label}
                  </div>
                  <div style={{
                    fontSize: 36, fontWeight: 500, marginTop: 10, letterSpacing: -1, lineHeight: 1,
                    fontFamily: OMNIFY_FONTS.display,
                  }}>{k.value}</div>
                  <div style={{
                    marginTop: 8, fontSize: 11.5, fontWeight: 500,
                    display: "inline-flex", alignItems: "center", gap: 4,
                    color: k.up ? t.success : t.danger,
                  }}>
                    <Icon d={k.up ? Icons.arrowUp : Icons.arrowDn} size={12}/> {k.delta}
                  </div>
                </div>
                <Spark data={k.spark} width={140} height={36}
                  color={k.up ? t.success : t.danger}
                  fill={k.up ? t.successSoft : t.dangerSoft} />
              </div>
            ))}
          </div>

          {/* Chart + AI insights */}
          <div style={{ display: "grid", gridTemplateColumns: "1.8fr 1fr", gap: 14, marginBottom: 14 }}>
            <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 16, padding: 22 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, letterSpacing: -0.2 }}>Receita vs. meta</h3>
                  <p style={{ margin: "2px 0 0", fontSize: 11.5, color: t.textMuted }}>Últimos 12 meses · Fechado + MRR</p>
                </div>
                <div style={{
                  display: "flex", background: t.bgSubtle, borderRadius: 8, padding: 2,
                }}>
                  {["12m", "6m", "90d", "30d"].map((p, i) => (
                    <div key={p} style={{
                      padding: "4px 10px", fontSize: 11, fontWeight: 600, borderRadius: 6, cursor: "pointer",
                      background: i === 0 ? t.surface : "transparent",
                      color: i === 0 ? t.text : t.textMuted,
                      boxShadow: i === 0 ? `0 0 0 1px ${t.border}` : "none",
                    }}>{p}</div>
                  ))}
                </div>
              </div>
              <RevenueChart t={t} color={t.text} height={160}/>
            </div>

            {/* AI insight card */}
            <div style={{
              background: t.surface, border: `1px solid ${t.border}`, borderRadius: 16,
              padding: 20, display: "flex", flexDirection: "column",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 8,
                  background: t.boldInk, color: "#0A0A0A",
                  display: "grid", placeItems: "center",
                }}><Icon d={Icons.sparkle} size={15}/></div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>SDR autônomo</div>
                  <div style={{ fontSize: 10.5, color: t.textMuted }}>Sugestões da IA · agora</div>
                </div>
              </div>
              {[
                { title: "3 deals em risco", desc: "Sem follow-up há >7 dias. Vertex, Mar e Norte.", act: "Revisar" },
                { title: "8 leads quentes",  desc: "Visitaram pricing 3x nas últimas 48h.", act: "Ver lista" },
                { title: "Campanha Ads",     desc: "CAC caiu 18% em 'Logística'. Aumentar budget?", act: "Ajustar" },
              ].map((ins, i) => (
                <div key={i} style={{
                  padding: "10px 0",
                  borderTop: i === 0 ? `1px solid ${t.border}` : "none",
                  borderBottom: `1px solid ${t.border}`,
                }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 3 }}>{ins.title}</div>
                  <div style={{ fontSize: 11.5, color: t.textMuted, lineHeight: 1.45 }}>{ins.desc}</div>
                  <div style={{ marginTop: 6 }}>
                    <span style={{
                      fontSize: 11, fontWeight: 600, color: t.text,
                      display: "inline-flex", alignItems: "center", gap: 3, cursor: "pointer",
                      borderBottom: `1px solid ${t.text}`,
                    }}>{ins.act} <Icon d={Icons.arrowUR} size={11}/></span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Deals + activity */}
          <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 14 }}>
            <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 16, padding: 22 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, letterSpacing: -0.2 }}>Deals priorizados</h3>
                  <p style={{ margin: "2px 0 0", fontSize: 11.5, color: t.textMuted }}>IA · top 4 por probabilidade</p>
                </div>
                <Button t={t} variant="ghost" size="sm" trailing={<Icon d={Icons.arrowUR} size={12}/>}>Ver pipeline</Button>
              </div>
              <DealsTable t={t} bold />
            </div>

            <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 16, padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, letterSpacing: -0.2 }}>Atividade</h3>
                <Icon d={Icons.dots} size={14} style={{ color: t.textMuted, cursor: "pointer" }}/>
              </div>
              <ActivityList t={t} bold />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { DashboardConservative, DashboardBold });
