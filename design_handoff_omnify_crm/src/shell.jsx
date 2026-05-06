// OmniFy Hub — App shell (sidebar + topbar), two variants
// Variant A: conservative (Pipedrive/Notion-style sidebar)
// Variant B: bold (personality, brand-forward)

// ====================== LOGO ======================
function OmnifyMark({ size = 20, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 2 C 6 2, 2 6, 2 12 C 2 18, 6 22, 12 22 C 16 22, 19 20, 21 17 L 17 14 C 15.8 15.8, 14 17, 12 17 C 9 17, 7 15, 7 12 C 7 9, 9 7, 12 7 C 14 7, 15.8 8.2, 17 10 L 21 7 C 19 4, 16 2, 12 2 Z"
        fill={color}/>
      <circle cx="19" cy="12" r="2.5" fill={color}/>
    </svg>
  );
}

// ====================== NAV ITEM ======================
function NavItem({ icon, label, active, badge, t, bold, onClick }) {
  const [hover, setHover] = React.useState(false);
  const isActive = active;
  const bg = isActive
    ? (bold ? t.text : t.bgSubtle)
    : (hover ? t.bgSubtle : "transparent");
  const fg = isActive
    ? (bold ? "#F4F3EF" : t.text)
    : t.textMuted;
  return (
    <div onClick={onClick} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "7px 10px", borderRadius: 8,
        background: bg, color: fg,
        fontSize: 13, fontWeight: isActive ? 600 : 500,
        cursor: "pointer", transition: "all 120ms ease",
        marginBottom: 2,
      }}>
      <Icon d={icon} size={16} />
      <span style={{ flex: 1 }}>{label}</span>
      {badge != null && (
        <span style={{
          fontSize: 10, fontWeight: 600,
          padding: "1px 6px", borderRadius: 999,
          background: isActive ? (bold ? t.boldInk : t.text) : t.border,
          color: isActive ? (bold ? "#0A0A0A" : t.bg) : t.textMuted,
        }}>{badge}</span>
      )}
    </div>
  );
}

// ====================== SIDEBAR — CONSERVATIVE ======================
function SidebarConservative({ t, active = "dashboard", onNav = () => {} }) {
  return (
    <aside style={{
      width: 224, background: t.surfaceAlt,
      borderRight: `1px solid ${t.border}`,
      display: "flex", flexDirection: "column",
      flexShrink: 0,
    }}>
      {/* Logo */}
      <div style={{ padding: "14px 14px 12px", display: "flex", alignItems: "center", gap: 9 }}>
        <div style={{
          width: 26, height: 26, borderRadius: 7,
          background: t.text, color: t.bg,
          display: "grid", placeItems: "center", flexShrink: 0,
        }}>
          <OmnifyMark size={16} color={t.bg} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: t.text, lineHeight: 1.1 }}>OmniFy</div>
          <div style={{ fontSize: 10.5, color: t.textMuted, lineHeight: 1.2 }}>Acme Inc · Free trial</div>
        </div>
        <Icon d={Icons.chevD} size={14} style={{ color: t.textMuted }} />
      </div>

      {/* Search */}
      <div style={{ padding: "0 10px 8px" }}>
        <Input t={t} placeholder="Buscar…"
          leading={<Icon d={Icons.search} size={14} />}
          trailing={<Kbd t={t}>⌘K</Kbd>}
        />
      </div>

      <div style={{ padding: "6px 10px 12px", flex: 1, overflow: "hidden" }}>
        <NavItem t={t} icon={Icons.home}    label="Dashboard"   active={active === "dashboard"} onClick={() => onNav("dashboard")}/>
        <NavItem t={t} icon={Icons.inbox}   label="Inbox"       badge="12" active={active === "inbox"} onClick={() => onNav("inbox")}/>
        <NavItem t={t} icon={Icons.users}   label="Contatos"    active={active === "contacts"} onClick={() => onNav("contacts")}/>
        <NavItem t={t} icon={Icons.building} label="Empresas"   active={active === "companies"} onClick={() => onNav("companies")}/>
        <NavItem t={t} icon={Icons.pipe}    label="Pipeline"    active={active === "pipeline"} onClick={() => onNav("pipeline")}/>
        <NavItem t={t} icon={Icons.calendar} label="Atividades" badge="4" active={active === "activities"} onClick={() => onNav("activities")}/>
        <NavItem t={t} icon={Icons.chart}   label="Relatórios"  active={active === "reports"} onClick={() => onNav("reports")}/>

        <div style={{
          fontSize: 10, fontWeight: 600, textTransform: "uppercase",
          letterSpacing: 0.6, color: t.textSubtle,
          padding: "16px 10px 6px",
        }}>IA & Automação</div>
        <NavItem t={t} icon={Icons.sparkle} label="SDR autônomo" active={active === "sdr"} onClick={() => onNav("sdr")}/>
        <NavItem t={t} icon={Icons.zap}     label="Ads"          active={active === "ads"} onClick={() => onNav("ads")}/>

        <div style={{
          fontSize: 10, fontWeight: 600, textTransform: "uppercase",
          letterSpacing: 0.6, color: t.textSubtle,
          padding: "16px 10px 6px",
        }}>Espaço</div>
        <NavItem t={t} icon={Icons.tag}     label="Segmentos"    onClick={() => {}}/>
        <NavItem t={t} icon={Icons.doc}     label="Documentos"   onClick={() => {}}/>
        <NavItem t={t} icon={Icons.settings} label="Configurações" onClick={() => {}}/>
      </div>

      {/* User */}
      <div style={{ padding: 10, borderTop: `1px solid ${t.border}`, display: "flex", alignItems: "center", gap: 10 }}>
        <Avatar t={t} name="Marina Okano" size={28} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: t.text, lineHeight: 1.1 }}>Marina Okano</div>
          <div style={{ fontSize: 10.5, color: t.textMuted }}>Head of Sales</div>
        </div>
        <Icon d={Icons.dotsV} size={14} style={{ color: t.textMuted }} />
      </div>
    </aside>
  );
}

