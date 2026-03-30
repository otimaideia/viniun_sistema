import { Link } from "react-router-dom";
import { useProcedureConsumptionsMT } from "@/hooks/multitenant/useEstoqueMT";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Syringe, Loader2 } from "lucide-react";

const formatCurrency = (value: number | null) =>
  value != null
    ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value)
    : "-";

const formatDateTime = (date: string) =>
  new Date(date).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

export default function EstoqueConsumos() {
  // Fetch all consumptions (no appointmentId filter = all)
  const { consumptions, isLoading } = useProcedureConsumptionsMT();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
          <Link to="/estoque" className="hover:text-foreground">
            Estoque
          </Link>
          <span>/</span>
          <span>Consumos</span>
        </div>
        <h1 className="text-2xl font-bold">Consumos por Procedimento</h1>
        <p className="text-muted-foreground">
          Registro de insumos consumidos em atendimentos
        </p>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Syringe className="h-5 w-5" />
            {consumptions.length} consumo{consumptions.length !== 1 ? "s" : ""}{" "}
            registrado{consumptions.length !== 1 ? "s" : ""}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : consumptions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Syringe className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">Nenhum consumo registrado</p>
              <p className="text-sm mt-1">
                Os consumos sao registrados durante os atendimentos
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead className="text-right">Quantidade</TableHead>
                  <TableHead className="text-right">Custo Unit.</TableHead>
                  <TableHead className="text-right">Custo Total</TableHead>
                  <TableHead>Agendamento</TableHead>
                  <TableHead>Observacoes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {consumptions.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="text-sm whitespace-nowrap">
                      {formatDateTime(c.created_at)}
                    </TableCell>
                    <TableCell>
                      {c.product ? (
                        <Link
                          to={`/estoque/insumos/${c.product.id}`}
                          className="hover:underline font-medium"
                        >
                          {c.product.nome}
                        </Link>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {c.quantidade}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(c.custo_unitario)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(c.custo_total)}
                    </TableCell>
                    <TableCell>
                      {c.appointment_id ? (
                        <Link
                          to={`/agendamentos/${c.appointment_id}`}
                          className="text-sm hover:underline text-primary"
                        >
                          Ver agendamento
                        </Link>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                      {c.observacoes || "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
