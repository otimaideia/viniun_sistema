import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Target, Headphones, BarChart3, Settings } from 'lucide-react';

interface ModuleCategory {
  id: string;
  title: string;
  icon: React.ReactNode;
  description: string;
  features: string[];
}

const categories: ModuleCategory[] = [
  {
    id: 'vendas',
    title: 'Vendas',
    icon: <Target className="h-6 w-6" />,
    description: 'Converta mais leads em clientes com ferramentas inteligentes de vendas.',
    features: [
      'Gestão de Leads com scoring automático',
      'Funil de Vendas personalizado por etapa',
      'CRM completo com histórico de interações',
      'Propostas e contratos digitais',
    ],
  },
  {
    id: 'operacao',
    title: 'Operação',
    icon: <Settings className="h-6 w-6" />,
    description: 'Organize o dia a dia da sua operação sem planilhas.',
    features: [
      'Agendamentos com confirmação automática',
      'Catálogo de Serviços e imóveis',
      'Check-in digital de visitas',
      'Controle de disponibilidade em tempo real',
    ],
  },
  {
    id: 'comunicacao',
    title: 'Comunicação',
    icon: <Headphones className="h-6 w-6" />,
    description: 'Fale com seus clientes nos canais que eles preferem.',
    features: [
      'WhatsApp Business integrado',
      'Chatbot IA para atendimento 24h',
      'Campanhas segmentadas por perfil',
      'Disparo em Massa com templates aprovados',
    ],
  },
  {
    id: 'gestao',
    title: 'Gestão',
    icon: <BarChart3 className="h-6 w-6" />,
    description: 'Tome decisões baseadas em dados reais do seu negócio.',
    features: [
      'Financeiro com fluxo de caixa',
      'Gestão de Equipes e permissões',
      'Metas individuais e por equipe',
      'Relatórios e dashboards em tempo real',
    ],
  },
];

export default function ViniunModules() {
  return (
    <section id="modules" className="py-20 md:py-28 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-14">
          <h2 className="text-3xl md:text-4xl font-bold text-viniun-navy mb-4">
            Módulos para cada área
          </h2>
          <p className="text-gray-600 text-lg">
            Um sistema completo que conecta vendas, operação, comunicação e gestão em uma única plataforma.
          </p>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="vendas" className="w-full">
          <TabsList className="grid w-full max-w-2xl mx-auto grid-cols-2 md:grid-cols-4 h-auto gap-2 bg-viniun-light p-2 rounded-xl mb-10">
            {categories.map((cat) => (
              <TabsTrigger
                key={cat.id}
                value={cat.id}
                className="flex items-center gap-2 py-3 px-4 text-sm font-medium rounded-lg data-[state=active]:bg-white data-[state=active]:text-viniun-navy data-[state=active]:shadow-sm text-gray-500"
              >
                {cat.icon}
                <span>{cat.title}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {categories.map((cat) => (
            <TabsContent key={cat.id} value={cat.id}>
              <div className="grid md:grid-cols-2 gap-10 items-center max-w-5xl mx-auto">
                {/* Description side */}
                <div>
                  <div className="inline-flex items-center gap-2 text-viniun-blue mb-4">
                    {cat.icon}
                    <span className="text-sm font-semibold uppercase tracking-wider">
                      {cat.title}
                    </span>
                  </div>
                  <h3 className="text-2xl font-bold text-viniun-navy mb-3">
                    {cat.description}
                  </h3>
                </div>

                {/* Features list */}
                <div className="bg-viniun-light rounded-2xl p-8">
                  <ul className="space-y-4">
                    {cat.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <span className="mt-1 flex-shrink-0 h-5 w-5 rounded-full bg-viniun-blue/10 text-viniun-blue flex items-center justify-center text-xs font-bold">
                          {idx + 1}
                        </span>
                        <span className="text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </section>
  );
}
