import { Link, useNavigate } from 'react-router-dom';
import { Zap, CheckCircle, Users, Heart, MapPin, Phone, Clock, ArrowRight, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';
import { SEOHead } from '@/components/novosite/SEOHead';
import { CategoryGrid } from '@/components/novosite/CategoryGrid';
import { HeroSlider } from '@/components/novosite/HeroSlider';
import { BodyMap } from '@/components/novosite/BodyMap';
import { FeaturedServices } from '@/components/novosite/FeaturedServices';
import { PromotionsBanner } from '@/components/novosite/PromotionsBanner';
import { GoogleReviews } from '@/components/novosite/GoogleReviews';
import { EquipmentShowcase } from '@/components/novosite/EquipmentShowcase';
import { useServicosPublicos } from '@/hooks/public/useServicosPublicos';
import { useCategoriasPublicas } from '@/hooks/public/useCategoriasPublicas';

const WHATSAPP_URL = 'https://wa.me/5513991888100';

const BENEFITS = [
  {
    icon: Zap,
    title: 'Tecnologia de Ponta',
    description: 'Equipamentos de ultima geracao para resultados mais rapidos e seguros.',
  },
  {
    icon: CheckCircle,
    title: 'Resultados Comprovados',
    description: 'Milhares de clientes satisfeitos com resultados visiveis desde a primeira sessao.',
  },
  {
    icon: Users,
    title: 'Profissionais Especializados',
    description: 'Equipe treinada e certificada em depilacao a laser e estetica avancada.',
  },
  {
    icon: Heart,
    title: 'Atendimento Personalizado',
    description: 'Avaliacao individual para o melhor protocolo de tratamento para voce.',
  },
];

const FAQ_ITEMS = [
  {
    question: 'A depilacao a laser doi?',
    answer:
      'A depilacao a laser pode causar um leve desconforto, semelhante a um estalo de elastico na pele. Nossos equipamentos modernos possuem sistema de resfriamento que minimiza a sensacao, tornando o procedimento muito mais confortavel.',
  },
  {
    question: 'Quantas sessoes sao necessarias?',
    answer:
      'Em geral, sao necessarias de 8 a 12 sessoes para resultados definitivos, com intervalos de 30 a 45 dias entre elas. O numero exato depende do tipo de pele, cor e espessura dos pelos, e da area tratada.',
  },
  {
    question: 'A depilacao a laser funciona em todos os tipos de pele?',
    answer:
      'Sim! Com a tecnologia atual, a depilacao a laser e segura e eficaz para todos os fototipos de pele, do mais claro ao mais escuro. Na avaliacao gratuita, definimos os parametros ideais para o seu tipo de pele.',
  },
  {
    question: 'Quais cuidados devo ter antes e apos a sessao?',
    answer:
      'Antes: evite exposicao solar intensa, nao depile com cera ou pinca (apenas lamina), e nao use produtos com acidos na area. Apos: evite sol direto por 48h, use protetor solar, e evite atividades fisicas intensas no mesmo dia.',
  },
  {
    question: 'Posso fazer depilacao a laser no verao?',
    answer:
      'Sim, e possivel fazer depilacao a laser no verao, desde que voce evite exposicao solar direta na area tratada por pelo menos 48 horas antes e depois da sessao e use protetor solar diariamente.',
  },
  {
    question: 'A YESlaser oferece avaliacao gratuita?',
    answer:
      'Sim! Oferecemos avaliacao gratuita e sem compromisso. Nela, nossos especialistas analisam seu tipo de pele e pelos, indicam o melhor protocolo e apresentam os valores. Agende pelo WhatsApp ou diretamente no site.',
  },
];

const LOCAL_BUSINESS_JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'LocalBusiness',
  name: 'YESlaser Praia Grande',
  description:
    'Clinica de depilacao a laser e estetica avancada em Praia Grande - SP. Tratamentos faciais e corporais com tecnologia de ponta.',
  url: 'https://www.yeslaserpraiagrande.com.br',
  telephone: '+5513991888100',
  image: '/images/landing/hero-yeslaser.png',
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'Av. Presidente Kennedy, 6295 - Loja 18',
    addressLocality: 'Praia Grande',
    addressRegion: 'SP',
    postalCode: '11700-000',
    addressCountry: 'BR',
  },
  geo: {
    '@type': 'GeoCoordinates',
    latitude: -24.0058,
    longitude: -46.4028,
  },
  openingHoursSpecification: [
    {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      opens: '09:00',
      closes: '19:00',
    },
    {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: 'Saturday',
      opens: '09:00',
      closes: '14:00',
    },
  ],
  priceRange: '$$',
  sameAs: [
    'https://www.instagram.com/yeslaserpraiagrande',
    'https://www.facebook.com/yeslaserpraiagrande',
  ],
};

const FAQ_JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQ_ITEMS.map((item) => ({
    '@type': 'Question',
    name: item.question,
    acceptedAnswer: {
      '@type': 'Answer',
      text: item.answer,
    },
  })),
};

