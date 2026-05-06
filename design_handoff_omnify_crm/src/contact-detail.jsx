// OmniFy Hub — Contact detail (conservative + bold)

function ContactDetailConservative({ t, theme, onToggleTheme, contact, onClose }) {
  const c = contact || CONTACTS[0];
  const [tab, setTab] = React.useState("Atividade");
  return (
    <div style={{ display: "flex", height: "100%", background: t.bg, color: t.text,
      fontFamily: OMNIFY_FONTS.sans, fontSize: 13 }}>
      <SidebarConservative t={t} active="contacts" />
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <TopbarConservative t={t}
          breadcrumbs={["Contatos", c.name]}
          theme={theme} onToggleTheme={onToggleTheme}
          right={<>
            <Button t={t} variant="ghost" size="sm" onClick={onClose} leading={<Icon d={Icons.chevL} size={13}/>}>Voltar</Button>
            <Button t={t} variant="secondary" size="sm" leading={<Icon d={Icons.mail} size={13}/>}>Email</Button>
            <Button t={t} variant="secondary" size="sm" leading={<Icon d={Icons.phone} size={13}/>}>Ligar</Button>
            <Button t={t} variant="primary" size="sm" leading={<Icon d={Icons.plus} size={13}/>}>Atividade</Button>
          </>}
        />

        <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
          {/* Main column */}
          <div style={{ flex: 1, padding: 24, overflow: "auto" }}>
            {/* Header */}
            <div style={{ display: "flex", gap: 18, alignItems: "flex-start", marginBottom: 20 }}>
              <Avatar t={t} name={c.name} size={64} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                  <h1 style={{ margin: 0, fontSize: 20, fontWeight: 600, letterSpacing: -0.4 }}>{c.name}</h1>
                  <Pill t={t} color={STAGE_COLORS[c.stage]}>{c.stage}</Pill>
                  {c.tags.map(tag => <Pill key={tag} t={t} color={tag === "Hot" ? "danger" : tag === "Warm" ? "warn" : "neutral"}>{tag}</Pill>)}
                </div>
                <div style={{ fontSize: 13, color: t.textMuted }}>{c.title} · {c.company}</div>
                <div style={{ display: "flex", gap: 18, marginTop: 10, fontSize: 12, color: t.textMuted }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><Icon d={Icons.mail} size={13}/>{c.email}</span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><Icon d={Icons.phone} size={13}/>{c.phone}</span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><Icon d={Icons.clock} size={13}/>Último toque há {c.last}</span>
                </div>
              </div>
              <ScoreBadge score={c.score} t={t}/>
            </div>

            {/* Tabs */}
            <div style={{ display: "flex", gap: 2, borderBottom: `1px solid ${t.border}`, marginBottom: 18 }}>
              {["Atividade", "Emails", "Deals", "Notas", "Arquivos"].map(tb => (
                <div key={tb} onClick={() => setTab(tb)} style={{
                  padding: "8px 12px", fontSize: 12.5, fontWeight: tab === tb ? 600 : 500,
                  color: tab === tb ? t.text : t.textMuted,
                  borderBottom: `2px solid ${tab === tb ? t.text : "transparent"}`,
                  marginBottom: -1, cursor: "pointer",
                }}>{tb}</div>
              ))}
            </div>

            {/* Compose */}
            <Card t={t} pad={14} style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <Avatar t={t} name="Marina Okano" size={28}/>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12.5, color: t.textMuted, paddingBottom: 10 }}>
                    Escreva uma nota ou registre uma atividade…
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <Pill t={t} color="neutral">📝 Nota</Pill>
                    <Pill t={t} color="neutral">📞 Ligação</Pill>
                    <Pill t={t} color="neutral">📧 Email</Pill>
                    <Pill t={t} color="neutral">📅 Reunião</Pill>
                  </div>
                </div>
              </div>
            </Card>

            {/* Timeline */}
            <Card t={t} pad={0}>
              {[
                { type: "call", icon: Icons.phone, c: t.primary, bg: t.primarySoft, title: "Ligação · 18min", by: "Você", time: "hoje, 10:24",
                  body: "Discutimos requisitos de integração com SAP. Próximo passo: enviar PoC na quinta." },
                { type: "mail", icon: Icons.mail, c: t.warn, bg: t.warnSoft, title: "Email enviado", by: "Você", time: "ontem, 16:41",
                  body: "Re: Proposta comercial Q2 — anexada versão revisada com desconto por volume." },
                { type: "ai", icon: Icons.sparkle, c: t.text, bg: t.bgSubtle, title: "SDR Autônomo · insight", by: "IA", time: "2 dias atrás",
                  body: "Rafael abriu a proposta 3x nas últimas 48h, mas ainda não respondeu. Sugiro follow-up leve." },
                { type: "win", icon: Icons.check, c: t.success, bg: t.successSoft, title: "Demo realizada", by: "Henrique Dias", time: "5 dias atrás",
                  body: "Apresentamos módulo de analytics. Cliente demonstrou interesse em add-on enterprise." },
              ].map((e, i, a) => (
                <div key={i} style={{
                  display: "flex", gap: 12,
                  padding: 16,
                  borderBottom: i < a.length - 1 ? `1px solid ${t.border}` : "none",
                }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 8, background: e.bg, color: e.c,
                    display: "grid", placeItems: "center", flexShrink: 0,
                  }}><Icon d={e.icon} size={15}/></div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{e.title}</span>
                      <span style={{ fontSize: 11, color: t.textMuted }}>· {e.by}</span>
                      <span style={{ fontSize: 11, color: t.textSubtle, marginLeft: "auto" }}>{e.time}</span>
                    </div>
                    <div style={{ fontSize: 12.5, color: t.textMuted, lineHeight: 1.5 }}>{e.body}</div>
                  </div>
                </div>
              ))}
            </Card>
          </div>

          {/* Right column */}
          <aside style={{ width: 300, borderLeft: `1px solid ${t.border}`, background: t.surfaceAlt, padding: 20, overflow: "auto", flexShrink: 0 }}>
            <PropSection title="Deal ativo" t={t}>
              <Card t={t} pad={12} style={{ background: t.surface }}>
                <div style={{ fontSize: 12.5, fontWeight: 600 }}>{c.company}</div>
                <div style={{ fontSize: 11, color: t.textMuted, marginBottom: 10 }}>{c.stage}</div>
                <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: -0.4, marginBottom: 10 }}>{c.value}</div>
                <Bar t={t} value={c.score} color={t.text}/>
                <div style={{ fontSize: 11, color: t.textMuted, marginTop: 6 }}>Probabilidade: {c.score}%</div>
              </Card>
            </PropSection>

            <PropSection title="Sobre" t={t}>
              <Prop t={t} k="Empresa" v={c.company}/>
              <Prop t={t} k="Cargo" v={c.title}/>
              <Prop t={t} k="Email" v={c.email}/>
              <Prop t={t} k="Telefone" v={c.phone}/>
              <Prop t={t} k="LinkedIn" v="/in/rafaellima" link/>
              <Prop t={t} k="Localização" v="São Paulo, BR"/>
            </PropSection>

            <PropSection title="Dono & time" t={t}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Avatar t={t} name={c.owner} size={24}/>
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 500 }}>{c.owner}</div>
                  <div style={{ fontSize: 10.5, color: t.textMuted }}>Account Executive</div>
                </div>
              </div>
            </PropSection>
          </aside>
        </div>
      </div>
    </div>
  );
}

