import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Gift, ArrowRight } from "lucide-react";

const FAQSection = () => {
  const faqs = [
    {
      question: "Quais serviços vocês oferecem?",
      answer:
        "Oferecemos uma gama completa de serviços adaptados às necessidades de cada cliente. Entre em contato para conhecer todas as opções disponíveis.",
    },
    {
      question: "Como funciona o atendimento?",
      answer:
        "Nosso atendimento é personalizado. Após o cadastro, nossa equipe entrará em contato para agendar uma consulta e apresentar as melhores opções para você.",
    },
    {
      question: "Quais benefícios estão incluídos na promoção?",
      answer:
        "A promoção é válida para novos clientes. Cadastre-se e indique amigos para desbloquear benefícios exclusivos.",
    },
    {
      question: "Onde fica a unidade de Praia Grande?",
      answer:
        "Estamos na Rua Jaú, 1275 - Boqueirão, Praia Grande/SP. Próximo ao centro, com fácil acesso e estacionamento na região.",
    },
    {
      question: "Posso agendar para qualquer dia?",
      answer:
        "Sim! Funcionamos de segunda a sábado, das 8h às 19h. Após entrar no grupo VIP, nossa equipe entrará em contato para agendar no melhor horário para você.",
    },
    {
      question: "Quais as formas de pagamento?",
      answer:
        "Aceitamos cartões de crédito (até 12x), débito, Pix e boleto. Condições especiais de inauguração disponíveis!",
    },
  ];

  const handleAccordionChange = (value: string) => {
    if (value && typeof window !== "undefined" && (window as any).dataLayer) {
      (window as any).dataLayer.push({
        event: "faq_open",
        faqQuestion: value,
      });
    }
  };

  return (
    <section id="faq" className="py-16 md:py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-3xl md:text-5xl font-bold mb-6 text-foreground">
            Dúvidas Frequentes
          </h2>
        </div>

        <div className="max-w-3xl mx-auto">
          <Accordion
            type="single"
            collapsible
            className="space-y-4"
            onValueChange={handleAccordionChange}
          >
            {faqs.map((faq) => (
              <AccordionItem
                key={faq.question}
                value={faq.question}
                className="bg-card rounded-xl shadow-primary px-6 border-none"
              >
                <AccordionTrigger className="text-left text-lg font-semibold text-foreground hover:no-underline py-6">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed pb-6">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        {/* CTA */}
        <div className="text-center mt-12 px-4">
          <p className="text-base sm:text-lg text-muted-foreground mb-4">
            Ainda tem dúvidas? Cadastre-se e nossa equipe entrará em contato!
          </p>
          <Button
            onClick={() => document.getElementById("formulario-preinauguracao")?.scrollIntoView({ behavior: "smooth" })}
            size="lg"
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm sm:text-base md:text-lg px-4 sm:px-8 py-4 sm:py-6 shadow-xl hover:scale-105 transition-transform w-full sm:w-auto max-w-md"
          >
            <Gift className="w-4 h-4 sm:w-5 sm:h-5 mr-2 flex-shrink-0" />
            <span className="truncate">QUERO GARANTIR MEU BENEFÍCIO</span>
            <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 ml-2 flex-shrink-0" />
          </Button>
        </div>
      </div>
    </section>
  );
};

export default FAQSection;
