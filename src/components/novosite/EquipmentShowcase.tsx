import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from '@/components/ui/carousel';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Zap, Snowflake, Radio, Sun, Waves, ThermometerSnowflake } from 'lucide-react';

interface Equipment {
  nome: string;
  descricao: string;
  imagem?: string;
  procedimentos: string[];
  icon: React.ReactNode;
  gradient: string;
}

const EQUIPMENT_DATA: Equipment[] = [
  {
    nome: 'Laser Diodo 810nm',
    descricao:
      'Tecnologia gold standard em depilacao definitiva. Seguro e eficaz para todos os tons de pele, do mais claro ao mais escuro.',
    procedimentos: ['Depilacao definitiva', 'Todos os fototipos', 'Grandes areas'],
    icon: <Zap className="h-6 w-6" />,
    gradient: 'from-purple-600 to-purple-700',
  },
  {
    nome: 'Laser Alexandrite',
    descricao:
      'Alta precisao e velocidade para peles claras. Comprimento de onda de 755nm ideal para pelos finos e areas sensíveis.',
    procedimentos: ['Peles claras', 'Pelos finos', 'Rosto e virilha'],
    icon: <Sun className="h-6 w-6" />,
    gradient: 'from-amber-500 to-orange-600',
  },
  {
    nome: 'Laser ND:YAG',
    descricao:
      'Comprimento de onda de 1064nm que penetra profundamente na pele. Ideal para peles morenas e negras com total seguranca.',
    procedimentos: ['Peles morenas e negras', 'Pelos grossos', 'Areas resistentes'],
    icon: <Radio className="h-6 w-6" />,
    gradient: 'from-violet-500 to-purple-600',
  },
  {
    nome: 'Radiofrequencia',
    descricao:
      'Estimula a producao de colageno atraves de ondas eletromagneticas. Resultados progressivos no combate a flacidez.',
    procedimentos: ['Flacidez facial', 'Rejuvenescimento', 'Firmeza corporal'],
    icon: <Waves className="h-6 w-6" />,
    gradient: 'from-cyan-500 to-blue-600',
  },
  {
    nome: 'Ultracavitacao',
    descricao:
      'Tecnologia de ultrassom que rompe celulas de gordura de forma nao invasiva. Resultados visiveis em poucas sessoes.',
    procedimentos: ['Gordura localizada', 'Reducao de medidas', 'Contorno corporal'],
    icon: <ThermometerSnowflake className="h-6 w-6" />,
    gradient: 'from-emerald-500 to-teal-600',
  },
  {
    nome: 'Criofrequencia',
    descricao:
      'Combina frio e calor para tratamento corporal avanado. Estimula colageno e reduz gordura em uma unica sessao.',
    procedimentos: ['Tratamento corporal', 'Estimulo de colageno', 'Reducao de gordura'],
    icon: <Snowflake className="h-6 w-6" />,
    gradient: 'from-sky-500 to-indigo-600',
  },
];

function EquipmentCard({ equipment }: { equipment: Equipment }) {
  return (
    <Card className="group h-full overflow-hidden border-0 shadow-md transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
      {/* Image / gradient header */}
      <div
        className={`relative flex h-48 items-center justify-center bg-gradient-to-br ${equipment.gradient}`}
      >
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMC41IiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMSkiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IGZpbGw9InVybCgjZykiIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiLz48L3N2Zz4=')] opacity-60" />
        <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 text-white backdrop-blur-sm transition-transform duration-300 group-hover:scale-110">
          {equipment.icon}
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-base font-bold text-gray-900">{equipment.nome}</h3>
        <p className="mt-2 flex-1 text-sm leading-relaxed text-gray-600">
          {equipment.descricao}
        </p>

        {/* Procedures */}
        <div className="mt-4 flex flex-wrap gap-1.5">
          {equipment.procedimentos.map((proc) => (
            <Badge
              key={proc}
              variant="secondary"
              className="bg-gray-100 text-xs font-normal text-gray-600 hover:bg-gray-100"
            >
              {proc}
            </Badge>
          ))}
        </div>
      </div>
    </Card>
  );
}

export function EquipmentShowcase() {
  return (
    <section className="bg-white py-16 md:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-[#6B2D8B]">
            Tecnologia de ponta
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
            Equipamentos e Tecnologias
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-base text-gray-600">
            Utilizamos os equipamentos mais modernos do mercado para garantir resultados
            seguros e eficazes em todos os procedimentos.
          </p>
        </div>

        {/* Desktop: grid */}
        <div className="mt-12 hidden gap-6 md:grid md:grid-cols-2 lg:grid-cols-3">
          {EQUIPMENT_DATA.map((equipment) => (
            <EquipmentCard key={equipment.nome} equipment={equipment} />
          ))}
        </div>

        {/* Mobile: carousel */}
        <div className="mt-10 md:hidden">
          <Carousel opts={{ align: 'start', loop: false }} className="w-full">
            <CarouselContent className="-ml-4">
              {EQUIPMENT_DATA.map((equipment) => (
                <CarouselItem key={equipment.nome} className="basis-[85%] pl-4">
                  <EquipmentCard equipment={equipment} />
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>
        </div>
      </div>
    </section>
  );
}
