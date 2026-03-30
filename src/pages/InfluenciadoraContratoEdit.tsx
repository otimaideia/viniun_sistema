import { useState, useEffect } from "react";
import { useParams, useNavigate, Link, useSearchParams } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useInfluencerContractsMT } from "@/hooks/multitenant/useInfluencerContractsMT";
import { useInfluenciadorasAdapter } from "@/hooks/useInfluenciadorasAdapter";
import { useTenantContext } from "@/contexts/TenantContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Save, Loader2, FileText, Scissors, Sparkles, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { FranchiseSelector } from "@/components/multitenant/FranchiseSelector";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type {
  MTContractCreate,
  MTContractType,
  MTContractStatus,
} from "@/hooks/multitenant/useInfluencerContractsMT";
import { SERVICOS_DEPILACAO, SERVICOS_ESTETICA } from "@/components/influenciadoras/ContratoTemplate";

const TIPOS_CONTRATO: { value: MTContractType; label: string; description: string }[] = [
  { value: "mensal", label: "Mensal", description: "Pagamento fixo mensal" },
  { value: "por_post", label: "Por Post", description: "Valor por conteúdo produzido" },
  { value: "comissao", label: "Comissão", description: "% ou valor fixo por conversão" },
  { value: "permuta", label: "Permuta", description: "Troca por procedimentos estéticos" },
  { value: "misto", label: "Misto", description: "Combinação de modalidades" },
];

const TEMPLATE_TIPOS = [
  { value: "contrato_normal", label: "Contrato de Parceria (com pagamento)", description: "Para contratos mensal, por post, comissão ou misto" },
  { value: "contrato_permuta", label: "Contrato de Permuta (sem pagamento)", description: "Para parcerias apenas com procedimentos estéticos" },
  { value: "encerramento", label: "Notificação de Encerramento", description: "Para encerrar uma parceria existente" },
  { value: "distrato", label: "Termo de Distrato", description: "Cancelamento bilateral com quitação mútua" },
];

const STATUS_CONTRATO: { value: MTContractStatus; label: string }[] = [
  { value: "ativo", label: "Ativo" },
  { value: "pausado", label: "Pausado / Aguardando Assinatura" },
  { value: "encerrado", label: "Encerrado" },
  { value: "cancelado", label: "Cancelado" },
];

