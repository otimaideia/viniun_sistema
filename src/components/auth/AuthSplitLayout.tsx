import { ReactNode, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useBranding } from '@/contexts/BrandingContext';

interface AuthSplitLayoutProps {
  children: ReactNode;
  /** Cor de destaque do painel decorativo. Default: usa branding do tenant. */
  accentFrom?: string;
  accentVia?: string;
  accentTo?: string;
  /** Conteúdo customizado do painel decorativo. Se omitido, usa o painel padrão. */
  decoration?: ReactNode;
  /** Mostrar link "Voltar para Home" no topo. */
  showBackToHome?: boolean;
  backHref?: string;
  backLabel?: string;
}

const taglines = [
  'Tudo o que você precisa, em um só lugar.',
  'Imobiliária inteligente começa aqui.',
  'Mais leads, menos esforço.',
  'Da prospecção ao fechamento, sem fricção.',
];

export function AuthSplitLayout({
  children,
  accentFrom,
  accentVia,
  accentTo,
  decoration,
  showBackToHome = true,
  backHref = '/',
  backLabel = 'Voltar para Home',
}: AuthSplitLayoutProps) {
  const { primaryColor, secondaryColor, logoUrl, branding } = useBranding();

  const from = accentFrom || primaryColor;
  const via = accentVia || secondaryColor;
  const to = accentTo || primaryColor;

  const tagline = useMemo(() => {
    if (branding?.texto_boas_vindas) return branding.texto_boas_vindas;
    return taglines[Math.floor(Math.random() * taglines.length)];
  }, [branding?.texto_boas_vindas]);

  return (
    <div className="min-h-svh flex flex-col lg:flex-row bg-background">
      {/* Lado esquerdo — formulário */}
      <div className="flex-1 flex flex-col px-4 py-6 sm:px-8 sm:py-8 lg:px-12">
        {showBackToHome && (
          <div className="mb-4 sm:mb-6">
            <Link
              to={backHref}
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              {backLabel}
            </Link>
          </div>
        )}

        <div className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-md">{children}</div>
        </div>
      </div>

      {/* Lado direito — painel decorativo (desktop apenas) */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-[50%] relative overflow-hidden">
        {decoration ?? (
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(135deg, ${from} 0%, ${via} 55%, ${to} 100%)`,
            }}
          >
            {/* Mesh gradient — blobs animados */}
            <div
              className="absolute -top-1/4 -right-1/4 w-[70%] h-[70%] rounded-full blur-3xl opacity-50 animate-blob-1"
              style={{ background: 'rgba(255,255,255,0.35)' }}
            />
            <div
              className="absolute top-1/3 -left-1/4 w-[55%] h-[55%] rounded-full blur-3xl opacity-40 animate-blob-2"
              style={{ background: `${via}99` }}
            />
            <div
              className="absolute -bottom-1/4 right-1/4 w-[60%] h-[60%] rounded-full blur-3xl opacity-30 animate-blob-3"
              style={{ background: 'rgba(255,255,255,0.25)' }}
            />

            {/* Padrão de pontos sutil */}
            <div
              className="absolute inset-0 opacity-[0.08] mix-blend-overlay"
              style={{
                backgroundImage:
                  'radial-gradient(circle, rgba(255,255,255,0.6) 1px, transparent 1px)',
                backgroundSize: '24px 24px',
              }}
            />

            {/* Conteúdo central */}
            <div className="relative h-full flex flex-col justify-between p-12 text-white">
              {/* Topo — logo */}
              <div>
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt="Logo"
                    className="h-12 object-contain drop-shadow-md brightness-0 invert"
                  />
                ) : (
                  <div className="text-3xl font-bold tracking-tight drop-shadow">
                    {branding?.texto_login_titulo || ' '}
                  </div>
                )}
              </div>

              {/* Centro — tagline */}
              <div className="space-y-4">
                <p className="text-3xl xl:text-4xl font-light leading-tight drop-shadow max-w-lg">
                  {tagline}
                </p>
                <div className="h-1 w-16 bg-white/60 rounded-full" />
              </div>

              {/* Rodapé — pequena assinatura */}
              <div className="text-xs text-white/70 tracking-wide uppercase">
                {branding?.texto_rodape || ''}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AuthSplitLayout;
