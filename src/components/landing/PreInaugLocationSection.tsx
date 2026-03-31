import { MapPin, Phone, Instagram, Globe, Clock, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

const PreInaugLocationSection = () => {
  const googleMapsUrl = "https://www.google.com/maps/place/Viniun+Praia+Grande/@-24.0058,-46.4028,17z";
  const googleMapsEmbedUrl = "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3645.8!2d-46.4028!3d-24.0058!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x94ce1f2a1b2c3d4e%3A0x6a850d78807e880e!2sViniun%20Praia%20Grande!5e0!3m2!1spt-BR!2sbr!4v1704067200000!5m2!1spt-BR!2sbr";

  return (
    <section className="py-12 md:py-16 bg-card">
      <div className="container mx-auto px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-8 md:mb-12">
            <div className="inline-flex items-center gap-2 bg-yellow-100 text-yellow-800 font-semibold px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm uppercase tracking-wide mb-4">
              <Clock className="w-4 h-4" />
              Inauguração em Breve
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-4">
              Nossa <span className="text-primary">Localização</span>
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto px-4">
              Estamos chegando em Praia Grande com uma estrutura completa para cuidar de você!
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 md:gap-8 items-stretch">
            {/* Google Maps Embed */}
            <div className="rounded-2xl overflow-hidden shadow-lg border border-border min-h-[300px] md:min-h-[400px]">
              <iframe
                src={googleMapsEmbedUrl}
                width="100%"
                height="100%"
                style={{ border: 0, minHeight: "300px" }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Localização Viniun - Rua Jaú 1281, Boqueirão"
                className="w-full h-full"
              />
            </div>

            {/* Contact info */}
            <div className="space-y-4 sm:space-y-6">
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground mb-1 text-sm sm:text-base">Endereço</h3>
                  <p className="text-muted-foreground text-sm sm:text-base">
                    Rua Jaú, 1281 - Loja 1<br />
                    Boqueirão - Praia Grande/SP<br />
                    CEP: 11700-270
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 sm:gap-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Phone className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground mb-1 text-sm sm:text-base">WhatsApp</h3>
                  <a 
                    href="https://wa.me/5513978263924" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline font-medium text-sm sm:text-base"
                  >
                    (13) 97826-3924
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3 sm:gap-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Instagram className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground mb-1 text-sm sm:text-base">Instagram</h3>
                  <a 
                    href="https://instagram.com/viniun" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline font-medium text-sm sm:text-base"
                  >
                    @viniun
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3 sm:gap-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Globe className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground mb-1 text-sm sm:text-base">Site</h3>
                  <a 
                    href="https://viniun.com.br" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline font-medium text-sm sm:text-base"
                  >
                    www.viniun.com.br
                  </a>
                </div>
              </div>

              {/* Botão para abrir no Google Maps */}
              <Button
                onClick={() => window.open(googleMapsUrl, "_blank")}
                className="w-full bg-primary hover:bg-primary/90 text-white font-bold mt-4"
                size="lg"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Abrir no Google Maps
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PreInaugLocationSection;