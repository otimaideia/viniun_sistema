import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useServicePricingMT } from '@/hooks/multitenant/useVendasMT';
import { toast } from 'sonner';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

export default function TabelaPrecoEdit() {
  const { serviceId } = useParams<{ serviceId: string }>();
  const navigate = useNavigate();
  const { services, isLoading, updateServicePricing } = useServicePricingMT(serviceId);

  const service = services[0] || null;

  const [precoMaior, setPrecoMaior] = useState(0);
  const [precoMenor, setPrecoMenor] = useState(0);
  const [precoDesconto, setPrecoDesconto] = useState(0);
  const [precoPiso, setPrecoPiso] = useState(0);
  const [custoPix, setCustoPix] = useState(0);
  const [custoCartao, setCustoCartao] = useState(0);
  const [numeroSessoes, setNumeroSessoes] = useState(18);
  const [precoPorSessao, setPrecoPorSessao] = useState(0);
  const [precoPorSessaoManual, setPrecoPorSessaoManual] = useState(false);
  const [vigenciaInicio, setVigenciaInicio] = useState('');
  const [vigenciaFim, setVigenciaFim] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Auto-calculated fields
  const parcelaCartao12x = precoMaior > 0 ? precoMaior / 12 : 0;
  const parcelaRecorrencia = precoMaior > 0 && numeroSessoes > 0 ? precoMaior / numeroSessoes : 0;
  const custoInsumos = service?.custo_insumos || 0;
  const margemMaior = precoMaior > 0 && custoInsumos > 0 ? precoMaior - custoInsumos : null;
  const margemMenor = precoMenor > 0 && custoInsumos > 0 ? precoMenor - custoInsumos : null;
  const margemDescontoPct = precoMaior > 0 && precoMenor > 0
    ? ((precoMaior - precoMenor) / precoMaior) * 100
    : null;

  // Load existing data
  useEffect(() => {
    if (service) {
      setPrecoMaior(service.preco_tabela_maior || 0);
      setPrecoMenor(service.preco_tabela_menor || 0);
      setPrecoDesconto(service.preco_desconto || 0);
      setPrecoPiso(service.preco_piso || 0);
      setCustoPix(service.custo_pix || 0);
      setCustoCartao(service.custo_cartao || 0);
      setNumeroSessoes(service.numero_sessoes || service.sessoes_protocolo || 18);
      if (service.preco_por_sessao && service.preco_por_sessao > 0) {
        setPrecoPorSessao(service.preco_por_sessao);
        setPrecoPorSessaoManual(true);
      } else {
        const sessoes = service.numero_sessoes || service.sessoes_protocolo || 18;
        const maior = service.preco_tabela_maior || 0;
        setPrecoPorSessao(sessoes > 0 && maior > 0 ? Math.round((maior / sessoes) * 100) / 100 : 0);
      }
      setVigenciaInicio(service.vigencia_inicio?.split('T')[0] || '');
      setVigenciaFim(service.vigencia_fim?.split('T')[0] || '');
    }
  }, [service]);

  // Auto-recalculate preco_por_sessao when precoMaior or numeroSessoes change (unless manual)
  useEffect(() => {
    if (!precoPorSessaoManual && precoMaior > 0 && numeroSessoes > 0) {
      setPrecoPorSessao(Math.round((precoMaior / numeroSessoes) * 100) / 100);
    }
  }, [precoMaior, numeroSessoes, precoPorSessaoManual]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (precoMaior <= 0) {
      toast.error('Preco tabela maior deve ser maior que zero');
      return;
    }
    if (!serviceId) return;

    setIsSaving(true);
    try {
      await updateServicePricing({
        id: serviceId,
        preco_tabela_maior: precoMaior,
        preco_tabela_menor: precoMenor || null,
        preco_desconto: precoDesconto || null,
        preco_piso: precoPiso || null,
        custo_pix: custoPix || null,
        custo_cartao: custoCartao || null,
        numero_sessoes: numeroSessoes,
        preco_por_sessao: precoPorSessao || null,
        vigencia_inicio: vigenciaInicio || null,
        vigencia_fim: vigenciaFim || null,
      });
      navigate('/vendas/tabela-precos');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar precos');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <Card><CardContent className="p-8"><div className="h-64 bg-muted animate-pulse rounded" /></CardContent></Card>
      </div>
    );
  }

  const serviceName = service?.nome || serviceId?.slice(0, 8) || '';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Link to="/vendas" className="hover:text-foreground">Vendas</Link>
            <span>/</span>
            <Link to="/vendas/tabela-precos" className="hover:text-foreground">Tabela de Precos</Link>
            <span>/</span>
            <span>Editar</span>
          </div>
          <h1 className="text-2xl font-bold">Editar Precos - {serviceName}</h1>
        </div>
        <Button variant="outline" onClick={() => navigate('/vendas/tabela-precos')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
      </div>

      {/* Info badges */}
      <div className="flex gap-2 flex-wrap">
        {custoInsumos > 0 && (
          <Badge variant="secondary" className="bg-orange-100 text-orange-700">
            Custo Insumos: {formatCurrency(custoInsumos)}
          </Badge>
        )}
        {margemMaior != null && (
          <Badge variant="secondary" className={margemMaior >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
            Margem Maior: {formatCurrency(margemMaior)}
          </Badge>
        )}
        {margemMenor != null && (
          <Badge variant="secondary" className={margemMenor >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
            Margem Menor: {formatCurrency(margemMenor)}
          </Badge>
        )}
        {margemDescontoPct != null && (
          <Badge variant="secondary" className="bg-blue-100 text-blue-700">
            Desconto Maior→Menor: {margemDescontoPct.toFixed(1)}%
          </Badge>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Precos */}
        <Card>
          <CardHeader>
            <CardTitle>Precos</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="preco_maior">Preco Tabela Maior *</Label>
              <Input
                id="preco_maior"
                type="number"
                min={0}
                step="0.01"
                value={precoMaior || ''}
                onChange={(e) => setPrecoMaior(Number(e.target.value))}
                required
              />
              <p className="text-xs text-muted-foreground">Preco maximo de venda</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="preco_menor">Preco Tabela Menor</Label>
              <Input
                id="preco_menor"
                type="number"
                min={0}
                step="0.01"
                value={precoMenor || ''}
                onChange={(e) => setPrecoMenor(Number(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">Preco minimo de tabela</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="preco_desconto">Preco com Desconto</Label>
              <Input
                id="preco_desconto"
                type="number"
                min={0}
                step="0.01"
                value={precoDesconto || ''}
                onChange={(e) => setPrecoDesconto(Number(e.target.value))}
              />
            </div>
          </CardContent>
        </Card>

        {/* Piso, Sessoes e Preco por Sessao */}
        <Card>
          <CardHeader>
            <CardTitle>Piso, Sessoes e Preco por Sessao</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="preco_piso">Preco Piso (Minimo Absoluto)</Label>
              <Input
                id="preco_piso"
                type="number"
                min={0}
                step="0.01"
                value={precoPiso || ''}
                onChange={(e) => setPrecoPiso(Number(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">Valor minimo absoluto para venda</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="numero_sessoes">Numero de Sessoes</Label>
              <Input
                id="numero_sessoes"
                type="number"
                min={1}
                value={numeroSessoes}
                onChange={(e) => {
                  setNumeroSessoes(Number(e.target.value));
                  setPrecoPorSessaoManual(false);
                }}
              />
              <div className="flex gap-1 mt-1">
                {[18, 36, 72].map((n) => (
                  <Button
                    key={n}
                    type="button"
                    variant={numeroSessoes === n ? 'default' : 'outline'}
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={() => {
                      setNumeroSessoes(n);
                      setPrecoPorSessaoManual(false);
                    }}
                  >
                    {n}
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="preco_por_sessao">Preco por Sessao (R$/sessao)</Label>
              <Input
                id="preco_por_sessao"
                type="number"
                min={0}
                step="0.01"
                value={precoPorSessao || ''}
                onChange={(e) => {
                  setPrecoPorSessao(Number(e.target.value));
                  setPrecoPorSessaoManual(true);
                }}
              />
              <p className="text-xs text-muted-foreground">
                {precoPorSessaoManual ? 'Valor manual' : 'Auto: preco maior / sessoes'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Auto-calculados */}
        <Card>
          <CardHeader>
            <CardTitle>Valores Auto-Calculados</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Parcela Cartao 12x</Label>
              <div className="flex items-center h-9 px-3 rounded-md border bg-muted text-sm">
                {formatCurrency(parcelaCartao12x)}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Parcela Recorrencia {numeroSessoes}x</Label>
              <div className="flex items-center h-9 px-3 rounded-md border bg-muted text-sm">
                {formatCurrency(parcelaRecorrencia)}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Custo Insumos (Ficha Tecnica)</Label>
              <div className="flex items-center h-9 px-3 rounded-md border bg-muted text-sm">
                {custoInsumos > 0 ? formatCurrency(custoInsumos) : '-'}
              </div>
              <p className="text-xs text-muted-foreground">Editar via ficha tecnica do servico</p>
            </div>
          </CardContent>
        </Card>

        {/* Custos */}
        <Card>
          <CardHeader>
            <CardTitle>Custos Adicionais</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="custo_pix">Custo PIX</Label>
              <Input
                id="custo_pix"
                type="number"
                min={0}
                step="0.01"
                value={custoPix || ''}
                onChange={(e) => setCustoPix(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="custo_cartao">Custo Cartao</Label>
              <Input
                id="custo_cartao"
                type="number"
                min={0}
                step="0.01"
                value={custoCartao || ''}
                onChange={(e) => setCustoCartao(Number(e.target.value))}
              />
            </div>
          </CardContent>
        </Card>

        {/* Vigencia */}
        <Card>
          <CardHeader>
            <CardTitle>Vigencia</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="vigencia_inicio">Data Inicio</Label>
              <Input
                id="vigencia_inicio"
                type="date"
                value={vigenciaInicio}
                onChange={(e) => setVigenciaInicio(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vigencia_fim">Data Fim</Label>
              <Input
                id="vigencia_fim"
                type="date"
                value={vigenciaFim}
                onChange={(e) => setVigenciaFim(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate('/vendas/tabela-precos')}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSaving}>
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </form>
    </div>
  );
}
