import { SEOHead } from '@/components/novosite/SEOHead';
import { Breadcrumbs } from '@/components/novosite/Breadcrumbs';

export default function SiteTermos() {
  return (
    <>
      <SEOHead
        title="Termos de Uso"
        description="Termos de Uso do site YESlaser Praia Grande. Condicoes de uso, compras, cancelamento e responsabilidades."
        noIndex
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumbs items={[{ label: 'Termos de Uso' }]} />

        <article className="prose prose-purple max-w-none mt-6">
          <h1 className="text-3xl font-bold text-gray-900">Termos de Uso</h1>
          <p className="text-sm text-muted-foreground">
            Ultima atualizacao: 24 de marco de 2026
          </p>

          <section className="mt-8">
            <h2 className="text-xl font-semibold text-gray-900">1. Aceitacao dos Termos</h2>
            <p className="text-gray-600 leading-relaxed">
              Ao acessar e utilizar o site da YESlaser Praia Grande, voce concorda com estes
              Termos de Uso e com nossa Politica de Privacidade. Caso nao concorde com algum
              dos termos aqui descritos, solicitamos que nao utilize nossos servicos online.
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-xl font-semibold text-gray-900">2. Uso do Site</h2>
            <p className="text-gray-600 leading-relaxed">
              Este site tem como finalidade apresentar os servicos de depilacao a laser,
              estetica facial e corporal oferecidos pela YESlaser Praia Grande, bem como
              permitir o agendamento de avaliacoes e a aquisicao de pacotes e servicos.
            </p>
            <p className="text-gray-600 leading-relaxed">
              Voce se compromete a utilizar o site de forma licita, respeitando a legislacao
              vigente, a moral, os bons costumes e a ordem publica. E proibido:
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li>Utilizar o site para fins ilegais ou nao autorizados;</li>
              <li>Tentar acessar areas restritas do sistema sem autorizacao;</li>
              <li>Reproduzir, distribuir ou modificar o conteudo do site sem autorizacao previa;</li>
              <li>Inserir ou transmitir virus, malware ou qualquer codigo malicioso;</li>
              <li>Utilizar robos, scrapers ou ferramentas automatizadas para extrair dados do site.</li>
            </ul>
          </section>

          <section className="mt-8">
            <h2 className="text-xl font-semibold text-gray-900">3. Compras e Pagamentos</h2>
            <p className="text-gray-600 leading-relaxed">
              Ao realizar uma compra ou contratar um servico atraves do nosso site, voce declara
              que as informacoes fornecidas sao verdadeiras e completas. Os precos exibidos no
              site sao em Reais (R$) e podem ser alterados sem aviso previo.
            </p>
            <p className="text-gray-600 leading-relaxed">
              Os meios de pagamento aceitos sao: cartao de credito, cartao de debito, PIX e
              boleto bancario. O processamento do pagamento e realizado por plataformas de
              pagamento seguras e certificadas.
            </p>
            <p className="text-gray-600 leading-relaxed">
              A confirmacao da compra sera enviada por e-mail e/ou WhatsApp apos a aprovacao
              do pagamento pela operadora financeira.
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-xl font-semibold text-gray-900">4. Cancelamento e Reembolso</h2>
            <p className="text-gray-600 leading-relaxed">
              O cancelamento de servicos pode ser solicitado em ate 7 (sete) dias apos a
              contratacao, conforme o Codigo de Defesa do Consumidor (art. 49). Apos esse
              prazo, o cancelamento esta sujeito as condicoes estabelecidas no contrato de
              prestacao de servicos.
            </p>
            <p className="text-gray-600 leading-relaxed">
              Para solicitar cancelamento ou reembolso, entre em contato pelo WhatsApp
              (13) 99188-8100 ou pelo e-mail contato@yeslaserpraiagrande.com.br.
            </p>
            <p className="text-gray-600 leading-relaxed">
              O reembolso sera processado no mesmo meio de pagamento utilizado na compra,
              em ate 30 (trinta) dias uteis apos a aprovacao da solicitacao.
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-xl font-semibold text-gray-900">5. Agendamentos</h2>
            <p className="text-gray-600 leading-relaxed">
              Os agendamentos realizados pelo site estao sujeitos a disponibilidade de
              horarios. A YESlaser se reserva o direito de remarcar sessoes em caso de
              imprevistos, comunicando o cliente com antecedencia.
            </p>
            <p className="text-gray-600 leading-relaxed">
              O nao comparecimento sem aviso previo de ate 2 horas antes do horario agendado
              podera acarretar cobranca de taxa de no-show, conforme politica da unidade.
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-xl font-semibold text-gray-900">6. Propriedade Intelectual</h2>
            <p className="text-gray-600 leading-relaxed">
              Todo o conteudo presente neste site, incluindo textos, imagens, logotipos,
              icones, videos, design e software, e protegido por direitos autorais e
              propriedade intelectual da YESlaser ou de seus licenciadores.
            </p>
            <p className="text-gray-600 leading-relaxed">
              E proibida a reproducao, distribuicao, modificacao ou uso comercial de qualquer
              conteudo sem autorizacao expressa e por escrito da YESlaser.
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-xl font-semibold text-gray-900">7. Limitacao de Responsabilidade</h2>
            <p className="text-gray-600 leading-relaxed">
              A YESlaser nao se responsabiliza por:
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li>Interrupcoes temporarias no funcionamento do site por manutencao ou falhas tecnicas;</li>
              <li>Danos causados por uso indevido do site pelo usuario;</li>
              <li>Conteudo de sites de terceiros acessados atraves de links presentes neste site;</li>
              <li>Resultados individuais dos tratamentos, que podem variar conforme caracteristicas pessoais do cliente.</li>
            </ul>
          </section>

          <section className="mt-8">
            <h2 className="text-xl font-semibold text-gray-900">8. Alteracoes nos Termos</h2>
            <p className="text-gray-600 leading-relaxed">
              A YESlaser se reserva o direito de alterar estes Termos de Uso a qualquer momento,
              sem aviso previo. As alteracoes entram em vigor imediatamente apos sua publicacao
              no site. Recomendamos a consulta periodica desta pagina.
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-xl font-semibold text-gray-900">9. Foro</h2>
            <p className="text-gray-600 leading-relaxed">
              Fica eleito o foro da Comarca de Praia Grande - SP para dirimir quaisquer
              controversias oriundas destes Termos de Uso, com renuncia expressa a qualquer
              outro, por mais privilegiado que seja.
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-xl font-semibold text-gray-900">10. Contato</h2>
            <p className="text-gray-600 leading-relaxed">
              Em caso de duvidas sobre estes Termos de Uso, entre em contato:
            </p>
            <ul className="list-none pl-0 text-gray-600 space-y-1">
              <li><strong>WhatsApp:</strong> (13) 99188-8100</li>
              <li><strong>E-mail:</strong> contato@yeslaserpraiagrande.com.br</li>
              <li><strong>Endereco:</strong> Av. Presidente Kennedy, 6295 - Guilhermina, Praia Grande - SP</li>
            </ul>
          </section>
        </article>
      </div>
    </>
  );
}
