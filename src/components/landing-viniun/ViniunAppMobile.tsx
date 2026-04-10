import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Smartphone, Bell, MapPin, Camera, MessageSquare, TrendingUp } from 'lucide-react';

const appFeatures = [
  {
    icon: Bell,
    title: 'Notificações em tempo real',
    description: 'Receba alertas de novos leads, agendamentos e mensagens instantaneamente.',
  },
  {
    icon: MapPin,
    title: 'Geolocalização de imóveis',
    description: 'Navegue até os imóveis com rotas otimizadas e check-in digital de visitas.',
  },
  {
    icon: Camera,
    title: 'Fotos e vídeos no app',
    description: 'Fotografe imóveis e envie direto para o catálogo com edição rápida.',
  },
  {
    icon: MessageSquare,
    title: 'Chat integrado',
    description: 'Converse com clientes pelo WhatsApp e responda leads sem sair do app.',
  },
  {
    icon: TrendingUp,
    title: 'Dashboard mobile',
    description: 'Acompanhe metas, desempenho e funil de vendas de qualquer lugar.',
  },
];

export default function ViniunAppMobile() {
  return (
    <section id="app-mobile" className="py-20 md:py-28 bg-gradient-to-b from-viniun-dark to-viniun-navy overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Mockup do celular */}
          <div className="flex justify-center lg:justify-end order-2 lg:order-1">
            <div className="relative">
              {/* Glow effect */}
              <div className="absolute -inset-8 bg-gradient-to-br from-viniun-blue/30 via-viniun-lightBlue/20 to-transparent rounded-full blur-3xl" />

              {/* Phone mockup */}
              <div className="relative w-[280px] h-[560px] bg-gray-900 rounded-[3rem] border-4 border-gray-700 shadow-2xl overflow-hidden">
                {/* Notch */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-7 bg-gray-900 rounded-b-2xl z-10" />

                {/* Screen content */}
                <div className="absolute inset-2 rounded-[2.5rem] bg-gradient-to-b from-viniun-navy via-[#1a3050] to-viniun-dark overflow-hidden">
                  {/* Status bar */}
                  <div className="flex justify-between items-center px-8 pt-10 pb-2">
                    <span className="text-white/60 text-[10px] font-medium">9:41</span>
                    <div className="flex gap-1">
                      <div className="w-3.5 h-2 bg-white/60 rounded-sm" />
                      <div className="w-1.5 h-2 bg-white/40 rounded-sm" />
                    </div>
                  </div>

                  {/* App header */}
                  <div className="px-5 pt-3 pb-4">
                    <p className="text-white/60 text-[10px]">Bem-vindo de volta</p>
                    <p className="text-white font-bold text-sm">Viniun Imóveis</p>
                  </div>

                  {/* Stats cards */}
                  <div className="px-5 grid grid-cols-2 gap-2 mb-4">
                    <div className="bg-white/10 backdrop-blur rounded-xl p-3">
                      <p className="text-viniun-lightBlue text-[10px] font-medium">Leads Hoje</p>
                      <p className="text-white font-bold text-lg">12</p>
                      <p className="text-green-400 text-[9px]">+23%</p>
                    </div>
                    <div className="bg-white/10 backdrop-blur rounded-xl p-3">
                      <p className="text-viniun-lightBlue text-[10px] font-medium">Visitas</p>
                      <p className="text-white font-bold text-lg">5</p>
                      <p className="text-green-400 text-[9px]">Hoje</p>
                    </div>
                  </div>

                  {/* Activity list */}
                  <div className="px-5 space-y-2">
                    <p className="text-white/60 text-[10px] font-medium mb-2">Atividades recentes</p>
                    {['Novo lead: João Silva', 'Visita confirmada 14h', 'Proposta enviada'].map((item, i) => (
                      <div key={i} className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${i === 0 ? 'bg-green-400' : i === 1 ? 'bg-viniun-lightBlue' : 'bg-viniun-gold'}`} />
                        <p className="text-white/80 text-[10px]">{item}</p>
                      </div>
                    ))}
                  </div>

                  {/* Bottom nav */}
                  <div className="absolute bottom-4 left-4 right-4 bg-white/10 backdrop-blur-lg rounded-2xl p-3 flex justify-around">
                    {['Home', 'Leads', 'Chat', 'Perfil'].map((label, i) => (
                      <div key={label} className="flex flex-col items-center gap-0.5">
                        <div className={`w-4 h-4 rounded-md ${i === 0 ? 'bg-viniun-blue' : 'bg-white/20'}`} />
                        <span className={`text-[8px] ${i === 0 ? 'text-white font-medium' : 'text-white/50'}`}>{label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Floating badges */}
              <div className="absolute -left-4 top-20 bg-white rounded-xl shadow-xl px-4 py-2.5 flex items-center gap-2 animate-bounce-slow">
                <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" className="w-5 h-5 text-green-600" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                    <path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.832-1.438A9.955 9.955 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2z"/>
                  </svg>
                </div>
                <div>
                  <p className="text-[10px] text-gray-500">Nova mensagem</p>
                  <p className="text-xs font-semibold text-gray-800">3 leads aguardando</p>
                </div>
              </div>

              <div className="absolute -right-4 bottom-32 bg-white rounded-xl shadow-xl px-4 py-2.5 flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-viniun-blue/10 flex items-center justify-center">
                  <MapPin className="w-4 h-4 text-viniun-blue" />
                </div>
                <div>
                  <p className="text-[10px] text-gray-500">Próxima visita</p>
                  <p className="text-xs font-semibold text-gray-800">14h - Apto 302</p>
                </div>
              </div>
            </div>
          </div>

          {/* Texto e features */}
          <div className="order-1 lg:order-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 mb-6">
              <Smartphone className="h-4 w-4 text-viniun-lightBlue" />
              <span className="text-sm font-medium text-viniun-lightBlue">Em breve para Android e iOS</span>
            </div>

            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 leading-tight">
              Sua imobiliária na{' '}
              <span className="text-viniun-lightBlue">palma da mão</span>
            </h2>

            <p className="text-lg text-white/70 mb-8 max-w-lg">
              O aplicativo Viniun para <strong className="text-white">Android</strong> e <strong className="text-white">iOS</strong> vai
              levar toda a potência da plataforma para o seu bolso. Gerencie leads, agende visitas e feche
              negócios de qualquer lugar.
            </p>

            {/* Feature list */}
            <div className="space-y-4 mb-10">
              {appFeatures.map((feature) => {
                const Icon = feature.icon;
                return (
                  <div key={feature.title} className="flex items-start gap-4 group">
                    <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center group-hover:bg-viniun-blue/30 transition-colors">
                      <Icon className="h-5 w-5 text-viniun-lightBlue" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-white mb-0.5">{feature.title}</h3>
                      <p className="text-sm text-white/60">{feature.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Store badges */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                size="lg"
                className="bg-white text-viniun-navy hover:bg-white/90 text-base px-6 gap-3"
                disabled
              >
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
                  <path d="M17.523 2.248a.59.59 0 0 0-.093.007C15.49 2.6 14.122 3.653 13.36 4.514c-.715.808-1.296 1.995-1.13 3.15.044.032.092.042.138.042 1.985-.066 3.52-1.746 4.15-2.762.585-.946.953-2.11 1.006-2.696zM17.501 7.77c-1.124 0-2.129.698-2.73.698-.627 0-1.552-.664-2.573-.664-2.01.016-4.179 1.7-4.179 5.09 0 2.102.806 4.323 1.798 5.76.849 1.229 1.582 2.234 2.65 2.234 1.044 0 1.483-.699 2.741-.699 1.272 0 1.573.68 2.7.68 1.136 0 1.906-1.095 2.636-2.177.436-.647.797-1.314 1.03-1.765l.011-.023a.138.138 0 0 0-.066-.182c-.998-.488-2.236-1.64-2.236-3.577 0-1.641.986-2.785 2.003-3.398a.137.137 0 0 0 .054-.178c-.706-1.244-1.96-1.8-2.84-1.8z"/>
                </svg>
                <div className="text-left">
                  <p className="text-[10px] leading-none opacity-70">Em breve na</p>
                  <p className="text-sm font-semibold leading-tight">App Store</p>
                </div>
              </Button>
              <Button
                size="lg"
                className="bg-white text-viniun-navy hover:bg-white/90 text-base px-6 gap-3"
                disabled
              >
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
                  <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 0 1-.61-.92V2.734a1 1 0 0 1 .609-.92zm.921-.592l11.7 6.747-2.623 2.623L4.53 1.222zM16.709 8.45L19.4 10l1.48.853a1 1 0 0 1 0 1.734L19.4 14.04l-2.691 1.551-2.88-2.882 2.88-2.258zm-1.4 4.258l-2.622 2.623L4.53 22.778l8.157-4.702 2.622-5.368z"/>
                </svg>
                <div className="text-left">
                  <p className="text-[10px] leading-none opacity-70">Em breve no</p>
                  <p className="text-sm font-semibold leading-tight">Google Play</p>
                </div>
              </Button>
            </div>

            <p className="text-sm text-white/40 mt-4">
              Previsão de lançamento: 2026. Cadastre-se para ser notificado.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
