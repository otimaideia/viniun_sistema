import { useScrollAnimation } from "@/hooks/useScrollAnimation";

const AboutSection = () => {
  const { ref, isVisible } = useScrollAnimation();
  const stats = [
    { value: "+100", label: "unidades" },
    { value: "+500 mil", label: "clientes" },
    { value: "+5 milhões", label: "de sessões" },
    { value: "98%", label: "satisfação" },
    { value: "10 anos", label: "de mercado" },
    { value: "15 estados", label: "presente em" },
  ];

  return (
    <section className="py-16 md:py-24 bg-background">
      <div className="container mx-auto px-4">
        <div 
          ref={ref}
          className={`text-center max-w-3xl mx-auto mb-12 transition-all duration-700 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <h2 className="text-3xl md:text-5xl font-bold mb-6 text-foreground">
            A Yeslaser chegou em Praia Grande!
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
            Com mais de 100 unidades e 500 mil clientes satisfeitos, a Yeslaser traz para
            Praia Grande o que há de mais moderno em depilação a laser, estética e botox.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
          {stats.map((stat, index) => (
            <div
              key={stat.label}
              className={`bg-card rounded-xl p-6 text-center shadow-primary hover-lift transition-all duration-500 ${
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              }`}
              style={{ transitionDelay: `${index * 100}ms` }}
            >
              <div className="text-3xl md:text-4xl font-bold text-primary mb-2">
                {stat.value}
              </div>
              <div className="text-sm text-muted-foreground font-medium">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
