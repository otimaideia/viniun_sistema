import { Card, CardContent } from "@/components/ui/card";
import { PropertyStatusBadge } from "./PropertyStatusBadge";
import { BedDouble, Maximize2, MapPin, Home } from "lucide-react";

export interface MTProperty {
  id: string;
  referencia?: string | null;
  titulo: string;
  tipo_nome?: string | null;
  finalidade_nome?: string | null;
  situacao: string;
  valor_venda?: number | null;
  valor_locacao?: number | null;
  area_total?: number | null;
  dormitorios?: number | null;
  cidade?: string | null;
  bairro?: string | null;
  foto_principal_url?: string | null;
  destaque?: boolean;
}

interface PropertyCardProps {
  property: MTProperty;
  onClick?: () => void;
}

function formatCurrency(value: number | null | undefined): string {
  if (!value) return "-";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export function PropertyCard({ property, onClick }: PropertyCardProps) {
  const price = property.valor_venda || property.valor_locacao;

  return (
    <Card
      className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      <div className="relative h-48 bg-muted">
        {property.foto_principal_url ? (
          <img
            src={property.foto_principal_url}
            alt={property.titulo}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Home className="h-12 w-12 text-muted-foreground/40" />
          </div>
        )}
        <div className="absolute top-2 right-2">
          <PropertyStatusBadge situacao={property.situacao} />
        </div>
        {property.destaque && (
          <div className="absolute top-2 left-2 bg-yellow-500 text-white text-xs px-2 py-0.5 rounded">
            Destaque
          </div>
        )}
      </div>
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center justify-between">
          {property.referencia && (
            <span className="text-xs text-muted-foreground">Ref: {property.referencia}</span>
          )}
          <span className="text-xs text-muted-foreground">{property.tipo_nome}</span>
        </div>
        <h3 className="font-semibold text-sm line-clamp-2">{property.titulo}</h3>
        {(property.cidade || property.bairro) && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" />
            <span>
              {[property.bairro, property.cidade].filter(Boolean).join(", ")}
            </span>
          </div>
        )}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {property.dormitorios != null && property.dormitorios > 0 && (
            <span className="flex items-center gap-1">
              <BedDouble className="h-3 w-3" /> {property.dormitorios}
            </span>
          )}
          {property.area_total != null && property.area_total > 0 && (
            <span className="flex items-center gap-1">
              <Maximize2 className="h-3 w-3" /> {property.area_total}m²
            </span>
          )}
        </div>
        <p className="font-bold text-primary text-sm">{formatCurrency(price)}</p>
      </CardContent>
    </Card>
  );
}
