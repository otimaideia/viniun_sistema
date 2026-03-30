import { Link } from 'react-router-dom';
import { Heart, Target, Eye, Zap, Award, Users, MapPin, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { SEOHead } from '@/components/novosite/SEOHead';
import { Breadcrumbs } from '@/components/novosite/Breadcrumbs';

const WHATSAPP_URL = 'https://wa.me/5513991888100?text=Ol%C3%A1!%20Gostaria%20de%20agendar%20uma%20avalia%C3%A7%C3%A3o%20gratuita.';

const VALUES = [
  {
    icon: Heart,
    title: 'Cuidado',
    description: 'Tratamos cada cliente de forma unica, com atencao e carinho em cada procedimento.',
  },
  {
    icon: Award,
    title: 'Excelencia',
    description: 'Buscamos os melhores resultados com equipamentos de ultima geracao e profissionais qualificados.',
  },
  {
    icon: Users,
    title: 'Humanizacao',
    description: 'Acreditamos que a beleza e autoestima caminham juntas com o respeito e a empatia.',
  },
  {
    icon: Zap,
    title: 'Inovacao',
    description: 'Investimos continuamente em tecnologias e tecnicas avancadas para oferecer o melhor tratamento.',
  },
];

const ABOUT_JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'AboutPage',
  name: 'Sobre a YESlaser Praia Grande',
  description: 'Conheca a historia, missao e valores da YESlaser Praia Grande, referencia em depilacao a laser e estetica avancada.',
  url: 'https://www.yeslaserpraiagrande.com.br/novosite/sobre',
  mainEntity: {
    '@type': 'LocalBusiness',
    name: 'YESlaser Praia Grande',
    description: 'Clinica de depilacao a laser e estetica avancada em Praia Grande - SP.',
    telephone: '+5513991888100',
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Av. Presidente Kennedy, 6295 - Loja 18',
      addressLocality: 'Praia Grande',
      addressRegion: 'SP',
      postalCode: '11702-200',
      addressCountry: 'BR',
    },
  },
};

