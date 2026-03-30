import { useState } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { safeGetInitials } from '@/utils/unicodeSanitizer';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import {
  Phone,
  Mail,
  MapPin,
  Calendar,
  Clock,
  MessageCircle,
  DollarSign,
  User,
  History,
  FileText,
  Send,
  ExternalLink,
  Building2,
  Tag,
  ArrowRight,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { cleanPhoneNumber } from '@/utils/phone';
import { sanitizeObjectForJSON } from '@/utils/unicodeSanitizer';
import type { FunilLeadExpanded, FunilHistorico, FunilEtapa } from '@/types/funil';

interface KanbanCardDetailProps {
  lead: FunilLeadExpanded | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  etapas?: FunilEtapa[];
  onOpenChat?: (conversaId: string) => void;
  onMoveToEtapa?: (leadId: string, etapaId: string) => void;
}

export function KanbanCardDetail({
  lead,
  open,
  onOpenChange,
  etapas = [],
  onOpenChat,
  onMoveToEtapa,
}: KanbanCardDetailProps) {
  const [observacao, setObservacao] = useState('');
  const queryClient = useQueryClient();

  // Buscar histórico do lead
  const { data: historico = [] } = useQuery({
    queryKey: ['funil-historico', lead?.id],
    queryFn: async () => {
      if (!lead?.id) return [];

      const { data, error } = await supabase
        .from('mt_funnel_stage_history')
        .select(`
          *,
          stage:mt_funnel_stages!stage_id(nome, cor),
          next_stage:mt_funnel_stages!next_stage_id(nome, cor),
          mover:mt_users!moved_by(nome)
        `)
        .eq('funnel_lead_id', lead.id)
        .order('entered_at', { ascending: false });

      if (error) throw error;

      // Transformar para formato compatível com UI e sanitizar Unicode
      return (data || []).map((item: any) => sanitizeObjectForJSON({
        ...item,
        // Se tem next_stage_id: transição (stage=origem, next_stage=destino)
        // Se não tem: entrada inicial (stage=destino, sem origem)
        etapa_origem: item.next_stage_id
          ? (Array.isArray(item.stage) ? item.stage[0] : item.stage)
          : null,
        etapa_destino: item.next_stage_id
          ? (Array.isArray(item.next_stage) ? item.next_stage[0] : item.next_stage)
          : (Array.isArray(item.stage) ? item.stage[0] : item.stage),
        usuario: Array.isArray(item.mover) ? item.mover[0] : item.mover,
        motivo: item.move_reason,
      })) as (FunilHistorico & {
        etapa_origem: { nome: string; cor: string } | null;
        etapa_destino: { nome: string; cor: string };
        usuario: { nome: string } | null;
      })[];
    },
    enabled: !!lead?.id && open,
  });

  // Mutation para salvar observação
  const saveObservacao = useMutation({
    mutationFn: async () => {
      if (!lead?.id || !observacao.trim()) return;

      const { error } = await supabase
        .from('mt_funnel_leads')
        .update({
          observacoes: lead.observacoes
            ? `${lead.observacoes}\n\n[${format(new Date(), 'dd/MM/yyyy HH:mm')}]\n${observacao}`
            : `[${format(new Date(), 'dd/MM/yyyy HH:mm')}]\n${observacao}`,
          updated_at: new Date().toISOString(),
        })
        .eq('id', lead.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Observação salva!');
      setObservacao('');
      queryClient.invalidateQueries({ queryKey: ['funil-leads'] });
    },
    onError: () => {
      toast.error('Erro ao salvar observação');
    },
  });

  if (!lead) return null;

  const leadData = lead.lead;
  const whatsappCache = lead.whatsapp_cache;
  const diasNaEtapa = lead.data_etapa
    ? Math.floor(
        (new Date().getTime() - new Date(lead.data_etapa).getTime()) /
          (1000 * 60 * 60 * 24)
      )
    : 0;

  // Usa safeGetInitials para evitar surrogates órfãos com emojis

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatPhone = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
    }
    return phone;
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-hidden flex flex-col">
        <SheetHeader className="flex-shrink-0">
          <div className="flex items-start gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={whatsappCache?.avatar_url || undefined} />
              <AvatarFallback className="text-lg">
                {safeGetInitials(leadData?.nome || 'LD')}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-xl truncate">
                {leadData?.nome || 'Lead'}
              </SheetTitle>
              <SheetDescription className="flex items-center gap-2 mt-1">
                <Building2 className="h-4 w-4" />
                {leadData?.unidade || 'Sem unidade'}
              </SheetDescription>
              <div className="flex items-center gap-2 mt-2">
                {lead.valor_estimado && (
                  <Badge variant="outline" className="text-green-600 border-green-200">
                    <DollarSign className="h-3 w-3 mr-1" />
                    {formatCurrency(lead.valor_estimado)}
                  </Badge>
                )}
                <Badge variant="secondary">
                  <Clock className="h-3 w-3 mr-1" />
                  {diasNaEtapa} dias na etapa
                </Badge>
                {whatsappCache && (
                  <Badge
                    variant="outline"
                    className="text-green-600 border-green-200 cursor-pointer"
                    onClick={() =>
                      whatsappCache.conversa_id && onOpenChat?.(whatsappCache.conversa_id)
                    }
                  >
                    <MessageCircle className="h-3 w-3 mr-1" />
                    WhatsApp
                    {whatsappCache.unread_count > 0 && (
                      <span className="ml-1 bg-green-600 text-white text-xs rounded-full px-1.5">
                        {whatsappCache.unread_count}
                      </span>
                    )}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </SheetHeader>

        <Tabs defaultValue="info" className="flex-1 flex flex-col overflow-hidden mt-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="info">Info</TabsTrigger>
            <TabsTrigger value="historico">Histórico</TabsTrigger>
            <TabsTrigger value="notas">Notas</TabsTrigger>
            <TabsTrigger value="acoes">Ações</TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 mt-4">
            {/* Tab Info */}
            <TabsContent value="info" className="m-0 space-y-4">
              {/* Contato */}
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-muted-foreground">Contato</h4>
                <div className="space-y-2">
                  {leadData?.telefone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <a
                        href={`tel:${leadData.telefone}`}
                        className="text-sm hover:underline"
                      >
                        {formatPhone(leadData.telefone)}
                      </a>
                    </div>
                  )}
                  {leadData?.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <a
                        href={`mailto:${leadData.email}`}
                        className="text-sm hover:underline"
                      >
                        {leadData.email}
                      </a>
                    </div>
                  )}
                  {leadData?.cidade && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{leadData.cidade}</span>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Responsável */}
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-muted-foreground">Responsável</h4>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    {lead.responsavel?.full_name || 'Não atribuído'}
                  </span>
                </div>
              </div>

              <Separator />

              {/* Datas */}
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-muted-foreground">Datas</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      Entrou no funil:{' '}
                      {lead.data_entrada
                        ? format(new Date(lead.data_entrada), "dd/MM/yyyy 'às' HH:mm", {
                            locale: ptBR,
                          })
                        : '-'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      Entrou na etapa:{' '}
                      {lead.data_etapa
                        ? format(new Date(lead.data_etapa), "dd/MM/yyyy 'às' HH:mm", {
                            locale: ptBR,
                          })
                        : '-'}
                    </span>
                  </div>
                  {leadData?.created_at && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        Lead cadastrado:{' '}
                        {format(new Date(leadData.created_at), "dd/MM/yyyy 'às' HH:mm", {
                          locale: ptBR,
                        })}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Tags */}
              {lead.tags && lead.tags.length > 0 && (
                <>
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm text-muted-foreground">Tags</h4>
                    <div className="flex flex-wrap gap-1">
                      {lead.tags.map((tag, idx) => (
                        <Badge key={idx} variant="secondary">
                          <Tag className="h-3 w-3 mr-1" />
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <Separator />
                </>
              )}

              {/* WhatsApp Preview */}
              {whatsappCache?.ultima_mensagem && (
                <div className="space-y-2">
                  <h4 className="font-medium text-sm text-muted-foreground">
                    Última mensagem WhatsApp
                  </h4>
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-sm">{whatsappCache.ultima_mensagem}</p>
                    {whatsappCache.ultima_mensagem_at && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(whatsappCache.ultima_mensagem_at), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </p>
                    )}
                  </div>
                  {whatsappCache.conversa_id && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => onOpenChat?.(whatsappCache.conversa_id!)}
                    >
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Abrir conversa completa
                      <ExternalLink className="h-3 w-3 ml-2" />
                    </Button>
                  )}
                </div>
              )}

              {/* Link para página do lead */}
              {leadData?.id && (
                <Button variant="outline" asChild className="w-full">
                  <a href={`/leads/${leadData.id}`} target="_blank" rel="noopener noreferrer">
                    <FileText className="h-4 w-4 mr-2" />
                    Ver ficha completa do lead
                    <ExternalLink className="h-3 w-3 ml-2" />
                  </a>
                </Button>
              )}
            </TabsContent>

            {/* Tab Histórico */}
            <TabsContent value="historico" className="m-0 space-y-3">
              {historico.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Nenhuma movimentação registrada</p>
                </div>
              ) : (
                historico.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg"
                  >
                    <div className="p-2 rounded-full bg-primary/10">
                      <ArrowRight className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {item.etapa_origem && (
                          <>
                            <Badge
                              variant="outline"
                              style={{
                                borderColor: item.etapa_origem.cor,
                                color: item.etapa_origem.cor,
                              }}
                            >
                              {item.etapa_origem.nome}
                            </Badge>
                            <ArrowRight className="h-3 w-3 text-muted-foreground" />
                          </>
                        )}
                        <Badge
                          style={{
                            backgroundColor: item.etapa_destino.cor,
                            color: 'white',
                          }}
                        >
                          {item.etapa_destino.nome}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <span>
                          {format(new Date(item.created_at), "dd/MM/yyyy 'às' HH:mm", {
                            locale: ptBR,
                          })}
                        </span>
                        {item.usuario && <span>• {item.usuario.nome}</span>}
                        {item.motivo && <span>• {item.motivo}</span>}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </TabsContent>

            {/* Tab Notas */}
            <TabsContent value="notas" className="m-0 space-y-4">
              <div className="space-y-2">
                <Textarea
                  placeholder="Adicione uma observação sobre este lead..."
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                  rows={3}
                />
                <Button
                  size="sm"
                  onClick={() => saveObservacao.mutate()}
                  disabled={!observacao.trim() || saveObservacao.isPending}
                >
                  <Send className="h-4 w-4 mr-2" />
                  {saveObservacao.isPending ? 'Salvando...' : 'Salvar observação'}
                </Button>
              </div>

              {lead.observacoes && (
                <div className="space-y-2">
                  <h4 className="font-medium text-sm text-muted-foreground">
                    Observações anteriores
                  </h4>
                  <div className="bg-muted/30 rounded-lg p-3 whitespace-pre-wrap text-sm">
                    {lead.observacoes}
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Tab Ações */}
            <TabsContent value="acoes" className="m-0 space-y-4">
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-muted-foreground">
                  Mover para etapa
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  {etapas
                    .filter((e) => e.id !== lead.etapa_id)
                    .map((etapa) => (
                      <Button
                        key={etapa.id}
                        variant="outline"
                        size="sm"
                        className="justify-start"
                        style={{
                          borderColor: etapa.cor,
                        }}
                        onClick={() => {
                          onMoveToEtapa?.(lead.id, etapa.id);
                          onOpenChange(false);
                        }}
                      >
                        <div
                          className="w-2 h-2 rounded-full mr-2"
                          style={{ backgroundColor: etapa.cor }}
                        />
                        {etapa.nome}
                      </Button>
                    ))}
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <h4 className="font-medium text-sm text-muted-foreground">
                  Ações rápidas
                </h4>
                <div className="space-y-2">
                  {leadData?.telefone && (
                    <Button variant="outline" size="sm" className="w-full justify-start" asChild>
                      <a
                        href={`https://wa.me/${(leadData as any).telefone_codigo_pais || '55'}${cleanPhoneNumber(leadData.telefone)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <MessageCircle className="h-4 w-4 mr-2 text-green-600" />
                        Abrir WhatsApp Web
                      </a>
                    </Button>
                  )}
                  {leadData?.telefone && (
                    <Button variant="outline" size="sm" className="w-full justify-start" asChild>
                      <a href={`tel:${leadData.telefone}`}>
                        <Phone className="h-4 w-4 mr-2" />
                        Ligar para o lead
                      </a>
                    </Button>
                  )}
                  {leadData?.email && (
                    <Button variant="outline" size="sm" className="w-full justify-start" asChild>
                      <a href={`mailto:${leadData.email}`}>
                        <Mail className="h-4 w-4 mr-2" />
                        Enviar e-mail
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