// ====================== SIDEBAR — BOLD ======================
function SidebarBold({ t, active = "dashboard", onNav = () => {} }) {
  return (
    <aside style={{
      width: 232, background: t.bold,
      display: "flex", flexDirection: "column",
      flexShrink: 0, color: "#F4F3EF",
    }}>
      {/* Logo */}
      <div style={{ padding: "16px 16px 14px", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 10,
          background: t.boldInk, color: "#0A0A0A",
          display: "grid", placeItems: "center", flexShrink: 0,
        }}>
          <OmnifyMark size={20} color="#0A0A0A" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#F4F3EF", lineHeight: 1.1, letterSpacing: -0.3 }}>
            OmniFy<span style={{ color: t.boldInk }}>.</span>
          </div>
          <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.55)", lineHeight: 1.2 }}>hub ·  v1.2</div>
        </div>
      </div>

      {/* Workspace switcher */}
      <div style={{ padding: "0 12px 10px" }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "8px 10px", borderRadius: 10,
          background: "rgba(255,255,255,0.06)",
          cursor: "pointer",
        }}>
          <div style={{ width: 18, height: 18, borderRadius: 5, background: t.boldInk, display: "grid", placeItems: "center", color: "#0A0A0A", fontWeight: 700, fontSize: 10 }}>A</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11.5, fontWeight: 600, color: "#F4F3EF" }}>Acme Inc</div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)" }}>Plano Growth</div>
          </div>
          <Icon d={Icons.chevD} size={12} style={{ color: "rgba(255,255,255,0.5)" }} />
        </div>
      </div>

      <div style={{ padding: "0 12px 12px", flex: 1 }}>
        {[
          { k: "dashboard",  label: "Dashboard",   icon: Icons.home },
          { k: "inbox",      label: "Inbox",       icon: Icons.inbox, badge: 12 },
          { k: "contacts",   label: "Contatos",    icon: Icons.users },
          { k: "companies",  label: "Empresas",    icon: Icons.building },
          { k: "pipeline",   label: "Pipeline",    icon: Icons.pipe },
          { k: "activities", label: "Atividades",  icon: Icons.calendar, badge: 4 },
          { k: "reports",    label: "Relatórios",  icon: Icons.chart },
        ].map(item => (
          <BoldNavItem key={item.k} t={t} {...item} active={active === item.k} onClick={() => onNav(item.k)} />
        ))}

        <div style={{
          fontSize: 10, fontWeight: 700, textTransform: "uppercase",
          letterSpacing: 1.2, color: "rgba(255,255,255,0.4)",
          padding: "18px 10px 8px",
        }}>Automação</div>

        {[
          { k: "sdr",  label: "SDR autônomo", icon: Icons.sparkle },
          { k: "ads",  label: "Ads",          icon: Icons.zap },
          { k: "leads", label: "Leads",       icon: Icons.arrowUR },
        ].map(item => (
          <BoldNavItem key={item.k} t={t} {...item} active={active === item.k} onClick={() => onNav(item.k)} />
        ))}

        <div style={{
          fontSize: 10, fontWeight: 700, textTransform: "uppercase",
          letterSpacing: 1.2, color: "rgba(255,255,255,0.4)",
          padding: "18px 10px 8px",
        }}>Espaço</div>
        {[
          { k: "segments", label: "Segmentos",   icon: Icons.tag },
          { k: "settings", label: "Configurações", icon: Icons.settings },
        ].map(item => (
          <BoldNavItem key={item.k} t={t} {...item} active={active === item.k} onClick={() => onNav(item.k)} />
        ))}
      </div>

      {/* Progress card */}
      <div style={{ padding: 12 }}>
        <div style={{
          background: "rgba(255,255,255,0.05)",
          borderRadius: 12, padding: 12,
          border: `1px solid rgba(255,255,255,0.08)`,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.7)" }}>Meta do trimestre</div>
            <div style={{ fontSize: 11, fontWeight: 600, color: t.boldInk }}>67%</div>
          </div>
          <div style={{ height: 4, background: "rgba(255,255,255,0.1)", borderRadius: 999, overflow: "hidden" }}>
            <div style={{ width: "67%", height: "100%", background: t.boldInk, borderRadius: 999 }} />
          </div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", marginTop: 8 }}>R$ 1,34M de R$ 2M</div>
        </div>
      </div>

      {/* User */}
      <div style={{
        padding: 12,
        borderTop: `1px solid rgba(255,255,255,0.08)`,
        display: "flex", alignItems: "center", gap: 10,
      }}>
        <Avatar t={t} name="Marina Okano" size={30} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: "#F4F3EF", lineHeight: 1.1 }}>Marina Okano</div>
          <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.55)" }}>Head of Sales</div>
        </div>
        <div style={{ color: "rgba(255,255,255,0.5)", cursor: "pointer" }}>
          <Icon d={Icons.dotsV} size={14} />
        </div>
      </div>
    </aside>
  );
}

