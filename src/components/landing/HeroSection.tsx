import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Gift, ArrowRight, Star, Heart, Zap, Sparkles } from "lucide-react";

const HeroSection = () => {
  const [parallaxOffset, setParallaxOffset] = useState(0);

  const scrollToForm = () => {
    const element = document.getElementById("formulario");
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.scrollY;
      setParallaxOffset(scrolled * 0.5);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      {/* Hero Section - First Fold with Multiple Backgrounds */}
      <section
        id="hero"
        className="relative min-h-screen overflow-hidden"
      >
        {/* Background Layer 1 - Blue pattern background with parallax */}
        <div
          className="absolute inset-0 z-0"
          style={{
            backgroundImage: 'url("/images/landing/depilacao-a-laser-em-praia-grande-banner-logo-fundo.png")',
            backgroundSize: 'cover',
            backgroundPosition: `center ${parallaxOffset}px`,
            backgroundRepeat: 'no-repeat',
            transition: 'background-position 0.6s ease-out'
          }}
        />

        {/* Model Image - Background left side */}
        <div
          className="hidden lg:block absolute left-0 top-0 h-screen w-7/12 z-0"
          style={{
            backgroundImage: 'url("/images/landing/depilacao-a-laser-em-praia-grande-banner.png")',
            backgroundSize: 'contain',
            backgroundPosition: 'left bottom',
            backgroundRepeat: 'no-repeat',
            transform: 'scale(1.2)',
            transformOrigin: 'left bottom'
          }}
        />

        {/* Content Container with proper alignment */}
        <div className="relative z-10 min-h-screen">
          <div className="container mx-auto px-4 h-full">
            <div className="flex flex-col lg:flex-row min-h-screen">

            {/* Content - Right Side */}
            <div className="w-full lg:w-6/12 lg:ml-auto text-center lg:text-left py-8 lg:py-0 flex items-center justify-center lg:justify-end">
              <div className="w-full lg:pl-4 xl:pl-8 space-y-3 md:space-y-4 max-w-2xl mx-auto lg:mx-0 lg:mr-8">
              <Badge className="bg-primary text-primary-foreground px-4 py-2 text-sm font-bold inline-flex items-center animate-pulse animate-fade-in-down">
                <MapPin className="w-4 h-4 mr-2" />
                CHEGAMOS EM PRAIA GRANDE!
              </Badge>

              {/* Main Offer Circle with Scale Animation */}
              <div className="relative animate-zoom-in my-2">
                <div className="inline-block bg-primary rounded-full p-4 sm:p-5 md:p-6 shadow-2xl hover:scale-105 transition-transform duration-300">
                  <div className="text-center text-white">
                    <span className="text-3xl sm:text-4xl md:text-5xl font-extrabold block leading-none">10</span>
                    <span className="text-sm sm:text-base md:text-lg font-bold block mt-1">SESSÕES</span>
                    <span className="text-xs sm:text-xs md:text-sm block mt-0.5">DE DEPILAÇÃO A LASER EM ÁREA P</span>
                  </div>
                </div>
                <Badge className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 bg-secondary text-secondary-foreground px-2.5 py-1 text-xs sm:text-sm md:text-base font-bold shadow-lg animate-bounce whitespace-nowrap">
                  GRATUITAS
                </Badge>
              </div>

              <div className="bg-white/80 backdrop-blur-sm rounded-2xl px-6 py-4 shadow-lg max-w-xl mx-auto lg:mx-0 mt-3">
                <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-gray-900 font-bold animate-fade-in leading-tight">
                  Cadastre-se e indique 5 amigos para garantir seu benefício exclusivo!
                </p>
              </div>

              {/* CTA Buttons with Animation */}
              <div className="flex flex-col sm:flex-row gap-2 justify-center lg:justify-start animate-fade-in-up px-4 lg:px-0 mt-3">
                <Button
                  onClick={scrollToForm}
                  size="lg"
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs sm:text-sm md:text-base px-4 sm:px-5 py-3 sm:py-4 shadow-xl hover:scale-110 transition-all duration-300 hover:shadow-2xl w-full sm:w-auto"
                >
                  <Gift className="w-4 h-4 mr-1 flex-shrink-0" />
                  QUERO MINHAS SESSÕES GRÁTIS
                  <ArrowRight className="w-4 h-4 ml-1 animate-slide-right flex-shrink-0" />
                </Button>
              </div>

              {/* Trust Badges with Stagger Animation */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 max-w-2xl mx-auto lg:mx-0 animate-fade-in-up px-4 lg:px-0">
                <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 bg-white/90 backdrop-blur-sm rounded-lg px-2 sm:px-3 py-2 sm:py-3 shadow-md">
                  <Star className="w-4 sm:w-5 h-4 sm:h-5 text-primary flex-shrink-0" />
                  <span className="text-xs sm:text-sm font-semibold text-foreground text-center sm:text-left">+100 unidades</span>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 bg-white/90 backdrop-blur-sm rounded-lg px-2 sm:px-3 py-2 sm:py-3 shadow-md">
                  <Sparkles className="w-4 sm:w-5 h-4 sm:h-5 text-secondary flex-shrink-0" />
                  <span className="text-xs sm:text-sm font-semibold text-foreground text-center sm:text-left">Padrão Ouro</span>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 bg-white/90 backdrop-blur-sm rounded-lg px-2 sm:px-3 py-2 sm:py-3 shadow-md">
                  <Heart className="w-4 sm:w-5 h-4 sm:h-5 text-primary flex-shrink-0" />
                  <span className="text-xs sm:text-sm font-semibold text-foreground text-center sm:text-left">100% Indolor</span>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 bg-white/90 backdrop-blur-sm rounded-lg px-2 sm:px-3 py-2 sm:py-3 shadow-md">
                  <Zap className="w-4 sm:w-5 h-4 sm:h-5 text-secondary flex-shrink-0" />
                  <span className="text-xs sm:text-sm font-semibold text-foreground text-center sm:text-left">Sessões Rápidas</span>
                </div>
              </div>
              </div>
            </div>
            </div>
          </div>
        </div>

        {/* Purple decorative line at bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-3 bg-primary z-20"></div>
      </section>

      {/* Second CTA Section */}
      <section className="py-12 bg-primary">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-4xl font-bold text-primary-foreground mb-4">
            ⏰ Promoção por tempo limitado!
          </h2>
          <p className="text-lg text-primary-foreground/90 mb-6 max-w-2xl mx-auto">
            Não perca a chance de ganhar 10 sessões grátis de depilação a laser. 
            Vagas limitadas para a inauguração em Praia Grande!
          </p>
          <Button
            onClick={scrollToForm}
            size="lg"
            className="bg-card text-primary hover:bg-card/90 font-bold text-lg px-10 py-6 shadow-xl hover:scale-105 transition-transform"
          >
            <Gift className="w-5 h-5 mr-2" />
            GARANTIR MINHAS 10 SESSÕES GRÁTIS
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </section>
    </>
  );
};

export default HeroSection;
