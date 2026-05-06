// Shared small UI pieces used across all OmniFy mockups.
// All accept a `t` (tokens) object to theme against.

// ---------- ICONS (heroicons-ish, all 1.5px stroke) ----------
const Icon = ({ d, size = 16, stroke = "currentColor", fill = "none", strokeWidth = 1.75, style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={stroke}
       strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={style}>
    {typeof d === "string" ? <path d={d} /> : d}
  </svg>
);

const Icons = {
  search:  <><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></>,
  plus:    "M12 5v14M5 12h14",
  chevR:   "m9 6 6 6-6 6",
  chevD:   "m6 9 6 6 6-6",
  chevUp:  "m18 15-6-6-6 6",
  chevL:   "m15 6-6 6 6 6",
  dots:    <><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></>,
  dotsV:   <><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></>,
  home:    "m3 11 9-8 9 8v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1V11Z",
  users:   <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>,
  user:    <><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>,
  pipe:    <><rect x="3" y="4" width="4" height="16" rx="1"/><rect x="10" y="4" width="4" height="10" rx="1"/><rect x="17" y="4" width="4" height="13" rx="1"/></>,
  kanban:  <><rect x="3" y="4" width="5" height="16" rx="1"/><rect x="10" y="4" width="5" height="10" rx="1"/><rect x="17" y="4" width="4" height="13" rx="1"/></>,
  inbox:   <><path d="M3 13h4l2 3h6l2-3h4"/><path d="M5 5h14l2 8v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-6l2-8Z"/></>,
  calendar:<><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/></>,
  chart:   <><path d="M3 3v18h18"/><path d="m7 15 4-4 3 3 5-6"/></>,
  settings:<><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/></>,
  bell:    <><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10 21a2 2 0 0 0 4 0"/></>,
  mail:    <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></>,
  phone:   "M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92Z",
  filter:  "M22 3H2l8 9.46V19l4 2v-8.54L22 3z",
  download:<><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/></>,
  arrowUp: "m18 15-6-6-6 6",
  arrowDn: "m6 9 6 6 6-6",
  arrowUR: "M7 17 17 7M7 7h10v10",
  trend:   <><path d="M3 17 9 11l4 4 8-8"/><path d="M14 7h7v7"/></>,
  check:   "m5 12 5 5L20 7",
  x:       "M6 6l12 12M18 6 6 18",
  star:    "m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1L12 2Z",
  building:<><path d="M3 21h18"/><path d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16"/><path d="M9 9h.01M15 9h.01M9 13h.01M15 13h.01M9 17h.01M15 17h.01"/></>,
  tag:     <><path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L2 12V2h10l8.6 8.6a2 2 0 0 1 0 2.8Z"/><circle cx="7" cy="7" r="1.2"/></>,
  clock:   <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
  dollar:  <><path d="M12 1v22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></>,
  flame:   "M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.15 .24-4.77 2.5-5.5-.9 4 2.5 5.5 2.5 8.5a6 6 0 1 1-12 0c0-1.77.78-3.34 2-4.5 0 2.5 1.5 3.5 3.5 3.5Z",
  zap:     "M13 2 3 14h8l-1 8 10-12h-8l1-8z",
  doc:     <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></>,
  edit:    <><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5Z"/></>,
  link:    <><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7L12 19"/></>,
  globe:   <><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></>,
  sparkle: "M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8",
  eye:     <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></>,
  sun:     <><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></>,
  moon:    "M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z",
  sort:    <><path d="M3 6h18M6 12h12M10 18h4"/></>,
  logout:  <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5M21 12H9"/></>,
};

// ---------- AVATAR ----------
function Avatar({ name = "U N", size = 28, src, color, t }) {
  const initials = name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
  const bgs = ["#F5B8A8","#F2D59A","#B8E3C6","#A8C8F0","#C9B5E8","#F0B8CF","#B8E0E0","#E0CFA8"];
  const bg = color || bgs[name.charCodeAt(0) % bgs.length];
  return (
    <div style={{
      width: size, height: size, borderRadius: size,
      background: src ? `center/cover url(${src})` : bg,
      color: "#14110F", display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.38, fontWeight: 600, flexShrink: 0,
      boxShadow: t ? `inset 0 0 0 1px ${t.border}` : "none",
    }}>
      {!src && initials}
    </div>
  );
}

// ---------- BADGE / PILL ----------
function Pill({ children, color = "neutral", t, style }) {
  const colors = {
    neutral: { bg: t.bgSubtle, fg: t.textMuted, bd: t.border },
    success: { bg: t.successSoft, fg: t.success, bd: "transparent" },
    warn:    { bg: t.warnSoft, fg: t.warn, bd: "transparent" },
    danger:  { bg: t.dangerSoft, fg: t.danger, bd: "transparent" },
    primary: { bg: t.primarySoft, fg: t.primary, bd: "transparent" },
  }[color] || { bg: t.bgSubtle, fg: t.textMuted, bd: t.border };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: "2px 8px", borderRadius: 999,
      fontSize: 11, fontWeight: 500, lineHeight: "18px",
      background: colors.bg, color: colors.fg,
      boxShadow: `inset 0 0 0 1px ${colors.bd}`,
      ...style,
    }}>{children}</span>
  );
}

