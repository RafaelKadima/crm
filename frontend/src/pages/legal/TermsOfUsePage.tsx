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

export function TermsOfUsePage() {
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
                Termos e Condições Gerais de Uso
              </h1>
              <p className="text-slate-400">
                Data de disponibilização: 03/02/2026 &middot; Última atualização: 18/05/2026
              </p>
            </div>

            {/* Preâmbulo */}
            <div className="mb-12 p-6 bg-slate-700/30 border border-white/10 rounded-xl text-slate-300 leading-relaxed space-y-3">
              <p>
                Estes Termos e Condições Gerais de Uso (“Termos”) regulam a relação comercial entre
                <strong className="text-white"> OMNIFY SERVIÇOS LTDA</strong>, nome fantasia
                <strong className="text-white"> OMNIFY HUB</strong>, inscrita no CNPJ sob nº
                <strong className="text-white"> 64.962.976/0001-28</strong>, doravante denominada
                “OMNIFY” ou “CONTRATADA”, e a pessoa física ou jurídica que contrata o acesso ao
                sistema, doravante denominada “CLIENTE” ou “CONTRATANTE”.
              </p>
              <p>
                O objeto deste instrumento é o regramento da utilização do CRM Omnify Hub, sistema
                de gestão de relacionamento, atendimento omnichannel e automação, fornecido na
                modalidade Software como Serviço (SaaS).
              </p>
              <p className="text-amber-200">
                <strong>AO CONTRATAR, ACESSAR OU UTILIZAR O OMNIFY HUB, O CLIENTE DECLARA TER
                LIDO, COMPREENDIDO E ACEITO INTEGRALMENTE ESTES TERMOS.</strong>
              </p>
            </div>

            {/* Sections */}
            <div className="space-y-10 text-slate-300">
              {/* 1. Conceitos */}
              <Section icon={BookOpen} title="1. Conceitos Importantes">
                <p className="mb-4">Para facilitar a leitura e interpretação deste documento, adotamos as seguintes definições:</p>
                <ul className="space-y-3">
                  <Definition term="Cliente (ou Contratante)">
                    Pessoa física ou jurídica que contrata o acesso ao Omnify Hub, responsável pelo
                    pagamento, pela gestão de seus Usuários e pelo conteúdo inserido no sistema.
                  </Definition>
                  <Definition term="Omnify Hub (ou Sistema)">
                    Plataforma SaaS desenvolvida e de propriedade exclusiva da OMNIFY, destinada à
                    gestão de relacionamento com clientes (CRM), atendimento multicanal, pipelines
                    de vendas, automações e integrações com APIs de terceiros.
                  </Definition>
                  <Definition term="Plano / Assinatura">
                    Modalidade de contratação que concede ao Cliente o direito de uso do Sistema
                    pelo período contratado (mensal, trimestral ou anual), mediante pagamento
                    recorrente ou antecipado.
                  </Definition>
                  <Definition term="Loja (Tenant)">
                    Espaço lógico isolado dentro do Sistema, atribuído ao Cliente, contendo seus
                    contatos, pipelines, equipes, integrações e configurações próprias.
                  </Definition>
                  <Definition term="Usuário">
                    Pessoa autorizada pelo Cliente a acessar o painel do Sistema (super
                    administrador, administrador, supervisores, atendentes ou demais perfis), com
                    credenciais nominais e individuais.
                  </Definition>
                  <Definition term="Cliente Final / Contato">
                    Pessoa física ou jurídica com quem o Cliente se relaciona através do Sistema
                    (leads, contatos, destinatários de mensagens). A OMNIFY não possui relação
                    direta com os Clientes Finais do Cliente.
                  </Definition>
                  <Definition term="API Oficial WhatsApp (Meta)">
                    API Cloud disponibilizada pela Meta Platforms para envio e recebimento de
                    mensagens via WhatsApp Business Account (WABA), utilizada pelo Omnify Hub como
                    canal padrão homologado.
                  </Definition>
                </ul>
              </Section>

              {/* 2. Natureza e Aceitação */}
              <Section icon={FileText} title="2. Natureza e Aceitação dos Termos">
                <p className="mb-4">
                  <strong className="text-white">2.1.</strong> Ao contratar o Plano, acessar ou
                  utilizar o Omnify Hub, o Cliente declara aceitar integralmente estes Termos. A
                  aceitação é condição indispensável para a liberação do acesso.
                </p>
                <p className="mb-4">
                  <strong className="text-white">2.2.</strong> A realização do pagamento ou o
                  simples início da utilização do Sistema implica, para todos os fins de direito, na
                  aceitação plena, inequívoca e irrevogável de todas as condições estabelecidas
                  nestes Termos e suas futuras atualizações.
                </p>
                <p className="mb-4">
                  <strong className="text-white">2.3.</strong> Estes Termos possuem força de contrato
                  vinculante, substituindo quaisquer acordos verbais ou trocas de mensagens
                  anteriores entre as partes.
                </p>
                <p className="mb-4">
                  <strong className="text-white">2.4.</strong> Pela teoria da aparência, a OMNIFY
                  considerará válida a contratação realizada mediante o fornecimento de dados
                  cadastrais e pagamento, declarando o Cliente que a pessoa responsável pela compra
                  possui plenos poderes para representá-lo.
                </p>
                <p>
                  <strong className="text-white">2.5.</strong> A OMNIFY poderá alterar estes Termos a
                  qualquer momento. O uso continuado do Sistema após a publicação das alterações
                  confirma a aceitação dos novos Termos.
                </p>
              </Section>

              {/* 3. Sistema e Requisitos */}
              <Section icon={Zap} title="3. Sobre o Sistema, Escopo e Requisitos Técnicos">
                <p className="mb-4">
                  <strong className="text-white">3.1.</strong> O Omnify Hub é fornecido na modalidade
                  SaaS (Software como Serviço), hospedado e mantido pela OMNIFY em infraestrutura de
                  nuvem própria ou contratada. O Cliente não recebe arquivos de instalação,
                  código-fonte ou direito de auto-hospedagem.
                </p>
                <p className="mb-4">
                  <strong className="text-white">3.2. Requisitos da Estação de Trabalho.</strong> Para
                  utilização adequada do Sistema, recomenda-se:
                </p>
                <ul className="space-y-2 mb-4">
                  <Bullet>Memória (RAM) de 8GB ou superior;</Bullet>
                  <Bullet>Processador equivalente a Intel i5 ou superior;</Bullet>
                  <Bullet>Conexão de internet estável (mínimo 10 Mbps);</Bullet>
                  <Bullet>Navegador atualizado (Google Chrome, Microsoft Edge, Firefox ou Safari nas duas últimas versões estáveis);</Bullet>
                  <Bullet>Sistema operacional atualizado e suporte a JavaScript habilitado.</Bullet>
                </ul>
                <p className="mb-4">
                  <strong className="text-white">3.3. Veracidade das Informações.</strong> O Cliente
                  e seus Usuários deverão fornecer informações verdadeiras, exatas e atuais. A OMNIFY
                  reserva-se o direito de recusar cadastros, suspender ou cancelar contas cujos
                  responsáveis adotem condutas contrárias a estes Termos, sem necessidade de
                  notificação prévia ou indenização.
                </p>
                <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                  <p className="text-amber-200 text-sm">
                    <strong>3.4. APIs Não Oficiais.</strong> Caso o Cliente habilite, em sua conta,
                    integrações com APIs não oficiais de WhatsApp (WhatsApp Web não autorizado,
                    bibliotecas de terceiros como WWebJS, Baileys, Evolution etc.), o faz por sua
                    conta e risco, ciente de que essas integrações estão sujeitas a desconexões,
                    perda de mensagens, instabilidade e possíveis banimentos pela Meta. A OMNIFY não
                    presta garantia nem suporte para falhas decorrentes do uso de APIs não oficiais.
                  </p>
                </div>
              </Section>

              {/* 4. WhatsApp Business API */}
              <Section icon={MessageSquare} title="4. Integração com WhatsApp Business API (Meta)">
                <p className="mb-4">
                  <strong className="text-white">4.1.</strong> O Omnify Hub utiliza a API Cloud
                  oficial do WhatsApp Business, disponibilizada pela Meta Platforms, como canal
                  padrão homologado de mensageria.
                </p>
                <p className="mb-4">
                  <strong className="text-white">4.2.</strong> Ao habilitar a integração, o Cliente:
                </p>
                <ul className="space-y-2 mb-4">
                  <Bullet>autoriza a OMNIFY a acessar sua conta WhatsApp Business (WABA) exclusivamente para habilitar funcionalidades de envio e recebimento de mensagens;</Bullet>
                  <Bullet>declara concordar com a Política de Negócios do WhatsApp e com a Política Comercial da Meta (<a href="https://www.whatsapp.com/legal/business-policy" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">whatsapp.com/legal/business-policy</a>);</Bullet>
                  <Bullet>é o único responsável pelo conteúdo, finalidade e legalidade das mensagens enviadas a partir de sua conta;</Bullet>
                  <Bullet>compreende que templates (HSM) devem ser previamente aprovados pela Meta antes do envio;</Bullet>
                  <Bullet>aceita que restrições, limites de envio (rate limits), suspensões temporárias e banimentos aplicados pela Meta são de responsabilidade do Cliente.</Bullet>
                </ul>
                <div className="p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
                  <p className="text-cyan-200 text-sm">
                    <strong>Importante:</strong> a indisponibilidade da API da Meta, bloqueios de
                    números, banimentos ou alterações unilaterais de política impostas pela Meta
                    fogem ao controle técnico e jurídico da OMNIFY, não constituindo defeito do
                    Sistema nem direito a reembolso.
                  </p>
                </div>
              </Section>

              {/* 5. Planos, Preços, Pagamento e Renovação */}
              <Section icon={CreditCard} title="5. Planos, Preços, Pagamento e Renovação">
                <p className="mb-4">
                  <strong className="text-white">5.1. Modalidades.</strong> O Omnify Hub é
                  contratado por meio de Planos com vigência mensal, trimestral ou anual, conforme
                  oferta vigente. O valor, escopo de funcionalidades, limites de usuários, canais e
                  contatos serão informados na contratação.
                </p>
                <p className="mb-4">
                  <strong className="text-white">5.2. Forma de Pagamento.</strong> O pagamento será
                  realizado pelos meios disponibilizados pela OMNIFY (cartão de crédito, PIX, boleto
                  ou gateway recorrente), conforme o Plano contratado.
                </p>
                <p className="mb-4">
                  <strong className="text-white">5.3. Renovação Automática.</strong> Os Planos com
                  cobrança recorrente serão renovados automaticamente ao final de cada ciclo, pelo
                  mesmo período e valor vigente, salvo manifestação expressa do Cliente em
                  contrário, com antecedência mínima de 5 (cinco) dias do vencimento.
                </p>
                <p className="mb-4">
                  <strong className="text-white">5.4. Reajuste.</strong> Os valores poderão ser
                  reajustados anualmente conforme variação do IPCA ou outro índice que venha a
                  substituí-lo, ou ainda em decorrência de alterações de custos operacionais e de
                  serviços de terceiros (Meta, gateways de pagamento, provedores de nuvem). Eventuais
                  reajustes serão comunicados com antecedência mínima de 30 (trinta) dias.
                </p>
                <p className="mb-4">
                  <strong className="text-white">5.5. Inadimplência.</strong> Em caso de
                  inadimplência ou estorno indevido (chargeback), a OMNIFY poderá:
                </p>
                <ul className="space-y-2 mb-4">
                  <Bullet>suspender imediatamente o acesso à conta e ao suporte;</Bullet>
                  <Bullet>cobrar multa de 2% sobre o valor devido, acrescida de juros de mora de 1% ao mês e correção monetária;</Bullet>
                  <Bullet>recusar novas contratações ou renovações;</Bullet>
                  <Bullet>cancelar definitivamente a conta após 30 (trinta) dias de inadimplência, com risco de exclusão dos dados conforme política de retenção.</Bullet>
                </ul>
                <div className="p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
                  <p className="text-cyan-200 text-sm">
                    <strong>5.6. Direito de Arrependimento (CDC).</strong> Em conformidade com o art.
                    49 do Código de Defesa do Consumidor, o Cliente consumidor pessoa física poderá
                    desistir da contratação no prazo de 7 (sete) dias corridos a contar do
                    pagamento, mediante solicitação por e-mail, com reembolso integral do valor pago.
                  </p>
                </div>
                <p className="mt-4">
                  <strong className="text-white">5.7. Cancelamento após o prazo legal.</strong>{' '}
                  Decorrido o prazo de 7 dias do item 5.6, o Cliente poderá cancelar a renovação a
                  qualquer momento, mas não terá direito a reembolso (pro rata) das parcelas ou
                  ciclos já pagos. O acesso permanece ativo até o fim do ciclo vigente.
                </p>
              </Section>

              {/* 6. Custos Variáveis de Terceiros */}
              <Section icon={ExternalLink} title="6. Custos Variáveis de Serviços de Terceiros">
                <p className="mb-4">
                  Os valores cobrados pela OMNIFY referem-se exclusivamente à licença de uso do
                  Sistema. Custos variáveis decorrentes de serviços de terceiros integrados à
                  plataforma são de responsabilidade exclusiva do Cliente e podem sofrer alterações
                  alheias à vontade da OMNIFY, tais como:
                </p>
                <ul className="space-y-2">
                  <Bullet>Tarifas da Meta/WhatsApp (janelas de conversação, templates, mensagens iniciadas pela empresa, WABA);</Bullet>
                  <Bullet>Consumo de APIs de Inteligência Artificial (OpenAI, Anthropic, Google, Grok, entre outras);</Bullet>
                  <Bullet>Serviços de SMS, e-mail transacional e gateways de pagamento integrados;</Bullet>
                  <Bullet>Consumo de APIs externas de hubs ou conectores configurados pelo Cliente.</Bullet>
                </ul>
              </Section>

              {/* 7. Suporte */}
              <Section icon={Headphones} title="7. Política de Suporte Técnico e SLA">
                <p className="mb-4">
                  <strong className="text-white">7.1. Canais Oficiais.</strong> O canal oficial de
                  suporte é o portal de tickets disponibilizado dentro do Sistema e o e-mail
                  indicado na seção de contato deste documento.
                </p>
                <p className="mb-4">
                  <strong className="text-white">7.2. Horário de Atendimento.</strong> Segunda a
                  sexta-feira, das 9h às 18h (horário de Brasília), exceto feriados nacionais.
                </p>
                <p className="mb-4">
                  <strong className="text-white">7.3. Tempo de Resposta (SLA).</strong> O prazo
                  máximo para primeira resposta a novos chamados é de até 1 (um) dia útil para
                  incidentes críticos e até 3 (três) dias úteis para dúvidas e solicitações
                  ordinárias.
                </p>
                <p className="mb-4">
                  <strong className="text-white">7.4. Escopo do Suporte (incluso):</strong>
                </p>
                <ul className="space-y-2 mb-4">
                  <Bullet>Esclarecimento de dúvidas sobre funcionalidades nativas do Sistema;</Bullet>
                  <Bullet>Investigação e correção de bugs e falhas no Sistema;</Bullet>
                  <Bullet>Auxílio em configurações de recursos nativos do Omnify Hub.</Bullet>
                </ul>
                <p className="mb-4">
                  <strong className="text-white">7.5. Fora do Escopo:</strong>
                </p>
                <ul className="space-y-2">
                  <Bullet>Configuração ou manutenção de infraestrutura, redes ou equipamentos do Cliente;</Bullet>
                  <Bullet>Criação de fluxos de chatbot, estratégias de atendimento, consultoria de negócios ou marketing;</Bullet>
                  <Bullet>Customizações de código, design ou layout personalizadas;</Bullet>
                  <Bullet>Suporte a ferramentas de terceiros (Typebot, N8N, Zapier, Webhooks externos, SIP) que não sejam funcionalidades nativas do Omnify Hub;</Bullet>
                  <Bullet>Acesso remoto à máquina do Cliente;</Bullet>
                  <Bullet>Resolução de falhas em APIs não oficiais ou serviços de terceiros que estejam fora do controle técnico da OMNIFY.</Bullet>
                </ul>
              </Section>

              {/* 8. Obrigações */}
              <Section icon={UserCheck} title="8. Obrigações das Partes">
                <p className="mb-4">
                  <strong className="text-white">8.1. Obrigações da OMNIFY:</strong>
                </p>
                <ul className="space-y-2 mb-4">
                  <Bullet>Disponibilizar o Sistema com nível de disponibilidade compatível com o estado da arte de plataformas SaaS;</Bullet>
                  <Bullet>Manter ambiente de produção com redundância, backups periódicos e práticas de segurança da informação;</Bullet>
                  <Bullet>Aplicar atualizações de correção, segurança e evolução do produto;</Bullet>
                  <Bullet>Prestar suporte técnico dentro do escopo e SLA definidos.</Bullet>
                </ul>
                <p className="mb-4">
                  <strong className="text-white">8.2. Obrigações do Cliente:</strong>
                </p>
                <ul className="space-y-2">
                  <Bullet>Efetuar o pagamento pontual conforme o Plano contratado;</Bullet>
                  <Bullet>Fornecer informações verdadeiras e mantê-las atualizadas;</Bullet>
                  <Bullet>Garantir o sigilo de credenciais, tokens e senhas de seus Usuários;</Bullet>
                  <Bullet>Obter consentimentos e bases legais necessárias para tratar dados pessoais e enviar mensagens a seus contatos (LGPD);</Bullet>
                  <Bullet>Gerenciar e ser responsável pelo conteúdo enviado através do Sistema;</Bullet>
                  <Bullet>Respeitar termos de uso e políticas das plataformas de terceiros integradas (Meta/WhatsApp, OpenAI, etc.);</Bullet>
                  <Bullet>Comunicar à OMNIFY, em até 24h, qualquer suspeita de acesso indevido à sua conta.</Bullet>
                </ul>
              </Section>

              {/* 9. Multi-Tenant */}
              <Section icon={Building2} title="9. Modelo Multi-Tenant e Relação com Terceiros">
                <p className="mb-4">
                  <strong className="text-white">9.1.</strong> O Omnify Hub opera em arquitetura
                  multi-tenant: cada Cliente possui uma Loja isolada logicamente, com pipelines,
                  contatos, equipes, integrações e configurações próprias.
                </p>
                <p className="mb-4">
                  <strong className="text-white">9.2. Responsabilidade sobre Equipe.</strong> O
                  Cliente é o único responsável pela seleção, contratação, remuneração e gestão de
                  seus funcionários e atendentes que utilizam a plataforma, isentando a OMNIFY de
                  qualquer vínculo trabalhista, previdenciário ou de solidariedade.
                </p>
                <p>
                  <strong className="text-white">9.3. Relação com Clientes Finais.</strong> A OMNIFY
                  atua como fornecedora de tecnologia e não possui relação direta com os Clientes
                  Finais do Cliente. O Cliente é o único responsável pelo atendimento, cobrança,
                  obrigações fiscais e cumprimento legal perante seus próprios clientes e contatos.
                </p>
              </Section>

              {/* 10. Limitações de Uso */}
              <Section icon={Ban} title="10. Limitações de Uso e Condutas Proibidas">
                <p className="mb-4">É expressamente vedado ao Cliente, sob pena de suspensão imediata e medidas judiciais cabíveis:</p>
                <ul className="space-y-2">
                  <Bullet>copiar, vender, distribuir, sublicenciar ou ceder, total ou parcialmente, o Sistema, seu código-fonte, banco de dados ou documentação;</Bullet>
                  <Bullet>realizar engenharia reversa, descompilação ou tentativa de obtenção do código-fonte;</Bullet>
                  <Bullet>utilizar o Sistema para envio de spam, mensagens não solicitadas, conteúdo ilegal, ofensivo, discriminatório, fraudulento ou que viole direitos de terceiros;</Bullet>
                  <Bullet>utilizar a plataforma em desacordo com as políticas da Meta/WhatsApp ou de qualquer outro serviço integrado;</Bullet>
                  <Bullet>realizar testes de segurança, pentests ou stress tests sem autorização prévia e por escrito da OMNIFY;</Bullet>
                  <Bullet>compartilhar credenciais entre múltiplos usuários, contornando os limites de assentos contratados;</Bullet>
                  <Bullet>utilizar o Sistema para finalidades concorrentes, com objetivo de copiar funcionalidades para produto rival.</Bullet>
                </ul>
              </Section>

              {/* 11. Propriedade Intelectual */}
              <Section icon={Lock} title="11. Propriedade Intelectual">
                <p className="mb-4">
                  <strong className="text-white">11.1.</strong> O Omnify Hub, seu código-fonte,
                  arquitetura, banco de dados, layout, logotipos, marca, documentações, manuais e
                  APIs são de propriedade intelectual exclusiva da OMNIFY.
                </p>
                <p className="mb-4">
                  <strong className="text-white">11.2.</strong> A contratação do Plano não transfere,
                  em hipótese alguma, a titularidade ou os direitos autorais do Sistema para o
                  Cliente. O Cliente recebe apenas uma autorização de uso (licença) limitada,
                  revogável, não exclusiva e intransferível.
                </p>
                <p>
                  <strong className="text-white">11.3.</strong> Pertencem exclusivamente ao Cliente
                  os dados de seus contatos, históricos de conversas, configurações da sua Loja e os
                  conteúdos por ele inseridos no Sistema. A OMNIFY atua, quanto a esses dados, como
                  Operadora (na forma da LGPD), conforme detalhado na Política de Privacidade.
                </p>
              </Section>

              {/* 12. LGPD */}
              <Section icon={Database} title="12. Privacidade e Proteção de Dados (LGPD)">
                <p className="mb-4">
                  <strong className="text-white">12.1. Papéis das Partes.</strong> Para fins da Lei
                  Geral de Proteção de Dados (Lei nº 13.709/2018):
                </p>
                <ul className="space-y-2 mb-4">
                  <Bullet>A OMNIFY atua como <strong className="text-white">Controladora</strong> dos dados cadastrais do Cliente Direto (nome, e-mail, CPF/CNPJ, telefone), utilizados para faturamento, validação da conta e suporte;</Bullet>
                  <Bullet>O Cliente atua como <strong className="text-white">Controlador</strong> dos dados pessoais de terceiros (seus contatos, leads e Clientes Finais) que trafegam pelo Sistema, sendo a OMNIFY mera Operadora desses dados.</Bullet>
                </ul>
                <p>
                  <strong className="text-white">12.2.</strong> O tratamento, finalidade,
                  compartilhamento, retenção e direitos do titular estão detalhados na{' '}
                  <Link to="/privacy" className="text-cyan-400 hover:underline">Política de Privacidade</Link>, parte integrante destes Termos.
                </p>
              </Section>

              {/* 13. Suspensão e Encerramento */}
              <Section icon={Ban} title="13. Suspensão e Encerramento">
                <p className="mb-4">
                  <strong className="text-white">13.1.</strong> A OMNIFY poderá suspender ou
                  encerrar, total ou parcialmente, o acesso ao Sistema nas seguintes hipóteses:
                </p>
                <ul className="space-y-2 mb-4">
                  <Bullet>violação destes Termos ou da Política de Privacidade;</Bullet>
                  <Bullet>inadimplência ou chargeback;</Bullet>
                  <Bullet>uso indevido, fraudulento ou que gere risco técnico, jurídico ou reputacional;</Bullet>
                  <Bullet>exigência legal ou determinação de autoridade competente;</Bullet>
                  <Bullet>necessidade de preservação da segurança e integridade da plataforma.</Bullet>
                </ul>
                <p>
                  <strong className="text-white">13.2. Exportação de Dados.</strong> Em caso de
                  encerramento por iniciativa do Cliente, este terá o prazo de 30 (trinta) dias, a
                  contar do término do ciclo vigente, para solicitar a exportação de seus dados.
                  Após este prazo, a OMNIFY poderá excluir definitivamente os dados, conforme
                  política de retenção descrita na Política de Privacidade.
                </p>
              </Section>

              {/* 14. Não Garantia */}
              <Section icon={AlertTriangle} title="14. Não Garantia de Resultados">
                <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                  <p className="text-amber-200">
                    O uso do Sistema <strong>não garante</strong> resultados comerciais,
                    operacionais ou financeiros. Qualquer referência a desempenho, ganhos, métricas,
                    casos de sucesso ou estratégias é meramente ilustrativa e não constitui promessa
                    de resultado. O sucesso do Cliente depende de fatores próprios (estratégia,
                    equipe, oferta, mercado) que estão fora do controle da OMNIFY.
                  </p>
                </div>
              </Section>

              {/* 15. Limitação de Responsabilidade */}
              <Section icon={Scale} title="15. Limitação de Responsabilidade">
                <p className="mb-4">
                  <strong className="text-white">15.1.</strong> O Cliente reconhece que o Sistema
                  está sujeito a interferências, mau funcionamento ou atrasos inerentes ao uso da
                  internet e infraestrutura de servidores, bem como a manutenções programadas e
                  emergenciais.
                </p>
                <p className="mb-4">
                  <strong className="text-white">15.2.</strong> Na máxima extensão permitida pela
                  lei, a OMNIFY <strong className="text-white">não será responsável</strong> por:
                </p>
                <ul className="space-y-2 mb-4">
                  <Bullet>perdas indiretas, lucros cessantes, danos morais, perda de dados, perda de receitas, interrupções de negócio ou prejuízos decorrentes do uso ou impossibilidade de uso do Sistema;</Bullet>
                  <Bullet>falhas, indisponibilidades, mudanças de política, limites técnicos ou banimentos aplicados por serviços de terceiros (Meta, OpenAI, gateways, provedores de nuvem);</Bullet>
                  <Bullet>conteúdo criado, enviado, agendado ou automatizado pelo Cliente, suas listas de contatos, campanhas, templates e respectivas consequências jurídicas;</Bullet>
                  <Bullet>danos resultantes de uso indevido de credenciais por terceiros que tenham acessado a conta do Cliente, salvo culpa exclusiva da OMNIFY.</Bullet>
                </ul>
                <p>
                  <strong className="text-white">15.3.</strong> Em qualquer hipótese de
                  responsabilidade civil da OMNIFY, o valor total da indenização ficará limitado ao
                  valor efetivamente pago pelo Cliente nos 12 (doze) meses anteriores ao evento que
                  deu origem à responsabilidade.
                </p>
              </Section>

              {/* 16. Disposições Gerais */}
              <Section icon={Settings} title="16. Disposições Gerais">
                <p className="mb-4">
                  <strong className="text-white">16.1. Comunicações.</strong> Todas as comunicações
                  serão consideradas válidas quando enviadas para o e-mail cadastrado pelo Cliente
                  ou através de avisos no painel administrativo do Sistema.
                </p>
                <p className="mb-4">
                  <strong className="text-white">16.2. Tolerância.</strong> A eventual tolerância da
                  OMNIFY em exigir o cumprimento de qualquer cláusula deste contrato não configurará
                  novação, renúncia ou perdão de direitos, podendo a cláusula ser exigida a qualquer
                  tempo.
                </p>
                <p className="mb-4">
                  <strong className="text-white">16.3. Conduta e Respeito.</strong> A OMNIFY preza
                  pelo respeito mútuo. Reserva-se o direito de suspender o suporte ou rescindir o
                  contrato caso o Cliente ou seus representantes tratem a equipe com agressividade,
                  ofensas, discriminação ou assédio.
                </p>
                <p className="mb-4">
                  <strong className="text-white">16.4. Cessão.</strong> O Cliente não poderá ceder ou
                  transferir este contrato a terceiros sem prévia autorização por escrito da OMNIFY.
                  A OMNIFY poderá ceder este contrato em caso de reorganização societária, fusão,
                  aquisição ou venda de ativos.
                </p>
                <p>
                  <strong className="text-white">16.5. Independência das Cláusulas.</strong> Se
                  qualquer disposição deste contrato for considerada inválida ou inexequível, as
                  demais permanecerão em pleno vigor e efeito.
                </p>
              </Section>

              {/* 17. Foro */}
              <Section icon={Gavel} title="17. Foro e Legislação Aplicável">
                <p className="mb-4">
                  <strong className="text-white">17.1.</strong> Este contrato é regido pelas leis da
                  República Federativa do Brasil, em especial pelo Código Civil, Código de Defesa do
                  Consumidor, Marco Civil da Internet (Lei 12.965/2014), Lei de Software (Lei
                  9.609/1998) e Lei Geral de Proteção de Dados (Lei 13.709/2018).
                </p>
                <p>
                  <strong className="text-white">17.2.</strong> Fica eleito o foro da Comarca de
                  Duque de Caxias - RJ como o único competente para dirimir quaisquer dúvidas ou
                  litígios oriundos deste contrato, com renúncia expressa a qualquer outro, por mais
                  privilegiado que seja, sem prejuízo do direito do Cliente consumidor pessoa física
                  de demandar no foro de seu domicílio, conforme o Código de Defesa do Consumidor.
                </p>
              </Section>

              {/* 18. Contato */}
              <Section icon={Mail} title="18. Contato">
                <div className="bg-slate-700/30 rounded-xl p-6 space-y-3">
                  <InfoRow label="Empresa" value="OMNIFY SERVIÇOS LTDA (OMNIFY HUB)" />
                  <InfoRow label="CNPJ" value="64.962.976/0001-28" />
                  <InfoRow label="Endereço" value="R Mariano Sendra dos Santos, s/n, Box 8, Centro, CEP 25.010-080, Duque de Caxias/RJ" />
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
                Política de Privacidade
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
