import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check } from 'lucide-react';

const WHATSAPP_URL = 'https://wa.me/5511999999999?text=Olá! Gostaria de saber mais sobre o plano Enterprise do Viniun.';

interface PricingPlan {
  name: string;
  monthlyPrice: number;
  annualPrice: number;
  description: string;
  features: string[];
  cta: string;
  ctaLink: string;
  isExternal?: boolean;
  popular?: boolean;
}

const plans: PricingPlan[] = [
  {
    name: 'Starter',
    monthlyPrice: 97,
    annualPrice: 77,
    description: 'Ideal para corretores autônomos e pequenas equipes.',
    features: [
      'Até 5 corretores',
      '500 leads/mês',
      'CRM + Funil de Vendas',
      'Agendamentos',
      'Suporte por email',
    ],
    cta: 'Começar Teste Grátis',
    ctaLink: '/cadastro?plano=starter',
  },
  {
    name: 'Professional',
    monthlyPrice: 197,
    annualPrice: 157,
    description: 'Para imobiliárias em crescimento que precisam escalar.',
    features: [
      'Até 20 corretores',
      '5.000 leads/mês',
      'Tudo do Starter +',
      'WhatsApp Integrado',
      'Portal do Corretor',
      'Financeiro',
      'Suporte prioritário',
    ],
    cta: 'Começar Teste Grátis',
    ctaLink: '/cadastro?plano=professional',
    popular: true,
  },
  {
    name: 'Enterprise',
    monthlyPrice: 397,
    annualPrice: 317,
    description: 'Para grandes operações com necessidades avançadas.',
    features: [
      'Corretores ilimitados',
      'Leads ilimitados',
      'Tudo do Professional +',
      'API & Webhooks',
      'Chatbot IA',
      'Gerente de conta dedicado',
    ],
    cta: 'Falar com Vendas',
    ctaLink: WHATSAPP_URL,
    isExternal: true,
  },
];

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 });
}

export default function ViniunPricing() {
  const [annual, setAnnual] = useState(false);

  return (
    <section id="pricing" className="py-20 md:py-28 bg-viniun-light">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-6">
          <h2 className="text-3xl md:text-4xl font-bold text-viniun-navy mb-4">
            Planos transparentes, sem surpresas
          </h2>
          <p className="text-gray-600 text-lg">
            Escolha o plano ideal para o tamanho da sua imobiliária
          </p>
        </div>

        {/* Billing toggle */}
        <div className="flex items-center justify-center gap-3 mb-14">
          <span className={`text-sm font-medium ${!annual ? 'text-viniun-navy' : 'text-gray-400'}`}>
            Mensal
          </span>
          <button
            onClick={() => setAnnual(!annual)}
            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
              annual ? 'bg-viniun-blue' : 'bg-gray-300'
            }`}
            aria-label="Alternar entre mensal e anual"
          >
            <span
              className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                annual ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
          <span className={`text-sm font-medium ${annual ? 'text-viniun-navy' : 'text-gray-400'}`}>
            Anual
          </span>
          {annual && (
            <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs">
              -20%
            </Badge>
          )}
        </div>

        {/* Pricing cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto items-start">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative bg-white rounded-2xl p-8 transition-all duration-300 ${
                plan.popular
                  ? 'border-2 border-viniun-blue shadow-xl md:scale-105 z-10'
                  : 'border border-gray-200 shadow-sm'
              }`}
            >
              {plan.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-viniun-blue text-white px-4 py-1">
                  Mais Popular
                </Badge>
              )}

              <div className="mb-6">
                <h3 className="text-xl font-bold text-viniun-navy mb-1">{plan.name}</h3>
                <p className="text-sm text-gray-500">{plan.description}</p>
              </div>

              <div className="mb-6">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-viniun-navy">
                    {formatCurrency(annual ? plan.annualPrice : plan.monthlyPrice)}
                  </span>
                  <span className="text-gray-500 text-sm">/mês</span>
                </div>
                {annual && (
                  <p className="text-xs text-gray-400 mt-1">
                    Cobrado anualmente ({formatCurrency(plan.annualPrice * 12)}/ano)
                  </p>
                )}
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-viniun-blue mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-gray-600">{feature}</span>
                  </li>
                ))}
              </ul>

              {plan.isExternal ? (
                <Button
                  className={`w-full ${
                    plan.popular
                      ? 'bg-viniun-blue hover:bg-viniun-navy text-white'
                      : 'bg-viniun-navy hover:bg-viniun-dark text-white'
                  }`}
                  asChild
                >
                  <a href={plan.ctaLink} target="_blank" rel="noopener noreferrer">
                    {plan.cta}
                  </a>
                </Button>
              ) : (
                <Button
                  className={`w-full ${
                    plan.popular
                      ? 'bg-viniun-blue hover:bg-viniun-navy text-white'
                      : 'bg-viniun-navy hover:bg-viniun-dark text-white'
                  }`}
                  asChild
                >
                  <Link to={plan.ctaLink}>{plan.cta}</Link>
                </Button>
              )}
            </div>
          ))}
        </div>

        {/* Trust note */}
        <p className="text-center text-sm text-gray-500 mt-10">
          14 dias grátis em todos os planos. Sem cartão de crédito. Cancele quando quiser.
        </p>
      </div>
    </section>
  );
}
