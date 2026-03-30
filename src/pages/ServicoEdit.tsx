import { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useServicosAdapter, useServicoAdapter } from '@/hooks/useServicosAdapter';
import { useServicoImagensAdapter } from '@/hooks/useServicoImagensAdapter';
import { useServiceCategoriesMT } from '@/hooks/multitenant/useServiceCategoriesMT';
import { ServicoImageGallery } from '@/components/servicos/ServicoImageGallery';
import { CategoryManagement } from '@/components/servicos/CategoryManagement';
import { Badge } from '@/components/ui/badge';
import { Servico } from '@/types/servico';
import { toast } from 'sonner';
import { ArrowLeft, Clock, Loader2, Save, Sparkles, ShoppingBag, ChevronDown, Globe, Link2, Calculator, DollarSign, Plus, AlertTriangle, Info } from 'lucide-react';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

interface ImageItem {
  id?: string;
  url: string;
  ordem: number;
  legenda?: string | null;
}

function formatDuracao(minutos: number | null): string {
  if (!minutos) return '';
  if (minutos < 60) return `${minutos}min`;
  const horas = Math.floor(minutos / 60);
  const mins = minutos % 60;
  return mins > 0 ? `${horas}h ${mins}min` : `${horas}h`;
}

export default function ServicoEdit() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isEditing = !!id;
  const tipoParam = searchParams.get('tipo') as 'servico' | 'produto' | null;

  // Hook para carregar serviço individual (evita loop infinito do array servicos)
  const { servico: servicoData, isLoading: isLoadingServico } = useServicoAdapter(id);

  const {
    createServico,
    updateServico,
    isCreating,
    isUpdating,
  } = useServicosAdapter();

  const {
    getImagensByServico,
    replaceAllImagensAsync,
    isLoadingAll: isLoadingImagens,
    isReplacing,
  } = useServicoImagensAdapter();

  const { categories, getCategoriesByTipo, isLoading: isLoadingCategories } = useServiceCategoriesMT();
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [formLoaded, setFormLoaded] = useState(false);
  const [servico, setServico] = useState<Servico | null>(null);
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    categoria: '',
    duracao_minutos: '',
    ativo: true,
    tipo: (tipoParam || 'servico') as 'servico' | 'produto',
    // Campos de Produto (Meta Commerce / Google Business)
    sku: '',
    marca: '',
    preco: '',
    preco_promocional: '',
    gtin: '',
    condicao: 'new' as 'new' | 'refurbished' | 'used',
    disponibilidade: 'in_stock' as 'in_stock' | 'out_of_stock' | 'preorder',
    url: '',
    // Campos de integração
    meta_catalog_id: '',
    google_category: '',
    // Precos de referencia
    preco_tabela_maior: '',
    preco_tabela_menor: '',
  });
  const [galleryImages, setGalleryImages] = useState<ImageItem[]>([]);
  const [hasFormChanges, setHasFormChanges] = useState(false);
  const [showIntegracao, setShowIntegracao] = useState(false);
  const isProduto = formData.tipo === 'produto';

  // Load existing service data if editing (only once to avoid overwriting user edits)
  useEffect(() => {
    if (!isLoadingServico && servicoData && !formLoaded) {
      setServico(servicoData);
      setFormLoaded(true);
      setFormData({
        nome: servicoData.nome,
        descricao: servicoData.descricao || '',
        categoria: servicoData.categoria || '',
        duracao_minutos: servicoData.duracao_minutos?.toString() || '',
        ativo: servicoData.ativo ?? servicoData.is_active,
        tipo: servicoData.tipo || 'servico',
        sku: servicoData.sku || '',
        marca: servicoData.marca || '',
        preco: servicoData.preco?.toString() || '',
        preco_promocional: servicoData.preco_promocional?.toString() || '',
        gtin: servicoData.gtin || '',
        condicao: servicoData.condicao || 'new',
        disponibilidade: servicoData.disponibilidade || 'in_stock',
        url: servicoData.url || '',
        meta_catalog_id: servicoData.meta_catalog_id || '',
        google_category: servicoData.google_category || '',
        preco_tabela_maior: servicoData.preco_tabela_maior?.toString() || '',
        preco_tabela_menor: servicoData.preco_tabela_menor?.toString() || '',
      });
    }
  }, [servicoData, isLoadingServico, formLoaded]);

  // Load images for existing service
  useEffect(() => {
    if (servico && !isLoadingImagens) {
      const existingImages = getImagensByServico(servico.id);
      setGalleryImages(existingImages.map(img => ({
        id: img.id,
        url: img.url,
        ordem: img.ordem,
        legenda: img.legenda,
      })));
    }
  }, [servico, isLoadingImagens, getImagensByServico]);

  const handleChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasFormChanges(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nome.trim()) {
      toast.error('O nome do servico e obrigatorio');
      return;
    }

    const data: any = {
      nome: formData.nome.trim(),
      descricao: formData.descricao.trim() || null,
      categoria: formData.categoria || null,
      duracao_minutos: formData.duracao_minutos ? parseInt(formData.duracao_minutos) : null,
      imagem_url: galleryImages.length > 0 ? galleryImages[0].url : null,
      ativo: formData.ativo,
      tipo: formData.tipo,
      preco: formData.preco ? parseFloat(formData.preco) : null,
      preco_promocional: formData.preco_promocional ? parseFloat(formData.preco_promocional) : null,
      sku: formData.sku.trim() || null,
      marca: formData.marca.trim() || null,
      gtin: formData.gtin.trim() || null,
      condicao: formData.condicao,
      disponibilidade: formData.disponibilidade,
      url: formData.url.trim() || null,
      meta_catalog_id: formData.meta_catalog_id.trim() || null,
      google_category: formData.google_category.trim() || null,
      preco_tabela_maior: formData.preco_tabela_maior ? parseFloat(formData.preco_tabela_maior) : null,
      preco_tabela_menor: formData.preco_tabela_menor ? parseFloat(formData.preco_tabela_menor) : null,
    };

    try {
      if (isEditing && servico) {
        updateServico({ id: servico.id, ...data });

        // Update gallery images
        await replaceAllImagensAsync({
          servicoId: servico.id,
          urls: galleryImages.map(img => img.url),
        });

        toast.success('Servico atualizado com sucesso!');
        navigate(`/servicos/${servico.id}`);
      } else {
        createServico(data);
        toast.success('Servico criado com sucesso!');
        navigate('/servicos');
      }
    } catch (error) {
      toast.error(isEditing ? 'Erro ao atualizar servico' : 'Erro ao criar servico');
    }
  };

  const isSubmitting = isCreating || isUpdating || isReplacing;

  if (isLoadingServico || isLoadingImagens) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-8 w-48" />
        </div>
        <Skeleton className="h-96 max-w-2xl" />
      </div>
    );
  }

  if (isEditing && !servico) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/servicos')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">Servico nao encontrado</h1>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">O servico solicitado nao foi encontrado.</p>
            <Button className="mt-4" onClick={() => navigate('/servicos')}>
              Voltar para lista
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(isEditing ? `/servicos/${id}` : '/servicos')}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">
                {isEditing
                  ? `Editar ${isProduto ? 'Produto' : 'Serviço'}`
                  : `${isProduto ? 'Novo Produto' : 'Novo Serviço'}`}
              </h1>
              {isEditing && servico && (
                <p className="text-sm text-muted-foreground">Editando: {servico.nome}</p>
              )}
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {isProduto ? (
                  <ShoppingBag className="h-5 w-5 text-blue-500" />
                ) : (
                  <Sparkles className="h-5 w-5 text-purple-500" />
                )}
                Informações {isProduto ? 'do Produto' : 'do Serviço'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Tipo */}
              <div className="space-y-2">
                <Label>Tipo *</Label>
                <Select
                  value={formData.tipo}
                  onValueChange={(value) => handleChange('tipo', value)}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="servico">
                      <span className="flex items-center gap-2">
                        <Sparkles className="h-3.5 w-3.5" /> Serviço
                      </span>
                    </SelectItem>
                    <SelectItem value="produto">
                      <span className="flex items-center gap-2">
                        <ShoppingBag className="h-3.5 w-3.5" /> Produto
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Nome e Categoria */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome *</Label>
                  <Input
                    id="nome"
                    value={formData.nome}
                    onChange={(e) => handleChange('nome', e.target.value)}
                    placeholder={isProduto ? 'Ex: Kit Clareamento Dental' : 'Ex: Depilação a Laser'}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="categoria">Categoria</Label>
                    <CategoryManagement
                      trigger={
                        <Button type="button" variant="ghost" size="sm" className="h-6 px-2 text-xs gap-1">
                          <Plus className="h-3 w-3" /> Gerenciar
                        </Button>
                      }
                    />
                  </div>
                  <Select
                    value={formData.categoria || '__none__'}
                    onValueChange={(value) => handleChange('categoria', value === '__none__' ? '' : value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Sem categoria</SelectItem>
                      {getCategoriesByTipo(formData.tipo).map((cat) => (
                        <SelectItem key={cat.codigo} value={cat.codigo}>
                          <span className="flex items-center gap-2">
                            {cat.cor && (
                              <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.cor }} />
                            )}
                            {cat.nome}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Descricao */}
              <div className="space-y-2">
                <Label htmlFor="descricao">Descrição</Label>
                <Textarea
                  id="descricao"
                  value={formData.descricao}
                  onChange={(e) => handleChange('descricao', e.target.value)}
                  placeholder={isProduto ? 'Descrição do produto...' : 'Descrição detalhada do serviço...'}
                  rows={4}
                />
              </div>

              {/* Preço */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="preco">Preço (R$)</Label>
                  <Input
                    id="preco"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.preco}
                    onChange={(e) => handleChange('preco', e.target.value)}
                    placeholder="0,00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="preco_promocional">Preço Promocional (R$)</Label>
                  <Input
                    id="preco_promocional"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.preco_promocional}
                    onChange={(e) => handleChange('preco_promocional', e.target.value)}
                    placeholder="0,00"
                  />
                </div>
              </div>

              {/* Campos de Serviço */}
              {!isProduto && (
                <div className="space-y-2">
                  <Label htmlFor="duracao" className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Duração (minutos)
                  </Label>
                  <div className="flex items-center gap-3">
                    <Input
                      id="duracao"
                      type="number"
                      min="0"
                      step="5"
                      value={formData.duracao_minutos}
                      onChange={(e) => handleChange('duracao_minutos', e.target.value)}
                      placeholder="Ex: 30"
                      className="max-w-[150px]"
                    />
                    {formData.duracao_minutos && (
                      <span className="text-sm text-muted-foreground">
                        = {formatDuracao(parseInt(formData.duracao_minutos))}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Campos de Produto */}
              {isProduto && (
                <div className="space-y-4 p-4 bg-blue-50/50 dark:bg-blue-950/20 rounded-lg border border-blue-200/50 dark:border-blue-800/30">
                  <h4 className="text-sm font-medium text-blue-700 dark:text-blue-300">Dados do Produto</h4>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="sku">SKU / Código do Produto</Label>
                      <Input
                        id="sku"
                        value={formData.sku}
                        onChange={(e) => handleChange('sku', e.target.value)}
                        placeholder="Ex: KIT-CLAR-001"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="marca">Marca</Label>
                      <Input
                        id="marca"
                        value={formData.marca}
                        onChange={(e) => handleChange('marca', e.target.value)}
                        placeholder="Ex: Whiteness"
                      />
                    </div>
                  </div>
                  <div className="grid sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="gtin">GTIN / EAN</Label>
                      <Input
                        id="gtin"
                        value={formData.gtin}
                        onChange={(e) => handleChange('gtin', e.target.value)}
                        placeholder="Ex: 7891234567890"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Condição</Label>
                      <Select
                        value={formData.condicao}
                        onValueChange={(value) => handleChange('condicao', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="new">Novo</SelectItem>
                          <SelectItem value="refurbished">Recondicionado</SelectItem>
                          <SelectItem value="used">Usado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Disponibilidade</Label>
                      <Select
                        value={formData.disponibilidade}
                        onValueChange={(value) => handleChange('disponibilidade', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="in_stock">Em Estoque</SelectItem>
                          <SelectItem value="out_of_stock">Fora de Estoque</SelectItem>
                          <SelectItem value="preorder">Pré-venda</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="url" className="flex items-center gap-2">
                      <Link2 className="h-4 w-4 text-blue-500" />
                      Link de Compra
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Link externo para compra do produto. Influenciadoras podem compartilhar na bio.
                    </p>
                    <Input
                      id="url"
                      type="url"
                      value={formData.url}
                      onChange={(e) => handleChange('url', e.target.value)}
                      placeholder="https://loja.exemplo.com/produto"
                    />
                  </div>
                </div>
              )}

              {/* Precos de Referencia */}
              <div className="space-y-4 p-4 bg-green-50/50 dark:bg-green-950/20 rounded-lg border border-green-200/50 dark:border-green-800/30">
                <div className="flex items-start justify-between">
                  <h4 className="text-sm font-medium text-green-700 dark:text-green-300 flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Preços de Referência
                  </h4>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground" title="Tabela Menor (Piso) aplica-se APENAS em composição de pacotes, nunca em serviços individuais">
                    <Info className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Margem de preço</span>
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="preco_tabela_maior">Tabela Maior (R$)</Label>
                    <Input
                      id="preco_tabela_maior"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.preco_tabela_maior}
                      onChange={(e) => handleChange('preco_tabela_maior', e.target.value)}
                      placeholder="Preço máximo de referência"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="preco_tabela_menor">Tabela Menor / Piso (R$)</Label>
                    <Input
                      id="preco_tabela_menor"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.preco_tabela_menor}
                      onChange={(e) => handleChange('preco_tabela_menor', e.target.value)}
                      placeholder="Preço mínimo / piso"
                    />
                  </div>
                </div>

                {/* Validações de preço */}
                {(() => {
                  const maior = parseFloat(formData.preco_tabela_maior);
                  const menor = parseFloat(formData.preco_tabela_menor);
                  const preco = parseFloat(formData.preco);
                  const warnings: { msg: string; type: 'warn' | 'info' }[] = [];

                  if (maior > 0 && menor > 0 && menor > maior) {
                    warnings.push({ msg: 'Tabela Menor não pode ser maior que a Tabela Maior', type: 'warn' });
                  }
                  if (preco > 0 && maior > 0 && preco > maior) {
                    warnings.push({ msg: 'Preço de venda está acima da Tabela Maior', type: 'warn' });
                  }
                  if (preco > 0 && menor > 0 && preco < menor) {
                    warnings.push({ msg: 'Preço de venda está abaixo do Piso (Tabela Menor)', type: 'warn' });
                  }

                  if (warnings.length === 0) return null;

                  return (
                    <div className="space-y-1.5 mt-2">
                      {warnings.map((w, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
                          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                          <span>{w.msg}</span>
                        </div>
                      ))}
                    </div>
                  );
                })()}

                <p className="text-xs text-muted-foreground mt-2 flex items-start gap-1.5">
                  <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  <span>
                    <strong>Tabela Menor (Piso)</strong> deve ser aplicada <strong>somente em pacotes/combos</strong>, nunca para serviços individuais.
                    A Tabela Maior é o preço máximo de referência.
                  </span>
                </p>
              </div>

              {/* Link para Precificação (só em modo edição) */}
              {isEditing && (
                <div className="p-4 bg-amber-50/50 dark:bg-amber-950/20 rounded-lg border border-amber-200/50 dark:border-amber-800/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calculator className="h-4 w-4 text-amber-600" />
                      <div>
                        <p className="text-sm font-medium text-amber-700 dark:text-amber-300">Análise de Custos e Precificação</p>
                        <p className="text-xs text-muted-foreground">Insumos, mão de obra, custos fixos e simulador de margem</p>
                      </div>
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={() => navigate(`/precificacao/${id}`)}>
                      <Calculator className="h-4 w-4 mr-1" /> Abrir Precificação
                    </Button>
                  </div>
                </div>
              )}

              {/* Galeria de Imagens */}
              <div className="space-y-2 pt-4 border-t">
                <Label>Galeria de Imagens</Label>
                <ServicoImageGallery
                  images={galleryImages}
                  onChange={(images) => {
                    setGalleryImages(images);
                    setHasFormChanges(true);
                  }}
                  servicoId={servico?.id}
                  disabled={isSubmitting}
                />
                {!isEditing && galleryImages.length > 0 && (
                  <p className="text-xs text-amber-600">
                    As imagens serão salvas após criar. Edite depois para adicionar mais.
                  </p>
                )}
              </div>

              {/* Integração (colapsável) */}
              <Collapsible open={showIntegracao} onOpenChange={setShowIntegracao} className="border-t pt-4">
                <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                  <Globe className="h-4 w-4" />
                  Integração (Meta Commerce / Google)
                  <ChevronDown className={`h-4 w-4 transition-transform ${showIntegracao ? 'rotate-180' : ''}`} />
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-4 space-y-4">
                  <p className="text-xs text-muted-foreground">
                    Campos para integração futura com WhatsApp Business Catalog e Google Meu Negócio.
                  </p>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="meta_catalog_id">ID Catálogo Meta</Label>
                      <Input
                        id="meta_catalog_id"
                        value={formData.meta_catalog_id}
                        onChange={(e) => handleChange('meta_catalog_id', e.target.value)}
                        placeholder="Preenchido após sincronização"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="google_category">Categoria Google</Label>
                      <Input
                        id="google_category"
                        value={formData.google_category}
                        onChange={(e) => handleChange('google_category', e.target.value)}
                        placeholder="Ex: Health & Beauty > Skin Care"
                      />
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* Status Ativo */}
              <div className="flex items-center space-x-2 pt-4 border-t">
                <Checkbox
                  id="ativo"
                  checked={formData.ativo}
                  onCheckedChange={(checked) => handleChange('ativo', !!checked)}
                />
                <Label htmlFor="ativo" className="cursor-pointer">
                  {isProduto ? 'Produto ativo' : 'Serviço ativo'} (visível para franquias)
                </Label>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-3 mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(isEditing ? `/servicos/${id}` : '/servicos')}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || !formData.nome.trim()}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Save className="h-4 w-4 mr-2" />
              {isEditing ? 'Salvar Alterações' : `Criar ${isProduto ? 'Produto' : 'Serviço'}`}
            </Button>
          </div>
        </form>
      </div>
  );
}
