import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function ViniunHero() {
  return (
    <section className="relative min-h-[90vh] flex items-center bg-gradient-to-br from-white via-white to-viniun-light overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Text column */}
          <div className="flex flex-col gap-6">
            <span className="inline-flex items-center self-start rounded-full bg-viniun-lightBlue/10 px-4 py-1.5 text-sm font-medium text-viniun-blue">
              Plataforma #1 para Imobiliarias
            </span>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-viniun-dark leading-tight">
              A plataforma completa para gestao da sua{' '}
              <span className="text-viniun-blue">imobiliaria</span>
            </h1>

            <p className="text-lg text-gray-600 max-w-xl">
              CRM, Funil de Vendas, WhatsApp, Agendamentos e muito mais em um so
              lugar. Gerencie leads, imoveis e corretores com eficiencia.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button
                size="lg"
                className="bg-viniun-navy hover:bg-viniun-dark text-white text-base px-8"
                asChild
              >
                <Link to="/cadastro">Comece Gratis</Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="text-base px-8 border-viniun-navy text-viniun-navy hover:bg-viniun-navy/5"
              >
                Agendar Demonstracao
              </Button>
            </div>

            <div className="flex flex-wrap gap-x-6 gap-y-2 pt-4 text-sm text-gray-500">
              <span className="flex items-center gap-1.5">
                <span className="text-viniun-blue font-medium">&#10003;</span>
                14 dias gratis
              </span>
              <span className="flex items-center gap-1.5">
                <span className="text-viniun-blue font-medium">&#10003;</span>
                Sem cartao de credito
              </span>
              <span className="flex items-center gap-1.5">
                <span className="text-viniun-blue font-medium">&#10003;</span>
                Suporte em portugues
              </span>
            </div>
          </div>

          {/* Decorative column */}
          <div className="hidden lg:flex items-center justify-center">
            <div className="relative w-full max-w-lg aspect-square">
              {/* Background gradient blob */}
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-viniun-blue/20 via-viniun-lightBlue/30 to-viniun-gold/10 blur-2xl" />

              {/* Grid pattern overlay */}
              <div className="relative w-full h-full rounded-3xl bg-white/60 backdrop-blur-sm border border-gray-100 overflow-hidden">
                <div
                  className="absolute inset-0 opacity-[0.08]"
                  style={{
                    backgroundImage:
                      'linear-gradient(#1E3A5F 1px, transparent 1px), linear-gradient(90deg, #1E3A5F 1px, transparent 1px)',
                    backgroundSize: '40px 40px',
                  }}
                />

                {/* Floating accent cards */}
                <div className="absolute top-8 left-8 bg-white rounded-xl shadow-lg p-4 w-48">
                  <div className="h-2 w-16 bg-viniun-blue rounded mb-2" />
                  <div className="h-2 w-24 bg-gray-200 rounded mb-2" />
                  <div className="h-2 w-20 bg-gray-100 rounded" />
                </div>

                <div className="absolute bottom-12 right-8 bg-white rounded-xl shadow-lg p-4 w-44">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-8 w-8 rounded-full bg-viniun-navy/10 flex items-center justify-center">
                      <span className="text-xs font-bold text-viniun-navy">
                        +
                      </span>
                    </div>
                    <div>
                      <div className="h-2 w-16 bg-gray-200 rounded" />
                      <div className="h-2 w-10 bg-gray-100 rounded mt-1" />
                    </div>
                  </div>
                  <div className="h-2 w-full bg-viniun-lightBlue/30 rounded">
                    <div className="h-2 w-3/4 bg-viniun-blue rounded" />
                  </div>
                </div>

                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                  <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-viniun-navy to-viniun-blue flex items-center justify-center shadow-xl">
                    <span className="text-white text-2xl font-bold">V</span>
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
