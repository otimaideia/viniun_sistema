// Página de Gerenciamento de Sessões WhatsApp - Estilo POPdents
// Usa wahaClient.createSessionWithSync() que inclui os delays críticos para sincronização

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Smartphone,
  RefreshCw,
  Wifi,
  WifiOff,
  QrCode,
  Trash2,
  Play,
  Square,
  MoreVertical,
  Building2,
  Zap,
  AlertCircle,
  Users,
  Users2,
  Download,
  StopCircle,
  Loader2,
  CheckCircle2,
  User,
  FolderTree,
  UsersRound,
  Pencil,
  Bot,
  Repeat2,
  ArrowRightLeft,
  UserCog,
  Tags,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import {
  ModuleLayout,
  MiniDashboard,
  EmptyState,
  LoadingState,
  DeleteConfirmDialog,
} from "@/components/shared/index";
import { toast } from "sonner";
import { useWhatsAppSessionsAdapter } from "@/hooks/useWhatsAppSessionsAdapter";
import { useWahaConfigAdapter } from "@/hooks/useWahaConfigAdapter";
import { useFranqueadosAdapter } from "@/hooks/useFranqueadosAdapter";
import { useUserProfileAdapter } from "@/hooks/useUserProfileAdapter";
import { useWhatsAppSessionManagerAdapter } from "@/hooks/useWhatsAppSessionManagerAdapter";
import { useUserPermissions } from "@/hooks/multitenant/useUserPermissions";
import { useUsersAdapter } from "@/hooks/useUsersAdapter";
import { useDepartments } from "@/hooks/multitenant/useDepartments";
import { useTeams } from "@/hooks/multitenant/useTeams";
// Auto-preenchimento de departamento/equipe feito diretamente via supabase query
import { wahaClient, type WAHASessionInfo } from "@/services/waha/wahaDirectClient";
import { supabase } from "@/integrations/supabase/client";
import { ImportSessoesModal } from "@/components/whatsapp/ImportSessoesModal";
import { SessionUsersModal } from "@/components/whatsapp/SessionUsersModal";
import { GroupManager } from "@/components/whatsapp/GroupManager";
import { QRCodeModal } from "@/components/whatsapp/QRCodeModal";
import { ReplaceSessionDialog } from "@/components/whatsapp/ReplaceSessionDialog";
import { SessionProfileDialog } from "@/components/whatsapp/SessionProfileDialog";
import { sanitizeObjectForJSON } from "@/utils/unicodeSanitizer";
import type { WhatsAppSessaoInput, WhatsAppSessaoStatus, WhatsAppSessaoTipo } from "@/types/whatsapp-sessao";
import type { MTWhatsAppSession } from "@/types/whatsapp-mt";

// ============================================================
// FUNÇÃO AUXILIAR PARA QR CODE (mantida para conversão de imagem)
// ============================================================

/**
 * Buscar QR Code com autenticação (retorna base64)
 * Mantida separada pois o wrapper retorna JSON, mas precisamos do base64 da imagem
 */
async function fetchQRCodeDirect(
  apiUrl: string,
  apiKey: string,
  sessionName: string
): Promise<string | null> {
  const url = `${apiUrl}/api/${sessionName}/auth/qr`;
  console.log(`[WAHA-Direct] Buscando QR Code: ${url}`);

  try {
    const response = await fetch(url, {
      headers: { 'X-Api-Key': apiKey },
    });

    if (!response.ok) {
      console.error(`[WAHA-Direct] QR Code erro ${response.status}`);
      return null;
    }

    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      const data = await response.json();
      if (data.value) {
        return data.value.startsWith('data:')
          ? data.value
          : `data:image/png;base64,${data.value}`;
      }
    } else if (contentType.includes('image/')) {
      const blob = await response.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
    }

    return null;
  } catch (err) {
    console.error(`[WAHA-Direct] Erro ao buscar QR:`, err);
    return null;
  }
}

// Configuração de status
const statusConfig: Record<WhatsAppSessaoStatus, { label: string; color: string; icon: React.ElementType }> = {
  working: { label: 'Conectado', color: 'bg-green-500', icon: Wifi },
  stopped: { label: 'Desconectado', color: 'bg-gray-500', icon: WifiOff },
  starting: { label: 'Iniciando...', color: 'bg-yellow-500', icon: RefreshCw },
  scan_qr: { label: 'Aguardando QR', color: 'bg-blue-500', icon: QrCode },
  failed: { label: 'Falha', color: 'bg-red-500', icon: WifiOff },
};

// Formatar telefone para exibição
const formatPhoneForDisplay = (phone: string | null): string => {
  if (!phone) return '';
  let cleaned = phone.replace(/@.*$/, '').replace(/\D/g, '');
  if (cleaned.startsWith('55') && cleaned.length >= 12) {
    const ddd = cleaned.slice(2, 4);
    const part1 = cleaned.slice(4, 9);
    const part2 = cleaned.slice(9, 13);
    return `(${ddd}) ${part1}-${part2}`;
  }
  return phone;
};

// Interface de progresso de sincronização
interface SyncProgress {
  isRunning: boolean;
  current: number;
  total: number;
  currentChat: string;
  totalMessages: number; // reproposto: leads criados
}

