import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { usePayrollEmployeesMT } from "@/hooks/multitenant/usePayrollMT";
import { supabase } from "@/integrations/supabase/client";
import { useTenantContext } from "@/contexts/TenantContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save, Briefcase, Activity, Users, FileText, UserX, UserCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { PayrollEmployeeCreate, ContractType } from "@/types/financeiro";
import {
  ETNIA_OPTIONS,
  ESTADO_CIVIL_OPTIONS,
  GRAU_INSTRUCAO_OPTIONS,
  CONTRATO_EXPERIENCIA_OPTIONS,
  ADIANTAMENTO_OPTIONS,
} from "@/types/financeiro";
import { toast } from "sonner";

export default function FolhaFuncionarioEdit() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;
  const { employees, createEmployee, updateEmployee } = usePayrollEmployeesMT();
  const { tenant } = useTenantContext();

  // Tipo de contratação
  const [tipoContratacao, setTipoContratacao] = useState<ContractType | ''>('');

  // Dados pessoais
  const [nome, setNome] = useState('');
  const [cargo, setCargo] = useState('');
  const [userId, setUserId] = useState('');
  const [users, setUsers] = useState<Array<{ id: string; nome: string; cargo: string }>>([]);
  const [cpf, setCpf] = useState('');
  const [dataAdmissao, setDataAdmissao] = useState('');

  // CLT fields
  const [salarioBase, setSalarioBase] = useState('');
  const [hasVt, setHasVt] = useState(false);
  const [vtValor, setVtValor] = useState('');
  const [hasVr, setHasVr] = useState(false);
  const [vrValor, setVrValor] = useState('');
  const [fgtsPct, setFgtsPct] = useState('8');
  const [inssPct, setInssPct] = useState('11');
  const [comissaoTipo, setComissaoTipo] = useState('');
  const [comissaoValor, setComissaoValor] = useState('');
  const [comissaoDescricao, setComissaoDescricao] = useState('');
  const [comissaoMetaGlobalPct, setComissaoMetaGlobalPct] = useState('1');
  const [comissaoMetaIndividualPct, setComissaoMetaIndividualPct] = useState('1');

  // MEI fields
  const [diariaMinima, setDiariaMinima] = useState('100');

  // Provisões CLT (% editáveis)
  const [provisao13Pct, setProvisao13Pct] = useState('8.33');
  const [provisaoFeriasPct, setProvisaoFeriasPct] = useState('8.33');
  const [provisaoFeriasTercoPct, setProvisaoFeriasTercoPct] = useState('2.78');
  const [provisaoMultaFgtsPct, setProvisaoMultaFgtsPct] = useState('4');

  // Encargos patronais CLT (% editáveis)
  const [inssPatronalPct, setInssPatronalPct] = useState('20');
  const [ratPct, setRatPct] = useState('2');
  const [sistemaSPct, setSistemaSPct] = useState('5.8');
  const [salarioEducacaoPct, setSalarioEducacaoPct] = useState('2.5');

  // Benefícios adicionais
  const [hasVa, setHasVa] = useState(false);
  const [vaValor, setVaValor] = useState('');
  const [hasPlanoSaude, setHasPlanoSaude] = useState(false);
  const [planoSaudeValor, setPlanoSaudeValor] = useState('');
  const [hasPlanoOdonto, setHasPlanoOdonto] = useState(false);
  const [planoOdontoValor, setPlanoOdontoValor] = useState('');
  const [hasAuxilioCreche, setHasAuxilioCreche] = useState(false);
  const [auxilioCrecheValor, setAuxilioCrecheValor] = useState('');
  const [hasSalarioFamilia, setHasSalarioFamilia] = useState(false);
  const [salarioFamiliaValor, setSalarioFamiliaValor] = useState('');

  // Descontos do funcionário
  const [descontoVtPct, setDescontoVtPct] = useState('6');
  const [inssFuncionarioPct, setInssFuncionarioPct] = useState('7.5');
  const [irrfValor, setIrrfValor] = useState('0');

  // Dependentes
  const [qtdDependentes, setQtdDependentes] = useState('0');
  const [qtdFilhosCreche, setQtdFilhosCreche] = useState('0');
  const [qtdFilhosSalarioFamilia, setQtdFilhosSalarioFamilia] = useState('0');

  // Dados pessoais extras
  const [pis, setPis] = useState('');
  const [rg, setRg] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [telefone, setTelefone] = useState('');
  const [emailPessoal, setEmailPessoal] = useState('');
  const [endereco, setEndereco] = useState('');

  // Dados bancários
  const [banco, setBanco] = useState('');
  const [agencia, setAgencia] = useState('');
  const [contaBancaria, setContaBancaria] = useState('');
  const [pix, setPix] = useState('');

  // Dados CLT adicionais (contabilidade)
  const [cbo, setCbo] = useState('');
  const [etniaRaca, setEtniaRaca] = useState('');
  const [estadoCivil, setEstadoCivil] = useState('');
  const [grauInstrucao, setGrauInstrucao] = useState('');
  const [escalaTrabalho, setEscalaTrabalho] = useState('');
  const [contratoExperiencia, setContratoExperiencia] = useState('');
  const [optanteVt, setOptanteVt] = useState(true);
  const [adiantamento, setAdiantamento] = useState('');
  const [descontoPlanoSaudeValor, setDescontoPlanoSaudeValor] = useState('0');
  const [descontoPlanoOdontoValor, setDescontoPlanoOdontoValor] = useState('0');
  const [outrosDescontosValor, setOutrosDescontosValor] = useState('0');
  const [outrosDescontosDescricao, setOutrosDescontosDescricao] = useState('');

  // Jornada
  const [jornadaSemanal, setJornadaSemanal] = useState('44');
  const [horarioEntrada, setHorarioEntrada] = useState('08:00');
  const [horarioSaida, setHorarioSaida] = useState('18:00');

  // Status
  const [isActive, setIsActive] = useState(true);
  const [dataDesligamento, setDataDesligamento] = useState('');

  // Common
  const [observacoes, setObservacoes] = useState('');
  const [saving, setSaving] = useState(false);

  // Load users for the select
  useEffect(() => {
    if (!tenant?.id) return;
    const loadUsers = async () => {
      const { data } = await supabase
        .from('mt_users')
        .select('id, nome, cargo')
        .eq('tenant_id', tenant.id)
        .eq('is_active', true)
        .order('nome', { ascending: true });
      setUsers((data || []) as Array<{ id: string; nome: string; cargo: string }>);
    };
    loadUsers();
  }, [tenant?.id]);

  useEffect(() => {
    if (isEditing && employees.length) {
      const emp = employees.find(e => e.id === id);
      if (emp) {
        setTipoContratacao(emp.tipo_contratacao || 'clt');
        setNome(emp.nome);
        setCargo(emp.cargo);
        setUserId(emp.user_id || '');
        setCpf(emp.cpf || '');
        setDataAdmissao(emp.data_admissao || '');
        setSalarioBase(String(emp.salario_base));
        setDiariaMinima(String(emp.diaria_minima || 100));
        setHasVt(emp.has_vt);
        setVtValor(String(emp.vt_valor));
        setHasVr(emp.has_vr);
        setVrValor(String(emp.vr_valor));
        setFgtsPct(String(emp.fgts_percentual));
        setInssPct(String(emp.inss_percentual));
        setComissaoTipo(emp.comissao_tipo || '');
        setComissaoValor(String(emp.comissao_valor || ''));
        setComissaoDescricao(emp.comissao_descricao || '');
        setComissaoMetaGlobalPct(String(emp.comissao_meta_global_pct || '1'));
        setComissaoMetaIndividualPct(String(emp.comissao_meta_individual_pct || '1'));
        // Provisões
        setProvisao13Pct(String(emp.provisao_13_pct ?? 8.33));
        setProvisaoFeriasPct(String(emp.provisao_ferias_pct ?? 8.33));
        setProvisaoFeriasTercoPct(String(emp.provisao_ferias_terco_pct ?? 2.78));
        setProvisaoMultaFgtsPct(String(emp.provisao_multa_fgts_pct ?? 4));
        // Encargos patronais
        setInssPatronalPct(String(emp.inss_patronal_pct ?? 20));
        setRatPct(String(emp.rat_pct ?? 2));
        setSistemaSPct(String(emp.sistema_s_pct ?? 5.8));
        setSalarioEducacaoPct(String(emp.salario_educacao_pct ?? 2.5));
        // Benefícios
        setHasVa(emp.has_va ?? false);
        setVaValor(String(emp.va_valor || ''));
        setHasPlanoSaude(emp.has_plano_saude ?? false);
        setPlanoSaudeValor(String(emp.plano_saude_valor || ''));
        setHasPlanoOdonto(emp.has_plano_odonto ?? false);
        setPlanoOdontoValor(String(emp.plano_odonto_valor || ''));
        setHasAuxilioCreche(emp.has_auxilio_creche ?? false);
        setAuxilioCrecheValor(String(emp.auxilio_creche_valor || ''));
        setHasSalarioFamilia(emp.has_salario_familia ?? false);
        setSalarioFamiliaValor(String(emp.salario_familia_valor || ''));
        // Descontos
        setDescontoVtPct(String(emp.desconto_vt_pct ?? 6));
        setInssFuncionarioPct(String(emp.inss_funcionario_pct ?? 7.5));
        setIrrfValor(String(emp.irrf_valor ?? 0));
        // Dependentes
        setQtdDependentes(String(emp.qtd_dependentes ?? 0));
        setQtdFilhosCreche(String(emp.qtd_filhos_creche ?? 0));
        setQtdFilhosSalarioFamilia(String(emp.qtd_filhos_salario_familia ?? 0));
        // Pessoais extras
        setPis(emp.pis || '');
        setRg(emp.rg || '');
        setDataNascimento(emp.data_nascimento || '');
        setTelefone(emp.telefone || '');
        setEmailPessoal(emp.email || '');
        setEndereco(emp.endereco || '');
        // Bancários
        setBanco(emp.banco || '');
        setAgencia(emp.agencia || '');
        setContaBancaria(emp.conta_bancaria || '');
        setPix(emp.pix || '');
        // CLT adicionais (contabilidade)
        setCbo(emp.cbo || '');
        setEtniaRaca(emp.etnia_raca || '');
        setEstadoCivil(emp.estado_civil || '');
        setGrauInstrucao(emp.grau_instrucao || '');
        setEscalaTrabalho(emp.escala_trabalho || '');
        setContratoExperiencia(emp.contrato_experiencia || '');
        setOptanteVt(emp.optante_vt ?? true);
        setAdiantamento(emp.adiantamento || '');
        setDescontoPlanoSaudeValor(String(emp.desconto_plano_saude_valor || 0));
        setDescontoPlanoOdontoValor(String(emp.desconto_plano_odonto_valor || 0));
        setOutrosDescontosValor(String(emp.outros_descontos_valor || 0));
        setOutrosDescontosDescricao(emp.outros_descontos_descricao || '');
        // Jornada
        setJornadaSemanal(String(emp.jornada_semanal ?? 44));
        setHorarioEntrada(emp.horario_entrada || '08:00');
        setHorarioSaida(emp.horario_saida || '18:00');
        setObservacoes(emp.observacoes || '');
        // Status
        setIsActive(emp.is_active ?? true);
        setDataDesligamento(emp.data_desligamento || '');
      }
    }
  }, [isEditing, id, employees]);

  const cargoFinal = cargo;

  // Auto-fill nome and cargo when user is selected
  const handleUserChange = (selectedUserId: string) => {
    setUserId(selectedUserId);
    const user = users.find(u => u.id === selectedUserId);
    if (user) {
      if (!nome) setNome(user.nome);
      if (user.cargo) setCargo(user.cargo);
    }
  };

  const handleSave = async () => {
    if (!tipoContratacao) {
      toast.error('Selecione o tipo de contratação');
      return;
    }
    if (!nome || !cargoFinal) {
      toast.error('Preencha nome e cargo');
      return;
    }
    if (!userId) {
      toast.error('Vincule a um usuário do sistema');
      return;
    }
    if (tipoContratacao === 'clt' && !salarioBase) {
      toast.error('Informe o salário base');
      return;
    }
    if (tipoContratacao === 'mei' && !diariaMinima) {
      toast.error('Informe a diária mínima');
      return;
    }

    setSaving(true);
    try {
      const data: PayrollEmployeeCreate = {
        tipo_contratacao: tipoContratacao,
        nome,
        cargo: cargoFinal,
        user_id: userId,
        cpf: cpf ? cpf.replace(/[^\d]/g, '') : undefined,
        data_admissao: dataAdmissao || undefined,
        observacoes: observacoes || undefined,
        // CLT fields
        salario_base: tipoContratacao === 'clt' ? parseFloat(salarioBase) : parseFloat(diariaMinima || '100'),
        tipo_salario: tipoContratacao === 'clt' ? 'fixo' : 'diaria',
        diaria_minima: tipoContratacao === 'mei' ? parseFloat(diariaMinima || '100') : 0,
        has_vt: tipoContratacao === 'clt' ? hasVt : false,
        vt_valor: tipoContratacao === 'clt' && hasVt ? parseFloat(vtValor || '0') : 0,
        has_vr: tipoContratacao === 'clt' ? hasVr : false,
        vr_valor: tipoContratacao === 'clt' && hasVr ? parseFloat(vrValor || '0') : 0,
        fgts_percentual: tipoContratacao === 'clt' ? parseFloat(fgtsPct || '8') : 0,
        inss_percentual: tipoContratacao === 'clt' ? parseFloat(inssPct || '11') : 0,
        comissao_tipo: tipoContratacao === 'clt' && comissaoTipo ? comissaoTipo as any : undefined,
        comissao_valor: tipoContratacao === 'clt' && comissaoValor ? parseFloat(comissaoValor) : 0,
        comissao_descricao: tipoContratacao === 'clt' ? comissaoDescricao || undefined : undefined,
        comissao_meta_global_pct: tipoContratacao === 'clt' ? parseFloat(comissaoMetaGlobalPct || '0') : 0,
        comissao_meta_individual_pct: tipoContratacao === 'clt' ? parseFloat(comissaoMetaIndividualPct || '0') : 0,
        // Provisões
        provisao_13_pct: tipoContratacao === 'clt' ? parseFloat(provisao13Pct || '8.33') : 0,
        provisao_ferias_pct: tipoContratacao === 'clt' ? parseFloat(provisaoFeriasPct || '8.33') : 0,
        provisao_ferias_terco_pct: tipoContratacao === 'clt' ? parseFloat(provisaoFeriasTercoPct || '2.78') : 0,
        provisao_multa_fgts_pct: tipoContratacao === 'clt' ? parseFloat(provisaoMultaFgtsPct || '4') : 0,
        // Encargos patronais
        inss_patronal_pct: tipoContratacao === 'clt' ? parseFloat(inssPatronalPct || '20') : 0,
        rat_pct: tipoContratacao === 'clt' ? parseFloat(ratPct || '2') : 0,
        sistema_s_pct: tipoContratacao === 'clt' ? parseFloat(sistemaSPct || '5.8') : 0,
        salario_educacao_pct: tipoContratacao === 'clt' ? parseFloat(salarioEducacaoPct || '2.5') : 0,
        // Benefícios adicionais
        has_va: hasVa,
        va_valor: hasVa ? parseFloat(vaValor || '0') : 0,
        has_plano_saude: hasPlanoSaude,
        plano_saude_valor: hasPlanoSaude ? parseFloat(planoSaudeValor || '0') : 0,
        has_plano_odonto: hasPlanoOdonto,
        plano_odonto_valor: hasPlanoOdonto ? parseFloat(planoOdontoValor || '0') : 0,
        has_auxilio_creche: hasAuxilioCreche,
        auxilio_creche_valor: hasAuxilioCreche ? parseFloat(auxilioCrecheValor || '0') : 0,
        has_salario_familia: hasSalarioFamilia,
        salario_familia_valor: hasSalarioFamilia ? parseFloat(salarioFamiliaValor || '0') : 0,
        // Descontos
        desconto_vt_pct: tipoContratacao === 'clt' ? parseFloat(descontoVtPct || '6') : 0,
        inss_funcionario_pct: tipoContratacao === 'clt' ? parseFloat(inssFuncionarioPct || '7.5') : 0,
        irrf_valor: tipoContratacao === 'clt' ? parseFloat(irrfValor || '0') : 0,
        // Dependentes
        qtd_dependentes: parseInt(qtdDependentes || '0'),
        qtd_filhos_creche: parseInt(qtdFilhosCreche || '0'),
        qtd_filhos_salario_familia: parseInt(qtdFilhosSalarioFamilia || '0'),
        // Pessoais extras
        pis: pis || undefined,
        rg: rg || undefined,
        data_nascimento: dataNascimento || undefined,
        telefone: telefone || undefined,
        email: emailPessoal || undefined,
        endereco: endereco || undefined,
        // Bancários
        banco: banco || undefined,
        agencia: agencia || undefined,
        conta_bancaria: contaBancaria || undefined,
        pix: pix || undefined,
        // Jornada
        jornada_semanal: parseInt(jornadaSemanal || '44'),
        horario_entrada: horarioEntrada || '08:00',
        horario_saida: horarioSaida || '18:00',
        // CLT adicionais (contabilidade)
        cbo: cbo || undefined,
        etnia_raca: etniaRaca || undefined,
        estado_civil: estadoCivil || undefined,
        grau_instrucao: grauInstrucao || undefined,
        escala_trabalho: escalaTrabalho || undefined,
        contrato_experiencia: contratoExperiencia || undefined,
        optante_vt: optanteVt,
        adiantamento: adiantamento || undefined,
        desconto_plano_saude_valor: parseFloat(descontoPlanoSaudeValor || '0'),
        desconto_plano_odonto_valor: parseFloat(descontoPlanoOdontoValor || '0'),
        outros_descontos_valor: parseFloat(outrosDescontosValor || '0'),
        outros_descontos_descricao: outrosDescontosDescricao || undefined,
        // Status
        is_active: isActive,
        data_desligamento: !isActive && dataDesligamento ? dataDesligamento : null,
      } as any;

      if (isEditing) {
        await updateEmployee(id!, data);
      } else {
        await createEmployee(data);
      }
      navigate('/financeiro/folha');
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Resumo lateral
  const salario = tipoContratacao === 'clt' ? parseFloat(salarioBase || '0') : 0;
  const diaria = tipoContratacao === 'mei' ? parseFloat(diariaMinima || '0') : 0;
  const fgtsVal = salario * (parseFloat(fgtsPct || '0') / 100);
  const vtVal = hasVt ? parseFloat(vtValor || '0') : 0;
  const vrVal = hasVr ? parseFloat(vrValor || '0') : 0;
  const vaVal = hasVa ? parseFloat(vaValor || '0') : 0;
  const plSaudeVal = hasPlanoSaude ? parseFloat(planoSaudeValor || '0') : 0;
  const plOdontoVal = hasPlanoOdonto ? parseFloat(planoOdontoValor || '0') : 0;
  const auxCrecheVal = hasAuxilioCreche ? parseFloat(auxilioCrecheValor || '0') : 0;
  const salFamiliaVal = hasSalarioFamilia ? parseFloat(salarioFamiliaValor || '0') : 0;
  // Provisões
  const prov13Val = salario * (parseFloat(provisao13Pct || '0') / 100);
  const provFeriasVal = salario * (parseFloat(provisaoFeriasPct || '0') / 100);
  const provFeriasTercoVal = salario * (parseFloat(provisaoFeriasTercoPct || '0') / 100);
  const provMultaVal = salario * (parseFloat(provisaoMultaFgtsPct || '0') / 100);
  const totalProvisoes = prov13Val + provFeriasVal + provFeriasTercoVal + provMultaVal;
  // Encargos patronais
  const inssPatronalVal = salario * (parseFloat(inssPatronalPct || '0') / 100);
  const ratVal = salario * (parseFloat(ratPct || '0') / 100);
  const sistemaSVal = salario * (parseFloat(sistemaSPct || '0') / 100);
  const salEdVal = salario * (parseFloat(salarioEducacaoPct || '0') / 100);
  const totalEncargos = fgtsVal + inssPatronalVal + ratVal + sistemaSVal + salEdVal;
  // Benefícios totais
  const totalBeneficios = vtVal + vrVal + vaVal + plSaudeVal + plOdontoVal + auxCrecheVal + salFamiliaVal;
  // Total geral
  const totalCLT = salario + totalBeneficios + totalProvisoes + totalEncargos + parseFloat(comissaoValor || '0');

  // Se não selecionou tipo, mostra seletor de tipo
  if (!tipoContratacao && !isEditing) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/financeiro/folha')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">Novo Colaborador</h1>
        </div>

        <div className="max-w-3xl mx-auto">
          <h2 className="text-lg font-semibold text-center mb-6">Selecione o tipo de contratação</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* CLT Card */}
            <Card
              className="cursor-pointer border-2 hover:border-primary hover:shadow-lg transition-all"
              onClick={() => setTipoContratacao('clt')}
            >
              <CardHeader className="text-center pb-2">
                <div className="mx-auto p-4 bg-blue-100 rounded-full w-fit mb-2">
                  <Briefcase className="h-8 w-8 text-blue-600" />
                </div>
                <CardTitle className="text-xl">CLT</CardTitle>
                <CardDescription>Contratação formal com carteira assinada</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Consultora, Administrativo, Gerente
                  </li>
                  <li className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Salário fixo + FGTS + INSS
                  </li>
                  <li className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4" />
                    VT, VR, Comissões opcionais
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* MEI Card */}
            <Card
              className="cursor-pointer border-2 hover:border-primary hover:shadow-lg transition-all"
              onClick={() => setTipoContratacao('mei')}
            >
              <CardHeader className="text-center pb-2">
                <div className="mx-auto p-4 bg-green-100 rounded-full w-fit mb-2">
                  <Activity className="h-8 w-8 text-green-600" />
                </div>
                <CardTitle className="text-xl">MEI</CardTitle>
                <CardDescription>Microempreendedora Individual — por produtividade</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Esteticista, Biomédica, Aplicadora
                  </li>
                  <li className="flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    Diária mínima + procedimentos
                  </li>
                  <li className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Pagamento = MAX(diária, comissões do dia)
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => isEditing ? navigate('/financeiro/folha') : setTipoContratacao('')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">
            {isEditing ? 'Editar' : 'Novo'} Colaborador
          </h1>
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            {tipoContratacao === 'clt' ? (
              <>
                <Briefcase className="h-4 w-4 text-blue-600" />
                <span className="text-blue-600 font-medium">CLT</span>
                — Contratação formal
              </>
            ) : (
              <>
                <Activity className="h-4 w-4 text-green-600" />
                <span className="text-green-600 font-medium">MEI</span>
                — Produtividade
              </>
            )}
            {!isEditing && (
              <Button variant="link" size="sm" className="text-xs p-0 h-auto" onClick={() => setTipoContratacao('')}>
                (alterar)
              </Button>
            )}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Dados Pessoais */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              <h3 className="font-semibold">Dados Pessoais</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <Label>Usuário do Sistema <span className="text-destructive">*</span></Label>
                  <Select value={userId} onValueChange={handleUserChange}>
                    <SelectTrigger><SelectValue placeholder="Selecione o usuário" /></SelectTrigger>
                    <SelectContent>
                      {users.map(u => (
                        <SelectItem key={u.id} value={u.id}>{u.nome} {u.cargo ? `(${u.cargo})` : ''}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {tipoContratacao === 'mei'
                      ? 'Obrigatório — nome e cargo são preenchidos automaticamente'
                      : 'Selecione primeiro — nome e cargo são preenchidos automaticamente'}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Nome Completo *</Label>
                  <Input value={nome} onChange={e => setNome(e.target.value)} placeholder="Preenchido ao selecionar usuário" />
                </div>
                <div className="space-y-2">
                  <Label>Cargo *</Label>
                  <Input value={cargo} onChange={e => setCargo(e.target.value)} placeholder="Preenchido ao selecionar usuário" />
                  <p className="text-xs text-muted-foreground">Vem do cadastro do usuário — editável se necessário</p>
                </div>
                <div className="space-y-2">
                  <Label>CPF / CNPJ</Label>
                  <Input value={cpf} onChange={e => setCpf(e.target.value)} placeholder={tipoContratacao === 'mei' ? '00.000.000/0001-00' : '000.000.000-00'} />
                </div>
                <div className="space-y-2">
                  <Label>Data de Admissão</Label>
                  <Input type="date" value={dataAdmissao} onChange={e => setDataAdmissao(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>PIS/PASEP</Label>
                  <Input value={pis} onChange={e => setPis(e.target.value)} placeholder="000.00000.00-0" />
                </div>
                <div className="space-y-2">
                  <Label>RG</Label>
                  <Input value={rg} onChange={e => setRg(e.target.value)} placeholder="00.000.000-0" />
                </div>
                <div className="space-y-2">
                  <Label>Data de Nascimento</Label>
                  <Input type="date" value={dataNascimento} onChange={e => setDataNascimento(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Telefone</Label>
                  <Input value={telefone} onChange={e => setTelefone(e.target.value)} placeholder="(00) 00000-0000" />
                </div>
                <div className="space-y-2">
                  <Label>Email Pessoal</Label>
                  <Input type="email" value={emailPessoal} onChange={e => setEmailPessoal(e.target.value)} placeholder="email@exemplo.com" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Endereço Completo</Label>
                  <Textarea value={endereco} onChange={e => setEndereco(e.target.value)} placeholder="Rua, número, bairro, cidade - UF, CEP" rows={2} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Dados Bancários */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              <h3 className="font-semibold">Dados Bancários</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Banco</Label>
                  <Input value={banco} onChange={e => setBanco(e.target.value)} placeholder="Ex: Bradesco, Itaú, Nubank" />
                </div>
                <div className="space-y-2">
                  <Label>Agência</Label>
                  <Input value={agencia} onChange={e => setAgencia(e.target.value)} placeholder="0000" />
                </div>
                <div className="space-y-2">
                  <Label>Conta</Label>
                  <Input value={contaBancaria} onChange={e => setContaBancaria(e.target.value)} placeholder="00000-0" />
                </div>
                <div className="space-y-2">
                  <Label>Chave PIX</Label>
                  <Input value={pix} onChange={e => setPix(e.target.value)} placeholder="CPF, email, telefone ou chave aleatória" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* CLT: Dados da Contabilidade */}
          {tipoContratacao === 'clt' && (
            <Card>
              <CardContent className="pt-6 space-y-4">
                <h3 className="font-semibold">Dados para Contabilidade (CLT)</h3>
                <p className="text-xs text-muted-foreground">Campos exigidos pela contabilidade para registro e folha de pagamento.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>CBO (Código Brasileiro de Ocupações)</Label>
                    <Input value={cbo} onChange={e => setCbo(e.target.value)} placeholder="Ex: 520105, 521110" />
                    <p className="text-xs text-muted-foreground">Código da ocupação — consultar tabela CBO</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Etnia / Raça</Label>
                    <Select value={etniaRaca} onValueChange={setEtniaRaca}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        {ETNIA_OPTIONS.map(o => (
                          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Estado Civil</Label>
                    <Select value={estadoCivil} onValueChange={setEstadoCivil}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        {ESTADO_CIVIL_OPTIONS.map(o => (
                          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Grau de Instrução</Label>
                    <Select value={grauInstrucao} onValueChange={setGrauInstrucao}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        {GRAU_INSTRUCAO_OPTIONS.map(o => (
                          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Escala de Trabalho</Label>
                    <Input value={escalaTrabalho} onChange={e => setEscalaTrabalho(e.target.value)} placeholder="Ex: 5x2, 6x1, 12x36" />
                  </div>
                  <div className="space-y-2">
                    <Label>Contrato de Experiência</Label>
                    <Select value={contratoExperiencia} onValueChange={setContratoExperiencia}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        {CONTRATO_EXPERIENCIA_OPTIONS.map(o => (
                          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Adiantamento Salarial</Label>
                    <Select value={adiantamento} onValueChange={setAdiantamento}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        {ADIANTAMENTO_OPTIONS.map(o => (
                          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Switch checked={optanteVt} onCheckedChange={setOptanteVt} />
                      <Label>Optante Vale Transporte</Label>
                    </div>
                    <p className="text-xs text-muted-foreground">Funcionário optou por receber VT</p>
                  </div>
                </div>

                <h3 className="font-semibold pt-4">Descontos do Funcionário (Planos)</h3>
                <p className="text-xs text-muted-foreground">Valor descontado do funcionário referente a planos de saúde/odonto. Diferente do custo do plano para a empresa.</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Desconto Plano de Saúde (R$)</Label>
                    <Input type="number" step="0.01" value={descontoPlanoSaudeValor} onChange={e => setDescontoPlanoSaudeValor(e.target.value)} placeholder="0,00" />
                  </div>
                  <div className="space-y-2">
                    <Label>Desconto Plano Odontológico (R$)</Label>
                    <Input type="number" step="0.01" value={descontoPlanoOdontoValor} onChange={e => setDescontoPlanoOdontoValor(e.target.value)} placeholder="0,00" />
                  </div>
                  <div className="space-y-2">
                    <Label>Outros Descontos (R$)</Label>
                    <Input type="number" step="0.01" value={outrosDescontosValor} onChange={e => setOutrosDescontosValor(e.target.value)} placeholder="0,00" />
                  </div>
                  {parseFloat(outrosDescontosValor || '0') > 0 && (
                    <div className="space-y-2 md:col-span-3">
                      <Label>Descrição dos Outros Descontos</Label>
                      <Input value={outrosDescontosDescricao} onChange={e => setOutrosDescontosDescricao(e.target.value)} placeholder="Ex: empréstimo consignado, seguro de vida" />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* CLT: Remuneração */}
          {tipoContratacao === 'clt' && (
            <Card>
              <CardContent className="pt-6 space-y-4">
                <h3 className="font-semibold">Remuneração CLT</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Salário Base Mensal *</Label>
                    <Input type="number" step="0.01" value={salarioBase} onChange={e => setSalarioBase(e.target.value)} placeholder="0,00" />
                  </div>
                </div>

                <h3 className="font-semibold pt-4">Benefícios</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Switch checked={hasVt} onCheckedChange={setHasVt} />
                      <Label>Vale Transporte</Label>
                    </div>
                    {hasVt && <Input type="number" step="0.01" value={vtValor} onChange={e => setVtValor(e.target.value)} placeholder="Valor mensal" />}
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Switch checked={hasVr} onCheckedChange={setHasVr} />
                      <Label>Vale Refeição</Label>
                    </div>
                    {hasVr && <Input type="number" step="0.01" value={vrValor} onChange={e => setVrValor(e.target.value)} placeholder="Valor mensal" />}
                  </div>
                </div>

                <h3 className="font-semibold pt-4">Encargos</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>FGTS (%)</Label>
                    <Input type="number" step="0.01" value={fgtsPct} onChange={e => setFgtsPct(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>INSS (%)</Label>
                    <Input type="number" step="0.01" value={inssPct} onChange={e => setInssPct(e.target.value)} />
                  </div>
                </div>

                <h3 className="font-semibold pt-4">Comissão por Metas</h3>
                <div className="p-4 rounded-lg bg-blue-50 border border-blue-200 text-sm mb-4">
                  <p className="text-blue-800">
                    Se a meta for <strong>batida</strong>, o funcionário recebe a % de comissão sobre o <strong>faturamento realizado</strong>.
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Comissão Meta Global (Unidade) %</Label>
                    <Input type="number" step="0.01" value={comissaoMetaGlobalPct} onChange={e => setComissaoMetaGlobalPct(e.target.value)} placeholder="1" />
                    <p className="text-xs text-muted-foreground">% sobre o faturamento se bater a meta da unidade/franquia</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Comissão Meta Individual (Pessoa) %</Label>
                    <Input type="number" step="0.01" value={comissaoMetaIndividualPct} onChange={e => setComissaoMetaIndividualPct(e.target.value)} placeholder="1" />
                    <p className="text-xs text-muted-foreground">% sobre o faturamento se bater a meta pessoal</p>
                  </div>
                </div>

                <h3 className="font-semibold pt-4">Comissão Extra (Opcional)</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Tipo</Label>
                    <Select value={comissaoTipo} onValueChange={setComissaoTipo}>
                      <SelectTrigger><SelectValue placeholder="Nenhuma" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="valor_fixo">Valor Fixo</SelectItem>
                        <SelectItem value="percentual_faturamento">% do Faturamento</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Valor/Percentual</Label>
                    <Input type="number" step="0.01" value={comissaoValor} onChange={e => setComissaoValor(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Descrição</Label>
                    <Input value={comissaoDescricao} onChange={e => setComissaoDescricao(e.target.value)} placeholder="Ex: bônus por indicação" />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* CLT: Provisões e Encargos */}
          {tipoContratacao === 'clt' && (
            <Card>
              <CardContent className="pt-6 space-y-4">
                <h3 className="font-semibold">Provisões Trabalhistas (% sobre salário)</h3>
                <p className="text-xs text-muted-foreground">Rateio mensal de custos anuais obrigatórios. Valores padrão CLT — ajuste conforme necessidade.</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>13º Salário (%)</Label>
                    <Input type="number" step="0.01" value={provisao13Pct} onChange={e => setProvisao13Pct(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Férias (%)</Label>
                    <Input type="number" step="0.01" value={provisaoFeriasPct} onChange={e => setProvisaoFeriasPct(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>1/3 de Férias (%)</Label>
                    <Input type="number" step="0.01" value={provisaoFeriasTercoPct} onChange={e => setProvisaoFeriasTercoPct(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Multa FGTS (%)</Label>
                    <Input type="number" step="0.01" value={provisaoMultaFgtsPct} onChange={e => setProvisaoMultaFgtsPct(e.target.value)} />
                    <p className="text-xs text-muted-foreground">Provisão p/ multa 40%</p>
                  </div>
                </div>

                <h3 className="font-semibold pt-4">Encargos Patronais (% sobre salário)</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>INSS Patronal (%)</Label>
                    <Input type="number" step="0.01" value={inssPatronalPct} onChange={e => setInssPatronalPct(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>RAT/SAT (%)</Label>
                    <Input type="number" step="0.01" value={ratPct} onChange={e => setRatPct(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Sistema S (%)</Label>
                    <Input type="number" step="0.01" value={sistemaSPct} onChange={e => setSistemaSPct(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Sal. Educação (%)</Label>
                    <Input type="number" step="0.01" value={salarioEducacaoPct} onChange={e => setSalarioEducacaoPct(e.target.value)} />
                  </div>
                </div>

                <h3 className="font-semibold pt-4">Descontos do Funcionário</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Desconto VT (%)</Label>
                    <Input type="number" step="0.01" value={descontoVtPct} onChange={e => setDescontoVtPct(e.target.value)} />
                    <p className="text-xs text-muted-foreground">Desconto do funcionário (máx 6%)</p>
                  </div>
                  <div className="space-y-2">
                    <Label>INSS Funcionário (%)</Label>
                    <Input type="number" step="0.01" value={inssFuncionarioPct} onChange={e => setInssFuncionarioPct(e.target.value)} />
                    <p className="text-xs text-muted-foreground">7,5% a 14% progressivo</p>
                  </div>
                  <div className="space-y-2">
                    <Label>IRRF (R$ valor fixo)</Label>
                    <Input type="number" step="0.01" value={irrfValor} onChange={e => setIrrfValor(e.target.value)} />
                    <p className="text-xs text-muted-foreground">0 se isento</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Benefícios Adicionais (CLT e MEI) */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              <h3 className="font-semibold">Benefícios Adicionais</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Switch checked={hasVa} onCheckedChange={setHasVa} />
                    <Label>Vale Alimentação</Label>
                  </div>
                  {hasVa && <Input type="number" step="0.01" value={vaValor} onChange={e => setVaValor(e.target.value)} placeholder="Valor mensal" />}
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Switch checked={hasPlanoSaude} onCheckedChange={setHasPlanoSaude} />
                    <Label>Plano de Saúde</Label>
                  </div>
                  {hasPlanoSaude && <Input type="number" step="0.01" value={planoSaudeValor} onChange={e => setPlanoSaudeValor(e.target.value)} placeholder="Valor mensal" />}
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Switch checked={hasPlanoOdonto} onCheckedChange={setHasPlanoOdonto} />
                    <Label>Plano Odontológico</Label>
                  </div>
                  {hasPlanoOdonto && <Input type="number" step="0.01" value={planoOdontoValor} onChange={e => setPlanoOdontoValor(e.target.value)} placeholder="Valor mensal" />}
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Switch checked={hasAuxilioCreche} onCheckedChange={setHasAuxilioCreche} />
                    <Label>Auxílio Creche</Label>
                  </div>
                  {hasAuxilioCreche && <Input type="number" step="0.01" value={auxilioCrecheValor} onChange={e => setAuxilioCrecheValor(e.target.value)} placeholder="Valor mensal" />}
                  {hasAuxilioCreche && <p className="text-xs text-muted-foreground">Filhos até 5 anos e 11 meses</p>}
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Switch checked={hasSalarioFamilia} onCheckedChange={setHasSalarioFamilia} />
                    <Label>Salário Família</Label>
                  </div>
                  {hasSalarioFamilia && <Input type="number" step="0.01" value={salarioFamiliaValor} onChange={e => setSalarioFamiliaValor(e.target.value)} placeholder="Valor por filho" />}
                  {hasSalarioFamilia && <p className="text-xs text-muted-foreground">Para funcionários de baixa renda com filhos até 14 anos</p>}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Dependentes */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              <h3 className="font-semibold">Dependentes</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Total de Dependentes</Label>
                  <Input type="number" min="0" value={qtdDependentes} onChange={e => setQtdDependentes(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Filhos até 6 anos (Creche)</Label>
                  <Input type="number" min="0" value={qtdFilhosCreche} onChange={e => setQtdFilhosCreche(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Filhos até 14 anos (Sal. Família)</Label>
                  <Input type="number" min="0" value={qtdFilhosSalarioFamilia} onChange={e => setQtdFilhosSalarioFamilia(e.target.value)} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* MEI: Produtividade */}
          {tipoContratacao === 'mei' && (
            <Card>
              <CardContent className="pt-6 space-y-4">
                <h3 className="font-semibold">Remuneração MEI — Produtividade</h3>
                <div className="p-4 rounded-lg bg-green-50 border border-green-200 text-sm space-y-2">
                  <p className="font-medium text-green-800">Como funciona o pagamento MEI:</p>
                  <p className="text-green-700">
                    A cada dia que a profissional estiver <strong>presente na clínica</strong>, ela recebe o <strong>maior valor</strong> entre:
                  </p>
                  <ul className="list-disc pl-5 text-green-700 space-y-1">
                    <li><strong>Diária mínima</strong> — valor garantido por dia de trabalho</li>
                    <li><strong>Comissão dos procedimentos</strong> — soma das comissões dos atendimentos realizados no dia</li>
                  </ul>
                  <p className="text-green-700 font-medium">
                    Fórmula: pagamento_dia = MAX(diária_mínima, comissões_do_dia)
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Diária Mínima (R$) *</Label>
                    <Input type="number" step="0.01" value={diariaMinima} onChange={e => setDiariaMinima(e.target.value)} placeholder="100,00" />
                    <p className="text-xs text-muted-foreground">Valor mínimo garantido por dia de presença na clínica</p>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-muted text-sm space-y-1">
                  <p className="font-medium">Exemplo com diária de R$ {parseFloat(diariaMinima || '0').toFixed(2)}:</p>
                  <p>Dia com R$ 80 em comissões → paga R$ {parseFloat(diariaMinima || '0').toFixed(2)} (diária)</p>
                  <p>Dia com R$ {(parseFloat(diariaMinima || '0') + 50).toFixed(2)} em comissões → paga R$ {(parseFloat(diariaMinima || '0') + 50).toFixed(2)} (comissão)</p>
                  <p className="text-muted-foreground mt-2">Gerencie a escala, presença e cálculo no módulo <strong>Produtividade</strong></p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Jornada de Trabalho */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              <h3 className="font-semibold">Jornada de Trabalho</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Jornada Semanal (horas)</Label>
                  <Input type="number" value={jornadaSemanal} onChange={e => setJornadaSemanal(e.target.value)} />
                  <p className="text-xs text-muted-foreground">Padrão CLT: 44h | Parcial: 30h ou 36h</p>
                </div>
                <div className="space-y-2">
                  <Label>Horário de Entrada</Label>
                  <Input type="time" value={horarioEntrada} onChange={e => setHorarioEntrada(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Horário de Saída</Label>
                  <Input type="time" value={horarioSaida} onChange={e => setHorarioSaida(e.target.value)} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Status do Colaborador (apenas edição) */}
          {isEditing && (
            <Card className={!isActive ? 'border-red-300 bg-red-50/50' : ''}>
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isActive ? (
                      <UserCheck className="h-5 w-5 text-green-600" />
                    ) : (
                      <UserX className="h-5 w-5 text-red-600" />
                    )}
                    <h3 className="font-semibold">Status do Colaborador</h3>
                    <Badge variant="outline" className={isActive ? 'text-green-600 border-green-300' : 'text-red-600 border-red-300'}>
                      {isActive ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="status-toggle" className="text-sm text-muted-foreground">
                      {isActive ? 'Ativo' : 'Inativo'}
                    </Label>
                    <Switch
                      id="status-toggle"
                      checked={isActive}
                      onCheckedChange={(checked) => {
                        setIsActive(checked);
                        if (checked) setDataDesligamento('');
                      }}
                    />
                  </div>
                </div>

                {!isActive && (
                  <div className="space-y-3 pt-2 border-t border-red-200">
                    <p className="text-sm text-red-600">
                      Ao desativar, o colaborador perde acesso ao sistema e não aparece na folha de pagamento.
                    </p>
                    <div className="space-y-2">
                      <Label>Data de Desligamento</Label>
                      <Input
                        type="date"
                        value={dataDesligamento}
                        onChange={e => setDataDesligamento(e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Observações */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              <Label>Observações</Label>
              <Textarea value={observacoes} onChange={e => setObservacoes(e.target.value)} rows={3} />
            </CardContent>
          </Card>
        </div>

        {/* Resumo lateral */}
        <div>
          <Card className="sticky top-6">
            <CardContent className="pt-6 space-y-3">
              <h3 className="font-semibold text-lg">
                {tipoContratacao === 'clt' ? 'Custo Mensal Estimado' : 'Resumo MEI'}
              </h3>

              {tipoContratacao === 'clt' ? (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between font-medium"><span>Salário Base</span><span>R$ {salario.toFixed(2)}</span></div>

                  {totalBeneficios > 0 && (
                    <>
                      <div className="text-xs text-muted-foreground font-medium pt-1">Benefícios</div>
                      {hasVt && <div className="flex justify-between text-muted-foreground"><span>VT</span><span>R$ {vtVal.toFixed(2)}</span></div>}
                      {hasVr && <div className="flex justify-between text-muted-foreground"><span>VR</span><span>R$ {vrVal.toFixed(2)}</span></div>}
                      {hasVa && <div className="flex justify-between text-muted-foreground"><span>VA</span><span>R$ {vaVal.toFixed(2)}</span></div>}
                      {hasPlanoSaude && <div className="flex justify-between text-muted-foreground"><span>Pl. Saúde</span><span>R$ {plSaudeVal.toFixed(2)}</span></div>}
                      {hasPlanoOdonto && <div className="flex justify-between text-muted-foreground"><span>Pl. Odonto</span><span>R$ {plOdontoVal.toFixed(2)}</span></div>}
                      {hasAuxilioCreche && <div className="flex justify-between text-muted-foreground"><span>Aux. Creche</span><span>R$ {auxCrecheVal.toFixed(2)}</span></div>}
                      {hasSalarioFamilia && <div className="flex justify-between text-muted-foreground"><span>Sal. Família</span><span>R$ {salFamiliaVal.toFixed(2)}</span></div>}
                    </>
                  )}

                  <div className="text-xs text-muted-foreground font-medium pt-1">Provisões</div>
                  <div className="flex justify-between text-muted-foreground"><span>13º ({provisao13Pct}%)</span><span>R$ {prov13Val.toFixed(2)}</span></div>
                  <div className="flex justify-between text-muted-foreground"><span>Férias ({provisaoFeriasPct}%)</span><span>R$ {provFeriasVal.toFixed(2)}</span></div>
                  <div className="flex justify-between text-muted-foreground"><span>1/3 Férias ({provisaoFeriasTercoPct}%)</span><span>R$ {provFeriasTercoVal.toFixed(2)}</span></div>
                  <div className="flex justify-between text-muted-foreground"><span>Multa FGTS ({provisaoMultaFgtsPct}%)</span><span>R$ {provMultaVal.toFixed(2)}</span></div>

                  <div className="text-xs text-muted-foreground font-medium pt-1">Encargos Patronais</div>
                  <div className="flex justify-between text-muted-foreground"><span>FGTS ({fgtsPct}%)</span><span>R$ {fgtsVal.toFixed(2)}</span></div>
                  <div className="flex justify-between text-muted-foreground"><span>INSS Patronal ({inssPatronalPct}%)</span><span>R$ {inssPatronalVal.toFixed(2)}</span></div>
                  <div className="flex justify-between text-muted-foreground"><span>RAT ({ratPct}%)</span><span>R$ {ratVal.toFixed(2)}</span></div>
                  <div className="flex justify-between text-muted-foreground"><span>Sistema S ({sistemaSPct}%)</span><span>R$ {sistemaSVal.toFixed(2)}</span></div>
                  <div className="flex justify-between text-muted-foreground"><span>Sal. Educação ({salarioEducacaoPct}%)</span><span>R$ {salEdVal.toFixed(2)}</span></div>

                  {parseFloat(comissaoValor || '0') > 0 && <div className="flex justify-between pt-1"><span>Comissão Extra</span><span>R$ {parseFloat(comissaoValor).toFixed(2)}</span></div>}

                  <div className="border-t pt-2 flex justify-between font-bold text-lg">
                    <span>Custo Total</span>
                    <span>R$ {totalCLT.toFixed(2)}</span>
                  </div>
                  {salario > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {((totalCLT / salario - 1) * 100).toFixed(0)}% acima do salário base
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">+ comissões variáveis por meta batida</p>
                </div>
              ) : (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span>Diária Mínima</span><span>R$ {diaria.toFixed(2)}</span></div>
                  <div className="flex justify-between text-muted-foreground"><span>Estimativa 26 dias</span><span>R$ {(diaria * 26).toFixed(2)}</span></div>
                  <div className="flex justify-between text-muted-foreground"><span>+ Comissões</span><span>Variável</span></div>
                  <div className="border-t pt-2">
                    <p className="text-xs text-muted-foreground">
                      O valor real depende dos dias trabalhados e procedimentos realizados.
                      Acompanhe pelo módulo <strong>Produtividade</strong>.
                    </p>
                  </div>
                  <div className="border-t pt-2 flex justify-between font-bold text-lg">
                    <span>Mínimo/mês</span>
                    <span>R$ {(diaria * 26).toFixed(2)}</span>
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <Button variant="outline" className="flex-1" onClick={() => navigate('/financeiro/folha')}>Cancelar</Button>
                <Button className="flex-1" onClick={handleSave} disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Salvando...' : 'Salvar'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
