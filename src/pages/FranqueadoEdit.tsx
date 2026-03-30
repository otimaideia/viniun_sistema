import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useFranqueadosAdapter } from "@/hooks/useFranqueadosAdapter";
import { useDiretoriasAdapter } from "@/hooks/useDiretoriasAdapter";
import { useServicosAdapter } from "@/hooks/useServicosAdapter";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Franqueado, FRANQUEADO_STATUS, ESTADOS_BRASIL } from "@/types/franqueado";
import { useServiceCategoriesMT } from "@/hooks/multitenant/useServiceCategoriesMT";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Loader2, Save, Briefcase, Building2, FolderTree } from "lucide-react";
import { toast } from "sonner";

const emptyForm: Partial<Franqueado> = {
  status: "Em configuração",
  nome_fantasia: "",
  diretoria_id: null,
  endereco: "",
  cep: "",
  cidade: "",
  estado: "",
  responsavel: "",
  relacionamento: "",
  whatsapp_business: "",
  cnpj: "",
  email: "",
  senha_email: "",
  google_ads_id: "",
  id_metrica: "",
  meu_negocio: "",
  youtube: "",
  google_tags_conectadas: false,
  google_vinc_mcc: false,
  facebook: "",
  facebook_pagina: "",
  instagram: "",
  senha_instagram: "",
  meta_ads_id: "",
  meta_tags_conectadas: false,
  meta_vinc_mcc: false,
  conversoes_personalizadas: false,
  publico_personalizado: false,
  tiktok: "",
  tiktok_ads: "",
  tiktok_senha: "",
  tiktok_id: "",
  tiktok_tags_conectadas: false,
  tiktok_vinc_mcc: false,
  landing_page_nova: "",
  landing_page_site: "",
  site_tags_conectadas: false,
  cadastro_kinghost: false,
  acoes_realizadas: "",
};

