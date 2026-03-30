import { Link } from 'react-router-dom';
import { Zap, Shield, Clock, CheckCircle, ArrowRight, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SEOHead } from '@/components/novosite/SEOHead';
import { Breadcrumbs } from '@/components/novosite/Breadcrumbs';

const WHATSAPP_URL = 'https://wa.me/5513991888100?text=Ol%C3%A1!%20Gostaria%20de%20saber%20mais%20sobre%20as%20tecnologias%20da%20YESlaser.';

interface Technology {
  name: string;
  subtitle: string;
  description: string;
  benefits: string[];
  specs: { label: string; value: string }[];
  services: string[];
  image: string;
  badge?: string;
}

const TECHNOLOGIES: Technology[] = [
  {
    name: 'Laser de Diodo',
    subtitle: 'A tecnologia mais versátil para depilação definitiva',
    description:
      'O Laser de Diodo e a tecnologia mais utilizada no mundo para depilacao definitiva. Com comprimento de onda de 808nm, atinge diretamente o foliculo piloso, destruindo-o sem danificar os tecidos ao redor. Seu sistema de resfriamento integrado garante conforto durante todo o procedimento.',
    benefits: [
      'Eficaz em todos os fototipos de pele (I a VI)',
      'Sistema de resfriamento para maximo conforto',
      'Sessoes rapidas com ponteira de grande area',
      'Resultados visiveis desde a primeira sessao',
      'Seguro e aprovado pela ANVISA',
    ],
    specs: [
      { label: 'Comprimento de onda', value: '808nm' },
      { label: 'Fototipos', value: 'I a VI' },
      { label: 'Area da ponteira', value: '12x12mm' },
      { label: 'Resfriamento', value: 'Integrado' },
    ],
    services: ['Depilacao a Laser Corporal', 'Depilacao a Laser Facial', 'Pacotes Corpo Todo'],
    image: '/images/landing/hero-yeslaser.png',
    badge: 'Mais Popular',
  },
  {
    name: 'Laser Alexandrite',
    subtitle: 'Alta precisao para peles claras e pelos finos',
    description:
      'O Laser Alexandrite opera no comprimento de onda de 755nm, sendo especialmente eficaz para peles claras (fototipos I a III). Sua alta afinidade com a melanina do pelo permite tratamentos mais rapidos e com menor numero de sessoes. E considerado o "padrao ouro" para depilacao em peles claras.',
    benefits: [
      'Maior velocidade de disparo entre os lasers',
      'Excelente para pelos finos e claros',
      'Menor numero de sessoes necessarias',
      'Precisao milimetrica no alvo',
      'Tecnologia consagrada mundialmente',
    ],
    specs: [
      { label: 'Comprimento de onda', value: '755nm' },
      { label: 'Fototipos', value: 'I a III' },
      { label: 'Velocidade', value: 'Alta' },
      { label: 'Sessoes medias', value: '6 a 8' },
    ],
    services: ['Depilacao Facial', 'Depilacao de Areas Pequenas', 'Tratamento de Pelos Finos'],
    image: '/images/landing/hero-yeslaser.png',
  },
  {
    name: 'Laser Nd:YAG',
    subtitle: 'Seguranca comprovada para peles negras e morenas',
    description:
      'O Laser Nd:YAG utiliza comprimento de onda de 1064nm, que penetra mais profundamente na pele sem ser absorvido pela melanina superficial. Isso torna este laser a opcao mais segura para peles negras e morenas (fototipos IV a VI), eliminando o risco de manchas ou queimaduras.',
    benefits: [
      'Mais seguro para peles negras e morenas',
      'Sem risco de hiperpigmentacao',
      'Penetracao profunda no foliculo',
      'Ideal para pelos grossos e escuros',
      'Aprovado para todos os fototipos escuros',
    ],
    specs: [
      { label: 'Comprimento de onda', value: '1064nm' },
      { label: 'Fototipos', value: 'IV a VI' },
      { label: 'Penetracao', value: 'Profunda' },
      { label: 'Seguranca', value: 'Maxima' },
    ],
    services: ['Depilacao para Peles Negras', 'Depilacao Corporal', 'Tratamentos Inclusivos'],
    image: '/images/landing/hero-yeslaser.png',
  },
  {
    name: 'Luz Intensa Pulsada (IPL)',
    subtitle: 'Versatilidade para rejuvenescimento e manchas',
    description:
      'A Luz Intensa Pulsada (IPL) utiliza um espectro amplo de luz para tratar diversas condicoes esteticas. Alem da depilacao, e eficaz no tratamento de manchas, vasos, rosácea e rejuvenescimento facial. Sua versatilidade a torna um complemento ideal aos tratamentos a laser.',
    benefits: [
      'Multiplas aplicacoes esteticas',
      'Tratamento de manchas e vasos',
      'Rejuvenescimento facial',
      'Melhora da textura da pele',
      'Procedimento nao invasivo',
    ],
    specs: [
      { label: 'Espectro', value: '400-1200nm' },
      { label: 'Aplicacoes', value: 'Multiplas' },
      { label: 'Recuperacao', value: 'Minima' },
      { label: 'Sessoes', value: '4 a 6' },
    ],
    services: ['Rejuvenescimento Facial', 'Tratamento de Manchas', 'Fechamento de Poros'],
    image: '/images/landing/hero-yeslaser.png',
  },
  {
    name: 'Radiofrequencia',
    subtitle: 'Firmeza e contorno corporal sem cirurgia',
    description:
      'A Radiofrequencia utiliza ondas eletromagneticas para aquecer as camadas profundas da pele, estimulando a producao de colageno e elastina. O resultado e uma pele mais firme, com reducao de flacidez e melhora do contorno corporal, tudo sem cirurgia e sem tempo de recuperacao.',
    benefits: [
      'Estimula producao natural de colageno',
      'Reduz flacidez facial e corporal',
      'Melhora o contorno corporal',
      'Sem tempo de recuperacao',
      'Resultados progressivos e duradouros',
    ],
    specs: [
      { label: 'Tipo', value: 'Monopolar/Bipolar' },
      { label: 'Profundidade', value: 'Derme profunda' },
      { label: 'Recuperacao', value: 'Nenhuma' },
      { label: 'Sessoes', value: '6 a 10' },
    ],
    services: ['Tratamento de Flacidez', 'Contorno Corporal', 'Rejuvenescimento Facial'],
    image: '/images/landing/hero-yeslaser.png',
  },
];

