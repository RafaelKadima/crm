// OmniFy Hub — Telas secundárias (Inbox, Empresas, Atividades, Relatórios, SDR, Ads, Segmentos, Deal Detail)

// ================================================================
//                         INBOX
// ================================================================
const INBOX_THREADS = [
  { id: 1, from: "Rafael Lima",    company: "Prime Logística",   channel: "email",    subject: "Re: Proposta atualizada",       preview: "Oi Marina, dei uma olhada na proposta e tenho algumas perguntas sobre…", time: "2min", unread: true,  pinned: true, ai: "Quer agendar call hoje às 16h." },
  { id: 2, from: "Renata Okuda",   company: "Nova Têxtil",       channel: "whatsapp", subject: "Confirmação de reunião",        preview: "Perfeito, confirmado para amanhã às 10h. Mando o link pelo Meet.", time: "18min", unread: true,  pinned: false, ai: null },
  { id: 3, from: "Bruno Campos",   company: "Vertex Indústria",  channel: "email",    subject: "Documentação técnica",           preview: "Segue em anexo os 3 PDFs que combinamos. Aguardo retorno do time técnico…", time: "1h", unread: true,  pinned: false, ai: "Tem PDF anexado. Lembrar de encaminhar pro Henrique." },
  { id: 4, from: "Paula Rocha",    company: "Estúdio Mar",       channel: "email",    subject: "Dúvida sobre integração",       preview: "A gente conseguiria ver como fica a integração com o Shopify?", time: "3h", unread: false, pinned: false, ai: null },
  { id: 5, from: "Júlia Mendes",   company: "Grupo Norte",       channel: "linkedin", subject: "Obrigada pelo material!",       preview: "Marina, muito obrigada! Vou ler com calma e volto essa semana.", time: "5h", unread: false, pinned: false, ai: null },
  { id: 6, from: "SDR autônomo",   company: "Sistema",            channel: "ai",       subject: "12 leads qualificados esta manhã", preview: "Qualifiquei 12 leads (6 hot, 4 warm, 2 cold). Veja resumo.", time: "6h", unread: false, pinned: false, ai: null },
  { id: 7, from: "Lucas Pereira",  company: "Helio Energia",     channel: "whatsapp", subject: "Agenda semana que vem",          preview: "Quarta 14h funciona pra você?", time: "1d", unread: false, pinned: false, ai: null },
  { id: 8, from: "Diego Ferreira", company: "Sato Engenharia",   channel: "email",    subject: "Contrato revisado",              preview: "Jurídico aprovou com pequenos ajustes. Anexo a nova versão…", time: "2d", unread: false, pinned: false, ai: null },
];

const CHANNEL_META = {
  email:    { icon: Icons.mail,    c: "#6B6660" },
  whatsapp: { icon: Icons.phone,   c: "#25D366" },
  linkedin: { icon: Icons.users,   c: "#0A66C2" },
  ai:       { icon: Icons.sparkle, c: "#DCFF00" },
};

