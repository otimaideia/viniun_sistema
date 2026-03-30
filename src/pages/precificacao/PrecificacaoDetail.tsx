import { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Calculator, RefreshCw, Clock, ExternalLink } from 'lucide-react';
import { usePrecificacaoDetailMT } from '@/hooks/multitenant/usePrecificacaoMT';
import { FichaTecnicaCard } from '@/components/precificacao/FichaTecnicaCard';
import { MaoDeObraCard } from '@/components/precificacao/MaoDeObraCard';
import { SimuladorCard } from '@/components/precificacao/SimuladorCard';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

export default function PrecificacaoDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { service, isLoading, recalcularCustoTotal, saveCustoFixo } = usePrecificacaoDetailMT(id);

  // State local para custos em tempo real (atualizado pelos cards filhos)
  const [custoInsumosRT, setCustoInsumosRT] = useState<number | null>(null);
  const [custoMaoObraRT, setCustoMaoObraRT] = useState<number | null>(null);

  const handleCustoInsumosChange = useCallback((custo: number) => {
    setCustoInsumosRT(custo);
  }, []);

  const handleCustoMaoObraChange = useCallback((custo: number) => {
    setCustoMaoObraRT(custo);
  }, []);

  const handleRecalcular = useCallback(async () => {
    await recalcularCustoTotal();
    // Reset RT values so they come from the refreshed service
    setCustoInsumosRT(null);
    setCustoMaoObraRT(null);
  }, [recalcularCustoTotal]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-8 w-64" />
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (!service) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/precificacao')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">Serviço não encontrado</h1>
        </div>
      </div>
    );
  }

  // Usar valores em tempo real se disponíveis, senão do banco
  const custoInsumos = custoInsumosRT ?? (service.custo_insumos || 0);
  const custoMaoObra = custoMaoObraRT ?? (service.custo_mao_obra || 0);
  const custoFixo = service.custo_fixo_rateado || 0;
  const custoTotal = custoInsumos + custoMaoObra + custoFixo;
  const precoMaior = service.preco_tabela_maior || 0;
  const margemPct = precoMaior > 0 ? ((precoMaior - custoTotal) / precoMaior * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/precificacao')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Calculator className="h-6 w-6" />
              {service.nome}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              {service.categoria && (
                <Badge variant="outline" className="text-xs">{service.categoria}</Badge>
              )}
              {service.duracao_minutos && (
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" /> {service.duracao_minutos} min
                </span>
              )}
              {custoTotal > 0 && (
                <Badge variant="secondary" className="bg-orange-100 text-orange-700">
                  Custo: {formatCurrency(custoTotal)}
                </Badge>
              )}
              {precoMaior > 0 && custoTotal > 0 && (
                <Badge variant="secondary" className={
                  margemPct > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }>
                  Margem: {margemPct.toFixed(1)}%
                </Badge>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate(`/servicos/${id}`)}>
            <ExternalLink className="h-4 w-4 mr-1" /> Ver Serviço
          </Button>
          <Button variant="outline" size="sm" onClick={handleRecalcular}>
            <RefreshCw className="h-4 w-4 mr-1" /> Recalcular
          </Button>
        </div>
      </div>

      {/* Grid de cards */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Coluna esquerda */}
        <div className="space-y-6">
          <FichaTecnicaCard serviceId={id!} onCustoChange={handleCustoInsumosChange} />
          <MaoDeObraCard serviceId={id!} duracaoMinutos={service.duracao_minutos} onCustoChange={handleCustoMaoObraChange} />
        </div>

        {/* Coluna direita */}
        <div className="space-y-6">
          <SimuladorCard
            custoInsumos={custoInsumos}
            custoMaoObra={custoMaoObra}
            custoFixoRateado={custoFixo}
            precoTabelaMaior={service.preco_tabela_maior || 0}
            precoTabelaMenor={service.preco_tabela_menor || 0}
            onCustoFixoChange={saveCustoFixo}
          />
        </div>
      </div>
    </div>
  );
}