function PropSection({ title, children, t }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{
        fontSize: 10, fontWeight: 600, color: t.textSubtle,
        textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10,
      }}>{title}</div>
      {children}
    </div>
  );
}

function Prop({ k, v, t, link }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 12, borderBottom: `1px dashed ${t.border}` }}>
      <span style={{ color: t.textMuted }}>{k}</span>
      <span style={{ color: link ? t.primary : t.text, fontWeight: 500, textAlign: "right" }}>{v}</span>
    </div>
  );
}

// ================================================================
//                CONTACT DETAIL — BOLD
// ================================================================
function ContactDetailBold({ t, theme, onToggleTheme, contact, onClose }) {
  const c = contact || CONTACTS[0];
  const [tab, setTab] = React.useState("Atividade");
  return (
    <div style={{ display: "flex", height: "100%", background: t.bg, color: t.text,
      fontFamily: OMNIFY_FONTS.sans, fontSize: 13 }}>
      <SidebarBold t={t} active="contacts" />
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* contact top nav */}
        <header style={{
          padding: "14px 28px", borderBottom: `1px solid ${t.border}`,
          display: "flex", justifyContent: "space-between", alignItems: "center",
          background: t.bg,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12.5, color: t.textMuted }}>
            <span onClick={onClose} style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5 }}>
              <Icon d={Icons.chevL} size={13}/> Contatos
            </span>
            <Icon d={Icons.chevR} size={11} style={{ color: t.textSubtle }}/>
            <span style={{ color: t.text, fontWeight: 600 }}>{c.name}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Button t={t} variant="ghost" size="sm"
              onClick={onToggleTheme}
              leading={<Icon d={theme === "dark" ? Icons.sun : Icons.moon} size={13}/>}>
              {theme === "dark" ? "Claro" : "Escuro"}
            </Button>
            <Button t={t} variant="secondary" size="sm" leading={<Icon d={Icons.mail} size={13}/>}>Email</Button>
            <Button t={t} variant="secondary" size="sm" leading={<Icon d={Icons.phone} size={13}/>}>Ligar</Button>
            <Button t={t} variant="bold" size="sm" bold leading={<Icon d={Icons.plus} size={13}/>}>Atividade</Button>
          </div>
        </header>

        {/* Hero band */}
        <div style={{
          padding: "28px 28px 20px",
          background: t.bg, borderBottom: `1px solid ${t.border}`,
          display: "flex", gap: 24, alignItems: "flex-start",
        }}>
          <div style={{ position: "relative" }}>
            <Avatar t={t} name={c.name} size={84}/>
            <div style={{
              position: "absolute", bottom: -4, right: -4,
              width: 22, height: 22, borderRadius: 999,
              background: c.score >= 80 ? t.success : t.warn,
              boxShadow: `0 0 0 3px ${t.surface}`,
              display: "grid", placeItems: "center",
              color: "#fff", fontSize: 10, fontWeight: 700,
            }}>{c.score}</div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <h1 style={{
                margin: 0, fontSize: 30, fontWeight: 500, letterSpacing: -0.8,
                fontFamily: OMNIFY_FONTS.display,
              }}>{c.name}</h1>
              <Pill t={t} color={STAGE_COLORS[c.stage]}>{c.stage}</Pill>
              {c.tags.map(tag => <Pill key={tag} t={t} color={tag === "Hot" ? "danger" : tag === "Warm" ? "warn" : "neutral"}>{tag}</Pill>)}
            </div>
            <div style={{ fontSize: 13.5, color: t.textMuted, marginBottom: 14 }}>
              {c.title} · <span style={{ color: t.text, fontWeight: 500 }}>{c.company}</span>
            </div>
            <div style={{ display: "flex", gap: 28 }}>
              {[
                { k: "Deal ativo", v: c.value, big: true },
                { k: "Prob. IA", v: `${c.score}%` },
                { k: "Último toque", v: c.last + " atrás" },
                { k: "Dono", v: c.owner },
              ].map((s, i) => (
                <div key={i} style={{ paddingRight: 24, borderRight: i < 3 ? `1px solid ${t.border}` : "none" }}>
                  <div style={{ fontSize: 10, color: t.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4, fontWeight: 600 }}>{s.k}</div>
                  <div style={{
                    fontSize: s.big ? 20 : 14, fontWeight: 600,
                    fontFamily: s.big ? OMNIFY_FONTS.display : OMNIFY_FONTS.sans,
                  }}>{s.v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
          {/* Left prop rail */}
          <aside style={{ width: 260, borderRight: `1px solid ${t.border}`, background: t.bg, padding: 22, overflow: "auto", flexShrink: 0 }}>
            <PropSection title="Contato" t={t}>
              <Prop t={t} k="Email" v={c.email}/>
              <Prop t={t} k="Telefone" v={c.phone}/>
              <Prop t={t} k="LinkedIn" v="/in/" link/>
              <Prop t={t} k="Localização" v="São Paulo, BR"/>
            </PropSection>
            <PropSection title="Empresa" t={t}>
              <Prop t={t} k="Nome" v={c.company}/>
              <Prop t={t} k="Setor" v="Logística"/>
              <Prop t={t} k="Funcionários" v="250–500"/>
              <Prop t={t} k="ARR estimado" v="R$ 18M"/>
            </PropSection>
            <PropSection title="Automações" t={t}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ padding: "8px 10px", background: t.surface, border: `1px solid ${t.border}`, borderRadius: 8, fontSize: 11.5 }}>
                  <div style={{ fontWeight: 600, marginBottom: 2 }}>🎯 Nurturing enterprise</div>
                  <div style={{ color: t.textMuted }}>Ativa · passo 3/6</div>
                </div>
                <div style={{ padding: "8px 10px", background: t.surface, border: `1px solid ${t.border}`, borderRadius: 8, fontSize: 11.5 }}>
                  <div style={{ fontWeight: 600, marginBottom: 2 }}>📧 Follow-up proposta</div>
                  <div style={{ color: t.textMuted }}>Próx. em 2 dias</div>
                </div>
              </div>
            </PropSection>
          </aside>

          {/* Main */}
          <div style={{ flex: 1, padding: 22, overflow: "auto" }}>
            {/* Tabs */}
            <div style={{ display: "flex", gap: 4, marginBottom: 20 }}>
              {["Atividade", "Emails", "Deals", "Notas", "Arquivos"].map(tb => (
                <div key={tb} onClick={() => setTab(tb)} style={{
                  padding: "6px 12px", fontSize: 12.5, fontWeight: 600, borderRadius: 8,
                  background: tab === tb ? t.text : "transparent",
                  color: tab === tb ? t.bg : t.textMuted,
                  cursor: "pointer",
                }}>{tb}</div>
              ))}
            </div>

            {/* AI summary card */}
            <div style={{
              background: t.bold, color: "#F4F3EF",
              borderRadius: 14, padding: 18, marginBottom: 20,
              display: "flex", gap: 14, alignItems: "flex-start",
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: 9, background: t.boldInk, color: "#0A0A0A",
                display: "grid", placeItems: "center", flexShrink: 0,
              }}><Icon d={Icons.sparkle} size={16}/></div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Resumo da IA</div>
                <div style={{ fontSize: 14, lineHeight: 1.55, color: "#F4F3EF" }}>
                  {c.name} é decisor em {c.company} (logística). Nas últimas 2 semanas visitou a página de pricing 4x, abriu a proposta 3x mas ainda não respondeu. <strong style={{ color: t.boldInk }}>Recomendação:</strong> follow-up curto mencionando o case Nova Têxtil (setor similar, ROI de 3.2x).
                </div>
                <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
                  <Button t={t} variant="bold" size="sm" bold>Gerar email</Button>
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", alignSelf: "center" }}>ou</span>
                  <Button t={t} variant="ghost" size="sm" style={{ color: "#F4F3EF" }}>Agendar ligação</Button>
                </div>
              </div>
            </div>

            {/* Timeline */}
            {[
              { icon: Icons.phone, c: t.primary, bg: t.primarySoft, title: "Ligação · 18min", by: "Você", time: "hoje, 10:24",
                body: "Discutimos requisitos de integração com SAP. Próximo passo: enviar PoC na quinta." },
              { icon: Icons.mail, c: t.warn, bg: t.warnSoft, title: "Email enviado", by: "Você", time: "ontem, 16:41",
                body: "Re: Proposta comercial Q2 — anexada versão revisada com desconto por volume." },
              { icon: Icons.eye, c: t.text, bg: t.bgSubtle, title: "Visualizou proposta", by: "Tracking", time: "ontem, 20:12",
                body: "3x em 30min. Páginas 2 e 5 (pricing)." },
              { icon: Icons.check, c: t.success, bg: t.successSoft, title: "Demo realizada", by: "Henrique Dias", time: "5 dias atrás",
                body: "Apresentamos módulo de analytics. Cliente demonstrou interesse em add-on enterprise." },
            ].map((e, i, a) => (
              <div key={i} style={{ display: "flex", gap: 14, paddingBottom: 18, position: "relative" }}>
                {i < a.length - 1 && (
                  <div style={{ position: "absolute", left: 17, top: 36, bottom: 0, width: 1, background: t.border }}/>
                )}
                <div style={{
                  width: 36, height: 36, borderRadius: 10, background: e.bg, color: e.c,
                  display: "grid", placeItems: "center", flexShrink: 0,
                  boxShadow: `0 0 0 4px ${t.bg}`,
                }}><Icon d={e.icon} size={16}/></div>
                <div style={{ flex: 1, paddingTop: 4 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                    <span style={{ fontSize: 13.5, fontWeight: 600 }}>{e.title}</span>
                    <span style={{ fontSize: 11, color: t.textMuted }}>· {e.by}</span>
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

Object.assign(window, { ContactDetailConservative, ContactDetailBold });
