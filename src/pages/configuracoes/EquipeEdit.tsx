import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTeams, useTeam } from "@/hooks/multitenant/useTeams";
import { useTenantContext } from "@/contexts/TenantContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ArrowLeft,
  Save,
  Loader2,
  Users,
  Check,
  ChevronsUpDown,
  UserPlus,
  X,
  Crown,
} from "lucide-react";
import { toast } from "sonner";
import * as LucideIcons from "lucide-react";
import type { MTUser, TeamMember, TeamMemberRole } from "@/types/multitenant";

// Schema de validação
const teamSchema = z.object({
  codigo: z.string().min(2, "Mínimo 2 caracteres").max(50, "Máximo 50 caracteres")
    .regex(/^[a-z0-9_]+$/, "Apenas letras minúsculas, números e underscore"),
  nome: z.string().min(2, "Mínimo 2 caracteres").max(100, "Máximo 100 caracteres"),
  descricao: z.string().max(500, "Máximo 500 caracteres").optional(),
  cor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Cor inválida"),
  icone: z.string().min(1, "Selecione um ícone"),
  lider_id: z.string().optional(),
  scope: z.enum(["tenant", "franchise"]),
});

type TeamFormValues = z.infer<typeof teamSchema>;

// Ícones disponíveis para seleção
const AVAILABLE_ICONS = [
  "Users", "UserPlus", "UserCheck", "Briefcase", "Building2", "Target",
  "Award", "Star", "Zap", "Rocket", "Flag", "Crown",
  "Heart", "Headphones", "Phone", "Mail", "MessageSquare", "Send",
  "DollarSign", "TrendingUp", "BarChart", "PieChart", "Activity", "Gauge",
  "Shield", "Lock", "Key", "Settings", "Wrench", "Cog",
];

// Cores predefinidas
const PRESET_COLORS = [
  "#E91E63", "#9C27B0", "#673AB7", "#3F51B5", "#2196F3", "#03A9F4",
  "#00BCD4", "#009688", "#4CAF50", "#8BC34A", "#CDDC39", "#FFEB3B",
  "#FFC107", "#FF9800", "#FF5722", "#795548", "#607D8B", "#6B7280",
];

function IconPreview({ iconName, className, style }: { iconName: string; className?: string; style?: React.CSSProperties }) {
  const Icon = (LucideIcons as any)[iconName] || Users;
  return <Icon className={className} style={style} />;
}

function RoleBadge({ role }: { role: TeamMemberRole }) {
  const roleConfig: Record<TeamMemberRole, { label: string; className: string }> = {
    lider: { label: "Líder", className: "bg-yellow-50 text-yellow-700 border-yellow-200" },
    sublider: { label: "Sublíder", className: "bg-orange-50 text-orange-700 border-orange-200" },
    membro: { label: "Membro", className: "bg-gray-50 text-gray-700 border-gray-200" },
  };

  const config = roleConfig[role];

  return (
    <Badge variant="outline" className={config.className}>
      {role === "lider" && <Crown className="h-3 w-3 mr-1" />}
      {config.label}
    </Badge>
  );
}

interface MemberWithUser extends TeamMember {
  user?: MTUser;
}

