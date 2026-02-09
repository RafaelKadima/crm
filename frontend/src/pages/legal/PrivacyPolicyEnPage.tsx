import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Shield, Building2, Database, Share2, Clock, Lock, UserCheck, AlertCircle, Power, FileText, Mail, Globe, MessageSquare } from 'lucide-react'

export function PrivacyPolicyEnPage() {
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
              onClick={() => navigate('/politica-privacidade')}
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
              <Shield className="w-8 h-8 text-cyan-400" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Privacy Policy
            </h1>
            <p className="text-slate-400">
              Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>

          {/* Sections */}
          <div className="space-y-10 text-slate-300">
            {/* 1. Introduction */}
            <Section icon={FileText} title="1. Introduction">
              <p>
                This Privacy Policy describes how OMNIFY SERVIÇOS LTDA, through OMNIFY HUB,
                collects, uses, stores, shares, and protects personal data of users when accessing and using
                our system (including integration features and support for the official WhatsApp Business API).
              </p>
              <p className="mt-4">
                By using our services, you agree to the collection and use of information in accordance with this policy.
              </p>
            </Section>

            {/* 2. Who we are */}
            <Section icon={Building2} title="2. Who We Are (Data Controller)">
              <div className="bg-slate-700/30 rounded-xl p-6 space-y-3">
                <InfoRow label="Legal Name" value="OMNIFY SERVIÇOS LTDA" />
                <InfoRow label="Trade Name" value="OMNIFY HUB" />
                <InfoRow label="Tax ID (CNPJ)" value="64.962.976/0001-28" />
                <InfoRow label="Address" value="R Mariano Sendra dos Santos, s/n, Box 8, Centro, CEP 25.010-080, Duque de Caxias/RJ, Brazil" />
                <InfoRow label="Email" value="omnify@gmail.com" />
                <InfoRow label="Phone/WhatsApp" value="+55 21 9035-5975" />
              </div>
            </Section>

            {/* 3. Data we collect */}
            <Section icon={Database} title="3. Data We Collect">
              <p className="mb-4">We may collect, depending on system usage and information you provide:</p>
              <ul className="space-y-3">
                <ListItem title="Registration data">
                  name, email, phone number, company/legal name (when applicable).
                </ListItem>
                <ListItem title="Access and usage data">
                  access logs, IP address, date/time, pages/features used, technical records for diagnostics.
                </ListItem>
                <ListItem title="Billing and payment data">
                  information necessary to process payments and billing (e.g., billing status, transaction identification).
                </ListItem>
                <ListItem title="Integration data">
                  technical identifiers and data necessary to enable integrations (e.g., configuration parameters and tokens/keys you register in the system).
                </ListItem>
              </ul>
              <div className="mt-4 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <p className="text-amber-200 text-sm">
                  <strong>Important:</strong> Messages and data exchanged via integrations (e.g., WhatsApp) may be
                  processed according to the purpose of the activated feature and the user's/company's own settings.
                </p>
              </div>
            </Section>

            {/* 4. WhatsApp/Meta Integration - NEW SECTION for Meta compliance */}
            <Section icon={MessageSquare} title="4. WhatsApp Business API Integration">
              <p className="mb-4">
                OMNIFY HUB integrates with the official WhatsApp Business API provided by Meta Platforms, Inc.
                When you connect your WhatsApp Business Account to our platform:
              </p>
              <ul className="space-y-3">
                <ListItem title="Data shared with Meta">
                  Phone numbers, message content, media files, and delivery status are transmitted through Meta's infrastructure as required for WhatsApp messaging functionality.
                </ListItem>
                <ListItem title="Business Account information">
                  We access your WhatsApp Business Account ID, phone number ID, display name, and verification status to enable messaging capabilities.
                </ListItem>
                <ListItem title="Message templates">
                  Template content and approval status are synchronized between our platform and Meta's systems.
                </ListItem>
                <ListItem title="Access tokens">
                  We securely store encrypted access tokens to maintain your WhatsApp Business API connection.
                </ListItem>
              </ul>
              <div className="mt-4 p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
                <p className="text-cyan-200 text-sm">
                  <strong>Note:</strong> Meta's own privacy policy and terms apply to data processed through WhatsApp Business API.
                  Users are responsible for ensuring their messaging practices comply with Meta's Commerce Policy and WhatsApp Business Policy.
                </p>
              </div>
            </Section>

            {/* 5. How we use the data */}
            <Section icon={Shield} title="5. How We Use Your Data (Purposes)">
              <p className="mb-4">We use personal data to:</p>
              <ul className="space-y-2">
                <li className="flex items-start gap-3">
                  <span className="text-cyan-400 mt-1">&bull;</span>
                  <span>Create and manage your account, authenticate access, and maintain system functionality;</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-cyan-400 mt-1">&bull;</span>
                  <span>Provide support and assistance, including error analysis and performance improvement;</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-cyan-400 mt-1">&bull;</span>
                  <span>Process payments, billing, and related obligations;</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-cyan-400 mt-1">&bull;</span>
                  <span>Send important communications about security, system changes, updates, and operational notices;</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-cyan-400 mt-1">&bull;</span>
                  <span>Enable WhatsApp Business messaging on your behalf when you connect your account;</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-cyan-400 mt-1">&bull;</span>
                  <span>Comply with legal/regulatory obligations and prevent fraud/misuse.</span>
                </li>
              </ul>
            </Section>

            {/* 6. Data sharing */}
            <Section icon={Share2} title="6. Data Sharing">
              <p className="mb-4">
                <strong className="text-white">We do not sell your data.</strong> We may share data only when necessary for:
              </p>
              <ul className="space-y-2">
                <li className="flex items-start gap-3">
                  <span className="text-cyan-400 mt-1">&bull;</span>
                  <span>Payment processing (e.g., acquirers, gateways, banks);</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-cyan-400 mt-1">&bull;</span>
                  <span>Infrastructure/technology (e.g., hosting, storage, monitoring and email tools), strictly to operate the service;</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-cyan-400 mt-1">&bull;</span>
                  <span><strong className="text-white">Meta Platforms, Inc. (WhatsApp)</strong> – for WhatsApp Business API functionality, including message delivery, template management, and account verification;</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-cyan-400 mt-1">&bull;</span>
                  <span>Legal compliance (court order, regulatory obligations, competent authority requests);</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-cyan-400 mt-1">&bull;</span>
                  <span>Integrations activated by the user (e.g., providers and APIs you choose to connect to the system).</span>
                </li>
              </ul>
              <p className="mt-4 text-slate-400">
                Whenever possible, we require that providers treat data with compatible confidentiality and security.
              </p>
            </Section>

            {/* 7. Storage and retention */}
            <Section icon={Clock} title="7. Storage and Retention">
              <p className="mb-4">We retain data for as long as necessary to:</p>
              <ul className="space-y-2">
                <li className="flex items-start gap-3">
                  <span className="text-cyan-400 mt-1">&bull;</span>
                  <span>provide the service and fulfill the contract;</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-cyan-400 mt-1">&bull;</span>
                  <span>meet legal obligations and audits;</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-cyan-400 mt-1">&bull;</span>
                  <span>protect rights and prevent fraud.</span>
                </li>
              </ul>
              <p className="mt-4 text-slate-400">
                When no longer needed, data may be deleted or anonymized, respecting legal requirements.
              </p>
            </Section>

            {/* 8. Information security */}
            <Section icon={Lock} title="8. Information Security">
              <p>
                We adopt technical and organizational measures to protect data against unauthorized access, loss,
                alteration, disclosure, or destruction, including access controls and security best practices.
              </p>
              <p className="mt-4 text-slate-400">
                However, no system is 100% invulnerable; therefore, you should also protect your credentials
                and keep your devices secure.
              </p>
            </Section>

            {/* 9. Your rights */}
            <Section icon={UserCheck} title="9. Your Rights">
              <p className="mb-4">You may request, as applicable:</p>
              <ul className="space-y-2">
                <li className="flex items-start gap-3">
                  <span className="text-cyan-400 mt-1">&bull;</span>
                  <span>confirmation of processing and access to data;</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-cyan-400 mt-1">&bull;</span>
                  <span>correction of incomplete/inaccurate data;</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-cyan-400 mt-1">&bull;</span>
                  <span>anonymization, blocking, or deletion;</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-cyan-400 mt-1">&bull;</span>
                  <span>data portability (when applicable);</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-cyan-400 mt-1">&bull;</span>
                  <span>information about sharing;</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-cyan-400 mt-1">&bull;</span>
                  <span>revocation of consent (when processing depends on consent).</span>
                </li>
              </ul>
              <div className="mt-4 p-4 bg-slate-700/30 rounded-lg">
                <p className="text-sm">
                  <strong className="text-white">To exercise your rights:</strong> Contact us at <span className="text-cyan-400">omnify@gmail.com</span> with
                  your request. We will respond within 15 business days.
                </p>
              </div>
            </Section>

            {/* 10. User responsibility */}
            <Section icon={AlertCircle} title="10. User Responsibility">
              <p className="mb-4">You are responsible for:</p>
              <ul className="space-y-2">
                <li className="flex items-start gap-3">
                  <span className="text-cyan-400 mt-1">&bull;</span>
                  <span>the information you enter into the system;</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-cyan-400 mt-1">&bull;</span>
                  <span>maintaining confidentiality of passwords/tokens/integration keys;</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-cyan-400 mt-1">&bull;</span>
                  <span>your use of the knowledge and features (including software, automations, and integrations you create);</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-cyan-400 mt-1">&bull;</span>
                  <span>ensuring your WhatsApp messaging practices comply with Meta's policies.</span>
                </li>
              </ul>
              <p className="mt-4 text-slate-400">
                We are not responsible for damages resulting from system misuse, incorrectly configured integrations,
                or misuse of credentials by third parties.
              </p>
            </Section>

            {/* 11. Service termination */}
            <Section icon={Power} title="11. Service Termination">
              <p>
                We may, for operational, legal, or commercial reasons, discontinue features or terminate the service
                offering, observing applicable communications and obligations.
              </p>
              <p className="mt-4 text-slate-400">
                If there is an active subscription/plan, access is guaranteed during its term; after termination,
                access may be ended according to the contracted plan conditions.
              </p>
            </Section>

            {/* 12. Policy changes */}
            <Section icon={FileText} title="12. Changes to This Policy">
              <p>
                We may update this Policy at any time. If there are relevant changes, we will communicate
                through available channels (e.g., email and system notices).
              </p>
            </Section>

            {/* 13. Contact */}
            <Section icon={Mail} title="13. Contact">
              <p className="mb-4">
                For questions, requests, or privacy matters, contact us:
              </p>
              <div className="bg-slate-700/30 rounded-xl p-6 space-y-3">
                <InfoRow label="Company" value="OMNIFY SERVIÇOS LTDA (OMNIFY HUB)" />
                <InfoRow label="Tax ID (CNPJ)" value="64.962.976/0001-28" />
                <InfoRow label="Email" value="omnify@gmail.com" />
                <InfoRow label="Phone/WhatsApp" value="+55 21 9035-5975" />
                <InfoRow label="Address" value="R Mariano Sendra dos Santos, s/n, Box 8, Centro, CEP 25.010-080, Duque de Caxias/RJ, Brazil" />
              </div>
            </Section>
          </div>
        </div>

          {/* Footer */}
          <footer className="text-center mt-8 text-slate-500 text-sm pb-8">
            <p>&copy; {new Date().getFullYear()} OMNIFY HUB. All rights reserved.</p>
            <div className="mt-4 flex justify-center gap-4">
              <Link to="/terms-en" className="text-cyan-400 hover:text-cyan-300 transition-colors">
                Terms of Use
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

function ListItem({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="text-cyan-400 mt-1">&bull;</span>
      <div>
        <strong className="text-white">{title}: </strong>
        <span>{children}</span>
      </div>
    </li>
  )
}
