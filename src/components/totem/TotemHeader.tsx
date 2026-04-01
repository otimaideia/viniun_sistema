import { MapPin } from 'lucide-react';
const logoViniun = "/images/logo-viniun.svg";

interface TotemHeaderProps {
  nomeUnidade: string;
  cidade?: string | null;
  estado?: string | null;
}

export function TotemHeader({ nomeUnidade, cidade, estado }: TotemHeaderProps) {
  const localizacao = [cidade, estado].filter(Boolean).join(' - ');

  return (
    <div className="text-center mb-3">
      {/* Logo */}
      <div className="mb-2">
        <div className="bg-white rounded-lg px-4 py-2 inline-block shadow-md">
          <img
            src={logoViniun}
            alt="Viniun"
            className="h-8 md:h-10 mx-auto"
          />
        </div>
      </div>

      {/* Nome da Unidade */}
      <h1 className="text-lg md:text-xl font-bold text-white mb-1">
        {nomeUnidade}
      </h1>

      {/* Localização */}
      {localizacao && (
        <div className="flex items-center justify-center gap-1 text-white/80">
          <MapPin className="h-3 w-3" />
          <span className="text-xs">{localizacao}</span>
        </div>
      )}
    </div>
  );
}