export default function EquipeEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<MTUser[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<MemberWithUser[]>([]);
  const [userSearchOpen, setUserSearchOpen] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const isEditing = !!id;
  const { tenant, franchise, accessLevel } = useTenantContext();
  const { createTeam, updateTeam, addMember, removeMember } = useTeams();
  const { team: existingTeam, members: existingMembers, isLoading } = useTeam(id);

  // Determinar escopo padrão baseado no nível de acesso
  const getDefaultScope = () => {
    if (accessLevel === 'franchise') return 'franchise';
    return 'tenant';
  };

  const form = useForm<TeamFormValues>({
    resolver: zodResolver(teamSchema),
    defaultValues: {
      codigo: "",
      nome: "",
      descricao: "",
      cor: "#3B82F6",
      icone: "Users",
      lider_id: "",
      scope: getDefaultScope(),
    },
  });

  // Carregar usuários disponíveis
  useEffect(() => {
    async function loadUsers() {
      if (!tenant?.id) return;

      setLoadingUsers(true);
      try {
        let query = supabase
          .from('mt_users')
          .select('*')
          .eq('tenant_id', tenant.id)
          .eq('status', 'ativo')
          .order('nome', { ascending: true });

        // Se escopo for franquia, filtrar por franquia
        if (form.watch('scope') === 'franchise' && franchise?.id) {
          // Buscar usuários que têm acesso a esta franquia
          const { data: franchiseUsers } = await supabase
            .from('mt_user_franchises')
            .select('user_id')
            .eq('franchise_id', franchise.id)
            .eq('is_active', true);

          if (franchiseUsers && franchiseUsers.length > 0) {
            const userIds = franchiseUsers.map(fu => fu.user_id);
            query = query.in('id', userIds);
          }
        }

        const { data, error } = await query;

        if (error) throw error;
        setAvailableUsers(data || []);
      } catch (err) {
        console.error('Erro ao carregar usuários:', err);
      } finally {
        setLoadingUsers(false);
      }
    }

    loadUsers();
  }, [tenant?.id, franchise?.id, form.watch('scope')]);

  // Preencher formulário quando carregar equipe existente
  useEffect(() => {
    if (existingTeam && isEditing) {
      const scope = existingTeam.franchise_id ? 'franchise' : 'tenant';

      form.reset({
        codigo: existingTeam.codigo,
        nome: existingTeam.nome,
        descricao: existingTeam.descricao || "",
        cor: existingTeam.cor,
        icone: existingTeam.icone,
        lider_id: existingTeam.lider_id || "",
        scope,
      });
    }
  }, [existingTeam, isEditing, form]);

  // Carregar membros existentes
  useEffect(() => {
    if (existingMembers && isEditing) {
      setSelectedMembers(existingMembers);
    }
  }, [existingMembers, isEditing]);

  const onSubmit = async (values: TeamFormValues) => {
    setIsSaving(true);
    try {
      const teamData = {
        codigo: values.codigo,
        nome: values.nome,
        descricao: values.descricao || null,
        cor: values.cor,
        icone: values.icone,
        lider_id: values.lider_id || null,
        franchise_id: values.scope === 'franchise' ? franchise?.id : null,
      };

      let teamId = id;

      if (isEditing) {
        await updateTeam(id!, teamData);
        toast.success("Equipe atualizada com sucesso");
      } else {
        const newTeam = await createTeam(teamData);
        teamId = newTeam.id;
        toast.success("Equipe criada com sucesso");
      }

      // Sincronizar membros (apenas para equipes existentes ou após criar)
      if (teamId && isEditing) {
        // Remover membros que não estão mais na lista
        const currentMemberIds = existingMembers.map(m => m.user_id);
        const newMemberIds = selectedMembers.map(m => m.user_id);

        for (const memberId of currentMemberIds) {
          if (!newMemberIds.includes(memberId)) {
            await removeMember(teamId, memberId);
          }
        }

        // Adicionar novos membros
        for (const member of selectedMembers) {
          if (!currentMemberIds.includes(member.user_id)) {
            await addMember(teamId, member.user_id, member.role_in_team);
          }
        }
      }

      navigate("/configuracoes/equipes");
    } catch (err: any) {
      console.error(err);
      if (err.message?.includes("duplicate")) {
        toast.error("Já existe uma equipe com este código");
      } else {
        toast.error(isEditing ? "Erro ao atualizar equipe" : "Erro ao criar equipe");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddMember = (user: MTUser) => {
    if (selectedMembers.some(m => m.user_id === user.id)) {
      toast.error("Usuário já é membro da equipe");
      return;
    }

    const newMember: MemberWithUser = {
      id: `temp-${Date.now()}`,
      team_id: id || '',
      user_id: user.id,
      role_in_team: 'membro',
      is_active: true,
      joined_at: new Date().toISOString(),
      user,
    };

    setSelectedMembers([...selectedMembers, newMember]);
    setUserSearchOpen(false);
  };

  const handleRemoveMember = (userId: string) => {
    setSelectedMembers(selectedMembers.filter(m => m.user_id !== userId));
  };

  const handleChangeRole = (userId: string, newRole: TeamMemberRole) => {
    setSelectedMembers(selectedMembers.map(m =>
      m.user_id === userId ? { ...m, role_in_team: newRole } : m
    ));
  };

  if (isLoading && isEditing) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {isEditing ? "Editar Equipe" : "Nova Equipe"}
          </h1>
          <p className="text-muted-foreground">
            {isEditing
              ? "Atualize as informações da equipe"
              : "Preencha as informações para criar uma nova equipe"
            }
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Informações Básicas */}
            <Card>
              <CardHeader>
                <CardTitle>Informações Básicas</CardTitle>
                <CardDescription>
                  Nome, código e descrição da equipe
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="nome"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome *</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Equipe de Vendas" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="codigo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Código *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ex: vendas_norte"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                        />
                      </FormControl>
                      <FormDescription>
                        Identificador único (letras minúsculas, números e _)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="descricao"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrição</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Descreva o objetivo da equipe..."
                          {...field}
                          rows={3}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="scope"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Escopo *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o escopo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {(accessLevel === 'platform' || accessLevel === 'tenant') && (
                            <SelectItem value="tenant">
                              Empresa (disponível para todas franquias)
                            </SelectItem>
                          )}
                          <SelectItem value="franchise">
                            Franquia (apenas esta unidade)
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Define onde esta equipe será visível
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="lider_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Líder da Equipe</FormLabel>
                      <Select
                        onValueChange={(v) => field.onChange(v === "__none__" ? "" : v)}
                        value={field.value || "__none__"}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o líder (opcional)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__none__">Nenhum líder</SelectItem>
                          {availableUsers.map((user) => (
                            <SelectItem key={user.id} value={user.id}>
                              <div className="flex items-center gap-2">
                                <Avatar className="h-5 w-5">
                                  <AvatarImage src={user.avatar_url} />
                                  <AvatarFallback className="text-xs">
                                    {user.nome?.charAt(0).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                {user.nome}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        O líder terá permissões especiais na equipe
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Visual */}
            <Card>
              <CardHeader>
                <CardTitle>Aparência</CardTitle>
                <CardDescription>
                  Cor e ícone da equipe
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="cor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cor</FormLabel>
                      <FormControl>
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <div
                              className="h-10 w-10 rounded-lg border"
                              style={{ backgroundColor: field.value }}
                            />
                            <Input
                              type="text"
                              placeholder="#000000"
                              {...field}
                              className="flex-1"
                            />
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {PRESET_COLORS.map((color) => (
                              <button
                                key={color}
                                type="button"
                                className={`h-6 w-6 rounded border-2 transition-all ${
                                  field.value === color ? 'border-foreground scale-110' : 'border-transparent'
                                }`}
                                style={{ backgroundColor: color }}
                                onClick={() => field.onChange(color)}
                              />
                            ))}
                          </div>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="icone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ícone</FormLabel>
                      <FormControl>
                        <div className="space-y-3">
                          <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/50">
                            <div
                              className="h-10 w-10 rounded-lg flex items-center justify-center"
                              style={{ backgroundColor: form.watch('cor') + '20' }}
                            >
                              <IconPreview
                                iconName={field.value}
                                className="h-5 w-5"
                                style={{ color: form.watch('cor') }}
                              />
                            </div>
                            <span className="text-sm font-medium">{field.value}</span>
                          </div>
                          <div className="grid grid-cols-6 gap-2">
                            {AVAILABLE_ICONS.map((iconName) => (
                              <button
                                key={iconName}
                                type="button"
                                className={`h-10 w-10 rounded-lg border-2 flex items-center justify-center transition-all ${
                                  field.value === iconName
                                    ? 'border-primary bg-primary/10'
                                    : 'border-transparent hover:border-muted-foreground/30'
                                }`}
                                onClick={() => field.onChange(iconName)}
                                title={iconName}
                              >
                                <IconPreview iconName={iconName} className="h-5 w-5" />
                              </button>
                            ))}
                          </div>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </div>

          {/* Membros (apenas na edição) */}
          {isEditing && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Membros da Equipe
                </CardTitle>
                <CardDescription>
                  Adicione ou remova membros da equipe
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Adicionar membro */}
                <div className="flex gap-2">
                  <Popover open={userSearchOpen} onOpenChange={setUserSearchOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={userSearchOpen}
                        className="flex-1 justify-between"
                      >
                        <span className="flex items-center gap-2">
                          <UserPlus className="h-4 w-4" />
                          Adicionar membro
                        </span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Buscar usuário..." />
                        <CommandList>
                          <CommandEmpty>
                            {loadingUsers ? "Carregando..." : "Nenhum usuário encontrado"}
                          </CommandEmpty>
                          <CommandGroup>
                            {availableUsers
                              .filter(u => !selectedMembers.some(m => m.user_id === u.id))
                              .map((user) => (
                                <CommandItem
                                  key={user.id}
                                  value={user.nome}
                                  onSelect={() => handleAddMember(user)}
                                >
                                  <div className="flex items-center gap-2">
                                    <Avatar className="h-6 w-6">
                                      <AvatarImage src={user.avatar_url} />
                                      <AvatarFallback className="text-xs">
                                        {user.nome?.charAt(0).toUpperCase()}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div>
                                      <p className="font-medium">{user.nome}</p>
                                      <p className="text-xs text-muted-foreground">
                                        {user.email}
                                      </p>
                                    </div>
                                  </div>
                                </CommandItem>
                              ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Lista de membros */}
                {selectedMembers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                    <Users className="h-12 w-12 mb-2 opacity-50" />
                    <p>Nenhum membro adicionado</p>
                    <p className="text-sm">
                      Use o botão acima para adicionar membros
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedMembers.map((member) => (
                      <div
                        key={member.user_id}
                        className="flex items-center gap-3 p-3 rounded-lg border bg-card"
                      >
                        <Avatar>
                          <AvatarImage src={member.user?.avatar_url} />
                          <AvatarFallback>
                            {member.user?.nome?.charAt(0).toUpperCase() || "?"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">
                            {member.user?.nome || "Usuário"}
                          </p>
                          <p className="text-sm text-muted-foreground truncate">
                            {member.user?.email}
                          </p>
                        </div>
                        <Select
                          value={member.role_in_team}
                          onValueChange={(value: TeamMemberRole) =>
                            handleChangeRole(member.user_id, value)
                          }
                        >
                          <SelectTrigger className="w-[130px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="membro">Membro</SelectItem>
                            <SelectItem value="sublider">Sublíder</SelectItem>
                            <SelectItem value="lider">Líder</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveMember(member.user_id)}
                        >
                          <X className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Botões */}
          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(-1)}
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {isEditing ? "Salvar Alterações" : "Criar Equipe"}
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