function InboxScreen({ t, theme, onToggleTheme, onNav }) {
  const [active, setActive] = React.useState(INBOX_THREADS[0]);
  const [folder, setFolder] = React.useState("inbox");
  return (
    <div style={{ display: "flex", height: "100%", background: t.bg, color: t.text, fontFamily: OMNIFY_FONTS.sans, fontSize: 13 }}>
      <SidebarBold t={t} active="inbox" onNav={onNav}/>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <header style={{ padding: "18px 28px 14px", background: t.bg, borderBottom: `1px solid ${t.border}`, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 10.5, color: t.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Omnichannel · unificado</div>
            <h1 style={{ margin: 0, fontSize: 30, fontWeight: 500, letterSpacing: -0.8, fontFamily: OMNIFY_FONTS.display, display: "flex", alignItems: "baseline", gap: 12 }}>
              Inbox
              <span style={{ fontFamily: OMNIFY_FONTS.sans, fontSize: 13, fontWeight: 500, color: t.textMuted }}>12 não lidas · 3 urgentes</span>
            </h1>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Button t={t} variant="ghost" size="sm" onClick={onToggleTheme} leading={<Icon d={theme === "dark" ? Icons.sun : Icons.moon} size={14}/>}>{theme === "dark" ? "Claro" : "Escuro"}</Button>
            <Button t={t} variant="secondary" size="sm" leading={<Icon d={Icons.sparkle} size={13}/>}>IA redigir</Button>
            <Button t={t} variant="bold" bold size="sm" leading={<Icon d={Icons.plus} size={14}/>}>Nova mensagem</Button>
          </div>
        </header>

        <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
          {/* Folders */}
          <nav style={{ width: 180, padding: "16px 10px", borderRight: `1px solid ${t.border}`, flexShrink: 0 }}>
            {[
              { k: "inbox",     label: "Inbox",    n: 12, icon: Icons.inbox },
              { k: "starred",   label: "Favoritos", n: 4, icon: Icons.star },
              { k: "scheduled", label: "Agendados", n: 2, icon: Icons.clock },
              { k: "sent",      label: "Enviados",  n: 0, icon: Icons.mail },
              { k: "archive",   label: "Arquivo",   n: 0, icon: Icons.doc },
            ].map(f => (
              <div key={f.k} onClick={() => setFolder(f.k)} style={{
                display: "flex", alignItems: "center", gap: 9, padding: "7px 10px", borderRadius: 7,
                background: folder === f.k ? t.bgSubtle : "transparent",
                fontSize: 12.5, fontWeight: folder === f.k ? 600 : 500,
                color: folder === f.k ? t.text : t.textMuted, cursor: "pointer", marginBottom: 2,
              }}>
                <Icon d={f.icon} size={14}/>
                <span style={{ flex: 1 }}>{f.label}</span>
                {f.n > 0 && <span style={{ fontSize: 10, fontWeight: 700, color: t.textSubtle }}>{f.n}</span>}
              </div>
            ))}

            <div style={{ fontSize: 10, fontWeight: 700, color: t.textSubtle, textTransform: "uppercase", letterSpacing: 1, padding: "16px 10px 6px" }}>Canais</div>
            {[
              { k: "Email",    c: "#6B6660" },
              { k: "WhatsApp", c: "#25D366" },
              { k: "LinkedIn", c: "#0A66C2" },
              { k: "Chat site", c: "#2D5BFF" },
            ].map(c => (
              <div key={c.k} style={{ display: "flex", alignItems: "center", gap: 9, padding: "6px 10px", borderRadius: 7, fontSize: 12, color: t.textMuted, cursor: "pointer" }}>
                <span style={{ width: 7, height: 7, borderRadius: 999, background: c.c }}/>
                {c.k}
              </div>
            ))}
          </nav>

          {/* Thread list */}
          <div style={{ width: 340, borderRight: `1px solid ${t.border}`, overflow: "auto", flexShrink: 0 }}>
            <div style={{ padding: "10px 14px", borderBottom: `1px solid ${t.border}`, background: t.bgSubtle, display: "flex", gap: 6, alignItems: "center" }}>
              <Input t={t} placeholder="Buscar…" leading={<Icon d={Icons.search} size={13}/>} style={{ flex: 1 }}/>
            </div>
            {INBOX_THREADS.map(th => {
              const chn = CHANNEL_META[th.channel];
              const isActive = active.id === th.id;
              return (
                <div key={th.id} onClick={() => setActive(th)} style={{
                  padding: "14px 16px", borderBottom: `1px solid ${t.border}`,
                  background: isActive ? t.bgSubtle : th.unread ? t.bg : "transparent",
                  borderLeft: isActive ? `3px solid ${t.bold}` : "3px solid transparent",
                  cursor: "pointer",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                    <Avatar t={t} name={th.from} size={30}/>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ fontSize: 13, fontWeight: th.unread ? 700 : 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{th.from}</div>
                        <div style={{ fontSize: 10.5, color: t.textMuted, flexShrink: 0, marginLeft: 8 }}>{th.time}</div>
                      </div>
                      <div style={{ fontSize: 10.5, color: t.textSubtle, display: "flex", alignItems: "center", gap: 5 }}>
                        <Icon d={chn.icon} size={10}/> {th.company}
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize: 12.5, fontWeight: th.unread ? 600 : 500, marginBottom: 3, color: t.text }}>{th.subject}</div>
                  <div style={{ fontSize: 11.5, color: t.textMuted, lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{th.preview}</div>
                  {th.ai && (
                    <div style={{ marginTop: 8, padding: "5px 8px", background: t.bold, color: t.boldInk, borderRadius: 6, fontSize: 10.5, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 5 }}>
                      <Icon d={Icons.sparkle} size={10}/> {th.ai}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Thread view */}
          <div style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "20px 28px 14px", borderBottom: `1px solid ${t.border}`, background: t.bg }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, letterSpacing: -0.3, fontFamily: OMNIFY_FONTS.display }}>{active.subject}</h2>
                  <div style={{ fontSize: 12, color: t.textMuted, marginTop: 4 }}>{active.from} · {active.company} · há {active.time}</div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <Button t={t} variant="secondary" size="sm" leading={<Icon d={Icons.star} size={13}/>}>Favoritar</Button>
                  <Button t={t} variant="secondary" size="sm" leading={<Icon d={Icons.arrowUR} size={13}/>}>Criar deal</Button>
                </div>
              </div>
            </div>

            <div style={{ flex: 1, padding: "24px 28px", overflow: "auto" }}>
              {/* AI suggestion card */}
              <div style={{ background: t.bold, color: "#F4F3EF", borderRadius: 14, padding: 16, marginBottom: 20, display: "flex", gap: 12 }}>
                <div style={{ width: 30, height: 30, borderRadius: 9, background: t.boldInk, color: "#0A0A0A", display: "grid", placeItems: "center", flexShrink: 0 }}>
                  <Icon d={Icons.sparkle} size={15}/>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.6)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 3 }}>SDR autônomo · resumo</div>
                  <div style={{ fontSize: 13, lineHeight: 1.55 }}>{active.ai || "Cliente pediu proposta atualizada com 3 itens: preço para 50 usuários, SLA enterprise, e integração com SAP. Posso redigir resposta?"}</div>
                  <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
                    <Button t={t} variant="bold" size="sm" bold>Redigir resposta</Button>
                    <Button t={t} variant="ghost" size="sm" style={{ color: "#F4F3EF" }}>Ver contexto completo</Button>
                  </div>
                </div>
              </div>

              {/* Message body */}
              <div style={{ padding: 20, background: t.surface, borderRadius: 12, border: `1px solid ${t.border}`, marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, paddingBottom: 14, borderBottom: `1px solid ${t.border}` }}>
                  <Avatar t={t} name={active.from} size={36}/>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{active.from}</div>
                    <div style={{ fontSize: 11, color: t.textMuted }}>para Marina Okano · há {active.time}</div>
                  </div>
                </div>
                <div style={{ fontSize: 13.5, lineHeight: 1.65, color: t.text }}>
                  <p style={{ margin: "0 0 12px" }}>Oi Marina, tudo bem?</p>
                  <p style={{ margin: "0 0 12px" }}>Dei uma olhada na proposta que você mandou e tenho algumas perguntas antes de levar pro board:</p>
                  <ol style={{ paddingLeft: 20, margin: "0 0 12px", lineHeight: 1.8 }}>
                    <li>Como funciona o pricing pra 50+ usuários? Tem desconto progressivo?</li>
                    <li>O SLA enterprise inclui suporte 24/7 em português?</li>
                    <li>Integração com SAP está no escopo ou é projeto separado?</li>
                  </ol>
                  <p style={{ margin: "0 0 12px" }}>Se puder, podemos marcar uma call rápida hoje à tarde pra alinhar? Tenho 30min livre às 16h.</p>
                  <p style={{ margin: 0 }}>Abraço,<br/>{active.from}</p>
                </div>
              </div>

              {/* Reply composer */}
              <div style={{ padding: 14, background: t.surface, borderRadius: 12, border: `1px solid ${t.border}` }}>
                <div style={{ fontSize: 12, color: t.textMuted, marginBottom: 10 }}>Responder para {active.from}</div>
                <div style={{ minHeight: 80, fontSize: 13, color: t.textSubtle, fontStyle: "italic" }}>Escreva sua resposta…</div>
                <div style={{ display: "flex", gap: 8, marginTop: 10, paddingTop: 10, borderTop: `1px solid ${t.border}`, alignItems: "center" }}>
                  <Button t={t} variant="bold" size="sm" bold>Enviar</Button>
                  <Button t={t} variant="secondary" size="sm" leading={<Icon d={Icons.clock} size={12}/>}>Agendar</Button>
                  <div style={{ flex: 1 }}/>
                  <Button t={t} variant="ghost" size="sm" leading={<Icon d={Icons.sparkle} size={13}/>}>Gerar com IA</Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ================================================================
//                         COMPANIES
// ================================================================
const COMPANIES = [
  { name: "Prime Logística",  industry: "Logística",    size: "500-1000",  country: "🇧🇷 BR", deals: 3, mrr: "R$ 84K", health: 92, owner: "Rafael L." },
  { name: "Grupo Norte",      industry: "Varejo",       size: "1000+",     country: "🇧🇷 BR", deals: 5, mrr: "R$ 142K", health: 78, owner: "Henrique D." },
  { name: "Vertex Indústria", industry: "Indústria",    size: "200-500",   country: "🇧🇷 BR", deals: 2, mrr: "R$ 128K", health: 85, owner: "Camila F." },
  { name: "Estúdio Mar",      industry: "Design",       size: "10-50",     country: "🇧🇷 BR", deals: 1, mrr: "R$ 24K", health: 58, owner: "Júlia M." },
  { name: "Sato Engenharia",  industry: "Engenharia",   size: "50-200",    country: "🇧🇷 BR", deals: 2, mrr: "R$ 18K", health: 71, owner: "Rafael L." },
  { name: "Cloud9 Tech",      industry: "SaaS",         size: "10-50",     country: "🇺🇸 US", deals: 0, mrr: "—",      health: 34, owner: "Marina O." },
  { name: "Nova Têxtil",      industry: "Indústria",    size: "200-500",   country: "🇧🇷 BR", deals: 4, mrr: "R$ 42K", health: 98, owner: "Rafael L." },
  { name: "Helio Energia",    industry: "Energia",      size: "500-1000",  country: "🇧🇷 BR", deals: 1, mrr: "R$ 62K", health: 74, owner: "Camila F." },
  { name: "Botanica Co",      industry: "E-commerce",   size: "10-50",     country: "🇧🇷 BR", deals: 2, mrr: "R$ 14K", health: 81, owner: "Júlia M." },
  { name: "Forma Arquitetura", industry: "Arquitetura", size: "10-50",     country: "🇧🇷 BR", deals: 1, mrr: "R$ 36K", health: 66, owner: "Henrique D." },
];

function CompaniesScreen({ t, theme, onToggleTheme, onNav }) {
  return (
    <div style={{ display: "flex", height: "100%", background: t.bg, color: t.text, fontFamily: OMNIFY_FONTS.sans, fontSize: 13 }}>
      <SidebarBold t={t} active="companies" onNav={onNav}/>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <header style={{ padding: "18px 28px 14px", background: t.bg, borderBottom: `1px solid ${t.border}`, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 10.5, color: t.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Accounts · B2B</div>
            <h1 style={{ margin: 0, fontSize: 30, fontWeight: 500, letterSpacing: -0.8, fontFamily: OMNIFY_FONTS.display, display: "flex", alignItems: "baseline", gap: 12 }}>
              Empresas <span style={{ fontFamily: OMNIFY_FONTS.sans, fontSize: 13, fontWeight: 500, color: t.textMuted }}>{COMPANIES.length} ativas · R$ 550K MRR</span>
            </h1>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Button t={t} variant="ghost" size="sm" onClick={onToggleTheme} leading={<Icon d={theme === "dark" ? Icons.sun : Icons.moon} size={14}/>}>{theme === "dark" ? "Claro" : "Escuro"}</Button>
            <Button t={t} variant="secondary" size="sm" leading={<Icon d={Icons.sparkle} size={13}/>}>Enriquecer</Button>
            <Button t={t} variant="bold" bold size="sm" leading={<Icon d={Icons.plus} size={14}/>}>Nova empresa</Button>
          </div>
        </header>
        <div style={{ flex: 1, overflow: "auto", background: t.surface }}>
          <div style={{ display: "grid", gridTemplateColumns: "36px 2fr 1.2fr 1fr 0.8fr 0.7fr 1fr 0.9fr 60px", padding: "12px 28px", borderBottom: `1px solid ${t.border}`, background: t.bgSubtle, position: "sticky", top: 0, zIndex: 2, fontSize: 10.5, fontWeight: 700, color: t.textMuted, textTransform: "uppercase", letterSpacing: 1 }}>
            <div></div><div>Empresa</div><div>Indústria</div><div>Tamanho</div><div>País</div><div>Deals</div><div>MRR</div><div>Dono</div><div style={{ textAlign: "right" }}>Saúde</div>
          </div>
          {COMPANIES.map((c, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "36px 2fr 1.2fr 1fr 0.8fr 0.7fr 1fr 0.9fr 60px", padding: "14px 28px", borderBottom: `1px solid ${t.border}`, alignItems: "center", cursor: "pointer" }}>
              <div><div style={{ width: 16, height: 16, borderRadius: 4, boxShadow: `inset 0 0 0 1px ${t.borderStrong}` }}/></div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: t.bgSubtle, display: "grid", placeItems: "center", fontSize: 13, fontWeight: 700, color: t.text, fontFamily: OMNIFY_FONTS.display }}>{c.name[0]}</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{c.name}</div>
                  <div style={{ fontSize: 11, color: t.textMuted }}>{c.name.toLowerCase().replace(/\s/g, "")}.com</div>
                </div>
              </div>
              <div style={{ fontSize: 12.5 }}>{c.industry}</div>
              <div style={{ fontSize: 12, color: t.textMuted }}>{c.size}</div>
              <div style={{ fontSize: 12 }}>{c.country}</div>
              <div style={{ fontSize: 12.5, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{c.deals}</div>
              <div style={{ fontSize: 13, fontWeight: 600, fontFamily: OMNIFY_FONTS.display, fontVariantNumeric: "tabular-nums" }}>{c.mrr}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Avatar t={t} name={c.owner} size={20}/>
                <span style={{ fontSize: 11.5, color: t.textMuted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.owner}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end" }}><ScoreBadge score={c.health} t={t} bold/></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ================================================================
//                         ACTIVITIES (tarefas)
// ================================================================
const TASKS = [
  { id: 1, title: "Call com Rafael (Prime Logística)",            due: "Hoje · 16:00", dur: "30min", type: "call",   done: false, owner: "Marina", deal: "Prime Logística", prio: "alta" },
  { id: 2, title: "Enviar proposta final pra Grupo Norte",         due: "Hoje · 18:00", dur: "tarefa", type: "email",  done: false, owner: "Marina", deal: "Grupo Norte",      prio: "alta" },
  { id: 3, title: "Demo produto — Vertex Indústria",              due: "Amanhã · 10:00", dur: "1h", type: "meeting", done: false, owner: "Henrique", deal: "Vertex Indústria", prio: "alta" },
  { id: 4, title: "Follow-up WhatsApp com Paula (Estúdio Mar)",    due: "Amanhã · 14:00", dur: "—", type: "whatsapp",  done: false, owner: "Júlia",   deal: "Estúdio Mar",    prio: "media" },
  { id: 5, title: "Revisar contrato Sato Engenharia",             due: "25 abr",         dur: "45min", type: "task",    done: false, owner: "Marina", deal: "Sato Engenharia", prio: "media" },
  { id: 6, title: "Onboarding Nova Têxtil (kickoff)",             due: "26 abr · 09:00", dur: "1h", type: "meeting", done: false, owner: "Rafael",  deal: "Nova Têxtil",    prio: "alta" },
  { id: 7, title: "Escrever case study Prime Logística",          due: "30 abr",         dur: "3h", type: "task",    done: false, owner: "Marina", deal: "—",              prio: "baixa" },
  { id: 8, title: "Call com Bruno Campos",                         due: "Ontem",         dur: "30min", type: "call",    done: true,  owner: "Henrique", deal: "Vertex Indústria", prio: "alta" },
];

function ActivitiesScreen({ t, theme, onToggleTheme, onNav }) {
  const [view, setView] = React.useState("hoje");
  const filtered = view === "hoje" ? TASKS.filter(x => x.due.startsWith("Hoje")) :
                   view === "semana" ? TASKS.filter(x => !x.done) :
                   view === "concluidas" ? TASKS.filter(x => x.done) : TASKS;
  return (
    <div style={{ display: "flex", height: "100%", background: t.bg, color: t.text, fontFamily: OMNIFY_FONTS.sans, fontSize: 13 }}>
      <SidebarBold t={t} active="activities" onNav={onNav}/>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <header style={{ padding: "18px 28px 14px", background: t.bg, borderBottom: `1px solid ${t.border}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 10.5, color: t.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Terça · 22 de abril</div>
              <h1 style={{ margin: 0, fontSize: 30, fontWeight: 500, letterSpacing: -0.8, fontFamily: OMNIFY_FONTS.display, display: "flex", alignItems: "baseline", gap: 12 }}>
                Atividades <span style={{ fontFamily: OMNIFY_FONTS.sans, fontSize: 13, fontWeight: 500, color: t.textMuted }}>4 pra hoje · 2h agendadas</span>
              </h1>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Button t={t} variant="ghost" size="sm" onClick={onToggleTheme} leading={<Icon d={theme === "dark" ? Icons.sun : Icons.moon} size={14}/>}>{theme === "dark" ? "Claro" : "Escuro"}</Button>
              <Button t={t} variant="bold" bold size="sm" leading={<Icon d={Icons.plus} size={14}/>}>Nova tarefa</Button>
            </div>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {[{ k: "hoje", l: "Hoje", n: 2 }, { k: "semana", l: "Esta semana", n: 7 }, { k: "concluidas", l: "Concluídas", n: 1 }, { k: "todas", l: "Todas", n: 8 }].map(tab => {
              const active = view === tab.k;
              return (
                <div key={tab.k} onClick={() => setView(tab.k)} style={{
                  padding: "6px 12px", borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: "pointer",
                  background: active ? t.bold : t.surface, color: active ? "#F4F3EF" : t.text,
                  border: `1px solid ${active ? t.bold : t.border}`, display: "flex", alignItems: "center", gap: 6,
                }}>{tab.l} <span style={{ fontSize: 10, color: active ? t.boldInk : t.textMuted }}>{tab.n}</span></div>
              );
            })}
          </div>
        </header>

        <div style={{ flex: 1, overflow: "auto", padding: "20px 28px" }}>
          {filtered.map(task => {
            const tIcons = { call: Icons.phone, email: Icons.mail, meeting: Icons.calendar, whatsapp: Icons.phone, task: Icons.check };
            return (
              <div key={task.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: 16, background: t.surface, borderRadius: 12, border: `1px solid ${t.border}`, marginBottom: 8, opacity: task.done ? 0.5 : 1 }}>
                <div style={{ width: 20, height: 20, borderRadius: 999, border: `1.5px solid ${task.done ? t.success : t.borderStrong}`, background: task.done ? t.success : "transparent", display: "grid", placeItems: "center", cursor: "pointer", flexShrink: 0 }}>
                  {task.done && <Icon d={Icons.check} size={11} stroke="#fff" strokeWidth={3}/>}
                </div>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: t.bgSubtle, color: t.text, display: "grid", placeItems: "center", flexShrink: 0 }}>
                  <Icon d={tIcons[task.type]} size={15}/>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 3, textDecoration: task.done ? "line-through" : "none" }}>{task.title}</div>
                  <div style={{ fontSize: 11, color: t.textMuted, display: "flex", gap: 10 }}>
                    <span><Icon d={Icons.clock} size={10} style={{ verticalAlign: "middle", marginRight: 3 }}/>{task.due}{task.dur !== "—" && task.dur !== "tarefa" && ` · ${task.dur}`}</span>
                    {task.deal !== "—" && <span>· {task.deal}</span>}
                  </div>
                </div>
                <Pill t={t} color={task.prio === "alta" ? "danger" : task.prio === "media" ? "warn" : "neutral"}>{task.prio}</Pill>
                <Avatar t={t} name={task.owner} size={26}/>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ================================================================
//                         REPORTS
// ================================================================
function ReportsScreen({ t, theme, onToggleTheme, onNav }) {
  return (
    <div style={{ display: "flex", height: "100%", background: t.bg, color: t.text, fontFamily: OMNIFY_FONTS.sans, fontSize: 13 }}>
      <SidebarBold t={t} active="reports" onNav={onNav}/>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <header style={{ padding: "18px 28px 14px", background: t.bg, borderBottom: `1px solid ${t.border}`, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 10.5, color: t.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Analytics · últimos 90 dias</div>
            <h1 style={{ margin: 0, fontSize: 30, fontWeight: 500, letterSpacing: -0.8, fontFamily: OMNIFY_FONTS.display }}>Relatórios</h1>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Button t={t} variant="ghost" size="sm" onClick={onToggleTheme} leading={<Icon d={theme === "dark" ? Icons.sun : Icons.moon} size={14}/>}>{theme === "dark" ? "Claro" : "Escuro"}</Button>
            <Button t={t} variant="secondary" size="sm" leading={<Icon d={Icons.download} size={13}/>}>Exportar</Button>
            <Button t={t} variant="bold" bold size="sm" leading={<Icon d={Icons.plus} size={14}/>}>Novo relatório</Button>
          </div>
        </header>

        <div style={{ flex: 1, overflow: "auto", padding: 28 }}>
          {/* Big KPIs */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
            {[
              { k: "Receita fechada", v: "R$ 2.09M", d: "+18.4% vs Q1" },
              { k: "Deals ganhos",    v: "84",       d: "+12%" },
              { k: "Ciclo médio",     v: "23 dias",  d: "−4 dias" },
              { k: "Win rate",        v: "28.4%",    d: "+3.2pp" },
            ].map((k, i) => (
              <div key={i} style={{ padding: 18, background: t.surface, borderRadius: 14, border: `1px solid ${t.border}` }}>
                <div style={{ fontSize: 10.5, fontWeight: 600, color: t.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>{k.k}</div>
                <div style={{ fontSize: 28, fontWeight: 500, letterSpacing: -0.6, fontFamily: OMNIFY_FONTS.display, marginBottom: 4 }}>{k.v}</div>
                <div style={{ fontSize: 11, color: t.success, fontWeight: 600 }}>{k.d}</div>
              </div>
            ))}
          </div>

          {/* Big chart */}
          <div style={{ padding: 22, background: t.surface, borderRadius: 16, border: `1px solid ${t.border}`, marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Receita por mês · 2026</h3>
                <p style={{ margin: "2px 0 0", fontSize: 11.5, color: t.textMuted }}>Fechado + MRR · comparado com meta</p>
              </div>
              <div style={{ display: "flex", gap: 12, fontSize: 11, color: t.textMuted }}>
                <span style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: t.bold }}/>Receita</span>
                <span style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: t.bgSubtle, boxShadow: `inset 0 0 0 1px ${t.border}` }}/>Meta</span>
              </div>
            </div>
            <RevenueChart t={t} color={t.text} height={200}/>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            {/* Win/lose reasons */}
            <div style={{ padding: 22, background: t.surface, borderRadius: 16, border: `1px solid ${t.border}` }}>
              <h3 style={{ margin: "0 0 14px", fontSize: 14, fontWeight: 600 }}>Motivos de perda</h3>
              {[
                { reason: "Preço", pct: 38, n: 22 },
                { reason: "Sem necessidade no momento", pct: 24, n: 14 },
                { reason: "Escolheu concorrente", pct: 18, n: 10 },
                { reason: "Budget não aprovado", pct: 12, n: 7 },
                { reason: "Outros", pct: 8, n: 5 },
              ].map((r, i) => (
                <div key={i} style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                    <span style={{ fontWeight: 500 }}>{r.reason}</span>
                    <span style={{ color: t.textMuted, fontVariantNumeric: "tabular-nums" }}>{r.pct}% · {r.n}</span>
                  </div>
                  <Bar t={t} value={r.pct} color={t.text}/>
                </div>
              ))}
            </div>

            {/* Top performers */}
            <div style={{ padding: 22, background: t.surface, borderRadius: 16, border: `1px solid ${t.border}` }}>
              <h3 style={{ margin: "0 0 14px", fontSize: 14, fontWeight: 600 }}>Top vendedores · Q2</h3>
              {[
                { name: "Rafael Lima",      deals: 18, revenue: "R$ 412K", pct: 100 },
                { name: "Camila Ferraz",    deals: 14, revenue: "R$ 328K", pct: 80 },
                { name: "Henrique Dias",    deals: 12, revenue: "R$ 284K", pct: 69 },
                { name: "Marina Okano",     deals: 9,  revenue: "R$ 218K", pct: 53 },
                { name: "Júlia Mendes",     deals: 7,  revenue: "R$ 168K", pct: 41 },
              ].map((p, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: i < 4 ? `1px solid ${t.border}` : "none" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, width: 18, fontFamily: OMNIFY_FONTS.display }}>#{i + 1}</div>
                  <Avatar t={t} name={p.name} size={28}/>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600 }}>{p.name}</div>
                    <div style={{ fontSize: 10.5, color: t.textMuted }}>{p.deals} deals</div>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, fontFamily: OMNIFY_FONTS.display, fontVariantNumeric: "tabular-nums" }}>{p.revenue}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ================================================================
//                     SDR AUTÔNOMO (IA)
// ================================================================
function SdrScreen({ t, theme, onToggleTheme, onNav }) {
  return (
    <div style={{ display: "flex", height: "100%", background: t.bg, color: t.text, fontFamily: OMNIFY_FONTS.sans, fontSize: 13 }}>
      <SidebarBold t={t} active="sdr" onNav={onNav}/>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <header style={{ padding: "18px 28px 14px", background: t.bg, borderBottom: `1px solid ${t.border}`, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 10.5, color: t.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Agentes IA · qualificação automatizada</div>
            <h1 style={{ margin: 0, fontSize: 30, fontWeight: 500, letterSpacing: -0.8, fontFamily: OMNIFY_FONTS.display }}>SDR autônomo</h1>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <Button t={t} variant="ghost" size="sm" onClick={onToggleTheme} leading={<Icon d={theme === "dark" ? Icons.sun : Icons.moon} size={14}/>}>{theme === "dark" ? "Claro" : "Escuro"}</Button>
            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", background: t.successSoft, borderRadius: 999, fontSize: 11, fontWeight: 600, color: t.success }}>
              <span style={{ width: 7, height: 7, borderRadius: 999, background: t.success, boxShadow: "0 0 6px currentColor" }}/> Ativo · rodando agora
            </div>
          </div>
        </header>

        <div style={{ flex: 1, overflow: "auto", padding: 28 }}>
          {/* Hero: agent status */}
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 14, marginBottom: 20 }}>
            <div style={{ background: t.bold, color: "#F4F3EF", borderRadius: 16, padding: 24, position: "relative", overflow: "hidden" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
                <div style={{ width: 56, height: 56, borderRadius: 14, background: t.boldInk, color: "#0A0A0A", display: "grid", placeItems: "center" }}>
                  <Icon d={Icons.sparkle} size={28}/>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: 1, fontWeight: 600, marginBottom: 4 }}>Agente · Qualificador BANT</div>
                  <div style={{ fontSize: 24, fontWeight: 500, fontFamily: OMNIFY_FONTS.display }}>Mariana IA</div>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 18 }}>
                {[
                  { k: "Qualificados hoje", v: "42" },
                  { k: "Taxa qualif.",       v: "68%" },
                  { k: "Tempo médio",        v: "3.2min" },
                  { k: "Economia",           v: "R$ 12K/mês" },
                ].map((s, i) => (
                  <div key={i}>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>{s.k}</div>
                    <div style={{ fontSize: 22, fontWeight: 600, color: t.boldInk, fontFamily: OMNIFY_FONTS.display }}>{s.v}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ padding: 22, background: t.surface, borderRadius: 16, border: `1px solid ${t.border}` }}>
              <h3 style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 600 }}>Pausar ou ajustar</h3>
              <div style={{ fontSize: 12, color: t.textMuted, marginBottom: 14, lineHeight: 1.5 }}>Controle fino de quando e como a IA qualifica leads.</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <Button t={t} variant="secondary" size="sm" leading={<Icon d={Icons.settings} size={13}/>} style={{ justifyContent: "flex-start" }}>Editar prompt & regras</Button>
                <Button t={t} variant="secondary" size="sm" leading={<Icon d={Icons.clock} size={13}/>} style={{ justifyContent: "flex-start" }}>Horário de funcionamento</Button>
                <Button t={t} variant="ghost" size="sm" leading={<Icon d={Icons.x} size={13}/>} style={{ justifyContent: "flex-start", color: t.danger }}>Pausar agente</Button>
              </div>
            </div>
          </div>

          {/* Live activity */}
          <div style={{ padding: 22, background: t.surface, borderRadius: 16, border: `1px solid ${t.border}`, marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Atividade ao vivo</h3>
                <p style={{ margin: "2px 0 0", fontSize: 11.5, color: t.textMuted }}>Últimas conversas da IA com leads</p>
              </div>
            </div>
            {[
              { lead: "Marcelo Tavares", status: "qualified",   msg: "Cliente confirmou budget R$ 50K/ano e deadline Q2. Passei pra Marina.",  time: "2min" },
              { lead: "Roberta Kim",     status: "disqualified", msg: "Empresa tem só 3 funcionários, não serve pro nosso ICP. Descartei.",     time: "12min" },
              { lead: "André Cavalcanti", status: "qualified",   msg: "Indicado por cliente ativo. Agendei demo direto com Henrique.",           time: "34min" },
              { lead: "Débora Salles",    status: "nurturing",    msg: "Budget não aprovado ainda. Entrei em sequência de nurturing 60 dias.",   time: "1h" },
              { lead: "Felipe Araújo",   status: "qualified",   msg: "Lead respondeu 3 perguntas BANT positivamente. Agendei call.",             time: "2h" },
            ].map((a, i, arr) => {
              const sc = a.status === "qualified" ? "success" : a.status === "disqualified" ? "neutral" : "warn";
              const sl = a.status === "qualified" ? "Qualificado" : a.status === "disqualified" ? "Descartado" : "Nurturing";
              return (
                <div key={i} style={{ display: "flex", gap: 14, padding: "12px 0", borderBottom: i < arr.length - 1 ? `1px solid ${t.border}` : "none" }}>
                  <Avatar t={t} name={a.lead} size={32}/>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{a.lead}</span>
                      <Pill t={t} color={sc}>{sl}</Pill>
                      <span style={{ fontSize: 10.5, color: t.textSubtle, marginLeft: "auto" }}>há {a.time}</span>
                    </div>
                    <div style={{ fontSize: 12.5, color: t.textMuted, lineHeight: 1.5 }}>{a.msg}</div>
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

// ================================================================
//                         ADS AUTOMATION
// ================================================================
function AdsScreen({ t, theme, onToggleTheme, onNav }) {
  const campaigns = [
    { name: "Logística 3.0 · BR",    platform: "Google Ads", spend: "R$ 4.2K", leads: 38, cac: "R$ 110", cpl: "R$ 96",  status: "ativa", perf: "up" },
    { name: "ICP Indústria · LinkedIn", platform: "LinkedIn",   spend: "R$ 8.8K", leads: 24, cac: "R$ 366", cpl: "R$ 183", status: "ativa", perf: "flat" },
    { name: "Retargeting Meta",      platform: "Meta Ads",    spend: "R$ 2.1K", leads: 52, cac: "R$ 80",  cpl: "R$ 40",  status: "ativa", perf: "up" },
    { name: "SaaS B2B EUA",          platform: "Google Ads", spend: "R$ 6.4K", leads: 12, cac: "R$ 533", cpl: "R$ 533", status: "pausada", perf: "down" },
    { name: "Landing growth-hack",   platform: "Meta Ads",    spend: "R$ 1.8K", leads: 89, cac: "R$ 90",  cpl: "R$ 20",  status: "ativa", perf: "up" },
  ];
  return (
    <div style={{ display: "flex", height: "100%", background: t.bg, color: t.text, fontFamily: OMNIFY_FONTS.sans, fontSize: 13 }}>
      <SidebarBold t={t} active="ads" onNav={onNav}/>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <header style={{ padding: "18px 28px 14px", background: t.bg, borderBottom: `1px solid ${t.border}`, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 10.5, color: t.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Paid · multicanal automatizado</div>
            <h1 style={{ margin: 0, fontSize: 30, fontWeight: 500, letterSpacing: -0.8, fontFamily: OMNIFY_FONTS.display, display: "flex", alignItems: "baseline", gap: 12 }}>
              Ads <span style={{ fontFamily: OMNIFY_FONTS.sans, fontSize: 13, fontWeight: 500, color: t.textMuted }}>5 campanhas ativas · R$ 23.3K gastos</span>
            </h1>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Button t={t} variant="ghost" size="sm" onClick={onToggleTheme} leading={<Icon d={theme === "dark" ? Icons.sun : Icons.moon} size={14}/>}>{theme === "dark" ? "Claro" : "Escuro"}</Button>
            <Button t={t} variant="secondary" size="sm" leading={<Icon d={Icons.sparkle} size={13}/>}>Sugerir otimizações</Button>
            <Button t={t} variant="bold" bold size="sm" leading={<Icon d={Icons.plus} size={14}/>}>Nova campanha</Button>
          </div>
        </header>

        <div style={{ flex: 1, overflow: "auto", padding: 28 }}>
          {/* Top KPIs */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
            {[
              { k: "Gasto total 30d", v: "R$ 23.3K", d: "+8%" },
              { k: "Leads captados",  v: "215",      d: "+24%" },
              { k: "CAC médio",       v: "R$ 238",   d: "−18%" },
              { k: "ROI estimado",    v: "4.2x",     d: "+0.6x" },
            ].map((k, i) => (
              <div key={i} style={{ padding: 18, background: t.surface, borderRadius: 14, border: `1px solid ${t.border}` }}>
                <div style={{ fontSize: 10.5, fontWeight: 600, color: t.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>{k.k}</div>
                <div style={{ fontSize: 24, fontWeight: 500, letterSpacing: -0.5, fontFamily: OMNIFY_FONTS.display, marginBottom: 4 }}>{k.v}</div>
                <div style={{ fontSize: 11, color: t.success, fontWeight: 600 }}>{k.d}</div>
              </div>
            ))}
          </div>

          {/* AI recommendation */}
          <div style={{ background: t.bold, color: "#F4F3EF", borderRadius: 14, padding: 18, marginBottom: 16, display: "flex", gap: 14 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: t.boldInk, color: "#0A0A0A", display: "grid", placeItems: "center", flexShrink: 0 }}>
              <Icon d={Icons.sparkle} size={18}/>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>IA · sugestão de realocação</div>
              <div style={{ fontSize: 14, lineHeight: 1.55 }}>
                Campanha <strong style={{ color: t.boldInk }}>Landing growth-hack</strong> está com CPL 75% menor que a média. Recomendo mover <strong>R$ 2K</strong> do orçamento da <em>SaaS B2B EUA</em> (pausada) pra ela. Impacto estimado: <strong style={{ color: t.boldInk }}>+58 leads/mês</strong>.
              </div>
              <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
                <Button t={t} variant="bold" size="sm" bold>Aplicar realocação</Button>
                <Button t={t} variant="ghost" size="sm" style={{ color: "#F4F3EF" }}>Ver análise</Button>
              </div>
            </div>
          </div>

          {/* Campaign list */}
          <div style={{ background: t.surface, borderRadius: 14, border: `1px solid ${t.border}`, overflow: "hidden" }}>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 0.9fr 0.7fr 0.8fr 0.8fr 100px", padding: "12px 18px", borderBottom: `1px solid ${t.border}`, background: t.bgSubtle, fontSize: 10.5, fontWeight: 700, color: t.textMuted, textTransform: "uppercase", letterSpacing: 1 }}>
              <div>Campanha</div><div>Plataforma</div><div>Gasto</div><div>Leads</div><div>CPL</div><div>CAC</div><div style={{ textAlign: "right" }}>Status</div>
            </div>
            {campaigns.map((c, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 0.9fr 0.7fr 0.8fr 0.8fr 100px", padding: "14px 18px", borderBottom: i < campaigns.length - 1 ? `1px solid ${t.border}` : "none", alignItems: "center", fontSize: 12.5 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 4, height: 32, borderRadius: 2, background: c.perf === "up" ? t.success : c.perf === "down" ? t.danger : t.textMuted }}/>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{c.name}</div>
                    <div style={{ fontSize: 10.5, color: t.textMuted, display: "inline-flex", alignItems: "center", gap: 3 }}>
                      <Icon d={c.perf === "up" ? Icons.arrowUp : c.perf === "down" ? Icons.arrowDn : Icons.trend} size={10} style={{ color: c.perf === "up" ? t.success : c.perf === "down" ? t.danger : t.textMuted }}/>
                      {c.perf === "up" ? "performando" : c.perf === "down" ? "abaixo da meta" : "estável"}
                    </div>
                  </div>
                </div>
                <div>{c.platform}</div>
                <div style={{ fontFamily: OMNIFY_FONTS.display, fontWeight: 600 }}>{c.spend}</div>
                <div style={{ fontWeight: 600 }}>{c.leads}</div>
                <div>{c.cpl}</div>
                <div>{c.cac}</div>
                <div style={{ textAlign: "right" }}><Pill t={t} color={c.status === "ativa" ? "success" : "neutral"}>{c.status}</Pill></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ================================================================
//                         SEGMENTS
// ================================================================
function SegmentsScreen({ t, theme, onToggleTheme, onNav }) {
  const segments = [
    { name: "Clientes enterprise (>R$ 100K)",  count: 24, rule: "Valor ≥ 100K · Plano = Enterprise", auto: true },
    { name: "Hot leads últimas 48h",           count: 18, rule: "Score ≥ 80 · Capturado < 48h",       auto: true },
    { name: "Churn risk · 30d sem toque",      count: 9,  rule: "Cliente ativo · último toque > 30d",  auto: true },
    { name: "E-commerce · Shopify",            count: 47, rule: "Integração = Shopify",               auto: true },
    { name: "Indústria > 500 funcionários",    count: 32, rule: "Indústria = Indústria · Size ≥ 500", auto: true },
    { name: "Pilot Q2 (lista manual)",          count: 12, rule: "Lista manual · criada por Marina",   auto: false },
    { name: "Evento Web Summit 2026",          count: 64, rule: "Lista manual · origem = Evento",     auto: false },
  ];
  return (
    <div style={{ display: "flex", height: "100%", background: t.bg, color: t.text, fontFamily: OMNIFY_FONTS.sans, fontSize: 13 }}>
      <SidebarBold t={t} active="segments" onNav={onNav}/>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <header style={{ padding: "18px 28px 14px", background: t.bg, borderBottom: `1px solid ${t.border}`, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 10.5, color: t.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Listas inteligentes · auto-atualizadas</div>
            <h1 style={{ margin: 0, fontSize: 30, fontWeight: 500, letterSpacing: -0.8, fontFamily: OMNIFY_FONTS.display }}>Segmentos</h1>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Button t={t} variant="ghost" size="sm" onClick={onToggleTheme} leading={<Icon d={theme === "dark" ? Icons.sun : Icons.moon} size={14}/>}>{theme === "dark" ? "Claro" : "Escuro"}</Button>
            <Button t={t} variant="bold" bold size="sm" leading={<Icon d={Icons.plus} size={14}/>}>Novo segmento</Button>
          </div>
        </header>
        <div style={{ flex: 1, overflow: "auto", padding: 28 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
            {segments.map((s, i) => (
              <div key={i} style={{ padding: 20, background: t.surface, borderRadius: 14, border: `1px solid ${t.border}`, cursor: "pointer" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14.5, fontWeight: 600, marginBottom: 4, letterSpacing: -0.2 }}>{s.name}</div>
                    <div style={{ fontSize: 11, color: t.textMuted, fontFamily: OMNIFY_FONTS.mono }}>{s.rule}</div>
                  </div>
                  {s.auto && <Pill t={t} color="primary"><Icon d={Icons.sparkle} size={9}/> Auto</Pill>}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: 18 }}>
                  <div style={{ fontSize: 34, fontWeight: 500, letterSpacing: -1, fontFamily: OMNIFY_FONTS.display, lineHeight: 1 }}>{s.count}<span style={{ fontSize: 13, color: t.textMuted, fontWeight: 500, marginLeft: 6 }}>contatos</span></div>
                  <Icon d={Icons.chevR} size={16} style={{ color: t.textMuted }}/>
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
//                         DEAL DETAIL
// ================================================================
function DealDetailScreen({ t, theme, onToggleTheme, onNav, onClose }) {
  const stages = ["Lead", "Qualificado", "Demo", "Proposta", "Negociação", "Fechado"];
  const currentStage = 4; // Negociação
  return (
    <div style={{ display: "flex", height: "100%", background: t.bg, color: t.text, fontFamily: OMNIFY_FONTS.sans, fontSize: 13 }}>
      <SidebarBold t={t} active="pipeline" onNav={onNav}/>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <header style={{ padding: "14px 28px", borderBottom: `1px solid ${t.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", background: t.bg }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12.5, color: t.textMuted }}>
            <span onClick={() => onNav("pipeline")} style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5 }}>
              <Icon d={Icons.chevL} size={13}/> Pipeline
            </span>
            <Icon d={Icons.chevR} size={11} style={{ color: t.textSubtle }}/>
            <span style={{ color: t.text, fontWeight: 600 }}>Prime Logística</span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Button t={t} variant="ghost" size="sm" onClick={onToggleTheme} leading={<Icon d={theme === "dark" ? Icons.sun : Icons.moon} size={13}/>}>{theme === "dark" ? "Claro" : "Escuro"}</Button>
            <Button t={t} variant="secondary" size="sm">Perder</Button>
            <Button t={t} variant="bold" bold size="sm" leading={<Icon d={Icons.check} size={13}/>}>Marcar como ganho</Button>
          </div>
        </header>

        {/* Hero */}
        <div style={{ padding: "24px 28px 18px", background: t.bg, borderBottom: `1px solid ${t.border}` }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 24, marginBottom: 20 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10.5, color: t.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Deal #OMF-2847 · Dono: Rafael Lima</div>
              <h1 style={{ margin: 0, fontSize: 36, fontWeight: 500, letterSpacing: -1, fontFamily: OMNIFY_FONTS.display, marginBottom: 8 }}>Prime Logística</h1>
              <div style={{ display: "flex", gap: 20, alignItems: "baseline" }}>
                <div style={{ fontSize: 28, fontWeight: 600, fontFamily: OMNIFY_FONTS.display, letterSpacing: -0.5 }}>R$ 84.000</div>
                <div style={{ fontSize: 12, color: t.textMuted }}>Fechamento previsto: <strong style={{ color: t.text }}>28 abr</strong> · 70% prob.</div>
              </div>
            </div>
            <div style={{ width: 180, padding: 16, background: t.bold, color: "#F4F3EF", borderRadius: 12, textAlign: "center" }}>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>IA · chance de fechar</div>
              <div style={{ fontSize: 40, fontWeight: 500, color: t.boldInk, fontFamily: OMNIFY_FONTS.display, letterSpacing: -1, lineHeight: 1 }}>72%</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", marginTop: 4 }}>+8pp vs semana passada</div>
            </div>
          </div>

          {/* Stage progress */}
          <div style={{ display: "flex", gap: 4 }}>
            {stages.map((s, i) => {
              const done = i < currentStage, curr = i === currentStage;
              return (
                <div key={s} style={{ flex: 1, padding: "10px 12px", background: done ? t.bold : curr ? t.boldInk : t.bgSubtle, color: done ? "#F4F3EF" : curr ? "#0A0A0A" : t.textMuted, borderRadius: 8, fontSize: 11.5, fontWeight: 700, textAlign: "center", position: "relative" }}>
                  <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", marginBottom: 2, opacity: 0.6 }}>#{i + 1}</div>
                  {s}
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
          {/* Sidebar */}
          <aside style={{ width: 320, borderRight: `1px solid ${t.border}`, padding: 22, overflow: "auto", flexShrink: 0, background: t.bg }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: t.textSubtle, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Contato principal</div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: 12, background: t.surface, borderRadius: 10, border: `1px solid ${t.border}`, marginBottom: 18 }}>
              <Avatar t={t} name="Rafael Lima" size={40}/>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>Rafael Lima</div>
                <div style={{ fontSize: 11, color: t.textMuted }}>Diretor de Ops</div>
              </div>
              <Icon d={Icons.arrowUR} size={14} style={{ color: t.textMuted }}/>
            </div>

            <div style={{ fontSize: 10, fontWeight: 700, color: t.textSubtle, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Campos</div>
            {[
              ["Empresa", "Prime Logística"],
              ["Indústria", "Logística"],
              ["Funcionários", "500-1000"],
              ["Origem", "SDR · LinkedIn"],
              ["Criado em", "12 mar 2026"],
              ["Último toque", "há 2h · Call"],
              ["Próximo passo", "Assinatura de contrato"],
            ].map(([k, v], i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", fontSize: 12, borderBottom: `1px dashed ${t.border}` }}>
                <span style={{ color: t.textMuted }}>{k}</span><span style={{ fontWeight: 500 }}>{v}</span>
              </div>
            ))}

            <div style={{ fontSize: 10, fontWeight: 700, color: t.textSubtle, textTransform: "uppercase", letterSpacing: 1, margin: "18px 0 10px" }}>Tags</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              <Pill t={t} color="danger">Hot</Pill>
              <Pill t={t} color="primary">Enterprise</Pill>
              <Pill t={t} color="neutral">Referência</Pill>
            </div>
          </aside>

          {/* Main */}
          <div style={{ flex: 1, padding: 24, overflow: "auto" }}>
            <div style={{ background: t.bold, color: "#F4F3EF", borderRadius: 14, padding: 18, marginBottom: 20, display: "flex", gap: 14 }}>
              <div style={{ width: 32, height: 32, borderRadius: 9, background: t.boldInk, color: "#0A0A0A", display: "grid", placeItems: "center", flexShrink: 0 }}>
                <Icon d={Icons.sparkle} size={16}/>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>IA · próxima ação recomendada</div>
                <div style={{ fontSize: 14, lineHeight: 1.55 }}>
                  Cliente pediu revisão do SLA na call de ontem. Redija email respondendo as 3 perguntas dele e ofereça call de fechamento amanhã. <strong style={{ color: t.boldInk }}>Janela ideal: hoje antes das 18h.</strong>
                </div>
                <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
                  <Button t={t} variant="bold" size="sm" bold>Redigir email</Button>
                  <Button t={t} variant="ghost" size="sm" style={{ color: "#F4F3EF" }}>Agendar call</Button>
                </div>
              </div>
            </div>

            {/* Timeline */}
            {[
              { ic: Icons.phone, c: t.primary, bg: t.primarySoft, t: "Call · 30min com Rafael Lima", time: "há 2h", body: "Discutimos SLA enterprise, pricing para 50+ usuários e integração com SAP. Rafael vai apresentar ao board amanhã." },
              { ic: Icons.mail,  c: t.warn,    bg: t.warnSoft,    t: "Email · Proposta atualizada enviada", time: "há 1d", body: "Versão v3 com desconto progressivo e SLA 24/7. Anexo: PDF 12 páginas." },
              { ic: Icons.sparkle, c: t.boldInk, bg: t.bold, t: "IA · probabilidade subiu para 70%", time: "há 1d", body: "+12pp após: engajamento alto na call, CEO copiou email, segundo contato adicionado." },
              { ic: Icons.calendar, c: t.text, bg: t.bgSubtle, t: "Demo realizada com Rafael + CTO", time: "há 5d", body: "60min. Mostramos módulos de Operações e Analytics. CTO fez 8 perguntas técnicas." },
            ].map((e, i, arr) => (
              <div key={i} style={{ display: "flex", gap: 14, paddingBottom: 18, position: "relative" }}>
                {i < arr.length - 1 && <div style={{ position: "absolute", left: 15, top: 34, bottom: 0, width: 1, background: t.border }}/>}
                <div style={{ width: 32, height: 32, borderRadius: 9, background: e.bg, color: e.c === t.boldInk ? "#0A0A0A" : e.c, display: "grid", placeItems: "center", flexShrink: 0, boxShadow: `0 0 0 3px ${t.bg}` }}>
                  <Icon d={e.ic} size={15}/>
                </div>
                <div style={{ flex: 1, paddingTop: 4 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                    <span style={{ fontSize: 13.5, fontWeight: 600 }}>{e.t}</span>
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

// ================================================================
//                         LOGIN
// ================================================================
function LoginScreen({ t, onLogin }) {
  const [step, setStep] = React.useState("email"); // email | password
  const [email, setEmail] = React.useState("marina@acme.com");

  return (
    <div style={{
      display: "flex", height: "100%", background: t.bg, color: t.text,
      fontFamily: OMNIFY_FONTS.sans,
    }}>
      {/* Left — form */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "40px 60px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: t.bold, color: t.boldInk, display: "grid", placeItems: "center" }}>
            <OmnifyMark size={20} color={t.boldInk}/>
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: -0.3 }}>OmniFy<span style={{ color: t.bold }}>.</span></div>
        </div>

        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: "100%", maxWidth: 380 }}>
            <h1 style={{ margin: 0, fontSize: 40, fontWeight: 500, letterSpacing: -1, fontFamily: OMNIFY_FONTS.display, lineHeight: 1.1, marginBottom: 10 }}>
              Bem-vinda, de <em style={{ fontStyle: "italic", color: t.textMuted }}>volta</em>.
            </h1>
            <p style={{ fontSize: 14, color: t.textMuted, margin: "0 0 28px", lineHeight: 1.5 }}>
              Entre no seu workspace pra continuar vendendo com IA.
            </p>

            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11.5, fontWeight: 600, marginBottom: 6 }}>Email de trabalho</div>
              <div style={{ padding: "11px 14px", borderRadius: 10, background: t.surface, border: `1px solid ${step === "email" ? t.bold : t.border}`, fontSize: 13.5, color: t.text }}>{email}</div>
            </div>

            {step === "password" && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11.5, fontWeight: 600, marginBottom: 6 }}>Senha</div>
                <div style={{ padding: "11px 14px", borderRadius: 10, background: t.surface, border: `1px solid ${t.bold}`, fontSize: 13.5, color: t.text, letterSpacing: 3 }}>••••••••••</div>
                <div style={{ fontSize: 11.5, color: t.textMuted, marginTop: 6, textDecoration: "underline", cursor: "pointer" }}>Esqueceu a senha?</div>
              </div>
            )}

            <button onClick={() => step === "email" ? setStep("password") : onLogin()} style={{
              width: "100%", padding: "13px 16px", borderRadius: 10,
              background: t.bold, color: "#F4F3EF", border: "none",
              fontSize: 14, fontWeight: 600, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              fontFamily: "inherit", marginTop: 8,
            }}>
              {step === "email" ? "Continuar" : "Entrar no OmniFy"}
              <Icon d={Icons.chevR} size={14}/>
            </button>

            <div style={{ fontSize: 12, color: t.textMuted, marginTop: 28, textAlign: "center" }}>
              Novo no OmniFy? <span style={{ color: t.text, fontWeight: 600, textDecoration: "underline", cursor: "pointer" }}>Criar workspace</span>
            </div>
          </div>
        </div>

        <div style={{ fontSize: 11, color: t.textSubtle, display: "flex", justifyContent: "space-between" }}>
          <span>© 2026 OmniFy Tech</span>
          <span>pt-BR · v1.2.4</span>
        </div>
      </div>

      {/* Right — hero */}
      <div style={{ flex: 1, background: t.bold, color: "#F4F3EF", display: "flex", flexDirection: "column", padding: "40px 60px", position: "relative", overflow: "hidden" }}>
        <div style={{ display: "flex", gap: 6, fontSize: 11, color: "rgba(255,255,255,0.5)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>
          <span style={{ width: 16, height: 1, background: t.boldInk, alignSelf: "center" }}/> Q2 2026
        </div>

        <div style={{ flex: 1, display: "flex", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 54, fontWeight: 500, letterSpacing: -1.8, fontFamily: OMNIFY_FONTS.display, lineHeight: 1.02, marginBottom: 18 }}>
              Vendas<br/>que <em style={{ fontStyle: "italic", color: t.boldInk }}>pensam</em><br/>por você.
            </div>
            <div style={{ fontSize: 15, color: "rgba(255,255,255,0.65)", maxWidth: 420, lineHeight: 1.55 }}>
              SDR autônomo que qualifica 24/7. Ads que se otimizam sozinhos. Pipeline que sabe quem fechar primeiro.
            </div>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20, paddingTop: 24, borderTop: `1px solid rgba(255,255,255,0.1)` }}>
          {[
            { v: "4.2x", l: "ROI médio" },
            { v: "−18min", l: "tempo 1º toque" },
            { v: "R$ 12K", l: "economia/mês" },
          ].map((s, i) => (
            <div key={i}>
              <div style={{ fontSize: 24, fontWeight: 600, color: t.boldInk, fontFamily: OMNIFY_FONTS.display, letterSpacing: -0.5 }}>{s.v}</div>
              <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: 1, marginTop: 3 }}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, {
  InboxScreen, CompaniesScreen, ActivitiesScreen, ReportsScreen,
  SdrScreen, AdsScreen, SegmentsScreen, DealDetailScreen, LoginScreen,
});
