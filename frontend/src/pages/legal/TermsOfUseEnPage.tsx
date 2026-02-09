import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, FileText, Shield, AlertTriangle, Server, Settings, Headphones, RefreshCw, Ban, UserCheck, Mail, Scale, Zap, Lock, ExternalLink, Globe, MessageSquare } from 'lucide-react'

export function TermsOfUseEnPage() {
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
            <span>Back</span>
          </Link>
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/termos-de-uso')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700/50 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors text-sm"
              title="Versão em Português"
            >
              <Globe className="w-4 h-4" />
              <span>PT</span>
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
                Terms of Use
              </h1>
              <p className="text-slate-400">
                Effective Date: February 3, 2026
              </p>
            </div>

            {/* Sections */}
            <div className="space-y-10 text-slate-300">
              {/* 1. Acceptance of Terms */}
              <Section icon={FileText} title="1. Acceptance of Terms">
                <p>
                  By subscribing, accessing, or using the system, you declare that you have read and agree to these Terms of Use.
                  Access to the system is granted on the condition of full acceptance of these terms.
                </p>
              </Section>

              {/* 2. About the System and Scope */}
              <Section icon={Zap} title="2. About the System and Scope">
                <p className="mb-4">
                  The system is operated by <strong className="text-white">OMNIFY SERVIÇOS LTDA</strong>,
                  trade name <strong className="text-white">OMNIFY HUB</strong> (Tax ID/CNPJ 64.962.976/0001-28).
                </p>
                <p>
                  The service may include integration features and support for the official WhatsApp Business API,
                  as well as automation, customer service, and management functionalities, according to the contracted plan.
                </p>
              </Section>

              {/* 3. WhatsApp Business API Usage */}
              <Section icon={MessageSquare} title="3. WhatsApp Business API Usage">
                <p className="mb-4">
                  OMNIFY HUB provides integration with Meta's WhatsApp Business API. By using this feature:
                </p>
                <ul className="space-y-2">
                  <li className="flex items-start gap-3">
                    <span className="text-cyan-400 mt-1">&bull;</span>
                    <span>You authorize us to access your WhatsApp Business Account to enable messaging capabilities;</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-cyan-400 mt-1">&bull;</span>
                    <span>You agree to comply with Meta's WhatsApp Business Policy and Commerce Policy;</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-cyan-400 mt-1">&bull;</span>
                    <span>You are solely responsible for the content of messages sent through your account;</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-cyan-400 mt-1">&bull;</span>
                    <span>You understand that message templates must be approved by Meta before use.</span>
                  </li>
                </ul>
                <div className="mt-4 p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
                  <p className="text-cyan-200 text-sm">
                    <strong>Important:</strong> WhatsApp messaging is subject to Meta's terms, rate limits, and policies.
                    Account restrictions or bans imposed by Meta are the user's responsibility.
                  </p>
                </div>
              </Section>

              {/* 4. No Guarantee of Results */}
              <Section icon={AlertTriangle} title="4. No Guarantee of Results">
                <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                  <p className="text-amber-200">
                    The use of the system <strong>does not guarantee</strong> commercial, operational, or financial results.
                    Any reference to performance, earnings, metrics, or strategies is merely
                    illustrative and does not constitute a promise of results.
                  </p>
                </div>
              </Section>

              {/* 5. Dependence on Third-Party Services */}
              <Section icon={ExternalLink} title="5. Dependence on Third-Party Services">
                <p className="mb-4">
                  Part of the functionality may depend on third-party services (including, for example,
                  external platforms and APIs such as Meta/WhatsApp). Therefore:
                </p>
                <ul className="space-y-2">
                  <li className="flex items-start gap-3">
                    <span className="text-cyan-400 mt-1">&bull;</span>
                    <span>we do not guarantee continuous availability, stability, or uninterrupted operation of third-party services;</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-cyan-400 mt-1">&bull;</span>
                    <span>changes, restrictions, blocks, usage limits, policies, and instabilities of these services may impact integrations and system features.</span>
                  </li>
                </ul>
              </Section>

              {/* 6. Configuration, Installation, and Maintenance */}
              <Section icon={Settings} title="6. Configuration, Installation, and Maintenance">
                <p>
                  When configuration/implementation support is available, it may be provided
                  according to the contracted plan and/or agreed conditions. Client infrastructure maintenance
                  (server, network, domain, DNS, providers, permissions, third-party accounts, etc.)
                  <strong className="text-white"> is not included</strong>, unless expressly contracted.
                </p>
              </Section>

              {/* 7. Support and Service */}
              <Section icon={Headphones} title="7. Support and Service">
                <p className="mb-4">
                  Support and its channels (and their response times) vary according to the current plan/contract.
                  Whenever there is a community/group channel, you acknowledge that:
                </p>
                <ul className="space-y-2">
                  <li className="flex items-start gap-3">
                    <span className="text-cyan-400 mt-1">&bull;</span>
                    <span>response times may vary;</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-cyan-400 mt-1">&bull;</span>
                    <span>community guidance does not replace formally contracted support.</span>
                  </li>
                </ul>
              </Section>

              {/* 8. Changes to System and Terms */}
              <Section icon={RefreshCw} title="8. Changes to System and Terms">
                <p>
                  We may update features, content, technical routines, and these Terms of Use
                  for improvements, legal compliance, security, and product evolution.
                  When applicable, we will communicate through available channels.
                </p>
              </Section>

              {/* 9. Suspension and Termination of Services */}
              <Section icon={Ban} title="9. Suspension and Termination of Services">
                <p className="mb-4">
                  We may suspend or terminate access to the system (in whole or in part) in cases such as:
                </p>
                <ul className="space-y-2">
                  <li className="flex items-start gap-3">
                    <span className="text-red-400 mt-1">&bull;</span>
                    <span>violation of these terms;</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-red-400 mt-1">&bull;</span>
                    <span>improper, fraudulent use or use that creates technical/legal risk;</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-red-400 mt-1">&bull;</span>
                    <span>legal requirement or determination by competent authority;</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-red-400 mt-1">&bull;</span>
                    <span>need for platform security and integrity.</span>
                  </li>
                </ul>
              </Section>

              {/* 10. User Responsibility */}
              <Section icon={UserCheck} title="10. User Responsibility">
                <p className="mb-4">The user is responsible for:</p>
                <ul className="space-y-2">
                  <li className="flex items-start gap-3">
                    <span className="text-cyan-400 mt-1">&bull;</span>
                    <span>ensuring they have legal basis and authorization to process data and contact people (including WhatsApp messages, when applicable);</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-cyan-400 mt-1">&bull;</span>
                    <span>maintaining confidentiality of passwords, keys, tokens, and credentials;</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-cyan-400 mt-1">&bull;</span>
                    <span>reviewing integration settings and ensuring compliance with third-party rules;</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-cyan-400 mt-1">&bull;</span>
                    <span>content of messages, campaigns, automations, and data entered into the system;</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-cyan-400 mt-1">&bull;</span>
                    <span>compliance with Meta's WhatsApp Business Policy and obtaining proper consent from message recipients.</span>
                  </li>
                </ul>
              </Section>

              {/* 11. Contact */}
              <Section icon={Mail} title="11. Contact">
                <div className="bg-slate-700/30 rounded-xl p-6 space-y-3">
                  <InfoRow label="Company" value="OMNIFY SERVIÇOS LTDA (OMNIFY HUB)" />
                  <InfoRow label="Tax ID (CNPJ)" value="64.962.976/0001-28" />
                  <InfoRow label="Address" value="R Mariano Sendra dos Santos, s/n, Box 8, Centro, CEP 25.010-080, Duque de Caxias/RJ, Brazil" />
                  <InfoRow label="Email" value="omnify@gmail.com" />
                  <InfoRow label="Phone/WhatsApp" value="+55 21 9035-5975" />
                </div>
              </Section>

              {/* Divider */}
              <div className="border-t border-white/10 pt-10">
                <div className="text-center mb-8">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/20 mb-4">
                    <Scale className="w-6 h-6 text-amber-400" />
                  </div>
                  <h2 className="text-2xl font-bold text-white">
                    Liability Terms (Disclaimer)
                  </h2>
                </div>
              </div>

              {/* Disclaimer 1 */}
              <Section icon={AlertTriangle} title="1. Use at User's Own Risk">
                <p>
                  The user acknowledges that the use of the system, its integrations, automations,
                  and operational decisions derived from it are their <strong className="text-white">sole responsibility</strong>.
                </p>
              </Section>

              {/* Disclaimer 2 */}
              <Section icon={Shield} title="2. Compliance and Legal Bases">
                <p className="mb-4">The user is solely responsible for:</p>
                <ul className="space-y-2">
                  <li className="flex items-start gap-3">
                    <span className="text-cyan-400 mt-1">&bull;</span>
                    <span>obtaining necessary consents, permissions, and legal bases;</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-cyan-400 mt-1">&bull;</span>
                    <span>complying with LGPD (Brazil's data protection law) and other applicable regulations;</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-cyan-400 mt-1">&bull;</span>
                    <span>respecting rules and policies of third-party platforms (including WhatsApp/Meta, when applicable).</span>
                  </li>
                </ul>
              </Section>

              {/* Disclaimer 3 */}
              <Section icon={FileText} title="3. Content and Messages Sent">
                <p className="mb-4">OMNIFY SERVIÇOS LTDA <strong className="text-white">is not responsible</strong> for:</p>
                <ul className="space-y-2">
                  <li className="flex items-start gap-3">
                    <span className="text-amber-400 mt-1">&bull;</span>
                    <span>content created/sent by the user;</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-amber-400 mt-1">&bull;</span>
                    <span>contact lists, lead origin, broadcasts, templates, tags, campaigns, and automations;</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-amber-400 mt-1">&bull;</span>
                    <span>blocks, reports, bans, sending limitations, account or number restrictions resulting from user's use.</span>
                  </li>
                </ul>
              </Section>

              {/* Disclaimer 4 */}
              <Section icon={Server} title="4. Integrations and Third-Party Services">
                <p>
                  We are not responsible for failures, unavailability, changes, API suspension,
                  policy changes, technical limits, or any impact caused by third-party services
                  integrated with the system.
                </p>
              </Section>

              {/* Disclaimer 5 */}
              <Section icon={Scale} title="5. Limitation of Liability">
                <div className="p-4 bg-slate-700/50 border border-white/10 rounded-lg">
                  <p>
                    To the maximum extent permitted by law, OMNIFY SERVIÇOS LTDA <strong className="text-white">shall not be liable</strong> for
                    indirect losses, lost profits, moral damages, data loss, revenue loss, business interruptions,
                    or damages resulting from the use (or inability to use) the system, integrations, and third-party services.
                  </p>
                </div>
              </Section>

              {/* Disclaimer 6 */}
              <Section icon={Lock} title="6. Security and Credentials">
                <p>
                  The user is responsible for protecting access to the account, devices, and credentials
                  (passwords, tokens, keys, and permissions). Any action performed with your credentials
                  will be considered your responsibility.
                </p>
              </Section>

              {/* Disclaimer 7 */}
              <Section icon={RefreshCw} title="7. Updates and Changes">
                <p>
                  The user understands that software and integrations evolve, and that changes may
                  require technical and operational adjustments in the user's environment.
                </p>
              </Section>

              {/* Disclaimer 8 - Contact */}
              <Section icon={Mail} title="8. Controller/Operator Contact">
                <div className="bg-slate-700/30 rounded-xl p-6 space-y-3">
                  <InfoRow label="Company" value="OMNIFY SERVIÇOS LTDA (OMNIFY HUB)" />
                  <InfoRow label="Tax ID (CNPJ)" value="64.962.976/0001-28" />
                  <InfoRow label="Email" value="omnify@gmail.com" />
                  <InfoRow label="Phone/WhatsApp" value="+55 21 9035-5975" />
                </div>
              </Section>
            </div>
          </div>

          {/* Footer */}
          <footer className="text-center mt-8 text-slate-500 text-sm pb-8">
            <p>&copy; {new Date().getFullYear()} OMNIFY HUB. All rights reserved.</p>
            <div className="mt-4 flex justify-center gap-4">
              <Link to="/privacy-en" className="text-cyan-400 hover:text-cyan-300 transition-colors">
                Privacy Policy
              </Link>
            </div>
          </footer>
        </div>
      </main>
    </div>
  )
}

// Helper Components
function Section({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
          <Icon className="w-5 h-5 text-cyan-400" />
        </div>
        <h2 className="text-xl font-semibold text-white">{title}</h2>
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
      <span className="text-slate-400 text-sm min-w-[140px]">{label}:</span>
      <span className="text-white">{value}</span>
    </div>
  )
}