// ---------- BUTTON ----------
function Button({ children, variant = "secondary", size = "md", t, leading, trailing, onClick, style, bold }) {
  const [hover, setHover] = React.useState(false);
  const pad = size === "sm" ? "6px 10px" : size === "lg" ? "10px 16px" : "7px 12px";
  const fs  = size === "sm" ? 12 : size === "lg" ? 14 : 13;
  const variants = {
    primary: {
      bg: hover ? t.text : t.text,
      fg: t.bg,
      bd: t.text,
      filter: hover ? "brightness(1.2)" : "none",
    },
    secondary: {
      bg: hover ? t.bgSubtle : t.surface,
      fg: t.text,
      bd: t.border,
    },
    ghost: {
      bg: hover ? t.bgSubtle : "transparent",
      fg: t.text,
      bd: "transparent",
    },
    bold: {
      bg: hover ? t.boldInk : t.boldInk,
      fg: "#0A0A0A",
      bd: t.boldInk,
      filter: hover ? "brightness(1.05)" : "none",
    },
  };
  const v = variants[variant] || variants.secondary;
  return (
    <button onClick={onClick}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        padding: pad, fontSize: fs, fontWeight: bold ? 600 : 500,
        background: v.bg, color: v.fg,
        boxShadow: `inset 0 0 0 1px ${v.bd}`,
        borderRadius: 8, border: "none", cursor: "pointer",
        transition: "all 120ms ease", filter: v.filter,
        fontFamily: "inherit",
        ...style,
      }}>
      {leading}
      {children}
      {trailing}
    </button>
  );
}

// ---------- CARD ----------
function Card({ children, t, style, pad = 16, elevated, interactive }) {
  const [hover, setHover] = React.useState(false);
  return (
    <div
      onMouseEnter={() => interactive && setHover(true)}
      onMouseLeave={() => interactive && setHover(false)}
      style={{
        background: t.surface,
        boxShadow: elevated ? t.shadowLg : (hover ? t.shadow : "none"),
        border: `1px solid ${hover && interactive ? t.borderStrong : t.border}`,
        borderRadius: 12,
        padding: pad,
        transition: "all 140ms ease",
        cursor: interactive ? "pointer" : "default",
        ...style,
      }}>
      {children}
    </div>
  );
}

// ---------- INPUT ----------
function Input({ placeholder, leading, trailing, t, value, onChange, style }) {
  const [focus, setFocus] = React.useState(false);
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8,
      padding: "7px 10px", borderRadius: 8,
      background: t.surfaceAlt,
      boxShadow: `inset 0 0 0 1px ${focus ? t.text : t.border}`,
      transition: "all 120ms ease",
      ...style,
    }}>
      {leading && <span style={{ color: t.textMuted, display: "flex" }}>{leading}</span>}
      <input
        value={value}
        onChange={onChange}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        placeholder={placeholder}
        style={{
          flex: 1, border: "none", outline: "none", background: "transparent",
          color: t.text, fontSize: 13, fontFamily: "inherit",
          minWidth: 0,
        }} />
      {trailing && <span style={{ color: t.textMuted }}>{trailing}</span>}
    </div>
  );
}

// ---------- KEYBOARD KEY ----------
function Kbd({ children, t }) {
  return <span style={{
    padding: "1px 5px", borderRadius: 4, fontSize: 10,
    background: t.bgSubtle, color: t.textMuted,
    boxShadow: `inset 0 0 0 1px ${t.border}`,
    fontFamily: OMNIFY_FONTS.mono,
  }}>{children}</span>;
}

// ---------- TINY SPARKLINE (SVG) ----------
function Spark({ data = [], width = 80, height = 22, color = "#2D5BFF", fill }) {
  if (!data.length) return null;
  const max = Math.max(...data), min = Math.min(...data);
  const rng = max - min || 1;
  const pts = data.map((v, i) => [
    (i / (data.length - 1)) * width,
    height - ((v - min) / rng) * height,
  ]);
  const path = pts.map(([x, y], i) => (i ? `L${x},${y}` : `M${x},${y}`)).join(" ");
  const areaPath = `${path} L${width},${height} L0,${height} Z`;
  return (
    <svg width={width} height={height} style={{ display: "block" }}>
      {fill && <path d={areaPath} fill={fill} />}
      <path d={path} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ---------- PROGRESS ----------
function Bar({ value = 0, color, t, height = 4 }) {
  return (
    <div style={{ background: t.bgSubtle, borderRadius: 999, height, overflow: "hidden" }}>
      <div style={{ width: `${value}%`, height: "100%", background: color || t.text, borderRadius: 999, transition: "width 220ms ease" }} />
    </div>
  );
}

Object.assign(window, { Icon, Icons, Avatar, Pill, Button, Card, Input, Kbd, Spark, Bar });