export default function SiteHome() {
  const navigate = useNavigate();
  const { categoryTree, isLoading: categoriesLoading } = useCategoriasPublicas();
  const { data: depilacaoServicos } = useServicosPublicos({ categoria: 'feminino' });

  const topCategories = categoryTree.filter((cat) => !cat.parent_id);

  // Build price data for body map from depilation services
  const bodyMapPriceData: Record<string, { minPrice: number; size: string }> = {};
  if (depilacaoServicos) {
    depilacaoServicos.forEach((s) => {
      if (s.area_corporal) {
        const price = s.custo_pix || s.preco_promocional || s.preco || 0;
        const existing = bodyMapPriceData[s.area_corporal];
        if (!existing || price < existing.minPrice) {
          bodyMapPriceData[s.area_corporal] = {
            minPrice: price,
            size: s.tamanho_area || 'M',
          };
        }
      }
    });
  }

  return (
    <>
      <SEOHead
        title="Depilacao a Laser e Estetica"
        description="Depilacao a laser, estetica facial e corporal em Praia Grande - SP. Tecnologia de ponta, profissionais especializados. Agende sua avaliacao gratuita."
        jsonLd={[LOCAL_BUSINESS_JSON_LD, FAQ_JSON_LD]}
      />

      {/* ===== HERO SLIDER ===== */}
      <HeroSlider />

      {/* ===== CATEGORIAS ===== */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Nossos Servicos</h2>
            <p className="text-muted-foreground mt-2">
              Escolha a categoria e descubra os tratamentos ideais para voce
            </p>
          </div>
          {categoriesLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="aspect-[4/3] rounded-xl bg-gray-200 animate-pulse" />
              ))}
            </div>
          ) : (
            <CategoryGrid categories={topCategories} basePath="/novosite" columns={4} />
          )}
        </div>
      </section>

      {/* ===== SERVICOS EM DESTAQUE ===== */}
      <FeaturedServices />

      {/* ===== MAPA CORPORAL INTERATIVO ===== */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <BodyMap
            priceData={bodyMapPriceData}
            onAreaClick={(area) => navigate(`/novosite/depilacao-a-laser/feminino?area=${area}`)}
          />
        </div>
      </section>

      {/* ===== PROMOCOES ===== */}
      <PromotionsBanner />

      {/* ===== BENEFICIOS ===== */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Por que escolher a YESlaser?</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {BENEFITS.map((benefit) => {
              const Icon = benefit.icon;
              return (
                <div key={benefit.title} className="text-center">
                  <div className="mx-auto w-16 h-16 rounded-full bg-purple-50 flex items-center justify-center mb-4">
                    <Icon className="w-8 h-8 text-purple-600" />
                  </div>
                  <h3 className="font-semibold text-lg text-gray-900 mb-2">{benefit.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{benefit.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===== EQUIPAMENTOS ===== */}
      <EquipmentShowcase />

      {/* ===== AVALIACOES GOOGLE ===== */}
      <GoogleReviews />

      {/* ===== FAQ ===== */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Perguntas Frequentes</h2>
            <p className="text-muted-foreground mt-2">Tire suas duvidas sobre nossos tratamentos</p>
          </div>
          <Accordion type="single" collapsible className="space-y-2">
            {FAQ_ITEMS.map((item, index) => (
              <AccordionItem
                key={index}
                value={`faq-${index}`}
                className="bg-white rounded-lg border px-4 shadow-sm"
              >
                <AccordionTrigger className="text-left text-sm md:text-base font-medium py-4 hover:no-underline">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground leading-relaxed pb-4">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* ===== LOCALIZACAO ===== */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Localizacao</h2>
            <p className="text-muted-foreground mt-2">Venha nos visitar</p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Info */}
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Endereco</h3>
                  <p className="text-sm text-muted-foreground">
                    Av. Presidente Kennedy, 6295 - Loja 18
                    <br />
                    Praia Grande - SP, 11700-000
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center flex-shrink-0">
                  <Phone className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Telefone / WhatsApp</h3>
                  <a
                    href={WHATSAPP_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-purple-700 hover:text-purple-800 font-medium"
                  >
                    (13) 99188-8100
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center flex-shrink-0">
                  <Clock className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Horario de Funcionamento</h3>
                  <p className="text-sm text-muted-foreground">
                    Segunda a Sexta: 09h as 19h
                    <br />
                    Sabado: 09h as 14h
                  </p>
                </div>
              </div>
            </div>

            {/* Map */}
            <div className="rounded-xl overflow-hidden shadow-md h-[320px]">
              <iframe
                title="YESlaser Praia Grande - Localizacao"
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3645.7!2d-46.4028!3d-24.0058!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMjTCsDAwJzIwLjkiUyA0NsKwMjQnMTAuMSJX!5e0!3m2!1spt-BR!2sbr!4v1700000000000"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ===== CTA FINAL ===== */}
      <section className="py-16 px-4 bg-gradient-to-br from-[#6B2D8B] via-[#7BB3D1] to-[#1a1a2e]">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
            Agende sua avaliacao gratuita
          </h2>
          <p className="text-white/90 text-lg mb-8 max-w-xl mx-auto">
            Converse com nossos especialistas e descubra o melhor tratamento para voce. Sem compromisso!
          </p>
          <Button
            asChild
            size="lg"
            className="bg-green-500 hover:bg-green-600 text-white font-semibold text-base px-8"
          >
            <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="mr-2 w-5 h-5" />
              Falar pelo WhatsApp
            </a>
          </Button>
        </div>
      </section>
    </>
  );
}