// Card de Sessão estilo POPdents
const SessionCard: React.FC<{
  session: MTWhatsAppSession;
  franqueadoName?: string;
  responsibleName?: string;
  departmentName?: string;
  teamName?: string;
  onStart: () => void;
  onStop: () => void;
  onQRCode: () => void;
  onDelete: () => void;
  onOpenChat: () => void;
  onConfigureWebhook: () => void;
  onManageUsers: () => void;
  onManageGroups: () => void;
  onSyncConversas: () => void;
  onSyncLabels: () => void;
  onStopSync: () => void;
  onClearData: () => void;
  onEdit: () => void;
  onReplace: () => void;
  onEditProfile?: () => void;
  isLoading?: boolean;
  hasWebhook?: boolean;
  isManager?: boolean;
  isSuperAdmin?: boolean;
  canConfigureWaha?: boolean; // Controla visibilidade do botão de webhook (sempre true agora)
  syncProgress?: SyncProgress;
  isClearingData?: boolean;
  isSyncingLabels?: boolean;
  isBotActive?: boolean;
  isTogglingBot?: boolean;
  onToggleBot?: (active: boolean) => void;
  isDefaultNumber?: boolean;
}> = ({ session, franqueadoName, responsibleName, departmentName, teamName, onStart, onStop, onQRCode, onDelete, onOpenChat, onConfigureWebhook, onManageUsers, onManageGroups, onSyncConversas, onSyncLabels, onStopSync, onClearData, onEdit, onReplace, onEditProfile, isLoading, hasWebhook, isManager, isSuperAdmin, canConfigureWaha, syncProgress, isClearingData, isSyncingLabels, isBotActive, isTogglingBot, onToggleBot, isDefaultNumber }) => {
  const status = statusConfig[session.status] || statusConfig.stopped;
  const StatusIcon = status.icon;

  return (
    <Card className="relative">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Smartphone className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <CardTitle className="text-base">
                {session.nome || session.session_name}
              </CardTitle>
              {formatPhoneForDisplay(session.session_name) && (
                <p className="text-sm text-muted-foreground">
                  {formatPhoneForDisplay(session.session_name)}
                </p>
              )}
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {session.status === 'working' ? (
                <DropdownMenuItem onClick={onStop}>
                  <Square className="mr-2 h-4 w-4" />
                  Desconectar
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={onStart}>
                  <Play className="mr-2 h-4 w-4" />
                  Iniciar
                </DropdownMenuItem>
              )}
              {session.status === 'scan_qr' && (
                <DropdownMenuItem onClick={onQRCode}>
                  <QrCode className="mr-2 h-4 w-4" />
                  Ver QR Code
                </DropdownMenuItem>
              )}
              {isManager && (
                <DropdownMenuItem onClick={onManageUsers}>
                  <Users className="mr-2 h-4 w-4" />
                  Gerenciar Usuários
                </DropdownMenuItem>
              )}
              {session.status === 'working' && (
                <>
                  <DropdownMenuItem onClick={onManageGroups}>
                    <Users2 className="mr-2 h-4 w-4" />
                    Gerenciar Grupos
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onConfigureWebhook}>
                    <Zap className="mr-2 h-4 w-4" />
                    {hasWebhook ? 'Desativar Tempo Real' : 'Ativar Tempo Real'}
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuItem onClick={onEdit}>
                <Pencil className="mr-2 h-4 w-4" />
                Editar Sessão
              </DropdownMenuItem>
              {session.status === 'working' && onEditProfile && (
                <DropdownMenuItem onClick={onEditProfile}>
                  <UserCog className="mr-2 h-4 w-4" />
                  Editar Perfil WhatsApp
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={onReplace} className="text-amber-600">
                <ArrowRightLeft className="mr-2 h-4 w-4" />
                Substituir Sessão
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDelete} className="text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Badge className={status.color}>
              <StatusIcon
                className={`mr-1 h-3 w-3 ${session.status === 'starting' ? 'animate-spin' : ''}`}
              />
              {status.label}
            </Badge>
            {hasWebhook && session.status === 'working' && (
              <Badge variant="outline" className="text-green-600 border-green-600">
                <Zap className="mr-1 h-3 w-3" />
                Tempo Real
              </Badge>
            )}
          </div>
          {isDefaultNumber && (
            <Badge variant="outline" className="text-blue-600 border-blue-600 text-[10px]">
              <Building2 className="mr-1 h-3 w-3" />
              Nº da Unidade
            </Badge>
          )}
        </div>
        {/* Toggle Chatbot IA */}
        {session.status === 'working' && onToggleBot && (
          <div className="mt-2 flex items-center justify-between rounded-lg border p-2">
            <div className="flex items-center gap-2">
              <Bot className={`h-4 w-4 ${isBotActive ? 'text-green-600' : 'text-muted-foreground'}`} />
              <span className="text-sm font-medium">
                Chatbot IA
              </span>
              {isBotActive && (
                <Badge variant="outline" className="text-green-600 border-green-600 text-[10px] px-1.5 py-0">
                  ON
                </Badge>
              )}
            </div>
            <Switch
              checked={isBotActive || false}
              onCheckedChange={onToggleBot}
              disabled={isTogglingBot}
            />
          </div>
        )}
        {/* Informações organizacionais */}
        <div className="mt-2 space-y-1">
          {franqueadoName && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Building2 className="h-3 w-3" />
              {franqueadoName}
            </div>
          )}
          {responsibleName && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <User className="h-3 w-3" />
              Responsável: {responsibleName}
            </div>
          )}
          {departmentName && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <FolderTree className="h-3 w-3" />
              {departmentName}
            </div>
          )}
          {teamName && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <UsersRound className="h-3 w-3" />
              {teamName}
            </div>
          )}
          {(session as any).round_robin_enabled && (
            <div className="flex items-center gap-1 text-xs text-green-600 font-medium">
              <Repeat2 className="h-3 w-3" />
              Round Robin ativo ({(session as any).round_robin_mode === 'team' ? 'Equipe' : 'Departamento'})
            </div>
          )}
        </div>
        {session.updated_at && (
          <p className="mt-1 text-xs text-muted-foreground">
            Último acesso: {new Date(session.updated_at).toLocaleString('pt-BR')}
          </p>
        )}
        {session.status === 'working' && (
          <>
            <Button
              onClick={onOpenChat}
              className="w-full mt-3 bg-green-600 hover:bg-green-700"
            >
              Abrir Chat
            </Button>

            {/* Botão de Sincronização */}
            {syncProgress?.isRunning ? (
              <div className="mt-2 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground truncate max-w-[150px]">
                    {syncProgress.currentChat}
                  </span>
                  <span className="font-medium">
                    {syncProgress.current}/{syncProgress.total}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${syncProgress.total > 0 ? (syncProgress.current / syncProgress.total) * 100 : 0}%` }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {syncProgress.totalMessages > 0 ? `${syncProgress.totalMessages} msgs` : 'Sincronizando...'}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onStopSync}
                    className="h-7 px-2"
                  >
                    <StopCircle className="h-3 w-3 mr-1" />
                    Ocultar
                  </Button>
                </div>
              </div>
            ) : (
              <div className="mt-2 space-y-2">
                <Button
                  variant="outline"
                  onClick={onSyncConversas}
                  className="w-full"
                  disabled={isLoading || isClearingData}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Sincronizar Conversas
                </Button>

                <Button
                  variant="outline"
                  onClick={onSyncLabels}
                  className="w-full"
                  disabled={isLoading || isClearingData || isSyncingLabels}
                >
                  {isSyncingLabels ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Tags className="mr-2 h-4 w-4" />
                  )}
                  {isSyncingLabels ? 'Sincronizando...' : 'Sincronizar Etiquetas'}
                </Button>

                {/* Botão Ativar/Desativar Webhook - VISÍVEL PARA TODAS AS ROLES */}
                <Button
                  variant={hasWebhook ? "outline" : "default"}
                  onClick={onConfigureWebhook}
                  className={`w-full ${hasWebhook
                    ? "border-green-500 text-green-600 hover:bg-green-50"
                    : "bg-purple-600 hover:bg-purple-700"}`}
                  disabled={isLoading || isClearingData}
                >
                  <Zap className="mr-2 h-4 w-4" />
                  {hasWebhook ? "✓ Webhook Ativo" : "Ativar Webhook"}
                </Button>

                {/* Botão Limpar Dados - APENAS para Super Admin */}
                {isSuperAdmin && (
                  <Button
                    variant="destructive"
                    onClick={onClearData}
                    className="w-full"
                    disabled={isLoading || syncProgress?.isRunning || isClearingData}
                  >
                    {isClearingData ? (
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="mr-2 h-4 w-4" />
                    )}
                    {isClearingData ? 'Limpando...' : 'Limpar Dados'}
                  </Button>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default function WhatsAppSessoes() {
  const navigate = useNavigate();
  const { config: wahaConfig, isLoading: loadingConfig } = useWahaConfigAdapter();
  const { isUnidade, unidadeId, canViewAllLeads } = useUserProfileAdapter();
  // Adapter para suporte multi-tenant
  const {
    sessions,
    isLoading,
    createSession,
    updateSession,
    updateStatus: updateStatusAdapter,
    deleteSession,
    refetch
  } = useWhatsAppSessionsAdapter(isUnidade ? unidadeId || undefined : undefined);

  // Mapear status do MT para status do frontend
  const mapMTStatusToFrontend = (mtStatus: string | null): WhatsAppSessaoStatus => {
    const statusMap: Record<string, WhatsAppSessaoStatus> = {
      // Status do banco MT → Status do frontend
      'connected': 'working',      // ← CORREÇÃO: faltava este mapeamento!
      'disconnected': 'stopped',
      'connecting': 'starting',
      'qr_code': 'scan_qr',        // ← Corrigido: era 'scan_qr_code'
      'failed': 'failed',
      // Fallbacks para status que já estão no formato correto
      'working': 'working',
      'stopped': 'stopped',
      'starting': 'starting',
      'scan_qr': 'scan_qr',
      'scan_qr_code': 'scan_qr',
    };
    return statusMap[mtStatus || ''] || 'stopped';
  };

  // Compatibilidade com código existente (incluindo campos organizacionais)
  const sessoes = sessions.map(s => ({
    id: s.id,
    franqueado_id: s.franchise_id,
    nome: s.nome,
    session_name: s.session_name,
    phone_number: s.telefone,
    status: mapMTStatusToFrontend(s.status),
    qr_code: s.qr_code,
    last_sync: s.last_sync_at,
    ativo: s.is_active,
    created_at: s.created_at,
    updated_at: s.updated_at,
    tipo: 'geral' as const,
    // Campos organizacionais MT
    responsible_user_id: s.responsible_user_id,
    department_id: s.department_id,
    team_id: s.team_id,
    is_default: s.is_default ?? false,
    // Round Robin
    round_robin_enabled: (s as any).round_robin_enabled ?? false,
    round_robin_mode: (s as any).round_robin_mode || 'team',
    // Engine WAHA
    engine: s.engine || 'NOWEB',
    // Campos MT obrigatórios para sync de conversas
    tenant_id: s.tenant_id,
    franchise_id: s.franchise_id,
  })) as (WhatsAppSessao & {
    responsible_user_id?: string | null;
    department_id?: string | null;
    team_id?: string | null;
    is_default?: boolean;
    round_robin_enabled?: boolean;
    round_robin_mode?: string;
    engine: string;
    tenant_id: string;
    franchise_id: string | null;
  })[];

  const isCreating = createSession.isPending;
  const isUpdating = updateSession.isPending;

  // Wrapper functions para manter compatibilidade
  const createSessao = (input: {
    franqueado_id?: string;
    nome: string;
    tipo: string;
    session_name: string;
    responsible_user_id?: string;
    department_id?: string;
    team_id?: string;
    engine?: 'NOWEB' | 'GOWS' | 'WEBJS';
  }) => {
    createSession.mutateAsync({
      nome: input.nome,
      session_name: input.session_name,
      franchise_id: input.franqueado_id,
      responsible_user_id: input.responsible_user_id || null,
      department_id: input.department_id || null,
      team_id: input.team_id || null,
      engine: input.engine || 'NOWEB',
    }).catch(console.error);
  };

  const updateSessao = (input: { id: string; nome?: string; ativo?: boolean; webhook_url?: string | null }) => {
    const updates: Record<string, unknown> = { id: input.id };
    if (input.nome !== undefined) updates.nome = input.nome;
    if (input.ativo !== undefined) updates.is_active = input.ativo;
    if ('webhook_url' in input) updates.webhook_url = input.webhook_url;

    updateSession.mutateAsync(updates as any).catch(console.error);
  };

  const updateStatus = (input: { id: string; status: string; qr_code?: string | null }) => {
    updateStatusAdapter.mutateAsync(input).catch(console.error);
  };

  const deleteSessao = (id: string) => {
    deleteSession.mutateAsync(id).catch(console.error);
  };
  const { franqueados, franchise, accessLevel } = useFranqueadosAdapter();
  const { startAutoCheck, stopAutoCheck, isChecking } = useWhatsAppSessionManagerAdapter();

  // Hooks para responsável, departamento e equipe
  // allTenantUsers: true para permitir selecionar qualquer usuário do tenant como responsável
  const { users: allUsers } = useUsersAdapter({ allTenantUsers: true });
  const { departments } = useDepartments();
  const { teams } = useTeams();

  // Permissões dinâmicas do sistema
  const {
    hasPermission,
    isPlatformAdmin,
    isTenantAdmin,
    isFranchiseAdmin,
  } = useUserPermissions();

  // Permissões específicas do módulo WhatsApp
  const canSyncSessions = hasPermission('whatsapp.sessions.sync');
  const canManageWaha = hasPermission('whatsapp.sessions.manage');
  const canDeleteSessions = hasPermission('whatsapp.sessions.delete');
  const canManageUsers = hasPermission('whatsapp.sessions.manage') || isPlatformAdmin || isTenantAdmin;
  const canClearData = isPlatformAdmin; // Apenas platform admin pode limpar dados

  // State
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [replaceDialogOpen, setReplaceDialogOpen] = useState(false);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [profileDialogSession, setProfileDialogSession] = useState<MTWhatsAppSession | null>(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [usersDialogOpen, setUsersDialogOpen] = useState(false);
  const [groupsDialogOpen, setGroupsDialogOpen] = useState(false);
  const [selectedSessao, setSelectedSessao] = useState<WhatsAppSessao | null>(null);
  // Estados para edição
  const [editSessionName, setEditSessionName] = useState('');
  const [editResponsibleId, setEditResponsibleId] = useState<string>('');
  const [editDepartmentId, setEditDepartmentId] = useState<string>('');
  const [editTeamId, setEditTeamId] = useState<string>('');
  const [editDepartmentName, setEditDepartmentName] = useState<string>('');
  const [editTeamName, setEditTeamName] = useState<string>('');
  const [editIsDefault, setEditIsDefault] = useState(false);
  const [editRoundRobinEnabled, setEditRoundRobinEnabled] = useState(false);
  const [editRoundRobinMode, setEditRoundRobinMode] = useState<'team' | 'department' | 'custom'>('team');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [newSessionName, setNewSessionName] = useState('');
  const [newSessionEngine, setNewSessionEngine] = useState<'NOWEB' | 'GOWS'>('NOWEB');
  const [selectedFranqueadoId, setSelectedFranqueadoId] = useState<string>('');
  const [selectedResponsibleId, setSelectedResponsibleId] = useState<string>('');
  const [autoDepartmentId, setAutoDepartmentId] = useState<string>('');
  const [autoTeamId, setAutoTeamId] = useState<string>('');
  const [autoDepartmentName, setAutoDepartmentName] = useState<string>('');
  const [autoTeamName, setAutoTeamName] = useState<string>('');
  const [loadingSessaoId, setLoadingSessaoId] = useState<string | null>(null);

  // Pré-selecionar franquia para franchise admins
  useEffect(() => {
    if (franchise?.id && accessLevel === 'franchise') {
      setSelectedFranqueadoId(franchise.id);
    }
  }, [franchise?.id, accessLevel]);

  // Pré-selecionar engine padrão da configuração WAHA
  useEffect(() => {
    if (wahaConfig?.default_engine) {
      setNewSessionEngine(wahaConfig.default_engine as 'NOWEB' | 'GOWS');
    }
  }, [wahaConfig?.default_engine]);

  // Auto-preencher departamento e equipe quando responsável é selecionado
  useEffect(() => {
    const fetchUserOrgData = async () => {
      if (!selectedResponsibleId) {
        setAutoDepartmentId('');
        setAutoTeamId('');
        setAutoDepartmentName('');
        setAutoTeamName('');
        return;
      }

      try {
        // Buscar departamento primário do usuário
        const { data: userDepts } = await supabase
          .from('mt_user_departments')
          .select(`
            department_id,
            is_primary,
            department:mt_departments(id, nome)
          `)
          .eq('user_id', selectedResponsibleId)
          .eq('is_active', true)
          .order('is_primary', { ascending: false });

        if (userDepts && userDepts.length > 0) {
          const primaryDept = userDepts.find(d => d.is_primary) || userDepts[0];
          setAutoDepartmentId(primaryDept.department_id);
          setAutoDepartmentName((primaryDept.department as { nome?: string })?.nome || '');
        } else {
          setAutoDepartmentId('');
          setAutoDepartmentName('');
        }

        // Buscar equipe do usuário
        const { data: userTeams } = await supabase
          .from('mt_team_members')
          .select(`
            team_id,
            team:mt_teams(id, nome)
          `)
          .eq('user_id', selectedResponsibleId)
          .eq('is_active', true)
          .limit(1);

        if (userTeams && userTeams.length > 0) {
          setAutoTeamId(userTeams[0].team_id);
          setAutoTeamName((userTeams[0].team as { nome?: string })?.nome || '');
        } else {
          setAutoTeamId('');
          setAutoTeamName('');
        }
      } catch (err) {
        console.error('Erro ao buscar dados organizacionais do usuário:', err);
      }
    };

    fetchUserOrgData();
  }, [selectedResponsibleId]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [sessionsToImport, setSessionsToImport] = useState<WAHASessionInfo[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [webhookStatuses, setWebhookStatuses] = useState<Record<string, boolean>>({});

  // Inicializar webhook statuses do BANCO via query explícita
  // (SELECT * pode não incluir webhook_url se PostgREST cache estiver desatualizado)
  const webhookDbInitDone = useRef(false);
  useEffect(() => {
    if (!sessoes || sessoes.length === 0 || webhookDbInitDone.current) return;

    const loadWebhookFromDb = async () => {
      try {
        const sessionIds = sessoes.map(s => s.id);
        const { data } = await supabase
          .from('mt_whatsapp_sessions')
          .select('id, session_name, webhook_url')
          .in('id', sessionIds);

        if (data && data.length > 0) {
          webhookDbInitDone.current = true;
          const statusMap: Record<string, boolean> = {};
          data.forEach((row: { session_name: string; webhook_url: string | null }) => {
            statusMap[row.session_name] = !!row.webhook_url;
          });
          console.log('[Webhook] Status carregado do banco (query explícita):', statusMap);
          setWebhookStatuses(prev => {
            const merged = { ...prev };
            for (const [name, status] of Object.entries(statusMap)) {
              // DB é fonte de verdade na inicialização
              if (status || !(name in merged)) {
                merged[name] = status;
              }
            }
            return merged;
          });
        }
      } catch (err) {
        console.warn('[Webhook] Erro ao carregar webhook_url do banco:', err);
      }
    };

    loadWebhookFromDb();
  }, [sessoes?.length]);

  // Estado de sincronização de conversas por sessão (lido do DB)
  const [syncProgressBySession, setSyncProgressBySession] = useState<Record<string, SyncProgress>>({});
  const syncProgressRef = useRef<Record<string, SyncProgress>>({});

  // Ref para sessões (atualiza sem re-criar o interval)
  const sessoesRef = useRef(sessoes);
  useEffect(() => { sessoesRef.current = sessoes; }, [sessoes]);

  // Ref para controlar chamadas de continuação do sync (evitar duplicatas)
  const syncContinuingRef = useRef<Record<string, boolean>>({});

  // Polling: lê sync_progress do banco a cada 2s e continua sync paginado
  useEffect(() => {
    let isMounted = true;

    // Função para continuar o sync paginado (chama edge function para próximo batch)
    const continueSyncBatch = async (sessionId: string) => {
      if (syncContinuingRef.current[sessionId]) return; // Já está chamando
      syncContinuingRef.current[sessionId] = true;
      try {
        await supabase.functions.invoke("waha-sync", {
          body: { session_id: sessionId },
        });
      } catch {
        // Silencioso - o polling vai detectar o status
      } finally {
        syncContinuingRef.current[sessionId] = false;
      }
    };

    const poll = async () => {
      const currentSessoes = sessoesRef.current;
      if (!isMounted || !currentSessoes?.length) return;
      const sessionIds = currentSessoes.map((s) => s.id);

      try {
        const { data } = await supabase
          .from("mt_whatsapp_sessions")
          .select("id, sync_status, sync_progress")
          .in("id", sessionIds);

        if (!isMounted || !data) return;

        const newProgress: Record<string, SyncProgress> = {};

        for (const s of data) {
          const isRunning = s.sync_status === "syncing";
          const p = s.sync_progress as Record<string, unknown> | null;
          const wasRunning = syncProgressRef.current[s.id]?.isRunning;

          if (isRunning) {
            const msgCount = Number(p?.total_messages) || 0;
            const offset = Number(p?.offset) || 0;
            const total = Number(p?.total) || 0;
            const processed = Number(p?.processed) || 0;
            newProgress[s.id] = {
              isRunning: true,
              current: processed,
              total: total,
              currentChat: msgCount > 0
                ? `${processed}/${total} conversas, ${msgCount} msgs`
                : (total > 0 ? `${processed}/${total} conversas...` : 'Buscando conversas...'),
              totalMessages: msgCount,
            };

            // Se o offset < total E não estamos já continuando, chamar próximo batch
            if (offset > 0 && offset < total && !syncContinuingRef.current[s.id]) {
              continueSyncBatch(s.id);
            }
          } else if (wasRunning) {
            // Sync acabou de concluir — mostrar resultado brevemente
            const leadsCount = Number(p?.leads_created) || 0;
            const processedCount = Number(p?.processed) || 0;
            const msgCount = Number(p?.total_messages) || 0;
            newProgress[s.id] = {
              isRunning: false,
              current: processedCount,
              total: Number(p?.total) || processedCount,
              currentChat: s.sync_status === "error"
                ? `❌ ${(p?.error as string) || "Erro"}`
                : `✅ ${processedCount} conversas, ${msgCount} msgs`,
              totalMessages: msgCount,
            };
            if (s.sync_status === "completed") {
              toast.success(`✅ Sync concluído! ${processedCount} conversas, ${msgCount} msgs, ${leadsCount} leads.`);
            } else if (s.sync_status === "error") {
              toast.error(`Erro na sincronização: ${(p?.error as string) || "Verifique a conexão WAHA"}`);
            }
            // Auto-limpar após 6 segundos
            const sid = s.id;
            setTimeout(() => {
              if (isMounted) {
                setSyncProgressBySession((prev) => { const n = { ...prev }; delete n[sid]; return n; });
                delete syncProgressRef.current[sid];
              }
            }, 6000);
          }
        }

        syncProgressRef.current = { ...newProgress };
        setSyncProgressBySession(newProgress);
      } catch {
        // Ignorar erros de polling
      }
    };

    poll(); // Poll inicial
    const interval = setInterval(poll, 2000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []); // Sem dependências — o interval usa sessoesRef para sempre ter dados atuais
  // Estado para controle de limpeza de dados
  const [clearingDataSessions, setClearingDataSessions] = useState<Record<string, boolean>>({});
  const [syncingLabelsSession, setSyncingLabelsSession] = useState<Record<string, boolean>>({});

  // Estado do Chatbot IA por sessão
  const [botConfigBySession, setBotConfigBySession] = useState<Record<string, { id: string; is_active: boolean }>>({});
  const [togglingBotSession, setTogglingBotSession] = useState<string | null>(null);

  // Carregar configs do bot para todas as sessões do tenant
  useEffect(() => {
    const loadBotConfigs = async () => {
      try {
        const { data, error } = await supabase
          .from('mt_whatsapp_bot_config')
          .select('id, session_id, is_active, tenant_id')
          .order('created_at', { ascending: false });

        if (error) throw error;
        if (!data) return;

        const configMap: Record<string, { id: string; is_active: boolean }> = {};
        // Config global (session_id = null)
        const globalConfig = data.find(c => !c.session_id);
        // Configs por sessão
        data.forEach(c => {
          if (c.session_id) {
            configMap[c.session_id] = { id: c.id, is_active: c.is_active };
          }
        });
        // Para sessões sem config específica, usar config global
        if (globalConfig) {
          sessoes.forEach(s => {
            if (!configMap[s.id]) {
              configMap[s.id] = { id: globalConfig.id, is_active: globalConfig.is_active };
            }
          });
        }
        setBotConfigBySession(configMap);
      } catch (err) {
        console.error('[Bot] Erro ao carregar configs:', err);
      }
    };

    if (sessoes.length > 0) loadBotConfigs();
  }, [sessoes.length]);

  // Toggle bot para uma sessão específica
  const handleToggleBot = async (sessionId: string, active: boolean) => {
    setTogglingBotSession(sessionId);
    try {
      const sessao = sessoes.find(s => s.id === sessionId);
      if (!sessao) throw new Error('Sessão não encontrada');

      // Verificar se já existe config específica para esta sessão
      const { data: existing } = await supabase
        .from('mt_whatsapp_bot_config')
        .select('id')
        .eq('session_id', sessionId)
        .maybeSingle();

      if (existing) {
        // Atualizar config existente
        const { error: updateErr } = await supabase
          .from('mt_whatsapp_bot_config')
          .update({ is_active: active, updated_at: new Date().toISOString() })
          .eq('id', existing.id);
        if (updateErr) throw updateErr;
      } else {
        // Criar config específica para sessão (herda do global)
        const { data: globalConfig } = await supabase
          .from('mt_whatsapp_bot_config')
          .select('*')
          .eq('tenant_id', sessao.tenant_id)
          .is('session_id', null)
          .maybeSingle();

        if (globalConfig) {
          const { id: _id, created_at: _ca, updated_at: _ua, ...rest } = globalConfig;
          const { error: insertErr } = await supabase
            .from('mt_whatsapp_bot_config')
            .insert({
              ...rest,
              session_id: sessionId,
              is_active: active,
            });
          if (insertErr) throw insertErr;
        } else {
          // Sem config global, criar mínima
          const { error: insertErr } = await supabase
            .from('mt_whatsapp_bot_config')
            .insert({
              tenant_id: sessao.tenant_id,
              franchise_id: sessao.franchise_id,
              session_id: sessionId,
              is_active: active,
              auto_respond: true,
            });
          if (insertErr) throw insertErr;
        }
      }

      // Recarregar estado do banco para confirmar persistência
      const { data: confirmed } = await supabase
        .from('mt_whatsapp_bot_config')
        .select('id, is_active')
        .eq('session_id', sessionId)
        .maybeSingle();

      if (confirmed) {
        setBotConfigBySession(prev => ({
          ...prev,
          [sessionId]: { id: confirmed.id, is_active: confirmed.is_active },
        }));
      } else {
        // Fallback: atualizar com valor esperado
        setBotConfigBySession(prev => ({
          ...prev,
          [sessionId]: { id: existing?.id || 'new', is_active: active },
        }));
      }

      toast.success(active ? 'Chatbot IA ativado para esta sessão' : 'Chatbot IA desativado para esta sessão');
    } catch (err: any) {
      toast.error(`Erro ao alterar chatbot: ${err.message}`);
    } finally {
      setTogglingBotSession(null);
    }
  };

  // Estado para QR Code inline (refatorado)
  const [qrCodeBase64, setQrCodeBase64] = useState<string | null>(null);
  const [qrCodeSessionName, setQrCodeSessionName] = useState<string | null>(null);
  const [isLoadingQR, setIsLoadingQR] = useState(false);
  const [isSessionConnected, setIsSessionConnected] = useState(false);
  const qrPollingRef = useRef<NodeJS.Timeout | null>(null);

  const isWahaConfigured = wahaConfig?.enabled && wahaConfig?.api_key;
  const WEBHOOK_URL = "https://supabase-app.yeslaserpraiagrande.com.br/functions/v1/waha-webhook";

  // Criar mapa de franqueados
  const franqueadosMap = useMemo(() => {
    const map = new Map<string, string>();
    franqueados.forEach((f) => {
      map.set(f.id, f.nome_fantasia || f.razao_social || 'Sem nome');
    });
    return map;
  }, [franqueados]);

  // Criar mapa de usuários responsáveis
  const usersMap = useMemo(() => {
    const map = new Map<string, string>();
    allUsers.forEach((u) => {
      map.set(u.id, u.nome || u.email);
    });
    return map;
  }, [allUsers]);

  // Criar mapa de departamentos
  const departmentsMap = useMemo(() => {
    const map = new Map<string, string>();
    departments.forEach((d) => {
      map.set(d.id, d.nome);
    });
    return map;
  }, [departments]);

  // Criar mapa de equipes
  const teamsMap = useMemo(() => {
    const map = new Map<string, string>();
    teams.forEach((t) => {
      map.set(t.id, t.nome);
    });
    return map;
  }, [teams]);

  // Stats para MiniDashboard - igual ao POPdents
  const stats = useMemo(() => {
    const total = sessoes.length;
    const connected = sessoes.filter((s) => s.status === 'working').length;
    const disconnected = sessoes.filter((s) => s.status === 'stopped' || s.status === 'failed').length;
    const pending = sessoes.filter((s) => s.status === 'scan_qr' || s.status === 'starting').length;

    return [
      {
        label: 'Total de Sessões',
        value: total,
        icon: Smartphone,
        color: 'primary' as const,
      },
      {
        label: 'Conectadas',
        value: connected,
        icon: Wifi,
        color: 'success' as const,
      },
      {
        label: 'Desconectadas',
        value: disconnected,
        icon: WifiOff,
        color: 'warning' as const,
      },
      {
        label: 'Aguardando',
        value: pending,
        icon: QrCode,
        color: 'info' as const,
      },
    ];
  }, [sessoes]);

  // Sincronização inicial de status - executa uma vez quando sessões e config estiverem prontas
  const initialSyncDoneRef = useRef(false);
  useEffect(() => {
    const syncInitialStatus = async () => {
      // Verificar se já sincronizou ou se não tem dados necessários
      if (initialSyncDoneRef.current || !isWahaConfigured || sessoes.length === 0 || !wahaConfig?.api_url || !wahaConfig?.api_key) {
        return;
      }

      initialSyncDoneRef.current = true;
      console.log('[WhatsAppSessoes] Sincronizando status inicial com WAHA...');

      try {
        // Verificar status real de cada sessão no WAHA
        for (const sessao of sessoes) {
          try {
            const wahaResult = await wahaClient.getSession(sessao.session_name);
            // Mapear status do WAHA para status do MT (WhatsAppSessionStatus)
            const wahaStatus = wahaResult.status || wahaResult.data?.status;
            const newStatus = wahaStatus === 'WORKING' ? 'working' :
                             wahaStatus === 'CONNECTED' ? 'working' :
                             wahaStatus === 'SCAN_QR_CODE' ? 'scan_qr_code' :
                             wahaStatus === 'STARTING' ? 'connecting' :
                             wahaStatus === 'FAILED' ? 'failed' : 'stopped';

            console.log(`[WhatsAppSessoes] WAHA status para ${sessao.session_name}: ${wahaStatus} -> ${newStatus}`);

            // Só atualiza se o status for diferente
            if (sessao.status !== newStatus) {
              console.log(`[WhatsAppSessoes] Atualizando status de ${sessao.session_name}: ${sessao.status} -> ${newStatus}`);
              await updateStatusAdapter.mutateAsync({ id: sessao.id, status: newStatus });
            }
          } catch (err) {
            // Sessão não existe no WAHA, manter como stopped
            if (sessao.status !== 'stopped') {
              console.log(`[WhatsAppSessoes] Sessão ${sessao.session_name} não encontrada no WAHA, marcando como stopped`);
              await updateStatusAdapter.mutateAsync({ id: sessao.id, status: 'stopped' });
            }
          }
        }

        // Recarregar sessões após sincronização
        await refetch();
      } catch (err) {
        console.error('[WhatsAppSessoes] Erro na sincronização inicial:', err);
      }
    };

    syncInitialStatus();
  }, [isWahaConfigured, sessoes.length, wahaConfig?.api_url, wahaConfig?.api_key]);

  // Auto-check sessions - start once when WAHA is configured (intervalo maior após sync inicial)
  useEffect(() => {
    if (isWahaConfigured && initialSyncDoneRef.current) {
      startAutoCheck(120000); // 2 minutes interval
    }
    return () => stopAutoCheck();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isWahaConfigured]); // Only depend on isWahaConfigured, functions are stable refs

  // Ref para evitar verificações repetidas de webhook
  const webhookCheckRef = useRef<{ checked: Set<string>; inProgress: boolean }>({
    checked: new Set(),
    inProgress: false,
  });

  // Check webhook status via WAHA - usa debounce para esperar todas sessões ficarem 'working'
  // Roda independente das mudanças de connectedSessionNames para evitar race conditions
  const webhookCheckTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isWahaConfigured) return;

    const workingSessions = sessoes.filter(s => s.status === 'working');
    if (workingSessions.length === 0) return;

    // Filtrar sessões que ainda não foram verificadas
    const sessionsToCheck = workingSessions.filter(
      s => !webhookCheckRef.current.checked.has(s.session_name)
    );
    if (sessionsToCheck.length === 0) return;

    // Debounce: aguardar 2s após última mudança para dar tempo de todas as sessões atualizarem
    if (webhookCheckTimerRef.current) {
      clearTimeout(webhookCheckTimerRef.current);
    }

    webhookCheckTimerRef.current = setTimeout(async () => {
      if (webhookCheckRef.current.inProgress) return;
      webhookCheckRef.current.inProgress = true;

      // Re-filtrar (podem ter sido checadas enquanto esperava o debounce)
      const currentWorking = sessoes.filter(s => s.status === 'working');
      const toCheck = currentWorking.filter(
        s => !webhookCheckRef.current.checked.has(s.session_name)
      );

      if (toCheck.length === 0) {
        webhookCheckRef.current.inProgress = false;
        return;
      }

      console.log('[Webhook] Verificando status para', toCheck.length, 'sessões conectadas');

      // Process in batches of 2 with delay
      for (let i = 0; i < toCheck.length; i += 2) {
        const batch = toCheck.slice(i, i + 2);

        const batchResults = await Promise.allSettled(
          batch.map(async (sessao) => {
            try {
              const configResult = await wahaClient.getSessionConfig(sessao.session_name);
              const sessionConfig = configResult.success ? configResult.data : null;

              const config = (sessionConfig as Record<string, unknown>)?.config || sessionConfig;
              const webhooks = (config as { webhooks?: Array<{ url: string }> })?.webhooks || [];

              const hasWebhook = webhooks.some((w: { url: string }) =>
                w.url && (w.url === WEBHOOK_URL || w.url.includes('waha-webhook'))
              );

              webhookCheckRef.current.checked.add(sessao.session_name);
              console.log(`[Webhook] ${sessao.session_name}: ${hasWebhook ? '✓ Ativo' : '✗ Inativo'}`, webhooks.length ? `(${webhooks.length} webhooks)` : '');
              return { name: sessao.session_name, hasWebhook };
            } catch (err) {
              console.warn(`[Webhook] Erro ao verificar ${sessao.session_name}:`, err);
              webhookCheckRef.current.checked.add(sessao.session_name);
              return { name: sessao.session_name, hasWebhook: false };
            }
          })
        );

        // Aplicar status IMEDIATAMENTE após cada batch
        const resolvedResults = batchResults
          .filter((r): r is PromiseFulfilledResult<{ name: string; hasWebhook: boolean }> => r.status === 'fulfilled')
          .map(r => r.value);

        if (resolvedResults.length > 0) {
          setWebhookStatuses(prev => {
            const updated = { ...prev };
            for (const { name, hasWebhook } of resolvedResults) {
              updated[name] = hasWebhook;
            }
            return updated;
          });
        }

        // Delay between batches
        if (i + 2 < toCheck.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      webhookCheckRef.current.inProgress = false;
    }, 2000); // Debounce 2s para esperar todas sessões ficarem 'working'

    return () => {
      if (webhookCheckTimerRef.current) {
        clearTimeout(webhookCheckTimerRef.current);
      }
    };
  }, [isWahaConfigured, sessoes]);

  // Mapear status do WAHA
  const mapWahaStatus = (wahaStatus: string): WhatsAppSessaoStatus => {
    const statusMap: Record<string, WhatsAppSessaoStatus> = {
      'WORKING': 'working',
      'STOPPED': 'stopped',
      'STARTING': 'starting',
      'SCAN_QR_CODE': 'scan_qr',
      'FAILED': 'failed',
    };
    return statusMap[wahaStatus.toUpperCase()] || 'stopped';
  };

  // Handlers
  const handleSyncSessions = async () => {
    if (!isWahaConfigured) {
      toast.error("Configure a integração WAHA primeiro");
      return;
    }

    setIsSyncing(true);
    try {
      const wahaResult = await wahaClient.listSessions();
      if (!wahaResult.success) {
        throw new Error(wahaResult.error || "Erro ao listar sessões do WAHA");
      }
      const wahaSessions = wahaResult.data || [];

      let synced = 0;
      const newSessions: WAHASessionInfo[] = [];

      for (const wahaSession of wahaSessions) {
        const existing = sessoes.find(s => s.session_name === wahaSession.name);

        if (existing) {
          const newStatus = mapWahaStatus(wahaSession.status);
          if (existing.status !== newStatus) {
            console.log(`[Sync] Atualizando ${wahaSession.name}: ${existing.status} → ${newStatus}`);
            try {
              await updateStatusAdapter.mutateAsync({ id: existing.id, status: newStatus });
              synced++;
            } catch (err) {
              console.error(`[Sync] Erro ao atualizar ${wahaSession.name}:`, err);
            }
          }
        } else {
          newSessions.push(wahaSession);
        }
      }

      const wahaNames = wahaSessions.map(s => s.name);
      for (const sessao of sessoes) {
        if (!wahaNames.includes(sessao.session_name)) {
          if (sessao.status !== 'stopped') {
            console.log(`[Sync] Marcando ${sessao.session_name} como stopped (não existe no WAHA)`);
            try {
              await updateStatusAdapter.mutateAsync({ id: sessao.id, status: 'stopped' });
              synced++;
            } catch (err) {
              console.error(`[Sync] Erro ao atualizar ${sessao.session_name}:`, err);
            }
          }
        }
      }

      await refetch();

      if (synced > 0) {
        toast.success(`${synced} sessão(ões) atualizada(s)`);
      }

      if (newSessions.length > 0) {
        setSessionsToImport(newSessions);
        setShowImportModal(true);
      } else if (synced === 0) {
        toast.info("Tudo sincronizado, nenhuma alteração necessária");
      }
    } catch (error) {
      console.error("Erro ao sincronizar sessões:", error);
      toast.error("Erro ao sincronizar com WAHA");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCreateSession = async () => {
    // Para franchise admin, usa franchise.id do contexto; senão, usa selectedFranqueadoId
    const franchiseIdToUse = accessLevel === 'franchise' ? franchise?.id : selectedFranqueadoId;
    if (!newSessionName.trim() || !franchiseIdToUse) return;
    if (!wahaConfig?.api_url || !wahaConfig?.api_key) {
      toast.error("Configuração WAHA não disponível");
      return;
    }

    const apiUrl = wahaConfig.api_url;
    const apiKey = wahaConfig.api_key;

    try {
      const sessionName = newSessionName.trim().toLowerCase().replace(/\s+/g, '_');

      // Engine definido nas Configurações WAHA (Integrações → Engine Padrão)
      const engine = (wahaConfig?.default_engine as 'NOWEB' | 'GOWS' | 'WEBJS') || 'NOWEB';
      console.log(`[Sessão] Usando engine: ${engine} (configurado em Integrações → WAHA)`);

      // ========================================
      // Usar wrapper com delays críticos incluídos
      // ========================================
      const result = await wahaClient.createSessionWithSync(sessionName, engine);

      if (!result.success) {
        throw new Error(result.error || 'Falha ao criar sessão');
      }

      console.log(`[Sessão] Status final:`, {
        name: result.data?.name,
        status: result.data?.status,
      });

      // Salvar no banco com campos organizacionais (auto-preenchidos do responsável)
      createSessao({
        franqueado_id: franchiseIdToUse,
        nome: newSessionName.trim(),
        tipo: 'geral' as WhatsAppSessaoTipo,
        session_name: sessionName,
        responsible_user_id: selectedResponsibleId || undefined,
        department_id: autoDepartmentId || undefined,
        team_id: autoTeamId || undefined,
        engine: engine,
      });

      // Mostrar QR Code inline
      setQrCodeSessionName(sessionName);
      setIsSessionConnected(false);
      setIsLoadingQR(true);

      // Buscar QR Code usando wahaClient (que carrega config direto do banco)
      console.log('[QR Code] Buscando QR Code para sessão:', sessionName);
      const qrResult = await wahaClient.getQRCode(sessionName);

      if (qrResult.success && qrResult.data?.value) {
        const qrValue = qrResult.data.value;
        const qrBase64 = qrValue.startsWith('data:')
          ? qrValue
          : `data:image/png;base64,${qrValue}`;
        setQrCodeBase64(qrBase64);
        console.log('[QR Code] QR Code carregado com sucesso');
      } else {
        console.error('[QR Code] Falha ao buscar QR:', qrResult.error);
        // Tentar novamente com delay (a sessão pode ainda estar inicializando)
        await new Promise(resolve => setTimeout(resolve, 2000));
        const retryResult = await wahaClient.getQRCode(sessionName);
        if (retryResult.success && retryResult.data?.value) {
          const qrValue = retryResult.data.value;
          const qrBase64 = qrValue.startsWith('data:')
            ? qrValue
            : `data:image/png;base64,${qrValue}`;
          setQrCodeBase64(qrBase64);
          console.log('[QR Code] QR Code carregado após retry');
        } else {
          console.error('[QR Code] Falha após retry:', retryResult.error);
        }
      }
      setIsLoadingQR(false);

      // Iniciar polling para verificar quando conectar
      startQRPolling(sessionName);

      toast.success("Sessão criada! Escaneie o QR Code para conectar.");

    } catch (error) {
      console.error("Erro ao criar sessão no WAHA:", error);
      toast.error(`Erro ao criar sessão: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  };

  // Polling para verificar status da sessão durante QR Code (usando wrapper)
  const startQRPolling = useCallback((sessionName: string) => {
    // Limpar polling anterior
    if (qrPollingRef.current) {
      clearInterval(qrPollingRef.current);
    }

    let refreshCount = 0;
    const MAX_REFRESHES = 12; // 2 minutos no máximo

    qrPollingRef.current = setInterval(async () => {
      try {
        // Usar wrapper para verificar status
        const result = await wahaClient.getSession(sessionName);

        if (!result.success) {
          console.error(`[QR-Poll] Erro ao verificar status:`, result.error);
          return;
        }

        const status = result.data?.status;
        console.log(`[QR-Poll] Status: ${status}`);

        if (status === 'WORKING') {
          // Conectado com sucesso!
          console.log(`[QR-Poll] ✅ Sessão conectada!`);
          setIsSessionConnected(true);
          clearInterval(qrPollingRef.current!);
          qrPollingRef.current = null;

          // Tocar som de sucesso
          playSuccessSound();

          // Atualizar status no banco de dados
          try {
            // Buscar sessão pelo session_name para pegar o ID
            const { data: sessaoDb } = await supabase
              .from('mt_whatsapp_sessions')
              .select('id')
              .eq('session_name', sessionName)
              .single();

            if (sessaoDb?.id) {
              console.log(`[QR-Poll] Atualizando status no banco para sessão ${sessaoDb.id}...`);
              await updateStatusAdapter.mutateAsync({ id: sessaoDb.id, status: 'working' });
              console.log(`[QR-Poll] ✅ Status atualizado no banco`);

              // Webhook já foi configurado no createSession (incluído na config inicial)
              // NÃO chamar setWebhook aqui pois causa restart desnecessário
              setWebhookStatuses(prev => ({ ...prev, [sessionName]: true }));
              console.log(`[Webhook] Já configurado na criação da sessão: ${sessionName}`);
            }
          } catch (dbErr) {
            console.error(`[QR-Poll] Erro ao atualizar status no banco:`, dbErr);
          }

          // Fechar dialog após 2s e atualizar lista
          setTimeout(async () => {
            setCreateDialogOpen(false);
            setNewSessionName('');
            setSelectedFranqueadoId('');
            setSelectedResponsibleId('');
            setAutoDepartmentId('');
            setAutoTeamId('');
            setAutoDepartmentName('');
            setAutoTeamName('');
            setQrCodeBase64(null);
            setQrCodeSessionName(null);
            setIsSessionConnected(false);
            await refetch();
          }, 2000);

        } else if (status === 'SCAN_QR_CODE') {
          // Ainda aguardando scan - atualizar QR periodicamente
          refreshCount++;
          if (refreshCount % 3 === 0 && refreshCount < MAX_REFRESHES) {
            console.log(`[QR-Poll] Atualizando QR Code...`);
            // Buscar QR Code usando wahaClient
            const qrResult = await wahaClient.getQRCode(sessionName);
            if (qrResult.success && qrResult.data?.value) {
              const qrValue = qrResult.data.value;
              const qrBase64 = qrValue.startsWith('data:')
                ? qrValue
                : `data:image/png;base64,${qrValue}`;
              setQrCodeBase64(qrBase64);
            }
          }
        } else if (status === 'FAILED' || status === 'STOPPED') {
          console.log(`[QR-Poll] ❌ Sessão falhou: ${status}`);
          clearInterval(qrPollingRef.current!);
          qrPollingRef.current = null;
          toast.error("Sessão falhou. Tente novamente.");
        }
      } catch (err) {
        console.error(`[QR-Poll] Erro:`, err);
      }
    }, 5000); // Check a cada 5s

  }, [refetch, updateStatusAdapter]);

  // Limpar polling ao desmontar
  useEffect(() => {
    return () => {
      if (qrPollingRef.current) {
        clearInterval(qrPollingRef.current);
      }
    };
  }, []);

  // Som de sucesso ao conectar
  const playSuccessSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(1108.73, audioContext.currentTime + 0.1);
      oscillator.frequency.setValueAtTime(1318.51, audioContext.currentTime + 0.2);
      oscillator.type = "sine";
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.05);
      gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.5);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (e) {
      console.log("Não foi possível tocar som:", e);
    }
  };

  const handleStartSession = async (sessao: MTWhatsAppSession) => {
    setLoadingSessaoId(sessao.id);
    try {
      await wahaClient.startSession(sessao.session_name);
      updateStatus({ id: sessao.id, status: "starting" });
      toast.success("Iniciando sessão...");

      setTimeout(async () => {
        try {
          const wahaResult = await wahaClient.getSession(sessao.session_name);
          if (wahaResult.success && wahaResult.data) {
            const newStatus = mapWahaStatus(wahaResult.data.status);
            updateStatus({ id: sessao.id, status: newStatus });

            if (newStatus === "scan_qr") {
              setSelectedSessao({ ...sessao, status: newStatus });
              setShowQRModal(true);
            }
          }
        } catch (e) {
          console.error(e);
        }
        setLoadingSessaoId(null);
      }, 3000);
    } catch (error) {
      console.error("Erro ao iniciar sessão:", error);
      toast.error("Erro ao iniciar sessão");
      setLoadingSessaoId(null);
    }
  };

  const handleStopSession = async (sessao: MTWhatsAppSession) => {
    setLoadingSessaoId(sessao.id);
    try {
      await wahaClient.stopSession(sessao.session_name);
      updateStatus({ id: sessao.id, status: "stopped" });
      toast.success("Sessão parada");
    } catch (error) {
      console.error("Erro ao parar sessão:", error);
      toast.error("Erro ao parar sessão");
    } finally {
      setLoadingSessaoId(null);
    }
  };

  const handleShowQR = (sessao: MTWhatsAppSession) => {
    setSelectedSessao(sessao);
    setShowQRModal(true);
  };

  const handleDeleteClick = (sessao: MTWhatsAppSession) => {
    setSelectedSessao(sessao);
    setDeleteDialogOpen(true);
  };

  const handleReplaceClick = (sessao: MTWhatsAppSession) => {
    setSelectedSessao(sessao);
    setReplaceDialogOpen(true);
  };

  // Handler para abrir dialog de edição
  const handleEditClick = async (sessao: MTWhatsAppSession & {
    responsible_user_id?: string | null;
    department_id?: string | null;
    team_id?: string | null;
    is_default?: boolean;
  }) => {
    setSelectedSessao(sessao);
    setEditSessionName(sessao.nome || sessao.session_name);
    setEditIsDefault(sessao.is_default ?? false);
    setEditDepartmentId(sessao.department_id || '');
    setEditTeamId(sessao.team_id || '');
    setEditRoundRobinEnabled((sessao as any).round_robin_enabled ?? false);
    setEditRoundRobinMode((sessao as any).round_robin_mode || 'team');

    // Buscar nomes do departamento e equipe atuais
    if (sessao.department_id) {
      setEditDepartmentName(departmentsMap.get(sessao.department_id) || '');
    } else {
      setEditDepartmentName('');
    }
    if (sessao.team_id) {
      setEditTeamName(teamsMap.get(sessao.team_id) || '');
    } else {
      setEditTeamName('');
    }

    // Marcar que o dialog acabou de abrir para que o useEffect não limpe team/department
    editDialogJustOpenedRef.current = true;
    setEditResponsibleId(sessao.responsible_user_id || 'none');

    setEditDialogOpen(true);
  };

  // Handler para salvar edição
  const handleEditSave = async () => {
    if (!selectedSessao) return;

    setIsSavingEdit(true);
    try {
      // Atualizar sessão no banco (tratar "none" como null)
      const responsibleId = editResponsibleId && editResponsibleId !== 'none' ? editResponsibleId : null;
      // 🛡️ Sanitizar dados antes de atualizar
      const { error } = await supabase
        .from('mt_whatsapp_sessions')
        .update(sanitizeObjectForJSON({
          nome: editSessionName.trim() || selectedSessao.session_name,
          responsible_user_id: responsibleId,
          is_default: editIsDefault,
          department_id: editDepartmentId || null,
          team_id: editTeamId || null,
          round_robin_enabled: editRoundRobinEnabled,
          round_robin_mode: editRoundRobinEnabled ? editRoundRobinMode : 'team',
          updated_at: new Date().toISOString(),
        }))
        .eq('id', selectedSessao.id);

      if (error) throw error;

      toast.success('Sessão atualizada com sucesso!');
      setEditDialogOpen(false);
      setSelectedSessao(null);
      await refetch();
    } catch (err) {
      console.error('Erro ao atualizar sessão:', err);
      toast.error(`Erro ao atualizar: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Ref para evitar que o useEffect limpe team/department no primeiro render do dialog
  const editDialogJustOpenedRef = useRef(false);

  // Auto-preencher departamento/equipe quando responsável é alterado na edição
  // NÃO deve limpar team/department no carregamento inicial (podem estar salvos para Round Robin)
  useEffect(() => {
    const fetchEditUserOrgData = async () => {
      if (!editDialogOpen) return;

      // Na abertura do dialog, pular auto-preenchimento para preservar valores salvos
      if (editDialogJustOpenedRef.current) {
        editDialogJustOpenedRef.current = false;
        return;
      }

      if (!editResponsibleId || editResponsibleId === 'none') {
        // Responsável removido pelo usuário - limpar APENAS se Round Robin não estiver ativo
        // (com RR ativo, team/department são configurados independentemente do responsável)
        if (!editRoundRobinEnabled) {
          setEditDepartmentId('');
          setEditTeamId('');
          setEditDepartmentName('');
          setEditTeamName('');
        }
        return;
      }

      try {
        // Buscar departamento primário do usuário
        const { data: userDepts } = await supabase
          .from('mt_user_departments')
          .select(`
            department_id,
            is_primary,
            department:mt_departments(id, nome)
          `)
          .eq('user_id', editResponsibleId)
          .eq('is_active', true)
          .order('is_primary', { ascending: false });

        if (userDepts && userDepts.length > 0) {
          const primaryDept = userDepts.find(d => d.is_primary) || userDepts[0];
          setEditDepartmentId(primaryDept.department_id);
          setEditDepartmentName((primaryDept.department as { nome?: string })?.nome || '');
        } else {
          setEditDepartmentId('');
          setEditDepartmentName('');
        }

        // Buscar equipe do usuário
        const { data: userTeams } = await supabase
          .from('mt_team_members')
          .select(`
            team_id,
            team:mt_teams(id, nome)
          `)
          .eq('user_id', editResponsibleId)
          .eq('is_active', true)
          .limit(1);

        if (userTeams && userTeams.length > 0) {
          setEditTeamId(userTeams[0].team_id);
          setEditTeamName((userTeams[0].team as { nome?: string })?.nome || '');
        } else {
          if (!editRoundRobinEnabled) {
            setEditTeamId('');
            setEditTeamName('');
          }
        }
      } catch (err) {
        console.error('Erro ao buscar dados organizacionais do usuário:', err);
      }
    };

    fetchEditUserOrgData();
  }, [editResponsibleId, editDialogOpen, editRoundRobinEnabled]);

  const handleDeleteConfirm = async () => {
    if (!selectedSessao) return;

    try {
      await wahaClient.deleteSession(selectedSessao.session_name);
    } catch {
      console.warn("Sessão não existe no WAHA ou já foi removida");
    }
    deleteSessao(selectedSessao.id);
    setDeleteDialogOpen(false);
    setSelectedSessao(null);
  };

  const handleOpenChat = (sessao: MTWhatsAppSession) => {
    navigate(`/whatsapp/conversas/${sessao.id}`);
  };

  const handleConfigureWebhook = async (sessao: MTWhatsAppSession) => {
    if (!isWahaConfigured) {
      toast.error("Configure a integração WAHA primeiro");
      return;
    }

    setLoadingSessaoId(sessao.id);
    try {
      const configResult = await wahaClient.getSessionConfig(sessao.session_name);
      const sessionConfig = configResult.success ? configResult.data : null;
      const webhooks = (sessionConfig as { config?: { webhooks?: Array<{ url: string }> } })?.config?.webhooks || [];
      const hasOurWebhook = webhooks.some((w: { url: string }) => w.url === WEBHOOK_URL);

      // Helper: gravar log de auditoria para ativação/desativação do webhook
      const logWebhookAudit = async (action: 'webhook_activated' | 'webhook_deactivated') => {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          await supabase.from('mt_audit_logs').insert({
            tenant_id: sessao.tenant_id,
            user_id: user?.id ?? null,
            action,
            resource_type: 'whatsapp_session',
            resource_id: sessao.id,
            resource_name: sessao.session_name,
            new_data: action === 'webhook_activated' ? { webhook_url: WEBHOOK_URL } : { webhook_url: null },
            status: 'success',
          });
        } catch (logErr) {
          console.warn('[Webhook] Erro ao gravar log de auditoria:', logErr);
        }
      };

      if (hasOurWebhook) {
        // Usar removeWebhook que envia webhooks: [] em vez de URL vazia
        // NOTA: removeWebhook internamente aguarda sessão voltar a WORKING
        const result = await wahaClient.removeWebhook(sessao.session_name);
        if (result.success) {
          toast.success("Webhook removido com sucesso");
          setWebhookStatuses(prev => ({ ...prev, [sessao.session_name]: false }));

          // PERSISTIR NO BANCO - remover webhook_url + manter status working
          updateSessao({
            id: sessao.id,
            webhook_url: null,
          });
          // Re-sync status (PUT causa restart temporário)
          await updateStatusAdapter.mutateAsync({ id: sessao.id, status: 'working' });
          await logWebhookAudit('webhook_deactivated');
        } else {
          toast.error(result.error || "Erro ao remover webhook");
        }
      } else {
        // NOTA: setWebhook internamente aguarda sessão voltar a WORKING
        const result = await wahaClient.setWebhook(sessao.session_name, WEBHOOK_URL);
        if (result.success) {
          toast.success("Webhook configurado para tempo real!");
          setWebhookStatuses(prev => ({ ...prev, [sessao.session_name]: true }));

          // PERSISTIR NO BANCO - salvar webhook_url + manter status working
          updateSessao({
            id: sessao.id,
            webhook_url: WEBHOOK_URL,
          });
          // Re-sync status (PUT causa restart temporário)
          await updateStatusAdapter.mutateAsync({ id: sessao.id, status: 'working' });
          await logWebhookAudit('webhook_activated');
        } else {
          toast.error(result.error || "Erro ao configurar webhook");
        }
      }
    } catch (error) {
      console.error("Erro ao configurar webhook:", error);
      toast.error("Erro ao configurar webhook");
    } finally {
      setLoadingSessaoId(null);
    }
  };

  const handleImportSessions = async (sessions: Array<{
    session_name: string;
    nome: string;
    franqueado_id: string;
    tipo: WhatsAppSessaoTipo;
    status: WhatsAppSessaoStatus;
  }>) => {
    setIsImporting(true);
    try {
      let webhooksConfigured = 0;

      for (const session of sessions) {
        // Criar sessão no banco
        createSessao({
          franqueado_id: session.franqueado_id,
          nome: session.nome,
          tipo: session.tipo,
          session_name: session.session_name,
        });

        // Configurar webhook automaticamente se sessão está conectada
        if (session.status === 'working') {
          try {
            const webhookResult = await wahaClient.setWebhook(session.session_name, WEBHOOK_URL);
            if (webhookResult.success) {
              setWebhookStatuses(prev => ({ ...prev, [session.session_name]: true }));
              webhooksConfigured++;
            }
          } catch (err) {
            console.warn(`Webhook não configurado para ${session.session_name}:`, err);
          }
        }
      }

      const webhookMsg = webhooksConfigured > 0 ? ` (${webhooksConfigured} com webhook ativo)` : '';
      toast.success(`${sessions.length} sessão(ões) importada(s) com sucesso!${webhookMsg}`);
      setShowImportModal(false);
      setSessionsToImport([]);

      setTimeout(() => refetch(), 1000);
    } catch (error) {
      console.error("Erro ao importar sessões:", error);
      toast.error("Erro ao importar sessões");
    } finally {
      setIsImporting(false);
    }
  };

  const handleSessaoConnected = async () => {
    if (selectedSessao) {
      console.log(`[Status] Atualizando sessão ${selectedSessao.id} para "working"...`);

      try {
        // Aguardar a atualização do status antes de continuar
        await updateStatusAdapter.mutateAsync({ id: selectedSessao.id, status: "working" });
        console.log(`[Status] ✅ Sessão ${selectedSessao.id} atualizada para "working"`);
      } catch (err) {
        console.error(`[Status] ❌ Erro ao atualizar status:`, err);
        toast.error("Erro ao atualizar status da sessão");
      }

      // Webhook já é configurado na criação da sessão (createSession inclui webhooks)
      // Verificar se já tem webhook configurado no WAHA
      try {
        const configResult = await wahaClient.getSessionConfig(selectedSessao.session_name);
        const sessionConfig = configResult.success ? configResult.data : null;
        const webhooks = (sessionConfig as { config?: { webhooks?: Array<{ url: string }> } })?.config?.webhooks || [];
        const hasWebhook = webhooks.some((w: { url: string }) => w.url && w.url.includes('waha-webhook'));
        if (hasWebhook) {
          setWebhookStatuses(prev => ({ ...prev, [selectedSessao.session_name]: true }));
          console.log(`[Webhook] Já configurado: ${selectedSessao.session_name}`);
        } else {
          console.log(`[Webhook] Não encontrado para ${selectedSessao.session_name}, configurando...`);
          const webhookResult = await wahaClient.setWebhook(selectedSessao.session_name, WEBHOOK_URL);
          if (webhookResult.success) {
            setWebhookStatuses(prev => ({ ...prev, [selectedSessao.session_name]: true }));
            // Re-sync status após restart causado pelo setWebhook
            await updateStatusAdapter.mutateAsync({ id: selectedSessao.id, status: "working" });
          }
        }
      } catch (err) {
        console.warn(`[Webhook] Erro ao verificar/configurar para ${selectedSessao.session_name}:`, err);
      }
    }

    // Recarregar lista após todas as atualizações
    await refetch();
  };

  const handleManageUsersClick = (sessao: MTWhatsAppSession) => {
    setSelectedSessao(sessao);
    setUsersDialogOpen(true);
  };

  const handleManageGroupsClick = (sessao: MTWhatsAppSession) => {
    setSelectedSessao(sessao);
    setGroupsDialogOpen(true);
  };

  // Handler para sincronizar conversas via Edge Function (paginado)
  const handleSyncConversas = async (sessao: MTWhatsAppSession) => {
    if (!isWahaConfigured) {
      toast.error("Configure a integração WAHA primeiro");
      return;
    }

    // Atualização otimista: mostrar progresso imediatamente
    const optimistic: SyncProgress = { isRunning: true, current: 0, total: 0, currentChat: 'Iniciando sincronização...', totalMessages: 0 };
    syncProgressRef.current = { ...syncProgressRef.current, [sessao.id]: optimistic };
    setSyncProgressBySession((prev) => ({ ...prev, [sessao.id]: optimistic }));

    try {
      toast.info("Sincronizando conversas e mensagens...", { duration: 3000 });

      const { data, error } = await supabase.functions.invoke("waha-sync", {
        body: { session_id: sessao.id },
      });

      if (error) {
        const msg = String(error.message || error);
        if (msg.includes("409") || msg.toLowerCase().includes("andamento")) {
          toast.info("Sincronização já está em andamento para esta sessão");
          return;
        }
        throw new Error(msg);
      }

      if (data?.done) {
        // Sync completou em uma única chamada (poucos chats)
        const completed: SyncProgress = {
          isRunning: false,
          current: data.processed || 0,
          total: data.total || 0,
          currentChat: `✅ ${data.processed || 0} conversas, ${data.total_messages || 0} msgs`,
          totalMessages: data.total_messages || 0,
        };
        syncProgressRef.current = { ...syncProgressRef.current, [sessao.id]: completed };
        setSyncProgressBySession((prev) => ({ ...prev, [sessao.id]: completed }));
        const labelsInfo = data.labels_linked ? `, ${data.labels_linked} etiquetas` : '';
        toast.success(`✅ Sync concluído! ${data.processed} conversas, ${data.total_messages || 0} msgs, ${data.leads_created || 0} leads${labelsInfo}.`);
        setTimeout(() => {
          setSyncProgressBySession((prev) => { const n = { ...prev }; delete n[sessao.id]; return n; });
          delete syncProgressRef.current[sessao.id];
        }, 6000);
      }
      // Se não terminou (done=false), o polling vai detectar e chamar continueSyncBatch

    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Erro desconhecido";
      toast.error(`Erro ao sincronizar: ${errMsg}`);
      delete syncProgressRef.current[sessao.id];
      setSyncProgressBySession((prev) => { const n = { ...prev }; delete n[sessao.id]; return n; });
    }
  };

  // Handler para ocultar progresso de sync (sync server-side não pode ser cancelado)
  const handleStopSync = (sessaoId: string) => {
    delete syncProgressRef.current[sessaoId];
    setSyncProgressBySession((prev) => { const n = { ...prev }; delete n[sessaoId]; return n; });
    toast.info("Progresso ocultado. A sincronização continua em segundo plano.");
  };

  // Handler para sincronizar APENAS etiquetas (bidirecional WAHA ↔ banco)
  const handleSyncLabels = async (sessao: MTWhatsAppSession) => {
    if (!isWahaConfigured) {
      toast.error("Configure a integração WAHA primeiro");
      return;
    }

    setSyncingLabelsSession((prev) => ({ ...prev, [sessao.id]: true }));

    try {
      const { data, error } = await supabase.functions.invoke("waha-sync", {
        body: { session_id: sessao.id, labels_only: true },
      });

      if (error) throw new Error(String(error.message || error));

      const count = data?.labels_synced || 0;
      toast.success(`✅ ${count} etiqueta(s) sincronizada(s) com sucesso!`);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Erro desconhecido";
      toast.error(`Erro ao sincronizar etiquetas: ${errMsg}`);
    } finally {
      setSyncingLabelsSession((prev) => { const n = { ...prev }; delete n[sessao.id]; return n; });
    }
  };

  // Handler para limpar dados de uma sessão (APENAS PLATFORM ADMIN)
  const handleClearData = async (sessao: MTWhatsAppSession) => {
    if (!canClearData) {
      toast.error("Você não tem permissão para limpar dados");
      return;
    }

    const confirmed = window.confirm(
      `⚠️ ATENÇÃO!\n\nVocê está prestes a DELETAR TODAS as conversas e mensagens da sessão "${sessao.nome || sessao.session_name}".\n\nEsta ação é IRREVERSÍVEL!\n\nDeseja continuar?`
    );

    if (!confirmed) return;

    setClearingDataSessions(prev => ({ ...prev, [sessao.id]: true }));

    try {
      console.log(`🗑️ Limpando dados da sessão ${sessao.session_name} (ID: ${sessao.id})`);

      // 1. Contar conversas para feedback
      const { count: totalConversas } = await supabase
        .from("mt_whatsapp_conversations")
        .select("*", { count: 'exact', head: true })
        .eq("session_id", sessao.id);

      console.log(`  📋 Encontradas ${totalConversas || 0} conversas para deletar`);

      // 2. Deletar todas as mensagens diretamente por session_id (mais eficiente)
      const { error: msgError, count: msgCount } = await supabase
        .from("mt_whatsapp_messages")
        .delete({ count: 'exact' })
        .eq("session_id", sessao.id);

      if (msgError) {
        console.error("Erro ao deletar mensagens:", msgError);
        throw new Error(`Erro ao deletar mensagens: ${msgError.message}`);
      }

      console.log(`  📨 ${msgCount || 0} mensagens deletadas`);

      // 3. Deletar todas as conversas
      const { error: convError, count: convCount } = await supabase
        .from("mt_whatsapp_conversations")
        .delete({ count: 'exact' })
        .eq("session_id", sessao.id);

      if (convError) {
        console.error("Erro ao deletar conversas:", convError);
        throw new Error(`Erro ao deletar conversas: ${convError.message}`);
      }

      console.log(`  💬 ${convCount || 0} conversas deletadas`);

      toast.success(
        `Dados limpos com sucesso!\n${msgCount || 0} mensagens e ${convCount || 0} conversas deletadas.\n\nAgora você pode sincronizar novamente.`
      );

    } catch (err) {
      console.error("Erro ao limpar dados:", err);
      toast.error(`Erro ao limpar dados: ${err instanceof Error ? err.message : "Erro desconhecido"}`);
    } finally {
      setClearingDataSessions(prev => ({ ...prev, [sessao.id]: false }));
    }
  };

  // Render loading
  if (isLoading) {
    return (
      <ModuleLayout
        title="Sessões WhatsApp"
        description="Gerencie suas conexões do WhatsApp"
        breadcrumbs={[
          { label: 'WhatsApp', href: '/whatsapp' },
          { label: 'Sessões' },
        ]}
      >
        <LoadingState message="Carregando sessões..." />
      </ModuleLayout>
    );
  }

  return (
    <ModuleLayout
      title="Sessões WhatsApp"
      description="Gerencie suas conexões do WhatsApp"
      breadcrumbs={[
        { label: 'WhatsApp', href: '/whatsapp' },
        { label: 'Sessões' },
      ]}
      actions={
        <>
          {/* Botão de Sync com WAHA - apenas para quem tem permissão */}
          {canSyncSessions && (
            <Button variant="outline" onClick={handleSyncSessions} disabled={!isWahaConfigured || isSyncing}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          )}
          <Button
            onClick={() => setCreateDialogOpen(true)}
            disabled={!isWahaConfigured}
            className="bg-green-600 hover:bg-green-700"
          >
            <Plus className="mr-2 h-4 w-4" />
            Nova Sessão
          </Button>
        </>
      }
    >
      {/* WAHA not configured warning */}
      {!loadingConfig && !isWahaConfigured && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Integração não configurada</AlertTitle>
          <AlertDescription>
            Configure a integração WAHA em{" "}
            <a href="/configuracoes" className="underline font-medium">
              Configurações → WhatsApp
            </a>{" "}
            para gerenciar sessões.
          </AlertDescription>
        </Alert>
      )}

      {/* Mini Dashboard com 4 stats */}
      <MiniDashboard stats={stats} />

      {/* Sessions Grid */}
      {sessoes.length === 0 ? (
        <Card className="mt-6">
          <CardContent className="py-12">
            <EmptyState
              icon={Smartphone}
              title="Nenhuma sessão configurada"
              description="Conecte seu WhatsApp para começar a atender seus clientes."
              action={{
                label: 'Criar Sessão',
                onClick: () => setCreateDialogOpen(true),
              }}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mt-6">
          {sessoes.map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              franqueadoName={session.franqueado_id ? franqueadosMap.get(session.franqueado_id) : undefined}
              responsibleName={session.responsible_user_id ? usersMap.get(session.responsible_user_id) : undefined}
              departmentName={session.department_id ? departmentsMap.get(session.department_id) : undefined}
              teamName={session.team_id ? teamsMap.get(session.team_id) : undefined}
              onStart={() => handleStartSession(session)}
              onStop={() => handleStopSession(session)}
              onQRCode={() => handleShowQR(session)}
              onDelete={() => handleDeleteClick(session)}
              onOpenChat={() => handleOpenChat(session)}
              onConfigureWebhook={() => handleConfigureWebhook(session)}
              onManageUsers={() => handleManageUsersClick(session)}
              onManageGroups={() => handleManageGroupsClick(session)}
              onSyncConversas={() => handleSyncConversas(session)}
              onSyncLabels={() => handleSyncLabels(session)}
              onStopSync={() => handleStopSync(session.id)}
              onClearData={() => handleClearData(session)}
              onEdit={() => handleEditClick(session)}
              onReplace={() => handleReplaceClick(session)}
              onEditProfile={() => { setProfileDialogSession(session); setProfileDialogOpen(true); }}
              isLoading={loadingSessaoId === session.id}
              hasWebhook={webhookStatuses[session.session_name]}
              isManager={canManageUsers}
              isSuperAdmin={canClearData}
              canConfigureWaha={true} // Botão visível para TODAS as roles
              syncProgress={syncProgressBySession[session.id]}
              isClearingData={clearingDataSessions[session.id]}
              isSyncingLabels={syncingLabelsSession[session.id]}
              isBotActive={botConfigBySession[session.id]?.is_active || false}
              isTogglingBot={togglingBotSession === session.id}
              onToggleBot={(active) => handleToggleBot(session.id, active)}
              isDefaultNumber={(session as any).is_default === true}
            />
          ))}
        </div>
      )}

      {/* Dialog para criar nova sessão (com QR Code inline) */}
      <Dialog open={createDialogOpen} onOpenChange={(open) => {
        if (!open && qrPollingRef.current) {
          clearInterval(qrPollingRef.current);
          qrPollingRef.current = null;
        }
        setCreateDialogOpen(open);
        if (!open) {
          setQrCodeBase64(null);
          setQrCodeSessionName(null);
          setIsSessionConnected(false);
        }
      }}>
        <DialogContent className={qrCodeSessionName ? "sm:max-w-[450px]" : ""}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              {qrCodeSessionName ? 'Conectar WhatsApp' : 'Nova Sessão WhatsApp'}
            </DialogTitle>
            <DialogDescription>
              {qrCodeSessionName
                ? `${newSessionName} - Escaneie o QR Code com seu WhatsApp`
                : 'Crie uma nova sessão para conectar um número de WhatsApp.'}
            </DialogDescription>
          </DialogHeader>

          {/* Etapa 1: Formulário (quando ainda não criou a sessão) */}
          {!qrCodeSessionName && (
            <>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="franqueado">Unidade/Franquia</Label>
                  {accessLevel === 'franchise' && franchise ? (
                    // Franchise admin: mostrar nome da franquia fixo
                    <div className="flex h-10 w-full items-center rounded-md border border-input bg-muted px-3 text-sm">
                      {franchise.nome || 'Sua Franquia'}
                    </div>
                  ) : (
                    <Select
                      value={selectedFranqueadoId}
                      onValueChange={setSelectedFranqueadoId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma unidade" />
                      </SelectTrigger>
                      <SelectContent>
                        {franqueados.map((franqueado) => (
                          <SelectItem key={franqueado.id} value={franqueado.id}>
                            {franqueado.nome_fantasia || franqueado.razao_social}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {accessLevel === 'franchise'
                      ? 'Sessão será vinculada à sua franquia.'
                      : 'Selecione a unidade que será vinculada a esta sessão.'}
                  </p>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="sessionName">Nome da Sessão</Label>
                  <Input
                    id="sessionName"
                    value={newSessionName}
                    onChange={(e) => setNewSessionName(e.target.value)}
                    placeholder="Ex: Atendimento Principal"
                  />
                  <p className="text-xs text-muted-foreground">
                    Use apenas letras, números e underscores.
                  </p>
                </div>

                {/* Responsável */}
                <div className="grid gap-2">
                  <Label htmlFor="responsible">Responsável (opcional)</Label>
                  <Select
                    value={selectedResponsibleId}
                    onValueChange={setSelectedResponsibleId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um responsável" />
                    </SelectTrigger>
                    <SelectContent>
                      {allUsers.filter(u => u.is_active).map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.nome || user.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Usuário responsável por esta sessão.
                  </p>
                </div>

                {/* Departamento e Equipe (auto-preenchidos do responsável) */}
                {selectedResponsibleId && (autoDepartmentName || autoTeamName) && (
                  <div className="grid gap-2 p-3 bg-muted/50 rounded-md">
                    <p className="text-xs font-medium text-muted-foreground">
                      Vinculação automática (do cadastro do responsável):
                    </p>
                    {autoDepartmentName && (
                      <div className="flex items-center gap-2 text-sm">
                        <FolderTree className="h-4 w-4 text-muted-foreground" />
                        <span>Departamento: <strong>{autoDepartmentName}</strong></span>
                      </div>
                    )}
                    {autoTeamName && (
                      <div className="flex items-center gap-2 text-sm">
                        <UsersRound className="h-4 w-4 text-muted-foreground" />
                        <span>Equipe: <strong>{autoTeamName}</strong></span>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setCreateDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleCreateSession}
                  disabled={!newSessionName.trim() || (accessLevel !== 'franchise' && !selectedFranqueadoId) || (accessLevel === 'franchise' && !franchise?.id) || isCreating}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isCreating ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Criando...
                    </>
                  ) : (
                    'Criar Sessão'
                  )}
                </Button>
              </DialogFooter>
            </>
          )}

          {/* Etapa 2: QR Code inline (após criar sessão) */}
          {qrCodeSessionName && (
            <div className="flex flex-col items-center py-4">
              {isSessionConnected ? (
                /* Sucesso - Conectado */
                <div className="text-center space-y-4">
                  <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="h-8 w-8 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-green-600">Conectado com sucesso!</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Seu WhatsApp está pronto para uso.
                    </p>
                  </div>
                </div>
              ) : isLoadingQR ? (
                /* Loading QR */
                <div className="h-64 w-64 flex items-center justify-center bg-muted rounded-lg">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : qrCodeBase64 ? (
                /* QR Code carregado */
                <div className="space-y-4">
                  <div className="bg-white p-4 rounded-lg shadow-inner">
                    <img
                      src={qrCodeBase64}
                      alt="QR Code WhatsApp"
                      className="h-64 w-64 object-contain"
                    />
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">
                      Abra o WhatsApp no seu celular, vá em <strong>Configurações → Dispositivos vinculados</strong> e escaneie este código.
                    </p>
                  </div>
                  <Button
                    onClick={async () => {
                      if (!qrCodeSessionName) return;
                      setIsLoadingQR(true);
                      const qrResult = await wahaClient.getQRCode(qrCodeSessionName);
                      if (qrResult.success && qrResult.data?.value) {
                        const qrValue = qrResult.data.value;
                        const qrBase64 = qrValue.startsWith('data:')
                          ? qrValue
                          : `data:image/png;base64,${qrValue}`;
                        setQrCodeBase64(qrBase64);
                      }
                      setIsLoadingQR(false);
                    }}
                    variant="outline"
                    className="w-full"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Atualizar QR Code
                  </Button>
                </div>
              ) : (
                /* Erro ao carregar QR */
                <div className="text-center space-y-4">
                  <div className="h-64 w-64 flex items-center justify-center bg-muted rounded-lg">
                    <p className="text-muted-foreground">Aguardando QR Code...</p>
                  </div>
                  <Button
                    onClick={async () => {
                      if (!qrCodeSessionName) return;
                      setIsLoadingQR(true);
                      const qrResult = await wahaClient.getQRCode(qrCodeSessionName);
                      if (qrResult.success && qrResult.data?.value) {
                        const qrValue = qrResult.data.value;
                        const qrBase64 = qrValue.startsWith('data:')
                          ? qrValue
                          : `data:image/png;base64,${qrValue}`;
                        setQrCodeBase64(qrBase64);
                      }
                      setIsLoadingQR(false);
                    }}
                    variant="outline"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Tentar Novamente
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmação de exclusão */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        itemName={selectedSessao?.nome || selectedSessao?.session_name}
        isLoading={false}
      />

      {/* Dialog de substituição de sessão */}
      <ReplaceSessionDialog
        open={replaceDialogOpen}
        onOpenChange={setReplaceDialogOpen}
        oldSession={selectedSessao}
        availableSessions={sessoes}
        onSuccess={() => {
          setReplaceDialogOpen(false);
          setSelectedSessao(null);
          refetch();
        }}
      />

      {/* Dialog de edição de perfil WhatsApp */}
      {profileDialogSession && (
        <SessionProfileDialog
          open={profileDialogOpen}
          onOpenChange={(open) => {
            setProfileDialogOpen(open);
            if (!open) setProfileDialogSession(null);
          }}
          sessionId={profileDialogSession.id}
          sessionName={profileDialogSession.session_name}
          wahaUrl={(profileDialogSession as any).waha_url || wahaConfig?.api_url}
          currentDisplayName={profileDialogSession.display_name}
          currentProfilePicture={(profileDialogSession as any).profile_picture_url}
        />
      )}

      {/* Dialog de edição de sessão */}
      <Dialog open={editDialogOpen} onOpenChange={(open) => {
        setEditDialogOpen(open);
        if (!open) {
          setSelectedSessao(null);
          setEditSessionName('');
          setEditResponsibleId('');
          setEditDepartmentId('');
          setEditTeamId('');
          setEditDepartmentName('');
          setEditTeamName('');
          setEditRoundRobinEnabled(false);
          setEditRoundRobinMode('team');
        }
      }}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5" />
              Editar Sessão
            </DialogTitle>
            <DialogDescription>
              Altere o nome e o responsável pela sessão "{selectedSessao?.nome || selectedSessao?.session_name}".
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Nome da sessão */}
            <div className="grid gap-2">
              <Label htmlFor="edit-session-name">Nome da Sessão</Label>
              <Input
                id="edit-session-name"
                value={editSessionName}
                onChange={(e) => setEditSessionName(e.target.value)}
                placeholder="Ex: Atendimento Principal"
              />
            </div>

            {/* Tipo de Número */}
            <div className="grid gap-2">
              <Label>Tipo de Número</Label>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Building2 className={`h-4 w-4 ${editIsDefault ? 'text-primary' : 'text-muted-foreground'}`} />
                    <span className="text-sm font-medium">
                      {editIsDefault ? 'Número Padrão da Unidade' : 'Número de Consultora'}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {editIsDefault
                      ? 'Este é o número principal da franquia. Leads sem responsável serão atribuídos à unidade.'
                      : 'Este número pertence a uma consultora específica.'}
                  </p>
                </div>
                <Switch
                  checked={editIsDefault}
                  onCheckedChange={setEditIsDefault}
                />
              </div>
            </div>

            {/* Responsável */}
            <div className="grid gap-2">
              <Label htmlFor="edit-responsible">Responsável{editIsDefault ? ' (opcional)' : ''}</Label>
              <Select
                value={editResponsibleId}
                onValueChange={setEditResponsibleId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um responsável" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum responsável</SelectItem>
                  {allUsers.filter(u => u.is_active).map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.nome || user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {editIsDefault
                  ? 'Opcional. Se definido, leads serão atribuídos a este responsável mesmo sendo número da unidade.'
                  : 'Leads criados via WhatsApp serão atribuídos a este responsável.'}
              </p>
            </div>

            {/* Departamento e Equipe (auto-preenchidos do responsável) */}
            {editResponsibleId && (editDepartmentName || editTeamName) && (
              <div className="grid gap-2 p-3 bg-muted/50 rounded-md">
                <p className="text-xs font-medium text-muted-foreground">
                  Vinculação automática (do cadastro do responsável):
                </p>
                {editDepartmentName && (
                  <div className="flex items-center gap-2 text-sm">
                    <FolderTree className="h-4 w-4 text-muted-foreground" />
                    <span>Departamento: <strong>{editDepartmentName}</strong></span>
                  </div>
                )}
                {editTeamName && (
                  <div className="flex items-center gap-2 text-sm">
                    <UsersRound className="h-4 w-4 text-muted-foreground" />
                    <span>Equipe: <strong>{editTeamName}</strong></span>
                  </div>
                )}
              </div>
            )}

            {/* Round Robin - Distribuição de Leads */}
            <div className="grid gap-2">
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Repeat2 className={`h-4 w-4 ${editRoundRobinEnabled ? 'text-green-600' : 'text-muted-foreground'}`} />
                    <span className="text-sm font-medium">
                      Round Robin (Distribuição Automática)
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Distribui novos leads automaticamente entre os membros da equipe ou departamento vinculado.
                  </p>
                </div>
                <Switch
                  checked={editRoundRobinEnabled}
                  onCheckedChange={setEditRoundRobinEnabled}
                />
              </div>
            </div>

            {/* Modo do Round Robin */}
            {editRoundRobinEnabled && (
              <div className="grid gap-3 p-3 bg-green-50 border border-green-200 rounded-md">
                <Label className="text-xs font-medium text-green-700">Distribuir entre:</Label>
                <Select
                  value={editRoundRobinMode}
                  onValueChange={(v) => setEditRoundRobinMode(v as 'team' | 'department')}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="team">
                      <div className="flex items-center gap-2">
                        <UsersRound className="h-3.5 w-3.5" />
                        <span>Membros da Equipe</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="department">
                      <div className="flex items-center gap-2">
                        <FolderTree className="h-3.5 w-3.5" />
                        <span>Membros do Departamento</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>

                {/* Seletor de Equipe */}
                {editRoundRobinMode === 'team' && (
                  <div className="grid gap-1">
                    <Label className="text-xs font-medium text-green-700">Selecione a Equipe:</Label>
                    <Select
                      value={editTeamId}
                      onValueChange={(v) => {
                        setEditTeamId(v);
                        const team = (teams || []).find((t: any) => t.id === v);
                        if (team) setEditTeamName((team as any).nome || '');
                      }}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Selecione uma equipe..." />
                      </SelectTrigger>
                      <SelectContent>
                        {(teams || []).map((team: any) => (
                          <SelectItem key={team.id} value={team.id}>
                            <div className="flex items-center gap-2">
                              <UsersRound className="h-3.5 w-3.5" />
                              <span>{team.nome}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {editTeamId && editTeamName ? (
                      <p className="text-xs text-green-600">
                        Leads serão distribuídos entre os membros ativos da equipe "<strong>{editTeamName}</strong>".
                      </p>
                    ) : (
                      <p className="text-xs text-amber-600">
                        Selecione uma equipe para ativar a distribuição.
                      </p>
                    )}
                  </div>
                )}

                {/* Seletor de Departamento */}
                {editRoundRobinMode === 'department' && (
                  <div className="grid gap-1">
                    <Label className="text-xs font-medium text-green-700">Selecione o Departamento:</Label>
                    <Select
                      value={editDepartmentId}
                      onValueChange={(v) => {
                        setEditDepartmentId(v);
                        const dept = (departments || []).find((d: any) => d.id === v);
                        if (dept) setEditDepartmentName((dept as any).nome || '');
                      }}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Selecione um departamento..." />
                      </SelectTrigger>
                      <SelectContent>
                        {(departments || []).map((dept: any) => (
                          <SelectItem key={dept.id} value={dept.id}>
                            <div className="flex items-center gap-2">
                              <FolderTree className="h-3.5 w-3.5" />
                              <span>{dept.nome}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {editDepartmentId && editDepartmentName ? (
                      <p className="text-xs text-green-600">
                        Leads serão distribuídos entre os membros ativos do departamento "<strong>{editDepartmentName}</strong>".
                      </p>
                    ) : (
                      <p className="text-xs text-amber-600">
                        Selecione um departamento para ativar a distribuição.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Aviso sobre leads existentes */}
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                {editRoundRobinEnabled
                  ? 'Com Round Robin ativo, novos leads serão distribuídos automaticamente. O responsável fixo será ignorado.'
                  : 'Alterações no responsável afetam apenas novos leads criados a partir de agora. Leads existentes não serão alterados.'}
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
              disabled={isSavingEdit}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleEditSave}
              disabled={isSavingEdit}
              className="bg-green-600 hover:bg-green-700"
            >
              {isSavingEdit ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar Alterações'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal QR Code */}
      <QRCodeModal
        open={showQRModal}
        onOpenChange={setShowQRModal}
        sessao={selectedSessao}
        onConnected={handleSessaoConnected}
      />

      {/* Modal importar sessões */}
      <ImportSessoesModal
        open={showImportModal}
        onOpenChange={setShowImportModal}
        sessions={sessionsToImport}
        onImport={handleImportSessions}
        isImporting={isImporting}
      />

      {/* Modal para gerenciar usuários da sessão */}
      {selectedSessao && (
        <SessionUsersModal
          open={usersDialogOpen}
          onOpenChange={(open) => {
            setUsersDialogOpen(open);
            if (!open) setSelectedSessao(null);
          }}
          sessaoId={selectedSessao.id}
          sessaoNome={selectedSessao.nome || selectedSessao.session_name}
          franqueadoId={selectedSessao.franqueado_id}
        />
      )}

      {/* Modal para gerenciar grupos WhatsApp */}
      {selectedSessao && (
        <GroupManager
          sessionName={selectedSessao.session_name}
          open={groupsDialogOpen}
          onOpenChange={(open) => {
            setGroupsDialogOpen(open);
            if (!open) setSelectedSessao(null);
          }}
        />
      )}
    </ModuleLayout>
  );
}
