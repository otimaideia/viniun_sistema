import { MessageSquare, Calendar, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

const steps = [
  {
    number: 1,
    icon: MessageSquare,
    title: "Cadastre-se",
    description: "Preencha o formulário ou chame no WhatsApp para garantir sua vaga",
  },
  {
    number: 2,
    icon: Calendar,
    title: "Agende",
    description: "Nossa equipe entrará em contato para agendar sua avaliação gratuita",
  },
  {
    number: 3,
    icon: Sparkles,
    title: "Aproveite",
    description: "Comece suas sessões e veja os resultados em poucas semanas",
  },
];

const HowItWorksSection = () => {
  const { ref, isVisible } = useScrollAnimation();

  const scrollToForm = () => {
    const element = document.getElementById("formulario-preinauguracao");
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section 
      ref={ref as React.RefObject<HTMLElement>} 
      className="py-12 md:py-16 bg-muted/30"
    >
      <div className="container mx-auto px-4">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
            Como Funciona
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Em 3 passos simples você começa seu tratamento
          </p>
        </div>

        {/* Desktop Timeline */}
        <div className="hidden md:block max-w-4xl mx-auto mb-10">
          <div className="relative">
            {/* Linha conectora */}
            <div className="absolute top-16 left-[16%] right-[16%] h-1 bg-gradient-to-r from-primary via-secondary to-primary rounded-full" />
            
            <div className="grid grid-cols-3 gap-8">
              {steps.map((step, index) => (
                <div
                  key={step.number}
                  className={`flex flex-col items-center text-center transition-all duration-500 ${
                    isVisible 
                      ? "opacity-100 translate-y-0" 
                      : "opacity-0 translate-y-8"
                  }`}
                  style={{ transitionDelay: `${index * 150}ms` }}
                >
                  {/* Ícone circular */}
                  <div className="relative z-10 w-32 h-32 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg mb-4">
                    <div className="w-28 h-28 rounded-full bg-card flex items-center justify-center">
                      <step.icon className="w-12 h-12 text-primary" />
                    </div>
                    {/* Número */}
                    <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center font-bold text-sm shadow-md">
                      {step.number}
                    </div>
                  </div>
                  
                  <h3 className="text-xl font-bold text-foreground mb-2">
                    {step.title}
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {step.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Mobile Timeline */}
        <div className="md:hidden space-y-6 mb-10">
          {steps.map((step, index) => (
            <div
              key={step.number}
              className={`flex items-start gap-4 transition-all duration-500 ${
                isVisible 
                  ? "opacity-100 translate-x-0" 
                  : "opacity-0 -translate-x-8"
              }`}
              style={{ transitionDelay: `${index * 150}ms` }}
            >
              {/* Número e linha */}
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold text-lg shadow-md">
                  {step.number}
                </div>
                {index < steps.length - 1 && (
                  <div className="w-0.5 h-16 bg-gradient-to-b from-primary to-secondary/30 mt-2" />
                )}
              </div>
              
              {/* Conteúdo */}
              <div className="flex-1 pb-4">
                <div className="flex items-center gap-2 mb-1">
                  <step.icon className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-bold text-foreground">
                    {step.title}
                  </h3>
                </div>
                <p className="text-muted-foreground text-sm">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center">
          <Button
            onClick={scrollToForm}
            size="lg"
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-lg px-8 py-6 shadow-lg hover:scale-105 transition-all"
          >
            COMEÇAR AGORA
          </Button>
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
