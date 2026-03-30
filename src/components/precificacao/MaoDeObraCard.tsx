import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, Plus, Trash2, Info } from 'lucide-react';
import { toast } from 'sonner';
import {
  useServiceProfessionalsMT,
  usePayrollEmployeesForService,
  calcCustoHora,
  PROFESSIONAL_ROLE_LABELS,
  type ProfessionalRole,
} from '@/hooks/multitenant/useServiceProfessionalsMT';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

interface MaoDeObraCardProps {
  serviceId: string;
  duracaoMinutos?: number | null;
  onCustoChange?: (custo: number) => void;
}

export function MaoDeObraCard({ serviceId, duracaoMinutos, onCustoChange }: MaoDeObraCardProps) {
  const {
    professionals: serviceProfessionals,
    createServiceProfessional,
    deleteServiceProfessional: removeServiceProfessional,
  } = useServiceProfessionalsMT(serviceId);
  const { employees: availableEmployees, ensurePayrollRecord } = usePayrollEmployeesForService();
  const [newEmployeeId, setNewEmployeeId] = useState('');
  const [newEmployeeRole, setNewEmployeeRole] = useState<ProfessionalRole>('executor');
  const [atendimentosDia, setAtendimentosDia] = useState(8);

  // Calcular custo real: diaria / atendimentos por dia
  const custosPorProfissional = serviceProfessionals.map(sp => {
    const emp = sp.employee as any;
    const isMei = emp?.tipo_contratacao === 'mei';
    const diaria = Number(emp?.diaria_minima) || 0;

    let custoPorSessao: number;
    if (isMei && diaria > 0) {
      // MEI: diaria / atendimentos no dia
      custoPorSessao = diaria / atendimentosDia;
    } else {
      // CLT: custo/hora x tempo
      const custoHora = sp.custo_hora_manual ?? sp.custo_hora_calculado;
      const tempo = sp.tempo_execucao_minutos || duracaoMinutos || 30;
      custoPorSessao = (custoHora * tempo) / 60;
    }

    return {
      ...sp,
      diaria,
      isMei,
      custoPorSessaoReal: Number(custoPorSessao.toFixed(2)),
    };
  });

  const custoMaoDeObra = custosPorProfissional.reduce((sum, p) => sum + p.custoPorSessaoReal, 0);

  // Notificar parent quando custo mudar
  useEffect(() => {
    onCustoChange?.(custoMaoDeObra);
  }, [custoMaoDeObra, onCustoChange]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="h-4 w-4 text-blue-600" />
          Mão de Obra - Profissionais
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Profissionais que executam este serviço. Custo baseado na diária / atendimentos por dia.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Campo de atendimentos por dia */}
        {serviceProfessionals.some(sp => (sp.employee as any)?.tipo_contratacao === 'mei') && (
          <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
            <Info className="h-4 w-4 text-blue-500 shrink-0" />
            <div className="flex items-center gap-2 flex-1">
              <span className="text-sm text-blue-700">Atendimentos/Dia:</span>
              <Input
                type="number"
                min="1"
                max="30"
                className="w-20 h-8 text-center text-sm"
                value={atendimentosDia}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  if (val > 0) setAtendimentosDia(val);
                }}
              />
              <span className="text-xs text-blue-600">
                (Diária ÷ atendimentos = custo por sessão)
              </span>
            </div>
          </div>
        )}

        {serviceProfessionals.length > 0 && (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Profissional</TableHead>
                  <TableHead className="text-center">Papel</TableHead>
                  <TableHead className="text-right">Diária/Hora</TableHead>
                  <TableHead className="text-right">Custo/Sessão</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {custosPorProfissional.map(sp => (
                  <TableRow key={sp.id}>
                    <TableCell className="font-medium text-sm">
                      {sp.employee?.nome || 'Profissional'}
                      <span className="text-xs text-muted-foreground ml-1">({sp.employee?.cargo || '-'})</span>
                    </TableCell>
                    <TableCell className="text-center text-xs">
                      <Badge variant="outline" className="text-xs">{PROFESSIONAL_ROLE_LABELS[sp.papel] || sp.papel}</Badge>
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {sp.isMei ? (
                        <div>
                          <span>{formatCurrency(sp.diaria)}</span>
                          <div className="text-[10px] text-muted-foreground">
                            diária ÷ {atendimentosDia} atend.
                          </div>
                        </div>
                      ) : (
                        <span>{formatCurrency(sp.custo_hora_manual ?? sp.custo_hora_calculado)}/h</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium text-sm">
                      {formatCurrency(sp.custoPorSessaoReal)}
                    </TableCell>
                    <TableCell>
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive"
                        onClick={() => removeServiceProfessional(sp.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/50 font-bold">
                  <TableCell colSpan={3} className="text-right text-sm">Total Mão de Obra/Sessão:</TableCell>
                  <TableCell className="text-right text-sm text-blue-700">{formatCurrency(custoMaoDeObra)}</TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        )}

        {serviceProfessionals.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhum profissional vinculado. Adicione os profissionais que executam este serviço.
          </p>
        )}

        <div className="flex gap-2 items-end">
          <div className="flex-1 space-y-1">
            <Label className="text-xs">Profissional</Label>
            <Select value={newEmployeeId} onValueChange={setNewEmployeeId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um profissional..." />
              </SelectTrigger>
              <SelectContent>
                {availableEmployees
                  .filter(e => !serviceProfessionals.some(sp => sp.employee_id === e.id))
                  .map(e => {
                    const custoH = calcCustoHora(e);
                    return (
                      <SelectItem key={e.id} value={e.id}>
                        {e.nome} ({e.cargo || 'Profissional'}){custoH > 0 ? ` - ${formatCurrency(custoH)}/h` : ' - sem salário'}
                      </SelectItem>
                    );
                  })}
              </SelectContent>
            </Select>
          </div>
          <div className="w-32 space-y-1">
            <Label className="text-xs">Papel</Label>
            <Select value={newEmployeeRole} onValueChange={(v) => setNewEmployeeRole(v as ProfessionalRole)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(PROFESSIONAL_ROLE_LABELS).map(([val, label]) => (
                  <SelectItem key={val} value={val}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="button" size="sm" disabled={!newEmployeeId}
            onClick={async () => {
              const emp = availableEmployees.find(e => e.id === newEmployeeId);
              if (!emp) return;
              try {
                const payrollEmp = await ensurePayrollRecord(emp);
                await createServiceProfessional(
                  { service_id: serviceId, employee_id: payrollEmp.id, papel: newEmployeeRole },
                  payrollEmp,
                  duracaoMinutos,
                );
                setNewEmployeeId('');
                setNewEmployeeRole('executor');
              } catch (err: any) {
                toast.error(err.message || 'Erro ao vincular profissional');
              }
            }}>
            <Plus className="h-4 w-4 mr-1" /> Vincular
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
