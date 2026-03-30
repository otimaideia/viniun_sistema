import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { usePayrollEmployeesMT } from "@/hooks/multitenant/usePayrollMT";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Edit, Save, User, Banknote, Heart, FileText, Briefcase, Activity, Calculator, Shield, Users, Clock, Upload, Trash2, Download, FolderOpen, Eye, ClipboardCheck, CheckCircle2, AlertCircle, XCircle, CircleDot, UserX, UserCheck } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Progress } from "@/components/ui/progress";
import type { PayrollEmployee, DemissionalData } from "@/types/financeiro";
import { CHECKLIST_STATUS_LABELS, CHECKLIST_CATEGORIA_LABELS, QUEM_SOLICITOU_OPTIONS, TIPO_AVISO_PREVIO_OPTIONS } from "@/types/financeiro";
import { usePayrollDemissionalDataMT } from "@/hooks/multitenant/usePayrollDemissionalDataMT";
import { usePayrollDocumentsMT, DOCUMENT_CATEGORIES } from "@/hooks/multitenant/usePayrollDocumentsMT";
import { usePayrollChecklistMT } from "@/hooks/multitenant/usePayrollChecklistMT";
import { toast } from "sonner";

export default function FolhaFuncionarioDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { employees, updateEmployee } = usePayrollEmployeesMT();
  const [employee, setEmployee] = useState<PayrollEmployee | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [fields, setFields] = useState<Record<string, any>>({});

  // Documents
  const { documents, isLoading: docsLoading, uploadDocument, deleteDocument } = usePayrollDocumentsMT(id);
  // Checklist Admissional
  const checklist = usePayrollChecklistMT(id, 'admissional');
  // Checklist Demissional
  const checklistDemissional = usePayrollChecklistMT(id, 'demissional');
  const demissionalData = usePayrollDemissionalDataMT(id);
  const [demissionalForm, setDemissionalForm] = useState({
    quem_solicitou: '' as string,
    tipo_aviso_previo: '' as string,
    variaveis: '',
    descontos: '',
    info_ferias_13: '',
    houve_afastamento: '',
  });
  const [demissionalFormLoaded, setDemissionalFormLoaded] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [docCategoria, setDocCategoria] = useState('outro');
  const [docNome, setDocNome] = useState('');
  const [docDescricao, setDocDescricao] = useState('');
  const [docCompetencia, setDocCompetencia] = useState('');
  const [docFile, setDocFile] = useState<File | null>(null);

  useEffect(() => {
    if (employees.length && id) {
      const emp = employees.find(e => e.id === id);
      if (emp) {
        setEmployee(emp);
        setFields({ ...(emp as any) });
      }
    }
  }, [employees, id]);

  // Load demissional form data when available
  useEffect(() => {
    if (demissionalData.data && !demissionalFormLoaded) {
      setDemissionalForm({
        quem_solicitou: demissionalData.data.quem_solicitou || '',
        tipo_aviso_previo: demissionalData.data.tipo_aviso_previo || '',
        variaveis: demissionalData.data.variaveis || '',
        descontos: demissionalData.data.descontos || '',
        info_ferias_13: demissionalData.data.info_ferias_13 || '',
        houve_afastamento: demissionalData.data.houve_afastamento || '',
      });
      setDemissionalFormLoaded(true);
    }
  }, [demissionalData.data, demissionalFormLoaded]);

  const handleFieldChange = (key: string, value: any) => {
    setFields(prev => ({ ...prev, [key]: value }));
  };

  const handleSaveSection = async (section: string) => {
    if (!id) return;
    setSaving(true);
    try {
      let data: Record<string, any> = {};

      if (section === 'pessoais') {
        data = {
          pis: fields.pis || null,
          rg: fields.rg || null,
          data_nascimento: fields.data_nascimento || null,
          telefone: fields.telefone || null,
          email: fields.email || null,
          endereco: fields.endereco || null,
        };
      } else if (section === 'bancarios') {
        data = {
          banco: fields.banco || null,
          agencia: fields.agencia || null,
          conta_bancaria: fields.conta_bancaria || null,
          pix: fields.pix || null,
        };
      } else if (section === 'jornada') {
        data = {
          jornada_semanal: fields.jornada_semanal ? parseInt(fields.jornada_semanal) : 44,
          horario_entrada: fields.horario_entrada || '08:00',
          horario_saida: fields.horario_saida || '18:00',
        };
      } else if (section === 'remuneracao') {
        data = {
          salario_base: parseFloat(fields.salario_base || '0'),
          diaria_minima: parseFloat(fields.diaria_minima || '100'),
          has_vt: fields.has_vt || false,
          vt_valor: fields.has_vt ? parseFloat(fields.vt_valor || '0') : 0,
          has_vr: fields.has_vr || false,
          vr_valor: fields.has_vr ? parseFloat(fields.vr_valor || '0') : 0,
          fgts_percentual: parseFloat(fields.fgts_percentual || '8'),
          inss_percentual: parseFloat(fields.inss_percentual || '11'),
          comissao_tipo: fields.comissao_tipo || null,
          comissao_valor: parseFloat(fields.comissao_valor || '0'),
          comissao_descricao: fields.comissao_descricao || null,
          comissao_meta_global_pct: parseFloat(fields.comissao_meta_global_pct || '0'),
          comissao_meta_individual_pct: parseFloat(fields.comissao_meta_individual_pct || '0'),
        };
      } else if (section === 'encargos') {
        data = {
          provisao_13_pct: parseFloat(fields.provisao_13_pct || '8.33'),
          provisao_ferias_pct: parseFloat(fields.provisao_ferias_pct || '8.33'),
          provisao_ferias_terco_pct: parseFloat(fields.provisao_ferias_terco_pct || '2.78'),
          provisao_multa_fgts_pct: parseFloat(fields.provisao_multa_fgts_pct || '4'),
          inss_patronal_pct: parseFloat(fields.inss_patronal_pct || '20'),
          rat_pct: parseFloat(fields.rat_pct || '2'),
          sistema_s_pct: parseFloat(fields.sistema_s_pct || '5.8'),
          salario_educacao_pct: parseFloat(fields.salario_educacao_pct || '2.5'),
        };
      } else if (section === 'beneficios') {
        data = {
          has_va: fields.has_va || false,
          va_valor: fields.has_va ? parseFloat(fields.va_valor || '0') : 0,
          has_plano_saude: fields.has_plano_saude || false,
          plano_saude_valor: fields.has_plano_saude ? parseFloat(fields.plano_saude_valor || '0') : 0,
          has_plano_odonto: fields.has_plano_odonto || false,
          plano_odonto_valor: fields.has_plano_odonto ? parseFloat(fields.plano_odonto_valor || '0') : 0,
          has_auxilio_creche: fields.has_auxilio_creche || false,
          auxilio_creche_valor: fields.has_auxilio_creche ? parseFloat(fields.auxilio_creche_valor || '0') : 0,
          has_salario_familia: fields.has_salario_familia || false,
          salario_familia_valor: fields.has_salario_familia ? parseFloat(fields.salario_familia_valor || '0') : 0,
        };
      } else if (section === 'descontos') {
        data = {
          desconto_vt_pct: parseFloat(fields.desconto_vt_pct || '6'),
          inss_funcionario_pct: parseFloat(fields.inss_funcionario_pct || '0'),
          irrf_valor: parseFloat(fields.irrf_valor || '0'),
        };
      } else if (section === 'dependentes') {
        data = {
          qtd_dependentes: parseInt(fields.qtd_dependentes || '0'),
          qtd_filhos_creche: parseInt(fields.qtd_filhos_creche || '0'),
          qtd_filhos_salario_familia: parseInt(fields.qtd_filhos_salario_familia || '0'),
        };
      }

      await updateEmployee(id, data);
      setEditing(null);
      toast.success('Dados atualizados');
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (!employee) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Carregando funcionário...
      </div>
    );
  }

  const emp = fields as any;
  const isCLT = emp.tipo_contratacao === 'clt';
  const isMEI = emp.tipo_contratacao === 'mei';

  const SectionHeader = ({ title, section }: { title: string; section: string }) => (
    <div className="flex items-center justify-between mb-4">
      <h3 className="font-semibold text-lg">{title}</h3>
      {editing === section ? (
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => { setFields({ ...(employee as any) }); setEditing(null); }}>
            Cancelar
          </Button>
          <Button size="sm" onClick={() => handleSaveSection(section)} disabled={saving}>
            <Save className="h-3 w-3 mr-1" />
            {saving ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      ) : (
        <Button size="sm" variant="outline" onClick={() => setEditing(section)}>
          <Edit className="h-3 w-3 mr-1" />
          Editar
        </Button>
      )}
    </div>
  );

  const ReadOnlyField = ({ label, value }: { label: string; value: string | number | null | undefined }) => (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <p className="text-sm font-medium">{value ?? '—'}</p>
    </div>
  );

  const ReadOnlyRow = ({ label, value, suffix }: { label: string; value: string | number | null | undefined; suffix?: string }) => (
    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
      <span>{label}</span>
      <span className="font-medium">{value ?? '—'}{suffix || ''}</span>
    </div>
  );

  // Calculate cost summary
  const salario = employee.salario_base;
  const benefTotal = (employee.has_vt ? employee.vt_valor : 0) + (employee.has_vr ? employee.vr_valor : 0) +
    (employee.has_va ? (employee.va_valor || 0) : 0) + (employee.has_plano_saude ? (employee.plano_saude_valor || 0) : 0) +
    (employee.has_plano_odonto ? (employee.plano_odonto_valor || 0) : 0) + (employee.has_auxilio_creche ? (employee.auxilio_creche_valor || 0) : 0) +
    (employee.has_salario_familia ? (employee.salario_familia_valor || 0) : 0);
  const provTotal = salario * (((employee.provisao_13_pct || 8.33) + (employee.provisao_ferias_pct || 8.33) + (employee.provisao_ferias_terco_pct || 2.78) + (employee.provisao_multa_fgts_pct || 4)) / 100);
  const encTotal = salario * ((employee.fgts_percentual + (employee.inss_patronal_pct || 20) + (employee.rat_pct || 2) + (employee.sistema_s_pct || 5.8) + (employee.salario_educacao_pct || 2.5)) / 100);
  const custoTotal = salario + benefTotal + provTotal + encTotal;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/financeiro/folha')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{employee.nome}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={isCLT ? 'default' : 'secondary'} className={isCLT ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}>
                {isCLT ? <Briefcase className="h-3 w-3 mr-1" /> : <Activity className="h-3 w-3 mr-1" />}
                {isCLT ? 'CLT' : 'MEI'}
              </Badge>
              <span className="text-sm text-muted-foreground">{employee.cargo}</span>
              {employee.is_active ? (
                <Badge variant="outline" className="text-green-600 border-green-300">Ativo</Badge>
              ) : (
                <Badge variant="outline" className="text-red-600 border-red-300">Inativo</Badge>
              )}
              {checklist.totalItems > 0 && (
                checklist.percentComplete === 100 ? (
                  <Badge variant="outline" className="text-green-600 border-green-300">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Docs completa
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-amber-600 border-amber-300">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Docs: {checklist.percentComplete}%
                  </Badge>
                )
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              {employee.is_active ? (
                <Button variant="outline" className="text-red-600 border-red-300 hover:bg-red-50">
                  <UserX className="h-4 w-4 mr-2" />
                  Desativar
                </Button>
              ) : (
                <Button variant="outline" className="text-green-600 border-green-300 hover:bg-green-50">
                  <UserCheck className="h-4 w-4 mr-2" />
                  Reativar
                </Button>
              )}
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {employee.is_active ? 'Desativar colaborador?' : 'Reativar colaborador?'}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {employee.is_active
                    ? `${employee.nome} perderá acesso ao sistema e não aparecerá na folha de pagamento. Você pode reativar depois.`
                    : `${employee.nome} voltará a ter acesso ao sistema e aparecerá na folha de pagamento.`
                  }
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  className={employee.is_active ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}
                  onClick={async () => {
                    try {
                      const newStatus = !employee.is_active;
                      await updateEmployee(id!, {
                        is_active: newStatus,
                        data_desligamento: newStatus ? null : new Date().toISOString().split('T')[0],
                      } as any);
                      setEmployee(prev => prev ? { ...prev, is_active: newStatus, data_desligamento: newStatus ? null : new Date().toISOString().split('T')[0] } : prev);
                      // Auto-create demissional checklist when deactivating (CLT only)
                      if (!newStatus && isCLT && employee.tenant_id) {
                        try {
                          const created = await checklistDemissional.createDemissionalItems(id!, employee.tenant_id);
                          if (created) toast.info('Checklist demissional criado automaticamente');
                        } catch { /* ignore if fails */ }
                      }
                      toast.success(newStatus ? 'Colaborador reativado' : 'Colaborador desativado');
                    } catch (err: any) {
                      toast.error(`Erro: ${err.message}`);
                    }
                  }}
                >
                  {employee.is_active ? 'Sim, desativar' : 'Sim, reativar'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <Button variant="outline" onClick={() => navigate(`/financeiro/folha/funcionario/${id}/editar`)}>
            <Edit className="h-4 w-4 mr-2" />
            Editar Cadastro
          </Button>
        </div>
      </div>

      {/* Resumo rápido */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">{isCLT ? 'Salário Base' : 'Diária Mínima'}</p>
            <p className="text-xl font-bold">R$ {(isCLT ? salario : (emp.diaria_minima || 100)).toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Admissão</p>
            <p className="text-xl font-bold">{employee.data_admissao ? new Date(employee.data_admissao + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">CPF/CNPJ</p>
            <p className="text-xl font-bold">{employee.cpf || '—'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">{isCLT ? 'Custo Total Est.' : 'Estimativa/mês'}</p>
            <p className="text-xl font-bold">
              {isCLT ? `R$ ${custoTotal.toFixed(2)}` : `R$ ${((emp.diaria_minima || 100) * 26).toFixed(2)}`}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Abas de detalhes */}
      <Tabs defaultValue="pessoais">
        <TabsList className="flex flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="pessoais" className="flex items-center gap-1">
            <User className="h-3 w-3" />
            <span className="hidden sm:inline">Pessoal</span>
          </TabsTrigger>
          <TabsTrigger value="bancarios" className="flex items-center gap-1">
            <Banknote className="h-3 w-3" />
            <span className="hidden sm:inline">Bancário</span>
          </TabsTrigger>
          <TabsTrigger value="jornada" className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span className="hidden sm:inline">Jornada</span>
          </TabsTrigger>
          <TabsTrigger value="remuneracao" className="flex items-center gap-1">
            <Banknote className="h-3 w-3" />
            <span className="hidden sm:inline">Remuneração</span>
          </TabsTrigger>
          {isCLT && (
            <TabsTrigger value="encargos" className="flex items-center gap-1">
              <Calculator className="h-3 w-3" />
              <span className="hidden sm:inline">Provisões & Encargos</span>
            </TabsTrigger>
          )}
          {isCLT && (
            <TabsTrigger value="beneficios" className="flex items-center gap-1">
              <Heart className="h-3 w-3" />
              <span className="hidden sm:inline">Benefícios</span>
            </TabsTrigger>
          )}
          {isCLT && (
            <TabsTrigger value="descontos" className="flex items-center gap-1">
              <Shield className="h-3 w-3" />
              <span className="hidden sm:inline">Descontos</span>
            </TabsTrigger>
          )}
          <TabsTrigger value="dependentes" className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            <span className="hidden sm:inline">Dependentes</span>
          </TabsTrigger>
          <TabsTrigger value="documentos" className="flex items-center gap-1">
            <FolderOpen className="h-3 w-3" />
            <span className="hidden sm:inline">Documentos</span>
            {documents.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">{documents.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="checklist" className="flex items-center gap-1">
            <ClipboardCheck className="h-3 w-3" />
            <span className="hidden sm:inline">Checklist</span>
            {checklist.totalItems > 0 && (
              <Badge
                variant="secondary"
                className={`ml-1 h-5 px-1.5 text-xs ${
                  checklist.percentComplete === 100 ? 'bg-green-100 text-green-800' :
                  checklist.percentComplete >= 50 ? 'bg-amber-100 text-amber-800' :
                  'bg-red-100 text-red-800'
                }`}
              >
                {checklist.percentComplete}%
              </Badge>
            )}
          </TabsTrigger>
          {isCLT && (
            <TabsTrigger value="demissional" className="flex items-center gap-1">
              <UserX className="h-3 w-3" />
              <span className="hidden sm:inline">Demissional</span>
              {checklistDemissional.totalItems > 0 && (
                <Badge
                  variant="secondary"
                  className={`ml-1 h-5 px-1.5 text-xs ${
                    checklistDemissional.percentComplete === 100 ? 'bg-green-100 text-green-800' :
                    checklistDemissional.percentComplete >= 50 ? 'bg-amber-100 text-amber-800' :
                    !employee?.is_active ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {checklistDemissional.percentComplete}%
                </Badge>
              )}
            </TabsTrigger>
          )}
        </TabsList>

        {/* Tab: Dados Pessoais */}
        <TabsContent value="pessoais">
          <Card>
            <CardContent className="pt-6">
              <SectionHeader title="Dados Pessoais & Documentos" section="pessoais" />
              {editing === 'pessoais' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>PIS/PASEP</Label>
                    <Input value={emp.pis || ''} onChange={e => handleFieldChange('pis', e.target.value)} placeholder="000.00000.00-0" />
                  </div>
                  <div className="space-y-2">
                    <Label>RG</Label>
                    <Input value={emp.rg || ''} onChange={e => handleFieldChange('rg', e.target.value)} placeholder="00.000.000-0" />
                  </div>
                  <div className="space-y-2">
                    <Label>Data de Nascimento</Label>
                    <Input type="date" value={emp.data_nascimento || ''} onChange={e => handleFieldChange('data_nascimento', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Telefone</Label>
                    <Input value={emp.telefone || ''} onChange={e => handleFieldChange('telefone', e.target.value)} placeholder="(00) 00000-0000" />
                  </div>
                  <div className="space-y-2">
                    <Label>Email Pessoal</Label>
                    <Input type="email" value={emp.email || ''} onChange={e => handleFieldChange('email', e.target.value)} placeholder="email@exemplo.com" />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Endereço Completo</Label>
                    <Textarea value={emp.endereco || ''} onChange={e => handleFieldChange('endereco', e.target.value)} placeholder="Rua, número, bairro, cidade - UF, CEP" rows={2} />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <ReadOnlyField label="PIS/PASEP" value={emp.pis} />
                  <ReadOnlyField label="RG" value={emp.rg} />
                  <ReadOnlyField label="Data de Nascimento" value={emp.data_nascimento ? new Date(emp.data_nascimento + 'T12:00:00').toLocaleDateString('pt-BR') : null} />
                  <ReadOnlyField label="Telefone" value={emp.telefone} />
                  <ReadOnlyField label="Email Pessoal" value={emp.email} />
                  <ReadOnlyField label="Endereço" value={emp.endereco} />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Dados Bancários */}
        <TabsContent value="bancarios">
          <Card>
            <CardContent className="pt-6">
              <SectionHeader title="Dados Bancários" section="bancarios" />
              {editing === 'bancarios' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Banco</Label>
                    <Input value={emp.banco || ''} onChange={e => handleFieldChange('banco', e.target.value)} placeholder="Ex: Bradesco, Itaú, Nubank" />
                  </div>
                  <div className="space-y-2">
                    <Label>Agência</Label>
                    <Input value={emp.agencia || ''} onChange={e => handleFieldChange('agencia', e.target.value)} placeholder="0000" />
                  </div>
                  <div className="space-y-2">
                    <Label>Conta</Label>
                    <Input value={emp.conta_bancaria || ''} onChange={e => handleFieldChange('conta_bancaria', e.target.value)} placeholder="00000-0" />
                  </div>
                  <div className="space-y-2">
                    <Label>Chave PIX</Label>
                    <Input value={emp.pix || ''} onChange={e => handleFieldChange('pix', e.target.value)} placeholder="CPF, email, telefone ou chave aleatória" />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <ReadOnlyField label="Banco" value={emp.banco} />
                  <ReadOnlyField label="Agência" value={emp.agencia} />
                  <ReadOnlyField label="Conta" value={emp.conta_bancaria} />
                  <ReadOnlyField label="Chave PIX" value={emp.pix} />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Jornada */}
        <TabsContent value="jornada">
          <Card>
            <CardContent className="pt-6">
              <SectionHeader title="Jornada de Trabalho" section="jornada" />
              {editing === 'jornada' ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Jornada Semanal (horas)</Label>
                    <Input type="number" value={emp.jornada_semanal || 44} onChange={e => handleFieldChange('jornada_semanal', e.target.value)} />
                    <p className="text-xs text-muted-foreground">Padrão CLT: 44h | Parcial: 30h ou 36h</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Horário de Entrada</Label>
                    <Input type="time" value={emp.horario_entrada || '08:00'} onChange={e => handleFieldChange('horario_entrada', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Horário de Saída</Label>
                    <Input type="time" value={emp.horario_saida || '18:00'} onChange={e => handleFieldChange('horario_saida', e.target.value)} />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <ReadOnlyField label="Jornada Semanal" value={`${emp.jornada_semanal || 44}h`} />
                  <ReadOnlyField label="Horário de Entrada" value={emp.horario_entrada || '08:00'} />
                  <ReadOnlyField label="Horário de Saída" value={emp.horario_saida || '18:00'} />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Remuneração */}
        <TabsContent value="remuneracao">
          <Card>
            <CardContent className="pt-6">
              <SectionHeader title={isCLT ? 'Remuneração CLT' : 'Remuneração MEI'} section="remuneracao" />

              {editing === 'remuneracao' ? (
                <div className="space-y-6">
                  {isCLT ? (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Salário Base Mensal (R$)</Label>
                          <Input type="number" step="0.01" value={emp.salario_base || ''} onChange={e => handleFieldChange('salario_base', e.target.value)} />
                        </div>
                      </div>

                      <h4 className="font-medium text-sm pt-2">Benefícios Base</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Switch checked={emp.has_vt || false} onCheckedChange={v => handleFieldChange('has_vt', v)} />
                            <Label>Vale Transporte</Label>
                          </div>
                          {emp.has_vt && <Input type="number" step="0.01" value={emp.vt_valor || ''} onChange={e => handleFieldChange('vt_valor', e.target.value)} placeholder="Valor mensal" />}
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Switch checked={emp.has_vr || false} onCheckedChange={v => handleFieldChange('has_vr', v)} />
                            <Label>Vale Refeição</Label>
                          </div>
                          {emp.has_vr && <Input type="number" step="0.01" value={emp.vr_valor || ''} onChange={e => handleFieldChange('vr_valor', e.target.value)} placeholder="Valor mensal" />}
                        </div>
                      </div>

                      <h4 className="font-medium text-sm pt-2">Encargos Base</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>FGTS (%)</Label>
                          <Input type="number" step="0.01" value={emp.fgts_percentual || 8} onChange={e => handleFieldChange('fgts_percentual', e.target.value)} />
                        </div>
                        <div className="space-y-2">
                          <Label>INSS (%)</Label>
                          <Input type="number" step="0.01" value={emp.inss_percentual || 11} onChange={e => handleFieldChange('inss_percentual', e.target.value)} />
                        </div>
                      </div>

                      <h4 className="font-medium text-sm pt-2">Comissão por Metas</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Meta Global (Unidade) %</Label>
                          <Input type="number" step="0.01" value={emp.comissao_meta_global_pct || ''} onChange={e => handleFieldChange('comissao_meta_global_pct', e.target.value)} />
                        </div>
                        <div className="space-y-2">
                          <Label>Meta Individual (Pessoa) %</Label>
                          <Input type="number" step="0.01" value={emp.comissao_meta_individual_pct || ''} onChange={e => handleFieldChange('comissao_meta_individual_pct', e.target.value)} />
                        </div>
                      </div>

                      <h4 className="font-medium text-sm pt-2">Comissão Extra</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label>Tipo</Label>
                          <Input value={emp.comissao_tipo || ''} onChange={e => handleFieldChange('comissao_tipo', e.target.value)} placeholder="valor_fixo ou percentual" />
                        </div>
                        <div className="space-y-2">
                          <Label>Valor</Label>
                          <Input type="number" step="0.01" value={emp.comissao_valor || ''} onChange={e => handleFieldChange('comissao_valor', e.target.value)} />
                        </div>
                        <div className="space-y-2">
                          <Label>Descrição</Label>
                          <Input value={emp.comissao_descricao || ''} onChange={e => handleFieldChange('comissao_descricao', e.target.value)} />
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Diária Mínima (R$)</Label>
                        <Input type="number" step="0.01" value={emp.diaria_minima || 100} onChange={e => handleFieldChange('diaria_minima', e.target.value)} />
                        <p className="text-xs text-muted-foreground">Valor mínimo garantido por dia de presença</p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {isCLT ? (
                    <>
                      <ReadOnlyRow label="Salário Base" value={`R$ ${salario.toFixed(2)}`} />

                      <h4 className="font-medium text-sm pt-2 text-muted-foreground">Benefícios Base</h4>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <span>Vale Transporte (VT)</span>
                        {employee.has_vt ? (
                          <span className="font-medium text-green-600">R$ {employee.vt_valor.toFixed(2)}</span>
                        ) : (
                          <span className="text-muted-foreground">Não habilitado</span>
                        )}
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <span>Vale Refeição (VR)</span>
                        {employee.has_vr ? (
                          <span className="font-medium text-green-600">R$ {employee.vr_valor.toFixed(2)}</span>
                        ) : (
                          <span className="text-muted-foreground">Não habilitado</span>
                        )}
                      </div>

                      <h4 className="font-medium text-sm pt-2 text-muted-foreground">Encargos Base</h4>
                      <ReadOnlyRow label="FGTS" value={`${employee.fgts_percentual}%`} suffix={` (R$ ${(salario * employee.fgts_percentual / 100).toFixed(2)})`} />
                      <ReadOnlyRow label="INSS" value={`${employee.inss_percentual}%`} suffix={` (R$ ${(salario * employee.inss_percentual / 100).toFixed(2)})`} />

                      <h4 className="font-medium text-sm pt-2 text-muted-foreground">Comissão por Metas</h4>
                      <ReadOnlyRow label="Meta Global (Unidade)" value={`${emp.comissao_meta_global_pct || 0}%`} />
                      <ReadOnlyRow label="Meta Individual (Pessoa)" value={`${emp.comissao_meta_individual_pct || 0}%`} />

                      {(emp.comissao_tipo || emp.comissao_valor > 0) && (
                        <>
                          <h4 className="font-medium text-sm pt-2 text-muted-foreground">Comissão Extra</h4>
                          <ReadOnlyRow label="Tipo" value={emp.comissao_tipo === 'valor_fixo' ? 'Valor Fixo' : emp.comissao_tipo === 'percentual_faturamento' ? '% Faturamento' : emp.comissao_tipo || '—'} />
                          <ReadOnlyRow label="Valor" value={`R$ ${(emp.comissao_valor || 0).toFixed(2)}`} />
                          {emp.comissao_descricao && <ReadOnlyRow label="Descrição" value={emp.comissao_descricao} />}
                        </>
                      )}
                    </>
                  ) : (
                    <>
                      <ReadOnlyRow label="Diária Mínima" value={`R$ ${(emp.diaria_minima || 100).toFixed(2)}`} />
                      <ReadOnlyRow label="Estimativa 26 dias" value={`R$ ${((emp.diaria_minima || 100) * 26).toFixed(2)}`} />
                      <div className="p-4 rounded-lg bg-green-50 border border-green-200 text-sm text-green-700">
                        Pagamento = MAX(diária mínima, comissões do dia). Acompanhe pelo módulo Produtividade.
                      </div>
                    </>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Provisões & Encargos (CLT only) */}
        {isCLT && (
          <TabsContent value="encargos">
            <Card>
              <CardContent className="pt-6">
                <SectionHeader title="Provisões & Encargos Patronais" section="encargos" />
                <p className="text-sm text-muted-foreground mb-4">
                  Provisões são rateio mensal de custos anuais. Encargos patronais são contribuições obrigatórias do empregador.
                </p>

                {editing === 'encargos' ? (
                  <div className="space-y-6">
                    <h4 className="font-medium text-sm">Provisões (% sobre salário)</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <Label>13º Salário (%)</Label>
                        <Input type="number" step="0.01" value={emp.provisao_13_pct ?? 8.33} onChange={e => handleFieldChange('provisao_13_pct', e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>Férias (%)</Label>
                        <Input type="number" step="0.01" value={emp.provisao_ferias_pct ?? 8.33} onChange={e => handleFieldChange('provisao_ferias_pct', e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>1/3 de Férias (%)</Label>
                        <Input type="number" step="0.01" value={emp.provisao_ferias_terco_pct ?? 2.78} onChange={e => handleFieldChange('provisao_ferias_terco_pct', e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>Multa FGTS (%)</Label>
                        <Input type="number" step="0.01" value={emp.provisao_multa_fgts_pct ?? 4} onChange={e => handleFieldChange('provisao_multa_fgts_pct', e.target.value)} />
                      </div>
                    </div>

                    <h4 className="font-medium text-sm pt-2">Encargos Patronais (% sobre salário)</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <Label>INSS Patronal (%)</Label>
                        <Input type="number" step="0.01" value={emp.inss_patronal_pct ?? 20} onChange={e => handleFieldChange('inss_patronal_pct', e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>RAT/SAT (%)</Label>
                        <Input type="number" step="0.01" value={emp.rat_pct ?? 2} onChange={e => handleFieldChange('rat_pct', e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>Sistema S (%)</Label>
                        <Input type="number" step="0.01" value={emp.sistema_s_pct ?? 5.8} onChange={e => handleFieldChange('sistema_s_pct', e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>Sal. Educação (%)</Label>
                        <Input type="number" step="0.01" value={emp.salario_educacao_pct ?? 2.5} onChange={e => handleFieldChange('salario_educacao_pct', e.target.value)} />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <h4 className="font-medium text-sm text-muted-foreground">Provisões</h4>
                    <ReadOnlyRow label="13º Salário" value={`${emp.provisao_13_pct ?? 8.33}%`} suffix={` (R$ ${(salario * (emp.provisao_13_pct ?? 8.33) / 100).toFixed(2)})`} />
                    <ReadOnlyRow label="Férias" value={`${emp.provisao_ferias_pct ?? 8.33}%`} suffix={` (R$ ${(salario * (emp.provisao_ferias_pct ?? 8.33) / 100).toFixed(2)})`} />
                    <ReadOnlyRow label="1/3 de Férias" value={`${emp.provisao_ferias_terco_pct ?? 2.78}%`} suffix={` (R$ ${(salario * (emp.provisao_ferias_terco_pct ?? 2.78) / 100).toFixed(2)})`} />
                    <ReadOnlyRow label="Multa FGTS" value={`${emp.provisao_multa_fgts_pct ?? 4}%`} suffix={` (R$ ${(salario * (emp.provisao_multa_fgts_pct ?? 4) / 100).toFixed(2)})`} />

                    <div className="border-t pt-3 mt-3">
                      <div className="flex items-center justify-between font-medium text-blue-700">
                        <span>Subtotal Provisões</span>
                        <span>R$ {provTotal.toFixed(2)}</span>
                      </div>
                    </div>

                    <h4 className="font-medium text-sm text-muted-foreground pt-4">Encargos Patronais</h4>
                    <ReadOnlyRow label="INSS Patronal" value={`${emp.inss_patronal_pct ?? 20}%`} suffix={` (R$ ${(salario * (emp.inss_patronal_pct ?? 20) / 100).toFixed(2)})`} />
                    <ReadOnlyRow label="RAT/SAT" value={`${emp.rat_pct ?? 2}%`} suffix={` (R$ ${(salario * (emp.rat_pct ?? 2) / 100).toFixed(2)})`} />
                    <ReadOnlyRow label="Sistema S" value={`${emp.sistema_s_pct ?? 5.8}%`} suffix={` (R$ ${(salario * (emp.sistema_s_pct ?? 5.8) / 100).toFixed(2)})`} />
                    <ReadOnlyRow label="Sal. Educação" value={`${emp.salario_educacao_pct ?? 2.5}%`} suffix={` (R$ ${(salario * (emp.salario_educacao_pct ?? 2.5) / 100).toFixed(2)})`} />

                    <div className="border-t pt-3 mt-3">
                      <div className="flex items-center justify-between font-medium text-orange-700">
                        <span>Subtotal Encargos</span>
                        <span>R$ {encTotal.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Tab: Benefícios Extra (CLT only) */}
        {isCLT && (
          <TabsContent value="beneficios">
            <Card>
              <CardContent className="pt-6">
                <SectionHeader title="Benefícios Extras" section="beneficios" />
                <p className="text-sm text-muted-foreground mb-4">
                  VT e VR são configurados na aba Remuneração. Aqui ficam benefícios adicionais.
                </p>
                {editing === 'beneficios' ? (
                  <div className="space-y-4">
                    {[
                      { key: 'va', label: 'Vale Alimentação (VA)', desc: 'Diferente do VR — usado em supermercados', placeholder: 'Valor mensal' },
                      { key: 'plano_saude', label: 'Plano de Saúde', desc: 'Valor da parte patronal (empresa)', placeholder: 'Valor mensal' },
                      { key: 'plano_odonto', label: 'Plano Odontológico', desc: 'Valor da parte patronal (empresa)', placeholder: 'Valor mensal' },
                      { key: 'auxilio_creche', label: 'Auxílio Creche', desc: 'Filhos até 5 anos e 11 meses', placeholder: 'Valor mensal' },
                      { key: 'salario_familia', label: 'Salário Família', desc: 'Para funcionários de baixa renda com filhos até 14 anos', placeholder: 'Valor por filho' },
                    ].map(item => (
                      <div key={item.key} className="flex items-center justify-between p-4 rounded-lg border">
                        <div className="flex items-center gap-3">
                          <Switch checked={emp[`has_${item.key}`] || false} onCheckedChange={v => handleFieldChange(`has_${item.key}`, v)} />
                          <div>
                            <Label>{item.label}</Label>
                            <p className="text-xs text-muted-foreground">{item.desc}</p>
                          </div>
                        </div>
                        {emp[`has_${item.key}`] && (
                          <Input type="number" step="0.01" className="w-40" value={emp[`${item.key}_valor`] || ''} onChange={e => handleFieldChange(`${item.key}_valor`, e.target.value)} placeholder={item.placeholder} />
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {[
                      { key: 'va', label: 'Vale Alimentação (VA)' },
                      { key: 'plano_saude', label: 'Plano de Saúde' },
                      { key: 'plano_odonto', label: 'Plano Odontológico' },
                      { key: 'auxilio_creche', label: 'Auxílio Creche' },
                      { key: 'salario_familia', label: 'Salário Família' },
                    ].map(item => (
                      <div key={item.key} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <span>{item.label}</span>
                        {emp[`has_${item.key}`] ? (
                          <span className="font-medium text-green-600">R$ {parseFloat(emp[`${item.key}_valor`] || 0).toFixed(2)}</span>
                        ) : (
                          <span className="text-muted-foreground">Não habilitado</span>
                        )}
                      </div>
                    ))}
                    <div className="border-t pt-3 mt-3">
                      <div className="flex items-center justify-between font-medium text-green-700">
                        <span>Total Benefícios Extras</span>
                        <span>R$ {(
                          (emp.has_va ? parseFloat(emp.va_valor || 0) : 0) +
                          (emp.has_plano_saude ? parseFloat(emp.plano_saude_valor || 0) : 0) +
                          (emp.has_plano_odonto ? parseFloat(emp.plano_odonto_valor || 0) : 0) +
                          (emp.has_auxilio_creche ? parseFloat(emp.auxilio_creche_valor || 0) : 0) +
                          (emp.has_salario_familia ? parseFloat(emp.salario_familia_valor || 0) : 0)
                        ).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Tab: Descontos (CLT only) */}
        {isCLT && (
          <TabsContent value="descontos">
            <Card>
              <CardContent className="pt-6">
                <SectionHeader title="Descontos do Funcionário" section="descontos" />
                <p className="text-sm text-muted-foreground mb-4">
                  Valores que são descontados do salário bruto para calcular o líquido.
                </p>
                {editing === 'descontos' ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Desconto VT (%)</Label>
                      <Input type="number" step="0.01" value={emp.desconto_vt_pct || 6} onChange={e => handleFieldChange('desconto_vt_pct', e.target.value)} />
                      <p className="text-xs text-muted-foreground">Padrão: 6% do salário</p>
                    </div>
                    <div className="space-y-2">
                      <Label>INSS Funcionário (%)</Label>
                      <Input type="number" step="0.01" value={emp.inss_funcionario_pct || 0} onChange={e => handleFieldChange('inss_funcionario_pct', e.target.value)} />
                      <p className="text-xs text-muted-foreground">7,5% a 14% progressivo</p>
                    </div>
                    <div className="space-y-2">
                      <Label>IRRF (R$ valor fixo)</Label>
                      <Input type="number" step="0.01" value={emp.irrf_valor || 0} onChange={e => handleFieldChange('irrf_valor', e.target.value)} />
                      <p className="text-xs text-muted-foreground">0 se isento</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div>
                        <span>Desconto VT</span>
                        <p className="text-xs text-muted-foreground">
                          {emp.has_vt ? `${emp.desconto_vt_pct || 6}% de R$ ${salario.toFixed(2)} = R$ ${(salario * (emp.desconto_vt_pct || 6) / 100).toFixed(2)}` : 'Sem VT'}
                        </p>
                      </div>
                      <span className="font-medium">{emp.desconto_vt_pct || 6}%</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div>
                        <span>INSS Funcionário</span>
                        <p className="text-xs text-muted-foreground">
                          {parseFloat(emp.inss_funcionario_pct || 0) > 0
                            ? `${emp.inss_funcionario_pct}% de R$ ${salario.toFixed(2)} = R$ ${(salario * parseFloat(emp.inss_funcionario_pct || 0) / 100).toFixed(2)}`
                            : 'Não configurado — configure a faixa do funcionário'}
                        </p>
                      </div>
                      <span className="font-medium">{emp.inss_funcionario_pct || 0}%</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div>
                        <span>IRRF</span>
                        <p className="text-xs text-muted-foreground">
                          {parseFloat(emp.irrf_valor || 0) > 0 ? 'Valor fixo mensal' : 'Isento'}
                        </p>
                      </div>
                      <span className="font-medium">R$ {parseFloat(emp.irrf_valor || 0).toFixed(2)}</span>
                    </div>
                    <div className="border-t pt-3 mt-3">
                      <div className="flex items-center justify-between font-medium text-red-600">
                        <span>Total Descontos Estimado</span>
                        <span>
                          - R$ {(
                            (emp.has_vt ? salario * (emp.desconto_vt_pct || 6) / 100 : 0) +
                            (salario * parseFloat(emp.inss_funcionario_pct || 0) / 100) +
                            parseFloat(emp.irrf_valor || 0)
                          ).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Tab: Dependentes */}
        <TabsContent value="dependentes">
          <Card>
            <CardContent className="pt-6">
              <SectionHeader title="Dependentes" section="dependentes" />
              {editing === 'dependentes' ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Total de Dependentes</Label>
                    <Input type="number" min="0" value={emp.qtd_dependentes || 0} onChange={e => handleFieldChange('qtd_dependentes', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Filhos até 6 anos (Creche)</Label>
                    <Input type="number" min="0" value={emp.qtd_filhos_creche || 0} onChange={e => handleFieldChange('qtd_filhos_creche', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Filhos até 14 anos (Sal. Família)</Label>
                    <Input type="number" min="0" value={emp.qtd_filhos_salario_familia || 0} onChange={e => handleFieldChange('qtd_filhos_salario_familia', e.target.value)} />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <ReadOnlyField label="Total de Dependentes" value={emp.qtd_dependentes || 0} />
                  <ReadOnlyField label="Filhos até 6 anos (Creche)" value={emp.qtd_filhos_creche || 0} />
                  <ReadOnlyField label="Filhos até 14 anos (Sal. Família)" value={emp.qtd_filhos_salario_familia || 0} />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        {/* Tab: Documentos */}
        <TabsContent value="documentos">
          <Card>
            <CardContent className="pt-6">
              <h3 className="font-semibold text-lg mb-4">Documentos do Funcionário</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Envie contratos, holerites, comprovantes, atestados e outros documentos do funcionário.
              </p>

              {/* Upload Form */}
              <div className="p-4 border rounded-lg bg-muted/30 mb-6">
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Enviar Novo Documento
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Categoria *</Label>
                    <Select value={docCategoria} onValueChange={setDocCategoria}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {DOCUMENT_CATEGORIES.map(cat => (
                          <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Nome do Documento *</Label>
                    <Input
                      value={docNome}
                      onChange={e => setDocNome(e.target.value)}
                      placeholder="Ex: Contrato CLT - Amanda"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Competência (mês/ano)</Label>
                    <Input
                      type="month"
                      value={docCompetencia}
                      onChange={e => setDocCompetencia(e.target.value)}
                      placeholder="2026-03"
                    />
                    <p className="text-xs text-muted-foreground">Obrigatório para holerites e comprovantes mensais</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Descrição (opcional)</Label>
                    <Input
                      value={docDescricao}
                      onChange={e => setDocDescricao(e.target.value)}
                      placeholder="Observações sobre o documento"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Arquivo *</Label>
                    <Input
                      type="file"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp,.xls,.xlsx"
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setDocFile(file);
                          if (!docNome) {
                            const catLabel = DOCUMENT_CATEGORIES.find(c => c.value === docCategoria)?.label || '';
                            setDocNome(catLabel || file.name.replace(/\.[^.]+$/, ''));
                          }
                        }
                      }}
                    />
                    <p className="text-xs text-muted-foreground">PDF, DOC, DOCX, JPG, PNG, XLS, XLSX — máximo 50MB</p>
                  </div>
                </div>
                <div className="mt-4 flex justify-end">
                  <Button
                    onClick={async () => {
                      if (!docFile || !docNome) {
                        toast.error('Selecione um arquivo e informe o nome');
                        return;
                      }
                      setUploadingDoc(true);
                      try {
                        await uploadDocument.mutateAsync({
                          file: docFile,
                          categoria: docCategoria,
                          nome: docNome,
                          descricao: docDescricao || undefined,
                          competencia: docCompetencia || undefined,
                        });
                        // Reset form
                        setDocFile(null);
                        setDocNome('');
                        setDocDescricao('');
                        setDocCompetencia('');
                        setDocCategoria('outro');
                        // Reset file input
                        const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
                        if (fileInput) fileInput.value = '';
                      } finally {
                        setUploadingDoc(false);
                      }
                    }}
                    disabled={uploadingDoc || !docFile || !docNome}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {uploadingDoc ? 'Enviando...' : 'Enviar Documento'}
                  </Button>
                </div>
              </div>

              {/* Documents List */}
              {docsLoading ? (
                <p className="text-center text-muted-foreground py-8">Carregando documentos...</p>
              ) : documents.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FolderOpen className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Nenhum documento enviado ainda.</p>
                  <p className="text-xs">Use o formulário acima para enviar o primeiro documento.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Group by category */}
                  {(() => {
                    const grouped = documents.reduce((acc, doc) => {
                      const cat = doc.categoria || 'outro';
                      if (!acc[cat]) acc[cat] = [];
                      acc[cat].push(doc);
                      return acc;
                    }, {} as Record<string, typeof documents>);

                    return Object.entries(grouped).map(([cat, docs]) => {
                      const catLabel = DOCUMENT_CATEGORIES.find(c => c.value === cat)?.label || cat;
                      return (
                        <div key={cat} className="mb-4">
                          <h4 className="font-medium text-sm text-muted-foreground mb-2">{catLabel} ({docs.length})</h4>
                          <div className="space-y-2">
                            {docs.map(doc => (
                              <div key={doc.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                                <div className="flex items-center gap-3 min-w-0">
                                  <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                                  <div className="min-w-0">
                                    <p className="font-medium text-sm truncate">{doc.nome}</p>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                      <span>{doc.arquivo_nome}</span>
                                      <span>•</span>
                                      <span>{(doc.arquivo_tamanho / 1024).toFixed(0)} KB</span>
                                      {doc.competencia && (
                                        <>
                                          <span>•</span>
                                          <span>{doc.competencia}</span>
                                        </>
                                      )}
                                      <span>•</span>
                                      <span>{new Date(doc.created_at).toLocaleDateString('pt-BR')}</span>
                                    </div>
                                    {doc.descricao && <p className="text-xs text-muted-foreground mt-0.5">{doc.descricao}</p>}
                                  </div>
                                </div>
                                <div className="flex items-center gap-1 flex-shrink-0">
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8"
                                    onClick={() => window.open(doc.arquivo_url, '_blank')}
                                    title="Visualizar"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8"
                                    onClick={() => {
                                      const a = document.createElement('a');
                                      a.href = doc.arquivo_url;
                                      a.download = doc.arquivo_nome;
                                      a.click();
                                    }}
                                    title="Download"
                                  >
                                    <Download className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8 text-red-500 hover:text-red-700"
                                    onClick={() => {
                                      if (confirm(`Remover documento "${doc.nome}"?`)) {
                                        deleteDocument.mutate(doc.id);
                                      }
                                    }}
                                    title="Remover"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        {/* Tab: Checklist Admissional */}
        <TabsContent value="checklist">
          <Card>
            <CardContent className="pt-6">
              <h3 className="font-semibold text-lg mb-2">Checklist Admissional</h3>

              {/* Progress bar */}
              {checklist.totalItems > 0 && (
                <div className="mb-6 space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {checklist.completedItems}/{checklist.totalItems} itens validados
                    </span>
                    <span className={`font-semibold ${
                      checklist.percentComplete === 100 ? 'text-green-600' :
                      checklist.percentComplete >= 50 ? 'text-amber-600' : 'text-red-600'
                    }`}>
                      {checklist.percentComplete}%
                    </span>
                  </div>
                  <Progress value={checklist.percentComplete} className="h-3" />

                  {checklist.percentComplete < 100 && (
                    <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 flex-shrink-0" />
                      Documentacao incompleta — {checklist.pendingItems + checklist.rejeitadoItems} itens pendentes
                    </div>
                  )}
                  {checklist.percentComplete === 100 && (
                    <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-sm text-green-800 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                      Documentacao completa — todos os itens validados
                    </div>
                  )}

                  {/* Status summary */}
                  <div className="flex flex-wrap gap-3 text-xs">
                    {checklist.pendingItems > 0 && (
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <CircleDot className="h-3 w-3 text-gray-400" />
                        {checklist.pendingItems} pendentes
                      </span>
                    )}
                    {checklist.enviadoItems > 0 && (
                      <span className="flex items-center gap-1 text-amber-600">
                        <CircleDot className="h-3 w-3" />
                        {checklist.enviadoItems} enviados
                      </span>
                    )}
                    {checklist.completedItems > 0 && (
                      <span className="flex items-center gap-1 text-green-600">
                        <CheckCircle2 className="h-3 w-3" />
                        {checklist.completedItems} validados
                      </span>
                    )}
                    {checklist.rejeitadoItems > 0 && (
                      <span className="flex items-center gap-1 text-red-600">
                        <XCircle className="h-3 w-3" />
                        {checklist.rejeitadoItems} rejeitados
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Items grouped by category */}
              {checklist.isLoading ? (
                <p className="text-center text-muted-foreground py-8">Carregando checklist...</p>
              ) : checklist.totalItems === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <ClipboardCheck className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Nenhum item de checklist encontrado.</p>
                  <p className="text-xs">Os itens sao criados automaticamente ao cadastrar o funcionario.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {Object.entries(checklist.byCategory).map(([catKey, cat]) => (
                    <div key={catKey}>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-sm">{cat.label}</h4>
                        <span className="text-xs text-muted-foreground">{cat.completed}/{cat.total}</span>
                      </div>
                      <div className="space-y-1">
                        {cat.items.map(item => (
                          <div key={item.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/30 transition-colors">
                            <div className="flex items-center gap-3 min-w-0">
                              {item.status === 'validado' && <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />}
                              {item.status === 'enviado' && <CircleDot className="h-4 w-4 text-amber-500 flex-shrink-0" />}
                              {item.status === 'pendente' && <CircleDot className="h-4 w-4 text-gray-400 flex-shrink-0" />}
                              {item.status === 'rejeitado' && <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />}
                              <div className="min-w-0">
                                <p className="text-sm font-medium">{item.nome}</p>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  {item.obrigatorio && <span className="text-red-500 font-medium">Obrigatorio</span>}
                                  {item.observacoes && <span>• {item.observacoes}</span>}
                                  {item.validado_em && <span>• Validado em {new Date(item.validado_em).toLocaleDateString('pt-BR')}</span>}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <Badge
                                variant="outline"
                                className={
                                  item.status === 'validado' ? 'text-green-600 border-green-300 bg-green-50' :
                                  item.status === 'enviado' ? 'text-amber-600 border-amber-300 bg-amber-50' :
                                  item.status === 'rejeitado' ? 'text-red-600 border-red-300 bg-red-50' :
                                  'text-gray-500 border-gray-300 bg-gray-50'
                                }
                              >
                                {CHECKLIST_STATUS_LABELS[item.status]}
                              </Badge>
                              {item.status === 'enviado' && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 text-green-600 hover:text-green-800 hover:bg-green-50"
                                    onClick={() => checklist.updateStatus.mutate({ itemId: item.id, status: 'validado' })}
                                  >
                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                    Validar
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 text-red-600 hover:text-red-800 hover:bg-red-50"
                                    onClick={() => {
                                      const obs = prompt('Motivo da rejeicao:');
                                      if (obs !== null) {
                                        checklist.updateStatus.mutate({ itemId: item.id, status: 'rejeitado', observacoes: obs });
                                      }
                                    }}
                                  >
                                    <XCircle className="h-3 w-3 mr-1" />
                                    Rejeitar
                                  </Button>
                                </>
                              )}
                              {item.status === 'pendente' && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 text-amber-600 hover:text-amber-800 hover:bg-amber-50"
                                  onClick={() => checklist.updateStatus.mutate({ itemId: item.id, status: 'enviado' })}
                                >
                                  Marcar Enviado
                                </Button>
                              )}
                              {item.status === 'rejeitado' && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 text-gray-600"
                                  onClick={() => checklist.updateStatus.mutate({ itemId: item.id, status: 'pendente', observacoes: '' })}
                                >
                                  Resetar
                                </Button>
                              )}
                              {item.status === 'validado' && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 text-gray-500"
                                  onClick={() => checklist.updateStatus.mutate({ itemId: item.id, status: 'pendente' })}
                                >
                                  Desfazer
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Checklist Demissional (apenas CLT) */}
        {isCLT && <TabsContent value="demissional">
          <Card>
            <CardContent className="pt-6">
              <h3 className="font-semibold text-lg mb-4">Checklist Demissional</h3>

              {/* Estado: sem checklist demissional ainda */}
              {checklistDemissional.totalItems === 0 && (
                <div className="text-center py-8">
                  <UserX className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground mb-4">
                    {employee.is_active
                      ? 'Nenhum processo demissional iniciado para este colaborador.'
                      : 'Colaborador inativo. Inicie o checklist demissional abaixo.'}
                  </p>
                  <Button
                    onClick={async () => {
                      try {
                        const created = await checklistDemissional.createDemissionalItems(id!, employee.tenant_id);
                        if (created) {
                          toast.success('Checklist demissional criado');
                        } else {
                          toast.info('Checklist demissional já existe');
                        }
                      } catch (err: any) {
                        toast.error(`Erro: ${err.message}`);
                      }
                    }}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    <UserX className="h-4 w-4 mr-2" />
                    Iniciar Processo Demissional
                  </Button>
                </div>
              )}

              {/* Estado: checklist demissional criado */}
              {checklistDemissional.totalItems > 0 && (
                <div className="space-y-6">
                  {/* Formulário de dados do desligamento */}
                  <div className="space-y-4 p-4 rounded-lg border bg-muted/30">
                    <h4 className="font-medium flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Dados do Desligamento
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Quem solicitou o desligamento? *</Label>
                        <Select
                          value={demissionalForm.quem_solicitou}
                          onValueChange={(v) => setDemissionalForm(prev => ({ ...prev, quem_solicitou: v }))}
                        >
                          <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                          <SelectContent>
                            {QUEM_SOLICITOU_OPTIONS.map(opt => (
                              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Sobre o Aviso Prévio *</Label>
                        <Select
                          value={demissionalForm.tipo_aviso_previo}
                          onValueChange={(v) => setDemissionalForm(prev => ({ ...prev, tipo_aviso_previo: v }))}
                        >
                          <SelectTrigger><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
                          <SelectContent>
                            {TIPO_AVISO_PREVIO_OPTIONS.map(opt => (
                              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Há alguma variável? (faltas, atestado, horas extras, adicional noturno, feriados, etc.)</Label>
                      <Textarea
                        value={demissionalForm.variaveis}
                        onChange={(e) => setDemissionalForm(prev => ({ ...prev, variaveis: e.target.value }))}
                        rows={2}
                        placeholder="Descreva as variáveis do período..."
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Há algum desconto? (VA/VT não utilizados — informar valor)</Label>
                      <Textarea
                        value={demissionalForm.descontos}
                        onChange={(e) => setDemissionalForm(prev => ({ ...prev, descontos: e.target.value }))}
                        rows={2}
                        placeholder="Ex: VT não utilizado R$ 150,00..."
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Há alguma informação sobre férias ou 13º não informada anteriormente?</Label>
                      <Textarea
                        value={demissionalForm.info_ferias_13}
                        onChange={(e) => setDemissionalForm(prev => ({ ...prev, info_ferias_13: e.target.value }))}
                        rows={2}
                        placeholder="Informações sobre férias ou 13º pendentes..."
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Houve algum afastamento?</Label>
                      <Textarea
                        value={demissionalForm.houve_afastamento}
                        onChange={(e) => setDemissionalForm(prev => ({ ...prev, houve_afastamento: e.target.value }))}
                        rows={2}
                        placeholder="Informações sobre afastamento..."
                      />
                    </div>

                    <Button
                      onClick={() => demissionalData.upsert.mutate(demissionalForm as any)}
                      disabled={demissionalData.upsert.isPending}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {demissionalData.upsert.isPending ? 'Salvando...' : 'Salvar Dados'}
                    </Button>
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        Documentos: {checklistDemissional.completedItems}/{checklistDemissional.totalItems} validados
                      </span>
                      <span className={`font-semibold ${
                        checklistDemissional.percentComplete === 100 ? 'text-green-600' :
                        checklistDemissional.percentComplete >= 50 ? 'text-amber-600' : 'text-red-600'
                      }`}>
                        {checklistDemissional.percentComplete}%
                      </span>
                    </div>
                    <Progress value={checklistDemissional.percentComplete} className="h-3" />
                  </div>

                  {/* Checklist items */}
                  {Object.entries(checklistDemissional.byCategory).map(([catKey, cat]) => (
                    <div key={catKey}>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-sm">{cat.label}</h4>
                        <span className="text-xs text-muted-foreground">{cat.completed}/{cat.total}</span>
                      </div>
                      <div className="space-y-1">
                        {cat.items.map(item => (
                          <div key={item.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/30 transition-colors">
                            <div className="flex items-center gap-3 min-w-0">
                              {item.status === 'validado' && <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />}
                              {item.status === 'enviado' && <CircleDot className="h-4 w-4 text-amber-500 flex-shrink-0" />}
                              {item.status === 'pendente' && <CircleDot className="h-4 w-4 text-gray-400 flex-shrink-0" />}
                              {item.status === 'rejeitado' && <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />}
                              <div className="min-w-0">
                                <p className="text-sm font-medium">{item.nome}</p>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  {item.obrigatorio && <span className="text-red-500 font-medium">Obrigatório</span>}
                                  {item.observacoes && <span>• {item.observacoes}</span>}
                                  {item.validado_em && <span>• Validado em {new Date(item.validado_em).toLocaleDateString('pt-BR')}</span>}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <Badge
                                variant="outline"
                                className={
                                  item.status === 'validado' ? 'text-green-600 border-green-300 bg-green-50' :
                                  item.status === 'enviado' ? 'text-amber-600 border-amber-300 bg-amber-50' :
                                  item.status === 'rejeitado' ? 'text-red-600 border-red-300 bg-red-50' :
                                  'text-gray-500 border-gray-300 bg-gray-50'
                                }
                              >
                                {CHECKLIST_STATUS_LABELS[item.status]}
                              </Badge>
                              {item.status === 'enviado' && (
                                <>
                                  <Button size="sm" variant="ghost" className="h-7 text-green-600 hover:text-green-800 hover:bg-green-50"
                                    onClick={() => checklistDemissional.updateStatus.mutate({ itemId: item.id, status: 'validado' })}>
                                    <CheckCircle2 className="h-3 w-3 mr-1" /> Validar
                                  </Button>
                                  <Button size="sm" variant="ghost" className="h-7 text-red-600 hover:text-red-800 hover:bg-red-50"
                                    onClick={() => {
                                      const obs = prompt('Motivo da rejeição:');
                                      if (obs !== null) checklistDemissional.updateStatus.mutate({ itemId: item.id, status: 'rejeitado', observacoes: obs });
                                    }}>
                                    <XCircle className="h-3 w-3 mr-1" /> Rejeitar
                                  </Button>
                                </>
                              )}
                              {item.status === 'pendente' && (
                                <Button size="sm" variant="ghost" className="h-7 text-amber-600 hover:text-amber-800 hover:bg-amber-50"
                                  onClick={() => checklistDemissional.updateStatus.mutate({ itemId: item.id, status: 'enviado' })}>
                                  Marcar Enviado
                                </Button>
                              )}
                              {item.status === 'rejeitado' && (
                                <Button size="sm" variant="ghost" className="h-7 text-gray-600"
                                  onClick={() => checklistDemissional.updateStatus.mutate({ itemId: item.id, status: 'pendente', observacoes: '' })}>
                                  Resetar
                                </Button>
                              )}
                              {item.status === 'validado' && (
                                <Button size="sm" variant="ghost" className="h-7 text-gray-500"
                                  onClick={() => checklistDemissional.updateStatus.mutate({ itemId: item.id, status: 'pendente' })}>
                                  Desfazer
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>}
      </Tabs>

      {/* Observações */}
      <Card>
        <CardContent className="pt-6">
          <h3 className="font-semibold mb-2">Observações</h3>
          <p className="text-sm">{employee.observacoes || 'Nenhuma observação registrada.'}</p>
        </CardContent>
      </Card>
    </div>
  );
}
