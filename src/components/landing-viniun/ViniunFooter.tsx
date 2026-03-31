import { Link } from 'react-router-dom';

const productLinks = [
  { label: 'Funcionalidades', href: '#features' },
  { label: 'Planos', href: '#pricing' },
  { label: 'FAQ', href: '#faq' },
  { label: 'Blog', href: '#' },
];

const resourceLinks = [
  { label: 'Central de Ajuda', href: '#' },
  { label: 'API & Integrações', href: '#' },
  { label: 'Status do Sistema', href: '#' },
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Col 1: Brand */}
          <div>
            <Link to="/" className="inline-block mb-4">
              <span className="text-2xl font-bold tracking-tight">Viniun</span>
            </Link>
            <p className="text-sm text-white/70 leading-relaxed">
              Plataforma completa de gestão imobiliária multi-tenant
            </p>
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

          {/* Col 3: Recursos */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider mb-4 text-white/90">
              Recursos
            </h4>
            <ul className="space-y-3">
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
