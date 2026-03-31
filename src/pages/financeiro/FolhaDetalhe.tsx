import { useNavigate, useParams } from "react-router-dom";
import { usePayrollRunMT } from "@/hooks/multitenant/usePayrollMT";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, DollarSign, Shield, Award, CheckCircle, TrendingDown, Clock, Briefcase, ChevronDown, ChevronRight } from "lucide-react";
import { PAYROLL_STATUS_LABELS } from "@/types/financeiro";
import type { PayrollItem } from "@/types/financeiro";
import { useState } from "react";

const fmt = (v: number) => v > 0 ? `R$ ${v.toFixed(2)}` : '—';
const sum = (items: PayrollItem[], key: keyof PayrollItem) => items.reduce((s, i) => s + (Number(i[key]) || 0), 0);

export default function FolhaDetalhe() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { run, items, isLoading, payAll } = usePayrollRunMT(id);
  const [paying, setPaying] = useState(false);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const handlePayAll = async () => {
    setPaying(true);
    try {
      await payAll();
    } finally {
      setPaying(false);
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  if (!run) {
    return <div className="p-6 text-center text-muted-foreground">Folha não encontrada</div>;
  }

  const kpis = [
    { label: 'Salários', value: run.total_salarios, icon: DollarSign, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Benefícios', value: run.total_beneficios, icon: Award, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Provisões', value: run.total_provisoes || 0, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Encargos', value: run.total_encargos || 0, icon: Shield, color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'Comissões', value: run.total_comissoes, icon: Briefcase, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Descontos', value: run.total_descontos || 0, icon: TrendingDown, color: 'text-red-600', bg: 'bg-red-50' },
  ];

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/financeiro/folha')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Folha {run.competencia}</h1>
            <Badge variant={run.status === 'pago' ? 'default' : 'secondary'}>
              {PAYROLL_STATUS_LABELS[run.status]}
            </Badge>
          </div>
        </div>
        {run.status !== 'pago' && (
          <Button onClick={handlePayAll} disabled={paying}>
            <CheckCircle className="h-4 w-4 mr-2" />
            {paying ? 'Pagando...' : 'Pagar Tudo'}
          </Button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {kpis.map(kpi => (
          <Card key={kpi.label} className={kpi.bg}>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2">
                <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
                <span className="text-xs text-muted-foreground">{kpi.label}</span>
              </div>
              <p className="text-xl font-bold mt-1">R$ {kpi.value.toFixed(2)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Total Geral + Líquido */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-6 flex items-center justify-between">
            <div>
              <span className="text-lg font-medium">Projeção (Custo Total)</span>
              <p className="text-xs text-muted-foreground">Salários + Benefícios + Provisões + Encargos + Comissões</p>
            </div>
            <span className="text-3xl font-bold">R$ {run.total_geral.toFixed(2)}</span>
          </CardContent>
        </Card>
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6 flex items-center justify-between">
            <div>
              <span className="text-lg font-medium text-blue-800">Valor Líquido</span>
              <p className="text-xs text-blue-600">Valor pago aos funcionários (após descontos)</p>
            </div>
            <span className="text-3xl font-bold text-blue-700">R$ {(run.total_geral - (run.total_descontos || 0)).toFixed(2)}</span>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Items - Visão resumida com expand */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8"></TableHead>
                <TableHead>Funcionário</TableHead>
                <TableHead>Cargo</TableHead>
                <TableHead className="text-right">Salário</TableHead>
                <TableHead className="text-right">Benefícios</TableHead>
                <TableHead className="text-right">Provisões</TableHead>
                <TableHead className="text-right">Encargos</TableHead>
                <TableHead className="text-right">Comissão</TableHead>
                <TableHead className="text-right">Descontos</TableHead>
                <TableHead className="text-right">Projeção</TableHead>
                <TableHead className="text-right">Líquido</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map(item => {
                const itemBeneficios = (item.vt_valor || 0) + (item.vr_valor || 0) + (item.va_valor || 0) + (item.plano_saude_valor || 0) + (item.plano_odonto_valor || 0) + (item.auxilio_creche_valor || 0) + (item.salario_familia_valor || 0);
                const itemProvisoes = (item.provisao_13_valor || 0) + (item.provisao_ferias_valor || 0) + (item.provisao_ferias_terco_valor || 0) + (item.fgts_13_valor || 0) + (item.fgts_ferias_valor || 0) + (item.provisao_multa_fgts_valor || 0);
                const itemEncargos = (item.fgts_valor || 0) + (item.inss_patronal_valor || 0) + (item.rat_valor || 0) + (item.sistema_s_valor || 0) + (item.salario_educacao_valor || 0);
                const isExpanded = expandedRow === item.id;

                return (
                  <>
                    <TableRow key={item.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setExpandedRow(isExpanded ? null : item.id)}>
                      <TableCell className="w-8">
                        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </TableCell>
                      <TableCell className="font-medium">{(item.employee as Record<string, unknown> | undefined)?.nome as string || '—'}</TableCell>
                      <TableCell>{(item.employee as Record<string, unknown> | undefined)?.cargo as string || '—'}</TableCell>
                      <TableCell className="text-right">R$ {item.salario_base.toFixed(2)}</TableCell>
                      <TableCell className="text-right text-green-600">{fmt(itemBeneficios)}</TableCell>
                      <TableCell className="text-right text-amber-600">{fmt(itemProvisoes)}</TableCell>
                      <TableCell className="text-right text-orange-600">{fmt(itemEncargos)}</TableCell>
                      <TableCell className="text-right text-purple-600">{fmt(item.comissao_valor)}</TableCell>
                      <TableCell className="text-right text-red-600">{(() => { const d = (item.desconto_vt_valor || 0) + (item.inss_funcionario_valor || 0) + (item.irrf_valor || 0); return d > 0 ? `-R$ ${d.toFixed(2)}` : '—'; })()}</TableCell>
                      <TableCell className="text-right font-bold">R$ {item.total_bruto.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-bold text-blue-700">R$ {item.total_liquido.toFixed(2)}</TableCell>
                    </TableRow>
                    {isExpanded && (
                      <TableRow key={`${item.id}-detail`}>
                        <TableCell colSpan={12} className="bg-muted/30 p-4">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
                            {/* Benefícios */}
                            <div>
                              <p className="font-semibold text-green-700 mb-2">Benefícios</p>
                              {item.vt_valor > 0 && <div className="flex justify-between"><span>VT</span><span>R$ {item.vt_valor.toFixed(2)}</span></div>}
                              {item.vr_valor > 0 && <div className="flex justify-between"><span>VR</span><span>R$ {item.vr_valor.toFixed(2)}</span></div>}
                              {(item.va_valor || 0) > 0 && <div className="flex justify-between"><span>VA</span><span>R$ {item.va_valor.toFixed(2)}</span></div>}
                              {(item.plano_saude_valor || 0) > 0 && <div className="flex justify-between"><span>Pl. Saúde</span><span>R$ {item.plano_saude_valor.toFixed(2)}</span></div>}
                              {(item.plano_odonto_valor || 0) > 0 && <div className="flex justify-between"><span>Pl. Odonto</span><span>R$ {item.plano_odonto_valor.toFixed(2)}</span></div>}
                              {(item.auxilio_creche_valor || 0) > 0 && <div className="flex justify-between"><span>Aux. Creche</span><span>R$ {item.auxilio_creche_valor.toFixed(2)}</span></div>}
                              {(item.salario_familia_valor || 0) > 0 && <div className="flex justify-between"><span>Sal. Família</span><span>R$ {item.salario_familia_valor.toFixed(2)}</span></div>}
                              {itemBeneficios === 0 && <p className="text-muted-foreground">Nenhum</p>}
                            </div>

                            {/* Provisões */}
                            <div>
                              <p className="font-semibold text-amber-700 mb-2">Provisões</p>
                              {(item.provisao_13_valor || 0) > 0 && <div className="flex justify-between"><span>13º Salário</span><span>R$ {item.provisao_13_valor.toFixed(2)}</span></div>}
                              {(item.provisao_ferias_valor || 0) > 0 && <div className="flex justify-between"><span>Férias</span><span>R$ {item.provisao_ferias_valor.toFixed(2)}</span></div>}
                              {(item.provisao_ferias_terco_valor || 0) > 0 && <div className="flex justify-between"><span>1/3 Férias</span><span>R$ {item.provisao_ferias_terco_valor.toFixed(2)}</span></div>}
                              {(item.fgts_13_valor || 0) > 0 && <div className="flex justify-between"><span>FGTS s/ 13º</span><span>R$ {item.fgts_13_valor.toFixed(2)}</span></div>}
                              {(item.fgts_ferias_valor || 0) > 0 && <div className="flex justify-between"><span>FGTS s/ Férias</span><span>R$ {item.fgts_ferias_valor.toFixed(2)}</span></div>}
                              {(item.provisao_multa_fgts_valor || 0) > 0 && <div className="flex justify-between"><span>Multa FGTS</span><span>R$ {item.provisao_multa_fgts_valor.toFixed(2)}</span></div>}
                              {itemProvisoes === 0 && <p className="text-muted-foreground">Nenhuma</p>}
                            </div>

                            {/* Encargos */}
                            <div>
                              <p className="font-semibold text-orange-700 mb-2">Encargos Patronais</p>
                              {(item.fgts_valor || 0) > 0 && <div className="flex justify-between"><span>FGTS</span><span>R$ {item.fgts_valor.toFixed(2)}</span></div>}
                              {(item.inss_patronal_valor || 0) > 0 && <div className="flex justify-between"><span>INSS Patronal</span><span>R$ {item.inss_patronal_valor.toFixed(2)}</span></div>}
                              {(item.rat_valor || 0) > 0 && <div className="flex justify-between"><span>RAT/SAT</span><span>R$ {item.rat_valor.toFixed(2)}</span></div>}
                              {(item.sistema_s_valor || 0) > 0 && <div className="flex justify-between"><span>Sistema S</span><span>R$ {item.sistema_s_valor.toFixed(2)}</span></div>}
                              {(item.salario_educacao_valor || 0) > 0 && <div className="flex justify-between"><span>Sal. Educação</span><span>R$ {item.salario_educacao_valor.toFixed(2)}</span></div>}
                              {itemEncargos === 0 && <p className="text-muted-foreground">Nenhum</p>}
                            </div>

                            {/* Descontos */}
                            <div>
                              <p className="font-semibold text-red-700 mb-2">Descontos Funcionário</p>
                              {(item.desconto_vt_valor || 0) > 0 && <div className="flex justify-between"><span>Desc. VT</span><span>-R$ {item.desconto_vt_valor.toFixed(2)}</span></div>}
                              {(item.inss_funcionario_valor || 0) > 0 && <div className="flex justify-between"><span>INSS Func.</span><span>-R$ {item.inss_funcionario_valor.toFixed(2)}</span></div>}
                              {(item.irrf_valor || 0) > 0 && <div className="flex justify-between"><span>IRRF</span><span>-R$ {item.irrf_valor.toFixed(2)}</span></div>}
                              <div className="border-t mt-2 pt-2 font-medium flex justify-between">
                                <span>Líquido</span>
                                <span>R$ {item.total_liquido.toFixed(2)}</span>
                              </div>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                );
              })}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell />
                <TableCell colSpan={2} className="font-bold">Total</TableCell>
                <TableCell className="text-right font-bold">R$ {sum(items, 'salario_base').toFixed(2)}</TableCell>
                <TableCell className="text-right font-bold text-green-600">R$ {items.reduce((s, i) => s + (i.vt_valor || 0) + (i.vr_valor || 0) + (i.va_valor || 0) + (i.plano_saude_valor || 0) + (i.plano_odonto_valor || 0) + (i.auxilio_creche_valor || 0) + (i.salario_familia_valor || 0), 0).toFixed(2)}</TableCell>
                <TableCell className="text-right font-bold text-amber-600">R$ {items.reduce((s, i) => s + (i.provisao_13_valor || 0) + (i.provisao_ferias_valor || 0) + (i.provisao_ferias_terco_valor || 0) + (i.fgts_13_valor || 0) + (i.fgts_ferias_valor || 0) + (i.provisao_multa_fgts_valor || 0), 0).toFixed(2)}</TableCell>
                <TableCell className="text-right font-bold text-orange-600">R$ {items.reduce((s, i) => s + (i.fgts_valor || 0) + (i.inss_patronal_valor || 0) + (i.rat_valor || 0) + (i.sistema_s_valor || 0) + (i.salario_educacao_valor || 0), 0).toFixed(2)}</TableCell>
                <TableCell className="text-right font-bold text-purple-600">R$ {sum(items, 'comissao_valor').toFixed(2)}</TableCell>
                <TableCell className="text-right font-bold text-red-600">-R$ {items.reduce((s, i) => s + (i.desconto_vt_valor || 0) + (i.inss_funcionario_valor || 0) + (i.irrf_valor || 0), 0).toFixed(2)}</TableCell>
                <TableCell className="text-right font-bold">R$ {sum(items, 'total_bruto').toFixed(2)}</TableCell>
                <TableCell className="text-right font-bold text-blue-700">R$ {sum(items, 'total_liquido').toFixed(2)}</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
