import { Button } from "@/components/ui/button";
import { Phone, MessageCircle, CreditCard, Zap, Users, MapPin, Star, ShieldCheck } from "lucide-react";
import CountdownTimer from "./CountdownTimer";



const PreInaugHeroSection = () => {
  const scrollToForm = () => {
    const element = document.getElementById("formulario-preinauguracao");
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleWhatsAppClick = () => {
    if (typeof window !== "undefined" && (window as any).dataLayer) {
      (window as any).dataLayer.push({
        event: "cta_click",
        ctaLocation: "hero_whatsapp",
      });
    }
    window.open(
      "https://wa.me/5513978263924?text=Olá!%20Quero%20aproveitar%20a%20promoção%20de%2010%20sessões%20por%20R$%2079,90!",
      "_blank"
    );
  };

  const handlePhoneClick = () => {
    if (typeof window !== "undefined" && (window as any).dataLayer) {
      (window as any).dataLayer.push({
        event: "cta_click",
        ctaLocation: "hero_phone",
      });
    }
    window.location.href = "tel:+5513978263924";
  };

  const handleBuyClick = () => {
    if (typeof window !== "undefined" && (window as any).dataLayer) {
      (window as any).dataLayer.push({
        event: "cta_click",
        ctaLocation: "hero_buy",
      });
    }
    // Link de pagamento Asaas
    window.open("https://www.asaas.com/c/7ytngzlfment5bsu", "_blank");
  };

  return (
    <section id="hero" className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-primary via-primary/95 to-secondary pt-20 pb-8">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-10 w-64 h-64 bg-white/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-secondary/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Badge de lançamento */}
        <div className="text-center mb-6">
          <span className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm font-semibold animate-pulse">
            <Zap className="w-4 h-4" />
            LANÇAMENTO VINIUN
          </span>
        </div>

        {/* H1 Principal - SEO Otimizado */}
        <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-white text-center mb-6 leading-tight">
          VINIUN CHEGOU EM<br />
          <span className="text-secondary">PRAIA GRANDE</span>
        </h1>

        {/* Oferta Principal */}
        <div className="max-w-2xl mx-auto bg-white/10 backdrop-blur-md rounded-2xl p-4 sm:p-6 md:p-8 mb-6 md:mb-8 border border-white/20">
          <div className="text-center">
            <p className="text-white/90 text-base sm:text-lg md:text-xl mb-2">
              10 Sessões de <strong>Axila</strong> ou <strong>Faixa de Barba</strong>
            </p>
            <p className="text-yellow-300 font-bold text-base sm:text-lg mb-3">
              + 10 Sessões BÔNUS em Área P
            </p>
            
            {/* Total com fundo vermelho e texto branco */}
            <div className="relative inline-block mb-4">
              <div className="absolute inset-0 bg-red-500 rounded-xl opacity-50 blur-md animate-glow"></div>
              <p className="relative text-white font-extrabold text-lg sm:text-xl md:text-2xl bg-red-600 rounded-xl px-4 sm:px-6 py-3 border-2 border-red-400 shadow-xl">
                <span className="absolute inset-0 rounded-xl bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></span>
                <span className="relative z-10">
                  ✨ Total: 20 sessões de serviços premium ✨
                </span>
              </p>
            </div>
            
            <div className="flex items-center justify-center gap-2 sm:gap-3 mb-4">
              <span className="text-3xl sm:text-4xl md:text-6xl font-bold text-white">
                R$ 79,90
              </span>
            </div>

            <div className="inline-flex items-center gap-2 bg-red-500 text-white px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-bold animate-pulse">
              <span>⚠️</span>
              VAGAS LIMITADAS
            </div>
          </div>
        </div>

        {/* 3 Botões de Conversão */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8 max-w-3xl mx-auto">
          <Button
            onClick={handleWhatsAppClick}
            size="lg"
            className="bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-base md:text-lg px-6 py-6 shadow-xl hover:scale-105 transition-all flex-1"
          >
            <MessageCircle className="w-5 h-5 mr-2" />
            FALAR NO WHATSAPP
          </Button>
          
          <Button
            onClick={handlePhoneClick}
            size="lg"
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-base md:text-lg px-6 py-6 shadow-xl hover:scale-105 transition-all flex-1"
          >
            <Phone className="w-5 h-5 mr-2" />
            LIGAR AGORA
          </Button>
          
          <Button
            onClick={handleBuyClick}
            size="lg"
            className="bg-secondary hover:bg-secondary/90 text-secondary-foreground font-bold text-base md:text-lg px-6 py-6 shadow-xl hover:scale-105 transition-all flex-1"
          >
            <CreditCard className="w-5 h-5 mr-2" />
            COMPRAR AGORA
          </Button>
        </div>

        {/* Countdown Timer - 20 dias */}
        <div className="text-center mb-8">
          <p className="text-white/80 text-sm mb-2">⏰ Oferta expira em:</p>
          <CountdownTimer variant="default" className="text-white" daysToAdd={20} />
        </div>

        {/* Social Proof */}
        <div className="flex flex-wrap items-center justify-center gap-4 md:gap-8 mb-8 text-white/90">
          <div className="flex items-center gap-2">
            <div className="flex text-yellow-400">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-4 h-4 fill-current" />
              ))}
            </div>
            <span className="text-sm font-medium">+500 clientes</span>
          </div>
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-secondary" />
            <span className="text-sm">Tecnologia de ponta</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-secondary" />
            <span className="text-sm">Profissionais certificados</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-secondary" />
            <span className="text-sm">Boqueirão - Praia Grande</span>
          </div>
        </div>

        {/* Garantia */}
        <div className="flex items-center justify-center gap-2 mb-8 text-white/80">
          <ShieldCheck className="w-5 h-5 text-green-400" />
          <span className="text-sm">Garantia de satisfação ou seu dinheiro de volta</span>
        </div>

        {/* Imagens Antes/Depois - Desktop */}
        <div className="hidden md:grid grid-cols-2 gap-6 max-w-4xl mx-auto">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
            <p className="text-center text-white/80 text-sm mb-3 font-medium">👩 RESULTADO FEMININO</p>
            <img
              src="/images/landing/antes-depois-mulher.jpg"
              alt="Resultado antes e depois feminino"
              className="w-full rounded-lg shadow-lg"
              loading="lazy"
            />
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
            <p className="text-center text-white/80 text-sm mb-3 font-medium">👨 RESULTADO MASCULINO</p>
            <img
              src="/images/landing/antes-depois-homem.jpg"
              alt="Resultado antes e depois masculino"
              className="w-full rounded-lg shadow-lg"
              loading="lazy"
            />
          </div>
        </div>

        {/* Imagens Antes/Depois - Mobile */}
        <div className="md:hidden space-y-4">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20">
            <p className="text-center text-white/80 text-xs mb-2 font-medium">👩 RESULTADO FEMININO</p>
            <img
              src="/images/landing/antes-depois-mulher.jpg"
              alt="Resultado antes e depois feminino"
              className="w-full rounded-lg shadow-lg"
              loading="lazy"
            />
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20">
            <p className="text-center text-white/80 text-xs mb-2 font-medium">👨 RESULTADO MASCULINO</p>
            <img
              src="/images/landing/antes-depois-homem.jpg"
              alt="Resultado antes e depois masculino"
              className="w-full rounded-lg shadow-lg"
              loading="lazy"
            />
          </div>
        </div>

        {/* Botão secundário para formulário */}
        <div className="text-center mt-8">
          <Button
            onClick={scrollToForm}
            size="lg"
            className="bg-white text-primary hover:bg-white/90 font-bold text-sm sm:text-base px-6 py-4 shadow-lg"
          >
            Ou preencha o formulário abaixo
          </Button>
        </div>
      </div>

      {/* Wave decoration */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg
          viewBox="0 0 1440 120"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full"
        >
          <path
            d="M0 120L60 105C120 90 240 60 360 45C480 30 600 30 720 37.5C840 45 960 60 1080 67.5C1200 75 1320 75 1380 75L1440 75V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z"
            fill="hsl(var(--background))"
          />
        </svg>
      </div>
    </section>
  );
};

export default PreInaugHeroSection;
