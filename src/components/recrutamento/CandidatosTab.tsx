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
  Plus, MoreVertical, Edit, Trash2, Search, Phone, Mail,
  Briefcase, UserCheck, Calendar, CheckCircle2, XCircle, Eye,
  MessageCircle, Star,
} from "lucide-react";
import { useCandidatosMT } from "@/hooks/multitenant/useCandidatosMT";
import { useVagasMT } from "@/hooks/multitenant/useVagasMT";
import {
  CANDIDATO_STATUS_CONFIG, CANDIDATO_STATUS_OPTIONS,
  getProfileCompleteness, getCompletenessColor, formatWhatsAppUrl,
} from "@/types/recrutamento";
import { cn } from "@/lib/utils";

export function CandidatosTab() {
  const navigate = useNavigate();
  const { candidatos, isLoading, updateCandidato, deleteCandidato } = useCandidatosMT();
  const { vagas } = useVagasMT();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterVaga, setFilterVaga] = useState<string>("all");

  const filteredCandidatos = candidatos.filter((c) => {
    const matchSearch =
      c.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.email || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.telefone || "").includes(searchTerm) ||
      (c.whatsapp || "").includes(searchTerm);
    const matchStatus = filterStatus === "all" || c.status === filterStatus;
    const matchVaga = filterVaga === "all" || c.position_id === filterVaga;
    return matchSearch && matchStatus && matchVaga;
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            Candidatos ({candidatos.length})
          </CardTitle>
          <Button onClick={() => navigate("/recrutamento/candidatos/novo")}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Candidato
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mt-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, email, telefone ou WhatsApp..."
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
              {CANDIDATO_STATUS_OPTIONS.map((s) => (
                <SelectItem key={s} value={s}>{CANDIDATO_STATUS_CONFIG[s].label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterVaga} onValueChange={setFilterVaga}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Vaga" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as vagas</SelectItem>
              {vagas.map((v) => (
                <SelectItem key={v.id} value={v.id}>{v.titulo}</SelectItem>
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
        ) : filteredCandidatos.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <UserCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="font-medium">Nenhum candidato encontrado</p>
            <p className="text-sm">Clique em "Novo Candidato" para cadastrar</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Vaga</TableHead>
                  <TableHead>Cidade</TableHead>
                  <TableHead>Perfil</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[50px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCandidatos.map((candidato) => {
                  const statusConfig = CANDIDATO_STATUS_CONFIG[candidato.status];
                  const completeness = getProfileCompleteness(candidato);
                  const completenessColor = getCompletenessColor(completeness);
                  const whatsappUrl = formatWhatsAppUrl(candidato.whatsapp || candidato.telefone);

                  return (
                    <TableRow
                      key={candidato.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`/recrutamento/candidatos/${candidato.id}`)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold shrink-0">
                            {candidato.nome.charAt(0).toUpperCase()}
                          </div>
                          <p className="font-medium">{candidato.nome}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-0.5 text-sm">
                          {candidato.telefone && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" /> {candidato.telefone}
                            </span>
                          )}
                          {candidato.email && (
                            <span className="flex items-center gap-1 text-muted-foreground">
                              <Mail className="h-3 w-3" /> {candidato.email}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {candidato.position ? (
                          <span className="flex items-center gap-1 text-sm">
                            <Briefcase className="h-3 w-3" />
                            {candidato.position.titulo}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {candidato.cidade ? `${candidato.cidade}/${candidato.estado || ""}` : "-"}
                      </TableCell>
                      <TableCell>
                        <Badge className={cn("border text-xs", completenessColor.bg, completenessColor.color)}>
                          {completeness}%
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {candidato.rating ? (
                          <span className="flex items-center gap-0.5 text-sm">
                            <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                            {candidato.rating}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
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
                            <DropdownMenuItem onClick={() => navigate(`/recrutamento/candidatos/${candidato.id}`)}>
                              <Eye className="h-4 w-4 mr-2" /> Ver
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => navigate(`/recrutamento/candidatos/${candidato.id}/editar`)}>
                              <Edit className="h-4 w-4 mr-2" /> Editar
                            </DropdownMenuItem>
                            {whatsappUrl && (
                              <DropdownMenuItem asChild>
                                <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                                  <MessageCircle className="h-4 w-4 mr-2 text-green-600" /> WhatsApp
                                </a>
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => navigate(`/recrutamento/entrevistas/nova?candidato=${candidato.id}`)}>
                              <Calendar className="h-4 w-4 mr-2 text-purple-600" /> Agendar Entrevista
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => updateCandidato.mutate({ id: candidato.id, status: "aprovado" })}
                              disabled={candidato.status === "aprovado"}
                            >
                              <CheckCircle2 className="h-4 w-4 mr-2 text-emerald-600" /> Aprovar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => updateCandidato.mutate({ id: candidato.id, status: "reprovado" })}
                              disabled={candidato.status === "reprovado"}
                            >
                              <XCircle className="h-4 w-4 mr-2 text-red-600" /> Reprovar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => deleteCandidato.mutate(candidato.id)}
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
