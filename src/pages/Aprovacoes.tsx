import { useState } from "react";
import { safeGetInitials } from "@/utils/unicodeSanitizer";
import { useAprovacoesAdapter, UsuarioAprovacao } from "@/hooks/useAprovacoesAdapter";
import { useFranqueadosAdapter } from "@/hooks/useFranqueadosAdapter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Clock,
  CheckCircle2,
  XCircle,
  UserCheck,
  UserX,
  RefreshCw,
  Phone,
  Mail,
  Building2,
  Shield
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const ROLES = [
  { value: "admin", label: "Administrador" },
  { value: "franqueado", label: "Franqueado" },
  { value: "operador", label: "Operador" },
  { value: "visualizador", label: "Visualizador" },
];

const Aprovacoes = () => {
  const {
    pendentes,
    aprovados,
    rejeitados,
    isLoading,
    stats,
    aprovarUsuario,
    rejeitarUsuario,
    reativarUsuario,
    isAprovando,
    isRejeitando,
    isReativando
  } = useAprovacoesAdapter();
  const { franqueados } = useFranqueadosAdapter();

  const [aprovarModal, setAprovarModal] = useState<UsuarioAprovacao | null>(null);
  const [rejeitarModal, setRejeitarModal] = useState<UsuarioAprovacao | null>(null);
  const [selectedRole, setSelectedRole] = useState("operador");
  const [selectedFranqueado, setSelectedFranqueado] = useState<string | undefined>();
  const [motivoRejeicao, setMotivoRejeicao] = useState("");

  const handleAprovar = () => {
    if (!aprovarModal) return;
    aprovarUsuario({
      userId: aprovarModal.id,
      role: selectedRole,
      franqueadoId: selectedFranqueado,
    });
    setAprovarModal(null);
    setSelectedRole("operador");
    setSelectedFranqueado(undefined);
  };

  const handleRejeitar = () => {
    if (!rejeitarModal) return;
    rejeitarUsuario({
      userId: rejeitarModal.id,
      motivo: motivoRejeicao || undefined,
    });
    setRejeitarModal(null);
    setMotivoRejeicao("");
  };

  const handleReativar = (userId: string) => {
    reativarUsuario(userId);
  };

  const UserCard = ({ user, type }: { user: UsuarioAprovacao; type: "pendente" | "aprovado" | "rejeitado" }) => (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <Avatar className="h-12 w-12">
            <AvatarImage src={user.avatar_url || undefined} />
            <AvatarFallback>{safeGetInitials(user.nome)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h4 className="font-medium truncate">{user.nome}</h4>
                <p className="text-sm text-muted-foreground truncate">{user.email}</p>
              </div>
              {type === "aprovado" && user.role && (
                <Badge variant="outline" className="shrink-0">
                  <Shield className="h-3 w-3 mr-1" />
                  {ROLES.find((r) => r.value === user.role)?.label || user.role}
                </Badge>
              )}
              {type === "rejeitado" && (
                <Badge variant="destructive" className="shrink-0">Rejeitado</Badge>
              )}
            </div>

            <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
              {user.telefone && (
                <span className="flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  {user.telefone}
                </span>
              )}
              {user.franqueado_nome && (
                <span className="flex items-center gap-1">
                  <Building2 className="h-3 w-3" />
                  {user.franqueado_nome}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {format(new Date(user.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
              </span>
            </div>

            {type === "aprovado" && user.aprovado_em && (
              <p className="text-xs text-green-600 mt-2">
                Aprovado em {format(new Date(user.aprovado_em), "dd/MM/yyyy", { locale: ptBR })}
              </p>
            )}

            {type === "rejeitado" && user.motivo_rejeicao && (
              <p className="text-xs text-muted-foreground mt-2 italic">
                Motivo: {user.motivo_rejeicao}
              </p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
          {type === "pendente" && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setRejeitarModal(user)}
                disabled={isRejeitando}
              >
                <UserX className="h-4 w-4 mr-1" />
                Rejeitar
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setAprovarModal(user);
                  setSelectedFranqueado(user.franqueado_id || undefined);
                }}
                disabled={isAprovando}
              >
                <UserCheck className="h-4 w-4 mr-1" />
                Aprovar
              </Button>
            </>
          )}
          {type === "rejeitado" && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleReativar(user.id)}
              disabled={isReativando}
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Reativar
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Pendentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600" />
              <span className="text-xl sm:text-2xl font-bold">{stats.pendentes}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Aprovados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
              <span className="text-xl sm:text-2xl font-bold">{stats.aprovados}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Rejeitados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 sm:h-5 sm:w-5 text-destructive" />
              <span className="text-xl sm:text-2xl font-bold">{stats.rejeitados}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Card with Tabs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">Aprovação de Usuários</CardTitle>
          <p className="text-sm text-muted-foreground">
            Gerencie as solicitações de acesso ao sistema
          </p>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="pendentes">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="pendentes" className="relative">
                Pendentes
                {stats.pendentes > 0 && (
                  <Badge className="ml-2 bg-amber-600">{stats.pendentes}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="aprovados">Aprovados</TabsTrigger>
              <TabsTrigger value="rejeitados">Rejeitados</TabsTrigger>
            </TabsList>

            <TabsContent value="pendentes" className="mt-0">
              {isLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-32 rounded-lg" />
                  ))}
                </div>
              ) : pendentes.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <UserCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma solicitação pendente</p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {pendentes.map((user) => (
                    <UserCard key={user.id} user={user} type="pendente" />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="aprovados" className="mt-0">
              {isLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-32 rounded-lg" />
                  ))}
                </div>
              ) : aprovados.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum usuário aprovado</p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {aprovados.map((user) => (
                    <UserCard key={user.id} user={user} type="aprovado" />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="rejeitados" className="mt-0">
              {isLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-32 rounded-lg" />
                  ))}
                </div>
              ) : rejeitados.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <XCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum usuário rejeitado</p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {rejeitados.map((user) => (
                    <UserCard key={user.id} user={user} type="rejeitado" />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Aprovar Modal */}
      <Dialog open={!!aprovarModal} onOpenChange={() => setAprovarModal(null)}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Aprovar Usuário</DialogTitle>
            <DialogDescription>
              Defina o papel e a franquia do usuário
            </DialogDescription>
          </DialogHeader>
          {aprovarModal && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={aprovarModal.avatar_url || undefined} />
                  <AvatarFallback>{safeGetInitials(aprovarModal.nome)}</AvatarFallback>
                </Avatar>
                <div>
                  <h4 className="font-medium">{aprovarModal.nome}</h4>
                  <p className="text-sm text-muted-foreground">{aprovarModal.email}</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Papel do Usuário *</Label>
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        {role.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="franqueado">Franquia (opcional)</Label>
                <Select
                  value={selectedFranqueado || "none"}
                  onValueChange={(value) => setSelectedFranqueado(value === "none" ? undefined : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma franquia" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma (Acesso Global)</SelectItem>
                    {franqueados.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.nome_fantasia}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAprovarModal(null)}>
              Cancelar
            </Button>
            <Button onClick={handleAprovar} disabled={isAprovando}>
              {isAprovando ? "Aprovando..." : "Aprovar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rejeitar Modal */}
      <Dialog open={!!rejeitarModal} onOpenChange={() => setRejeitarModal(null)}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Rejeitar Usuário</DialogTitle>
            <DialogDescription>
              Você pode informar um motivo para a rejeição
            </DialogDescription>
          </DialogHeader>
          {rejeitarModal && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={rejeitarModal.avatar_url || undefined} />
                  <AvatarFallback>{safeGetInitials(rejeitarModal.nome)}</AvatarFallback>
                </Avatar>
                <div>
                  <h4 className="font-medium">{rejeitarModal.nome}</h4>
                  <p className="text-sm text-muted-foreground">{rejeitarModal.email}</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="motivo">Motivo da Rejeição (opcional)</Label>
                <Textarea
                  id="motivo"
                  value={motivoRejeicao}
                  onChange={(e) => setMotivoRejeicao(e.target.value)}
                  placeholder="Informe o motivo da rejeição..."
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejeitarModal(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejeitar}
              disabled={isRejeitando}
            >
              {isRejeitando ? "Rejeitando..." : "Rejeitar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Aprovacoes;