export default function FranqueadoEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = !!id;

  const { franqueados, isLoading, createFranqueado, updateFranqueado, isCreating, isUpdating } = useFranqueadosAdapter();
  const { diretorias, isLoading: loadingDiretorias } = useDiretoriasAdapter();
  const { servicos, franqueadoServicos, updateFranqueadoServicosAsync, isLoading: loadingServicos } = useServicosAdapter();
  const { getCategoryLabel } = useServiceCategoriesMT();

  const [form, setForm] = useState<Partial<Franqueado>>(emptyForm);
  const [selectedServicos, setSelectedServicos] = useState<string[]>([]);

  const franqueado = franqueados.find((f) => f.id === id);

  // Agrupar serviços por categoria
  const servicosPorCategoria = servicos.reduce((acc, servico) => {
    const cat = servico.categoria || "outros";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(servico);
    return acc;
  }, {} as Record<string, typeof servicos>);

  useEffect(() => {
    if (isEditing && franqueado) {
      setForm(franqueado);
      const vinculos = franqueadoServicos.filter(v => v.franqueado_id === franqueado.id);
      setSelectedServicos(vinculos.map(v => v.servico_id));
    } else if (!isEditing) {
      setForm(emptyForm);
      setSelectedServicos([]);
    }
  }, [franqueado, franqueadoServicos, isEditing]);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-[600px]" />
        </div>
      </DashboardLayout>
    );
  }

  if (isEditing && !franqueado) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-12">
          <h2 className="text-xl font-semibold text-foreground mb-2">Franqueado não encontrado</h2>
          <p className="text-muted-foreground mb-4">O franqueado solicitado não existe ou foi removido.</p>
          <Button onClick={() => navigate("/franqueados")}>Voltar para Franqueados</Button>
        </div>
      </DashboardLayout>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome_fantasia?.trim()) {
      toast.error("Nome Fantasia é obrigatório");
      return;
    }

    try {
      if (isEditing && franqueado) {
        // Atualiza o franqueado
        await new Promise<void>((resolve, reject) => {
          updateFranqueado(
            { id: franqueado.id, ...form },
            { onSuccess: () => resolve(), onError: reject }
          );
        });
        
        // Atualiza os serviços
        await updateFranqueadoServicosAsync({ 
          franqueadoId: franqueado.id, 
          servicoIds: selectedServicos 
        });
        
        toast.success("Franqueado e serviços atualizados!");
      } else {
        createFranqueado(form);
      }
      
      navigate("/franqueados");
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast.error("Erro ao salvar alterações");
    }
  };

  const toggleServico = (servicoId: string) => {
    setSelectedServicos(prev =>
      prev.includes(servicoId)
        ? prev.filter(id => id !== servicoId)
        : [...prev, servicoId]
    );
  };

  const toggleCategoria = (categoria: string) => {
    const servicosCategoria = servicosPorCategoria[categoria] || [];
    const servicoIds = servicosCategoria.map(s => s.id);
    const allSelected = servicoIds.every(id => selectedServicos.includes(id));

    if (allSelected) {
      setSelectedServicos(prev => prev.filter(id => !servicoIds.includes(id)));
    } else {
      setSelectedServicos(prev => [...new Set([...prev, ...servicoIds])]);
    }
  };

  const updateField = (field: keyof Franqueado, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const isSaving = isCreating || isUpdating;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/franqueados")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                {isEditing ? "Editar Franqueado" : "Novo Franqueado"}
              </h1>
              {isEditing && (
                <p className="text-sm text-muted-foreground">{franqueado?.nome_fantasia}</p>
              )}
            </div>
          </div>
        </div>

        {/* Form */}
        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit}>
              <Tabs defaultValue="geral" className="w-full">
                <TabsList className="grid w-full grid-cols-6">
                  <TabsTrigger value="geral">Geral</TabsTrigger>
                  <TabsTrigger value="servicos" className="flex items-center gap-1">
                    <Briefcase className="h-3 w-3" />
                    Serviços
                  </TabsTrigger>
                  <TabsTrigger value="google">Google</TabsTrigger>
                  <TabsTrigger value="meta">Meta</TabsTrigger>
                  <TabsTrigger value="tiktok">TikTok</TabsTrigger>
                  <TabsTrigger value="site">Site/LP</TabsTrigger>
                </TabsList>

                <ScrollArea className="h-[60vh] mt-4 pr-4">
                  <TabsContent value="geral" className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Status</Label>
                        <Select
                          value={form.status || ""}
                          onValueChange={(v) => updateField("status", v)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            {FRANQUEADO_STATUS.map((s) => (
                              <SelectItem key={s} value={s}>{s}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>ID API</Label>
                        <Input
                          type="number"
                          value={form.id_api || ""}
                          onChange={(e) => updateField("id_api", e.target.value ? Number(e.target.value) : null)}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <FolderTree className="h-4 w-4" />
                        Diretoria Regional
                      </Label>
                      <Select
                        value={form.diretoria_id || "none"}
                        onValueChange={(v) => updateField("diretoria_id", v === "none" ? null : v)}
                        disabled={loadingDiretorias}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione uma diretoria" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Sem diretoria vinculada</SelectItem>
                          {diretorias
                            .filter(d => d.is_active)
                            .map((d) => (
                              <SelectItem key={d.id} value={d.id}>
                                {d.nome} {d.regiao ? `(${d.regiao})` : ""}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        A diretoria é responsável pela gestão regional desta unidade
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>Nome Fantasia *</Label>
                      <Input
                        value={form.nome_fantasia || ""}
                        onChange={(e) => updateField("nome_fantasia", e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Endereço</Label>
                      <Input
                        value={form.endereco || ""}
                        onChange={(e) => updateField("endereco", e.target.value)}
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>CEP</Label>
                        <Input
                          value={form.cep || ""}
                          onChange={(e) => updateField("cep", e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Cidade</Label>
                        <Input
                          value={form.cidade || ""}
                          onChange={(e) => updateField("cidade", e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Estado</Label>
                        <Select
                          value={form.estado || ""}
                          onValueChange={(v) => updateField("estado", v)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="UF" />
                          </SelectTrigger>
                          <SelectContent>
                            {ESTADOS_BRASIL.map((uf) => (
                              <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Responsável</Label>
                        <Input
                          value={form.responsavel || ""}
                          onChange={(e) => updateField("responsavel", e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Relacionamento</Label>
                        <Input
                          value={form.relacionamento || ""}
                          onChange={(e) => updateField("relacionamento", e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>WhatsApp Business</Label>
                        <Input
                          value={form.whatsapp_business || ""}
                          onChange={(e) => updateField("whatsapp_business", e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>CNPJ</Label>
                        <Input
                          value={form.cnpj || ""}
                          onChange={(e) => updateField("cnpj", e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Email</Label>
                        <Input
                          type="email"
                          value={form.email || ""}
                          onChange={(e) => updateField("email", e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Senha Email</Label>
                        <Input
                          type="password"
                          value={form.senha_email || ""}
                          onChange={(e) => updateField("senha_email", e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Ações Realizadas</Label>
                      <Textarea
                        value={form.acoes_realizadas || ""}
                        onChange={(e) => updateField("acoes_realizadas", e.target.value)}
                        rows={3}
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="servicos" className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium">Serviços Oferecidos</h3>
                        <p className="text-sm text-muted-foreground">
                          Selecione os serviços que esta unidade oferece
                        </p>
                      </div>
                      <Badge variant="secondary">
                        {selectedServicos.length} selecionados
                      </Badge>
                    </div>

                    {loadingServicos ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin" />
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {Object.entries(servicosPorCategoria).map(([categoria, servicosCategoria]) => {
                          const servicoIds = servicosCategoria.map(s => s.id);
                          const selectedCount = servicoIds.filter(id => selectedServicos.includes(id)).length;
                          const allSelected = selectedCount === servicoIds.length;

                          return (
                            <div key={categoria} className="space-y-3">
                              <div className="flex items-center justify-between border-b pb-2">
                                <div className="flex items-center gap-2">
                                  <Checkbox
                                    checked={allSelected}
                                    onCheckedChange={() => toggleCategoria(categoria)}
                                  />
                                  <Label className="font-semibold cursor-pointer" onClick={() => toggleCategoria(categoria)}>
                                    {getCategoryLabel(categoria)}
                                  </Label>
                                </div>
                                <Badge variant="outline" className="text-xs">
                                  {selectedCount}/{servicosCategoria.length}
                                </Badge>
                              </div>
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pl-6">
                                {servicosCategoria.map((servico) => (
                                  <div key={servico.id} className="flex items-center space-x-2">
                                    <Checkbox
                                      id={`servico-${servico.id}`}
                                      checked={selectedServicos.includes(servico.id)}
                                      onCheckedChange={() => toggleServico(servico.id)}
                                    />
                                    <label
                                      htmlFor={`servico-${servico.id}`}
                                      className="text-sm cursor-pointer truncate"
                                      title={servico.nome}
                                    >
                                      {servico.nome}
                                    </label>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {!isEditing && (
                      <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded-md">
                        ⚠️ Os serviços serão vinculados após salvar o franqueado pela primeira vez.
                      </p>
                    )}
                  </TabsContent>

                  <TabsContent value="google" className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Google Ads ID</Label>
                        <Input
                          value={form.google_ads_id || ""}
                          onChange={(e) => updateField("google_ads_id", e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>ID da Métrica</Label>
                        <Input
                          value={form.id_metrica || ""}
                          onChange={(e) => updateField("id_metrica", e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Meu Negócio</Label>
                        <Input
                          value={form.meu_negocio || ""}
                          onChange={(e) => updateField("meu_negocio", e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>YouTube</Label>
                        <Input
                          value={form.youtube || ""}
                          onChange={(e) => updateField("youtube", e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={form.google_tags_conectadas || false}
                          onCheckedChange={(v) => updateField("google_tags_conectadas", v)}
                        />
                        <Label>Tags Conectadas</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={form.google_vinc_mcc || false}
                          onCheckedChange={(v) => updateField("google_vinc_mcc", v)}
                        />
                        <Label>Vinculado a MCC</Label>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="meta" className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Facebook</Label>
                        <Input
                          value={form.facebook || ""}
                          onChange={(e) => updateField("facebook", e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Página Facebook</Label>
                        <Input
                          value={form.facebook_pagina || ""}
                          onChange={(e) => updateField("facebook_pagina", e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Instagram</Label>
                        <Input
                          value={form.instagram || ""}
                          onChange={(e) => updateField("instagram", e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Senha Instagram</Label>
                        <Input
                          type="password"
                          value={form.senha_instagram || ""}
                          onChange={(e) => updateField("senha_instagram", e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Meta Ads ID</Label>
                      <Input
                        value={form.meta_ads_id || ""}
                        onChange={(e) => updateField("meta_ads_id", e.target.value)}
                      />
                    </div>

                    <div className="flex flex-wrap items-center gap-6">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={form.meta_tags_conectadas || false}
                          onCheckedChange={(v) => updateField("meta_tags_conectadas", v)}
                        />
                        <Label>Tags Conectadas</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={form.meta_vinc_mcc || false}
                          onCheckedChange={(v) => updateField("meta_vinc_mcc", v)}
                        />
                        <Label>Vinculado a MCC</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={form.conversoes_personalizadas || false}
                          onCheckedChange={(v) => updateField("conversoes_personalizadas", v)}
                        />
                        <Label>Conversões Personalizadas</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={form.publico_personalizado || false}
                          onCheckedChange={(v) => updateField("publico_personalizado", v)}
                        />
                        <Label>Público Personalizado</Label>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="tiktok" className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>TikTok</Label>
                        <Input
                          value={form.tiktok || ""}
                          onChange={(e) => updateField("tiktok", e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>TikTok Ads</Label>
                        <Input
                          value={form.tiktok_ads || ""}
                          onChange={(e) => updateField("tiktok_ads", e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>TikTok ID</Label>
                        <Input
                          value={form.tiktok_id || ""}
                          onChange={(e) => updateField("tiktok_id", e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Senha TikTok</Label>
                        <Input
                          type="password"
                          value={form.tiktok_senha || ""}
                          onChange={(e) => updateField("tiktok_senha", e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={form.tiktok_tags_conectadas || false}
                          onCheckedChange={(v) => updateField("tiktok_tags_conectadas", v)}
                        />
                        <Label>Tags Conectadas</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={form.tiktok_vinc_mcc || false}
                          onCheckedChange={(v) => updateField("tiktok_vinc_mcc", v)}
                        />
                        <Label>Vinculado a MCC</Label>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="site" className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Landing Page Nova</Label>
                        <Input
                          value={form.landing_page_nova || ""}
                          onChange={(e) => updateField("landing_page_nova", e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Landing Page Site</Label>
                        <Input
                          value={form.landing_page_site || ""}
                          onChange={(e) => updateField("landing_page_site", e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={form.site_tags_conectadas || false}
                          onCheckedChange={(v) => updateField("site_tags_conectadas", v)}
                        />
                        <Label>Tags Conectadas</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={form.cadastro_kinghost || false}
                          onCheckedChange={(v) => updateField("cadastro_kinghost", v)}
                        />
                        <Label>Cadastro KingHost</Label>
                      </div>
                    </div>
                  </TabsContent>
                </ScrollArea>

                <div className="flex justify-end gap-3 pt-4 border-t mt-4">
                  <Button type="button" variant="outline" onClick={() => navigate("/franqueados")}>
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
                        Salvar
                      </>
                    )}
                  </Button>
                </div>
              </Tabs>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
