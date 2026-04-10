import { Badge } from "@/components/ui/badge";

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  disponivel: { label: "Disponível", className: "bg-green-50 text-green-700 border-green-200" },
  vendido: { label: "Vendido", className: "bg-blue-50 text-blue-700 border-blue-200" },
  alugado: { label: "Alugado", className: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  reservado: { label: "Reservado", className: "bg-orange-50 text-orange-700 border-orange-200" },
  inativo: { label: "Inativo", className: "bg-gray-50 text-gray-700 border-gray-200" },
};

interface PropertyStatusBadgeProps {
  situacao: string;
}

export function PropertyStatusBadge({ situacao }: PropertyStatusBadgeProps) {
  const config = STATUS_CONFIG[situacao] || STATUS_CONFIG.inativo;
  return (
    <Badge variant="outline" className={config.className}>
      {config.label}
    </Badge>
  );
}