export default function SiteSobre() {
  return (
    <>
      <SEOHead
        title="Sobre a YESlaser"
        description="Conheca a YESlaser Praia Grande: nossa historia, missao, valores e equipe. Referencia em depilacao a laser e estetica avancada na Baixada Santista."
        jsonLd={ABOUT_JSON_LD}
      />

      {/* Hero */}
      <section className="bg-gradient-to-br from-[#6B2D8B] to-[#5A2574] text-white py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Sobre a <span className="text-purple-200">YES</span>laser
            </h1>
            <p className="text-lg md:text-xl text-purple-100 leading-relaxed">
              Referencia em depilacao a laser e estetica avancada em Praia Grande.
              Combinamos tecnologia de ponta com atendimento humanizado para transformar
              a autoestima de nossos clientes.
            </p>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumbs items={[{ label: 'Sobre' }]} />

        {/* History */}
        <section className="py-12 md:py-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Nossa Historia</h2>
              <div className="space-y-4 text-gray-600 leading-relaxed">
                <p>
                  A YESlaser nasceu com a missao de democratizar o acesso a depilacao a laser
                  de alta qualidade. Com equipamentos de ultima geracao e uma equipe altamente
                  qualificada, nos tornamos referencia na Baixada Santista em tratamentos
                  esteticos seguros e eficazes.
                </p>
                <p>
                  Nossa unidade em Praia Grande foi planejada para oferecer uma experiencia
                  completa: desde a avaliacao gratuita ate o acompanhamento pos-tratamento,
                  cada detalhe foi pensado para proporcionar conforto, seguranca e resultados
                  excepcionais.
                </p>
                <p>
                  Alem da depilacao a laser, ampliamos nosso portfolio para incluir
                  procedimentos de estetica facial e corporal, sempre com o mesmo padrao
                  de qualidade e atencao que nos diferencia no mercado.
                </p>
              </div>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-8 flex items-center justify-center min-h-[300px]">
              <div className="text-center">
                <h3 className="text-6xl font-bold text-[#6B2D8B]">YES</h3>
                <p className="text-2xl font-light text-gray-700">laser</p>
                <p className="text-sm text-gray-500 mt-2 uppercase tracking-widest">Praia Grande</p>
              </div>
            </div>
          </div>
        </section>

        {/* Mission & Vision */}
        <section className="py-12 md:py-16 border-t">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="border-0 shadow-lg">
              <CardContent className="p-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-[#6B2D8B]/10 flex items-center justify-center">
                    <Target className="h-6 w-6 text-[#6B2D8B]" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900">Missao</h3>
                </div>
                <p className="text-gray-600 leading-relaxed">
                  Proporcionar tratamentos esteticos de excelencia, com tecnologia de ponta
                  e atendimento humanizado, contribuindo para a autoestima e bem-estar de
                  nossos clientes, tornando a beleza acessivel a todos.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardContent className="p-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-[#6B2D8B]/10 flex items-center justify-center">
                    <Eye className="h-6 w-6 text-[#6B2D8B]" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900">Visao</h3>
                </div>
                <p className="text-gray-600 leading-relaxed">
                  Ser a principal referencia em depilacao a laser e estetica avancada na
                  Baixada Santista, reconhecida pela inovacao, qualidade de atendimento e
                  compromisso com resultados que transformam vidas.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Values */}
        <section className="py-12 md:py-16 border-t">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">Nossos Valores</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {VALUES.map((value) => (
              <Card key={value.title} className="border-0 shadow-md hover:shadow-lg transition-shadow text-center">
                <CardContent className="p-6">
                  <div className="w-14 h-14 rounded-full bg-[#6B2D8B]/10 flex items-center justify-center mx-auto mb-4">
                    <value.icon className="h-7 w-7 text-[#6B2D8B]" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{value.title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{value.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Equipment */}
        <section className="py-12 md:py-16 border-t">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-4">
            Tecnologia de Ponta
          </h2>
          <p className="text-gray-600 text-center max-w-2xl mx-auto mb-12">
            Investimos nos melhores equipamentos do mercado para garantir resultados
            superiores com seguranca e conforto.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="border-0 shadow-md">
              <CardContent className="p-6">
                <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center mb-4">
                  <Zap className="h-6 w-6 text-[#6B2D8B]" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Laser de Diodo</h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Tecnologia de diodo de alta potencia para depilacao definitiva. Eficaz em
                  todos os fototipos de pele, com sistema de resfriamento integrado para
                  maximo conforto durante o procedimento.
                </p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-md">
              <CardContent className="p-6">
                <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center mb-4">
                  <Zap className="h-6 w-6 text-[#6B2D8B]" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Laser Alexandrite</h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Ideal para peles claras e pelos finos. Comprimento de onda de 755nm que
                  atinge com precisao o foliculo piloso, garantindo resultados rapidos e
                  eficientes com menor numero de sessoes.
                </p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-md">
              <CardContent className="p-6">
                <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center mb-4">
                  <Zap className="h-6 w-6 text-[#6B2D8B]" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Nd:YAG</h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Tecnologia segura para peles negras e morenas. Comprimento de onda de
                  1064nm que penetra profundamente na pele sem danificar a melanina
                  superficial, garantindo seguranca e eficacia.
                </p>
              </CardContent>
            </Card>
          </div>
          <div className="text-center mt-8">
            <Button asChild variant="outline" size="lg">
              <Link to="/novosite/tecnologias">
                Conheca todas as nossas tecnologias
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </div>
        </section>

        {/* Team */}
        <section className="py-12 md:py-16 border-t">
          <div className="bg-gradient-to-br from-purple-50 to-white rounded-2xl p-8 md:p-12">
            <div className="max-w-3xl mx-auto text-center">
              <Users className="h-12 w-12 text-[#6B2D8B] mx-auto mb-4" />
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Nossa Equipe</h2>
              <p className="text-gray-600 leading-relaxed mb-6">
                Nossa equipe e formada por profissionais altamente qualificados e em constante
                atualizacao. Todos passam por treinamentos rigorosos e certificacoes para
                garantir que voce receba o melhor atendimento possivel, com seguranca e
                resultados comprovados.
              </p>
              <p className="text-gray-600 leading-relaxed">
                Da recepcao ate o pos-tratamento, cada membro da equipe YESlaser esta
                comprometido com sua satisfacao e bem-estar.
              </p>
            </div>
          </div>
        </section>

        {/* Location */}
        <section className="py-12 md:py-16 border-t">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-8">
            Nossa Localizacao
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-[#6B2D8B] mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-gray-900">YESlaser Praia Grande</h3>
                  <p className="text-gray-600">
                    Av. Presidente Kennedy, 6295 - Loja 18<br />
                    Guilhermina, Praia Grande - SP<br />
                    CEP 11702-200
                  </p>
                </div>
              </div>
              <div className="space-y-2 text-gray-600">
                <p><strong>Horario de funcionamento:</strong></p>
                <p>Segunda a Sexta: 9h as 20h</p>
                <p>Sabado: 9h as 17h</p>
                <p>Domingo: Fechado</p>
              </div>
            </div>
            <div className="rounded-xl overflow-hidden shadow-lg h-[300px]">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3645.6!2d-46.4028!3d-24.0058!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMjTCsDAwJzIxLjAiUyA0NsKwMjQnMTAuMSJX!5e0!3m2!1spt-BR!2sbr!4v1"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Localizacao YESlaser Praia Grande"
              />
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-12 md:py-16 border-t">
          <div className="bg-gradient-to-br from-[#6B2D8B] to-[#5A2574] rounded-2xl p-8 md:p-12 text-center text-white">
            <h2 className="text-3xl font-bold mb-4">Agende sua Avaliacao Gratuita</h2>
            <p className="text-purple-100 max-w-2xl mx-auto mb-8">
              Venha conhecer nossa clinica e descubra o melhor tratamento para voce.
              A avaliacao e gratuita e sem compromisso.
            </p>
            <Button
              asChild
              size="lg"
              className="bg-white text-[#6B2D8B] hover:bg-purple-50 font-semibold text-lg px-8"
            >
              <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
                Agendar Avaliacao
                <ArrowRight className="h-5 w-5 ml-2" />
              </a>
            </Button>
          </div>
        </section>
      </div>
    </>
  );
}