export default function SiteTecnologias() {
  return (
    <>
      <SEOHead
        title="Nossas Tecnologias"
        description="Conheca as tecnologias de ponta utilizadas pela YESlaser Praia Grande: Laser de Diodo, Alexandrite, Nd:YAG, IPL e Radiofrequencia."
      />

      {/* Hero */}
      <section className="bg-gradient-to-br from-gray-900 to-gray-800 text-white py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Badge className="bg-[#6B2D8B]/20 text-[#6B2D8B] border-[#6B2D8B]/30 mb-4">
            <Zap className="h-3 w-3 mr-1" />
            Tecnologia de Ponta
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Nossas Tecnologias
          </h1>
          <p className="text-lg md:text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
            Investimos nos equipamentos mais avancados do mercado para garantir
            resultados superiores com seguranca e conforto para todos os tipos de pele.
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumbs items={[{ label: 'Tecnologias' }]} />

        {/* Technology Sections */}
        <div className="space-y-16 py-12">
          {TECHNOLOGIES.map((tech, index) => {
            const isReversed = index % 2 === 1;
            return (
              <section
                key={tech.name}
                className="border-b pb-16 last:border-b-0 last:pb-0"
              >
                <div
                  className={`grid grid-cols-1 lg:grid-cols-2 gap-12 items-start ${
                    isReversed ? 'lg:grid-flow-dense' : ''
                  }`}
                >
                  {/* Content */}
                  <div className={isReversed ? 'lg:col-start-2' : ''}>
                    <div className="flex items-center gap-3 mb-2">
                      <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
                        {tech.name}
                      </h2>
                      {tech.badge && (
                        <Badge className="bg-[#6B2D8B] text-white">
                          <Star className="h-3 w-3 mr-1" />
                          {tech.badge}
                        </Badge>
                      )}
                    </div>
                    <p className="text-[#6B2D8B] font-medium mb-4">{tech.subtitle}</p>
                    <p className="text-gray-600 leading-relaxed mb-6">{tech.description}</p>

                    {/* Benefits */}
                    <div className="mb-6">
                      <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">
                        Beneficios
                      </h3>
                      <ul className="space-y-2">
                        {tech.benefits.map((benefit) => (
                          <li key={benefit} className="flex items-start gap-2 text-gray-600">
                            <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                            <span className="text-sm">{benefit}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Related Services */}
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">
                        Servicos Relacionados
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {tech.services.map((service) => (
                          <Badge key={service} variant="outline" className="text-xs">
                            {service}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Specs Card */}
                  <div className={isReversed ? 'lg:col-start-1' : ''}>
                    <Card className="border-0 shadow-lg bg-gradient-to-br from-gray-50 to-white">
                      <CardContent className="p-6">
                        <div className="flex items-center gap-2 mb-6">
                          <div className="w-10 h-10 rounded-full bg-[#6B2D8B]/10 flex items-center justify-center">
                            <Zap className="h-5 w-5 text-[#6B2D8B]" />
                          </div>
                          <h3 className="font-semibold text-gray-900">Especificacoes Tecnicas</h3>
                        </div>
                        <div className="space-y-4">
                          {tech.specs.map((spec) => (
                            <div
                              key={spec.label}
                              className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                            >
                              <span className="text-sm text-gray-500">{spec.label}</span>
                              <span className="text-sm font-semibold text-gray-900">{spec.value}</span>
                            </div>
                          ))}
                        </div>

                        <div className="mt-6 pt-4 border-t border-gray-100 space-y-3">
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Shield className="h-4 w-4 text-green-500" />
                            <span>Aprovado pela ANVISA</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Clock className="h-4 w-4 text-blue-500" />
                            <span>Sessoes de 15 a 60 minutos</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </section>
            );
          })}
        </div>

        {/* CTA */}
        <section className="py-12 md:py-16">
          <div className="bg-gradient-to-br from-[#6B2D8B] to-[#5A2574] rounded-2xl p-8 md:p-12 text-center text-white">
            <h2 className="text-3xl font-bold mb-4">
              Qual tecnologia e ideal para voce?
            </h2>
            <p className="text-purple-100 max-w-2xl mx-auto mb-8">
              Agende uma avaliacao gratuita e nossos especialistas vao indicar a
              melhor tecnologia e protocolo para o seu tipo de pele e necessidade.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                asChild
                size="lg"
                className="bg-white text-[#6B2D8B] hover:bg-purple-50 font-semibold"
              >
                <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
                  Agendar Avaliacao Gratuita
                  <ArrowRight className="h-4 w-4 ml-2" />
                </a>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="border-white text-white hover:bg-white/10"
              >
                <Link to="/novosite">
                  Ver Servicos
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
