import { Button } from "@/components/ui/button";
import { MessageCircle, Phone, CreditCard, ShieldCheck } from "lucide-react";
import CountdownTimer from "./CountdownTimer";

const FinalCTASection = () => {
  const handleWhatsAppClick = () => {
    if (typeof window !== "undefined" && (window as any).dataLayer) {
      (window as any).dataLayer.push({
        event: "cta_click",
        ctaLocation: "final_whatsapp",
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
        ctaLocation: "final_phone",
      });
    }
    window.location.href = "tel:+5513978263924";
  };

  const handleBuyClick = () => {
    if (typeof window !== "undefined" && (window as any).dataLayer) {
      (window as any).dataLayer.push({
        event: "cta_click",
        ctaLocation: "final_buy",
      });
    }
    // Link de pagamento Asaas
    window.open("https://www.asaas.com/c/7ytngzlfment5bsu", "_blank");
  };

  return (
    <section className="py-16 md:py-20 bg-gradient-to-br from-primary via-primary to-secondary text-white">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto">
          {/* Badge de urgência */}
          <div className="inline-flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-full text-sm font-bold mb-6 animate-pulse">
            ⚠️ ÚLTIMAS VAGAS DISPONÍVEIS
          </div>

          {/* Título */}
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            Não Perca Essa<br />
            <span className="text-secondary">Oportunidade Única</span>
          </h2>
          
          <p className="text-lg md:text-xl opacity-90 mb-8 leading-relaxed">
            A promoção de pré-inauguração é por tempo limitado.<br />
            10 sessões + 10 BÔNUS por apenas <strong>R$ 79,90</strong>
          </p>

          {/* Countdown Timer - 20 dias */}
          <div className="mb-8">
            <p className="text-white/70 text-sm mb-3">⏰ Oferta expira em:</p>
            <CountdownTimer variant="large" className="text-white" daysToAdd={20} />
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
              className="bg-white text-primary hover:bg-white/90 font-bold text-base md:text-lg px-6 py-6 shadow-xl hover:scale-105 transition-all flex-1"
            >
              <CreditCard className="w-5 h-5 mr-2" />
              COMPRAR AGORA
            </Button>
          </div>

          {/* Garantia */}
          <div className="flex items-center justify-center gap-2 text-white/80">
            <ShieldCheck className="w-5 h-5 text-green-400" />
            <span className="text-sm">Garantia de satisfação ou seu dinheiro de volta</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FinalCTASection;
