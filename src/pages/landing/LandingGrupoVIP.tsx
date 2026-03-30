import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Header from "@/components/landing/Header";
import Footer from "@/components/landing/Footer";
import WhatsAppButton from "@/components/landing/WhatsAppButton";
import VIPRegistrationForm from "@/components/landing/VIPRegistrationForm";
import GrupoVIPHeroA from "@/components/landing/GrupoVIPHeroA";
import GrupoVIPHeroB from "@/components/landing/GrupoVIPHeroB";
import {
  MessageCircle,
  Gift,
  Star,
  Crown,
  Sparkles,
  CheckCircle2,
  Bell,
  Percent,
  Calendar,
  ArrowRight,
  Zap,
  Shield,
  Clock,
} from "lucide-react";

const WHATSAPP_NUMBER = "5513978263924";
const WHATSAPP_GROUP_LINK = "https://chat.whatsapp.com/CfyRi14Gjth5SPpfiTkr0k?mode=gi_t";

type ABVariant = "a" | "b";

function useABVariant(): ABVariant {
  const [variant, setVariant] = useState<ABVariant>("a");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlVariant = params.get("variant");

    if (urlVariant === "a" || urlVariant === "b") {
      setVariant(urlVariant);
      localStorage.setItem("vip_ab_variant", urlVariant);
      return;
    }

    const stored = localStorage.getItem("vip_ab_variant");
    if (stored === "a" || stored === "b") {
      setVariant(stored as ABVariant);
      return;
    }

    const random: ABVariant = Math.random() < 0.5 ? "a" : "b";
    setVariant(random);
    localStorage.setItem("vip_ab_variant", random);
  }, []);

  return variant;
}

