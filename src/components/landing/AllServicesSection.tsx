import { Users, Heart, Shield, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const AllServicesSection = () => {
  const services = {
    feminino: [
      { name: "Buço", image: "/images/landing/services/buco.jpg", description: "Remoção suave dos pelos acima do lábio superior" },
      { name: "Queixo", image: "/images/landing/services/queixo.jpg", description: "Tratamento preciso para região do queixo" },
      { name: "Rosto completo", image: "/images/landing/services/rosto-completo.jpg", description: "Depilação completa de toda a face feminina" },
      { name: "Axilas", image: "/images/landing/services/axilas.jpg", description: "Axilas livres de pelos com pele macia" },
      { name: "Seios / Aréola", image: "/images/landing/services/seios.jpg", description: "Tratamento delicado para região dos seios" },
      { name: "Barriga", image: "/images/landing/services/barriga.jpg", description: "Pele lisa e sem pelos na região abdominal" },
      { name: "Braços", image: "/images/landing/services/bracos.jpg", description: "Braços completamente livres de pelos" },
      { name: "Antebraço", image: "/images/landing/services/antebraco.jpg", description: "Tratamento específico para o antebraço" },
      { name: "Virilha clássica", image: "/images/landing/services/virilha-classica.jpg", description: "Depilação da linha do biquíni tradicional" },
      { name: "Virilha cavada", image: "/images/landing/services/virilha-cavada.jpg", description: "Contorno mais definido para biquínis" },
      { name: "Virilha completa", image: "/images/landing/services/virilha-completa.jpg", description: "Depilação total da região íntima" },
      { name: "Nádegas", image: "/images/landing/services/nadegas.jpg", description: "Tratamento para região dos glúteos" },
      { name: "Linha alba", image: "/images/landing/services/linha-alba.jpg", description: "Remoção dos pelos da linha central" },
      { name: "Coxas", image: "/images/landing/services/coxas.jpg", description: "Coxas lisas e livres de pelos" },
      { name: "Meia perna", image: "/images/landing/services/meia-perna.jpg", description: "Depilação da canela até o joelho" },
      { name: "Pernas completas", image: "/images/landing/services/pernas-completas.jpg", description: "Pernas inteiras livres de pelos" },
    ],
    masculino: [
      { name: "Barba completa", image: "/images/landing/services/barba.jpg", description: "Design e remoção de pelos faciais" },
      { name: "Pescoço", image: "/images/landing/services/pescoco.jpg", description: "Contorno limpo e definido do pescoço" },
      { name: "Orelha", image: "/images/landing/services/orelha.jpg", description: "Remoção discreta dos pelos das orelhas" },
      { name: "Peito", image: "/images/landing/services/peito.jpg", description: "Peito livre de pelos com resultado duradouro" },
      { name: "Abdômen", image: "/images/landing/services/abdomen.jpg", description: "Abdômen definido e livre de pelos" },
      { name: "Tórax completo", image: "/images/landing/services/torax.jpg", description: "Tratamento completo de peito e abdômen" },
      { name: "Braços", image: "/images/landing/services/bracos-masc.jpg", description: "Braços masculinos livres de pelos" },
      { name: "Costas", image: "/images/landing/services/costas.jpg", description: "Costas lisas e sem desconforto" },
      { name: "Ombros", image: "/images/landing/services/ombros.jpg", description: "Ombros livres de pelos indesejados" },
      { name: "Glúteos", image: "/images/landing/services/gluteos.jpg", description: "Tratamento discreto e eficaz" },
      { name: "Perna completa", image: "/images/landing/services/perna-completa-masc.jpg", description: "Pernas masculinas completamente lisas" },
      { name: "Meia perna", image: "/images/landing/services/meia-perna-masc.jpg", description: "Depilação da canela até o joelho" },
      { name: "Região íntima", image: "/images/landing/services/regiao-intima.jpg", description: "Tratamento completo região íntima" },
    ],
    tratamentos: [
      { name: "Clareamento de axilas", image: "/images/landing/services/clareamento-axilas.jpg", description: "Uniformização do tom da pele das axilas" },
      { name: "Clareamento de virilha", image: "/images/landing/services/clareamento-virilha.jpg", description: "Clareamento efetivo da região íntima" },
      { name: "Tratamento de manchas", image: "/images/landing/services/tratamento-manchas.jpg", description: "Redução de manchas e hiperpigmentação" },
      { name: "Tratamento de foliculite", image: "/images/landing/services/foliculite.jpg", description: "Eliminação de pelos encravados" },
      { name: "Rejuvenescimento facial", image: "/images/landing/services/rejuvenescimento.jpg", description: "Pele mais jovem e renovada" },
      { name: "Tratamento de estrias", image: "/images/landing/services/estrias.jpg", description: "Redução visível das estrias" },
    ],
  };

  const handleCTAClick = () => {
    window.open("https://www.asaas.com/c/7ytngzlfment5bsu", "_blank");
  };

  return (
    <section id="procedimentos" className="py-16 md:py-24 bg-gradient-to-b from-background to-secondary/10">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12 md:mb-16">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-semibold mb-4">
            <Sparkles className="w-4 h-4" />
            NOSSOS SERVIÇOS EM PRAIA GRANDE
          </div>
          <h2 className="text-3xl md:text-5xl font-bold text-primary mb-4">
            Procedimentos Disponíveis
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
            Depilação a laser de alta tecnologia para todas as áreas do corpo,
            com tratamentos complementares para sua pele perfeita
          </p>
        </div>

        {/* Depilação Feminina */}
        <div className="mb-16">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
              <Heart className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-2xl md:text-3xl font-bold text-foreground">
              Depilação a Laser Feminina
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
                    alt={`Depilação a laser ${service.name} em Praia Grande`}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-primary/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-3">
                    <p className="text-white text-xs">{service.description}</p>
                  </div>
                </div>
                <div className="p-3 text-center bg-white">
                  <p className="font-semibold text-foreground text-sm md:text-base">
                    {service.name}
                  </p>
                </div>
              </div>
            ))}
          </div>
          
          {/* CTA após feminina */}
          <div className="text-center mt-8">
            <Button
              onClick={handleCTAClick}
              size="lg"
              className="bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-white font-bold px-8 py-6 shadow-xl"
            >
              Aproveite a Promoção R$ 79,90
            </Button>
          </div>
        </div>

        {/* Depilação Masculina */}
        <div className="mb-16">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-secondary/10 rounded-full flex items-center justify-center">
              <Users className="w-6 h-6 text-secondary" />
            </div>
            <h3 className="text-2xl md:text-3xl font-bold text-foreground">
              Depilação a Laser Masculina
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
                    alt={`Depilação a laser ${service.name} em Praia Grande`}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-secondary/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-3">
                    <p className="text-white text-xs">{service.description}</p>
                  </div>
                </div>
                <div className="p-3 text-center bg-white">
                  <p className="font-semibold text-foreground text-sm md:text-base">
                    {service.name}
                  </p>
                </div>
              </div>
            ))}
          </div>
          
          {/* CTA após masculina */}
          <div className="text-center mt-8">
            <Button
              onClick={handleCTAClick}
              size="lg"
              className="bg-gradient-to-r from-secondary to-primary hover:opacity-90 text-white font-bold px-8 py-6 shadow-xl"
            >
              Comprar 10 Sessões por R$ 79,90
            </Button>
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
                  <div className="absolute inset-0 bg-gradient-to-t from-primary/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-3">
                    <p className="text-white text-xs">{service.description}</p>
                  </div>
                </div>
                <div className="p-3 text-center bg-white">
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
            <span className="bg-white px-4 py-2 rounded-full shadow-sm">✅ Protocolos pós-laser</span>
            <span className="bg-white px-4 py-2 rounded-full shadow-sm">✅ Acompanhamento WhatsApp</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AllServicesSection;
