import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Loader2,
  ChevronLeft,
  ChevronRight,
  Send,
  CheckCircle2,
  AlertCircle,
  Check,
  MapPin,
  ChevronsUpDown,
  X,
  Star,
  Users,
  Award,
  Building2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FormularioWithRelations, FormularioCampo } from '@/types/formulario';
import { Servico } from '@/types/servico';

// Mascaras para campos
const applyMask = (value: string, mask: string): string => {
  if (!mask || !value) return value;
  const cleanValue = value.replace(/\D/g, '');
  let maskedValue = '';
  let valueIndex = 0;

  for (let i = 0; i < mask.length && valueIndex < cleanValue.length; i++) {
    if (mask[i] === '9') {
      maskedValue += cleanValue[valueIndex];
      valueIndex++;
    } else {
      maskedValue += mask[i];
      if (cleanValue[valueIndex] === mask[i]) {
        valueIndex++;
      }
    }
  }
  return maskedValue;
};

const MASKS: Record<string, string> = {
  cpf: '999.999.999-99',
  tel: '(99) 99999-9999',
  cep: '99999-999',
};

// Buscar endereco pelo CEP
const fetchAddressByCep = async (cep: string) => {
  try {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length !== 8) return null;
    const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
    const data = await response.json();
    if (data.erro) return null;
    return {
      logradouro: data.logradouro,
      bairro: data.bairro,
      cidade: data.localidade,
      estado: data.uf,
    };
  } catch {
    return null;
  }
};

// Gerar schema Zod dinamico
const generateValidationSchema = (campos: FormularioCampo[]) => {
  const schemaFields: Record<string, z.ZodTypeAny> = {};

  campos.forEach((campo) => {
    let fieldSchema: z.ZodTypeAny = z.string();

    switch (campo.tipo) {
      case 'email':
        fieldSchema = z.string().email('E-mail invalido');
        break;
      case 'tel':
        fieldSchema = z.string().min(14, 'Telefone invalido');
        break;
      case 'cpf':
        fieldSchema = z.string().min(14, 'CPF invalido');
        break;
      case 'cep':
        fieldSchema = z.string().min(9, 'CEP invalido');
        break;
      case 'checkbox':
        fieldSchema = z.boolean();
        break;
      case 'date':
        fieldSchema = z.string().min(1, 'Data obrigatoria');
        break;
      case 'servico':
        fieldSchema = z.array(z.string());
        break;
      default:
        fieldSchema = z.string();
    }

    if (campo.obrigatorio) {
      if (campo.tipo === 'checkbox') {
        fieldSchema = z.boolean().refine((val) => val === true, 'Campo obrigatorio');
      } else if (campo.tipo === 'servico') {
        fieldSchema = z.array(z.string()).min(1, 'Selecione pelo menos um servico');
      } else {
        fieldSchema = fieldSchema.refine((val) => val && val.toString().trim() !== '', 'Campo obrigatorio');
      }
    } else {
      if (campo.tipo === 'servico') {
        fieldSchema = z.array(z.string()).optional();
      } else {
        fieldSchema = fieldSchema.optional();
      }
    }

    schemaFields[campo.nome] = fieldSchema;
  });

  return z.object(schemaFields);
};

interface FormularioLandingPageTemplateProps {
  formulario: FormularioWithRelations;
  servicos: Servico[];
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  submitting: boolean;
  submitted: boolean;
  onTrackEvent?: (evento: 'start' | 'step' | 'submit') => void;
}

