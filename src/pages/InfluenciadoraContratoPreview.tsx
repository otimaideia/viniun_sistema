import { useState, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useInfluencerContractsMT, useContractHistoryMT } from "@/hooks/multitenant/useInfluencerContractsMT";
import { useInfluenciadorasAdapter } from "@/hooks/useInfluenciadorasAdapter";
import { useContractDocumentsMT } from "@/hooks/multitenant/useContractDocumentsMT";
import { useContractSignatureMT } from "@/hooks/multitenant/useContractSignatureMT";
import { useTenantContext } from "@/contexts/TenantContext";
import { ContratoTemplate, type TemplateTipo } from "@/components/influenciadoras/ContratoTemplate";
import { useFranchiseMT } from "@/hooks/multitenant/useFranchisesMT";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  FileText,
  Download,
  Send,
  QrCode,
  Eye,
  Check,
  Clock,
  AlertCircle,
  Loader2,
  Printer,
  XCircle,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { QRCodeSVG } from "qrcode.react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function InfluenciadoraContratoPreview() {
  const { influenciadoraId, contratoId } = useParams();
  const navigate = useNavigate();
  const { tenant } = useTenantContext();
  const { contracts, cancelContract } = useInfluencerContractsMT({ influencer_id: influenciadoraId });
  const { influenciadoras } = useInfluenciadorasAdapter();

  // Load franchise once we know the contract's franchise_id
  const contrato = contracts?.find(c => c.id === contratoId);
  const { data: franchiseData } = useFranchiseMT(contrato?.franchise_id ?? undefined);
  const {
    documents,
    isLoading: isLoadingDocs,
    saveDocumentMetadata,
    downloadDocument,
  } = useContractDocumentsMT(contratoId);
  const {
    accessLog,
    isLoading: isLoadingLog,
    initiateSignature,
  } = useContractSignatureMT(contratoId);

  const { data: contractHistory = [] } = useContractHistoryMT(contratoId);
  const aditivos = contractHistory.filter(h => h.tipo_alteracao === 'aditivo');

  const [showQRCode, setShowQRCode] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelMotivo, setCancelMotivo] = useState("");
  const [gerarDistrato, setGerarDistrato] = useState(true);
  const [activeTab, setActiveTab] = useState("principal");
  const [signatureLink, setSignatureLink] = useState<string | null>(null);
  const contratoRef = useRef<HTMLDivElement>(null);

  const influenciadora = influenciadoras?.find(i => i.id === influenciadoraId);
  const contratoDoc = documents?.find(d => d.tipo_documento === 'contrato_principal');
  const hasBeenSigned = accessLog?.some(log => log.acao === 'assinatura');

  // Template type resolved from contract
  const templateTipo = (contrato?.template_tipo as TemplateTipo | null) ??
    (contrato?.tipo === "permuta" ? "contrato_permuta" : "contrato_normal");

  // Preparar dados do contrato para o template
  const contratoData = contrato && influenciadora && tenant ? {
    // Template
    template_tipo: templateTipo,

    // Dados da Influenciadora (completo)
    influenciadora_nome: influenciadora.nome_completo || influenciadora.nome_artistico || influenciadora.nome || "",
    influenciadora_cpf: influenciadora.cpf || undefined,
    influenciadora_email: influenciadora.email || undefined,
    influenciadora_telefone: influenciadora.whatsapp || influenciadora.telefone || undefined,
    influenciadora_cidade: influenciadora.cidade || undefined,
    influenciadora_estado: influenciadora.estado || undefined,
    influenciadora_cep: influenciadora.cep || undefined,
    influenciadora_rua: influenciadora.endereco || undefined,
    influenciadora_numero: influenciadora.numero || undefined,
    influenciadora_bairro: influenciadora.bairro || undefined,
    influenciadora_rg: influenciadora.rg || undefined,
    influenciadora_estado_civil: influenciadora.estado_civil || undefined,
    influenciadora_profissao: influenciadora.profissao || undefined,
    influenciadora_naturalidade: influenciadora.naturalidade || undefined,

    // Dados do Contrato
    contrato_numero: `${tenant.slug?.toUpperCase() ?? "YLS"}-INF-${new Date(contrato.data_inicio).toISOString().substring(0, 7).replace("-", "")}-${contratoId?.substring(0, 4).toUpperCase()}`,
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

    // Dados da Empresa (Tenant = franqueadora)
    empresa_nome: tenant.nome_fantasia,
    empresa_cnpj: (tenant as any).cnpj || undefined,
    empresa_cidade: (tenant as any).cidade || undefined,
    empresa_estado: (tenant as any).estado || undefined,

    // Representante (franquia tem precedência)
    empresa_representante: (franchiseData as any)?.responsavel_nome?.trim() || undefined,

    // Franquia/Unidade (tem preferência sobre empresa para endereço no contrato)
    franquia_nome: franchiseData?.nome_fantasia || franchiseData?.nome || undefined,
    franquia_cnpj: franchiseData?.cnpj || undefined,
    franquia_endereco: franchiseData?.endereco || undefined,
    franquia_cidade: franchiseData?.cidade || undefined,
    franquia_estado: franchiseData?.estado || undefined,
    franquia_cep: (franchiseData as any)?.cep || undefined,

    // Menor de Idade / Responsável Legal
    eh_menor: influenciadora.eh_menor || false,
    responsavel_legal_nome: influenciadora.responsavel_legal_nome || undefined,
    responsavel_legal_cpf: influenciadora.responsavel_legal_cpf || undefined,
    responsavel_legal_rg: influenciadora.responsavel_legal_rg || undefined,
    responsavel_legal_parentesco: influenciadora.responsavel_legal_parentesco || undefined,
  } : null;

  const handleGenerateSignatureLink = async () => {
    if (!influenciadoraId || !contratoId) {
      toast.error("Dados incompletos");
      return;
    }

    try {
      const session = await initiateSignature.mutateAsync({
        contract_id: contratoId,
        influencer_id: influenciadoraId,
      });

      setSignatureLink(session.link_assinatura);
      setShowQRCode(true);

      // Copiar link automaticamente
      navigator.clipboard.writeText(session.link_assinatura);
      toast.success("Link copiado para área de transferência!");
    } catch (error) {
      console.error("Erro ao gerar link:", error);
    }
  };

  const handlePrint = async () => {
    if (!contratoRef.current || !influenciadora || !contrato || !tenant) {
      toast.error("Dados incompletos para gerar documento");
      return;
    }

    try {
      // Se ainda não tem documento cadastrado, salvar metadados
      if (!contratoDoc) {
        await saveDocumentMetadata.mutateAsync({
          contract_id: contratoId!,
          influencer_data: {
            id: influenciadora.id,
            nome: influenciadora.nome_completo,
            nome_artistico: influenciadora.nome_artistico,
            cpf: influenciadora.cpf || '',
            rg: influenciadora.cpf || '',
            endereco: '',
            cidade: influenciadora.cidade,
            estado: influenciadora.estado,
            cep: influenciadora.cep,
            email: influenciadora.email || '',
            telefone: influenciadora.telefone || influenciadora.whatsapp,
            instagram: influenciadora.nome_artistico,
            seguidores: influenciadora.total_seguidores,
          },
          contract_data: contrato,
          tenant_data: tenant,
        });
      }

      // Abrir janela de impressão (navegador converte HTML → PDF)
      window.print();

      toast.success("Abrindo diálogo de impressão...", {
        description: "Você pode salvar como PDF ou imprimir diretamente"
      });
    } catch (error) {
      console.error("Erro ao preparar documento:", error);
      // Mesmo com erro, permite imprimir
      window.print();
    }
  };

  if (!influenciadora || !contrato) {
    return (
      <DashboardLayout>
        <div className="container mx-auto py-6">
          <Skeleton className="h-8 w-64 mb-6" />
          <Skeleton className="h-96" />
        </div>
      </DashboardLayout>
    );
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; icon: any; label: string }> = {
      ativo: { variant: "default", icon: Check, label: "Assinado e Ativo" },
      pausado: { variant: "secondary", icon: Clock, label: "Aguardando Assinatura" },
      encerrado: { variant: "outline", icon: AlertCircle, label: "Encerrado" },
      cancelado: { variant: "destructive", icon: AlertCircle, label: "Cancelado" },
    };

    const config = variants[status] || variants.pausado;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant}>
        <Icon className="mr-1 h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto py-6 space-y-6">
        {/* Header */}
        <div className="mb-6">
          <Link to={`/influenciadoras/${influenciadoraId}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar para {influenciadora.nome_artistico || influenciadora.nome}
            </Button>
          </Link>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Preview do Contrato</h1>
            <p className="text-muted-foreground">
              Contrato {contrato.tipo} - {format(new Date(contrato.data_inicio), "dd/MM/yyyy")}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {getStatusBadge(contrato.status)}
            {(contrato.status === 'ativo' || contrato.status === 'pausado') && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowCancelDialog(true)}
              >
                <XCircle className="mr-2 h-4 w-4" />
                Cancelar Contrato
              </Button>
            )}
            <Button onClick={handlePrint} variant="outline" size="sm">
              <Printer className="mr-2 h-4 w-4" />
              Imprimir/Salvar PDF
            </Button>
          </div>
        </div>

        {/* Alerta de contrato cancelado */}
        {contrato.status === 'cancelado' && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="flex items-start gap-3 py-4">
              <XCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-red-800">Contrato Cancelado</p>
                <p className="text-sm text-red-600 mt-1">
                  Este contrato foi cancelado e não está mais ativo. Os procedimentos e créditos acordados foram encerrados.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Preview HTML do Contrato + Aditivos */}
        {contratoData && (
          <Card>
            <CardHeader>
              <CardTitle>Preview do Documento</CardTitle>
              <CardDescription>
                Visualize o contrato antes de gerar o PDF ou solicitar assinatura
                {aditivos.length > 0 && ` — ${aditivos.length} aditivo(s) registrado(s)`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {aditivos.length > 0 ? (
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="mb-4">
                    <TabsTrigger value="principal">Contrato Principal</TabsTrigger>
                    {aditivos.map((ad) => (
                      <TabsTrigger key={ad.id} value={`aditivo-${ad.aditivo_numero}`}>
                        Aditivo nº {ad.aditivo_numero}
                      </TabsTrigger>
                    ))}
                  </TabsList>

                  <TabsContent value="principal">
                    <div ref={contratoRef} className="border rounded-lg p-6 bg-white">
                      <ContratoTemplate data={contratoData} hideButtons={false} />
                    </div>
                  </TabsContent>

                  {aditivos.map((ad) => (
                    <TabsContent key={ad.id} value={`aditivo-${ad.aditivo_numero}`}>
                      <div className="border rounded-lg p-6 bg-white">
                        <ContratoTemplate
                          data={{
                            ...contratoData,
                            template_tipo: "aditivo",
                            aditivo_numero: ad.aditivo_numero || 1,
                            aditivo_descricao: ad.aditivo_descricao || ad.motivo || undefined,
                            aditivo_dados_anteriores: ad.dados_anteriores || undefined,
                            aditivo_dados_novos: ad.dados_novos || undefined,
                          }}
                          hideButtons={false}
                        />
                      </div>
                    </TabsContent>
                  ))}
                </Tabs>
              ) : (
                <div ref={contratoRef} className="border rounded-lg p-6 bg-white">
                  <ContratoTemplate data={contratoData} hideButtons={false} />
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Documento */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Documento do Contrato
              </CardTitle>
              <CardDescription>
                Gere e visualize o documento preenchido
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {contratoDoc ? (
                <>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileText className="h-8 w-8 text-primary" />
                      <div>
                        <p className="font-medium">{contratoDoc.nome_arquivo}</p>
                        <p className="text-sm text-muted-foreground">
                          {(contratoDoc.tamanho! / 1024).toFixed(2)} KB
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Gerado em {format(new Date(contratoDoc.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadDocument(contratoDoc)}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Baixar
                    </Button>
                  </div>

                  <div className="bg-muted p-3 rounded-md">
                    <p className="text-xs text-muted-foreground">
                      <strong>Hash:</strong> {contratoDoc.hash_arquivo?.substring(0, 16)}...
                    </p>
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground mb-4">
                    Nenhum documento gerado ainda
                  </p>
                  <Button
                    onClick={handlePrint}
                    disabled={saveDocumentMetadata.isPending}
                  >
                    {saveDocumentMetadata.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    <Printer className="mr-2 h-4 w-4" />
                    Visualizar e Imprimir
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Assinatura */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="h-5 w-5" />
                Link de Assinatura
              </CardTitle>
              <CardDescription>
                Envie o link para a influenciadora assinar digitalmente
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {hasBeenSigned ? (
                <div className="text-center py-8 bg-green-50 dark:bg-green-950 rounded-lg">
                  <Check className="h-12 w-12 text-green-600 mx-auto mb-3" />
                  <p className="font-medium text-green-700 dark:text-green-400">
                    Contrato assinado digitalmente
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {format(
                      new Date(accessLog.find(l => l.acao === 'assinatura')!.assinatura_data!),
                      "dd/MM/yyyy 'às' HH:mm",
                      { locale: ptBR }
                    )}
                  </p>
                </div>
              ) : (
                <>
                  <div className="text-center py-6">
                    {signatureLink ? (
                      <div className="space-y-3">
                        <QRCodeSVG
                          value={signatureLink}
                          size={200}
                          level="H"
                          className="mx-auto border-4 border-white shadow-lg"
                        />
                        <p className="text-xs text-muted-foreground">
                          Aponte a câmera para o QR Code
                        </p>
                      </div>
                    ) : (
                      <>
                        <Send className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                        <p className="text-sm text-muted-foreground mb-4">
                          Gere um link único para assinatura digital
                        </p>
                      </>
                    )}
                  </div>

                  <Button
                    onClick={handleGenerateSignatureLink}
                    disabled={initiateSignature.isPending || !contratoDoc}
                    className="w-full"
                  >
                    {initiateSignature.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {signatureLink ? "Regenerar Link" : "Gerar Link de Assinatura"}
                  </Button>

                  {!contratoDoc && (
                    <p className="text-xs text-muted-foreground text-center">
                      Gere o documento primeiro antes de solicitar assinatura
                    </p>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Histórico de Acessos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Histórico de Acessos
            </CardTitle>
            <CardDescription>
              Registro de todas as interações com este contrato
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingLog ? (
              <div className="space-y-3">
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
              </div>
            ) : accessLog.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-6">
                Nenhum acesso registrado
              </p>
            ) : (
              <div className="space-y-3">
                {accessLog.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-start justify-between p-3 border rounded-lg"
                  >
                    <div className="flex-1">
                      <p className="font-medium capitalize">
                        {log.acao.replace('_', ' ')}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(log.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                      {log.validacao_sucesso !== null && (
                        <Badge variant={log.validacao_sucesso ? "default" : "destructive"} className="mt-1">
                          {log.validacao_sucesso ? "Validação OK" : "Validação Falhou"}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialog de Cancelamento */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <XCircle className="h-5 w-5" />
              Cancelar Contrato
            </DialogTitle>
            <DialogDescription>
              Esta ação cancelará o contrato e notificará a influenciadora via WhatsApp.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Info de vigência */}
            {contrato && (() => {
              const diasVigencia = Math.floor(
                (new Date().getTime() - new Date(contrato.data_inicio).getTime()) / (1000 * 60 * 60 * 24)
              );
              const dentroCDC = diasVigencia <= 7;
              return (
                <div className={`p-3 rounded-lg border ${dentroCDC ? 'bg-blue-50 border-blue-200' : 'bg-amber-50 border-amber-200'}`}>
                  <p className="text-sm font-medium">
                    Vigência: {diasVigencia} dia(s)
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {dentroCDC
                      ? '✅ Dentro do prazo de arrependimento (CDC Art. 49 — até 7 dias). Cancelamento sem multa.'
                      : '⚠️ Fora do prazo de arrependimento. Aplica-se Cláusula 7 — aviso prévio de 30 dias.'}
                  </p>
                </div>
              );
            })()}

            <div className="space-y-2">
              <Label htmlFor="cancel-motivo">Motivo do cancelamento (empresa) *</Label>
              <Textarea
                id="cancel-motivo"
                placeholder="Descreva o motivo do cancelamento..."
                value={cancelMotivo}
                onChange={(e) => setCancelMotivo(e.target.value)}
                rows={3}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="gerar-distrato"
                checked={gerarDistrato}
                onCheckedChange={(checked) => setGerarDistrato(checked === true)}
              />
              <Label htmlFor="gerar-distrato" className="text-sm">
                Gerar documento de Distrato (termo de cancelamento bilateral)
              </Label>
            </div>

            <div className="bg-destructive/10 p-3 rounded-lg">
              <p className="text-xs text-destructive font-medium">
                Ao confirmar, o(a) influenciador(a) será notificado(a) via WhatsApp sobre o cancelamento
                e a perda dos procedimentos acordados.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowCancelDialog(false)}>
              Voltar
            </Button>
            <Button
              variant="destructive"
              disabled={!cancelMotivo.trim() || cancelContract.isPending}
              onClick={async () => {
                try {
                  await cancelContract.mutateAsync({
                    id: contrato!.id,
                    motivo: cancelMotivo.trim(),
                    solicitante: 'empresa',
                  });
                  setShowCancelDialog(false);
                  setCancelMotivo("");

                  if (gerarDistrato) {
                    navigate(`/influenciadoras/${influenciadoraId}/contratos/novo?template=distrato&ref=${contrato!.id}`);
                  }
                } catch (err) {
                  console.error('Erro ao cancelar contrato:', err);
                }
              }}
            >
              {cancelContract.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar Cancelamento
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog do QR Code */}
      <Dialog open={showQRCode} onOpenChange={setShowQRCode}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Link de Assinatura Gerado</DialogTitle>
            <DialogDescription>
              Compartilhe este QR Code ou link com a influenciadora
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center space-y-4 py-4">
            {signatureLink && (
              <>
                <QRCodeSVG
                  value={signatureLink}
                  size={256}
                  level="H"
                  className="border-4 border-white shadow-lg"
                />
                <div className="w-full p-3 bg-muted rounded-md">
                  <p className="text-xs break-all">{signatureLink}</p>
                </div>
                <Button
                  onClick={() => {
                    navigator.clipboard.writeText(signatureLink);
                    toast.success("Link copiado!");
                  }}
                  className="w-full"
                >
                  Copiar Link
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={async () => {
                    if (!contrato?.influencer_id || !tenant?.id) return;
                    try {
                      const { error } = await supabase.functions.invoke('send-contract-notification', {
                        body: {
                          influencerId: contrato.influencer_id,
                          contractId: contratoId,
                          tenantId: tenant.id,
                          franchiseId: contrato.franchise_id,
                          type: contrato.aditivos_count > 0 ? 'aditivo_gerado' : 'contrato_criado',
                          signatureUrl: signatureLink,
                          extra: contrato.aditivos_count > 0 ? { aditivo_numero: contrato.aditivos_count } : undefined,
                        },
                      });
                      if (error) throw error;
                      toast.success("Notificação enviada via WhatsApp e Email!");
                    } catch (err) {
                      toast.error("Erro ao enviar notificação");
                      console.error(err);
                    }
                  }}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Enviar via WhatsApp
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
