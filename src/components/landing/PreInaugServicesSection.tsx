import { Zap, Sparkles, Heart, Syringe, Dumbbell, Crown } from "lucide-react";

const services = [
  {
    icon: Zap,
    title: "Consultoria",
    description: "Atendimento especializado e personalizado para suas necessidades.",
  },
  {
    icon: Sparkles,
    title: "Assessoria",
    description: "Suporte completo para garantir os melhores resultados.",
  },
  {
    icon: Heart,
    title: "Atendimento Premium",
    description: "Serviços modernos com padrão de excelência.",
  },
  {
    icon: Syringe,
    title: "Serviços Especializados",
    description: "Soluções avançadas para resultados superiores.",
  },
  {
    icon: Dumbbell,
    title: "Soluções Corporativas",
    description: "Serviços completos para empresas e parceiros.",
  },
  {
    icon: Crown,
    title: "Planos VIP",
    description: "Pacotes exclusivos com benefícios especiais para clientes VIP.",
  },
];

const PreInaugServicesSection = () => {
  return (
    <section className="py-16 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <span className="inline-block bg-primary/10 text-primary font-semibold px-4 py-2 rounded-full text-sm uppercase tracking-wide mb-4">
            Nossos Serviços
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Conheça nossos{" "}
            <span className="text-primary">serviços</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Oferecemos uma variedade de soluções com tecnologia de ponta
            para atender suas necessidades.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {services.map((service, index) => {
            const Icon = service.icon;
            return (
              <div
                key={service.title}
                className="bg-card rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-border/50"
              >
                <div className="w-14 h-14 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center mb-4">
                  <Icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">
                  {service.title}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {service.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default PreInaugServicesSection;
