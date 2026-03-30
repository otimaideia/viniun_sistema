import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Plus, MoreVertical, Edit, Trash2, Users, Building2,
  Pause, Play, XCircle, Briefcase, Search, Eye,
} from "lucide-react";
import { useVagasMT } from "@/hooks/multitenant/useVagasMT";
import { VAGA_STATUS_CONFIG, VAGA_STATUS_OPTIONS, VagaStatus } from "@/types/recrutamento";
import { cn } from "@/lib/utils";

export function VagasTab() {
  const navigate = useNavigate();
  const { vagas, isLoading, updateVaga, deleteVaga } = useVagasMT();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const filteredVagas = vagas.filter((v) => {
    const matchSearch =
      v.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (v.departamento || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = filterStatus === "all" || v.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const handleStatusChange = (id: string, status: VagaStatus) => {
    updateVaga.mutate({ id, status });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            Vagas ({vagas.length})
          </CardTitle>
          <Button onClick={() => navigate("/recrutamento/vagas/nova")}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Vaga
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mt-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por título ou departamento..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              {VAGA_STATUS_OPTIONS.map((s) => (
                <SelectItem key={s} value={s}>{VAGA_STATUS_CONFIG[s].label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
        ) : filteredVagas.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Briefcase className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="font-medium">Nenhuma vaga encontrada</p>
            <p className="text-sm">Clique em "Nova Vaga" para criar</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Unidade</TableHead>
                  <TableHead>Departamento</TableHead>
                  <TableHead>Modalidade</TableHead>
                  <TableHead>Candidatos</TableHead>
                  <TableHead>Vagas</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[50px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVagas.map((vaga) => {
                  const statusConfig = VAGA_STATUS_CONFIG[vaga.status] || { label: vaga.status, bg: 'bg-slate-100', color: 'text-slate-600' };
                  return (
                    <TableRow
                      key={vaga.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`/recrutamento/vagas/${vaga.id}`)}
                    >
                      <TableCell>
                        <p className="font-medium">{vaga.titulo}</p>
                        {vaga.tipo_contrato && (
                          <p className="text-xs text-muted-foreground">{vaga.tipo_contrato}</p>
                        )}
                      </TableCell>
                      <TableCell>
                        {vaga.franchise ? (
                          <span className="flex items-center gap-1 text-sm">
                            <Building2 className="h-3 w-3" />
                            {vaga.franchise.nome_fantasia}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">{vaga.departamento || "-"}</TableCell>
                      <TableCell className="text-sm">{vaga.modalidade || "-"}</TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1 text-sm">
                          <Users className="h-3 w-3" />
                          {vaga.total_candidatos || 0}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm">
                        {vaga.vagas_preenchidas || 0}/{vaga.quantidade_vagas || 1}
                      </TableCell>
                      <TableCell>
                        <Badge className={cn("border text-xs", statusConfig.bg, statusConfig.color)}>
                          {statusConfig.label}
                        </Badge>
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => navigate(`/recrutamento/vagas/${vaga.id}`)}>
                              <Eye className="h-4 w-4 mr-2" /> Ver
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => navigate(`/recrutamento/vagas/${vaga.id}/editar`)}>
                              <Edit className="h-4 w-4 mr-2" /> Editar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {(vaga.status === "rascunho" || vaga.status === "pausada") && (
                              <DropdownMenuItem onClick={() => handleStatusChange(vaga.id, "aberta")}>
                                <Play className="h-4 w-4 mr-2 text-emerald-600" /> Publicar
                              </DropdownMenuItem>
                            )}
                            {vaga.status === "aberta" && (
                              <DropdownMenuItem onClick={() => handleStatusChange(vaga.id, "pausada")}>
                                <Pause className="h-4 w-4 mr-2 text-amber-600" /> Pausar
                              </DropdownMenuItem>
                            )}
                            {vaga.status !== "encerrada" && (
                              <DropdownMenuItem onClick={() => handleStatusChange(vaga.id, "encerrada")}>
                                <XCircle className="h-4 w-4 mr-2 text-slate-600" /> Encerrar
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => deleteVaga.mutate(vaga.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" /> Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
