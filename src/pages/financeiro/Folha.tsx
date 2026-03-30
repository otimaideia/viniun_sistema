import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePayrollEmployeesMT, usePayrollRunsMT } from "@/hooks/multitenant/usePayrollMT";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Play, Pencil, Trash2, Eye, Users, FileText } from "lucide-react";
import { PAYROLL_STATUS_LABELS } from "@/types/financeiro";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";

export default function Folha() {
  const navigate = useNavigate();
  const { employees, isLoading: empLoading, deleteEmployee } = usePayrollEmployeesMT();
  const { runs, isLoading: runsLoading, generatePayrollRun, deleteRun } = usePayrollRunsMT();
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async () => {
    const now = new Date();
    const competencia = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const existing = runs.find(r => r.competencia === competencia);
    if (existing) {
      toast.error(`Folha de ${competencia} já foi gerada`);
      return;
    }
    setGenerating(true);
    try {
      await generatePayrollRun(competencia);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const activeEmployees = employees.filter(e => e.is_active);

  // Função para calcular projeção e líquido de um funcionário
  const calcEmployee = (e: typeof employees[0]) => {
    const base = e.salario_base;
    const isCLT = e.tipo_contratacao === 'clt';
    const vt = e.has_vt ? e.vt_valor : 0;
    const vr = e.has_vr ? e.vr_valor : 0;
    const va = e.has_va ? (e.va_valor || 0) : 0;
    const plSaude = e.has_plano_saude ? (e.plano_saude_valor || 0) : 0;
    const plOdonto = e.has_plano_odonto ? (e.plano_odonto_valor || 0) : 0;
    const auxCreche = e.has_auxilio_creche ? (e.auxilio_creche_valor || 0) : 0;
    const salFamilia = e.has_salario_familia ? (e.salario_familia_valor || 0) : 0;
    const beneficios = vt + vr + va + plSaude + plOdonto + auxCreche + salFamilia;
    const comissao = e.comissao_valor || 0;
    const fgts = isCLT ? base * (e.fgts_percentual / 100) : 0;
    const provisoes = isCLT ? base * (((e.provisao_13_pct || 8.33) + (e.provisao_ferias_pct || 8.33) + (e.provisao_ferias_terco_pct || 2.78) + (e.provisao_multa_fgts_pct || 4)) / 100) : 0;
    const encargos = isCLT ? fgts + base * (((e.inss_patronal_pct || 20) + (e.rat_pct || 2) + (e.sistema_s_pct || 5.8) + (e.salario_educacao_pct || 2.5)) / 100) : 0;

    // Descontos do funcionário
    const descontoVt = isCLT ? Math.min(base * ((e.desconto_vt_pct || 6) / 100), vt) : 0;
    const inssFuncionario = isCLT ? base * ((e.inss_funcionario_pct || 7.5) / 100) : 0;
    const irrf = isCLT ? (e.irrf_valor || 0) : 0;
    const descontos = descontoVt + inssFuncionario + irrf;

    const projecao = base + beneficios + provisoes + encargos + comissao;
    const liquido = base + vt + vr + va + comissao - descontos;

    return { base, beneficios, provisoes, encargos, comissao, descontos, projecao, liquido, isCLT };
  };

  const totalEstimado = activeEmployees.reduce((s, e) => s + calcEmployee(e).projecao, 0);
  const totalLiquido = activeEmployees.reduce((s, e) => s + calcEmployee(e).liquido, 0);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Folha de Pagamento</h1>
          <p className="text-muted-foreground">
            {activeEmployees.length} funcionários ativos • Projeção: R$ {totalEstimado.toFixed(2)} • Líquido: R$ {totalLiquido.toFixed(2)}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={handleGenerate} disabled={generating}>
            <Play className="h-4 w-4 mr-2" />
            {generating ? "Gerando..." : "Gerar Folha do Mês"}
          </Button>
          <Button onClick={() => navigate("/financeiro/folha/funcionario/novo")}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Funcionário
          </Button>
        </div>
      </div>

      <Tabs defaultValue="funcionarios">
        <TabsList>
          <TabsTrigger value="funcionarios">
            <Users className="h-4 w-4 mr-2" />
            Funcionários ({employees.length})
          </TabsTrigger>
          <TabsTrigger value="folhas">
            <FileText className="h-4 w-4 mr-2" />
            Folhas Processadas ({runs.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="funcionarios">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Cargo</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Salário Base</TableHead>
                    <TableHead className="text-right">Benefícios</TableHead>
                    <TableHead className="text-right">Encargos+Prov.</TableHead>
                    <TableHead className="text-right">Descontos</TableHead>
                    <TableHead className="text-right">Projeção</TableHead>
                    <TableHead className="text-right">Líquido</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[100px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {empLoading ? (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">Carregando...</TableCell>
                    </TableRow>
                  ) : employees.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                        Nenhum funcionário cadastrado
                      </TableCell>
                    </TableRow>
                  ) : employees.map(emp => {
                    const calc = calcEmployee(emp);

                    return (
                      <TableRow key={emp.id} className={!emp.is_active ? 'opacity-50' : ''}>
                        <TableCell className="font-medium">
                          <button className="hover:underline text-left" onClick={() => navigate(`/financeiro/folha/funcionario/${emp.id}`)}>
                            {emp.nome}
                          </button>
                        </TableCell>
                        <TableCell>{emp.cargo}</TableCell>
                        <TableCell>
                          <Badge variant={calc.isCLT ? 'default' : 'secondary'} className="text-xs">
                            {calc.isCLT ? 'CLT' : 'MEI'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">R$ {calc.base.toFixed(2)}</TableCell>
                        <TableCell className="text-right text-green-600">{calc.beneficios > 0 ? `R$ ${calc.beneficios.toFixed(2)}` : '—'}</TableCell>
                        <TableCell className="text-right text-orange-600">{(calc.provisoes + calc.encargos) > 0 ? `R$ ${(calc.provisoes + calc.encargos).toFixed(2)}` : '—'}</TableCell>
                        <TableCell className="text-right text-red-600">{calc.descontos > 0 ? `-R$ ${calc.descontos.toFixed(2)}` : '—'}</TableCell>
                        <TableCell className="text-right font-medium">R$ {calc.projecao.toFixed(2)}</TableCell>
                        <TableCell className="text-right font-bold text-blue-700">R$ {calc.liquido.toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge variant={emp.is_active ? 'default' : 'secondary'}>
                            {emp.is_active ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" onClick={() => navigate(`/financeiro/folha/funcionario/${emp.id}`)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => navigate(`/financeiro/folha/funcionario/${emp.id}/editar`)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="icon" variant="ghost" className="text-destructive">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Remover funcionário?</AlertDialogTitle>
                                  <AlertDialogDescription>"{emp.nome}" será removido da folha.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => deleteEmployee(emp.id)}>Remover</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="folhas">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Competência</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Salários</TableHead>
                    <TableHead>Benefícios</TableHead>
                    <TableHead>Provisões</TableHead>
                    <TableHead>Encargos</TableHead>
                    <TableHead>Comissões</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead className="w-[100px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {runsLoading ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Carregando...</TableCell>
                    </TableRow>
                  ) : runs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        Nenhuma folha processada
                      </TableCell>
                    </TableRow>
                  ) : runs.map(run => (
                    <TableRow key={run.id}>
                      <TableCell className="font-medium">{run.competencia}</TableCell>
                      <TableCell>
                        <Badge variant={run.status === 'pago' ? 'default' : run.status === 'processado' ? 'secondary' : 'outline'}>
                          {PAYROLL_STATUS_LABELS[run.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>R$ {run.total_salarios.toFixed(2)}</TableCell>
                      <TableCell>R$ {run.total_beneficios.toFixed(2)}</TableCell>
                      <TableCell className="text-amber-600">R$ {(run.total_provisoes || 0).toFixed(2)}</TableCell>
                      <TableCell className="text-orange-600">R$ {(run.total_encargos || 0).toFixed(2)}</TableCell>
                      <TableCell>R$ {run.total_comissoes.toFixed(2)}</TableCell>
                      <TableCell className="font-bold">R$ {run.total_geral.toFixed(2)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" onClick={() => navigate(`/financeiro/folha/${run.id}`)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="icon" variant="ghost" className="text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remover folha?</AlertDialogTitle>
                                <AlertDialogDescription>Folha de {run.competencia} será removida.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteRun(run.id)}>Remover</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
