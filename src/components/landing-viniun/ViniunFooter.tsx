import { Link } from 'react-router-dom';
import { Smartphone } from 'lucide-react';

const productLinks = [
  { label: 'Funcionalidades', href: '#features' },
  { label: 'App Mobile', href: '#app-mobile' },
  { label: 'Planos', href: '#pricing' },
  { label: 'FAQ', href: '#faq' },
];

const resourceLinks = [
  { label: 'Central de Ajuda', href: '#' },
  { label: 'API & Integrações', href: '#' },
  { label: 'Status do Sistema', href: '#' },
];

const accessLinks = [
  { label: 'Entrar na Plataforma', href: '/login', isRoute: true },
  { label: 'Criar Conta Grátis', href: '/cadastro', isRoute: true },
];

export default function ViniunFooter() {
  const scrollTo = (href: string) => {
    if (href.startsWith('#') && href.length > 1) {
      const el = document.querySelector(href);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <footer className="bg-viniun-dark text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-10">
          {/* Col 1: Brand */}
          <div className="lg:col-span-2">
            <Link to="/" className="inline-block mb-4">
              <span className="text-2xl font-bold tracking-tight">Viniun</span>
            </Link>
            <p className="text-sm text-white/70 leading-relaxed mb-4">
              Plataforma completa de gestão imobiliária. Web, Android e iOS.
            </p>
            {/* App badges */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 bg-white/10 rounded-lg px-3 py-2">
                <Smartphone className="h-4 w-4 text-white/60" />
                <span className="text-xs text-white/60">Android & iOS em breve</span>
              </div>
            </div>
          </div>

          {/* Col 2: Produto */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider mb-4 text-white/90">
              Produto
            </h4>
            <ul className="space-y-3">
              {productLinks.map((link) => (
                <li key={link.label}>
                  <button
                    onClick={() => scrollTo(link.href)}
                    className="text-sm text-white/60 hover:text-white transition-colors"
                  >
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 3: Acesso */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider mb-4 text-white/90">
              Acesso
            </h4>
            <ul className="space-y-3">
              {accessLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.href}
                    className="text-sm text-white/60 hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
              {resourceLinks.map((link) => (
                <li key={link.label}>
                  <button
                    onClick={() => scrollTo(link.href)}
                    className="text-sm text-white/60 hover:text-white transition-colors"
                  >
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 4: Contato */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider mb-4 text-white/90">
              Contato
            </h4>
            <ul className="space-y-3">
              <li>
                <a
                  href="mailto:contato@viniun.com.br"
                  className="text-sm text-white/60 hover:text-white transition-colors"
                >
                  contato@viniun.com.br
                </a>
              </li>
              <li>
                <a
                  href="https://wa.me/5511999999999?text=Olá! Gostaria de saber mais sobre o Viniun."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-white/60 hover:text-white transition-colors"
                >
                  WhatsApp
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/50">
            <p>&copy; 2026 Viniun. Todos os direitos reservados.</p>
            <div className="flex gap-6">
              <button className="hover:text-white transition-colors">
                Política de Privacidade
              </button>
              <button className="hover:text-white transition-colors">
                Termos de Uso
              </button>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
