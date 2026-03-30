import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Star, ArrowRight } from "lucide-react";

interface ServiceCardProps {
  service: {
    id: string;
    nome: string;
    nome_curto?: string | null;
    descricao_curta?: string | null;
    imagem_url?: string | null;
    preco?: number | null;
    preco_promocional?: number | null;
    custo_pix?: number | null;
    tamanho_area?: string | null;
    area_corporal?: string | null;
    sessoes_protocolo?: number | null;
    equipamento?: string | null;
    genero?: string | null;
    url_slug?: string | null;
    categoria?: string | null;
    destaque?: boolean;
  };
  categorySlug?: string;
  basePath?: string;
}

const formatCurrency = (value: number): string =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);

const AREA_SIZE_CONFIG: Record<string, { label: string; color: string }> = {
  P: { label: "P", color: "bg-emerald-500 text-white" },
  M: { label: "M", color: "bg-amber-500 text-white" },
  G: { label: "G", color: "bg-red-500 text-white" },
};

function getLowestPrice(service: ServiceCardProps["service"]): {
  value: number;
  label: string;
  originalPrice?: number;
  discountPercent?: number;
} | null {
  const prices: { value: number; label: string }[] = [];

  if (service.custo_pix && service.custo_pix > 0) {
    prices.push({ value: service.custo_pix, label: "no PIX" });
  }
  if (service.preco_promocional && service.preco_promocional > 0) {
    prices.push({ value: service.preco_promocional, label: "promocional" });
  }
  if (service.preco && service.preco > 0) {
    prices.push({ value: service.preco, label: "" });
  }

  if (prices.length === 0) return null;

  prices.sort((a, b) => a.value - b.value);
  const lowest = prices[0];

  let originalPrice: number | undefined;
  let discountPercent: number | undefined;

  if (service.preco && service.preco > 0 && lowest.value < service.preco) {
    originalPrice = service.preco;
    discountPercent = Math.round(
      ((service.preco - lowest.value) / service.preco) * 100
    );
  }

  return { ...lowest, originalPrice, discountPercent };
}

export function ServiceCard({
  service,
  categorySlug,
  basePath,
}: ServiceCardProps) {
  const displayName = service.nome_curto || service.nome;
  const areaSize = service.tamanho_area
    ? AREA_SIZE_CONFIG[service.tamanho_area.toUpperCase()]
    : null;
  const pricing = getLowestPrice(service);

  const detailUrl = basePath
    ? `${basePath}/${service.url_slug || service.id}`
    : categorySlug
      ? `/novosite/${categorySlug}/${service.url_slug || service.id}`
      : `/novosite/servico/${service.url_slug || service.id}`;

  return (
    <Card className="group overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1 border-0 shadow-md">
      {/* Image */}
      <Link to={detailUrl} className="block relative aspect-[4/3] overflow-hidden">
        {service.imagem_url ? (
          <img
            src={service.imagem_url}
            alt={displayName}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-purple-400 via-purple-500 to-purple-600 flex items-center justify-center">
            <span className="text-white/60 text-5xl font-light">
              {displayName.charAt(0)}
            </span>
          </div>
        )}

        {/* Area size badge */}
        {areaSize && (
          <span
            className={cn(
              "absolute top-3 left-3 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-md",
              areaSize.color
            )}
          >
            {areaSize.label}
          </span>
        )}

        {/* Destaque badge */}
        {service.destaque && (
          <Badge className="absolute top-3 right-3 bg-amber-500 hover:bg-amber-500 text-white shadow-md gap-1">
            <Star className="w-3 h-3 fill-current" />
            Destaque
          </Badge>
        )}

        {/* Discount badge */}
        {pricing?.discountPercent && pricing.discountPercent > 0 && (
          <Badge className="absolute bottom-3 right-3 bg-emerald-600 hover:bg-emerald-600 text-white shadow-md text-xs">
            -{pricing.discountPercent}% OFF
          </Badge>
        )}
      </Link>

      {/* Content */}
      <div className="p-4 space-y-2">
        <div>
          <h3 className="font-semibold text-sm leading-tight line-clamp-2 text-foreground group-hover:text-primary transition-colors">
            {displayName}
          </h3>

          {service.equipamento && (
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {service.equipamento}
            </p>
          )}
        </div>

        {service.sessoes_protocolo && service.sessoes_protocolo > 0 && (
          <p className="text-xs text-muted-foreground">
            {service.sessoes_protocolo} sess{service.sessoes_protocolo === 1 ? "ao" : "oes"} no protocolo
          </p>
        )}

        {service.descricao_curta && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {service.descricao_curta}
          </p>
        )}

        {/* Pricing */}
        {pricing ? (
          <div className="pt-1 space-y-0.5">
            {pricing.originalPrice && (
              <p className="text-xs text-muted-foreground line-through">
                {formatCurrency(pricing.originalPrice)}
              </p>
            )}
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-bold text-primary">
                {formatCurrency(pricing.value)}
              </span>
              {pricing.label && (
                <span className="text-[11px] text-muted-foreground">
                  {pricing.label}
                </span>
              )}
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground italic pt-1">
            Consulte valores
          </p>
        )}

        {/* CTA */}
        <Link
          to={detailUrl}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors pt-1"
        >
          Ver detalhes
          <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </Card>
  );
}
