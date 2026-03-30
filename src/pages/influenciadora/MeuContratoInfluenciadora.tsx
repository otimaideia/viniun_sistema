import { useState, useRef } from 'react';
import { useInfluenciadoraAuthContext } from '@/contexts/InfluenciadoraAuthContext';
import { InfluenciadoraLayout } from '@/components/influenciadora-portal/InfluenciadoraLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  FileText,
  CheckCircle2,
  Clock,
  DollarSign,
  Repeat,
  Image,
  Calendar,
  AlertCircle,
  Loader2,
  Sparkles,
  Printer,
  Eye,
  EyeOff,
  XCircle,
  ShieldAlert,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ContratoTemplate, TODOS_SERVICOS, type ContratoData, type TemplateTipo } from '@/components/influenciadoras/ContratoTemplate';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatCurrency } from '@/types/influenciadora';

const TIPO_LABELS: Record<string, string> = {
  mensal: 'Pagamento Mensal',
  por_post: 'Por Post',
  comissao: 'Comissão por Indicação',
  permuta: 'Permuta (Procedimentos)',
  misto: 'Modelo Misto',
};

const STATUS_COLORS: Record<string, string> = {
  ativo: 'bg-green-100 text-green-700 border-green-200',
  pendente: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  encerrado: 'bg-gray-100 text-gray-600 border-gray-200',
  cancelado: 'bg-red-100 text-red-700 border-red-200',
};

