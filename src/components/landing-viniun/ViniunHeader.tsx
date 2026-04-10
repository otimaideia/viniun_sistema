import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu, LogIn } from 'lucide-react';

const navLinks = [
  { label: 'Funcionalidades', href: '#features' },
  { label: 'App Mobile', href: '#app-mobile' },
  { label: 'Planos', href: '#pricing' },
  { label: 'FAQ', href: '#faq' },
];

const WHATSAPP_URL = 'https://wa.me/5511999999999?text=Olá! Gostaria de saber mais sobre o Viniun.';

export default function ViniunHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleNavClick = (href: string) => {
    setMobileOpen(false);
    const el = document.querySelector(href);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-white/95 backdrop-blur-md shadow-sm'
          : 'bg-white'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link to="/" className="flex-shrink-0">
            <span className="text-2xl font-bold text-viniun-navy tracking-tight">
              Viniun
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <button
                key={link.href}
                onClick={() => handleNavClick(link.href)}
                className="text-sm font-medium text-gray-600 hover:text-viniun-navy transition-colors"
              >
                {link.label}
              </button>
            ))}
          </nav>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/login" className="gap-2">
                <LogIn className="h-4 w-4" />
                Entrar
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
                Falar com Consultor
              </a>
            </Button>
            <Button
              size="sm"
              className="bg-viniun-navy hover:bg-viniun-dark text-white"
              asChild
            >
              <Link to="/cadastro">Teste Grátis</Link>
            </Button>
          </div>

          {/* Mobile menu */}
          <div className="md:hidden">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72">
                <div className="flex flex-col gap-6 mt-8">
                  <span className="text-xl font-bold text-viniun-navy">
                    Viniun
                  </span>

                  <nav className="flex flex-col gap-4">
                    {navLinks.map((link) => (
                      <button
                        key={link.href}
                        onClick={() => handleNavClick(link.href)}
                        className="text-left text-sm font-medium text-gray-600 hover:text-viniun-navy transition-colors"
                      >
                        {link.label}
                      </button>
                    ))}
                  </nav>

                  <div className="flex flex-col gap-3 pt-4 border-t">
                    <Button variant="outline" asChild>
                      <Link to="/login" className="gap-2">
                        <LogIn className="h-4 w-4" />
                        Entrar na Plataforma
                      </Link>
                    </Button>
                    <Button variant="outline" asChild>
                      <a
                        href={WHATSAPP_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Falar com Consultor
                      </a>
                    </Button>
                    <Button
                      className="bg-viniun-navy hover:bg-viniun-dark text-white"
                      asChild
                    >
                      <Link to="/cadastro">Teste Grátis</Link>
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