export default function FormularioLandingPageTemplate({
  formulario,
  servicos,
  onSubmit,
  submitting,
  submitted,
  onTrackEvent,
}: FormularioLandingPageTemplateProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [enderecoInfo, setEnderecoInfo] = useState<string | null>(null);

  // Estilos personalizados do formulario - YESlaser usa verde como padrao
  const styles = {
    // Cores principais
    primary: formulario.cor_primaria || '#10b981',
    secondary: formulario.cor_secundaria || '#059669',
    background: formulario.cor_fundo || '#F8FAFC',
    text: formulario.cor_texto || '#1F2937',

    // Cores dos campos
    fieldBg: formulario.cor_campo_fundo || '#F1F5F9',
    fieldText: formulario.cor_campo_texto || '#1F2937',
    fieldBorder: formulario.cor_campo_borda || '#E2E8F0',
    fieldFocus: formulario.cor_campo_foco || formulario.cor_primaria || '#10b981',

    // Cores do stepper
    stepperActive: formulario.cor_stepper_ativo || formulario.cor_primaria || '#10b981',
    stepperInactive: formulario.cor_stepper_inativo || '#CBD5E1',
    stepperComplete: formulario.cor_stepper_completo || '#22C55E',

    // Cores dos botoes
    buttonBg: formulario.cor_botao || formulario.cor_primaria || '#10b981',
    buttonText: formulario.cor_botao_texto || '#FFFFFF',

    // Gradiente
    gradientStart: formulario.gradiente_inicio || formulario.cor_primaria || '#10b981',
    gradientEnd: formulario.gradiente_fim || formulario.cor_secundaria || '#059669',

    // Card
    cardBg: formulario.card_fundo || '#FFFFFF',

    // Border radius
    borderRadius: formulario.border_radius || 'lg',
  };

  // Campos por etapa (para modo wizard)
  const camposPorEtapa = useMemo(() => {
    if (!formulario?.campos) return [];

    if (formulario.modo !== 'wizard' || !formulario.wizard_config?.etapas) {
      return [formulario.campos];
    }

    const etapas: FormularioCampo[][] = [];
    formulario.wizard_config.etapas.forEach((_, index) => {
      etapas[index] = formulario.campos?.filter((c) => c.etapa === index) || [];
    });

    const camposSemEtapa = formulario.campos.filter((c) => c.etapa === undefined || c.etapa === null);
    if (camposSemEtapa.length > 0) {
      etapas[0] = [...(etapas[0] || []), ...camposSemEtapa];
    }

    return etapas.filter((e) => e.length > 0);
  }, [formulario]);

  const totalSteps = camposPorEtapa.length;
  const isWizard = formulario?.modo === 'wizard' && totalSteps > 1;
  const currentFields = camposPorEtapa[currentStep] || [];

  // Schema de validacao
  const validationSchema = useMemo(() => {
    if (!formulario?.campos) return z.object({});
    return generateValidationSchema(formulario.campos);
  }, [formulario?.campos]);

  const {
    control,
    handleSubmit,
    setValue,
    trigger,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(validationSchema),
    mode: 'onBlur',
  });

  // Watch CEP para buscar endereco
  const cepValue = watch('cep');

  useEffect(() => {
    const fetchAddress = async () => {
      if (cepValue && cepValue.replace(/\D/g, '').length === 8 && formulario.cep_auto_fill) {
        setCepLoading(true);
        const address = await fetchAddressByCep(cepValue);
        setCepLoading(false);

        if (address) {
          setEnderecoInfo(`${address.logradouro}, ${address.bairro} - ${address.cidade}/${address.estado}`);
          // Auto-preencher campos de endereco se existirem
          if (formulario.campos?.find(c => c.nome === 'rua')) setValue('rua', address.logradouro || '');
          if (formulario.campos?.find(c => c.nome === 'bairro')) setValue('bairro', address.bairro || '');
          if (formulario.campos?.find(c => c.nome === 'cidade_cep')) setValue('cidade_cep', address.cidade || '');
          if (formulario.campos?.find(c => c.nome === 'estado_cep')) setValue('estado_cep', address.estado || '');
        } else {
          setEnderecoInfo(null);
        }
      }
    };
    fetchAddress();
  }, [cepValue, formulario.cep_auto_fill, formulario.campos, setValue]);

  // Navegacao do wizard
  const handleNext = async () => {
    const camposEtapa = currentFields.map((c) => c.nome);
    const isValid = await trigger(camposEtapa);

    if (!isValid) return;

    if (currentStep < totalSteps - 1) {
      setCurrentStep((prev) => prev + 1);
      onTrackEvent?.('step');
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0 && formulario?.permitir_voltar) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleFormSubmit = async (data: Record<string, unknown>) => {
    onTrackEvent?.('submit');
    await onSubmit(data);
  };

  const handleFieldFocus = () => {
    if (!hasStarted) {
      setHasStarted(true);
      onTrackEvent?.('start');
    }
  };

  // Renderizar campo dinamico
  const renderField = (campo: FormularioCampo) => {
    const getMask = () => {
      if (campo.mascara) return campo.mascara;
      if (campo.tipo in MASKS) return MASKS[campo.tipo];
      return '';
    };

    const fieldError = errors[campo.nome];
    const baseInputClass = cn(
      'w-full rounded-lg px-4 py-3 text-base transition-all duration-300',
      'border focus:outline-none focus:ring-2',
      'disabled:cursor-not-allowed disabled:opacity-50',
      fieldError && 'border-red-500 focus:ring-red-500'
    );

    const inputStyle = {
      backgroundColor: styles.fieldBg,
      color: styles.fieldText,
      borderColor: fieldError ? '#EF4444' : styles.fieldBorder,
      '--tw-ring-color': fieldError ? '#EF4444' : styles.fieldFocus,
    } as React.CSSProperties;

    switch (campo.tipo) {
      case 'textarea':
        return (
          <Controller
            name={campo.nome}
            control={control}
            defaultValue=""
            render={({ field }) => (
              <Textarea
                {...field}
                placeholder={campo.placeholder}
                disabled={submitting}
                className={baseInputClass}
                style={inputStyle}
                onFocus={handleFieldFocus}
              />
            )}
          />
        );

      case 'select':
        return (
          <Controller
            name={campo.nome}
            control={control}
            defaultValue=""
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={field.onChange}
                disabled={submitting}
              >
                <SelectTrigger
                  className={baseInputClass}
                  style={inputStyle}
                  onFocus={handleFieldFocus}
                >
                  <SelectValue placeholder={campo.placeholder || 'Selecione...'} />
                </SelectTrigger>
                <SelectContent>
                  {campo.opcoes?.map((opcao) => (
                    <SelectItem key={opcao} value={opcao}>
                      {opcao}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        );

      case 'servico':
        return (
          <Controller
            name={campo.nome}
            control={control}
            defaultValue={[]}
            render={({ field }) => {
              const selectedIds: string[] = Array.isArray(field.value) ? field.value : [];

              const handleToggle = (servicoId: string) => {
                const newValue = selectedIds.includes(servicoId)
                  ? selectedIds.filter(id => id !== servicoId)
                  : [...selectedIds, servicoId];
                field.onChange(newValue);
              };

              if (!servicos || servicos.length === 0) {
                return (
                  <div className="p-4 text-center text-muted-foreground rounded-lg" style={{ backgroundColor: styles.fieldBg }}>
                    Nenhum servico disponivel
                  </div>
                );
              }

              // Renderizar como botoes toggle
              return (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {servicos.map((servico) => {
                      const isSelected = selectedIds.includes(servico.id);
                      return (
                        <button
                          key={servico.id}
                          type="button"
                          onClick={() => handleToggle(servico.id)}
                          className={cn(
                            'px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                            'border-2 focus:outline-none focus:ring-2',
                            isSelected && 'text-white'
                          )}
                          style={{
                            backgroundColor: isSelected ? styles.primary : styles.fieldBg,
                            borderColor: isSelected ? styles.primary : styles.fieldBorder,
                            color: isSelected ? '#FFFFFF' : styles.fieldText,
                          }}
                          disabled={submitting}
                        >
                          {isSelected && <Check className="inline-block w-4 h-4 mr-1" />}
                          {servico.nome}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {selectedIds.length > 0
                      ? `${selectedIds.length} servico(s) selecionado(s)`
                      : '* Selecione pelo menos um servico de interesse'}
                  </p>
                </div>
              );
            }}
          />
        );

      case 'checkbox':
        return (
          <Controller
            name={campo.nome}
            control={control}
            defaultValue={false}
            render={({ field }) => (
              <div className="flex items-start space-x-3">
                <Checkbox
                  id={campo.nome}
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={submitting}
                  className="mt-1"
                  style={{
                    borderColor: styles.fieldBorder,
                    backgroundColor: field.value ? styles.primary : 'transparent',
                  }}
                />
                <Label
                  htmlFor={campo.nome}
                  className="font-normal leading-tight cursor-pointer text-sm"
                  style={{ color: styles.text }}
                >
                  {campo.placeholder || campo.label}
                </Label>
              </div>
            )}
          />
        );

      case 'date':
        return (
          <Controller
            name={campo.nome}
            control={control}
            defaultValue=""
            render={({ field }) => (
              <Input
                {...field}
                type="date"
                disabled={submitting}
                className={baseInputClass}
                style={inputStyle}
                onFocus={handleFieldFocus}
              />
            )}
          />
        );

      case 'radio':
        return (
          <Controller
            name={campo.nome}
            control={control}
            defaultValue=""
            render={({ field }) => (
              <RadioGroup
                value={field.value}
                onValueChange={field.onChange}
                disabled={submitting}
                className="flex flex-col space-y-2"
              >
                {campo.opcoes?.map((opcao) => (
                  <div key={opcao} className="flex items-center space-x-2">
                    <RadioGroupItem value={opcao} id={`${campo.nome}-${opcao}`} />
                    <Label htmlFor={`${campo.nome}-${opcao}`} className="font-normal">
                      {opcao}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            )}
          />
        );

      default: {
        const mask = getMask();
        return (
          <Controller
            name={campo.nome}
            control={control}
            defaultValue=""
            render={({ field }) => (
              <div className="relative">
                <Input
                  {...field}
                  type={campo.tipo === 'email' ? 'email' : 'text'}
                  placeholder={campo.placeholder}
                  disabled={submitting || (campo.tipo === 'cep' && cepLoading)}
                  className={cn(baseInputClass, 'h-12')}
                  style={inputStyle}
                  onChange={(e) => {
                    const value = mask ? applyMask(e.target.value, mask) : e.target.value;
                    field.onChange(value);
                  }}
                  onFocus={handleFieldFocus}
                />
                {campo.tipo === 'cep' && cepLoading && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </div>
            )}
          />
        );
      }
    }
  };

  // ===== SUCESSO =====
  if (submitted) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4"
        style={{
          background: formulario.gradiente_ativo
            ? `linear-gradient(to bottom right, ${styles.gradientStart}, ${styles.gradientEnd})`
            : styles.background
        }}
      >
        <div
          className="max-w-md w-full p-8 rounded-2xl shadow-2xl text-center"
          style={{ backgroundColor: styles.cardBg }}
        >
          <div
            className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center"
            style={{ backgroundColor: `${styles.stepperComplete}20` }}
          >
            <CheckCircle2 className="h-12 w-12" style={{ color: styles.stepperComplete }} />
          </div>
          <h2 className="text-2xl font-bold mb-3" style={{ color: styles.text }}>
            Enviado com sucesso!
          </h2>
          <p className="text-muted-foreground">
            {formulario.mensagem_sucesso || 'Obrigado! Entraremos em contato em breve.'}
          </p>
        </div>
      </div>
    );
  }

  // ===== FORMULARIO =====
  // Calcular estilos de fundo corretamente
  const backgroundStyles: React.CSSProperties = formulario.background_image_url
    ? {
        backgroundImage: `url(${formulario.background_image_url})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }
    : formulario.gradiente_ativo
    ? {
        background: `linear-gradient(135deg, ${styles.gradientStart} 0%, ${styles.gradientEnd} 100%)`,
      }
    : {
        backgroundColor: styles.background,
      };

  return (
    <div
      className="min-h-screen"
      style={backgroundStyles}
    >
      {/* Overlay para imagem de fundo */}
      {formulario.background_image_url && formulario.background_overlay && (
        <div
          className="fixed inset-0"
          style={{
            backgroundColor: formulario.background_overlay_cor || 'rgba(0,0,0,0.5)',
            zIndex: 0,
          }}
        />
      )}

      <div className="relative z-10 container mx-auto px-4 py-8 md:py-16">
        <div className="grid lg:grid-cols-2 gap-8 items-start max-w-6xl mx-auto">

          {/* Coluna Esquerda - Informacoes */}
          <div className="hidden lg:block space-y-8">
            {/* Logo */}
            {formulario.logo_url && (
              <img
                src={formulario.logo_url}
                alt={formulario.nome}
                className={cn(
                  'object-contain',
                  formulario.logo_tamanho === 'sm' && 'h-12',
                  formulario.logo_tamanho === 'md' && 'h-16',
                  formulario.logo_tamanho === 'lg' && 'h-20',
                  formulario.logo_tamanho === 'xl' && 'h-24',
                  !formulario.logo_tamanho && 'h-16',
                )}
              />
            )}

            {/* Titulo e Subtitulo */}
            <div>
              {formulario.badge_texto && (
                <span
                  className="inline-block px-4 py-1 rounded-full text-sm font-semibold mb-4"
                  style={{
                    backgroundColor: formulario.badge_cor_fundo || styles.primary,
                    color: formulario.badge_cor_texto || '#FFFFFF',
                  }}
                >
                  {formulario.badge_texto}
                </span>
              )}
              <h1
                className="text-4xl md:text-5xl font-bold mb-4"
                style={{ color: formulario.gradiente_ativo ? '#FFFFFF' : styles.text }}
              >
                {formulario.titulo || formulario.nome}
              </h1>
              {formulario.subtitulo && (
                <p
                  className="text-xl opacity-90"
                  style={{ color: formulario.gradiente_ativo ? '#FFFFFF' : styles.text }}
                >
                  {formulario.subtitulo}
                </p>
              )}
            </div>

            {/* Contadores/Beneficios */}
            {formulario.mostrar_contadores && (
              <div className="grid grid-cols-2 gap-4">
                <div
                  className="p-4 rounded-xl"
                  style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
                >
                  <Users className="h-8 w-8 mb-2" style={{ color: formulario.gradiente_ativo ? '#FFFFFF' : styles.primary }} />
                  <p className="text-2xl font-bold" style={{ color: formulario.gradiente_ativo ? '#FFFFFF' : styles.text }}>+50.000</p>
                  <p className="text-sm opacity-75" style={{ color: formulario.gradiente_ativo ? '#FFFFFF' : styles.text }}>Clientes atendidos</p>
                </div>
                <div
                  className="p-4 rounded-xl"
                  style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
                >
                  <Star className="h-8 w-8 mb-2" style={{ color: formulario.gradiente_ativo ? '#FFFFFF' : styles.primary }} />
                  <p className="text-2xl font-bold" style={{ color: formulario.gradiente_ativo ? '#FFFFFF' : styles.text }}>5 Estrelas</p>
                  <p className="text-sm opacity-75" style={{ color: formulario.gradiente_ativo ? '#FFFFFF' : styles.text }}>Avaliacao media</p>
                </div>
              </div>
            )}

            {/* Descricao */}
            {formulario.descricao && (
              <div
                className="p-6 rounded-xl backdrop-blur-sm"
                style={{
                  backgroundColor: formulario.gradiente_ativo ? 'rgba(255,255,255,0.1)' : styles.fieldBg,
                }}
              >
                <h3
                  className="font-semibold mb-2"
                  style={{ color: formulario.gradiente_ativo ? '#FFFFFF' : styles.text }}
                >
                  Sobre
                </h3>
                <p
                  className="text-sm opacity-90"
                  style={{ color: formulario.gradiente_ativo ? '#FFFFFF' : styles.text }}
                >
                  {formulario.descricao}
                </p>
              </div>
            )}
          </div>

          {/* Coluna Direita - Formulario */}
          <div
            className={cn(
              'rounded-2xl shadow-2xl overflow-hidden',
              formulario.animacoes_ativas && 'animate-in fade-in slide-in-from-right duration-500'
            )}
            style={{ backgroundColor: styles.cardBg }}
          >
            {/* Header do formulario */}
            <div
              className="p-6 text-center"
              style={{
                background: `linear-gradient(to right, ${styles.gradientStart}, ${styles.gradientEnd})`,
              }}
            >
              {formulario.icone_header_url && (
                <img
                  src={formulario.icone_header_url}
                  alt=""
                  className="h-12 w-12 mx-auto mb-3 object-contain"
                />
              )}
              <p className="text-white font-medium">
                {isWizard ? 'Preencha seus dados e aproveite!' : formulario.titulo || 'Preencha o formulario'}
              </p>
            </div>

            {/* Stepper para wizard */}
            {isWizard && formulario.mostrar_progresso && (
              <div className="px-6 py-4 border-b" style={{ borderColor: styles.fieldBorder }}>
                <div className="flex items-center justify-center gap-4">
                  {formulario.wizard_config?.etapas?.map((etapa, index) => {
                    const isActive = index === currentStep;
                    const isComplete = index < currentStep;

                    return (
                      <div key={etapa.id} className="flex items-center gap-2">
                        <div
                          className={cn(
                            'w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300',
                            isComplete && 'text-white',
                            isActive && 'text-white ring-4 ring-opacity-30'
                          )}
                          style={{
                            backgroundColor: isComplete
                              ? styles.stepperComplete
                              : isActive
                                ? styles.stepperActive
                                : styles.stepperInactive,
                            ringColor: isActive ? styles.stepperActive : 'transparent',
                            color: (isComplete || isActive) ? '#FFFFFF' : styles.text,
                          }}
                        >
                          {isComplete ? <Check className="h-4 w-4" /> : index + 1}
                        </div>
                        {formulario.stepper_mostrar_titulos !== false && (
                          <span
                            className={cn(
                              'text-sm font-medium hidden sm:block',
                              isActive && 'font-semibold'
                            )}
                            style={{
                              color: isActive ? styles.stepperActive : styles.text,
                              opacity: isActive ? 1 : 0.6,
                            }}
                          >
                            {etapa.titulo}
                          </span>
                        )}
                        {index < (formulario.wizard_config?.etapas?.length || 0) - 1 && (
                          <div
                            className="w-8 h-0.5 hidden sm:block"
                            style={{
                              backgroundColor: index < currentStep ? styles.stepperComplete : styles.stepperInactive
                            }}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Campos do formulario */}
            <form onSubmit={handleSubmit(handleFormSubmit)} className="p-6">
              <div className="space-y-4">
                {currentFields.map((campo) => {
                  if (campo.tipo === 'hidden') {
                    return (
                      <Controller
                        key={campo.id}
                        name={campo.nome}
                        control={control}
                        defaultValue={campo.placeholder || ''}
                        render={({ field }) => <input type="hidden" {...field} />}
                      />
                    );
                  }

                  return (
                    <div
                      key={campo.id}
                      className={cn(
                        campo.largura === 'half' && 'md:w-1/2 md:inline-block md:pr-2',
                        campo.largura === 'third' && 'md:w-1/3 md:inline-block md:pr-2'
                      )}
                    >
                      {campo.tipo !== 'checkbox' && (
                        <Label
                          htmlFor={campo.nome}
                          className="mb-2 block text-sm font-medium"
                          style={{ color: formulario.cor_label || styles.text }}
                        >
                          {campo.label}
                          {campo.obrigatorio && <span className="text-red-500 ml-1">*</span>}
                        </Label>
                      )}
                      {renderField(campo)}
                      {/* Info do endereco apos busca de CEP */}
                      {campo.tipo === 'cep' && enderecoInfo && (
                        <p
                          className="text-xs mt-1 flex items-center gap-1"
                          style={{ color: styles.stepperComplete }}
                        >
                          <MapPin className="h-3 w-3" />
                          Endereco: {enderecoInfo}
                        </p>
                      )}
                      {errors[campo.nome]?.message && (
                        <p className="text-sm text-red-500 mt-1">
                          {String(errors[campo.nome]?.message)}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Botoes de navegacao */}
              <div className="flex justify-between mt-8 pt-4 border-t" style={{ borderColor: styles.fieldBorder }}>
                {isWizard && currentStep > 0 && formulario.permitir_voltar ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handlePrevious}
                    disabled={submitting}
                    className="gap-2"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Voltar
                  </Button>
                ) : (
                  <div />
                )}

                {isWizard && currentStep < totalSteps - 1 ? (
                  <Button
                    type="button"
                    onClick={handleNext}
                    disabled={submitting}
                    className="gap-2 text-white"
                    style={{ backgroundColor: styles.buttonBg }}
                  >
                    {formulario.texto_botao || 'Proximo'}
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    disabled={submitting}
                    className={cn(
                      'gap-2 text-white',
                      formulario.botao_largura_total && 'w-full'
                    )}
                    style={{ backgroundColor: styles.buttonBg }}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        {formulario.texto_botao || 'Enviar cadastro'}
                      </>
                    )}
                  </Button>
                )}
              </div>
            </form>

            {/* Footer */}
            {formulario.mostrar_footer && (
              <div
                className="px-6 py-4 text-center text-sm"
                style={{
                  backgroundColor: formulario.cor_footer_fundo || styles.fieldBg,
                  color: formulario.cor_footer_texto || styles.text,
                }}
              >
                {formulario.texto_footer || formulario.franqueado?.nome_fantasia}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