export default function MeuContratoInfluenciadora() {
  const { influenciadora } = useInfluenciadoraAuthContext();
  const queryClient = useQueryClient();
  const [showContrato, setShowContrato] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelMotivo, setCancelMotivo] = useState('');
  const [aceitoTermos, setAceitoTermos] = useState(false);
  const contratoRef = useRef<HTMLDivElement>(null);

  const { data: contrato, isLoading, error } = useQuery({
    queryKey: ['meu-contrato', influenciadora?.id],
    queryFn: async () => {
      if (!influenciadora?.id) return null;

      const { data, error } = await supabase
        .from('mt_influencer_contracts')
        .select('*')
        .eq('influencer_id', influenciadora.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!influenciadora?.id,
  });

  // Fetch tenant data for the contract template
  const { data: tenant } = useQuery({
    queryKey: ['meu-contrato-tenant', contrato?.tenant_id],
    queryFn: async () => {
      if (!contrato?.tenant_id) return null;
      const { data, error } = await supabase
        .from('mt_tenants')
        .select('*')
        .eq('id', contrato.tenant_id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!contrato?.tenant_id,
  });

  // Fetch franchise data for the contract template
  const { data: franchise } = useQuery({
    queryKey: ['meu-contrato-franchise', contrato?.franchise_id],
    queryFn: async () => {
      if (!contrato?.franchise_id) return null;
      const { data, error } = await supabase
        .from('mt_franchises')
        .select('*')
        .eq('id', contrato.franchise_id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!contrato?.franchise_id,
  });

  // Calcular dias de vigência
  const diasVigencia = contrato?.data_inicio
    ? Math.floor((new Date().getTime() - new Date(contrato.data_inicio).getTime()) / (1000 * 60 * 60 * 24))
    : 0;
  const dentroPrazoCDC = diasVigencia <= 7;

  // Mutation para cancelar contrato (lado influenciadora)
  const cancelContractMutation = useMutation({
    mutationFn: async ({ motivo }: { motivo: string }) => {
      if (!contrato?.id) throw new Error('Contrato não encontrado');

      // 1. Atualizar status
      const { error: updateError } = await supabase
        .from('mt_influencer_contracts')
        .update({ status: 'cancelado', updated_at: new Date().toISOString() })
        .eq('id', contrato.id);
      if (updateError) throw updateError;

      // 2. Registrar no histórico
      const { error: histError } = await supabase
        .from('mt_influencer_contract_history')
        .insert({
          tenant_id: contrato.tenant_id,
          contract_id: contrato.id,
          tipo_alteracao: 'cancelamento_influenciadora',
          status_anterior: contrato.status,
          status_novo: 'cancelado',
          motivo,
          dados_novos: {
            dias_vigencia: diasVigencia,
            dentro_prazo_cdc: dentroPrazoCDC,
            solicitante: 'influenciadora',
            base_legal: dentroPrazoCDC
              ? 'CDC Art. 49 - Direito de Arrependimento (Lei nº 8.078/90)'
              : 'Cláusula 7 - Aviso Prévio 30 dias',
          },
        });
      if (histError) console.error('Erro ao registrar histórico:', histError);

      // 3. Suspender acesso ao portal
      await supabase
        .from('mt_influencers')
        .update({ status: 'suspenso', updated_at: new Date().toISOString() })
        .eq('id', contrato.influencer_id);

      // 4. Notificar empresa via WhatsApp (fire-and-forget)
      supabase.functions.invoke('send-contract-notification', {
        body: {
          influencerId: contrato.influencer_id,
          contractId: contrato.id,
          tenantId: contrato.tenant_id,
          franchiseId: contrato.franchise_id,
          type: 'cancelamento_influenciadora',
          extra: {
            motivo,
            solicitante: 'influenciadora',
            dias_vigencia: diasVigencia,
            dentro_prazo_cdc: dentroPrazoCDC,
            influencer_nome: (influenciadora as any)?.nome_artistico || influenciadora?.nome || 'Influenciadora',
          },
        },
      }).catch(err => console.error('[notify] Erro:', err));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meu-contrato'] });
      setShowCancelDialog(false);
      setCancelMotivo('');
      setAceitoTermos(false);
      toast.success(
        dentroPrazoCDC
          ? 'Contrato cancelado conforme Lei nº 8.078/90, Art. 49 (Direito de Arrependimento).'
          : 'Cancelamento solicitado. Prazo de aviso prévio: 30 dias.'
      );
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erro ao cancelar contrato');
    },
  });

  const handlePrint = () => {
    window.print();
  };

  // Build ContratoData for the template
  const contratoData: ContratoData | null = contrato && influenciadora ? {
    template_tipo: (contrato.template_tipo as TemplateTipo) ??
      (contrato.tipo === 'permuta' ? 'contrato_permuta' : 'contrato_normal'),

    // Influencer data
    influenciadora_nome: (influenciadora as any).nome_completo || influenciadora.nome || '',
    influenciadora_cpf: (influenciadora as any).cpf || undefined,
    influenciadora_rg: (influenciadora as any).rg || undefined,
    influenciadora_email: influenciadora.email || undefined,
    influenciadora_telefone: (influenciadora as any).whatsapp || influenciadora.telefone || undefined,
    influenciadora_rua: (influenciadora as any).endereco || undefined,
    influenciadora_numero: (influenciadora as any).numero || undefined,
    influenciadora_bairro: (influenciadora as any).bairro || undefined,
    influenciadora_cep: (influenciadora as any).cep || undefined,
    influenciadora_cidade: (influenciadora as any).cidade || undefined,
    influenciadora_estado: (influenciadora as any).estado || undefined,

    // Contract data
    contrato_numero: `${tenant?.slug?.toUpperCase() ?? 'YLS'}-INF-${contrato.data_inicio ? new Date(contrato.data_inicio).toISOString().substring(0, 7).replace('-', '') : 'XXXX'}-${contrato.id?.substring(0, 4).toUpperCase()}`,
    contrato_tipo: contrato.tipo,
    data_inicio: contrato.data_inicio,
    data_fim: contrato.data_fim,
    valor_mensal: contrato.valor_mensal,
    valor_por_post: contrato.valor_por_post,
    percentual_comissao: contrato.percentual_comissao,
    valor_comissao_fixa: contrato.valor_comissao_fixa,
    credito_permuta: contrato.credito_permuta,
    posts_mes: contrato.posts_mes,
    stories_mes: contrato.stories_mes,
    reels_mes: contrato.reels_mes,
    servicos_permuta: contrato.servicos_permuta ?? [],

    // Company data
    empresa_nome: tenant?.nome_fantasia || 'YESlaser',
    empresa_cnpj: (tenant as any)?.cnpj || undefined,
    empresa_cidade: (tenant as any)?.cidade || undefined,
    empresa_estado: (tenant as any)?.estado || undefined,

    // Representative
    empresa_representante: (franchise as any)?.responsavel_nome?.trim() || undefined,

    // Franchise data
    franquia_nome: franchise?.nome_fantasia || franchise?.nome || undefined,
    franquia_cnpj: (franchise as any)?.cnpj || undefined,
    franquia_endereco: (franchise as any)?.endereco || undefined,
    franquia_cidade: (franchise as any)?.cidade || undefined,
    franquia_estado: (franchise as any)?.estado || undefined,
    franquia_cep: (franchise as any)?.cep || undefined,
  } : null;

  if (isLoading) {
    return (
      <InfluenciadoraLayout>
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-[#662E8E]" />
        </div>
      </InfluenciadoraLayout>
    );
  }

  if (error) {
    return (
      <InfluenciadoraLayout>
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <AlertCircle className="h-12 w-12 text-red-500" />
          <h3 className="text-lg font-semibold text-gray-900">Erro ao carregar contrato</h3>
          <p className="text-muted-foreground max-w-sm">
            Não foi possível carregar os dados do seu contrato. Tente novamente mais tarde.
          </p>
        </div>
      </InfluenciadoraLayout>
    );
  }

  return (
    <InfluenciadoraLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Meu Contrato</h1>
          <p className="text-muted-foreground">Detalhes do seu contrato com a YESlaser</p>
        </div>

        {!contrato ? (
          <Card>
            <CardContent className="py-12 flex flex-col items-center gap-3 text-center">
              <AlertCircle className="h-12 w-12 text-yellow-500" />
              <h3 className="text-lg font-semibold">Nenhum contrato ativo</h3>
              <p className="text-muted-foreground max-w-sm">
                Você ainda não tem um contrato vinculado. Nossa equipe entrará em contato em breve para formalizar a parceria.
              </p>
              <Badge variant="outline" className="mt-2 bg-yellow-50 text-yellow-700 border-yellow-200">
                Aguardando contrato
              </Badge>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Status e tipo */}
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-[#662E8E]/10">
                      <FileText className="h-6 w-6 text-[#662E8E]" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">
                        {TIPO_LABELS[contrato.tipo] || contrato.tipo}
                      </CardTitle>
                      <CardDescription>
                        Contrato de influenciadora YESlaser
                      </CardDescription>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={STATUS_COLORS[contrato.status] || 'bg-gray-100 text-gray-600'}
                  >
                    {contrato.status === 'ativo' ? (
                      <><CheckCircle2 className="h-3 w-3 mr-1" /> Ativo</>
                    ) : contrato.status === 'pendente' || contrato.status === 'pausado' ? (
                      <><Clock className="h-3 w-3 mr-1" /> Pendente</>
                    ) : contrato.status === 'cancelado' ? (
                      <><XCircle className="h-3 w-3 mr-1" /> Cancelado</>
                    ) : contrato.status === 'encerrado' ? (
                      <><AlertCircle className="h-3 w-3 mr-1" /> Encerrado</>
                    ) : (
                      contrato.status
                    )}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Alerta de contrato cancelado/encerrado */}
                {contrato.status === 'cancelado' && (
                  <div className="p-4 rounded-lg bg-red-50 border border-red-200 flex items-start gap-3">
                    <XCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-red-800">Contrato Cancelado</p>
                      <p className="text-sm text-red-600 mt-1">
                        Este contrato foi cancelado e não está mais ativo. Os procedimentos e créditos acordados foram encerrados.
                      </p>
                    </div>
                  </div>
                )}
                {contrato.status === 'encerrado' && (
                  <div className="p-4 rounded-lg bg-gray-50 border border-gray-200 flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-gray-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-gray-800">Contrato Encerrado</p>
                      <p className="text-sm text-gray-600 mt-1">
                        Este contrato foi encerrado. Agradecemos pela parceria!
                      </p>
                    </div>
                  </div>
                )}

                {/* Datas */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg bg-gray-50 space-y-1">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> Início
                    </p>
                    <p className="font-medium text-sm">
                      {contrato.data_inicio
                        ? format(new Date(contrato.data_inicio), "dd/MM/yyyy", { locale: ptBR })
                        : '—'}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-gray-50 space-y-1">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> Término
                    </p>
                    <p className="font-medium text-sm">
                      {contrato.data_fim
                        ? format(new Date(contrato.data_fim), "dd/MM/yyyy", { locale: ptBR })
                        : 'Indeterminado'}
                    </p>
                  </div>
                </div>

                {/* Valores */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {(contrato.valor_mensal ?? 0) > 0 && (
                    <div className="p-3 rounded-lg border space-y-1">
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <DollarSign className="h-3 w-3" /> Valor Mensal
                      </p>
                      <p className="font-bold text-[#662E8E]">{formatCurrency(contrato.valor_mensal)}</p>
                    </div>
                  )}
                  {(contrato.valor_por_post ?? 0) > 0 && (
                    <div className="p-3 rounded-lg border space-y-1">
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Image className="h-3 w-3" /> Valor por Post
                      </p>
                      <p className="font-bold text-[#662E8E]">{formatCurrency(contrato.valor_por_post)}</p>
                    </div>
                  )}
                  {(contrato.percentual_comissao ?? 0) > 0 && (
                    <div className="p-3 rounded-lg border space-y-1">
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <DollarSign className="h-3 w-3" /> Comissão por Indicação
                      </p>
                      <p className="font-bold text-[#662E8E]">{contrato.percentual_comissao}%</p>
                    </div>
                  )}
                  {(contrato.valor_comissao_fixa ?? 0) > 0 && (
                    <div className="p-3 rounded-lg border space-y-1">
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <DollarSign className="h-3 w-3" /> Comissão Fixa
                      </p>
                      <p className="font-bold text-[#662E8E]">{formatCurrency(contrato.valor_comissao_fixa)}</p>
                    </div>
                  )}
                  {(contrato.credito_permuta ?? 0) > 0 && (
                    <div className="p-3 rounded-lg border space-y-1">
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Repeat className="h-3 w-3" /> Crédito Permuta
                      </p>
                      <p className="font-bold text-[#662E8E]">{formatCurrency(contrato.credito_permuta)}</p>
                    </div>
                  )}
                </div>

                {/* Serviços de permuta */}
                {contrato.tipo === 'permuta' && (contrato as any).servicos_permuta?.length > 0 && (
                  <div className="p-4 rounded-lg bg-purple-50 border border-purple-100">
                    <p className="text-sm font-medium text-purple-800 mb-3 flex items-center gap-1">
                      <Sparkles className="h-4 w-4" /> Procedimentos incluídos na permuta
                    </p>
                    <ul className="space-y-1.5">
                      {((contrato as any).servicos_permuta as string[]).map((id: string) => {
                        const servico = TODOS_SERVICOS.find(s => s.id === id);
                        return (
                          <li key={id} className="flex items-center gap-2 text-sm text-purple-700">
                            <CheckCircle2 className="h-3.5 w-3.5 text-purple-500 flex-shrink-0" />
                            {servico?.label ?? id}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}

                {/* Entregas mensais */}
                {((contrato.posts_mes ?? 0) > 0 || (contrato.stories_mes ?? 0) > 0 || (contrato.reels_mes ?? 0) > 0) && (
                  <div className="p-4 rounded-lg bg-purple-50 border border-purple-100">
                    <p className="text-sm font-medium text-purple-800 mb-3 flex items-center gap-1">
                      <Image className="h-4 w-4" /> Entregas mensais
                    </p>
                    <div className="grid grid-cols-3 gap-3">
                      {(contrato.posts_mes ?? 0) > 0 && (
                        <div className="text-center">
                          <p className="text-2xl font-bold text-purple-700">{contrato.posts_mes}</p>
                          <p className="text-xs text-purple-600">Posts</p>
                        </div>
                      )}
                      {(contrato.stories_mes ?? 0) > 0 && (
                        <div className="text-center">
                          <p className="text-2xl font-bold text-purple-700">{contrato.stories_mes}</p>
                          <p className="text-xs text-purple-600">Stories</p>
                        </div>
                      )}
                      {(contrato.reels_mes ?? 0) > 0 && (
                        <div className="text-center">
                          <p className="text-2xl font-bold text-purple-700">{contrato.reels_mes}</p>
                          <p className="text-xs text-purple-600">Reels</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Assinatura */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                  <div className="flex items-center gap-2">
                    {contrato.assinado ? (
                      <>
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                        <span className="text-sm text-green-700">
                          Assinado em {contrato.assinado_em
                            ? format(new Date(contrato.assinado_em), "dd/MM/yyyy", { locale: ptBR })
                            : '—'}
                        </span>
                      </>
                    ) : (
                      <>
                        <Clock className="h-5 w-5 text-yellow-500" />
                        <span className="text-sm text-yellow-700">Aguardando assinatura</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Botões de ação */}
                <div className="flex flex-wrap gap-2 pt-2">
                  <Button
                    variant={showContrato ? "default" : "outline"}
                    className="gap-2"
                    onClick={() => setShowContrato(!showContrato)}
                  >
                    {showContrato ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    {showContrato ? 'Ocultar Contrato' : 'Ver Contrato Completo'}
                  </Button>
                  {showContrato && (
                    <Button
                      variant="outline"
                      className="gap-2"
                      onClick={handlePrint}
                    >
                      <Printer className="h-4 w-4" />
                      Imprimir / Salvar PDF
                    </Button>
                  )}
                  {contrato.status === 'ativo' && (
                    <Button
                      variant="destructive"
                      className="gap-2"
                      onClick={() => setShowCancelDialog(true)}
                    >
                      <XCircle className="h-4 w-4" />
                      Solicitar Cancelamento
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Preview do contrato completo */}
            {showContrato && contratoData && (
              <Card className="print:shadow-none print:border-none">
                <CardContent className="p-6 print:p-0" ref={contratoRef}>
                  <ContratoTemplate data={contratoData} hideButtons />
                </CardContent>
              </Card>
            )}
          </>
        )}
        {/* Dialog de Cancelamento — Influenciadora */}
        <Dialog open={showCancelDialog} onOpenChange={(open) => {
          setShowCancelDialog(open);
          if (!open) { setCancelMotivo(''); setAceitoTermos(false); }
        }}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-destructive flex items-center gap-2">
                <ShieldAlert className="h-5 w-5" />
                Solicitar Cancelamento
              </DialogTitle>
              <DialogDescription>
                Leia atentamente as informações abaixo antes de prosseguir.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {/* Info jurídica */}
              {dentroPrazoCDC ? (
                <div className="p-4 rounded-lg bg-blue-50 border border-blue-200 space-y-2">
                  <p className="text-sm font-semibold text-blue-800 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    Direito de Arrependimento
                  </p>
                  <p className="text-sm text-blue-700">
                    Conforme o <strong>Art. 49 do Código de Defesa do Consumidor (Lei nº 8.078/90)</strong>,
                    você tem o direito de desistir do contrato no prazo de <strong>7 dias</strong> a contar
                    da assinatura, sem necessidade de justificativa e sem aplicação de multa.
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    Vigência atual: {diasVigencia} dia(s) — Dentro do prazo legal.
                  </p>
                </div>
              ) : (
                <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 space-y-2">
                  <p className="text-sm font-semibold text-amber-800 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    Aviso Prévio de 30 Dias
                  </p>
                  <p className="text-sm text-amber-700">
                    Conforme a <strong>Cláusula 7ª do seu contrato</strong>, o cancelamento requer
                    aviso prévio de <strong>30 (trinta) dias</strong>. Durante este período, suas
                    obrigações contratuais permanecem ativas.
                  </p>
                  <p className="text-xs text-amber-600 mt-1">
                    Vigência atual: {diasVigencia} dia(s) — Fora do prazo de arrependimento.
                  </p>
                </div>
              )}

              {/* Aviso sobre perda de procedimentos */}
              {contrato && contrato.tipo === 'permuta' && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                  <p className="text-sm text-red-700">
                    <strong>Atenção:</strong> Ao cancelar, você perderá os procedimentos estéticos
                    acordados na permuta que ainda não foram realizados.
                  </p>
                </div>
              )}

              {/* Motivo */}
              <div className="space-y-2">
                <Label htmlFor="cancel-motivo-portal">
                  Motivo do cancelamento {dentroPrazoCDC ? '(opcional)' : '*'}
                </Label>
                <Textarea
                  id="cancel-motivo-portal"
                  placeholder="Descreva o motivo do cancelamento..."
                  value={cancelMotivo}
                  onChange={(e) => setCancelMotivo(e.target.value)}
                  rows={3}
                />
              </div>

              {/* Aceite dos termos */}
              <div className="flex items-start space-x-2">
                <Checkbox
                  id="aceito-termos-cancel"
                  checked={aceitoTermos}
                  onCheckedChange={(checked) => setAceitoTermos(checked === true)}
                />
                <Label htmlFor="aceito-termos-cancel" className="text-sm leading-tight">
                  {dentroPrazoCDC
                    ? 'Li e compreendo que estou exercendo meu direito de arrependimento conforme Art. 49 da Lei nº 8.078/90 (CDC).'
                    : 'Li e aceito os termos do cancelamento com aviso prévio de 30 dias, conforme Cláusula 7ª do contrato.'}
                </Label>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowCancelDialog(false)}>
                Voltar
              </Button>
              <Button
                variant="destructive"
                disabled={
                  !aceitoTermos ||
                  (!dentroPrazoCDC && !cancelMotivo.trim()) ||
                  cancelContractMutation.isPending
                }
                onClick={() => {
                  cancelContractMutation.mutate({
                    motivo: cancelMotivo.trim() || (dentroPrazoCDC ? 'Direito de arrependimento (CDC Art. 49)' : ''),
                  });
                }}
              >
                {cancelContractMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirmar Cancelamento
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </InfluenciadoraLayout>
  );
}
