import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, FileText, Shield, AlertTriangle, Server, Settings, Headphones, RefreshCw, Ban, UserCheck, Mail, Scale, Zap, Lock, ExternalLink, Globe } from 'lucide-react'

export function TermsOfUsePage() {
  const navigate = useNavigate()

  return (
    <div className="h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-y-auto">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-white/10 bg-slate-900/95 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link
            to="/login"
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar</span>
          </Link>
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/terms-en')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700/50 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors text-sm"
              title="English Version"
            >
              <Globe className="w-4 h-4" />
              <span>EN</span>
            </button>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-cyan-400" />
              <span className="font-semibold text-white">OMNIFY HUB</span>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main>
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="bg-slate-800/50 border border-white/10 rounded-2xl p-8 md:p-12 backdrop-blur-sm">
            {/* Title */}
            <div className="text-center mb-12">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-cyan-500/10 border border-cyan-500/20 mb-6">
                <FileText className="w-8 h-8 text-cyan-400" />
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Termos de Uso
              </h1>
              <p className="text-slate-400">
                Data de disponibilidade: 03/02/2026
              </p>
            </div>

            {/* Sections */}
            <div className="space-y-10 text-slate-300">
              {/* 1. Aceitação dos Termos */}
              <Section icon={FileText} title="1. Aceita&ccedil;&atilde;o dos Termos">
                <p>
                  Ao contratar, acessar ou utilizar o sistema, voc&ecirc; declara que leu e concorda com estes Termos de Uso.
                  O acesso ao sistema &eacute; concedido sob a condi&ccedil;&atilde;o de aceita&ccedil;&atilde;o integral destes termos.
                </p>
              </Section>

              {/* 2. Sobre o Sistema e Escopo */}
              <Section icon={Zap} title="2. Sobre o Sistema e Escopo">
                <p className="mb-4">
                  O sistema &eacute; operado por <strong className="text-white">OMNIFY SERVI&Ccedil;OS LTDA</strong>,
                  nome fantasia <strong className="text-white">OMNIFY HUB</strong> (CNPJ 64.962.976/0001-28).
                </p>
                <p>
                  O servi&ccedil;o pode incluir recursos de integra&ccedil;&atilde;o e suporte &agrave; API oficial do WhatsApp,
                  bem como funcionalidades de automa&ccedil;&atilde;o, atendimento e gest&atilde;o, conforme o plano contratado.
                </p>
              </Section>

              {/* 3. Não garantia de resultados */}
              <Section icon={AlertTriangle} title="3. N&atilde;o garantia de resultados">
                <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                  <p className="text-amber-200">
                    O uso do sistema <strong>n&atilde;o garante</strong> resultados comerciais, operacionais ou financeiros.
                    Qualquer refer&ecirc;ncia a desempenho, ganhos, m&eacute;tricas ou estrat&eacute;gias &eacute; meramente
                    ilustrativa e n&atilde;o constitui promessa de resultado.
                  </p>
                </div>
              </Section>

              {/* 4. Dependência de serviços de terceiros */}
              <Section icon={ExternalLink} title="4. Depend&ecirc;ncia de servi&ccedil;os de terceiros">
                <p className="mb-4">
                  Parte das funcionalidades pode depender de servi&ccedil;os de terceiros (incluindo, por exemplo,
                  plataformas e APIs externas). Assim:
                </p>
                <ul className="space-y-2">
                  <li className="flex items-start gap-3">
                    <span className="text-cyan-400 mt-1">&bull;</span>
                    <span>n&atilde;o garantimos disponibilidade cont&iacute;nua, estabilidade ou funcionamento ininterrupto de servi&ccedil;os de terceiros;</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-cyan-400 mt-1">&bull;</span>
                    <span>mudan&ccedil;as, restri&ccedil;&otilde;es, bloqueios, limites de uso, pol&iacute;ticas e instabilidades desses servi&ccedil;os podem impactar integra&ccedil;&otilde;es e recursos do sistema.</span>
                  </li>
                </ul>
              </Section>

              {/* 5. Configuração, instalação e manutenção */}
              <Section icon={Settings} title="5. Configura&ccedil;&atilde;o, instala&ccedil;&atilde;o e manuten&ccedil;&atilde;o">
                <p>
                  Quando houver suporte de configura&ccedil;&atilde;o/implanta&ccedil;&atilde;o, isso poder&aacute; ser prestado
                  conforme o plano contratado e/ou condi&ccedil;&otilde;es acordadas. Manuten&ccedil;&otilde;es de infraestrutura
                  do cliente (servidor, rede, dom&iacute;nio, DNS, provedores, permiss&otilde;es, contas de terceiros etc.)
                  <strong className="text-white"> n&atilde;o est&atilde;o inclu&iacute;das</strong>, salvo contrata&ccedil;&atilde;o expressa.
                </p>
              </Section>

              {/* 6. Suporte e atendimento */}
              <Section icon={Headphones} title="6. Suporte e atendimento">
                <p className="mb-4">
                  O suporte e seus canais (e seus prazos) variam conforme o plano/contrato vigente.
                  Sempre que houver canal de comunidade/grupo, voc&ecirc; reconhece que:
                </p>
                <ul className="space-y-2">
                  <li className="flex items-start gap-3">
                    <span className="text-cyan-400 mt-1">&bull;</span>
                    <span>prazos de resposta podem variar;</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-cyan-400 mt-1">&bull;</span>
                    <span>orienta&ccedil;&otilde;es em comunidade n&atilde;o substituem suporte contratado formalmente.</span>
                  </li>
                </ul>
              </Section>

              {/* 7. Alterações no sistema e nos termos */}
              <Section icon={RefreshCw} title="7. Altera&ccedil;&otilde;es no sistema e nos termos">
                <p>
                  Podemos atualizar funcionalidades, conte&uacute;dos, rotinas t&eacute;cnicas e estes Termos de Uso
                  para melhorias, adequa&ccedil;&atilde;o legal, seguran&ccedil;a e evolu&ccedil;&atilde;o do produto.
                  Quando aplic&aacute;vel, comunicaremos pelos canais dispon&iacute;veis.
                </p>
              </Section>

              {/* 8. Suspensão e encerramento de serviços */}
              <Section icon={Ban} title="8. Suspens&atilde;o e encerramento de servi&ccedil;os">
                <p className="mb-4">
                  Poderemos suspender ou encerrar o acesso ao sistema (total ou parcial) em casos como:
                </p>
                <ul className="space-y-2">
                  <li className="flex items-start gap-3">
                    <span className="text-red-400 mt-1">&bull;</span>
                    <span>viola&ccedil;&atilde;o destes termos;</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-red-400 mt-1">&bull;</span>
                    <span>uso indevido, fraudulento ou que gere risco t&eacute;cnico/jur&iacute;dico;</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-red-400 mt-1">&bull;</span>
                    <span>exig&ecirc;ncia legal ou determina&ccedil;&atilde;o de autoridade competente;</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-red-400 mt-1">&bull;</span>
                    <span>necessidade de seguran&ccedil;a e integridade da plataforma.</span>
                  </li>
                </ul>
              </Section>

              {/* 9. Responsabilidade do usuário */}
              <Section icon={UserCheck} title="9. Responsabilidade do usu&aacute;rio">
                <p className="mb-4">O usu&aacute;rio &eacute; respons&aacute;vel por:</p>
                <ul className="space-y-2">
                  <li className="flex items-start gap-3">
                    <span className="text-cyan-400 mt-1">&bull;</span>
                    <span>garantir que tem base legal e autoriza&ccedil;&atilde;o para tratar dados e contatar pessoas (incluindo mensagens via WhatsApp, quando aplic&aacute;vel);</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-cyan-400 mt-1">&bull;</span>
                    <span>manter confidencialidade de senhas, chaves, tokens e credenciais;</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-cyan-400 mt-1">&bull;</span>
                    <span>revisar configura&ccedil;&otilde;es de integra&ccedil;&atilde;o e garantir conformidade com regras de terceiros;</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-cyan-400 mt-1">&bull;</span>
                    <span>conte&uacute;do das mensagens, campanhas, automa&ccedil;&otilde;es e dados inseridos no sistema.</span>
                  </li>
                </ul>
              </Section>

              {/* 10. Contato */}
              <Section icon={Mail} title="10. Contato">
                <div className="bg-slate-700/30 rounded-xl p-6 space-y-3">
                  <InfoRow label="Empresa" value="OMNIFY SERVI&Ccedil;OS LTDA (OMNIFY HUB)" />
                  <InfoRow label="CNPJ" value="64.962.976/0001-28" />
                  <InfoRow label="Endere&ccedil;o" value="R Mariano Sendra dos Santos, s/n, Box 8, Centro, CEP 25.010-080, Duque de Caxias/RJ" />
                  <InfoRow label="E-mail" value="omnify@gmail.com" />
                  <InfoRow label="Telefone/WhatsApp" value="(21) 9035-5975" />
                </div>
              </Section>

              {/* Divider */}
              <div className="border-t border-white/10 pt-10">
                <div className="text-center mb-8">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/20 mb-4">
                    <Scale className="w-6 h-6 text-amber-400" />
                  </div>
                  <h2 className="text-2xl font-bold text-white">
                    Termos de Responsabilidade (Isen&ccedil;&atilde;o / Disclaimer)
                  </h2>
                </div>
              </div>

              {/* Disclaimer 1 */}
              <Section icon={AlertTriangle} title="1. Uso por conta e risco do usu&aacute;rio">
                <p>
                  O usu&aacute;rio reconhece que o uso do sistema, suas integra&ccedil;&otilde;es, automa&ccedil;&otilde;es
                  e decis&otilde;es operacionais derivadas dele s&atilde;o de sua <strong className="text-white">responsabilidade exclusiva</strong>.
                </p>
              </Section>

              {/* Disclaimer 2 */}
              <Section icon={Shield} title="2. Conformidade e bases legais">
                <p className="mb-4">O usu&aacute;rio &eacute; o &uacute;nico respons&aacute;vel por:</p>
                <ul className="space-y-2">
                  <li className="flex items-start gap-3">
                    <span className="text-cyan-400 mt-1">&bull;</span>
                    <span>obter consentimentos, permiss&otilde;es e bases legais necess&aacute;rias;</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-cyan-400 mt-1">&bull;</span>
                    <span>cumprir a LGPD e demais normas aplic&aacute;veis;</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-cyan-400 mt-1">&bull;</span>
                    <span>respeitar regras e pol&iacute;ticas de plataformas de terceiros (inclusive WhatsApp/Meta, quando aplic&aacute;vel).</span>
                  </li>
                </ul>
              </Section>

              {/* Disclaimer 3 */}
              <Section icon={FileText} title="3. Conte&uacute;do e mensagens enviadas">
                <p className="mb-4">A OMNIFY SERVI&Ccedil;OS LTDA <strong className="text-white">n&atilde;o se responsabiliza</strong> por:</p>
                <ul className="space-y-2">
                  <li className="flex items-start gap-3">
                    <span className="text-amber-400 mt-1">&bull;</span>
                    <span>conte&uacute;do criado/enviado pelo usu&aacute;rio;</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-amber-400 mt-1">&bull;</span>
                    <span>listas de contatos, origem de leads, disparos, templates, tags, campanhas e automa&ccedil;&otilde;es;</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-amber-400 mt-1">&bull;</span>
                    <span>bloqueios, den&uacute;ncias, banimentos, limita&ccedil;&atilde;o de envio, restri&ccedil;&otilde;es de conta ou n&uacute;mero decorrentes do uso pelo usu&aacute;rio.</span>
                  </li>
                </ul>
              </Section>

              {/* Disclaimer 4 */}
              <Section icon={Server} title="4. Integra&ccedil;&otilde;es e servi&ccedil;os de terceiros">
                <p>
                  N&atilde;o nos responsabilizamos por falhas, indisponibilidades, altera&ccedil;&otilde;es, suspens&atilde;o de APIs,
                  mudan&ccedil;as de pol&iacute;tica, limites t&eacute;cnicos ou qualquer impacto causado por servi&ccedil;os de
                  terceiros integrados ao sistema.
                </p>
              </Section>

              {/* Disclaimer 5 */}
              <Section icon={Scale} title="5. Limita&ccedil;&atilde;o de responsabilidade">
                <div className="p-4 bg-slate-700/50 border border-white/10 rounded-lg">
                  <p>
                    Na m&aacute;xima extens&atilde;o permitida pela lei, a OMNIFY SERVI&Ccedil;OS LTDA <strong className="text-white">n&atilde;o ser&aacute; respons&aacute;vel</strong> por
                    perdas indiretas, lucros cessantes, danos morais, perda de dados, perda de receitas, interrup&ccedil;&otilde;es de neg&oacute;cio
                    ou preju&iacute;zos decorrentes do uso (ou impossibilidade de uso) do sistema, integra&ccedil;&otilde;es e servi&ccedil;os de terceiros.
                  </p>
                </div>
              </Section>

              {/* Disclaimer 6 */}
              <Section icon={Lock} title="6. Seguran&ccedil;a e credenciais">
                <p>
                  O usu&aacute;rio &eacute; respons&aacute;vel por proteger acesso &agrave; conta, dispositivos e credenciais
                  (senhas, tokens, chaves e permiss&otilde;es). Qualquer a&ccedil;&atilde;o realizada com suas credenciais
                  ser&aacute; considerada de sua responsabilidade.
                </p>
              </Section>

              {/* Disclaimer 7 */}
              <Section icon={RefreshCw} title="7. Atualiza&ccedil;&otilde;es e mudan&ccedil;as">
                <p>
                  O usu&aacute;rio entende que softwares e integra&ccedil;&otilde;es evoluem, e que mudan&ccedil;as podem
                  exigir ajustes t&eacute;cnicos e operacionais no ambiente do usu&aacute;rio.
                </p>
              </Section>

              {/* Disclaimer 8 - Contato */}
              <Section icon={Mail} title="8. Contato da controladora/operadora">
                <div className="bg-slate-700/30 rounded-xl p-6 space-y-3">
                  <InfoRow label="Empresa" value="OMNIFY SERVI&Ccedil;OS LTDA (OMNIFY HUB)" />
                  <InfoRow label="CNPJ" value="64.962.976/0001-28" />
                  <InfoRow label="E-mail" value="omnify@gmail.com" />
                  <InfoRow label="Telefone/WhatsApp" value="(21) 9035-5975" />
                </div>
              </Section>
            </div>
          </div>

          {/* Footer */}
          <footer className="text-center mt-8 text-slate-500 text-sm pb-8">
            <p>&copy; {new Date().getFullYear()} OMNIFY HUB. Todos os direitos reservados.</p>
            <div className="mt-4 flex justify-center gap-4">
              <Link to="/privacy" className="text-cyan-400 hover:text-cyan-300 transition-colors">
                Pol&iacute;tica de Privacidade
              </Link>
            </div>
          </footer>
        </div>
      </main>
    </div>
  )
}

// Helper Components
function Section({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
          <Icon className="w-5 h-5 text-cyan-400" />
        </div>
        <h2 className="text-xl font-semibold text-white" dangerouslySetInnerHTML={{ __html: title }} />
      </div>
      <div className="pl-12">
        {children}
      </div>
    </section>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
      <span className="text-slate-400 text-sm min-w-[140px]" dangerouslySetInnerHTML={{ __html: label + ':' }} />
      <span className="text-white" dangerouslySetInnerHTML={{ __html: value }} />
    </div>
  )
}
