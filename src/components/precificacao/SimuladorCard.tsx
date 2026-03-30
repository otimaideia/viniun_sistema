import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Calculator, TrendingUp, TrendingDown, DollarSign, FileText, Users, Building2, Target } from 'lucide-react';
import { calcularSimulacao } from '@/hooks/multitenant/usePrecificacaoMT';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

interface SimuladorCardProps {
  custoInsumos: number;
  custoMaoObra: number;
  custoFixoRateado: number;
  precoTabelaMaior?: number;
  precoTabelaMenor?: number;
  onCustoFixoChange?: (valor: number) => void;
}

export function SimuladorCard({
  custoInsumos,
  custoMaoObra,
  custoFixoRateado,
  precoTabelaMaior = 0,
  precoTabelaMenor = 0,
  onCustoFixoChange,
}: SimuladorCardProps) {
  const [custoFixo, setCustoFixo] = useState(custoFixoRateado);
  const [sessoesDia, setSessoesDia] = useState(8);
  const [diasMes, setDiasMes] = useState(22);
  const [precoVenda, setPrecoVenda] = useState(precoTabelaMaior || precoTabelaMenor || 0);

  const custoTotalSessao = custoInsumos + custoMaoObra + custoFixo;
  const margemMaior = precoTabelaMaior ? precoTabelaMaior - custoTotalSessao : 0;
  const margemMenor = precoTabelaMenor ? precoTabelaMenor - custoTotalSessao : 0;
  const margemMaiorPct = precoTabelaMaior ? (margemMaior / precoTabelaMaior) * 100 : 0;
  const margemMenorPct = precoTabelaMenor ? (margemMenor / precoTabelaMenor) * 100 : 0;

  const simulacao = useMemo(() => calcularSimulacao({
    custo_insumos: custoInsumos,
    custo_mao_obra: custoMaoObra,
    custo_fixo_rateado: custoFixo,
    custo_comissoes: 0,
    custo_impostos: 0,
    preco_venda: precoVenda || precoTabelaMaior || 0,
    sessoes_dia: sessoesDia,
    dias_mes: diasMes,
  }), [custoInsumos, custoMaoObra, custoFixo, precoVenda, precoTabelaMaior, sessoesDia, diasMes]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Calculator className="h-4 w-4 text-amber-600" />
          Simulador de Custos e Margem
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Custo fixo rateado */}
        <div className="space-y-1">
          <Label className="text-xs">Rateio de Custos Fixos por Sessão (R$)</Label>
          <p className="text-xs text-muted-foreground">
            Aluguel, energia, água, internet, etc. dividido pela quantidade de atendimentos mensais.
          </p>
          <Input
            type="number" min="0" step="0.01" className="max-w-[200px]"
            value={custoFixo || ''}
            onChange={(e) => {
              const val = parseFloat(e.target.value) || 0;
              setCustoFixo(val);
              onCustoFixoChange?.(val);
            }}
            placeholder="0,00"
          />
        </div>

        {/* Breakdown de custos */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Composição do Custo/Sessão</h4>
          <div className="grid gap-2 text-sm">
            <div className="flex justify-between items-center py-1">
              <span className="text-muted-foreground flex items-center gap-1">
                <FileText className="h-3.5 w-3.5" /> Insumos/Materiais
              </span>
              <span className="font-medium">{formatCurrency(custoInsumos)}</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-muted-foreground flex items-center gap-1">
                <Users className="h-3.5 w-3.5" /> Mão de Obra
              </span>
              <span className="font-medium">{formatCurrency(custoMaoObra)}</span>
            </div>
            {custoFixo > 0 && (
              <div className="flex justify-between items-center py-1">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Building2 className="h-3.5 w-3.5" /> Custos Fixos (rateio)
                </span>
                <span className="font-medium">{formatCurrency(custoFixo)}</span>
              </div>
            )}
            <div className="flex justify-between items-center py-2 border-t font-bold">
              <span className="flex items-center gap-1">
                <Calculator className="h-3.5 w-3.5" /> Custo Total/Sessão
              </span>
              <span className="text-amber-700 dark:text-amber-300">{formatCurrency(custoTotalSessao)}</span>
            </div>
          </div>
        </div>

        {/* Projeção de Margem */}
        {(precoTabelaMaior > 0 || precoTabelaMenor > 0) && (
          <div className="space-y-2 pt-2 border-t">
            <h4 className="text-sm font-medium flex items-center gap-1">
              <TrendingUp className="h-3.5 w-3.5" /> Projeção de Margem
            </h4>
            <div className="grid gap-2 text-sm">
              {precoTabelaMaior > 0 && (
                <div className="flex justify-between items-center py-1">
                  <span className="text-muted-foreground">Tabela Maior ({formatCurrency(precoTabelaMaior)})</span>
                  <span className={`font-bold ${margemMaior >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(margemMaior)} ({margemMaiorPct.toFixed(1)}%)
                  </span>
                </div>
              )}
              {precoTabelaMenor > 0 && (
                <div className="flex justify-between items-center py-1">
                  <span className="text-muted-foreground">Tabela Menor ({formatCurrency(precoTabelaMenor)})</span>
                  <span className={`font-bold ${margemMenor >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(margemMenor)} ({margemMenorPct.toFixed(1)}%)
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Projeção Mensal */}
        <div className="space-y-3 pt-2 border-t">
          <h4 className="text-sm font-medium flex items-center gap-1">
            <Target className="h-3.5 w-3.5" /> Projeção Mensal
          </h4>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Preço de Venda (R$)</Label>
              <Input type="number" min="0" step="0.01"
                value={precoVenda || ''}
                onChange={(e) => setPrecoVenda(parseFloat(e.target.value) || 0)}
                placeholder="0,00"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Sessões/Dia</Label>
              <Input type="number" min="1" step="1"
                value={sessoesDia}
                onChange={(e) => setSessoesDia(parseInt(e.target.value) || 1)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Dias/Mês</Label>
              <Input type="number" min="1" step="1"
                value={diasMes}
                onChange={(e) => setDiasMes(parseInt(e.target.value) || 1)}
              />
            </div>
          </div>

          {simulacao.receita_mensal > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3 text-center">
                <p className="text-xs text-muted-foreground">Receita/Mês</p>
                <p className="text-sm font-bold text-blue-700">{formatCurrency(simulacao.receita_mensal)}</p>
              </div>
              <div className="bg-orange-50 dark:bg-orange-950/30 rounded-lg p-3 text-center">
                <p className="text-xs text-muted-foreground">Custo/Mês</p>
                <p className="text-sm font-bold text-orange-700">{formatCurrency(simulacao.custo_mensal)}</p>
              </div>
              <div className={`rounded-lg p-3 text-center ${simulacao.lucro_mensal >= 0 ? 'bg-green-50 dark:bg-green-950/30' : 'bg-red-50 dark:bg-red-950/30'}`}>
                <p className="text-xs text-muted-foreground">Lucro/Mês</p>
                <p className={`text-sm font-bold ${simulacao.lucro_mensal >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                  {formatCurrency(simulacao.lucro_mensal)}
                </p>
              </div>
              <div className="bg-purple-50 dark:bg-purple-950/30 rounded-lg p-3 text-center">
                <p className="text-xs text-muted-foreground">Margem</p>
                <p className={`text-sm font-bold ${simulacao.margem_bruta_pct >= 30 ? 'text-green-700' : simulacao.margem_bruta_pct >= 15 ? 'text-amber-700' : 'text-red-700'}`}>
                  {simulacao.margem_bruta_pct.toFixed(1)}%
                </p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
