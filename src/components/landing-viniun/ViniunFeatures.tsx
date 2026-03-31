import {
  Users,
  TrendingUp,
  MessageSquare,
  Calendar,
  DollarSign,
  Briefcase,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface Feature {
  icon: LucideIcon;
  title: string;
  description: string;
  color: string;
  bgColor: string;
}

const features: Feature[] = [
  {
    icon: Users,
    title: 'CRM Imobiliario',
    description:
      'Gerencie leads, proprietarios e inquilinos em um so lugar com historico completo de interacoes.',
    color: 'text-viniun-blue',
    bgColor: 'bg-viniun-blue/10',
  },
  {
    icon: TrendingUp,
    title: 'Funil de Vendas',
    description:
      'Pipeline visual para venda e locacao de imoveis com etapas personalizaveis.',
    color: 'text-viniun-navy',
    bgColor: 'bg-viniun-navy/10',
  },
  {
    icon: MessageSquare,
    title: 'WhatsApp Integrado',
    description:
      'Atendimento multicanal com chatbot inteligente, templates e respostas rapidas.',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
  },
  {
    icon: Calendar,
    title: 'Agendamentos',
    description:
      'Agende visitas a imoveis e reunioes com clientes de forma simples e organizada.',
    color: 'text-viniun-lightBlue',
    bgColor: 'bg-viniun-lightBlue/10',
  },
  {
    icon: DollarSign,
    title: 'Financeiro',
    description:
      'Controle comissoes, recebimentos e fluxo de caixa com relatorios detalhados.',
    color: 'text-viniun-gold',
    bgColor: 'bg-viniun-gold/10',
  },
  {
    icon: Briefcase,
    title: 'Portal do Corretor',
    description:
      'Acesso independente para cada corretor da equipe com metas e desempenho.',
    color: 'text-violet-600',
    bgColor: 'bg-violet-50',
  },
];

export default function ViniunFeatures() {
  return (
    <section id="features" className="py-20 md:py-28 bg-viniun-light/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-viniun-dark mb-4">
            Tudo que sua imobiliaria precisa
          </h2>
          <p className="text-lg text-gray-600">
            Modulos integrados para cada area do seu negocio
          </p>
        </div>

        {/* Features grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="bg-white rounded-xl p-6 shadow-sm hover:shadow-lg transition-shadow duration-300 border border-gray-100"
              >
                <div
                  className={`inline-flex items-center justify-center h-12 w-12 rounded-xl ${feature.bgColor} mb-5`}
                >
                  <Icon className={`h-6 w-6 ${feature.color}`} />
                </div>
                <h3 className="text-lg font-semibold text-viniun-dark mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
