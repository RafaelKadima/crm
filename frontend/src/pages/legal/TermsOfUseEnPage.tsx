import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  FileText,
  Shield,
  AlertTriangle,
  Settings,
  Headphones,
  Ban,
  UserCheck,
  Mail,
  Scale,
  Zap,
  Lock,
  ExternalLink,
  Globe,
  MessageSquare,
  BookOpen,
  CreditCard,
  Building2,
  Database,
  Gavel,
} from 'lucide-react'

export function TermsOfUseEnPage() {
  const navigate = useNavigate()

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-y-auto z-50">
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
                General Terms and Conditions of Use
              </h1>
              <p className="text-slate-400">
                Effective Date: February 3, 2026 &middot; Last Updated: May 18, 2026
              </p>
            </div>

            {/* Preamble */}
            <div className="mb-12 p-6 bg-slate-700/30 border border-white/10 rounded-xl text-slate-300 leading-relaxed space-y-3">
              <p>
                These General Terms and Conditions of Use (“Terms”) govern the commercial
                relationship between <strong className="text-white">OMNIFY SERVIÇOS LTDA</strong>,
                trade name <strong className="text-white">OMNIFY HUB</strong>, registered under
                Brazilian Tax ID (CNPJ) <strong className="text-white">64.962.976/0001-28</strong>,
                hereinafter referred to as “OMNIFY” or “CONTRACTOR”, and the individual or legal
                entity that subscribes to the platform, hereinafter referred to as “CLIENT” or
                “CONTRACTING PARTY”.
              </p>
              <p>
                The purpose of this instrument is to regulate the use of the Omnify Hub CRM, a
                customer relationship management, omnichannel customer service, and automation
                system, delivered as Software as a Service (SaaS).
              </p>
              <p className="text-amber-200">
                <strong>BY SUBSCRIBING, ACCESSING, OR USING OMNIFY HUB, THE CLIENT DECLARES TO HAVE
                READ, UNDERSTOOD, AND FULLY ACCEPTED THESE TERMS.</strong>
              </p>
            </div>

            {/* Sections */}
            <div className="space-y-10 text-slate-300">
              {/* 1. Definitions */}
              <Section icon={BookOpen} title="1. Key Definitions">
                <p className="mb-4">For ease of reading and interpretation of this document, the following definitions apply:</p>
                <ul className="space-y-3">
                  <Definition term="Client (or Contracting Party)">
                    Individual or legal entity that contracts access to Omnify Hub, responsible for
                    payment, management of its Users, and the content entered into the system.
                  </Definition>
                  <Definition term="Omnify Hub (or System)">
                    SaaS platform developed and exclusively owned by OMNIFY, intended for customer
                    relationship management (CRM), multichannel customer service, sales pipelines,
                    automation, and integrations with third-party APIs.
                  </Definition>
                  <Definition term="Plan / Subscription">
                    Contractual arrangement granting the Client the right to use the System for the
                    contracted period (monthly, quarterly, or annual), through recurring or upfront
                    payment.
                  </Definition>
                  <Definition term="Store (Tenant)">
                    Logically isolated workspace within the System, assigned to the Client,
                    containing its contacts, pipelines, teams, integrations, and its own settings.
                  </Definition>
                  <Definition term="User">
                    Person authorized by the Client to access the System (super administrator,
                    administrator, supervisor, agent, or other roles), with nominal and individual
                    credentials.
                  </Definition>
                  <Definition term="End Customer / Contact">
                    Individual or legal entity with whom the Client interacts through the System
                    (leads, contacts, message recipients). OMNIFY has no direct relationship with
                    the Client's End Customers.
                  </Definition>
                  <Definition term="WhatsApp Business API (Meta)">
                    Cloud API provided by Meta Platforms for sending and receiving messages via a
                    WhatsApp Business Account (WABA), used by Omnify Hub as its standard,
                    homologated messaging channel.
                  </Definition>
                </ul>
              </Section>

              {/* 2. Nature and Acceptance */}
              <Section icon={FileText} title="2. Nature and Acceptance of the Terms">
                <p className="mb-4">
                  <strong className="text-white">2.1.</strong> By subscribing to a Plan, accessing,
                  or using Omnify Hub, the Client declares to fully accept these Terms. Acceptance
                  is an essential condition for granting access.
                </p>
                <p className="mb-4">
                  <strong className="text-white">2.2.</strong> Payment or the mere start of use of
                  the System implies, for all legal purposes, full, unequivocal, and irrevocable
                  acceptance of all conditions established herein and in their future updates.
                </p>
                <p className="mb-4">
                  <strong className="text-white">2.3.</strong> These Terms have the force of a
                  binding contract, superseding any verbal agreements or prior message exchanges
                  between the parties.
                </p>
                <p className="mb-4">
                  <strong className="text-white">2.4.</strong> Under the apparent authority doctrine,
                  OMNIFY will consider valid any contracting performed through the provision of
                  registration data and payment, with the Client declaring that the person
                  responsible for the purchase has full powers to represent it.
                </p>
                <p>
                  <strong className="text-white">2.5.</strong> OMNIFY may amend these Terms at any
                  time. Continued use of the System after the publication of changes confirms
                  acceptance of the updated Terms.
                </p>
              </Section>

              {/* 3. System and Requirements */}
              <Section icon={Zap} title="3. About the System, Scope, and Technical Requirements">
                <p className="mb-4">
                  <strong className="text-white">3.1.</strong> Omnify Hub is delivered as SaaS
                  (Software as a Service), hosted and maintained by OMNIFY on its own or contracted
                  cloud infrastructure. The Client does not receive installation files, source
                  code, or any right to self-host.
                </p>
                <p className="mb-4">
                  <strong className="text-white">3.2. Workstation Requirements.</strong> For proper
                  use of the System, the following is recommended:
                </p>
                <ul className="space-y-2 mb-4">
                  <Bullet>8GB or more of RAM;</Bullet>
                  <Bullet>Processor equivalent to Intel i5 or higher;</Bullet>
                  <Bullet>Stable internet connection (minimum 10 Mbps);</Bullet>
                  <Bullet>Up-to-date browser (Google Chrome, Microsoft Edge, Firefox, or Safari — latest two stable releases);</Bullet>
                  <Bullet>Up-to-date operating system with JavaScript enabled.</Bullet>
                </ul>
                <p className="mb-4">
                  <strong className="text-white">3.3. Accuracy of Information.</strong> The Client
                  and its Users must provide truthful, accurate, and current information. OMNIFY
                  reserves the right to refuse registrations, suspend, or cancel accounts whose
                  representatives engage in conduct contrary to these Terms, with no need for prior
                  notice or indemnification.
                </p>
                <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                  <p className="text-amber-200 text-sm">
                    <strong>3.4. Unofficial APIs.</strong> If the Client enables, within its
                    account, integrations with unofficial WhatsApp APIs (unauthorized WhatsApp Web,
                    third-party libraries such as WWebJS, Baileys, Evolution, etc.), it does so at
                    its own risk, aware that such integrations are subject to disconnections,
                    message loss, instability, and potential bans by Meta. OMNIFY provides no
                    warranty or support for failures arising from the use of unofficial APIs.
                  </p>
                </div>
              </Section>

              {/* 4. WhatsApp Business API */}
              <Section icon={MessageSquare} title="4. WhatsApp Business API Integration (Meta)">
                <p className="mb-4">
                  <strong className="text-white">4.1.</strong> Omnify Hub uses the official WhatsApp
                  Business Cloud API, provided by Meta Platforms, as its standard, homologated
                  messaging channel.
                </p>
                <p className="mb-4">
                  <strong className="text-white">4.2.</strong> By enabling the integration, the
                  Client:
                </p>
                <ul className="space-y-2 mb-4">
                  <Bullet>authorizes OMNIFY to access its WhatsApp Business Account (WABA) solely to enable messaging features;</Bullet>
                  <Bullet>agrees to comply with the WhatsApp Business Policy and Meta's Commerce Policy (<a href="https://www.whatsapp.com/legal/business-policy" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">whatsapp.com/legal/business-policy</a>);</Bullet>
                  <Bullet>is solely responsible for the content, purpose, and legality of messages sent from its account;</Bullet>
                  <Bullet>understands that message templates (HSM) must be pre-approved by Meta before being sent;</Bullet>
                  <Bullet>acknowledges that restrictions, rate limits, temporary suspensions, and bans imposed by Meta are the Client's responsibility.</Bullet>
                </ul>
                <div className="p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
                  <p className="text-cyan-200 text-sm">
                    <strong>Important:</strong> Meta API unavailability, number blocks, bans, or
                    unilateral policy changes imposed by Meta are beyond OMNIFY's technical and
                    legal control, do not constitute a defect of the System, and do not entitle the
                    Client to a refund.
                  </p>
                </div>
              </Section>

              {/* 5. Plans and Pricing */}
              <Section icon={CreditCard} title="5. Plans, Pricing, Payment, and Renewal">
                <p className="mb-4">
                  <strong className="text-white">5.1. Plans.</strong> Omnify Hub is contracted
                  through Plans with monthly, quarterly, or annual terms, according to the offer in
                  effect. The price, scope of features, user limits, channels, and contact limits
                  are presented at the time of contracting.
                </p>
                <p className="mb-4">
                  <strong className="text-white">5.2. Payment Method.</strong> Payment is made
                  through the means provided by OMNIFY (credit card, PIX, bank slip, or recurring
                  gateway), depending on the contracted Plan.
                </p>
                <p className="mb-4">
                  <strong className="text-white">5.3. Automatic Renewal.</strong> Plans with
                  recurring billing will be automatically renewed at the end of each cycle, for the
                  same period and at the price in effect, unless expressly stated otherwise by the
                  Client with at least 5 (five) days' notice before the renewal date.
                </p>
                <p className="mb-4">
                  <strong className="text-white">5.4. Price Adjustment.</strong> Prices may be
                  adjusted annually based on the IPCA inflation index (or its successor index), or
                  due to changes in operational costs and third-party services (Meta, payment
                  gateways, cloud providers). Any price adjustments will be communicated with at
                  least 30 (thirty) days' notice.
                </p>
                <p className="mb-4">
                  <strong className="text-white">5.5. Default.</strong> In the event of default or
                  undue chargeback, OMNIFY may:
                </p>
                <ul className="space-y-2 mb-4">
                  <Bullet>immediately suspend access to the account and to support;</Bullet>
                  <Bullet>charge a 2% penalty on the outstanding amount, plus 1% per month late-payment interest and monetary correction;</Bullet>
                  <Bullet>refuse new contracts or renewals;</Bullet>
                  <Bullet>permanently terminate the account after 30 (thirty) days of default, with potential data deletion under the retention policy.</Bullet>
                </ul>
                <div className="p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
                  <p className="text-cyan-200 text-sm">
                    <strong>5.6. Right of Withdrawal (Brazilian Consumer Code).</strong> Pursuant to
                    Article 49 of the Brazilian Consumer Protection Code, a Client who is an
                    individual consumer may withdraw from the contract within 7 (seven) calendar
                    days of payment, by email request, with full refund of the amount paid.
                  </p>
                </div>
                <p className="mt-4">
                  <strong className="text-white">5.7. Cancellation after the legal withdrawal
                  period.</strong> After the 7-day period in item 5.6, the Client may cancel
                  renewal at any time, but shall not be entitled to a pro-rata refund of installments
                  or cycles already paid. Access remains active until the end of the current cycle.
                </p>
              </Section>

              {/* 6. Third-Party Variable Costs */}
              <Section icon={ExternalLink} title="6. Variable Costs from Third-Party Services">
                <p className="mb-4">
                  Fees charged by OMNIFY refer exclusively to the license to use the System.
                  Variable costs arising from third-party services integrated with the platform are
                  the sole responsibility of the Client and may change beyond OMNIFY's control,
                  such as:
                </p>
                <ul className="space-y-2">
                  <Bullet>Meta/WhatsApp fees (conversation windows, templates, business-initiated messages, WABA);</Bullet>
                  <Bullet>Artificial Intelligence API consumption (OpenAI, Anthropic, Google, Grok, among others);</Bullet>
                  <Bullet>SMS, transactional email, and integrated payment gateway services;</Bullet>
                  <Bullet>Consumption of external APIs from hubs or connectors configured by the Client.</Bullet>
                </ul>
              </Section>

              {/* 7. Support */}
              <Section icon={Headphones} title="7. Technical Support Policy and SLA">
                <p className="mb-4">
                  <strong className="text-white">7.1. Official Channels.</strong> The official
                  support channel is the ticket portal available inside the System and the email
                  address listed in the contact section of this document.
                </p>
                <p className="mb-4">
                  <strong className="text-white">7.2. Business Hours.</strong> Monday to Friday, 9
                  AM to 6 PM (Brasília time), except on Brazilian public holidays.
                </p>
                <p className="mb-4">
                  <strong className="text-white">7.3. Response Time (SLA).</strong> The maximum
                  first-response time for new tickets is up to 1 (one) business day for critical
                  incidents and up to 3 (three) business days for ordinary questions and requests.
                </p>
                <p className="mb-4">
                  <strong className="text-white">7.4. Support Scope (included):</strong>
                </p>
                <ul className="space-y-2 mb-4">
                  <Bullet>Clarification of questions about native features of the System;</Bullet>
                  <Bullet>Investigation and correction of bugs and failures in the System;</Bullet>
                  <Bullet>Assistance with native Omnify Hub feature configuration.</Bullet>
                </ul>
                <p className="mb-4">
                  <strong className="text-white">7.5. Out of Scope:</strong>
                </p>
                <ul className="space-y-2">
                  <Bullet>Configuration or maintenance of Client infrastructure, networks, or equipment;</Bullet>
                  <Bullet>Design of chatbot flows, service strategies, business or marketing consulting;</Bullet>
                  <Bullet>Custom code, design, or layout modifications;</Bullet>
                  <Bullet>Support for third-party tools (Typebot, N8N, Zapier, external webhooks, SIP) that are not native Omnify Hub features;</Bullet>
                  <Bullet>Remote access to the Client's workstation;</Bullet>
                  <Bullet>Resolution of failures in unofficial APIs or third-party services outside OMNIFY's technical control.</Bullet>
                </ul>
              </Section>

              {/* 8. Obligations */}
              <Section icon={UserCheck} title="8. Obligations of the Parties">
                <p className="mb-4">
                  <strong className="text-white">8.1. OMNIFY's Obligations:</strong>
                </p>
                <ul className="space-y-2 mb-4">
                  <Bullet>Make the System available with uptime consistent with state-of-the-art SaaS platforms;</Bullet>
                  <Bullet>Maintain a production environment with redundancy, periodic backups, and information security best practices;</Bullet>
                  <Bullet>Apply patches, security updates, and product evolution releases;</Bullet>
                  <Bullet>Provide technical support within the defined scope and SLA.</Bullet>
                </ul>
                <p className="mb-4">
                  <strong className="text-white">8.2. Client's Obligations:</strong>
                </p>
                <ul className="space-y-2">
                  <Bullet>Make timely payments as per the contracted Plan;</Bullet>
                  <Bullet>Provide truthful information and keep it up-to-date;</Bullet>
                  <Bullet>Ensure confidentiality of credentials, tokens, and passwords of its Users;</Bullet>
                  <Bullet>Obtain the consents and legal bases required to process personal data and contact its End Customers (LGPD);</Bullet>
                  <Bullet>Be responsible for the content sent through the System;</Bullet>
                  <Bullet>Comply with the terms and policies of integrated third-party platforms (Meta/WhatsApp, OpenAI, etc.);</Bullet>
                  <Bullet>Notify OMNIFY, within 24 hours, of any suspected unauthorized access to its account.</Bullet>
                </ul>
              </Section>

              {/* 9. Multi-Tenant */}
              <Section icon={Building2} title="9. Multi-Tenant Model and Third-Party Relationships">
                <p className="mb-4">
                  <strong className="text-white">9.1.</strong> Omnify Hub operates on a multi-tenant
                  architecture: each Client has a logically isolated Store, with its own pipelines,
                  contacts, teams, integrations, and settings.
                </p>
                <p className="mb-4">
                  <strong className="text-white">9.2. Responsibility for Personnel.</strong> The
                  Client is solely responsible for the selection, hiring, compensation, and
                  management of its employees and agents who use the platform, releasing OMNIFY
                  from any employment, social security, or joint-liability relationship.
                </p>
                <p>
                  <strong className="text-white">9.3. Relationship with End Customers.</strong>{' '}
                  OMNIFY acts as a technology provider and has no direct relationship with the
                  Client's End Customers. The Client is solely responsible for service, collection,
                  tax obligations, and legal compliance toward its own customers and contacts.
                </p>
              </Section>

              {/* 10. Restrictions */}
              <Section icon={Ban} title="10. Usage Restrictions and Prohibited Conduct">
                <p className="mb-4">The Client is expressly prohibited, under penalty of immediate suspension and applicable legal measures, from:</p>
                <ul className="space-y-2">
                  <Bullet>copying, selling, distributing, sublicensing, or transferring, in whole or in part, the System, its source code, database, or documentation;</Bullet>
                  <Bullet>performing reverse engineering, decompilation, or attempting to obtain the source code;</Bullet>
                  <Bullet>using the System to send spam, unsolicited messages, or illegal, offensive, discriminatory, fraudulent content, or content that infringes third-party rights;</Bullet>
                  <Bullet>using the platform in breach of Meta/WhatsApp policies or those of any other integrated service;</Bullet>
                  <Bullet>conducting security tests, pentests, or stress tests without prior written authorization from OMNIFY;</Bullet>
                  <Bullet>sharing credentials among multiple users to bypass contracted seat limits;</Bullet>
                  <Bullet>using the System for competing purposes, with the goal of replicating features in a rival product.</Bullet>
                </ul>
              </Section>

              {/* 11. Intellectual Property */}
              <Section icon={Lock} title="11. Intellectual Property">
                <p className="mb-4">
                  <strong className="text-white">11.1.</strong> Omnify Hub, its source code,
                  architecture, database, layout, logos, brand, documentation, manuals, and APIs
                  are the exclusive intellectual property of OMNIFY.
                </p>
                <p className="mb-4">
                  <strong className="text-white">11.2.</strong> Subscribing to a Plan does not, under
                  any circumstances, transfer title or copyright of the System to the Client. The
                  Client receives only a limited, revocable, non-exclusive, and non-transferable
                  authorization to use (license).
                </p>
                <p>
                  <strong className="text-white">11.3.</strong> The Client retains exclusive
                  ownership of its contact data, conversation history, Store settings, and content
                  it inputs into the System. With respect to such data, OMNIFY acts as Data
                  Processor (under the LGPD), as detailed in the Privacy Policy.
                </p>
              </Section>

              {/* 12. LGPD */}
              <Section icon={Database} title="12. Privacy and Data Protection (LGPD)">
                <p className="mb-4">
                  <strong className="text-white">12.1. Roles of the Parties.</strong> Under
                  Brazil's General Data Protection Law (Law No. 13,709/2018):
                </p>
                <ul className="space-y-2 mb-4">
                  <Bullet>OMNIFY acts as <strong className="text-white">Data Controller</strong> of the Direct Client's registration data (name, email, Tax ID, phone), used for billing, account validation, and support;</Bullet>
                  <Bullet>The Client acts as <strong className="text-white">Data Controller</strong> of personal data of third parties (its contacts, leads, and End Customers) that flows through the System, with OMNIFY acting as mere Data Processor of such data.</Bullet>
                </ul>
                <p>
                  <strong className="text-white">12.2.</strong> The processing, purpose, sharing,
                  retention, and data subject rights are detailed in the{' '}
                  <Link to="/privacy-en" className="text-cyan-400 hover:underline">Privacy Policy</Link>, an integral part of these Terms.
                </p>
              </Section>

              {/* 13. Suspension and Termination */}
              <Section icon={Ban} title="13. Suspension and Termination">
                <p className="mb-4">
                  <strong className="text-white">13.1.</strong> OMNIFY may suspend or terminate, in
                  whole or in part, access to the System in the following cases:
                </p>
                <ul className="space-y-2 mb-4">
                  <Bullet>breach of these Terms or of the Privacy Policy;</Bullet>
                  <Bullet>default or chargeback;</Bullet>
                  <Bullet>improper, fraudulent use, or use that creates technical, legal, or reputational risk;</Bullet>
                  <Bullet>legal requirement or order from a competent authority;</Bullet>
                  <Bullet>need to preserve the security and integrity of the platform.</Bullet>
                </ul>
                <p>
                  <strong className="text-white">13.2. Data Export.</strong> In case of termination
                  by the Client, the Client shall have 30 (thirty) days, counted from the end of
                  the current cycle, to request the export of its data. After this period, OMNIFY
                  may permanently delete the data, in accordance with the retention policy
                  described in the Privacy Policy.
                </p>
              </Section>

              {/* 14. No Guarantee */}
              <Section icon={AlertTriangle} title="14. No Guarantee of Results">
                <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                  <p className="text-amber-200">
                    Use of the System <strong>does not guarantee</strong> commercial, operational,
                    or financial results. Any reference to performance, earnings, metrics, success
                    stories, or strategies is merely illustrative and does not constitute a promise
                    of results. The Client's success depends on its own factors (strategy, team,
                    offer, market) that are beyond OMNIFY's control.
                  </p>
                </div>
              </Section>

              {/* 15. Limitation of Liability */}
              <Section icon={Scale} title="15. Limitation of Liability">
                <p className="mb-4">
                  <strong className="text-white">15.1.</strong> The Client acknowledges that the
                  System is subject to interferences, malfunctions, or delays inherent to the use
                  of the internet and server infrastructure, as well as scheduled and emergency
                  maintenance.
                </p>
                <p className="mb-4">
                  <strong className="text-white">15.2.</strong> To the maximum extent permitted by
                  law, OMNIFY <strong className="text-white">shall not be liable</strong> for:
                </p>
                <ul className="space-y-2 mb-4">
                  <Bullet>indirect losses, lost profits, moral damages, data loss, revenue loss, business interruptions, or damages arising from the use or inability to use the System;</Bullet>
                  <Bullet>failures, unavailability, policy changes, technical limits, or bans applied by third-party services (Meta, OpenAI, gateways, cloud providers);</Bullet>
                  <Bullet>content created, sent, scheduled, or automated by the Client, its contact lists, campaigns, templates, and their legal consequences;</Bullet>
                  <Bullet>damages resulting from the misuse of credentials by third parties who accessed the Client's account, except where solely caused by OMNIFY.</Bullet>
                </ul>
                <p>
                  <strong className="text-white">15.3.</strong> In any case of civil liability of
                  OMNIFY, the total compensation shall be limited to the amount actually paid by
                  the Client in the 12 (twelve) months preceding the event giving rise to the
                  liability.
                </p>
              </Section>

              {/* 16. General Provisions */}
              <Section icon={Settings} title="16. General Provisions">
                <p className="mb-4">
                  <strong className="text-white">16.1. Communications.</strong> All communications
                  shall be deemed valid when sent to the email registered by the Client or via
                  notices in the System's administrative panel.
                </p>
                <p className="mb-4">
                  <strong className="text-white">16.2. Tolerance.</strong> Any tolerance by OMNIFY
                  in requiring compliance with any clause of this contract shall not constitute
                  novation, waiver, or forgiveness of rights, and the clause may be enforced at any
                  time.
                </p>
                <p className="mb-4">
                  <strong className="text-white">16.3. Conduct and Respect.</strong> OMNIFY values
                  mutual respect. It reserves the right to suspend support or terminate the
                  contract if the Client or its representatives treat the team with aggression,
                  offense, discrimination, or harassment.
                </p>
                <p className="mb-4">
                  <strong className="text-white">16.4. Assignment.</strong> The Client may not
                  assign or transfer this contract to third parties without OMNIFY's prior written
                  authorization. OMNIFY may assign this contract in the event of corporate
                  restructuring, merger, acquisition, or sale of assets.
                </p>
                <p>
                  <strong className="text-white">16.5. Severability.</strong> If any provision of
                  this contract is deemed invalid or unenforceable, the remaining provisions shall
                  remain in full force and effect.
                </p>
              </Section>

              {/* 17. Forum and Applicable Law */}
              <Section icon={Gavel} title="17. Forum and Applicable Law">
                <p className="mb-4">
                  <strong className="text-white">17.1.</strong> This contract is governed by the
                  laws of the Federative Republic of Brazil, in particular by the Civil Code, the
                  Consumer Protection Code, the Brazilian Internet Civil Framework (Law
                  12,965/2014), the Software Law (Law 9,609/1998), and the General Data Protection
                  Law (Law 13,709/2018).
                </p>
                <p>
                  <strong className="text-white">17.2.</strong> The Court of the District of Duque
                  de Caxias - RJ, Brazil, is elected as the sole competent forum to resolve any
                  disputes arising from this contract, with express waiver of any other, however
                  privileged it may be, without prejudice to the right of an individual consumer
                  Client to sue in the forum of its domicile, as provided by the Brazilian Consumer
                  Code.
                </p>
              </Section>

              {/* 18. Contact */}
              <Section icon={Mail} title="18. Contact">
                <div className="bg-slate-700/30 rounded-xl p-6 space-y-3">
                  <InfoRow label="Company" value="OMNIFY SERVIÇOS LTDA (OMNIFY HUB)" />
                  <InfoRow label="Tax ID (CNPJ)" value="64.962.976/0001-28" />
                  <InfoRow label="Address" value="R Mariano Sendra dos Santos, s/n, Box 8, Centro, CEP 25.010-080, Duque de Caxias/RJ, Brazil" />
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
      <div className="pl-0 md:pl-12">{children}</div>
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

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="text-cyan-400 mt-1.5 leading-none">&bull;</span>
      <span>{children}</span>
    </li>
  )
}

function Definition({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    <li className="flex flex-col gap-1 p-3 rounded-lg bg-slate-700/20 border border-white/5">
      <span className="text-white font-medium">{term}</span>
      <span className="text-slate-400 text-sm leading-relaxed">{children}</span>
    </li>
  )
}