const LandingGrupoVIP = () => {
  const variant = useABVariant();

  useEffect(() => {
    document.title = "Grupo VIP WhatsApp | YESlaser Praia Grande | Até 90% OFF";

    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute(
        "content",
        "Entre para o Grupo VIP da YESlaser Praia Grande no WhatsApp. Dia 27/03 às 10h - ofertas exclusivas com até 90% de desconto! Depilação a laser, botox e estética. 100% gratuito!"
      );
    }
  }, []);

  const scrollToForm = () => {
    if (variant === "b") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      document.getElementById("formulario-vip")?.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleWhatsAppContact = () => {
    const message = "Olá! Gostaria de mais informações sobre o Grupo VIP da YESlaser!";
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`, "_blank");
  };

  const benefits = [
    {
      icon: <Percent className="w-7 h-7" />,
      title: "Descontos de até 90%",
      description: "Ofertas exclusivas que só os membros do grupo recebem. Depilação, botox, estética corporal e mais!",
    },
    {
      icon: <Zap className="w-7 h-7" />,
      title: "Promoções Relâmpago",
      description: "Ofertas que duram poucas horas. Quem não está no grupo, perde!",
    },
    {
      icon: <Calendar className="w-7 h-7" />,
      title: "Prioridade no Agendamento",
      description: "Seja atendida com prioridade. Agende antes de todos os outros clientes!",
    },
    {
      icon: <Gift className="w-7 h-7" />,
      title: "Brindes e Sorteios",
      description: "Sorteios exclusivos para membros do grupo no dia do evento!",
    },
    {
      icon: <Bell className="w-7 h-7" />,
      title: "Novidades em Primeira Mão",
      description: "Fique sabendo de novos tratamentos e serviços antes de todo mundo.",
    },
    {
      icon: <Shield className="w-7 h-7" />,
      title: "100% Gratuito",
      description: "Sem compromisso. Sem spam. Saia do grupo quando quiser.",
    },
  ];

  const steps = [
    { number: "1", title: "Clique no botão abaixo", description: "Você será adicionado ao grupo VIP no WhatsApp" },
    { number: "2", title: "Aguarde o dia 27/03", description: "As ofertas serão enviadas às 10h da manhã" },
    { number: "3", title: "Aproveite!", description: "Descontos de até 90% exclusivos para o grupo" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero Section - A/B Test */}
      {variant === "a" ? (
        <GrupoVIPHeroA scrollToForm={scrollToForm} />
      ) : (
        <GrupoVIPHeroB />
      )}

      {/* Registration Form Section - Only for variant A */}
      {variant === "a" && (
        <section id="formulario-vip" className="py-16 bg-gradient-to-b from-muted to-background">
          <div className="container mx-auto px-4">
            <VIPRegistrationForm variant="a" />
          </div>
        </section>
      )}

      {/* Countdown / Urgency Section */}
      <section className="py-10 bg-gradient-to-r from-[#6B2D8B] to-[#7BB3D1]">
        <div className="container mx-auto px-4 text-center">
          <div className="flex flex-wrap items-center justify-center gap-4 md:gap-8">
            <div className="flex items-center gap-2 text-white">
              <Clock className="w-5 h-5 text-yellow-300" />
              <span className="font-semibold">Evento: 27/03 às 10h</span>
            </div>
            <div className="bg-yellow-400 text-[#6B2D8B] px-4 py-1.5 rounded-full font-bold text-sm">
              ATÉ 90% OFF
            </div>
            <div className="flex items-center gap-2 text-white">
              <Sparkles className="w-5 h-5 text-yellow-300" />
              <span className="font-semibold">Vagas Limitadas</span>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Benefícios <span className="text-[#6B2D8B]">Exclusivos</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Confira tudo que você ganha ao entrar para o nosso grupo VIP
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {benefits.map((benefit, index) => (
              <Card key={index} className="p-6 hover:shadow-lg transition-shadow border-2 hover:border-[#6B2D8B]/30">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 w-14 h-14 bg-[#6B2D8B]/10 rounded-xl flex items-center justify-center text-[#6B2D8B]">
                    {benefit.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-lg mb-1">{benefit.title}</h3>
                    <p className="text-muted-foreground text-sm">{benefit.description}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How to Join Section */}
      <section className="py-16 bg-[#6B2D8B]/5">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Como <span className="text-[#6B2D8B]">Participar</span>
            </h2>
            <p className="text-muted-foreground text-lg">Em 3 passos simples</p>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-center gap-6 max-w-4xl mx-auto">
            {steps.map((step, index) => (
              <div key={index} className="flex items-center">
                <div className="text-center">
                  <div className="w-16 h-16 bg-[#6B2D8B] text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-3">
                    {step.number}
                  </div>
                  <h3 className="font-bold text-lg mb-1">{step.title}</h3>
                  <p className="text-muted-foreground text-sm max-w-[200px]">{step.description}</p>
                </div>
                {index < steps.length - 1 && (
                  <ArrowRight className="hidden md:block w-8 h-8 text-[#6B2D8B]/40 mx-4 flex-shrink-0" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-br from-[#6B2D8B] via-[#6B2D8B] to-[#7BB3D1] text-white">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-2xl mx-auto">
            <Crown className="w-16 h-16 mx-auto mb-6 text-[#7BB3D1]" />

            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Não Fique de Fora!
            </h2>

            <p className="text-lg text-white/90 mb-4">
              Junte-se a mais de 500 pessoas que já fazem parte do nosso grupo VIP e aproveite descontos de até <span className="text-yellow-300 font-bold">90% OFF</span>.
            </p>

            <p className="text-white/80 text-sm mb-8 flex items-center justify-center gap-2">
              <Star className="w-4 h-4 text-yellow-300" />
              As ofertas são exclusivas para membros do grupo
            </p>

            <div className="flex flex-col gap-4 max-w-md mx-auto mb-8">
              <a href={WHATSAPP_GROUP_LINK} target="_blank" rel="noopener noreferrer">
                <Button
                  size="lg"
                  className="w-full bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-lg px-8 py-7 shadow-2xl hover:scale-105 transition-all"
                >
                  <MessageCircle className="w-6 h-6 mr-2" />
                  ENTRAR NO GRUPO VIP AGORA
                </Button>
              </a>

              <Button
                onClick={handleWhatsAppContact}
                size="lg"
                variant="outline"
                className="border-2 border-white text-white hover:bg-white hover:text-[#6B2D8B] font-bold text-lg px-8 py-7"
              >
                <MessageCircle className="w-5 h-5 mr-2" />
                FALAR NO WHATSAPP
              </Button>
            </div>

            <p className="text-white/70 text-sm">
              WhatsApp: (13) 97826-3924
            </p>

            <div className="flex flex-wrap items-center justify-center gap-6 mt-8 text-white/70 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-400" />
                <span>Sem Spam</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-400" />
                <span>Conteúdo Exclusivo</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-400" />
                <span>Sair a Qualquer Momento</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
      <WhatsAppButton />
    </div>
  );
};

export default LandingGrupoVIP;
