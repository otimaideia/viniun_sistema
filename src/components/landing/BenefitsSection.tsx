import { Building2, Microscope, Sparkles, Users, CreditCard, Shield, Gift, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

const BenefitsSection = () => {
  const { ref, isVisible } = useScrollAnimation();
  const benefits = [
    {
      icon: Building2,
      title: "Unidades Premium",
      description: "Ambientes modernos, climatizados e com padrão de excelência",
    },
    {
      icon: Microscope,
      title: "Tecnologia de Ponta",
      description: "Equipamentos de última geração com certificação internacional",
    },
    {
      icon: Sparkles,
      title: "Resultados Reais",
      description: "Resultados comprovados com as melhores soluções do mercado",
    },
    {
      icon: Users,
      title: "Equipe Especializada",
      description: "Profissionais certificados e em constante atualização",
    },
    {
      icon: CreditCard,
      title: "Pagamento Facilitado",
      description: "Parcelamento em até 12x e diversas formas de pagamento",
    },
    {
      icon: Shield,
      title: "Segurança Total",
      description: "Protocolos rigorosos de qualidade e segurança",
    },
  ];

  return (
    <section id="beneficios" className="py-16 md:py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        <div 
          ref={ref}
          className={`text-center max-w-3xl mx-auto mb-12 transition-all duration-700 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <h2 className="text-3xl md:text-5xl font-bold mb-6 text-foreground">
            Por que escolher a Viniun?
          </h2>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {benefits.map((benefit, index) => {
            const Icon = benefit.icon;
            return (
              <div
                key={benefit.title}
                className={`bg-card rounded-2xl p-8 shadow-primary hover-lift transition-all duration-500 ${
                  isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
                }`}
                style={{ transitionDelay: `${index * 100}ms` }}
              >
                <div className="w-14 h-14 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center mb-4">
                  <Icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-foreground">
                  {benefit.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {benefit.description}
                </p>
              </div>
            );
          })}
        </div>

        {/* CTA Button */}
        <div className={`text-center transition-all duration-700 delay-500 ${
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        }`}>
          <Button
            onClick={() => document.getElementById("formulario")?.scrollIntoView({ behavior: "smooth" })}
            size="lg"
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-lg px-8 py-6 shadow-xl hover:scale-105 transition-transform"
          >
            <Gift className="w-5 h-5 mr-2" />
            QUERO MEU BENEFÍCIO EXCLUSIVO
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </div>
    </section>
  );
};

export default BenefitsSection;
