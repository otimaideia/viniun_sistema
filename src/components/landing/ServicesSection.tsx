import { Users, Heart, Shield } from "lucide-react";

const ServicesSection = () => {
  const services = {
    feminino: [
      { name: "Buço", image: "/images/landing/services/buco.jpg" },
      { name: "Queixo", image: "/images/landing/services/queixo.jpg" },
      { name: "Rosto completo", image: "/images/landing/services/rosto-completo.jpg" },
      { name: "Axilas", image: "/images/landing/services/axilas.jpg" },
      { name: "Seios / Aréola", image: "/images/landing/services/seios.jpg" },
      { name: "Barriga", image: "/images/landing/services/barriga.jpg" },
      { name: "Braços", image: "/images/landing/services/bracos.jpg" },
      { name: "Antebraço", image: "/images/landing/services/antebraco.jpg" },
      { name: "Virilha clássica", image: "/images/landing/services/virilha-classica.jpg" },
      { name: "Virilha cavada", image: "/images/landing/services/virilha-cavada.jpg" },
      { name: "Virilha completa", image: "/images/landing/services/virilha-completa.jpg" },
      { name: "Nádegas", image: "/images/landing/services/nadegas.jpg" },
      { name: "Linha alba", image: "/images/landing/services/linha-alba.jpg" },
      { name: "Coxas", image: "/images/landing/services/coxas.jpg" },
      { name: "Meia perna", image: "/images/landing/services/meia-perna.jpg" },
      { name: "Pernas completas", image: "/images/landing/services/pernas-completas.jpg" },
    ],
    masculino: [
      { name: "Barba completa", image: "/images/landing/services/barba.jpg" },
      { name: "Pescoço", image: "/images/landing/services/pescoco.jpg" },
      { name: "Orelha", image: "/images/landing/services/orelha.jpg" },
      { name: "Peito", image: "/images/landing/services/peito.jpg" },
      { name: "Abdômen", image: "/images/landing/services/abdomen.jpg" },
      { name: "Tórax completo", image: "/images/landing/services/torax.jpg" },
      { name: "Braços", image: "/images/landing/services/bracos-masc.jpg" },
      { name: "Costas", image: "/images/landing/services/costas.jpg" },
      { name: "Ombros", image: "/images/landing/services/ombros.jpg" },
      { name: "Glúteos", image: "/images/landing/services/gluteos.jpg" },
      { name: "Perna completa", image: "/images/landing/services/perna-completa-masc.jpg" },
      { name: "Meia perna", image: "/images/landing/services/meia-perna-masc.jpg" },
      { name: "Região íntima", image: "/images/landing/services/regiao-intima.jpg" },
    ],
    tratamentos: [
      { name: "Clareamento de axilas", image: "/images/landing/services/clareamento-axilas.jpg" },
      { name: "Clareamento de virilha", image: "/images/landing/services/clareamento-virilha.jpg" },
      { name: "Tratamento de manchas", image: "/images/landing/services/tratamento-manchas.jpg" },
      { name: "Tratamento de foliculite", image: "/images/landing/services/foliculite.jpg" },
      { name: "Rejuvenescimento facial", image: "/images/landing/services/rejuvenescimento.jpg" },
      { name: "Tratamento de estrias", image: "/images/landing/services/estrias.jpg" },
    ],
  };

  return (
    <section id="servicos" className="py-16 md:py-24 bg-gradient-to-b from-background to-secondary/10">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12 md:mb-16">
          <h2 className="text-3xl md:text-5xl font-bold text-primary mb-4">
            Todos os Nossos Serviços
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
            Soluções completas e personalizadas para atender
            todas as suas necessidades com excelência
          </p>
        </div>

        {/* Serviços Categoria A */}
        <div className="mb-16">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
              <Heart className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-2xl md:text-3xl font-bold text-foreground">
              Serviços Femininos
            </h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {services.feminino.map((service) => (
              <div
                key={service.name}
                className="group relative overflow-hidden rounded-xl bg-white shadow-md hover:shadow-xl transition-all duration-300 hover:scale-105"
              >
                <div className="aspect-square bg-gradient-to-br from-primary/10 to-secondary/10 relative overflow-hidden">
                  <img
                    src={service.image}
                    alt={`${service.name} - Viniun Praia Grande`}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-primary/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>
                <div className="p-4 text-center bg-white">
                  <p className="font-semibold text-foreground text-sm md:text-base">
                    {service.name}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Serviços Categoria B */}
        <div className="mb-16">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-secondary/10 rounded-full flex items-center justify-center">
              <Users className="w-6 h-6 text-secondary" />
            </div>
            <h3 className="text-2xl md:text-3xl font-bold text-foreground">
              Serviços Masculinos
            </h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {services.masculino.map((service) => (
              <div
                key={service.name}
                className="group relative overflow-hidden rounded-xl bg-white shadow-md hover:shadow-xl transition-all duration-300 hover:scale-105"
              >
                <div className="aspect-square bg-gradient-to-br from-secondary/10 to-primary/10 relative overflow-hidden">
                  <img
                    src={service.image}
                    alt={`${service.name} - Viniun Praia Grande`}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-secondary/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>
                <div className="p-4 text-center bg-white">
                  <p className="font-semibold text-foreground text-sm md:text-base">
                    {service.name}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tratamentos Complementares */}
        <div>
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-2xl md:text-3xl font-bold text-foreground">
              Tratamentos Complementares
            </h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
            {services.tratamentos.map((service) => (
              <div
                key={service.name}
                className="group relative overflow-hidden rounded-xl bg-white shadow-md hover:shadow-xl transition-all duration-300 hover:scale-105"
              >
                <div className="aspect-video bg-gradient-to-br from-primary/10 to-secondary/10 relative overflow-hidden">
                  <img
                    src={service.image}
                    alt={`Tratamento ${service.name} em Praia Grande`}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-primary/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>
                <div className="p-4 text-center bg-white">
                  <p className="font-semibold text-foreground text-sm md:text-base">
                    {service.name}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Info complementar */}
        <div className="mt-12 bg-primary/5 rounded-2xl p-8 text-center">
          <p className="text-lg text-muted-foreground mb-4">
            <strong className="text-foreground">Serviços de suporte inclusos:</strong>
          </p>
          <div className="flex flex-wrap justify-center gap-4 text-sm md:text-base">
            <span className="bg-white px-4 py-2 rounded-full shadow-sm">✅ Avaliação personalizada</span>
            <span className="bg-white px-4 py-2 rounded-full shadow-sm">✅ Sessão teste</span>
            <span className="bg-white px-4 py-2 rounded-full shadow-sm">✅ Sessões de manutenção</span>
            <span className="bg-white px-4 py-2 rounded-full shadow-sm">✅ Protocolos de qualidade</span>
            <span className="bg-white px-4 py-2 rounded-full shadow-sm">✅ Acompanhamento WhatsApp</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ServicesSection;