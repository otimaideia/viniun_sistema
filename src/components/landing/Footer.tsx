import { MapPin, Phone, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Footer = () => {
  const navigate = useNavigate();

  const handleLogoClick = () => {
    navigate('/lp/praia-grande');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="bg-card border-t border-border py-12">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-3 gap-8 mb-8">
          <div>
            <img
              src="/images/landing/depilacao-a-laser-em-praia-grande-yeslaser.png"
              alt="Yeslaser - Depilação a Laser e Estética"
              className="h-16 mb-4 cursor-pointer transition-transform hover:scale-105"
              onClick={handleLogoClick}
            />
            <p className="text-muted-foreground text-sm">
              A maior rede de depilação a laser, estética e botox
              do Norte e Nordeste, agora em Praia Grande.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-foreground mb-4">Contato</h4>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <MapPin className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <p className="text-muted-foreground">
                  Rua Jaú, 1275 - Boqueirão<br />
                  Praia Grande/SP - CEP 11700-270
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-5 h-5 text-primary flex-shrink-0" />
                <p className="text-muted-foreground">(13) 97826-3924</p>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary flex-shrink-0" />
                <p className="text-muted-foreground">Seg-Sáb: 8h às 19h</p>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-foreground mb-4">Links</h4>
            <div className="space-y-2 text-sm">
              <a
                href="#"
                className="block text-muted-foreground hover:text-primary transition-colors"
              >
                Política de Privacidade
              </a>
              <a
                href="#"
                className="block text-muted-foreground hover:text-primary transition-colors"
              >
                Termos de Uso
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-border pt-8 text-center text-sm text-muted-foreground">
          <p>© 2025 Yeslaser Praia Grande. Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
