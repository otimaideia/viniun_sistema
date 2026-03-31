import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useSignupEmpresa } from '@/hooks/public/useSignupEmpresa';
import { toast } from 'sonner';
import {
  Building2,
  MapPin,
  UserCircle,
  CreditCard,
  ClipboardCheck,
  Check,
  Eye,
  EyeOff,
  ArrowLeft,
  ArrowRight,
  Loader2,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface FormData {
  // Step 1 - Empresa
  nome_fantasia: string;
  cnpj: string;
  tipo_empresa: string;
  // Step 2 - Endereço
  cep: string;
  endereco: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
  telefone: string;
  email_empresa: string;
  // Step 3 - Acesso
  nome: string;
  email: string;
  senha: string;
  confirmar_senha: string;
  telefone_admin: string;
  // Step 4 - Plano
  plano: 'starter' | 'professional' | 'enterprise';
  billing: 'mensal' | 'anual';
  // Step 5 - Revisão
  aceite_termos: boolean;
}

const INITIAL_DATA: FormData = {
  nome_fantasia: '',
  cnpj: '',
  tipo_empresa: '',
  cep: '',
  endereco: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: '',
  estado: '',
  telefone: '',
  email_empresa: '',
  nome: '',
  email: '',
  senha: '',
  confirmar_senha: '',
  telefone_admin: '',
  plano: 'professional',
  billing: 'mensal',
  aceite_termos: false,
};

const steps = [
  { number: 1, label: 'Empresa', icon: Building2 },
  { number: 2, label: 'Endereço', icon: MapPin },
  { number: 3, label: 'Acesso', icon: UserCircle },
  { number: 4, label: 'Plano', icon: CreditCard },
  { number: 5, label: 'Revisão', icon: ClipboardCheck },
];

const plans = [
  {
    id: 'starter' as const,
    name: 'Starter',
    monthlyPrice: 97,
    annualPrice: 77,
    description: 'Ideal para corretores autônomos e pequenas equipes.',
    features: ['Até 5 corretores', '500 leads/mês', 'CRM + Funil', 'Agendamentos', 'Suporte por email'],
  },
  {
    id: 'professional' as const,
    name: 'Professional',
    monthlyPrice: 197,
    annualPrice: 157,
    description: 'Para imobiliárias em crescimento que precisam escalar.',
    features: ['Até 20 corretores', '5.000 leads/mês', 'WhatsApp Integrado', 'Portal do Corretor', 'Financeiro', 'Suporte prioritário'],
    popular: true,
  },
  {
    id: 'enterprise' as const,
    name: 'Enterprise',
    monthlyPrice: 397,
    annualPrice: 317,
    description: 'Para grandes operações com necessidades avançadas.',
    features: ['Corretores ilimitados', 'Leads ilimitados', 'API & Webhooks', 'Chatbot IA', 'Gerente dedicado'],
  },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatCNPJ(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 14);
  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}

function formatCEP(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  return digits.replace(/^(\d{5})(\d)/, '$1-$2');
}

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 10) {
    return digits.replace(/^(\d{2})(\d{4})(\d)/, '($1) $2-$3');
  }
  return digits.replace(/^(\d{2})(\d{5})(\d)/, '($1) $2-$3');
}

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
  });
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function SignupEmpresa() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormData>(INITIAL_DATA);
  const [showPassword, setShowPassword] = useState(false);
  const { signup, isSubmitting } = useSignupEmpresa();
  const [cepLoading, setCepLoading] = useState(false);

  // Pre-select plan from URL
  useEffect(() => {
    const plano = searchParams.get('plano');
    if (plano && ['starter', 'professional', 'enterprise'].includes(plano)) {
      setFormData((prev) => ({ ...prev, plano: plano as FormData['plano'] }));
    }
  }, [searchParams]);

  const update = (field: keyof FormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  /* ------ CEP auto-fill ------ */
  const fetchCEP = async (cep: string) => {
    const digits = cep.replace(/\D/g, '');
    if (digits.length !== 8) return;
    setCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setFormData((prev) => ({
          ...prev,
          endereco: data.logradouro || prev.endereco,
          bairro: data.bairro || prev.bairro,
          cidade: data.localidade || prev.cidade,
          estado: data.uf || prev.estado,
        }));
      }
    } catch {
      // Silently fail - user can fill manually
    } finally {
      setCepLoading(false);
    }
  };

  /* ------ Validation ------ */
  const validateStep = (): boolean => {
    switch (currentStep) {
      case 1:
        if (!formData.nome_fantasia.trim()) {
          toast.error('Informe o nome da empresa');
          return false;
        }
        if (!formData.tipo_empresa) {
          toast.error('Selecione o tipo da empresa');
          return false;
        }
        return true;

      case 2:
        if (!formData.telefone.trim()) {
          toast.error('Informe o telefone');
          return false;
        }
        if (!formData.email_empresa.trim()) {
          toast.error('Informe o email da empresa');
          return false;
        }
        return true;

      case 3:
        if (!formData.nome.trim()) {
          toast.error('Informe seu nome');
          return false;
        }
        if (!formData.email.trim()) {
          toast.error('Informe seu email');
          return false;
        }
        if (formData.senha.length < 8) {
          toast.error('A senha deve ter no mínimo 8 caracteres');
          return false;
        }
        if (formData.senha !== formData.confirmar_senha) {
          toast.error('As senhas não conferem');
          return false;
        }
        return true;

      case 4:
        return true;

      case 5:
        if (!formData.aceite_termos) {
          toast.error('Você precisa aceitar os termos para continuar');
          return false;
        }
        return true;

      default:
        return true;
    }
  };

  const next = () => {
    if (validateStep() && currentStep < 5) {
      setCurrentStep((s) => s + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const prev = () => {
    if (currentStep > 1) {
      setCurrentStep((s) => s - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  /* ------ Submit ------ */
  const handleSubmit = async () => {
    if (!validateStep()) return;

    const result = await signup(formData);

    if (result.success) {
      toast.success('Conta criada com sucesso!');
      navigate('/cadastro/sucesso');
    } else {
      toast.error(result.error || 'Erro ao criar conta');
    }
  };

  /* ------ Render helpers ------ */

  const selectedPlan = plans.find((p) => p.id === formData.plano)!;
  const price =
    formData.billing === 'anual' ? selectedPlan.annualPrice : selectedPlan.monthlyPrice;

  return (
    <div className="min-h-screen bg-viniun-light">
      {/* Top bar */}
      <div className="bg-white border-b">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="text-xl font-bold text-viniun-navy tracking-tight">
            Viniun
          </Link>
          <span className="text-sm text-gray-500">
            Passo {currentStep} de 5
          </span>
        </div>
      </div>

      {/* Step indicator */}
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-10">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            const isActive = currentStep === step.number;
            const isDone = currentStep > step.number;

            return (
              <div key={step.number} className="flex items-center flex-1 last:flex-initial">
                <div className="flex flex-col items-center">
                  <div
                    className={`flex items-center justify-center h-10 w-10 rounded-full text-sm font-bold transition-colors ${
                      isDone
                        ? 'bg-viniun-blue text-white'
                        : isActive
                        ? 'bg-viniun-navy text-white'
                        : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {isDone ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                  </div>
                  <span
                    className={`text-xs mt-2 hidden sm:block ${
                      isActive ? 'text-viniun-navy font-semibold' : 'text-gray-400'
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
                {idx < steps.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-2 ${
                      currentStep > step.number ? 'bg-viniun-blue' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Form card */}
        <Card className="shadow-lg">
          <CardContent className="p-6 sm:p-10">
            {/* ---- Step 1: Empresa ---- */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-viniun-dark mb-1">Sua Empresa</h2>
                  <p className="text-sm text-gray-500">Informações básicas da sua imobiliária</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="nome_fantasia">Nome Fantasia *</Label>
                    <Input
                      id="nome_fantasia"
                      placeholder="Ex: Imóveis Prime"
                      value={formData.nome_fantasia}
                      onChange={(e) => update('nome_fantasia', e.target.value)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="cnpj">CNPJ</Label>
                    <Input
                      id="cnpj"
                      placeholder="00.000.000/0000-00"
                      value={formData.cnpj}
                      onChange={(e) => update('cnpj', formatCNPJ(e.target.value))}
                    />
                  </div>

                  <div>
                    <Label>Tipo de Empresa *</Label>
                    <Select
                      value={formData.tipo_empresa}
                      onValueChange={(v) => update('tipo_empresa', v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="imobiliaria">Imobiliária</SelectItem>
                        <SelectItem value="incorporadora">Incorporadora</SelectItem>
                        <SelectItem value="construtora">Construtora</SelectItem>
                        <SelectItem value="corretora">Corretora</SelectItem>
                        <SelectItem value="outra">Outra</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {/* ---- Step 2: Endereço ---- */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-viniun-dark mb-1">Endereço</h2>
                  <p className="text-sm text-gray-500">Localização da sua empresa</p>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="cep">CEP</Label>
                      <Input
                        id="cep"
                        placeholder="00000-000"
                        value={formData.cep}
                        onChange={(e) => {
                          const val = formatCEP(e.target.value);
                          update('cep', val);
                          if (val.replace(/\D/g, '').length === 8) fetchCEP(val);
                        }}
                      />
                      {cepLoading && (
                        <p className="text-xs text-viniun-blue mt-1">Buscando endereço...</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="numero">Número</Label>
                      <Input
                        id="numero"
                        placeholder="123"
                        value={formData.numero}
                        onChange={(e) => update('numero', e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="endereco">Endereço</Label>
                    <Input
                      id="endereco"
                      placeholder="Rua, Avenida..."
                      value={formData.endereco}
                      onChange={(e) => update('endereco', e.target.value)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="complemento">Complemento</Label>
                    <Input
                      id="complemento"
                      placeholder="Sala, Andar..."
                      value={formData.complemento}
                      onChange={(e) => update('complemento', e.target.value)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="bairro">Bairro</Label>
                    <Input
                      id="bairro"
                      placeholder="Bairro"
                      value={formData.bairro}
                      onChange={(e) => update('bairro', e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="cidade">Cidade</Label>
                      <Input
                        id="cidade"
                        placeholder="Cidade"
                        value={formData.cidade}
                        onChange={(e) => update('cidade', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="estado">Estado</Label>
                      <Input
                        id="estado"
                        placeholder="UF"
                        maxLength={2}
                        value={formData.estado}
                        onChange={(e) => update('estado', e.target.value.toUpperCase())}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="telefone">Telefone *</Label>
                      <Input
                        id="telefone"
                        placeholder="(00) 00000-0000"
                        value={formData.telefone}
                        onChange={(e) => update('telefone', formatPhone(e.target.value))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="email_empresa">Email da Empresa *</Label>
                      <Input
                        id="email_empresa"
                        type="email"
                        placeholder="contato@empresa.com"
                        value={formData.email_empresa}
                        onChange={(e) => update('email_empresa', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ---- Step 3: Acesso ---- */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-viniun-dark mb-1">Seu Acesso (Admin)</h2>
                  <p className="text-sm text-gray-500">
                    Dados do administrador principal da conta
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="nome">Nome Completo *</Label>
                    <Input
                      id="nome"
                      placeholder="Seu nome"
                      value={formData.nome}
                      onChange={(e) => update('nome', e.target.value)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="email">Email (será seu login) *</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="seu@email.com"
                      value={formData.email}
                      onChange={(e) => update('email', e.target.value)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="senha">Senha *</Label>
                    <div className="relative">
                      <Input
                        id="senha"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Mínimo 8 caracteres"
                        value={formData.senha}
                        onChange={(e) => update('senha', e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    {formData.senha.length > 0 && formData.senha.length < 8 && (
                      <p className="text-xs text-red-500 mt-1">Mínimo 8 caracteres</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="confirmar_senha">Confirmar Senha *</Label>
                    <Input
                      id="confirmar_senha"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Repita a senha"
                      value={formData.confirmar_senha}
                      onChange={(e) => update('confirmar_senha', e.target.value)}
                    />
                    {formData.confirmar_senha.length > 0 &&
                      formData.senha !== formData.confirmar_senha && (
                        <p className="text-xs text-red-500 mt-1">As senhas não conferem</p>
                      )}
                  </div>

                  <div>
                    <Label htmlFor="telefone_admin">Telefone</Label>
                    <Input
                      id="telefone_admin"
                      placeholder="(00) 00000-0000"
                      value={formData.telefone_admin}
                      onChange={(e) => update('telefone_admin', formatPhone(e.target.value))}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ---- Step 4: Plano ---- */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-viniun-dark mb-1">Escolha seu Plano</h2>
                  <p className="text-sm text-gray-500">14 dias grátis em qualquer plano</p>
                </div>

                {/* Billing toggle */}
                <div className="flex items-center justify-center gap-3">
                  <span
                    className={`text-sm font-medium ${
                      formData.billing === 'mensal' ? 'text-viniun-navy' : 'text-gray-400'
                    }`}
                  >
                    Mensal
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      update('billing', formData.billing === 'mensal' ? 'anual' : 'mensal')
                    }
                    className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                      formData.billing === 'anual' ? 'bg-viniun-blue' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                        formData.billing === 'anual' ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                  <span
                    className={`text-sm font-medium ${
                      formData.billing === 'anual' ? 'text-viniun-navy' : 'text-gray-400'
                    }`}
                  >
                    Anual
                  </span>
                  {formData.billing === 'anual' && (
                    <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs">
                      -20%
                    </Badge>
                  )}
                </div>

                {/* Plan cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {plans.map((plan) => {
                    const isSelected = formData.plano === plan.id;
                    const displayPrice =
                      formData.billing === 'anual' ? plan.annualPrice : plan.monthlyPrice;

                    return (
                      <button
                        key={plan.id}
                        type="button"
                        onClick={() => update('plano', plan.id)}
                        className={`relative text-left rounded-xl p-5 border-2 transition-all ${
                          isSelected
                            ? 'border-viniun-blue bg-viniun-blue/5 shadow-md'
                            : 'border-gray-200 bg-white hover:border-gray-300'
                        }`}
                      >
                        {plan.popular && (
                          <Badge className="absolute -top-2.5 right-3 bg-viniun-blue text-white text-xs px-2">
                            Popular
                          </Badge>
                        )}

                        <h4 className="font-bold text-viniun-navy mb-1">{plan.name}</h4>
                        <p className="text-xs text-gray-500 mb-3">{plan.description}</p>

                        <div className="flex items-baseline gap-1 mb-3">
                          <span className="text-2xl font-bold text-viniun-navy">
                            {formatCurrency(displayPrice)}
                          </span>
                          <span className="text-xs text-gray-500">/mês</span>
                        </div>

                        <ul className="space-y-1.5">
                          {plan.features.map((f, i) => (
                            <li key={i} className="flex items-center gap-2 text-xs text-gray-600">
                              <Check className="h-3 w-3 text-viniun-blue flex-shrink-0" />
                              {f}
                            </li>
                          ))}
                        </ul>

                        {isSelected && (
                          <div className="absolute top-3 left-3">
                            <div className="h-5 w-5 rounded-full bg-viniun-blue flex items-center justify-center">
                              <Check className="h-3 w-3 text-white" />
                            </div>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ---- Step 5: Revisão ---- */}
            {currentStep === 5 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-viniun-dark mb-1">Revisão</h2>
                  <p className="text-sm text-gray-500">Confira os dados antes de criar sua conta</p>
                </div>

                <div className="space-y-4">
                  {/* Empresa */}
                  <div className="bg-viniun-light rounded-xl p-5">
                    <h4 className="text-sm font-semibold text-viniun-navy mb-3 flex items-center gap-2">
                      <Building2 className="h-4 w-4" /> Empresa
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <span className="text-gray-500">Nome:</span>
                      <span className="font-medium">{formData.nome_fantasia}</span>
                      {formData.cnpj && (
                        <>
                          <span className="text-gray-500">CNPJ:</span>
                          <span>{formData.cnpj}</span>
                        </>
                      )}
                      <span className="text-gray-500">Tipo:</span>
                      <span className="capitalize">{formData.tipo_empresa}</span>
                    </div>
                  </div>

                  {/* Endereço */}
                  <div className="bg-viniun-light rounded-xl p-5">
                    <h4 className="text-sm font-semibold text-viniun-navy mb-3 flex items-center gap-2">
                      <MapPin className="h-4 w-4" /> Endereço
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {formData.endereco && (
                        <>
                          <span className="text-gray-500">Endereço:</span>
                          <span>
                            {formData.endereco}
                            {formData.numero && `, ${formData.numero}`}
                          </span>
                        </>
                      )}
                      {formData.cidade && (
                        <>
                          <span className="text-gray-500">Cidade:</span>
                          <span>
                            {formData.cidade}
                            {formData.estado && ` - ${formData.estado}`}
                          </span>
                        </>
                      )}
                      <span className="text-gray-500">Telefone:</span>
                      <span>{formData.telefone}</span>
                      <span className="text-gray-500">Email:</span>
                      <span>{formData.email_empresa}</span>
                    </div>
                  </div>

                  {/* Admin */}
                  <div className="bg-viniun-light rounded-xl p-5">
                    <h4 className="text-sm font-semibold text-viniun-navy mb-3 flex items-center gap-2">
                      <UserCircle className="h-4 w-4" /> Administrador
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <span className="text-gray-500">Nome:</span>
                      <span className="font-medium">{formData.nome}</span>
                      <span className="text-gray-500">Email:</span>
                      <span>{formData.email}</span>
                    </div>
                  </div>

                  {/* Plano */}
                  <div className="bg-viniun-light rounded-xl p-5">
                    <h4 className="text-sm font-semibold text-viniun-navy mb-3 flex items-center gap-2">
                      <CreditCard className="h-4 w-4" /> Plano
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <span className="text-gray-500">Plano:</span>
                      <span className="font-medium">{selectedPlan.name}</span>
                      <span className="text-gray-500">Cobrança:</span>
                      <span className="capitalize">{formData.billing}</span>
                      <span className="text-gray-500">Valor:</span>
                      <span className="font-bold text-viniun-navy">
                        {formatCurrency(price)}/mês
                      </span>
                    </div>
                  </div>
                </div>

                {/* Terms */}
                <div className="flex items-start gap-3 pt-2">
                  <Checkbox
                    id="aceite_termos"
                    checked={formData.aceite_termos}
                    onCheckedChange={(v) => update('aceite_termos', v === true)}
                  />
                  <label htmlFor="aceite_termos" className="text-sm text-gray-600 leading-relaxed">
                    Li e aceito os{' '}
                    <button className="text-viniun-blue hover:underline">Termos de Uso</button> e{' '}
                    <button className="text-viniun-blue hover:underline">
                      Política de Privacidade
                    </button>
                  </label>
                </div>
              </div>
            )}

            {/* ---- Navigation ---- */}
            <div className="flex items-center justify-between mt-10 pt-6 border-t">
              {currentStep > 1 ? (
                <Button type="button" variant="outline" onClick={prev}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Voltar
                </Button>
              ) : (
                <div />
              )}

              {currentStep < 5 ? (
                <Button
                  type="button"
                  className="bg-viniun-navy hover:bg-viniun-dark text-white"
                  onClick={next}
                >
                  Próximo
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button
                  type="button"
                  className="bg-viniun-navy hover:bg-viniun-dark text-white w-full sm:w-auto"
                  disabled={isSubmitting || !formData.aceite_termos}
                  onClick={handleSubmit}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Criando conta...
                    </>
                  ) : (
                    'Criar minha conta'
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
