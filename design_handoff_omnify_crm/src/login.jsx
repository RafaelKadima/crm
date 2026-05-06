// ================================================================
//                         LOGIN SCREEN
// ================================================================
function LoginScreen({ t, onLogin }) {
  const [email, setEmail] = React.useState("marina@acme.com");
  const [password, setPassword] = React.useState("");
  const [showPass, setShowPass] = React.useState(false);
  const [remember, setRemember] = React.useState(true);
  const [loading, setLoading] = React.useState(false);

  const submit = (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    setTimeout(() => { setLoading(false); onLogin && onLogin(); }, 650);
  };

  const bold = "#0A0A0C";
  const neon = "#DCFF00";
  const ink  = "#F4F3EF";
  const mute = "rgba(244,243,239,0.55)";

  const inputBase = {
    width: "100%",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.14)",
    borderRadius: 10,
    padding: "14px 16px",
    color: ink,
    fontSize: 14,
    fontFamily: "inherit",
    outline: "none",
    transition: "border-color 0.15s, background 0.15s",
  };

  return (
    <div style={{
      height: "100%", width: "100%",
      display: "grid", gridTemplateColumns: "1.1fr 1fr",
      fontFamily: OMNIFY_FONTS.sans,
      background: bold, color: ink,
    }}>

      {/* ============ LEFT: Brand panel ============ */}
      <div style={{
        position: "relative",
        background: bold,
        padding: "48px 56px",
        display: "flex", flexDirection: "column", justifyContent: "space-between",
        overflow: "hidden",
      }}>
        {/* Decorative grid lines */}
        <div style={{
          position: "absolute", inset: 0, opacity: 0.5,
          backgroundImage: `linear-gradient(rgba(220,255,0,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(220,255,0,0.04) 1px, transparent 1px)`,
          backgroundSize: "56px 56px",
          pointerEvents: "none",
        }}/>
        {/* Glow blob */}
        <div style={{
          position: "absolute", width: 520, height: 520, right: -180, top: -120,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${neon}22 0%, transparent 60%)`,
          pointerEvents: "none",
        }}/>

        {/* Logo */}
        <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 9,
            background: neon, color: bold,
            display: "grid", placeItems: "center",
            fontFamily: OMNIFY_FONTS.display, fontWeight: 600, fontSize: 20, letterSpacing: -0.5,
          }}>O</div>
          <div style={{ fontFamily: OMNIFY_FONTS.display, fontSize: 22, fontWeight: 500, letterSpacing: -0.5 }}>
            OmniFy<span style={{ color: neon }}>.</span>
          </div>
        </div>

        {/* Hero copy */}
        <div style={{ position: "relative", maxWidth: 460 }}>
          <div style={{
            fontSize: 10.5, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase",
            color: neon, marginBottom: 20,
            display: "inline-flex", alignItems: "center", gap: 8,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: neon, boxShadow: `0 0 12px ${neon}` }}/>
            CRM com IA nativa
          </div>
          <h1 style={{
            margin: 0, fontFamily: OMNIFY_FONTS.display, fontWeight: 400,
            fontSize: 64, lineHeight: 1.02, letterSpacing: -2,
          }}>
            O comercial<br/>
            <em style={{ fontStyle: "italic", color: neon }}>roda sozinho</em>.<br/>
            Você decide.
          </h1>
          <p style={{
            marginTop: 20, fontSize: 15, lineHeight: 1.55, color: mute, maxWidth: 420,
          }}>
            Pipeline, SDR autônomo, ads e atendimento — num lugar só.
            A IA prioriza, escreve, agenda. Seu time fecha.
          </p>
        </div>

        {/* Footer stats */}
        <div style={{ position: "relative", display: "flex", gap: 36 }}>
          {[
            { k: "R$ 847K", v: "MRR gerado por clientes Acme" },
            { k: "2.3×",    v: "mais reuniões marcadas" },
            { k: "14h",     v: "economizadas por SDR/semana" },
          ].map((s, i) => (
            <div key={i}>
              <div style={{ fontFamily: OMNIFY_FONTS.display, fontSize: 28, fontWeight: 500, letterSpacing: -1, color: ink }}>{s.k}</div>
              <div style={{ fontSize: 11, color: mute, marginTop: 4, maxWidth: 130, lineHeight: 1.4 }}>{s.v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ============ RIGHT: Form panel ============ */}
      <div style={{
        background: "#F4F3EF",
        color: "#14110F",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "48px 56px",
        position: "relative",
      }}>
        <div style={{ width: "100%", maxWidth: 380 }}>

          {/* Header */}
          <div style={{ marginBottom: 32 }}>
            <div style={{
              fontSize: 10.5, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase",
              color: "#6B6660", marginBottom: 10,
            }}>Bem-vinda de volta</div>
            <h2 style={{
              margin: 0, fontFamily: OMNIFY_FONTS.display, fontWeight: 400,
              fontSize: 42, lineHeight: 1.05, letterSpacing: -1.2, color: "#14110F",
            }}>
              Entre na sua <em style={{ fontStyle: "italic" }}>conta</em>
            </h2>
          </div>

          {/* SSO buttons */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 18 }}>
            <button style={ssoBtn}>
              <svg width="16" height="16" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.9z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.6 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.3-2.2 4.3-4.1 5.7l6.2 5.2c-.4.4 6.6-4.8 6.6-14.9 0-1.3-.1-2.6-.4-3.9z"/></svg>
              Google
            </button>
            <button style={ssoBtn}>
              <svg width="14" height="16" viewBox="0 0 24 24" fill="#14110F"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
              Apple
            </button>
          </div>

          <div style={{
            display: "flex", alignItems: "center", gap: 12, marginBottom: 18,
            fontSize: 11, color: "#97928B", fontWeight: 600, letterSpacing: 1, textTransform: "uppercase",
          }}>
            <div style={{ flex: 1, height: 1, background: "#D3D0C9" }}/>
            ou com e-mail
            <div style={{ flex: 1, height: 1, background: "#D3D0C9" }}/>
          </div>

          {/* Form */}
          <form onSubmit={submit}>
            <label style={labelSt}>E-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@empresa.com"
              style={lightInput}
              autoComplete="email"
            />

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 14 }}>
              <label style={{ ...labelSt, marginBottom: 0 }}>Senha</label>
              <a href="#" onClick={(e) => e.preventDefault()} style={{
                fontSize: 11.5, color: "#14110F", textDecoration: "underline", textUnderlineOffset: 3, fontWeight: 500,
              }}>Esqueci a senha</a>
            </div>
            <div style={{ position: "relative" }}>
              <input
                type={showPass ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{ ...lightInput, paddingRight: 70 }}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPass(s => !s)}
                style={{
                  position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                  background: "transparent", border: "none", cursor: "pointer",
                  fontSize: 11, fontWeight: 600, color: "#6B6660",
                  padding: "4px 8px", borderRadius: 6,
                  letterSpacing: 0.5, textTransform: "uppercase", fontFamily: "inherit",
                }}
              >{showPass ? "Ocultar" : "Mostrar"}</button>
            </div>

            <label style={{
              display: "flex", alignItems: "center", gap: 9, marginTop: 16, cursor: "pointer",
              fontSize: 12.5, color: "#6B6660",
            }}>
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                style={{ accentColor: bold, width: 15, height: 15, cursor: "pointer" }}
              />
              Manter conectado neste dispositivo
            </label>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%", marginTop: 22,
                padding: "15px 18px",
                background: bold, color: neon,
                border: "none", borderRadius: 10,
                fontSize: 14, fontWeight: 600, letterSpacing: 0.3,
                cursor: loading ? "wait" : "pointer",
                fontFamily: "inherit",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                opacity: loading ? 0.7 : 1,
                transition: "transform 0.1s",
              }}
              onMouseDown={(e) => e.currentTarget.style.transform = "scale(0.99)"}
              onMouseUp={(e) => e.currentTarget.style.transform = "scale(1)"}
              onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
            >
              {loading ? "Entrando…" : (<>
                Entrar
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={neon} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
              </>)}
            </button>
          </form>

          {/* Signup */}
          <div style={{
            marginTop: 26, paddingTop: 22, borderTop: "1px solid #D3D0C9",
            fontSize: 13, color: "#6B6660", textAlign: "center",
          }}>
            Ainda não tem conta?{" "}
            <a href="#" onClick={(e) => e.preventDefault()} style={{
              color: "#14110F", fontWeight: 600, textDecoration: "underline", textUnderlineOffset: 3,
            }}>Começar teste grátis</a>
          </div>

          {/* Footer */}
          <div style={{
            position: "absolute", bottom: 24, left: 0, right: 0,
            display: "flex", justifyContent: "space-between", padding: "0 56px",
            fontSize: 10.5, color: "#97928B", letterSpacing: 0.3,
          }}>
            <div>© 2026 OmniFy Technologies</div>
            <div style={{ display: "flex", gap: 16 }}>
              <a href="#" onClick={(e) => e.preventDefault()} style={{ color: "inherit", textDecoration: "none" }}>Privacidade</a>
              <a href="#" onClick={(e) => e.preventDefault()} style={{ color: "inherit", textDecoration: "none" }}>Termos</a>
              <a href="#" onClick={(e) => e.preventDefault()} style={{ color: "inherit", textDecoration: "none" }}>Suporte</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Styles for login form
const labelSt = {
  display: "block",
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: 1.2,
  textTransform: "uppercase",
  color: "#6B6660",
  marginBottom: 7,
};

const lightInput = {
  width: "100%",
  background: "#FFFFFF",
  border: "1px solid #D3D0C9",
  borderRadius: 10,
  padding: "14px 16px",
  color: "#14110F",
  fontSize: 14,
  fontFamily: "inherit",
  outline: "none",
  transition: "border-color 0.15s, box-shadow 0.15s",
};

const ssoBtn = {
  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
  padding: "11px 12px",
  background: "#FFFFFF",
  border: "1px solid #D3D0C9",
  borderRadius: 10,
  fontSize: 13, fontWeight: 600, color: "#14110F",
  cursor: "pointer",
  fontFamily: "inherit",
  transition: "background 0.15s",
};

window.LoginScreen = LoginScreen;