function BoldNavItem({ icon, label, active, badge, t, onClick }) {
  const [hover, setHover] = React.useState(false);
  const bg = active ? t.boldInk : (hover ? "rgba(255,255,255,0.06)" : "transparent");
  const fg = active ? "#0A0A0A" : (hover ? t.bg : "rgba(255,255,255,0.7)");
  return (
    <div onClick={onClick} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "8px 10px", borderRadius: 9,
        background: bg, color: fg,
        fontSize: 13, fontWeight: active ? 600 : 500,
        cursor: "pointer", transition: "all 120ms ease",
        marginBottom: 2,
      }}>
      <Icon d={icon} size={16} />
      <span style={{ flex: 1 }}>{label}</span>
      {badge != null && (
        <span style={{
          fontSize: 10, fontWeight: 700,
          padding: "1px 6px", borderRadius: 999,
          background: active ? "#0A0A0A" : "rgba(255,255,255,0.1)",
          color: active ? t.boldInk : "rgba(255,255,255,0.8)",
        }}>{badge}</span>
      )}
    </div>
  );
}

// ====================== TOPBAR ======================
function TopbarConservative({ t, title, breadcrumbs, right, tabs, activeTab, onTab, theme, onToggleTheme }) {
  return (
    <header style={{
      background: t.surface,
      borderBottom: `1px solid ${t.border}`,
      flexShrink: 0,
    }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "10px 20px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          {breadcrumbs ? (
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: t.textMuted }}>
              {breadcrumbs.map((b, i) => (
                <React.Fragment key={i}>
                  <span style={{ color: i === breadcrumbs.length - 1 ? t.text : t.textMuted, fontWeight: i === breadcrumbs.length - 1 ? 600 : 500 }}>{b}</span>
                  {i < breadcrumbs.length - 1 && <Icon d={Icons.chevR} size={12} style={{ color: t.textSubtle }}/>}
                </React.Fragment>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: 15, fontWeight: 600, color: t.text }}>{title}</div>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Button t={t} variant="ghost" size="sm"
            onClick={onToggleTheme}
            leading={<Icon d={theme === "dark" ? Icons.sun : Icons.moon} size={14} />}>
            {theme === "dark" ? "Claro" : "Escuro"}
          </Button>
          <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
            <Icon d={Icons.bell} size={16} style={{ color: t.textMuted, cursor: "pointer" }} />
            <span style={{
              position: "absolute", top: -2, right: -2,
              width: 7, height: 7, borderRadius: 999, background: t.danger,
              boxShadow: `0 0 0 2px ${t.surface}`,
            }} />
          </div>
          {right}
        </div>
      </div>

      {tabs && (
        <div style={{
          display: "flex", gap: 2, padding: "0 20px",
          borderTop: `1px solid ${t.border}`,
        }}>
          {tabs.map(tab => (
            <div key={tab} onClick={() => onTab?.(tab)}
              style={{
                padding: "10px 12px",
                fontSize: 12.5, fontWeight: activeTab === tab ? 600 : 500,
                color: activeTab === tab ? t.text : t.textMuted,
                borderBottom: `2px solid ${activeTab === tab ? t.text : "transparent"}`,
                marginBottom: -1, cursor: "pointer",
              }}>{tab}</div>
          ))}
        </div>
      )}
    </header>
  );
}

Object.assign(window, {
  OmnifyMark, NavItem, SidebarConservative, SidebarBold, TopbarConservative,
});
