import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTenantContext } from '@/contexts/TenantContext';
import { usePatrimonioMT, useAssetMT } from '@/hooks/multitenant/usePatrimonioMT';
import { useAssetCategoriesMT } from '@/hooks/multitenant/useAssetCategoriesMT';
import { useUsersMT } from '@/hooks/multitenant/useUsersMT';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Save } from 'lucide-react';
import {
  ASSET_STATUS_LABELS,
  DEPRECIATION_METHOD_LABELS,
  AssetStatus,
  DepreciationMethod,
  MTAssetCreate,
} from '@/types/patrimonio';

export default function PatrimonioEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = !!id;

  const { tenant } = useTenantContext();
  const { data: assetData, isLoading: isLoadingAsset } = useAssetMT(id);
  const { createAsset, updateAsset } = usePatrimonioMT();
  const { categories } = useAssetCategoriesMT();
  const { users } = useUsersMT();

  const [formData, setFormData] = useState<MTAssetCreate & { id?: string }>({
    nome: '',
    codigo: '',
    valor_aquisicao: 0,
    valor_residual: 0,
    metodo_depreciacao: 'straight_line',
    vida_util_anos: 5,
    status: 'acquired',
  });

  // Populate form on edit
  useEffect(() => {
    if (assetData && isEditing) {
      setFormData({
        id: assetData.id,
        nome: assetData.nome,
        codigo: assetData.codigo,
        descricao: assetData.descricao || undefined,
        category_id: assetData.category_id || undefined,
        franchise_id: assetData.franchise_id || undefined,
        numero_serie: assetData.numero_serie || undefined,
        marca: assetData.marca || undefined,
        modelo: assetData.modelo || undefined,
        fornecedor: assetData.fornecedor || undefined,
        nota_fiscal: assetData.nota_fiscal || undefined,
        valor_aquisicao: assetData.valor_aquisicao,
        valor_residual: assetData.valor_residual,
        data_aquisicao: assetData.data_aquisicao || undefined,
        data_inicio_uso: assetData.data_inicio_uso || undefined,
        metodo_depreciacao: assetData.metodo_depreciacao,
        vida_util_anos: assetData.vida_util_anos,
        vida_util_meses: assetData.vida_util_meses || undefined,
        unidades_total_esperadas: assetData.unidades_total_esperadas || undefined,
        status: assetData.status,
        localizacao: assetData.localizacao || undefined,
        responsavel_id: assetData.responsavel_id || undefined,
        responsavel: assetData.responsavel || undefined,
        observacoes: assetData.observacoes || undefined,
      });
    }
  }, [assetData, isEditing]);

  // Auto-fill depreciation defaults from category
  const handleCategoryChange = (categoryId: string) => {
    setFormData(f => ({ ...f, category_id: categoryId }));
    const cat = categories.find(c => c.id === categoryId);
    if (cat && !isEditing) {
      setFormData(f => ({
        ...f,
        category_id: categoryId,
        metodo_depreciacao: cat.depreciation_method || f.metodo_depreciacao,
        vida_util_anos: cat.default_useful_life_years || f.vida_util_anos,
        valor_residual: cat.default_salvage_rate
          ? Math.round((f.valor_aquisicao * cat.default_salvage_rate) / 100 * 100) / 100
          : f.valor_residual,
      }));
    }
  };

  // Auto-calc residual when acquisition changes with a category selected
  const handleAquisicaoChange = (valor: number) => {
    setFormData(f => {
      const cat = categories.find(c => c.id === f.category_id);
      const residual = cat?.default_salvage_rate
        ? Math.round((valor * cat.default_salvage_rate) / 100 * 100) / 100
        : f.valor_residual;
      return { ...f, valor_aquisicao: valor, valor_residual: residual };
    });
  };

  const handleSave = async () => {
    if (!formData.nome || !formData.codigo) return;

    try {
      if (isEditing && id) {
        await updateAsset.mutateAsync({ id, ...formData });
      } else {
        await createAsset.mutateAsync(formData as MTAssetCreate);
      }
      navigate('/patrimonio/ativos');
    } catch {
      // toast handled by hook
    }
  };

  const isSaving = createAsset.isPending || updateAsset.isPending;

  if (isEditing && isLoadingAsset) {
    return <div className="p-6 text-muted-foreground">Carregando...</div>;
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{isEditing ? 'Editar Ativo' : 'Novo Ativo'}</h1>
          <p className="text-muted-foreground">
            {isEditing ? `Editando ${assetData?.nome}` : 'Cadastrar novo ativo no patrimônio'}
          </p>
        </div>
      </div>

      {/* Identification */}
      <Card>
        <CardHeader><CardTitle className="text-base">Identificação</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Código *</Label>
              <Input
                placeholder="EQP-001"
                value={formData.codigo}
                onChange={(e) => setFormData(f => ({ ...f, codigo: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input
                placeholder="Nome do ativo"
                value={formData.nome}
                onChange={(e) => setFormData(f => ({ ...f, nome: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={formData.category_id || ''} onValueChange={handleCategoryChange}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>
                      <span className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: cat.cor || '#999' }} />
                        {cat.nome}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={formData.status || 'acquired'}
                onValueChange={(v) => setFormData(f => ({ ...f, status: v as AssetStatus }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(ASSET_STATUS_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea
              placeholder="Descrição do ativo..."
              value={formData.descricao || ''}
              onChange={(e) => setFormData(f => ({ ...f, descricao: e.target.value }))}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Número de Série</Label>
              <Input value={formData.numero_serie || ''} onChange={(e) => setFormData(f => ({ ...f, numero_serie: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Marca</Label>
              <Input value={formData.marca || ''} onChange={(e) => setFormData(f => ({ ...f, marca: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Modelo</Label>
              <Input value={formData.modelo || ''} onChange={(e) => setFormData(f => ({ ...f, modelo: e.target.value }))} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Fornecedor</Label>
              <Input value={formData.fornecedor || ''} onChange={(e) => setFormData(f => ({ ...f, fornecedor: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Nota Fiscal</Label>
              <Input value={formData.nota_fiscal || ''} onChange={(e) => setFormData(f => ({ ...f, nota_fiscal: e.target.value }))} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Financial */}
      <Card>
        <CardHeader><CardTitle className="text-base">Dados Financeiros</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Valor de Aquisição (R$) *</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.valor_aquisicao}
                onChange={(e) => handleAquisicaoChange(parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-2">
              <Label>Valor Residual (R$)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.valor_residual || 0}
                onChange={(e) => setFormData(f => ({ ...f, valor_residual: parseFloat(e.target.value) || 0 }))}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data de Aquisição</Label>
              <Input
                type="date"
                value={formData.data_aquisicao || ''}
                onChange={(e) => setFormData(f => ({ ...f, data_aquisicao: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Data Início de Uso</Label>
              <Input
                type="date"
                value={formData.data_inicio_uso || ''}
                onChange={(e) => setFormData(f => ({ ...f, data_inicio_uso: e.target.value }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Depreciation */}
      <Card>
        <CardHeader><CardTitle className="text-base">Depreciação</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Método de Depreciação</Label>
              <Select
                value={formData.metodo_depreciacao || 'straight_line'}
                onValueChange={(v) => setFormData(f => ({ ...f, metodo_depreciacao: v as DepreciationMethod }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(DEPRECIATION_METHOD_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Vida Útil (anos)</Label>
              <Input
                type="number"
                min="1"
                value={formData.vida_util_anos || 5}
                onChange={(e) => setFormData(f => ({ ...f, vida_util_anos: parseInt(e.target.value) || 5 }))}
              />
            </div>
          </div>
          {formData.metodo_depreciacao === 'units_of_production' && (
            <div className="space-y-2">
              <Label>Unidades Totais Esperadas</Label>
              <Input
                type="number"
                min="1"
                value={formData.unidades_total_esperadas || ''}
                onChange={(e) => setFormData(f => ({ ...f, unidades_total_esperadas: parseInt(e.target.value) || undefined }))}
                placeholder="Ex: 100000 disparos"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Location */}
      <Card>
        <CardHeader><CardTitle className="text-base">Localização</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Localização</Label>
              <Input
                placeholder="Ex: Sala 3, Andar 2"
                value={formData.localizacao || ''}
                onChange={(e) => setFormData(f => ({ ...f, localizacao: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Responsável</Label>
              <Select
                value={formData.responsavel_id || ''}
                onValueChange={(v) => {
                  const user = users.find(u => u.id === v);
                  setFormData(f => ({
                    ...f,
                    responsavel_id: v,
                    responsavel: user?.nome || f.responsavel,
                  }));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o responsável" />
                </SelectTrigger>
                <SelectContent>
                  {users.map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      <div className="flex flex-col">
                        <span>{user.nome}</span>
                        <span className="text-xs text-muted-foreground">
                          {[user.cargo, user.departamento].filter(Boolean).join(' · ') || user.email}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea
              placeholder="Observações adicionais..."
              value={formData.observacoes || ''}
              onChange={(e) => setFormData(f => ({ ...f, observacoes: e.target.value }))}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3 justify-end">
        <Button variant="outline" onClick={() => navigate(-1)}>Cancelar</Button>
        <Button onClick={handleSave} disabled={isSaving || !formData.nome || !formData.codigo}>
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? 'Salvando...' : isEditing ? 'Atualizar' : 'Cadastrar'}
        </Button>
      </div>
    </div>
  );
}
