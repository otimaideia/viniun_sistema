import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Star, Gift, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

const TestimonialsSection = () => {
  const { ref, isVisible } = useScrollAnimation();
  const testimonials = [
    {
      text: "Excelente atendimento! Os resultados são impressionantes.",
      author: "Carla M.",
      location: "Santos",
    },
    {
      text: "Atendimento nota 10, ambiente super agradável. Super indico!",
      author: "Juliana R.",
      location: "Praia Grande",
    },
    {
      text: "Superou minhas expectativas! A equipe é muito atenciosa.",
      author: "Amanda S.",
      location: "São Vicente",
    },
    {
      text: "Melhor investimento que já fiz! Serviço de primeira qualidade.",
      author: "Fernanda L.",
      location: "Guarujá",
    },
    {
      text: "A unidade é linda e os equipamentos são de primeira. Recomendo muito!",
      author: "Patricia C.",
      location: "Santos",
    },
    {
      text: "Resultado visível já nas primeiras sessões. Estou muito satisfeita!",
      author: "Mariana F.",
      location: "Mongaguá",
    },
  ];

  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % testimonials.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [testimonials.length]);

  return (
    <section className="py-16 md:py-24 bg-gradient-to-b from-muted/30 to-background">
      <div className="container mx-auto px-4">
        <div 
          ref={ref}
          className={`text-center max-w-3xl mx-auto mb-12 transition-all duration-700 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <h2 className="text-3xl md:text-5xl font-bold mb-6 text-foreground">
            Clientes satisfeitos em todo o Brasil
          </h2>
        </div>

        <div className={`relative max-w-4xl mx-auto transition-all duration-700 delay-200 ${
          isVisible ? "opacity-100 scale-100" : "opacity-0 scale-95"
        }`}>
          <div className="overflow-hidden">
            <div
              className="flex transition-transform duration-500 ease-out"
              style={{ transform: `translateX(-${currentIndex * 100}%)` }}
            >
              {testimonials.map((testimonial) => (
                <div key={testimonial.author} className="min-w-full px-4">
                  <Card className="bg-card shadow-primary hover-lift">
                    <CardContent className="p-8 md:p-12">
                      <div className="flex gap-1 mb-4 justify-center">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className="w-5 h-5 fill-secondary text-secondary" />
                        ))}
                      </div>
                      <p className="text-lg md:text-xl text-center text-foreground mb-6 italic leading-relaxed">
                        "{testimonial.text}"
                      </p>
                      <div className="text-center">
                        <p className="font-semibold text-foreground">
                          — {testimonial.author}, {testimonial.location}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          </div>

          {/* Dots Navigation */}
          <div className="flex justify-center gap-2 mt-6">
            {testimonials.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === currentIndex
                    ? "bg-primary w-8"
                    : "bg-border hover:bg-primary/50"
                }`}
                aria-label={`Go to testimonial ${index + 1}`}
              />
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className={`text-center mt-12 transition-all duration-700 delay-400 ${
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        }`}>
          <Button
            onClick={() => document.getElementById("formulario")?.scrollIntoView({ behavior: "smooth" })}
            size="lg"
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-lg px-8 py-6 shadow-xl hover:scale-105 transition-transform"
          >
            <Gift className="w-5 h-5 mr-2" />
            EU TAMBÉM QUERO RESULTADOS ASSIM
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
