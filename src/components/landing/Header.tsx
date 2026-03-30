import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Verificar se está na página de pré-inauguração
  // "/" no domínio landing também renderiza LandingPreInauguracao
  const isPreInaugPage = location.pathname === "/lp/praia-grande" || location.pathname === "/lp/praia-grande/" || location.pathname === "/";

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
      setIsMobileMenuOpen(false);
    }
  };

  const handleLogoClick = () => {
    navigate('/lp/praia-grande');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleIndicacoesClick = () => {
    navigate('/lp/indicacoes');
    setIsMobileMenuOpen(false);
  };

  // Menu específico para página de pré-inauguração
  const renderPreInaugMenu = () => (
    <>
      {/* Desktop Navigation */}
      <nav className="hidden md:flex items-center gap-8">
        <button
          onClick={() => scrollToSection("hero")}
          className="text-foreground hover:text-primary transition-colors font-medium"
        >
          Promoção de Inauguração
        </button>
        <button
          onClick={handleIndicacoesClick}
          className="text-foreground hover:text-primary transition-colors font-medium"
        >
          Indique e Ganhe
        </button>
        <button
          onClick={() => navigate('/vagas')}
          className="text-foreground hover:text-primary transition-colors font-medium"
        >
          Trabalhe Conosco
        </button>
      </nav>

      <Button
        onClick={() => window.open("https://www.asaas.com/c/7ytngzlfment5bsu", "_blank")}
        className="hidden md:flex bg-gradient-to-r from-yeslaser-purple to-yeslaser-lightBlue hover:from-yeslaser-darkPurple hover:to-yeslaser-lightBlue text-white font-semibold uppercase tracking-wide shadow-lg hover:shadow-xl transition-all"
      >
        Comprar Agora
      </Button>

      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="md:hidden text-foreground"
      >
        {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="absolute top-[70px] left-0 right-0 bg-white shadow-lg md:hidden py-4 px-4 border-t border-border">
          <nav className="flex flex-col gap-4">
            <button
              onClick={() => scrollToSection("hero")}
              className="text-foreground hover:text-primary transition-colors font-medium text-left"
            >
              Promoção de Inauguração
            </button>
            <button
              onClick={handleIndicacoesClick}
              className="text-foreground hover:text-primary transition-colors font-medium text-left"
            >
              Indique e Ganhe
            </button>
            <button
              onClick={() => navigate('/vagas')}
              className="text-foreground hover:text-primary transition-colors font-medium text-left"
            >
              Trabalhe Conosco
            </button>
            <Button
              onClick={() => window.open("https://www.asaas.com/c/7ytngzlfment5bsu", "_blank")}
              className="bg-gradient-to-r from-yeslaser-purple to-yeslaser-lightBlue hover:from-yeslaser-darkPurple hover:to-yeslaser-lightBlue text-white font-semibold uppercase tracking-wide"
            >
              Comprar Agora
            </Button>
          </nav>
        </div>
      )}
    </>
  );

  // Menu padrão para outras páginas
  const renderDefaultMenu = () => (
    <>
      {/* Desktop Navigation */}
      <nav className="hidden md:flex items-center gap-8">
        <button
          onClick={() => scrollToSection("beneficios")}
          className="text-foreground hover:text-primary transition-colors font-medium"
        >
          Benefícios
        </button>
        <button
          onClick={() => scrollToSection("como-funciona")}
          className="text-foreground hover:text-primary transition-colors font-medium"
        >
          Como Funciona
        </button>
        <button
          onClick={() => scrollToSection("faq")}
          className="text-foreground hover:text-primary transition-colors font-medium"
        >
          FAQ
        </button>
        <button
          onClick={() => navigate('/vagas')}
          className="text-foreground hover:text-primary transition-colors font-medium"
        >
          Trabalhe Conosco
        </button>
      </nav>

      <Button
        onClick={() => scrollToSection("hero")}
        className="hidden md:flex bg-gradient-to-r from-yeslaser-purple to-yeslaser-lightBlue hover:from-yeslaser-darkPurple hover:to-yeslaser-lightBlue text-white font-semibold uppercase tracking-wide shadow-lg hover:shadow-xl transition-all"
      >
        Ganhe 10 Sessões Grátis
      </Button>

      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="md:hidden text-foreground"
      >
        {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="absolute top-[70px] left-0 right-0 bg-white shadow-lg md:hidden py-4 px-4 border-t border-border">
          <nav className="flex flex-col gap-4">
            <button
              onClick={() => scrollToSection("beneficios")}
              className="text-foreground hover:text-primary transition-colors font-medium text-left"
            >
              Benefícios
            </button>
            <button
              onClick={() => scrollToSection("como-funciona")}
              className="text-foreground hover:text-primary transition-colors font-medium text-left"
            >
              Como Funciona
            </button>
            <button
              onClick={() => scrollToSection("faq")}
              className="text-foreground hover:text-primary transition-colors font-medium text-left"
            >
              FAQ
            </button>
            <button
              onClick={() => navigate('/vagas')}
              className="text-foreground hover:text-primary transition-colors font-medium text-left"
            >
              Trabalhe Conosco
            </button>
            <Button
              onClick={() => scrollToSection("hero")}
              className="bg-gradient-to-r from-yeslaser-purple to-yeslaser-lightBlue hover:from-yeslaser-darkPurple hover:to-yeslaser-lightBlue text-white font-semibold uppercase tracking-wide"
            >
              Ganhe 10 Sessões Grátis
            </Button>
          </nav>
        </div>
      )}
    </>
  );

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? "bg-white/95 backdrop-blur-md shadow-md" : "bg-white"
      }`}
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-[70px]">
          <div className="flex items-center gap-2">
            <img
              src="/images/landing/depilacao-a-laser-em-praia-grande-yeslaser.png"
              alt="Yeslaser - Depilação a Laser e Estética"
              className="h-10 md:h-12 w-auto cursor-pointer transition-transform hover:scale-105"
              onClick={handleLogoClick}
            />
          </div>

          {isPreInaugPage ? renderPreInaugMenu() : renderDefaultMenu()}
        </div>
      </div>
    </header>
  );
};

export default Header;
