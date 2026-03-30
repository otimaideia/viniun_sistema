import { SEOHead } from '@/components/novosite/SEOHead';
import { Breadcrumbs } from '@/components/novosite/Breadcrumbs';

export default function SitePrivacidade() {
  return (
    <>
      <SEOHead
        title="Politica de Privacidade"
        description="Politica de Privacidade da YESlaser Praia Grande. Saiba como coletamos, usamos e protegemos seus dados pessoais em conformidade com a LGPD."
        noIndex
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumbs items={[{ label: 'Politica de Privacidade' }]} />

        <article className="prose prose-purple max-w-none mt-6">
          <h1 className="text-3xl font-bold text-gray-900">Politica de Privacidade</h1>
          <p className="text-sm text-muted-foreground">
            Ultima atualizacao: 24 de marco de 2026
          </p>

          <p className="text-gray-600 leading-relaxed mt-6">
            A YESlaser Praia Grande respeita a sua privacidade e esta comprometida com a
            protecao dos seus dados pessoais. Esta Politica de Privacidade descreve como
            coletamos, usamos, armazenamos e compartilhamos suas informacoes, em conformidade
            com a Lei Geral de Protecao de Dados Pessoais (LGPD - Lei n. 13.709/2018).
          </p>

          <section className="mt-8">
            <h2 className="text-xl font-semibold text-gray-900">1. Dados que Coletamos</h2>
            <p className="text-gray-600 leading-relaxed">
              Coletamos os seguintes tipos de dados pessoais:
            </p>

            <h3 className="text-lg font-medium text-gray-800 mt-4">1.1 Dados fornecidos por voce</h3>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li><strong>Dados de identificacao:</strong> nome completo, CPF, data de nascimento;</li>
              <li><strong>Dados de contato:</strong> e-mail, telefone, endereco;</li>
              <li><strong>Dados de saude:</strong> informacoes sobre tipo de pele, historico de tratamentos, alergias e condicoes medicas relevantes para a prestacao dos servicos;</li>
              <li><strong>Dados de pagamento:</strong> informacoes de cartao de credito, dados bancarios (processados por plataformas seguras de pagamento).</li>
            </ul>

            <h3 className="text-lg font-medium text-gray-800 mt-4">1.2 Dados coletados automaticamente</h3>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li><strong>Dados de navegacao:</strong> endereco IP, tipo de navegador, paginas visitadas, tempo de permanencia;</li>
              <li><strong>Cookies e tecnologias similares:</strong> identificadores de sessao, preferencias de navegacao;</li>
              <li><strong>Dados de dispositivo:</strong> sistema operacional, resolucao de tela, idioma configurado.</li>
            </ul>
          </section>

          <section className="mt-8">
            <h2 className="text-xl font-semibold text-gray-900">2. Finalidade do Tratamento</h2>
            <p className="text-gray-600 leading-relaxed">
              Utilizamos seus dados pessoais para as seguintes finalidades:
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li><strong>Prestacao de servicos:</strong> agendamento de sessoes, avaliacao personalizada, historico de tratamentos;</li>
              <li><strong>Comunicacao:</strong> envio de confirmacoes de agendamento, lembretes de sessoes, atualizacoes sobre seus tratamentos;</li>
              <li><strong>Marketing:</strong> envio de promocoes, novidades e conteudos relevantes (com seu consentimento previo);</li>
              <li><strong>Melhoria dos servicos:</strong> analise de satisfacao, pesquisas de qualidade, aprimoramento da experiencia do usuario;</li>
              <li><strong>Obrigacoes legais:</strong> cumprimento de obrigacoes fiscais, contabeis e regulatorias;</li>
              <li><strong>Seguranca:</strong> prevencao de fraudes e protecao contra acessos nao autorizados.</li>
            </ul>
          </section>

          <section className="mt-8">
            <h2 className="text-xl font-semibold text-gray-900">3. Base Legal para o Tratamento</h2>
            <p className="text-gray-600 leading-relaxed">
              O tratamento dos seus dados pessoais e realizado com base nas seguintes
              hipoteses legais previstas na LGPD:
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li><strong>Consentimento (art. 7, I):</strong> para envio de comunicacoes de marketing;</li>
              <li><strong>Execucao de contrato (art. 7, V):</strong> para prestacao dos servicos contratados;</li>
              <li><strong>Obrigacao legal (art. 7, II):</strong> para cumprimento de obrigacoes fiscais e regulatorias;</li>
              <li><strong>Interesse legitimo (art. 7, IX):</strong> para melhoria dos servicos e seguranca;</li>
              <li><strong>Protecao da saude (art. 11, II, f):</strong> para tratamento de dados sensiveis relacionados a saude.</li>
            </ul>
          </section>

          <section className="mt-8">
            <h2 className="text-xl font-semibold text-gray-900">4. Compartilhamento de Dados</h2>
            <p className="text-gray-600 leading-relaxed">
              Seus dados pessoais podem ser compartilhados com:
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li><strong>Processadores de pagamento:</strong> para efetivacao de transacoes financeiras;</li>
              <li><strong>Plataformas de comunicacao:</strong> para envio de mensagens via WhatsApp, e-mail e SMS;</li>
              <li><strong>Prestadores de servicos de TI:</strong> para hospedagem, manutencao e seguranca dos sistemas;</li>
              <li><strong>Autoridades publicas:</strong> quando exigido por lei ou determinacao judicial.</li>
            </ul>
            <p className="text-gray-600 leading-relaxed">
              Nao vendemos, alugamos ou compartilhamos seus dados pessoais com terceiros
              para fins de marketing sem o seu consentimento explicito.
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-xl font-semibold text-gray-900">5. Seus Direitos (LGPD)</h2>
            <p className="text-gray-600 leading-relaxed">
              Conforme a LGPD, voce possui os seguintes direitos em relacao aos seus dados pessoais:
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li><strong>Confirmacao e acesso:</strong> confirmar a existencia e acessar seus dados;</li>
              <li><strong>Correcao:</strong> solicitar a correcao de dados incompletos ou desatualizados;</li>
              <li><strong>Anonimizacao ou eliminacao:</strong> solicitar a anonimizacao ou eliminacao de dados desnecessarios;</li>
              <li><strong>Portabilidade:</strong> solicitar a transferencia dos seus dados para outro fornecedor;</li>
              <li><strong>Revogacao do consentimento:</strong> revogar o consentimento para tratamento de dados a qualquer momento;</li>
              <li><strong>Oposicao:</strong> opor-se ao tratamento de dados quando realizado sem consentimento;</li>
              <li><strong>Informacao:</strong> ser informado sobre o compartilhamento de dados com terceiros;</li>
              <li><strong>Revisao de decisoes automatizadas:</strong> solicitar revisao de decisoes tomadas exclusivamente por meios automatizados.</li>
            </ul>
            <p className="text-gray-600 leading-relaxed">
              Para exercer seus direitos, entre em contato com nosso Encarregado de Protecao
              de Dados (DPO) pelos canais indicados na secao de contato.
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-xl font-semibold text-gray-900">6. Cookies</h2>
            <p className="text-gray-600 leading-relaxed">
              Utilizamos cookies e tecnologias similares para melhorar sua experiencia de
              navegacao. Os tipos de cookies utilizados sao:
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li><strong>Cookies essenciais:</strong> necessarios para o funcionamento basico do site;</li>
              <li><strong>Cookies de desempenho:</strong> coletam informacoes anonimas sobre como os visitantes usam o site;</li>
              <li><strong>Cookies de funcionalidade:</strong> permitem que o site lembre suas escolhas e preferencias;</li>
              <li><strong>Cookies de marketing:</strong> utilizados para exibir anuncios relevantes (com seu consentimento).</li>
            </ul>
            <p className="text-gray-600 leading-relaxed">
              Voce pode gerenciar suas preferencias de cookies atraves das configuracoes do
              seu navegador. A desativacao de cookies pode afetar a funcionalidade do site.
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-xl font-semibold text-gray-900">7. Seguranca dos Dados</h2>
            <p className="text-gray-600 leading-relaxed">
              Adotamos medidas tecnicas e organizacionais adequadas para proteger seus dados
              pessoais contra acesso nao autorizado, perda, alteracao ou destruicao, incluindo:
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li>Criptografia de dados em transito e em repouso;</li>
              <li>Controle de acesso baseado em funcoes;</li>
              <li>Monitoramento continuo de seguranca;</li>
              <li>Backups regulares e plano de recuperacao de desastres;</li>
              <li>Treinamento da equipe em boas praticas de seguranca da informacao.</li>
            </ul>
          </section>

          <section className="mt-8">
            <h2 className="text-xl font-semibold text-gray-900">8. Retencao de Dados</h2>
            <p className="text-gray-600 leading-relaxed">
              Seus dados pessoais serao retidos pelo tempo necessario para cumprimento das
              finalidades para as quais foram coletados, respeitando os prazos legais
              aplicaveis. Dados de clientes sao mantidos por no minimo 5 (cinco) anos apos
              o ultimo servico prestado, conforme legislacao fiscal e de saude.
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-xl font-semibold text-gray-900">9. Alteracoes nesta Politica</h2>
            <p className="text-gray-600 leading-relaxed">
              Esta Politica de Privacidade pode ser atualizada periodicamente. Recomendamos
              que voce consulte esta pagina regularmente. Alteracoes significativas serao
              comunicadas por e-mail ou aviso no site.
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-xl font-semibold text-gray-900">10. Contato do Encarregado (DPO)</h2>
            <p className="text-gray-600 leading-relaxed">
              Para duvidas, solicitacoes ou reclamacoes relacionadas a esta Politica de
              Privacidade ou ao tratamento dos seus dados pessoais, entre em contato:
            </p>
            <ul className="list-none pl-0 text-gray-600 space-y-1">
              <li><strong>Encarregado de Protecao de Dados:</strong> YESlaser Praia Grande</li>
              <li><strong>E-mail:</strong> privacidade@yeslaserpraiagrande.com.br</li>
              <li><strong>WhatsApp:</strong> (13) 99188-8100</li>
              <li><strong>Endereco:</strong> Av. Presidente Kennedy, 6295 - Guilhermina, Praia Grande - SP, CEP 11702-200</li>
            </ul>
          </section>
        </article>
      </div>
    </>
  );
}
