import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Sparkles, Percent, Gift } from 'lucide-react';

interface Promotion {
  id: number;
  title: string;
  description: string;
  discount: string;
  icon: React.ReactNode;
  cta: string;
}

const PROMOTIONS: Promotion[] = [
  {
    id: 1,
    title: 'Pacote Corpo Inteiro',
    description:
      'Depilacao a laser em todas as areas do corpo com condicoes especiais. Parcele em ate 12x sem juros.',
    discount: 'Ate 40% OFF',
    icon: <Sparkles className="h-6 w-6" />,
    cta: 'Ver oferta',
  },
  {
    id: 2,
    title: 'Primeira Sessao',
    description:
      'Conheca nossos servicos com desconto exclusivo na primeira sessao. Valido para novas clientes.',
    discount: '30% OFF',
    icon: <Gift className="h-6 w-6" />,
    cta: 'Agendar agora',
  },
  {
    id: 3,
    title: 'Indique e Ganhe',
    description:
      'Indique uma amiga e ambas ganham desconto especial. Quanto mais indicacoes, maior o desconto.',
    discount: 'Desconto duplo',
    icon: <Percent className="h-6 w-6" />,
    cta: 'Saiba mais',
  },
];

function PromotionCard({ promotion }: { promotion: Promotion }) {
  return (
    <Card className="group relative overflow-hidden border-0 bg-white/10 p-6 backdrop-blur-sm transition-all duration-300 hover:bg-white/20 hover:-translate-y-1">
      {/* Discount badge */}
      <Badge className="absolute right-4 top-4 bg-white text-[#6B2D8B] font-bold shadow-md hover:bg-white">
        {promotion.discount}
      </Badge>

      {/* Icon */}
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 text-white">
        {promotion.icon}
      </div>

      {/* Content */}
      <h3 className="mt-4 text-lg font-bold text-white">{promotion.title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-white/80">
        {promotion.description}
      </p>

      {/* CTA */}
      <Button
        asChild
        variant="outline"
        size="sm"
        className="mt-5 border-white/30 bg-transparent text-white hover:bg-white hover:text-[#6B2D8B]"
      >
        <Link to="/novosite/promocoes">
          {promotion.cta}
          <ArrowRight className="ml-1.5 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </Button>
    </Card>
  );
}

export function PromotionsBanner() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-[#6B2D8B] via-[#5B2378] to-[#4A1A6B] py-16 md:py-20">
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-white/5" />
        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-white/5" />
        <div className="absolute left-1/2 top-1/3 h-48 w-48 -translate-x-1/2 rounded-full bg-white/5" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-sm font-medium text-white backdrop-blur-sm">
            <Sparkles className="h-4 w-4" />
            Ofertas por tempo limitado
          </div>
          <h2 className="mt-4 text-2xl font-bold tracking-tight text-white sm:text-3xl md:text-4xl">
            Promocoes Especiais
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-base text-white/80">
            Aproveite nossas ofertas exclusivas deste mes e cuide da sua beleza com os
            melhores precos da regiao.
          </p>
        </div>

        {/* Promotion cards */}
        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {PROMOTIONS.map((promo) => (
            <PromotionCard key={promo.id} promotion={promo} />
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="mt-12 text-center">
          <Button
            asChild
            size="lg"
            className="bg-white text-[#6B2D8B] shadow-lg hover:bg-white/90 font-semibold"
          >
            <Link to="/novosite/promocoes">
              Ver todas as promocoes
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
