import { Card, CardContent } from "@/components/ui/card";
import { PropertyStatusBadge } from "./PropertyStatusBadge";
import { BedDouble, Maximize2, MapPin, Home } from "lucide-react";

interface PropertyCardProps {
  property: any;
  onClick?: () => void;
}

function formatCurrency(value: number | null | undefined): string {
  if (!value) return "-";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export function PropertyCard({ property, onClick }: PropertyCardProps) {
  const price = property.valor_venda || property.valor_locacao;
  const tipo = property.mt_property_types?.nome || "";
  const cidade = property.location_cidade?.nome || "";
  const bairro = property.location_bairro?.nome || "";
  // Foto: usa foto_destaque_url ou primeira foto da relação
  const foto = property.foto_destaque_url
    || property.mt_property_photos?.[0]?.url
    || null;

  return (
    <Card
      className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      <div className="relative h-48 bg-muted">
        {foto ? (
          <img
            src={foto}
            alt={property.titulo || "Imóvel"}
            className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Home className="h-12 w-12 text-muted-foreground/40" />
          </div>
        )}
        <div className="absolute top-2 right-2">
          <PropertyStatusBadge situacao={property.situacao || "disponivel"} />
        </div>
        {property.destaque && (
          <div className="absolute top-2 left-2 bg-yellow-500 text-white text-xs px-2 py-0.5 rounded">
            Destaque
          </div>
        )}
      </div>
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center justify-between">
          {property.ref_code && (
            <span className="text-xs text-muted-foreground">Ref: {property.ref_code}</span>
          )}
          <span className="text-xs text-muted-foreground">{tipo}</span>
        </div>
        <h3 className="font-semibold text-sm line-clamp-2">{property.titulo || "-"}</h3>
        {(cidade || bairro) && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" />
            <span>{[bairro, cidade].filter(Boolean).join(", ")}</span>
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
