import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Smartphone, Monitor, ArrowRight } from 'lucide-react';

export default function ViniunHero() {
  return (
    <section className="relative min-h-[90vh] flex items-center bg-gradient-to-br from-white via-white to-viniun-light overflow-hidden">
      {/* Subtle background decoration */}
      <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-bl from-viniun-blue/5 via-transparent to-transparent pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Text column */}
          <div className="flex flex-col gap-6">
            <span className="inline-flex items-center self-start rounded-full bg-viniun-lightBlue/10 px-4 py-1.5 text-sm font-medium text-viniun-blue">
              Plataforma #1 para Imobiliárias
            </span>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-viniun-dark leading-tight">
              A plataforma completa para gestão da sua{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-viniun-blue to-viniun-lightBlue">
                imobiliária
              </span>
            </h1>

            <p className="text-lg text-gray-600 max-w-xl leading-relaxed">
              CRM, Funil de Vendas, WhatsApp, Agendamentos e muito mais em um só
              lugar. Gerencie leads, imóveis e corretores com eficiência.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button
                size="lg"
                className="bg-viniun-navy hover:bg-viniun-dark text-white text-base px-8 gap-2"
                asChild
              >
                <Link to="/cadastro">
                  Comece Grátis
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="text-base px-8 border-viniun-navy text-viniun-navy hover:bg-viniun-navy/5"
                asChild
              >
                <Link to="/login">Acessar Plataforma</Link>
              </Button>
            </div>

            <div className="flex flex-wrap gap-x-6 gap-y-2 pt-4 text-sm text-gray-500">
              <span className="flex items-center gap-1.5">
                <span className="text-viniun-blue font-medium">&#10003;</span>
                14 dias grátis
              </span>
              <span className="flex items-center gap-1.5">
                <span className="text-viniun-blue font-medium">&#10003;</span>
                Sem cartão de crédito
              </span>
              <span className="flex items-center gap-1.5">
                <span className="text-viniun-blue font-medium">&#10003;</span>
                Suporte em português
              </span>
            </div>

            {/* Platform badges */}
            <div className="flex items-center gap-4 pt-2">
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <Monitor className="h-3.5 w-3.5" />
                <span>Web</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <Smartphone className="h-3.5 w-3.5" />
                <span>Android & iOS (em breve)</span>
              </div>
            </div>
          </div>

          {/* Decorative column - Dashboard mockup */}
          <div className="hidden lg:flex items-center justify-center">
            <div className="relative w-full max-w-lg aspect-square">
              {/* Background gradient blob */}
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-viniun-blue/20 via-viniun-lightBlue/30 to-viniun-gold/10 blur-2xl" />

              {/* Main dashboard card */}
              <div className="relative w-full h-full rounded-3xl bg-white/80 backdrop-blur-sm border border-gray-100 overflow-hidden shadow-xl">
                <div
                  className="absolute inset-0 opacity-[0.04]"
                  style={{
                    backgroundImage:
                      'linear-gradient(#1E3A5F 1px, transparent 1px), linear-gradient(90deg, #1E3A5F 1px, transparent 1px)',
                    backgroundSize: '40px 40px',
                  }}
                />

                {/* Top bar */}
                <div className="relative flex items-center gap-2 px-6 py-4 border-b border-gray-100">
                  <div className="flex gap-1.5">
                    <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
                    <div className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
                    <div className="h-2.5 w-2.5 rounded-full bg-green-400" />
                  </div>
                  <div className="flex-1 flex justify-center">
                    <div className="h-5 w-48 bg-gray-100 rounded-md flex items-center justify-center">
                      <span className="text-[9px] text-gray-400">app.viniun.com.br</span>
                    </div>
                  </div>
                </div>

                {/* Dashboard content */}
                <div className="relative p-6 space-y-4">
                  {/* Stats row */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-viniun-navy/5 rounded-xl p-3">
                      <p className="text-[10px] text-gray-500">Leads</p>
                      <p className="text-lg font-bold text-viniun-navy">248</p>
                      <p className="text-[9px] text-green-600 font-medium">+12%</p>
                    </div>
                    <div className="bg-viniun-blue/5 rounded-xl p-3">
                      <p className="text-[10px] text-gray-500">Visitas</p>
                      <p className="text-lg font-bold text-viniun-blue">89</p>
                      <p className="text-[9px] text-green-600 font-medium">+8%</p>
                    </div>
                    <div className="bg-viniun-gold/10 rounded-xl p-3">
                      <p className="text-[10px] text-gray-500">Vendas</p>
                      <p className="text-lg font-bold text-viniun-gold">23</p>
                      <p className="text-[9px] text-green-600 font-medium">+15%</p>
                    </div>
                  </div>

                  {/* Chart placeholder */}
                  <div className="bg-gray-50 rounded-xl p-4 h-28">
                    <p className="text-[10px] text-gray-400 mb-2">Funil de Vendas</p>
                    <div className="flex items-end gap-1.5 h-16">
                      {[80, 60, 45, 30, 22, 18, 25, 35, 50, 40, 55, 65].map((h, i) => (
                        <div
                          key={i}
                          className="flex-1 rounded-t-sm bg-gradient-to-t from-viniun-blue to-viniun-lightBlue"
                          style={{ height: `${h}%` }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Activity list */}
                  <div className="space-y-2">
                    {[
                      { text: 'Novo lead: Maria Silva', color: 'bg-green-400' },
                      { text: 'Visita agendada: Apto 201', color: 'bg-viniun-lightBlue' },
                      { text: 'Proposta aceita: Casa Jardim Europa', color: 'bg-viniun-gold' },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-gray-50">
                        <div className={`w-1.5 h-1.5 rounded-full ${item.color}`} />
                        <p className="text-[10px] text-gray-600">{item.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Floating notification */}
              <div className="absolute -left-6 top-24 bg-white rounded-xl shadow-lg border border-gray-100 p-3 w-48 animate-fade-in">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                    <span className="text-green-600 text-xs font-bold">+1</span>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500">Novo lead</p>
                    <p className="text-xs font-semibold text-gray-800">Via WhatsApp</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
