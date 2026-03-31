import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { usePackagesMT, usePackageMT } from '@/hooks/multitenant/usePackagesMT';
import { useServicosMT } from '@/hooks/multitenant/useServicosMT';
import { useCampanhasMT } from '@/hooks/multitenant/useCampanhasMT';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Loader2,
  Save,
  Package,
  Plus,
  Trash2,
  Search,
  GripVertical,
  Link2,
  Copy,
  ExternalLink,
} from 'lucide-react';

interface PacoteItem {
  service_id: string;
  nome: string;
  preco: number | null;
  tipo: string;
  quantidade: number;
  preco_unitario: number | null;
}

export default function PacoteEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = !!id;

  const { createPacote, updatePacote, replaceItems, isCreating, isUpdating } = usePackagesMT();
  const { data: pacoteData, isLoading: isLoadingPacote } = usePackageMT(id);
  const { servicos, isLoading: isLoadingServicos } = useServicosMT({ is_active: true });
  const { campanhas } = useCampanhasMT();

  const [showServicePicker, setShowServicePicker] = useState(false);

  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    codigo: '',
    categoria: '',
    preco_pacote: '',
    moeda: 'BRL',
    data_inicio: '',
    data_fim: '',
    imagem_url: '',
    url: '',
    campanha_id: '',
    is_active: true,
    is_promocional: false,
    destaque: false,
  });

  const [items, setItems] = useState<PacoteItem[]>([]);

  // Load existing package data
  useEffect(() => {
    if (pacoteData && isEditing) {
      setFormData({
        nome: pacoteData.nome,
        descricao: pacoteData.descricao || '',
        codigo: pacoteData.codigo || '',
        categoria: pacoteData.categoria || '',
        preco_pacote: pacoteData.preco_pacote.toString(),
        moeda: pacoteData.moeda || 'BRL',
        data_inicio: pacoteData.data_inicio || '',
        data_fim: pacoteData.data_fim || '',
        imagem_url: pacoteData.imagem_url || '',
        url: pacoteData.url || '',
        campanha_id: pacoteData.campanha_id || '',
        is_active: pacoteData.is_active,
        is_promocional: pacoteData.is_promocional,
        destaque: pacoteData.destaque,
      });

      if (pacoteData.items) {
        setItems(pacoteData.items.map(item => ({
          service_id: item.service_id,
          nome: item.service?.nome || 'Serviço',
          preco: item.service?.preco || null,
          tipo: (item.service as Record<string, unknown> | undefined)?.tipo as string || 'servico',
          quantidade: item.quantidade,
          preco_unitario: item.preco_unitario,
        })));
      }
    }
  }, [pacoteData, isEditing]);

  const precoOriginal = useMemo(() => {
    return items.reduce((sum, item) => {
      const preco = item.preco_unitario ?? item.preco ?? 0;
      return sum + (preco * item.quantidade);
    }, 0);
  }, [items]);

  const desconto = useMemo(() => {
    const precoPacote = parseFloat(formData.preco_pacote) || 0;
    if (precoOriginal <= 0 || precoPacote <= 0) return 0;
    return Math.round((1 - precoPacote / precoOriginal) * 100);
  }, [precoOriginal, formData.preco_pacote]);

  const handleChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addService = (serviceId: string) => {
    const svc = servicos.find(s => s.id === serviceId);
    if (!svc) return;

    if (items.some(i => i.service_id === serviceId)) {
      // Incrementar quantidade
      setItems(prev => prev.map(i =>
        i.service_id === serviceId
          ? { ...i, quantidade: i.quantidade + 1 }
          : i
      ));
    } else {
      setItems(prev => [...prev, {
        service_id: svc.id,
        nome: svc.nome,
        preco: svc.preco,
        tipo: svc.tipo,
        quantidade: 1,
        preco_unitario: null,
      }]);
    }
    setShowServicePicker(false);
  };

  const removeItem = (serviceId: string) => {
    setItems(prev => prev.filter(i => i.service_id !== serviceId));
  };

  const updateItemQuantidade = (serviceId: string, quantidade: number) => {
    if (quantidade < 1) return;
    setItems(prev => prev.map(i =>
      i.service_id === serviceId ? { ...i, quantidade } : i
    ));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nome.trim()) {
      toast.error('O nome do pacote é obrigatório');
      return;
    }
    if (!formData.preco_pacote || parseFloat(formData.preco_pacote) <= 0) {
      toast.error('O preço do pacote é obrigatório');
      return;
    }
    if (items.length === 0) {
      toast.error('Adicione pelo menos um item ao pacote');
      return;
    }

    const data = {
      nome: formData.nome.trim(),
      descricao: formData.descricao.trim() || undefined,
      codigo: formData.codigo.trim() || undefined,
      categoria: formData.categoria.trim() || undefined,
      preco_pacote: parseFloat(formData.preco_pacote),
      preco_original: precoOriginal,
      moeda: formData.moeda,
      data_inicio: formData.data_inicio || undefined,
      data_fim: formData.data_fim || undefined,
      imagem_url: formData.imagem_url.trim() || undefined,
      url: formData.url.trim() || undefined,
      campanha_id: formData.campanha_id || undefined,
      is_active: formData.is_active,
      is_promocional: formData.is_promocional,
      destaque: formData.destaque,
    };

    try {
      if (isEditing && id) {
        await updatePacote.mutateAsync({ id, ...data });
        await replaceItems.mutateAsync({
          packageId: id,
          items: items.map((item, idx) => ({
            service_id: item.service_id,
            quantidade: item.quantidade,
            preco_unitario: item.preco_unitario ?? undefined,
            ordem: idx,
          })),
        });
        navigate(`/servicos/pacotes/${id}`);
      } else {
        const created = await createPacote.mutateAsync(data);
        await replaceItems.mutateAsync({
          packageId: created.id,
          items: items.map((item, idx) => ({
            service_id: item.service_id,
            quantidade: item.quantidade,
            preco_unitario: item.preco_unitario ?? undefined,
            ordem: idx,
          })),
        });
        navigate(`/servicos/pacotes/${created.id}`);
      }
    } catch (error) {
      // Erros já tratados nos hooks
    }
  };

  const isSubmitting = isCreating || isUpdating;
  const isLoading = isLoadingPacote || isLoadingServicos;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-96 max-w-3xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
            size="icon"
            onClick={() => navigate(isEditing ? `/servicos/pacotes/${id}` : '/servicos')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              {isEditing ? 'Editar Pacote' : 'Novo Pacote'}
            </h1>
            {isEditing && pacoteData && (
              <p className="text-sm text-muted-foreground">Editando: {pacoteData.nome}</p>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="max-w-3xl space-y-6">
          {/* Dados Básicos */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-violet-500" />
                Dados do Pacote
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome *</Label>
                  <Input
                    id="nome"
                    value={formData.nome}
                    onChange={(e) => handleChange('nome', e.target.value)}
                    placeholder="Ex: Pacote Verão Completo"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="codigo">Código</Label>
                  <Input
                    id="codigo"
                    value={formData.codigo}
                    onChange={(e) => handleChange('codigo', e.target.value)}
                    placeholder="Ex: PKG-VERAO-2026"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="descricao">Descrição</Label>
                <Textarea
                  id="descricao"
                  value={formData.descricao}
                  onChange={(e) => handleChange('descricao', e.target.value)}
                  placeholder="Descreva os benefícios do pacote..."
                  rows={3}
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="categoria">Categoria</Label>
                  <Input
                    id="categoria"
                    value={formData.categoria}
                    onChange={(e) => handleChange('categoria', e.target.value)}
                    placeholder="Ex: Serviços Premium"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Campanha Vinculada</Label>
                  <Select
                    value={formData.campanha_id || '__none__'}
                    onValueChange={(value) => handleChange('campanha_id', value === '__none__' ? '' : value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Nenhuma campanha" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Nenhuma</SelectItem>
                      {campanhas.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Itens do Pacote */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Itens do Pacote</CardTitle>
              <Popover open={showServicePicker} onOpenChange={setShowServicePicker}>
                <PopoverTrigger asChild>
                  <Button type="button" size="sm" variant="outline">
                    <Plus className="h-4 w-4 mr-1" />
                    Adicionar Item
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0" align="end">
                  <Command>
                    <CommandInput placeholder="Buscar serviço ou produto..." />
                    <CommandList>
                      <CommandEmpty>Nenhum item encontrado</CommandEmpty>
                      <CommandGroup heading="Serviços">
                        {servicos.filter(s => s.tipo === 'servico' || !s.tipo).map(svc => (
                          <CommandItem key={svc.id} onSelect={() => addService(svc.id)}>
                            <span className="flex-1">{svc.nome}</span>
                            {svc.preco && (
                              <span className="text-xs text-muted-foreground">
                                R$ {svc.preco.toFixed(2)}
                              </span>
                            )}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                      {servicos.some(s => s.tipo === 'produto') && (
                        <CommandGroup heading="Produtos">
                          {servicos.filter(s => s.tipo === 'produto').map(svc => (
                            <CommandItem key={svc.id} onSelect={() => addService(svc.id)}>
                              <span className="flex-1">{svc.nome}</span>
                              {svc.preco && (
                                <span className="text-xs text-muted-foreground">
                                  R$ {svc.preco.toFixed(2)}
                                </span>
                              )}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      )}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </CardHeader>
            <CardContent>
              {items.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground text-sm">
                  Adicione serviços e produtos ao pacote
                </div>
              ) : (
                <div className="space-y-2">
                  {items.map((item, idx) => (
                    <div
                      key={item.service_id}
                      className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
                    >
                      <GripVertical className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm truncate">{item.nome}</span>
                          <Badge variant="outline" className="text-[10px] shrink-0">
                            {item.tipo === 'produto' ? 'Produto' : 'Serviço'}
                          </Badge>
                        </div>
                        {item.preco && (
                          <span className="text-xs text-muted-foreground">
                            R$ {item.preco.toFixed(2)} / unidade
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Label className="text-xs text-muted-foreground sr-only">Qtd</Label>
                        <Input
                          type="number"
                          min="1"
                          value={item.quantidade}
                          onChange={(e) => updateItemQuantidade(item.service_id, parseInt(e.target.value) || 1)}
                          className="w-16 h-8 text-center text-sm"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => removeItem(item.service_id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}

                  {/* Resumo de preço */}
                  <div className="pt-3 border-t mt-3 space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Soma dos itens:</span>
                      <span>R$ {precoOriginal.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Preço e Validade */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Preço e Validade</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="preco_pacote">Preço do Pacote (R$) *</Label>
                  <Input
                    id="preco_pacote"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.preco_pacote}
                    onChange={(e) => handleChange('preco_pacote', e.target.value)}
                    placeholder="0,00"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Soma dos Itens</Label>
                  <Input value={`R$ ${precoOriginal.toFixed(2)}`} disabled />
                </div>
                <div className="space-y-2">
                  <Label>Desconto</Label>
                  <Input
                    value={desconto > 0 ? `${desconto}%` : '-'}
                    disabled
                    className={desconto > 0 ? 'text-green-600 font-bold' : ''}
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="data_inicio">Data Início (opcional)</Label>
                  <Input
                    id="data_inicio"
                    type="date"
                    value={formData.data_inicio}
                    onChange={(e) => handleChange('data_inicio', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="data_fim">Data Fim (opcional)</Label>
                  <Input
                    id="data_fim"
                    type="date"
                    value={formData.data_fim}
                    onChange={(e) => handleChange('data_fim', e.target.value)}
                  />
                </div>
              </div>

              {/* Link de Compra */}
              <div className="space-y-2 pt-2 border-t">
                <Label htmlFor="url" className="flex items-center gap-2">
                  <Link2 className="h-4 w-4 text-violet-500" />
                  Link de Compra / Promocao
                </Label>
                <p className="text-xs text-muted-foreground">
                  Link externo onde o cliente pode comprar este pacote. Ideal para influenciadoras compartilharem na bio.
                </p>
                <div className="flex gap-2">
                  <Input
                    id="url"
                    type="url"
                    value={formData.url}
                    onChange={(e) => handleChange('url', e.target.value)}
                    placeholder="https://exemplo.com/pacote-verao"
                    className="flex-1"
                  />
                  {formData.url && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        navigator.clipboard.writeText(formData.url);
                        toast.success('Link copiado!');
                      }}
                      title="Copiar link"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-6 pt-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => handleChange('is_active', !!checked)}
                  />
                  <Label htmlFor="is_active" className="cursor-pointer">Ativo</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="is_promocional"
                    checked={formData.is_promocional}
                    onCheckedChange={(checked) => handleChange('is_promocional', !!checked)}
                  />
                  <Label htmlFor="is_promocional" className="cursor-pointer">Promocional</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="destaque"
                    checked={formData.destaque}
                    onCheckedChange={(checked) => handleChange('destaque', !!checked)}
                  />
                  <Label htmlFor="destaque" className="cursor-pointer">Destaque</Label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(isEditing ? `/servicos/pacotes/${id}` : '/servicos')}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || !formData.nome.trim() || items.length === 0}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Save className="h-4 w-4 mr-2" />
              {isEditing ? 'Salvar Alterações' : 'Criar Pacote'}
            </Button>
          </div>
        </form>
    </div>
  );
}
