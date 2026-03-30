import { Link } from 'react-router-dom';
import { Instagram, Facebook, Phone, Mail, MapPin, MessageCircle } from 'lucide-react';

export function SiteFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[#1a1a2e] text-gray-300">
      {/* Main Footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {/* Column 1: About */}
          <div className="space-y-4">
            <Link to="/novosite" className="inline-block">
              <h3 className="text-2xl font-bold">
                <span className="text-[#6B2D8B]">YES</span>
                <span className="text-white">laser</span>
              </h3>
              <span className="text-xs text-gray-400 tracking-widest uppercase">Praia Grande</span>
            </Link>
            <p className="text-sm text-gray-400 leading-relaxed">
              Referência em depilação a laser e estética avançada em Praia Grande.
              Tecnologia de ponta e profissionais qualificados para cuidar da sua beleza.
            </p>
            {/* Social Icons */}
            <div className="flex items-center gap-3 pt-2">
              <a
                href="https://www.instagram.com/yeslaserpraiagrande"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-[#6B2D8B] transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="h-4 w-4" />
              </a>
              <a
                href="https://www.facebook.com/yeslaserpraiagrande"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-[#6B2D8B] transition-colors"
                aria-label="Facebook"
              >
                <Facebook className="h-4 w-4" />
              </a>
              <a
                href="https://wa.me/5513991888100"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-[#6B2D8B] transition-colors"
                aria-label="WhatsApp"
              >
                <MessageCircle className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Column 2: Services */}
          <div className="space-y-4">
            <h4 className="text-white font-semibold text-sm uppercase tracking-wider">Serviços</h4>
            <nav className="flex flex-col gap-2.5">
              <Link to="/novosite/depilacao-a-laser" className="text-sm text-gray-400 hover:text-[#6B2D8B] transition-colors">
                Depilação a Laser
              </Link>
              <Link to="/novosite/estetica-facial" className="text-sm text-gray-400 hover:text-[#6B2D8B] transition-colors">
                Estética Facial
              </Link>
              <Link to="/novosite/estetica-corporal" className="text-sm text-gray-400 hover:text-[#6B2D8B] transition-colors">
                Estética Corporal
              </Link>
              <Link to="/novosite/pacotes" className="text-sm text-gray-400 hover:text-[#6B2D8B] transition-colors">
                Pacotes
              </Link>
              <Link to="/novosite/promocoes" className="text-sm text-gray-400 hover:text-[#6B2D8B] transition-colors">
                Promoções
              </Link>
            </nav>
          </div>

          {/* Column 3: Customer Service */}
          <div className="space-y-4">
            <h4 className="text-white font-semibold text-sm uppercase tracking-wider">Atendimento</h4>
            <div className="flex flex-col gap-3">
              <a
                href="tel:+5513991888100"
                className="flex items-center gap-2.5 text-sm text-gray-400 hover:text-[#6B2D8B] transition-colors"
              >
                <Phone className="h-4 w-4 flex-shrink-0" />
                (13) 99188-8100
              </a>
              <a
                href="mailto:contato@yeslaserpraiagrande.com.br"
                className="flex items-center gap-2.5 text-sm text-gray-400 hover:text-[#6B2D8B] transition-colors"
              >
                <Mail className="h-4 w-4 flex-shrink-0" />
                contato@yeslaserpraiagrande.com.br
              </a>
              <div className="flex items-start gap-2.5 text-sm text-gray-400">
                <MapPin className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <span>
                  Av. Presidente Kennedy, 6295<br />
                  Guilhermina, Praia Grande - SP<br />
                  CEP 11702-200
                </span>
              </div>
            </div>
          </div>

          {/* Column 4: Social / Links */}
          <div className="space-y-4">
            <h4 className="text-white font-semibold text-sm uppercase tracking-wider">Redes Sociais</h4>
            <nav className="flex flex-col gap-2.5">
              <a
                href="https://www.instagram.com/yeslaserpraiagrande"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 text-sm text-gray-400 hover:text-[#6B2D8B] transition-colors"
              >
                <Instagram className="h-4 w-4" />
                @yeslaserpraiagrande
              </a>
              <a
                href="https://www.facebook.com/yeslaserpraiagrande"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 text-sm text-gray-400 hover:text-[#6B2D8B] transition-colors"
              >
                <Facebook className="h-4 w-4" />
                /yeslaserpraiagrande
              </a>
              <a
                href="https://wa.me/5513991888100"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 text-sm text-gray-400 hover:text-[#6B2D8B] transition-colors"
              >
                <MessageCircle className="h-4 w-4" />
                WhatsApp
              </a>
            </nav>

            <div className="pt-4 space-y-2.5">
              <h4 className="text-white font-semibold text-sm uppercase tracking-wider">Legal</h4>
              <nav className="flex flex-col gap-2">
                <Link to="/novosite/termos" className="text-sm text-gray-400 hover:text-[#6B2D8B] transition-colors">
                  Termos de Uso
                </Link>
                <Link to="/novosite/privacidade" className="text-sm text-gray-400 hover:text-[#6B2D8B] transition-colors">
                  Política de Privacidade
                </Link>
              </nav>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-center text-xs text-gray-500">
            &copy; {currentYear} YESlaser Praia Grande. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