export default function InfluenciadoraContratoEdit() {
  const { influenciadoraId, contratoId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { tenant, franchise } = useTenantContext();
  const { contracts, createContract, updateContract } = useInfluencerContractsMT({
    influencer_id: influenciadoraId,
  });
  const { influenciadoras } = useInfluenciadorasAdapter();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFranchiseId, setSelectedFranchiseId] = useState<string | undefined>(franchise?.id);
  const [servicosSelecionados, setServicosSelecionados] = useState<string[]>([]);
  const [showAditivoDialog, setShowAditivoDialog] = useState(false);
  const [motivoAditivo, setMotivoAditivo] = useState("");
  const [formData, setFormData] = useState<Partial<MTContractCreate>>({
    tipo: "permuta",
    template_tipo: "contrato_permuta",
    status: "ativo",
    credito_permuta: 3000,
    posts_mes: 1,
    stories_mes: 10,
    reels_mes: 2,
    texto_contrato: null,
  });

  const isEditing = !!contratoId;
  const contrato = isEditing ? contracts?.find(c => c.id === contratoId) : null;
  const influenciadora = influenciadoras?.find(i => i.id === influenciadoraId);

  useEffect(() => {
    if (contrato) {
      setFormData({
        tipo: contrato.tipo,
        template_tipo: contrato.template_tipo || (contrato.tipo === "permuta" ? "contrato_permuta" : "contrato_normal"),
        data_inicio: contrato.data_inicio.split('T')[0],
        data_fim: contrato.data_fim?.split('T')[0] || undefined,
        valor_mensal: contrato.valor_mensal ?? undefined,
        valor_por_post: contrato.valor_por_post ?? undefined,
        percentual_comissao: contrato.percentual_comissao ?? undefined,
        valor_comissao_fixa: contrato.valor_comissao_fixa ?? undefined,
        credito_permuta: contrato.credito_permuta ?? undefined,
        posts_mes: contrato.posts_mes ?? 0,
        stories_mes: contrato.stories_mes ?? 0,
        reels_mes: contrato.reels_mes ?? 0,
        status: contrato.status,
        texto_contrato: contrato.texto_contrato ?? null,
      });
      setSelectedFranchiseId(contrato.franchise_id ?? undefined);
      setServicosSelecionados(contrato.servicos_permuta ?? []);
    }
  }, [contrato]);

  // Auto-selecionar template distrato quando vem do fluxo de cancelamento
  useEffect(() => {
    const templateParam = searchParams.get('template');
    if (templateParam === 'distrato' && !isEditing) {
      setFormData(prev => ({
        ...prev,
        template_tipo: 'distrato',
        data_inicio: new Date().toISOString().split('T')[0],
        status: 'cancelado' as any,
      }));
    }
  }, [searchParams, isEditing]);

  // Auto-selecionar TODOS os procedimentos (depilação + estética) ao criar contrato permuta
  useEffect(() => {
    if (!isEditing && formData.tipo === "permuta" && servicosSelecionados.length === 0) {
      setServicosSelecionados([...SERVICOS_DEPILACAO, ...SERVICOS_ESTETICA].map(s => s.id));
    }
  }, [isEditing, formData.tipo]);

  // Auto-ajustar template_tipo quando tipo de contrato muda
  const handleTipoChange = (tipo: MTContractType) => {
    const template = tipo === "permuta" ? "contrato_permuta" : "contrato_normal";
    setFormData(prev => ({ ...prev, tipo, template_tipo: template }));
  };

  const toggleServico = (id: string) => {
    setServicosSelecionados(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const buildContractData = (): MTContractCreate => ({
    influencer_id: influenciadoraId!,
    franchise_id: selectedFranchiseId ?? null,
    tipo: formData.tipo!,
    template_tipo: formData.template_tipo ?? "contrato_normal",
    data_inicio: formData.data_inicio!,
    data_fim: formData.data_fim ?? null,
    valor_mensal: formData.valor_mensal ?? null,
    valor_por_post: formData.valor_por_post ?? null,
    percentual_comissao: formData.percentual_comissao ?? null,
    valor_comissao_fixa: formData.valor_comissao_fixa ?? null,
    credito_permuta: formData.credito_permuta ?? null,
    posts_mes: formData.posts_mes ?? 0,
    stories_mes: formData.stories_mes ?? 0,
    reels_mes: formData.reels_mes ?? 0,
    status: formData.status ?? 'ativo',
    servicos_permuta: servicosSelecionados,
    texto_contrato: formData.texto_contrato ?? null,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!influenciadoraId || !tenant) {
      toast.error("Dados incompletos");
      return;
    }

    if (!formData.tipo || !formData.data_inicio) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }

    if (formData.template_tipo === "contrato_permuta" && servicosSelecionados.length === 0) {
      toast.error("Selecione pelo menos um procedimento para a permuta");
      return;
    }

    // Se editando contrato assinado → mostrar dialog de confirmação de aditivo
    if (isEditing && contrato?.assinado) {
      setShowAditivoDialog(true);
      return;
    }

    await doSave(false);
  };

  const doSave = async (gerarAditivo: boolean) => {
    setIsSubmitting(true);

    try {
      const contractData = buildContractData();

      if (isEditing && contratoId) {
        await updateContract.mutateAsync({
          id: contratoId,
          ...contractData,
          gerar_aditivo: gerarAditivo,
          motivo_aditivo: gerarAditivo ? motivoAditivo : undefined,
        });
      } else {
        await createContract.mutateAsync(contractData);
        toast.success("Contrato criado!");
      }

      navigate(`/influenciadoras/${influenciadoraId}`);
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar contrato");
    } finally {
      setIsSubmitting(false);
      setShowAditivoDialog(false);
    }
  };

  if (!influenciadora) {
    return (
      <DashboardLayout>
        <div className="container mx-auto py-6">
          <Skeleton className="h-8 w-64 mb-6" />
          <Skeleton className="h-96" />
        </div>
      </DashboardLayout>
    );
  }

  const isPermuta = formData.template_tipo === "contrato_permuta";
  const isEncerramento = formData.template_tipo === "encerramento";
  const isDistrato = formData.template_tipo === "distrato";

  return (
    <DashboardLayout>
      <div className="container mx-auto py-6 max-w-3xl">
        <div className="mb-6">
          <Link to={`/influenciadoras/${influenciadoraId}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar para {influenciadora.nome_artistico || influenciadora.nome_completo}
            </Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {isEditing ? "Editar" : "Novo"} Contrato
            </CardTitle>
            <CardDescription>
              {isEditing ? "Atualizar" : "Criar"} contrato para{" "}
              <strong>{influenciadora.nome_artistico || influenciadora.nome_completo}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">

              {/* ─── Tipo de Documento ─────────────────────────────────────── */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">Tipo de Documento *</Label>
                <div className="grid gap-3">
                  {TEMPLATE_TIPOS.map((t) => (
                    <label
                      key={t.value}
                      className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                        formData.template_tipo === t.value
                          ? "border-[#662E8E] bg-[#662E8E]/5"
                          : "border-border hover:border-[#662E8E]/40"
                      }`}
                    >
                      <input
                        type="radio"
                        name="template_tipo"
                        value={t.value}
                        checked={formData.template_tipo === t.value}
                        onChange={() => setFormData(prev => ({ ...prev, template_tipo: t.value }))}
                        className="mt-1"
                      />
                      <div>
                        <div className="font-medium text-sm">{t.label}</div>
                        <div className="text-xs text-muted-foreground">{t.description}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* ─── Tipo de Contrato (apenas para não-encerramento) ────────── */}
              {!isEncerramento && !isDistrato && (
                <div className="space-y-2">
                  <Label htmlFor="tipo">Modalidade do Contrato *</Label>
                  <Select
                    value={formData.tipo}
                    onValueChange={(v) => handleTipoChange(v as MTContractType)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a modalidade" />
                    </SelectTrigger>
                    <SelectContent>
                      {TIPOS_CONTRATO.map((tipo) => (
                        <SelectItem key={tipo.value} value={tipo.value}>
                          <span className="font-medium">{tipo.label}</span>
                          <span className="text-muted-foreground ml-1 text-xs">– {tipo.description}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* ─── Franquia ──────────────────────────────────────────────── */}
              <div className="space-y-2">
                <Label>Unidade / Franquia</Label>
                <FranchiseSelector
                  variant="select"
                  value={selectedFranchiseId}
                  onValueChange={setSelectedFranchiseId}
                  showClear
                  placeholder="Global (Franqueadora)"
                />
                <p className="text-xs text-muted-foreground">
                  A unidade selecionada aparecerá no contrato como CONTRATANTE
                </p>
              </div>

              {/* ─── Datas ─────────────────────────────────────────────────── */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="data_inicio">
                    {isEncerramento ? "Data da Notificação *" : isDistrato ? "Data do Distrato *" : "Data de Início *"}
                  </Label>
                  <Input
                    id="data_inicio"
                    type="date"
                    value={formData.data_inicio || ""}
                    onChange={(e) => setFormData({ ...formData, data_inicio: e.target.value })}
                    required
                  />
                </div>
                {!isEncerramento && !isDistrato && (
                  <div className="space-y-2">
                    <Label htmlFor="data_fim">Data de Término</Label>
                    <Input
                      id="data_fim"
                      type="date"
                      value={formData.data_fim || ""}
                      onChange={(e) => setFormData({ ...formData, data_fim: e.target.value })}
                    />
                  </div>
                )}
              </div>

              {/* ─── Serviços de Permuta ────────────────────────────────────── */}
              {isPermuta && (
                <div className="space-y-4 p-4 border border-[#662E8E]/30 rounded-lg bg-[#662E8E]/5">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-[#662E8E]" />
                    <Label className="text-base font-semibold text-[#662E8E]">
                      Procedimentos Incluídos na Permuta
                    </Label>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Selecione os procedimentos que serão oferecidos em troca do conteúdo
                  </p>

                  {!isEditing && (
                    <div className="flex items-center gap-2 text-xs text-purple-600 bg-purple-50 px-3 py-1.5 rounded-md">
                      <Sparkles className="h-3 w-3" />
                      Plano Básico (3 áreas de depilação) pré-selecionado — você pode adicionar ou remover procedimentos
                    </div>
                  )}

                  {/* Depilação a Laser */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <Scissors className="h-3.5 w-3.5" />
                      Depilação a Laser
                    </div>
                    <div className="grid grid-cols-1 gap-2 pl-5">
                      {SERVICOS_DEPILACAO.map((s) => (
                        <label key={s.id} className="flex items-center gap-2 cursor-pointer">
                          <Checkbox
                            checked={servicosSelecionados.includes(s.id)}
                            onCheckedChange={() => toggleServico(s.id)}
                          />
                          <span className="text-sm">{s.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Procedimentos Estéticos */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <Sparkles className="h-3.5 w-3.5" />
                      Procedimentos Estéticos
                    </div>
                    <div className="grid grid-cols-1 gap-2 pl-5">
                      {SERVICOS_ESTETICA.map((s) => (
                        <label key={s.id} className="flex items-center gap-2 cursor-pointer">
                          <Checkbox
                            checked={servicosSelecionados.includes(s.id)}
                            onCheckedChange={() => toggleServico(s.id)}
                          />
                          <span className="text-sm">{s.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {servicosSelecionados.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-2 border-t">
                      {servicosSelecionados.map(id => {
                        const found = [...SERVICOS_DEPILACAO, ...SERVICOS_ESTETICA].find(s => s.id === id);
                        return (
                          <Badge key={id} variant="secondary" className="text-xs">
                            {found?.label ?? id}
                          </Badge>
                        );
                      })}
                    </div>
                  )}

                  {/* Valor total da permuta */}
                  <div className="space-y-2 pt-2 border-t">
                    <Label htmlFor="credito_permuta">Valor Total em Créditos (R$)</Label>
                    <Input
                      id="credito_permuta"
                      type="number"
                      step="0.01"
                      value={formData.credito_permuta || ""}
                      onChange={(e) => setFormData({ ...formData, credito_permuta: parseFloat(e.target.value) || undefined })}
                      placeholder="Ex: 500,00"
                    />
                    <p className="text-xs text-muted-foreground">
                      Valor monetário equivalente dos procedimentos oferecidos em permuta
                    </p>
                  </div>
                </div>
              )}

              {/* ─── Valores (apenas para contratos com pagamento) ─────────── */}
              {!isPermuta && !isEncerramento && !isDistrato && (
                <>
                  {formData.tipo === "mensal" && (
                    <div className="space-y-2">
                      <Label htmlFor="valor_mensal">Valor Mensal (R$)</Label>
                      <Input
                        id="valor_mensal"
                        type="number"
                        step="0.01"
                        value={formData.valor_mensal || ""}
                        onChange={(e) => setFormData({ ...formData, valor_mensal: parseFloat(e.target.value) })}
                        placeholder="0,00"
                      />
                    </div>
                  )}

                  {formData.tipo === "por_post" && (
                    <div className="space-y-2">
                      <Label htmlFor="valor_por_post">Valor por Post (R$)</Label>
                      <Input
                        id="valor_por_post"
                        type="number"
                        step="0.01"
                        value={formData.valor_por_post || ""}
                        onChange={(e) => setFormData({ ...formData, valor_por_post: parseFloat(e.target.value) })}
                        placeholder="0,00"
                      />
                    </div>
                  )}

                  {formData.tipo === "comissao" && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="percentual_comissao">Percentual (%)</Label>
                        <Input
                          id="percentual_comissao"
                          type="number"
                          step="0.01"
                          value={formData.percentual_comissao || ""}
                          onChange={(e) => setFormData({ ...formData, percentual_comissao: parseFloat(e.target.value) })}
                          placeholder="0,00"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="valor_comissao_fixa">Ou Valor Fixo (R$)</Label>
                        <Input
                          id="valor_comissao_fixa"
                          type="number"
                          step="0.01"
                          value={formData.valor_comissao_fixa || ""}
                          onChange={(e) => setFormData({ ...formData, valor_comissao_fixa: parseFloat(e.target.value) })}
                          placeholder="0,00"
                        />
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* ─── Metas de Conteúdo (não para encerramento) ─────────────── */}
              {!isEncerramento && !isDistrato && (
                <div>
                  <Label className="text-base mb-3 block">Metas de Conteúdo Mensal</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="posts_mes">Posts</Label>
                      <Input
                        id="posts_mes"
                        type="number"
                        min="0"
                        value={formData.posts_mes ?? 0}
                        onChange={(e) => setFormData({ ...formData, posts_mes: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="stories_mes">Stories</Label>
                      <Input
                        id="stories_mes"
                        type="number"
                        min="0"
                        value={formData.stories_mes ?? 0}
                        onChange={(e) => setFormData({ ...formData, stories_mes: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reels_mes">Reels</Label>
                      <Input
                        id="reels_mes"
                        type="number"
                        min="0"
                        value={formData.reels_mes ?? 0}
                        onChange={(e) => setFormData({ ...formData, reels_mes: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ─── Status ────────────────────────────────────────────────── */}
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value as MTContractStatus })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_CONTRATO.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* ─── Texto do Contrato ─────────────────────────────────────── */}
              <div className="space-y-2">
                <Label htmlFor="texto_contrato">Texto do Contrato (opcional)</Label>
                <Textarea
                  id="texto_contrato"
                  value={formData.texto_contrato || ""}
                  onChange={(e) => setFormData({ ...formData, texto_contrato: e.target.value || null })}
                  placeholder="Se preenchido, este texto será exibido para a influenciadora ler antes de assinar. Se deixar em branco, o contrato será gerado automaticamente com base nas condições acima."
                  rows={10}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Opcional. Se não preenchido, o sistema gera o contrato automaticamente com base nas condições definidas acima.
                </p>
              </div>

              {/* ─── Ações ─────────────────────────────────────────────────── */}
              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvando...</>
                  ) : (
                    <><Save className="mr-2 h-4 w-4" />{isEditing ? "Atualizar" : "Criar"} Contrato</>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(`/influenciadoras/${influenciadoraId}`)}
                  disabled={isSubmitting}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
      {/* Dialog de Confirmação de Aditivo Contratual */}
      <AlertDialog open={showAditivoDialog} onOpenChange={setShowAditivoDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Gerar Aditivo Contratual
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  Este contrato já foi assinado. As alterações serão registradas como{" "}
                  <strong>Aditivo Contratual nº {(contrato?.aditivos_count || 0) + 1}</strong>{" "}
                  e o contrato precisará ser assinado novamente.
                </p>
                <div className="space-y-2">
                  <Label htmlFor="motivo-aditivo">Motivo do aditivo *</Label>
                  <Textarea
                    id="motivo-aditivo"
                    placeholder="Descreva o motivo das alterações..."
                    value={motivoAditivo}
                    onChange={(e) => setMotivoAditivo(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => doSave(true)}
              disabled={!motivoAditivo.trim() || isSubmitting}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Gerar Aditivo nº {(contrato?.aditivos_count || 0) + 1}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
