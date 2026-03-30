import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  UserPlus,
  ExternalLink,
  Phone,
  Mail,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { IndicacaoHistorico as TIndicacaoHistorico } from "@/types/indicacao";
import { INDICACAO_STATUS_LABELS, INDICACAO_STATUS_COLORS } from "@/types/indicacao";
import { safeGetInitials } from "@/utils/unicodeSanitizer";

interface IndicacaoHistoricoProps {
  indicacoes: TIndicacaoHistorico[];
  isLoading?: boolean;
  title?: string;
  description?: string;
  showIndicador?: boolean;
  className?: string;
}

export function IndicacaoHistorico({
  indicacoes,
  isLoading,
  title = "Historico de Indicacoes",
  description = "Pessoas indicadas por este lead",
  showIndicador = false,
  className,
}: IndicacaoHistoricoProps) {
  const navigate = useNavigate();

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "convertido":
        return <CheckCircle className="h-4 w-4 text-emerald-500" />;
      case "perdido":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-amber-500" />;
    }
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
                <Skeleton className="h-6 w-20" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="h-5 w-5 text-primary" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {indicacoes.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <UserPlus className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhuma indicacao encontrada</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {showIndicador && <TableHead>Indicador</TableHead>}
                  <TableHead>Indicado</TableHead>
                  <TableHead>Campanha</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Acoes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {indicacoes.map((indicacao) => (
                  <TableRow key={indicacao.id}>
                    {/* Indicador */}
                    {showIndicador && (
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs">
                              {safeGetInitials(indicacao.lead_indicador?.nome)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">
                              {indicacao.lead_indicador?.nome || "N/A"}
                            </p>
                            {indicacao.lead_indicador?.whatsapp && (
                              <p className="text-xs text-muted-foreground truncate">
                                {indicacao.lead_indicador.whatsapp}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                    )}

                    {/* Indicado */}
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs">
                            {safeGetInitials(indicacao.lead_indicado?.nome)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">
                            {indicacao.lead_indicado?.nome || "N/A"}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {indicacao.lead_indicado?.email && (
                              <span className="flex items-center gap-1 truncate">
                                <Mail className="h-3 w-3" />
                                {indicacao.lead_indicado.email}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </TableCell>

                    {/* Campanha */}
                    <TableCell>
                      {indicacao.campanha ? (
                        <Badge variant="outline" className="text-xs">
                          {indicacao.campanha}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>

                    {/* Data */}
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {indicacao.data_indicacao
                          ? new Date(indicacao.data_indicacao).toLocaleDateString("pt-BR")
                          : "-"}
                      </div>
                      {indicacao.data_conversao && (
                        <div className="flex items-center gap-1 text-xs text-emerald-600 mt-1">
                          <CheckCircle className="h-3 w-3" />
                          Convertido em{" "}
                          {new Date(indicacao.data_conversao).toLocaleDateString("pt-BR")}
                        </div>
                      )}
                    </TableCell>

                    {/* Status */}
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(indicacao.status)}
                        <Badge
                          variant="outline"
                          className={`text-xs ${
                            INDICACAO_STATUS_COLORS[indicacao.status as keyof typeof INDICACAO_STATUS_COLORS] ||
                            "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {INDICACAO_STATUS_LABELS[indicacao.status as keyof typeof INDICACAO_STATUS_LABELS] ||
                            indicacao.status}
                        </Badge>
                      </div>
                    </TableCell>

                    {/* Acoes */}
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {indicacao.lead_indicado?.whatsapp && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() =>
                              window.open(
                                `https://wa.me/${indicacao.lead_indicado!.whatsapp!.replace(/\D/g, "")}`,
                                "_blank"
                              )
                            }
                          >
                            <Phone className="h-4 w-4 text-green-500" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => navigate(`/leads/${indicacao.lead_indicado_id}`)}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
