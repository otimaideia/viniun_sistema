import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import VIPRegistrationForm from "@/components/landing/VIPRegistrationForm";
import {
  Users,
  Crown,
  CheckCircle2,
  ShieldCheck,
  MessageCircle,
  AlertTriangle,
} from "lucide-react";

const WHATSAPP_GROUP_LINK = "https://chat.whatsapp.com/CfyRi14Gjth5SPpfiTkr0k?mode=gi_t";
const EVENT_DATE = new Date("2026-03-27T13:00:00Z"); // 27/03/2026 10:00 BRT

function useCountdown(targetDate: Date) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  useEffect(() => {
    const tick = () => {
      const diff = targetDate.getTime() - Date.now();
      if (diff <= 0) { setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 }); return; }
      setTimeLeft({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetDate]);
  return timeLeft;
}

const GrupoVIPHeroB = () => {
  const countdown = useCountdown(EVENT_DATE);
  const isEventPast = countdown.days === 0 && countdown.hours === 0 && countdown.minutes === 0 && countdown.seconds === 0;

  return (
    <section className="relative pt-24 pb-16 lg:pb-24 bg-gradient-to-br from-[#6B2D8B] via-[#6B2D8B]/95 to-[#7BB3D1] overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-10 w-64 h-64 bg-white/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-[#7BB3D1]/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
      </div>

      {/* Floating badges - desktop only */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none hidden lg:block">
        <div className="absolute top-32 left-[5%] w-16 h-16 bg-[#6B2D8B] rounded-full flex items-center justify-center text-white font-bold shadow-xl animate-bounce" style={{ animationDuration: "3s" }}>90%</div>
        <div className="absolute top-56 left-[10%] w-14 h-14 bg-[#7BB3D1] rounded-full flex items-center justify-center text-white font-bold text-sm shadow-xl animate-bounce" style={{ animationDelay: "1s", animationDuration: "3.5s" }}>50%</div>
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-start">
          {/* Left: Content */}
          <div className="text-center lg:text-left pt-4 lg:pt-8">
            <Badge className="bg-white/20 text-white border-white/30 px-4 py-2 mb-6 text-sm">
              <Crown className="w-4 h-4 mr-2" />
              GRUPO VIP EXCLUSIVO
            </Badge>

            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 leading-tight">
              Grupo VIP YESlaser 💎
            </h1>

            <p className="text-xl text-white font-semibold mb-2">
              Dia 27/03, às 10h da manhã
            </p>

            <p className="text-lg text-white/90 max-w-xl mb-6">
              Condições exclusivas com até <span className="font-bold text-yellow-300 text-xl">90% de desconto</span> 📣
            </p>

            {/* Countdown */}
            {!isEventPast && (
              <div className="flex justify-center lg:justify-start gap-3 mb-6">
                {[
                  { value: countdown.days, label: "Dias" },
                  { value: countdown.hours, label: "Horas" },
                  { value: countdown.minutes, label: "Min" },
                  { value: countdown.seconds, label: "Seg" },
                ].map((item) => (
                  <div key={item.label} className="bg-white/15 backdrop-blur-sm rounded-xl p-3 min-w-[60px]">
                    <div className="text-2xl font-bold text-white">{String(item.value).padStart(2, "0")}</div>
                    <div className="text-xs text-white/70 uppercase">{item.label}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Warning */}
            <div className="bg-yellow-400/20 border border-yellow-400/40 rounded-lg px-4 py-3 max-w-xl mb-6">
              <p className="text-white text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-300 flex-shrink-0" />
                <span>As ofertas <strong>não serão abertas ao público</strong>, apenas para quem estiver no grupo.</span>
              </p>
            </div>

            {/* Direct CTA */}
            <a href={WHATSAPP_GROUP_LINK} target="_blank" rel="noopener noreferrer" className="inline-block mb-6">
              <Button size="lg" className="bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-lg px-8 py-7 shadow-2xl hover:scale-105 transition-all">
                <MessageCircle className="w-6 h-6 mr-2" />
                ENTRAR NO GRUPO VIP
              </Button>
            </a>

            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-6 text-white/80 text-sm mb-8">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                <span>+500 membros</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-yellow-300" />
                <span>Até 90% OFF</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-green-400" />
                <span>100% Gratuito</span>
              </div>
            </div>
          </div>

          {/* Right: Form */}
          <div className="w-full max-w-lg mx-auto lg:mx-0" id="formulario-vip">
            <VIPRegistrationForm variant="b" compact />
          </div>
        </div>
      </div>

      {/* Wave decoration */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full block">
          <path
            d="M0 120L60 105C120 90 240 60 360 45C480 30 600 30 720 37.5C840 45 960 60 1080 67.5C1200 75 1320 75 1380 75L1440 75V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z"
            fill="hsl(var(--background))"
          />
        </svg>
      </div>
    </section>
  );
};

export default GrupoVIPHeroB;
