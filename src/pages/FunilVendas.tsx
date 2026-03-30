import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Search,
  Settings,
  Plus,
  Filter,
  BarChart3,
  Users,
  DollarSign,
  RefreshCw,
  AlertTriangle,
  LayoutGrid,
  List,
  MessageSquare,
  Phone,
  Mail,
  MapPin,
  Calendar,
  ExternalLink,
  UserPlus,
  Clock,
  Thermometer,
} from 'lucide-react';
import { KanbanBoard } from '@/components/funil/KanbanBoard';
import { FunilListView } from '@/components/funil/FunilListView';
import { SavedFiltersDropdown } from '@/components/filters/SavedFiltersDropdown';
import { FunilSelector } from '@/components/funil/FunilSelector';
import { useFunisAdapter, useFunilAdapter } from '@/hooks/useFunisAdapter';
import { useFunilLeadMutations, useFunilLeadMetrics } from '@/hooks/useFunilLeads';
import { useLeadsAdapter } from '@/hooks/useLeadsAdapter';
import { useAuth } from '@/contexts/AuthContext';
import { useTenantContext } from '@/contexts/TenantContext';
import { useUserPermissions } from '@/hooks/multitenant/useUserPermissions';
import { supabase } from '@/integrations/supabase/client';
import type { FunilFilters, FunilLeadExpanded, FunilEtapa } from '@/types/funil';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function FunilVendas() {
  const { funilId: urlFunilId } = useParams<{ funilId: string }>();
  const navigate = useNavigate();
  const { profile, franqueado } = useAuth();
  const { tenant, accessLevel } = useTenantContext();
  const { hasPermission } = useUserPermissions();

  // Permissões: franchise_admin+ pode configurar funil; user só pode visualizar e mover leads
  const canManageFunil = accessLevel === 'platform' || accessLevel === 'tenant' || accessLevel === 'franchise';

  // Estado do funil selecionado
  const [selectedFunilId, setSelectedFunilId] = useState<string | undefined>(urlFunilId);

  // Modo de visualização (kanban ou lista)
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>(() => {
    try {
      return (localStorage.getItem('funil-view-mode') as 'kanban' | 'list') || 'kanban';
    } catch {
      return 'kanban';
    }
  });

  const handleViewModeChange = (mode: 'kanban' | 'list') => {
    setViewMode(mode);
    try { localStorage.setItem('funil-view-mode', mode); } catch {}
  };

  // Filtros
  const [filters, setFilters] = useState<FunilFilters>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [showEsfriando, setShowEsfriando] = useState(false);

  // Modais
  const [isAddLeadOpen, setIsAddLeadOpen] = useState(false);
  const [addLeadEtapaId, setAddLeadEtapaId] = useState<string | null>(null);
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [detailLead, setDetailLead] = useState<FunilLeadExpanded | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [editValorLead, setEditValorLead] = useState<FunilLeadExpanded | null>(null);
  const [newValor, setNewValor] = useState('');
  const [assignLead, setAssignLead] = useState<FunilLeadExpanded | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [transferLead, setTransferLead] = useState<FunilLeadExpanded | null>(null);
  const [transferFunnelId, setTransferFunnelId] = useState<string>('');

  // Dados
  const { funis, isLoading: isLoadingFunis } = useFunisAdapter({ includeTemplates: false });
  const { funil } = useFunilAdapter(selectedFunilId);
  const { metrics } = useFunilLeadMetrics(selectedFunilId);
  const { leads: allLeads, isLoading: isLoadingLeads } = useLeadsAdapter();
  const { addLeadsInBatch, updateValorEstimado, removeLeadFromFunil, assignResponsavel, transferToFunnel, isAdding, isTransferring } = useFunilLeadMutations();

  // Buscar usuários para atribuição de responsável
  const { data: tenantUsers = [] } = useQuery({
    queryKey: ['mt-users-assign', tenant?.id],
    queryFn: async () => {
      let q = supabase
        .from('mt_users')
        .select('id, nome, email')
        .eq('status', 'ativo')
        .order('nome');
      if (tenant) q = q.eq('tenant_id', tenant.id);
      const { data } = await q;
      return data || [];
    },
    enabled: !!tenant || accessLevel === 'platform',
  });

  // Selecionar primeiro funil se não tiver um selecionado
  useEffect(() => {
    if (!selectedFunilId && funis.length > 0) {
      const primeiroFunil = funis[0];
      setSelectedFunilId(primeiroFunil.id);
      navigate(`/funil/${primeiroFunil.id}`, { replace: true });
    }
  }, [funis, selectedFunilId, navigate]);

  // Atualizar URL quando mudar funil
  const handleFunilChange = (id: string) => {
    setSelectedFunilId(id);
    navigate(`/funil/${id}`);
  };

  // Atualizar filtros de busca
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setFilters((prev) => ({
        ...prev,
        busca: searchQuery || undefined,
        apenasEsfriando: showEsfriando || undefined,
      }));
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, showEsfriando]);

  // Handlers
  const handleOpenDetail = (lead: FunilLeadExpanded) => {
    setDetailLead(lead);
    setIsDetailOpen(true);
  };

  const handleOpenChat = async (conversaId: string) => {
    try {
      const { data } = await supabase
        .from('mt_whatsapp_conversations')
        .select('session_id')
        .eq('id', conversaId)
        .single();

      if (data?.session_id) {
        navigate(`/whatsapp/conversas/${data.session_id}?chat=${conversaId}`);
      } else {
        toast.error('Sessao WhatsApp nao encontrada');
      }
    } catch {
      toast.error('Erro ao abrir conversa');
    }
  };

  // Abrir WhatsApp pelo telefone do lead (quando não tem conversa vinculada)
  const handleOpenWhatsAppByPhone = async (lead: FunilLeadExpanded) => {
    const phone = lead.lead?.telefone || lead.lead?.whatsapp;
    if (!phone) {
      toast.error('Lead sem telefone cadastrado');
      return;
    }
    const cleanPhone = phone.replace(/\D/g, '');
    const phoneWith55 = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    const phoneWithout55 = cleanPhone.startsWith('55') && cleanPhone.length >= 12 ? cleanPhone.substring(2) : cleanPhone;

    // Tentar encontrar conversa existente pelo telefone (respeitando tenant)
    let convQuery = supabase
      .from('mt_whatsapp_conversations')
      .select('id, session_id')
      .or(`contact_phone.eq.${cleanPhone},contact_phone.eq.${phoneWith55},contact_phone.eq.${phoneWithout55}`)
      .order('last_message_at', { ascending: false })
      .limit(1);

    if (tenant?.id) convQuery = convQuery.eq('tenant_id', tenant.id);

    const { data: conv } = await convQuery.maybeSingle();
    if (conv?.session_id) {
      navigate(`/whatsapp/conversas/${conv.session_id}?chat=${conv.id}`);
      return;
    }

    // Fallback: buscar sessão ativa do tenant
    let sessQuery = supabase
      .from('mt_whatsapp_sessions')
      .select('id')
      .eq('status', 'WORKING')
      .limit(1);

    if (tenant?.id) sessQuery = sessQuery.eq('tenant_id', tenant.id);

    const { data: sess } = await sessQuery.maybeSingle();
    if (sess?.id) {
      navigate(`/whatsapp/conversas/${sess.id}`);
    } else {
      window.open(`https://wa.me/${phoneWith55}`, '_blank');
    }
  };

  const handleAddLead = (etapaId: string) => {
    setAddLeadEtapaId(etapaId);
    setSelectedLeadIds([]);
    setIsAddLeadOpen(true);
  };

  const handleConfigEtapa = (etapa: FunilEtapa) => {
    navigate(`/funil/config/${selectedFunilId}`);
  };

  const handleAssignResponsavel = (lead: FunilLeadExpanded) => {
    setAssignLead(lead);
    setSelectedUserId(lead.responsavel?.id || '');
  };

  const handleSaveAssign = async () => {
    if (!assignLead) return;
    try {
      await assignResponsavel.mutateAsync({
        funilLeadId: assignLead.id,
        responsavelId: selectedUserId || null,
      });
      setAssignLead(null);
      setSelectedUserId('');
    } catch (error: any) {
      toast.error(`Erro ao atribuir: ${error.message}`);
    }
  };

  const handleEditValor = (lead: FunilLeadExpanded) => {
    setEditValorLead(lead);
    setNewValor(lead.valor_estimado?.toString() || '');
  };

  const handleSaveValor = async () => {
    if (!editValorLead) return;

    try {
      await updateValorEstimado.mutateAsync({
        funilLeadId: editValorLead.id,
        valor: newValor ? parseFloat(newValor) : null,
      });
      setEditValorLead(null);
      setNewValor('');
    } catch (error) {
      console.error('Erro ao salvar valor:', error);
    }
  };

  const handleRemoveLead = async (lead: FunilLeadExpanded) => {
    if (!selectedFunilId) return;
    if (!hasPermission('funil.manage')) {
      toast.error('Você não tem permissão para remover leads do funil');
      return;
    }

    if (window.confirm(`Remover "${lead.lead?.nome}" do funil?`)) {
      try {
        await removeLeadFromFunil.mutateAsync({
          id: lead.id,
          funilId: selectedFunilId,
        });
      } catch (error) {
        console.error('Erro ao remover lead:', error);
      }
    }
  };

  const handleAddSelectedLeads = async () => {
    if (!selectedFunilId || !addLeadEtapaId || selectedLeadIds.length === 0) return;

    try {
      await addLeadsInBatch.mutateAsync({
        funilId: selectedFunilId,
        etapaId: addLeadEtapaId,
        leadIds: selectedLeadIds,
      });
      setIsAddLeadOpen(false);
      setSelectedLeadIds([]);
      setAddLeadEtapaId(null);
    } catch (error) {
      console.error('Erro ao adicionar leads:', error);
    }
  };

  // Formatar moeda
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="border-b p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold">Funil de Vendas</h1>
            <FunilSelector
              value={selectedFunilId}
              onChange={handleFunilChange}
              franqueadoId={franqueado?.id}
            />
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to="/funil/relatorios">
                <BarChart3 className="h-4 w-4 mr-2" />
                Relatórios
              </Link>
            </Button>
            {canManageFunil && (
              <Button variant="outline" size="sm" asChild>
                <Link to={`/funil/config/${selectedFunilId}`}>
                  <Settings className="h-4 w-4 mr-2" />
                  Configurar
                </Link>
              </Button>
            )}
          </div>
        </div>

        {/* Métricas rápidas */}
        {selectedFunilId && (
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{metrics.totalLeads}</span>
              <span className="text-muted-foreground">leads</span>
            </div>
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-600" />
              <span className="font-medium text-green-600">
                {formatCurrency(metrics.totalValor)}
              </span>
              <span className="text-muted-foreground">pipeline</span>
            </div>
          </div>
        )}

        {/* Filtros */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, telefone ou email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <Button
            variant={showEsfriando ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowEsfriando(!showEsfriando)}
          >
            <AlertTriangle className="h-4 w-4 mr-2" />
            Esfriando
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setFilters({});
              setSearchQuery('');
              setShowEsfriando(false);
            }}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Limpar
          </Button>

          <SavedFiltersDropdown
            context={`funil-${selectedFunilId || 'default'}`}
            currentFilters={filters}
            onLoadFilter={(savedFilters) => {
              setFilters(savedFilters);
              setSearchQuery(savedFilters.busca || '');
              setShowEsfriando(savedFilters.apenasEsfriando || false);
            }}
          />

          {/* Toggle Kanban / Lista */}
          <div className="flex border rounded-md ml-auto">
            <Button
              variant={viewMode === 'kanban' ? 'default' : 'ghost'}
              size="sm"
              className="rounded-r-none px-2.5"
              onClick={() => handleViewModeChange('kanban')}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              className="rounded-l-none px-2.5"
              onClick={() => handleViewModeChange('list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Kanban Board / List View */}
      <div className="flex-1 overflow-hidden">
        {selectedFunilId ? (
          viewMode === 'kanban' ? (
            <KanbanBoard
              funilId={selectedFunilId}
              filters={filters}
              onOpenDetail={handleOpenDetail}
              onOpenChat={handleOpenChat}
              onAddLead={handleAddLead}
              onConfigEtapa={canManageFunil ? handleConfigEtapa : undefined}
              onAssignResponsavel={handleAssignResponsavel}
              onEditValor={handleEditValor}
              onRemoveLead={handleRemoveLead}
              onTransferFunnel={(lead) => setTransferLead(lead)}
            />
          ) : (
            <FunilListView
              funilId={selectedFunilId}
              filters={filters}
              onOpenDetail={handleOpenDetail}
              onOpenChat={handleOpenChat}
              onAssignResponsavel={handleAssignResponsavel}
              onEditValor={handleEditValor}
              onRemoveLead={handleRemoveLead}
            />
          )
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <p className="text-lg font-medium">Selecione ou crie um funil</p>
            <p className="text-sm">Use o seletor acima para começar</p>
          </div>
        )}
      </div>

      {/* Modal adicionar leads */}
      <Dialog open={isAddLeadOpen} onOpenChange={setIsAddLeadOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Adicionar Leads ao Funil</DialogTitle>
            <DialogDescription>
              Selecione os leads que deseja adicionar a esta etapa.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="h-96 border rounded-md">
            <div className="p-4 space-y-2">
              {allLeads.map((lead) => (
                <div
                  key={lead.id}
                  className={`flex items-center gap-3 p-2 rounded-md cursor-pointer hover:bg-muted ${
                    selectedLeadIds.includes(lead.id) ? 'bg-muted' : ''
                  }`}
                  onClick={() => {
                    setSelectedLeadIds((prev) =>
                      prev.includes(lead.id)
                        ? prev.filter((id) => id !== lead.id)
                        : [...prev, lead.id]
                    );
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedLeadIds.includes(lead.id)}
                    onChange={() => {}}
                    className="h-4 w-4"
                  />
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs">
                      {lead.nome?.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{lead.nome}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {lead.telefone} • {lead.unidade}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {lead.status}
                  </Badge>
                </div>
              ))}
            </div>
          </ScrollArea>

          <DialogFooter>
            <div className="flex items-center justify-between w-full">
              <span className="text-sm text-muted-foreground">
                {selectedLeadIds.length} leads selecionados
              </span>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setIsAddLeadOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleAddSelectedLeads}
                  disabled={selectedLeadIds.length === 0 || isAdding}
                >
                  {isAdding ? 'Adicionando...' : 'Adicionar'}
                </Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal editar valor */}
      <Dialog open={!!editValorLead} onOpenChange={(open) => !open && setEditValorLead(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Valor Estimado</DialogTitle>
            <DialogDescription>
              Defina o valor estimado para este lead.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Label htmlFor="valor">Valor (R$)</Label>
            <Input
              id="valor"
              type="number"
              value={newValor}
              onChange={(e) => setNewValor(e.target.value)}
              placeholder="0"
              className="mt-2"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditValorLead(null)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveValor}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal atribuir responsavel */}
      <Dialog open={!!assignLead} onOpenChange={(open) => !open && setAssignLead(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Atribuir Responsavel</DialogTitle>
            <DialogDescription>
              Selecione o responsavel por {assignLead?.lead?.nome}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="responsavel">Responsavel</Label>
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Selecione um responsavel..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Nenhum (remover)</SelectItem>
                {tenantUsers.map((user: any) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.nome || user.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignLead(null)}>Cancelar</Button>
            <Button onClick={handleSaveAssign} disabled={assignResponsavel.isPending}>
              {assignResponsavel.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal trocar funil */}
      <Dialog open={!!transferLead} onOpenChange={(open) => { if (!open) { setTransferLead(null); setTransferFunnelId(''); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Trocar de Funil</DialogTitle>
            <DialogDescription>
              Transferir {transferLead?.lead?.nome} para outro funil
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label>Funil de destino</Label>
            <Select value={transferFunnelId} onValueChange={setTransferFunnelId}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Selecione o funil..." />
              </SelectTrigger>
              <SelectContent>
                {funis
                  .filter((f) => f.id !== selectedFunilId)
                  .map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.nome}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-2">
              O lead será movido para a primeira etapa do funil selecionado
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setTransferLead(null); setTransferFunnelId(''); }}>
              Cancelar
            </Button>
            <Button
              disabled={!transferFunnelId || isTransferring}
              onClick={async () => {
                if (!transferLead || !transferFunnelId || !selectedFunilId) return;
                try {
                  // Buscar primeira etapa do funil destino
                  const { data: stages } = await supabase
                    .from('mt_funnel_stages')
                    .select('id')
                    .eq('funnel_id', transferFunnelId)
                    .is('deleted_at', null)
                    .order('ordem', { ascending: true })
                    .limit(1);

                  if (!stages?.[0]) {
                    toast.error('Funil de destino não tem etapas configuradas');
                    return;
                  }

                  await transferToFunnel.mutateAsync({
                    leadId: transferLead.lead_id,
                    sourceFunnelId: selectedFunilId,
                    destinationFunnelId: transferFunnelId,
                    destinationStageId: stages[0].id,
                  });
                  setTransferLead(null);
                  setTransferFunnelId('');
                } catch {}
              }}
            >
              {isTransferring ? 'Transferindo...' : 'Transferir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sheet de detalhes do lead - Estilo Kommo */}
      <Sheet open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <SheetContent className="w-full sm:max-w-md p-0 flex flex-col">
          <SheetHeader className="sr-only">
            <SheetTitle>{detailLead?.lead?.nome || 'Detalhes'}</SheetTitle>
            <SheetDescription>Detalhes do lead no funil</SheetDescription>
          </SheetHeader>

          {detailLead && (
            <>
              {/* Header com avatar e nome */}
              <div className="p-6 pb-4 border-b bg-muted/30">
                <div className="flex items-start gap-4">
                  <Avatar className="h-14 w-14">
                    <AvatarFallback className="text-lg bg-primary text-primary-foreground">
                      {detailLead.lead?.nome?.slice(0, 2).toUpperCase() || '??'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg truncate">{detailLead.lead?.nome}</h3>
                    <p className="text-sm text-muted-foreground">{detailLead.lead?.unidade}</p>
                    {detailLead.tags && detailLead.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {detailLead.tags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <div
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: detailLead.etapa?.cor || '#64748b' }}
                  />
                  <span className="text-sm font-medium">{detailLead.etapa?.nome}</span>
                  {detailLead.data_etapa && (
                    <span className="text-xs text-muted-foreground ml-auto">
                      {Math.floor((Date.now() - new Date(detailLead.data_etapa).getTime()) / (1000 * 60 * 60 * 24))}d na etapa
                    </span>
                  )}
                </div>
              </div>

              {/* Acoes rapidas */}
              <div className="flex gap-2 p-4 border-b">
                <Button
                  size="sm"
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => {
                    if (detailLead.whatsapp_cache?.conversa_id) {
                      handleOpenChat(detailLead.whatsapp_cache.conversa_id);
                    } else {
                      handleOpenWhatsAppByPhone(detailLead);
                    }
                    setIsDetailOpen(false);
                  }}
                >
                  <MessageSquare className="h-4 w-4 mr-1" />
                  WhatsApp
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    navigate(`/leads/${detailLead.lead?.id}`);
                    setIsDetailOpen(false);
                  }}
                >
                  <ExternalLink className="h-4 w-4 mr-1" />
                  Ver Lead
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleAssignResponsavel(detailLead)}
                >
                  <UserPlus className="h-4 w-4" />
                </Button>
              </div>

              {/* Conteudo scrollavel */}
              <ScrollArea className="flex-1">
                <div className="p-4 space-y-5">
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Contato</h4>
                    {detailLead.lead?.telefone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{detailLead.lead.telefone}</span>
                      </div>
                    )}
                    {detailLead.lead?.email && (
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="truncate">{detailLead.lead.email}</span>
                      </div>
                    )}
                    {(detailLead.lead?.cidade || detailLead.lead?.estado) && (
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{[detailLead.lead?.cidade, detailLead.lead?.estado].filter(Boolean).join(' - ')}</span>
                      </div>
                    )}
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Funil de Vendas</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-lg bg-muted/50 p-3 text-center">
                        <DollarSign className="h-4 w-4 mx-auto text-green-600 mb-1" />
                        <div className="font-semibold text-sm">
                          {detailLead.valor_estimado ? formatCurrency(detailLead.valor_estimado) : 'R$ 0'}
                        </div>
                        <div className="text-[10px] text-muted-foreground">Valor estimado</div>
                      </div>
                      <div className="rounded-lg bg-muted/50 p-3 text-center">
                        <Users className="h-4 w-4 mx-auto text-blue-600 mb-1" />
                        <div className="font-semibold text-sm truncate">
                          {detailLead.responsavel?.nome || detailLead.responsavel?.full_name || 'Ninguem'}
                        </div>
                        <div className="text-[10px] text-muted-foreground">Responsavel</div>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</h4>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{detailLead.lead?.status || 'Novo'}</Badge>
                      {detailLead.data_entrada && (
                        <span className="text-xs text-muted-foreground">
                          Desde {format(new Date(detailLead.data_entrada), 'dd/MM/yyyy', { locale: ptBR })}
                        </span>
                      )}
                    </div>
                  </div>

                  {detailLead.observacoes && (
                    <>
                      <Separator />
                      <div className="space-y-2">
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Observacoes</h4>
                        <p className="text-sm text-muted-foreground">{detailLead.observacoes}</p>
                      </div>
                    </>
                  )}

                  {detailLead.whatsapp_cache?.ultima_mensagem && (
                    <>
                      <Separator />
                      <div className="space-y-2">
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Ultima Mensagem</h4>
                        <div className="rounded-lg bg-green-50 dark:bg-green-950/20 p-3 text-sm">
                          <p className="text-muted-foreground line-clamp-3">{detailLead.whatsapp_cache.ultima_mensagem}</p>
                          {detailLead.whatsapp_cache.ultima_mensagem_at && (
                            <p className="text-[10px] text-muted-foreground mt-1">
                              {format(new Date(detailLead.whatsapp_cache.ultima_mensagem_at), "dd/MM 'as' HH:mm", { locale: ptBR })}
                            </p>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </ScrollArea>

              {/* Footer com acoes */}
              <div className="border-t p-4 flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    navigate(`/leads/${detailLead.lead?.id}/editar`);
                    setIsDetailOpen(false);
                  }}
                >
                  Editar Lead
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    navigate(`/agendamentos/novo?leadId=${detailLead.lead?.id}`);
                    setIsDetailOpen(false);
                  }}
                >
                  <Calendar className="h-4 w-4 mr-1" />
                  Agendar
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
