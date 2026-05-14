import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Shield, Building2, Database, Share2, Clock, Lock, UserCheck, AlertCircle, Power, FileText, Mail, Globe, Plug, Trash2 } from 'lucide-react'

export function PrivacyPolicyPage() {
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
              onClick={() => navigate('/privacy-en')}
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
              <Shield className="w-8 h-8 text-cyan-400" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Pol&iacute;tica de Privacidade
            </h1>
            <p className="text-slate-400">
              &Uacute;ltima atualiza&ccedil;&atilde;o: {new Date().toLocaleDateString('pt-BR')}
            </p>
          </div>

          {/* Sections */}
          <div className="space-y-10 text-slate-300">
            {/* 1. Introdução */}
            <Section icon={FileText} title="1. Introdu&ccedil;&atilde;o">
              <p>
                Esta Pol&iacute;tica de Privacidade descreve como a OMNIFY SERVI&Ccedil;OS LTDA, por meio do OMNIFY HUB,
                coleta, utiliza, armazena, compartilha e protege dados pessoais de usu&aacute;rios ao acessar e utilizar
                nosso sistema (incluindo recursos de integra&ccedil;&atilde;o e suporte &agrave; API oficial do WhatsApp).
              </p>
            </Section>

            {/* 2. Quem somos */}
            <Section icon={Building2} title="2. Quem somos (Controladora dos dados)">
              <div className="bg-slate-700/30 rounded-xl p-6 space-y-3">
                <InfoRow label="Raz&atilde;o Social" value="OMNIFY SERVI&Ccedil;OS LTDA" />
                <InfoRow label="Nome fantasia" value="OMNIFY HUB" />
                <InfoRow label="CNPJ" value="64.962.976/0001-28" />
                <InfoRow label="Endere&ccedil;o" value="R Mariano Sendra dos Santos, s/n, Box 8, Centro, CEP 25.010-080, Duque de Caxias/RJ" />
                <InfoRow label="E-mail" value="omnify@gmail.com" />
                <InfoRow label="Telefone/WhatsApp" value="(21) 9035-5975" />
              </div>
            </Section>

            {/* 3. Quais dados coletamos */}
            <Section icon={Database} title="3. Quais dados coletamos">
              <p className="mb-4">Podemos coletar, conforme o uso do sistema e as informa&ccedil;&otilde;es fornecidas por voc&ecirc;:</p>
              <ul className="space-y-3">
                <ListItem title="Dados cadastrais">
                  nome, e-mail, telefone, empresa/raz&atilde;o social (quando aplic&aacute;vel).
                </ListItem>
                <ListItem title="Dados de acesso e uso">
                  logs de acesso, IP, data/hora, p&aacute;ginas/funcionalidades utilizadas, registros t&eacute;cnicos para diagn&oacute;stico.
                </ListItem>
                <ListItem title="Dados de cobran&ccedil;a e pagamento">
                  informa&ccedil;&otilde;es necess&aacute;rias para processar pagamentos e faturamento (ex.: status de cobran&ccedil;a, identifica&ccedil;&atilde;o da transa&ccedil;&atilde;o).
                </ListItem>
                <ListItem title="Dados de integra&ccedil;&atilde;o">
                  identificadores t&eacute;cnicos e dados necess&aacute;rios para habilitar integra&ccedil;&otilde;es (por exemplo, par&acirc;metros de configura&ccedil;&atilde;o e tokens/chaves que voc&ecirc; cadastrar no sistema).
                </ListItem>
              </ul>
              <div className="mt-4 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <p className="text-amber-200 text-sm">
                  <strong>Importante:</strong> mensagens e dados trocados via integra&ccedil;&otilde;es (ex.: WhatsApp) podem ser
                  tratados conforme a finalidade do recurso ativado e as configura&ccedil;&otilde;es do pr&oacute;prio usu&aacute;rio/empresa.
                </p>
              </div>
            </Section>

            {/* 3.1 Dados provenientes das plataformas da Meta */}
            <Section icon={Plug} title="3.1 Dados provenientes das plataformas da Meta">
              <p className="mb-4">
                Quando o usu&aacute;rio ou empresa conecta contas, n&uacute;meros ou ativos relacionados &agrave;s plataformas
                da Meta, como WhatsApp Business, Facebook, Instagram, Messenger, Meta Business Manager ou WhatsApp
                Business Account, poderemos tratar dados necess&aacute;rios para habilitar, manter e operar essas
                integra&ccedil;&otilde;es dentro do OMNIFY HUB.
              </p>
              <p className="mb-4">Esses dados podem incluir, conforme a integra&ccedil;&atilde;o utilizada:</p>
              <ul className="space-y-2">
                <li className="flex items-start gap-3">
                  <span className="text-cyan-400 mt-1">&bull;</span>
                  <span>identificadores da conta conectada;</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-cyan-400 mt-1">&bull;</span>
                  <span>ID da empresa no Meta Business Manager;</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-cyan-400 mt-1">&bull;</span>
                  <span>ID da P&aacute;gina do Facebook;</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-cyan-400 mt-1">&bull;</span>
                  <span>ID da conta do WhatsApp Business;</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-cyan-400 mt-1">&bull;</span>
                  <span>ID do n&uacute;mero de telefone do WhatsApp Business;</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-cyan-400 mt-1">&bull;</span>
                  <span>n&uacute;mero de telefone conectado;</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-cyan-400 mt-1">&bull;</span>
                  <span>nome verificado da conta;</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-cyan-400 mt-1">&bull;</span>
                  <span>status da conta ou do n&uacute;mero;</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-cyan-400 mt-1">&bull;</span>
                  <span>permiss&otilde;es concedidas pelo usu&aacute;rio durante o processo de autentica&ccedil;&atilde;o;</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-cyan-400 mt-1">&bull;</span>
                  <span>tokens de acesso ou credenciais t&eacute;cnicas necess&aacute;rias para funcionamento da integra&ccedil;&atilde;o;</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-cyan-400 mt-1">&bull;</span>
                  <span>mensagens enviadas e recebidas por meio dos canais conectados, quando esse recurso for utilizado;</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-cyan-400 mt-1">&bull;</span>
                  <span>eventos de webhook, registros t&eacute;cnicos, logs de entrega, falha, leitura ou recebimento de mensagens, quando disponibilizados pela API.</span>
                </li>
              </ul>
              <p className="mt-4 text-slate-400">
                Esses dados s&atilde;o tratados exclusivamente para permitir o funcionamento do CRM, gest&atilde;o de
                atendimentos, envio e recebimento de mensagens autorizadas, automa&ccedil;&otilde;es configuradas pela
                pr&oacute;pria empresa usu&aacute;ria, suporte t&eacute;cnico, seguran&ccedil;a, auditoria e melhoria operacional
                da plataforma.
              </p>
            </Section>

            {/* 4. Como usamos os dados */}
            <Section icon={Shield} title="4. Como usamos os dados &mdash; finalidades">
              <p className="mb-4">Usamos os dados pessoais para:</p>
              <ul className="space-y-2">
                <li className="flex items-start gap-3">
                  <span className="text-cyan-400 mt-1">&bull;</span>
                  <span>criar e administrar sua conta, autenticar acesso e manter o funcionamento do sistema;</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-cyan-400 mt-1">&bull;</span>
                  <span>prestar suporte e atendimento, incluindo an&aacute;lise de erros e melhoria de performance;</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-cyan-400 mt-1">&bull;</span>
                  <span>processar pagamentos, cobran&ccedil;as e obriga&ccedil;&otilde;es relacionadas;</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-cyan-400 mt-1">&bull;</span>
                  <span>enviar comunica&ccedil;&otilde;es importantes sobre seguran&ccedil;a, mudan&ccedil;as no sistema, atualiza&ccedil;&otilde;es e avisos operacionais;</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-cyan-400 mt-1">&bull;</span>
                  <span>habilitar e operar integra&ccedil;&otilde;es conectadas pelo usu&aacute;rio ou empresa, incluindo WhatsApp Business, Facebook, Instagram, Messenger e demais recursos autorizados;</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-cyan-400 mt-1">&bull;</span>
                  <span>permitir envio e recebimento de mensagens autorizadas por meio das APIs oficiais conectadas;</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-cyan-400 mt-1">&bull;</span>
                  <span>organizar atendimentos, hist&oacute;ricos de conversa, contatos, automa&ccedil;&otilde;es e fluxos configurados pela empresa usu&aacute;ria;</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-cyan-400 mt-1">&bull;</span>
                  <span>cumprir obriga&ccedil;&otilde;es legais/regulat&oacute;rias e prevenir fraudes, abuso, uso indevido ou acessos n&atilde;o autorizados.</span>
                </li>
              </ul>
              <div className="mt-4 p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
                <p className="text-cyan-100 text-sm">
                  O OMNIFY HUB <strong>n&atilde;o utiliza</strong> dados provenientes das plataformas da Meta para venda de
                  informa&ccedil;&otilde;es, publicidade de terceiros, cria&ccedil;&atilde;o de perfis comerciais externos ou
                  qualquer finalidade incompat&iacute;vel com a presta&ccedil;&atilde;o do servi&ccedil;o contratado.
                </p>
              </div>
            </Section>

            {/* 5. Compartilhamento de dados */}
            <Section icon={Share2} title="5. Compartilhamento de dados">
              <p className="mb-4">
                <strong className="text-white">N&atilde;o vendemos seus dados.</strong> Poderemos compartilhar dados apenas quando necess&aacute;rio para:
              </p>
              <ul className="space-y-2">
                <li className="flex items-start gap-3">
                  <span className="text-cyan-400 mt-1">&bull;</span>
                  <span>Processamento de pagamentos (ex.: adquirentes, gateways, bancos);</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-cyan-400 mt-1">&bull;</span>
                  <span>Infraestrutura/tecnologia (ex.: hospedagem, armazenamento, ferramentas de monitoramento e e-mail), estritamente para operar o servi&ccedil;o;</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-cyan-400 mt-1">&bull;</span>
                  <span>Cumprimento legal (ordem judicial, obriga&ccedil;&otilde;es regulat&oacute;rias, requisi&ccedil;&otilde;es de autoridade competente);</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-cyan-400 mt-1">&bull;</span>
                  <span>Integra&ccedil;&otilde;es ativadas pelo usu&aacute;rio (ex.: provedores e APIs que voc&ecirc; decidir conectar ao sistema).</span>
                </li>
              </ul>
              <p className="mt-4 text-slate-400">
                Sempre que poss&iacute;vel, exigimos que fornecedores tratem os dados com confidencialidade e seguran&ccedil;a compat&iacute;veis.
              </p>
              <div className="mt-6 p-4 bg-slate-700/40 border-l-4 border-cyan-400 rounded-r-lg space-y-3">
                <p className="text-slate-200 text-sm">
                  Dados obtidos por meio das plataformas da Meta, incluindo WhatsApp Business, Facebook, Instagram e
                  Messenger, <strong>n&atilde;o s&atilde;o vendidos, licenciados ou compartilhados</strong> com terceiros
                  para fins comerciais, publicit&aacute;rios ou n&atilde;o relacionados &agrave; presta&ccedil;&atilde;o do
                  servi&ccedil;o.
                </p>
                <p className="text-slate-300 text-sm">
                  O compartilhamento desses dados ocorre apenas quando necess&aacute;rio para operar o servi&ccedil;o,
                  cumprir obriga&ccedil;&otilde;es legais, manter infraestrutura tecnol&oacute;gica, prestar suporte,
                  prevenir fraudes ou viabilizar integra&ccedil;&otilde;es autorizadas pelo pr&oacute;prio
                  usu&aacute;rio/empresa.
                </p>
              </div>
            </Section>

            {/* 6. Armazenamento e retenção */}
            <Section icon={Clock} title="6. Armazenamento e reten&ccedil;&atilde;o">
              <p className="mb-4">Mantemos os dados pelo tempo necess&aacute;rio para:</p>
              <ul className="space-y-2">
                <li className="flex items-start gap-3">
                  <span className="text-cyan-400 mt-1">&bull;</span>
                  <span>fornecer o servi&ccedil;o e cumprir o contrato;</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-cyan-400 mt-1">&bull;</span>
                  <span>atender obriga&ccedil;&otilde;es legais e auditorias;</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-cyan-400 mt-1">&bull;</span>
                  <span>resguardar direitos e prevenir fraudes.</span>
                </li>
              </ul>
              <p className="mt-4 text-slate-400">
                Quando n&atilde;o houver mais necessidade, os dados podem ser exclu&iacute;dos ou anonimizados, respeitando exig&ecirc;ncias legais.
              </p>
            </Section>

            {/* 7. Segurança da informação */}
            <Section icon={Lock} title="7. Seguran&ccedil;a da informa&ccedil;&atilde;o">
              <p>
                Adotamos medidas t&eacute;cnicas e organizacionais para proteger dados contra acesso n&atilde;o autorizado, perda,
                altera&ccedil;&atilde;o, divulga&ccedil;&atilde;o ou destrui&ccedil;&atilde;o, incluindo controles de acesso e boas pr&aacute;ticas de seguran&ccedil;a.
              </p>
              <p className="mt-4 text-slate-400">
                Mesmo assim, nenhum sistema &eacute; 100% invulner&aacute;vel; por isso, voc&ecirc; tamb&eacute;m deve proteger suas credenciais
                e manter seus dispositivos seguros.
              </p>
            </Section>

            {/* 8. Direitos do titular */}
            <Section icon={UserCheck} title="8. Direitos do titular">
              <p className="mb-4">Voc&ecirc; pode solicitar, conforme aplic&aacute;vel:</p>
              <ul className="space-y-2">
                <li className="flex items-start gap-3">
                  <span className="text-cyan-400 mt-1">&bull;</span>
                  <span>confirma&ccedil;&atilde;o de tratamento e acesso aos dados;</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-cyan-400 mt-1">&bull;</span>
                  <span>corre&ccedil;&atilde;o de dados incompletos/inexatos;</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-cyan-400 mt-1">&bull;</span>
                  <span>anonimiza&ccedil;&atilde;o, bloqueio ou elimina&ccedil;&atilde;o;</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-cyan-400 mt-1">&bull;</span>
                  <span>portabilidade (quando aplic&aacute;vel);</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-cyan-400 mt-1">&bull;</span>
                  <span>informa&ccedil;&atilde;o sobre compartilhamentos;</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-cyan-400 mt-1">&bull;</span>
                  <span>revoga&ccedil;&atilde;o de consentimento (quando o tratamento depender de consentimento).</span>
                </li>
              </ul>
            </Section>

            {/* 9. Exclusão de dados do usuário */}
            <Section icon={Trash2} title="9. Exclus&atilde;o de dados do usu&aacute;rio">
              <p className="mb-4">
                O usu&aacute;rio ou empresa pode solicitar a exclus&atilde;o dos seus dados pessoais e dos dados
                associados &agrave;s integra&ccedil;&otilde;es conectadas ao OMNIFY HUB a qualquer momento.
              </p>
              <p className="mb-3 text-slate-300">Para solicitar a exclus&atilde;o, envie um e-mail para:</p>
              <div className="bg-slate-700/30 rounded-xl p-4 mb-4">
                <a
                  href="mailto:omnify@gmail.com?subject=Solicita%C3%A7%C3%A3o%20de%20exclus%C3%A3o%20de%20dados"
                  className="text-cyan-400 hover:text-cyan-300 transition-colors font-mono text-lg"
                >
                  omnify@gmail.com
                </a>
              </div>
              <p className="mb-3">No pedido, informe, quando aplic&aacute;vel:</p>
              <ul className="space-y-2 mb-4">
                <li className="flex items-start gap-3">
                  <span className="text-cyan-400 mt-1">&bull;</span>
                  <span>nome do solicitante;</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-cyan-400 mt-1">&bull;</span>
                  <span>e-mail cadastrado na plataforma;</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-cyan-400 mt-1">&bull;</span>
                  <span>nome da empresa;</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-cyan-400 mt-1">&bull;</span>
                  <span>n&uacute;mero de telefone ou conta conectada;</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-cyan-400 mt-1">&bull;</span>
                  <span>descri&ccedil;&atilde;o da solicita&ccedil;&atilde;o de exclus&atilde;o.</span>
                </li>
              </ul>
              <p className="text-slate-400 mb-4">
                Ap&oacute;s o recebimento da solicita&ccedil;&atilde;o, analisaremos o pedido e realizaremos a
                exclus&atilde;o dos dados pessoais e dos dados de integra&ccedil;&atilde;o vinculados ao usu&aacute;rio
                ou empresa, exceto quando a reten&ccedil;&atilde;o for necess&aacute;ria para cumprimento de
                obriga&ccedil;&atilde;o legal, regulat&oacute;ria, seguran&ccedil;a, preven&ccedil;&atilde;o a fraudes,
                auditoria, defesa de direitos ou cumprimento de contrato.
              </p>
              <p className="text-slate-400 mb-4">
                O usu&aacute;rio tamb&eacute;m pode solicitar a desconex&atilde;o das integra&ccedil;&otilde;es com
                plataformas da Meta, como WhatsApp Business, Facebook, Instagram e Messenger. Quando uma
                integra&ccedil;&atilde;o for desconectada, os tokens, permiss&otilde;es e dados t&eacute;cnicos
                necess&aacute;rios para manter a conex&atilde;o poder&atilde;o ser removidos, desativados ou
                invalidados.
              </p>
              <p className="text-slate-400">
                Caso o usu&aacute;rio remova o aplicativo por meio das configura&ccedil;&otilde;es das plataformas da
                Meta e solicite a exclus&atilde;o dos dados, trataremos a solicita&ccedil;&atilde;o conforme os
                mecanismos disponibilizados pela Meta e/ou conforme solicita&ccedil;&atilde;o enviada aos nossos
                canais oficiais de contato.
              </p>
            </Section>

            {/* 10. Responsabilidade do usuário */}
            <Section icon={AlertCircle} title="10. Responsabilidade do usu&aacute;rio">
              <p className="mb-4">Voc&ecirc; &eacute; respons&aacute;vel:</p>
              <ul className="space-y-2">
                <li className="flex items-start gap-3">
                  <span className="text-cyan-400 mt-1">&bull;</span>
                  <span>pelas informa&ccedil;&otilde;es que inserir no sistema;</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-cyan-400 mt-1">&bull;</span>
                  <span>por manter sigilo de senhas/tokens/chaves de integra&ccedil;&atilde;o;</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-cyan-400 mt-1">&bull;</span>
                  <span>pelo uso que fizer do conhecimento e das funcionalidades (incluindo softwares, automa&ccedil;&otilde;es e integra&ccedil;&otilde;es criadas por voc&ecirc;).</span>
                </li>
              </ul>
              <p className="mt-4 text-slate-400">
                N&atilde;o nos responsabilizamos por danos decorrentes de mau uso do sistema, integra&ccedil;&otilde;es configuradas
                incorretamente ou uso indevido de credenciais por terceiros.
              </p>
            </Section>

            {/* 11. Encerramento do serviço */}
            <Section icon={Power} title="11. Encerramento do servi&ccedil;o e acesso">
              <p>
                Podemos, por motivos operacionais, legais ou comerciais, descontinuar funcionalidades ou encerrar a oferta
                do servi&ccedil;o, observando comunica&ccedil;&otilde;es e obriga&ccedil;&otilde;es aplic&aacute;veis.
              </p>
              <p className="mt-4 text-slate-400">
                Se houver assinatura/plano vigente, o acesso &eacute; garantido durante sua vig&ecirc;ncia; ap&oacute;s o t&eacute;rmino,
                o acesso pode ser encerrado conforme as condi&ccedil;&otilde;es do plano contratado.
              </p>
            </Section>

            {/* 12. Alterações desta Política */}
            <Section icon={FileText} title="12. Altera&ccedil;&otilde;es desta Pol&iacute;tica">
              <p>
                Podemos atualizar esta Pol&iacute;tica a qualquer momento. Se houver mudan&ccedil;as relevantes, comunicaremos
                pelos canais dispon&iacute;veis (ex.: e-mail e avisos no sistema).
              </p>
            </Section>

            {/* 13. Contato */}
            <Section icon={Mail} title="13. Contato">
              <p className="mb-4">
                Para d&uacute;vidas, solicita&ccedil;&otilde;es ou assuntos de privacidade, fale com a gente:
              </p>
              <div className="bg-slate-700/30 rounded-xl p-6 space-y-3">
                <InfoRow label="Empresa" value="OMNIFY SERVI&Ccedil;OS LTDA (OMNIFY HUB)" />
                <InfoRow label="CNPJ" value="64.962.976/0001-28" />
                <InfoRow label="E-mail" value="omnify@gmail.com" />
                <InfoRow label="Telefone/WhatsApp" value="(21) 9035-5975" />
                <InfoRow label="Endere&ccedil;o" value="R Mariano Sendra dos Santos, s/n, Box 8, Centro, CEP 25.010-080, Duque de Caxias/RJ" />
              </div>
            </Section>
          </div>
        </div>

          {/* Footer */}
          <footer className="text-center mt-8 text-slate-500 text-sm pb-8">
            <p>&copy; {new Date().getFullYear()} OMNIFY HUB. Todos os direitos reservados.</p>
            <div className="mt-4 flex justify-center gap-4">
              <Link to="/terms" className="text-cyan-400 hover:text-cyan-300 transition-colors">
                Termos de Uso
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
