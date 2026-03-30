import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Users, Gift, Star, Crown, Sparkles, CheckCircle2 } from "lucide-react";

const WhatsAppVIPSection = () => {
  const navigate = useNavigate();
  const whatsappGroupLink = "https://chat.whatsapp.com/CfyRi14Gjth5SPpfiTkr0k?mode=gi_t";
  const whatsappNumber = "5513978263924";

  const benefits = [
    {
      icon: <Gift className="w-6 h-6" />,
      title: "Ofertas Exclusivas",
      description: "Receba promoções especiais antes de todos"
    },
    {
      icon: <Star className="w-6 h-6" />,
      title: "Descontos VIP",
      description: "Até 50% OFF em tratamentos selecionados"
    },
    {
      icon: <Crown className="w-6 h-6" />,
      title: "Prioridade no Agendamento",
      description: "Seja atendido com prioridade na clínica"
    },
    {
      icon: <Sparkles className="w-6 h-6" />,
      title: "Brindes e Surpresas",
      description: "Presentinhos exclusivos para membros VIP"
    }
  ];

  const handleJoinGroup = () => {
    navigate("/lp/grupo-vip");
  };

  const handleWhatsAppContact = () => {
    const message = "Olá! Gostaria de mais informações sobre o Grupo VIP da Yeslaser!";
    window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`, "_blank");
  };

  return (
    <section className="py-16 bg-gradient-to-b from-primary/5 to-background">
      <div className="container mx-auto px-4">
        {/* Main Card */}
        <Card className="max-w-5xl mx-auto overflow-hidden border-2 border-primary shadow-2xl">
          {/* Header with Gradient */}
          <div className="bg-gradient-to-r from-primary via-primary/90 to-secondary p-8 text-white relative overflow-hidden">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute inset-0" style={{
                backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,.1) 10px, rgba(255,255,255,.1) 20px)`
              }} />
            </div>

            {/* Content */}
            <div className="relative z-10 text-center">
              <Badge className="bg-white/20 text-white border-white/30 px-4 py-1 mb-4">
                <MessageCircle className="w-4 h-4 mr-2" />
                GRUPO VIP EXCLUSIVO
              </Badge>

              <h2 className="text-3xl md:text-5xl font-bold mb-4">
                Entre para o Grupo VIP do WhatsApp
              </h2>

              <p className="text-lg md:text-xl text-white/90 max-w-2xl mx-auto">
                Faça parte da nossa comunidade exclusiva e tenha acesso a benefícios incríveis!
              </p>
            </div>
          </div>

          {/* Benefits Grid */}
          <div className="p-8 bg-white">
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              {benefits.map((benefit) => (
                <div key={benefit.title} className="flex items-start space-x-4 p-4 rounded-lg hover:bg-primary/5 transition-colors">
                  <div className="flex-shrink-0 w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                    {benefit.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-lg text-foreground mb-1">
                      {benefit.title}
                    </h3>
                    <p className="text-muted-foreground">
                      {benefit.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* CTA Section */}
            <div className="bg-gradient-to-r from-primary/5 to-secondary/5 rounded-xl p-4 sm:p-6 text-center">
              <div className="flex items-center justify-center mb-4">
                <Users className="w-6 h-6 sm:w-8 sm:h-8 text-primary mr-2" />
                <span className="text-xl sm:text-2xl font-bold text-foreground">
                  Mais de 500 membros VIP!
                </span>
              </div>

              <div className="flex items-center justify-center space-x-2 mb-6">
                <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                <span className="text-muted-foreground text-sm sm:text-base">
                  Grupo 100% Gratuito e Seguro
                </span>
              </div>

              <div className="flex flex-col gap-3 sm:gap-4 justify-center max-w-md mx-auto">
                <Button
                  onClick={handleJoinGroup}
                  size="lg"
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-bold shadow-lg hover:scale-105 transition-all text-sm sm:text-base py-5 sm:py-6"
                >
                  <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5 mr-2 flex-shrink-0" />
                  <span>ENTRAR NO GRUPO VIP</span>
                </Button>

                <Button
                  onClick={handleWhatsAppContact}
                  size="lg"
                  variant="outline"
                  className="w-full border-2 border-primary text-primary hover:bg-primary hover:text-white font-bold text-sm sm:text-base py-5 sm:py-6"
                >
                  <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5 mr-2 flex-shrink-0" />
                  <span>FALAR NO WHATSAPP</span>
                </Button>
              </div>

              <p className="text-sm text-muted-foreground mt-4">
                📱 WhatsApp: (13) 97826-3924
              </p>
            </div>

            {/* Trust Indicators */}
            <div className="mt-8 pt-8 border-t border-gray-200">
              <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center">
                  <CheckCircle2 className="w-4 h-4 mr-2 text-green-500" />
                  <span>Sem Spam</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle2 className="w-4 h-4 mr-2 text-green-500" />
                  <span>Conteúdo Exclusivo</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle2 className="w-4 h-4 mr-2 text-green-500" />
                  <span>Sair a Qualquer Momento</span>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </section>
  );
};

export default WhatsAppVIPSection;