import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import {
  PhoneInputInternational,
  validatePhoneByCountry,
  cleanPhoneNumber,
} from '@/components/ui/phone-input-international';
import type {
  FormularioWithRelations,
  FormularioCampo,
  FormularioSubmissaoInsert,
  FormularioAnalyticsInsert,
  WizardEtapa,
  CampoIndicadoConfig,
} from '@/types/formulario';
import { CampoIndicados } from '@/components/formularios/CampoIndicados';
import FormularioLandingPageTemplate from '@/components/formularios/FormularioLandingPageTemplate';
import { Servico } from '@/types/servico';
import {
  initPixels,
  trackFormViewEvent,
  trackFormStartEvent,
  trackFormCompleteEvent,
  trackLeadEvent,
} from '@/utils/pixelTracking';
import { sendWebhook } from '@/utils/webhookSender';
import { getNextResponsible, type RoundRobinConfig } from '@/services/roundRobinService';
import { formSubmissionRateLimiter } from '@/utils/rateLimiter';
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Loader2, ChevronLeft, ChevronRight, Send, CheckCircle2, AlertCircle, MapPin } from 'lucide-react';
import {
  fetchAddressWithCoordinates,
  formatEnderecoDisplay,
  type EnderecoCompleto,
  CAMPO_LEAD_ALTERNATIVES,
} from '@/utils/cepAutoFill';
import { cn } from '@/lib/utils';

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

// Gerar schema Zod dinamico baseado nos campos
const generateValidationSchema = (campos: FormularioCampo[]) => {
  const schemaFields: Record<string, z.ZodTypeAny> = {};

  campos.forEach((campo) => {
    if (!campo.ativo) return;

    let fieldSchema: z.ZodTypeAny = z.string();

    switch (campo.tipo) {
      case 'email':
        fieldSchema = z.string().email('E-mail invalido');
        break;
      case 'tel':
        fieldSchema = z.string().min(14, 'Telefone invalido');
        break;
      case 'tel_intl':
        // Telefone internacional - validação mais flexível
        fieldSchema = z.string().min(8, 'Telefone invalido');
        break;
      case 'cpf':
        fieldSchema = z.string().min(14, 'CPF invalido');
        break;
      case 'cep':
        fieldSchema = z.string().min(9, 'CEP invalido');
        break;
      case 'number':
        fieldSchema = z.string().refine((val) => !isNaN(Number(val)), 'Numero invalido');
        break;
      case 'checkbox':
        fieldSchema = z.boolean();
        break;
      case 'date':
        fieldSchema = z.string().min(1, 'Data obrigatoria');
        break;
      case 'indicados':
        // Campo especial para indicar amigos - array de objetos
        fieldSchema = z.array(z.record(z.string())).min(
          campo.indicados_config?.min_indicados || 1,
          `Indique pelo menos ${campo.indicados_config?.min_indicados || 1} amigo(s)`
        );
        break;
      default:
        fieldSchema = z.string();
    }

    if (campo.obrigatorio) {
      if (campo.tipo === 'checkbox') {
        fieldSchema = z.boolean().refine((val) => val === true, 'Campo obrigatorio');
      } else if (campo.tipo === 'indicados') {
        // Validacao ja feita acima no min()
      } else {
        fieldSchema = fieldSchema.refine((val) => val && val.toString().trim() !== '', 'Campo obrigatorio');
      }
    } else {
      fieldSchema = fieldSchema.optional();
    }

    schemaFields[campo.nome] = fieldSchema;
  });

  return z.object(schemaFields);
};

// Componente de campo dinamico
interface DynamicFieldProps {
  campo: FormularioCampo;
  control: ReturnType<typeof useForm>['control'];
  errors: Record<string, { message?: string }>;
  onCepChange?: (address: EnderecoCompleto) => void;
  disabled?: boolean;
  setValue?: ReturnType<typeof useForm>['setValue'];
}

const DynamicField = ({ campo, control, errors, onCepChange, disabled, setValue }: DynamicFieldProps) => {
  const [cepLoading, setCepLoading] = useState(false);

  const handleCepBlur = async (value: string) => {
    if (campo.tipo !== 'cep' || !onCepChange) return;

    setCepLoading(true);
    // Usa o utilitário que busca endereço + coordenadas
    const address = await fetchAddressWithCoordinates(value);
    setCepLoading(false);

    if (address) {
      onCepChange(address);
    }
  };

  const getMask = () => {
    if (campo.mascara) return campo.mascara;
    if (campo.tipo in MASKS) return MASKS[campo.tipo];
    return '';
  };

  const fieldClass = cn(
    'w-full',
    campo.largura === 'half' && 'md:w-1/2',
    campo.largura === 'third' && 'md:w-1/3'
  );

  const renderField = () => {
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
                disabled={disabled}
                className={cn(errors[campo.nome] && 'border-destructive')}
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
                disabled={disabled}
              >
                <SelectTrigger className={cn(errors[campo.nome] && 'border-destructive')}>
                  <SelectValue placeholder={campo.placeholder || 'Selecione...'} />
                </SelectTrigger>
                <SelectContent>
                  {campo.opcoes?.map((opcao) => {
                    const val = typeof opcao === 'object' && opcao !== null ? (opcao as any).value : opcao;
                    const label = typeof opcao === 'object' && opcao !== null ? (opcao as any).label : opcao;
                    return (
                      <SelectItem key={val} value={val}>
                        {label}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
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
                disabled={disabled}
                className="flex flex-col space-y-2"
              >
                {campo.opcoes?.map((opcao) => {
                  const val = typeof opcao === 'object' && opcao !== null ? (opcao as any).value : opcao;
                  const label = typeof opcao === 'object' && opcao !== null ? (opcao as any).label : opcao;
                  return (
                    <div key={val} className="flex items-center space-x-2">
                      <RadioGroupItem value={val} id={`${campo.nome}-${val}`} />
                      <Label htmlFor={`${campo.nome}-${val}`}>{label}</Label>
                    </div>
                  );
                })}
              </RadioGroup>
            )}
          />
        );

      case 'checkbox':
        return (
          <Controller
            name={campo.nome}
            control={control}
            defaultValue={false}
            render={({ field }) => (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id={campo.nome}
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={disabled}
                />
                <Label htmlFor={campo.nome}>{campo.label}</Label>
              </div>
            )}
          />
        );

      case 'hidden':
        return (
          <Controller
            name={campo.nome}
            control={control}
            defaultValue=""
            render={({ field }) => <input type="hidden" {...field} />}
          />
        );

      case 'indicados':
        return (
          <Controller
            name={campo.nome}
            control={control}
            defaultValue={[]}
            render={({ field }) => (
              <CampoIndicados
                config={campo.indicados_config || {
                  min_indicados: 1,
                  max_indicados: 5,
                  campos_por_indicado: [
                    { nome: 'nome_amigo', label: 'Nome do Amigo', tipo: 'text', obrigatorio: true },
                    { nome: 'whatsapp_amigo', label: 'WhatsApp', tipo: 'tel', obrigatorio: true, mascara: '(99) 99999-9999' },
                  ],
                }}
                value={field.value || []}
                onChange={field.onChange}
                error={errors[campo.nome]?.message}
                disabled={disabled}
              />
            )}
          />
        );

      case 'tel_intl':
        // Telefone internacional com seletor de país
        return (
          <Controller
            name={campo.nome}
            control={control}
            defaultValue=""
            render={({ field }) => {
              // O campo armazena tanto o número quanto o código do país
              // Formato interno: { phone: string, countryCode: string }
              // Mas para compatibilidade, salvamos apenas o número formatado
              const [countryCode, setCountryCode] = useState('55');

              return (
                <PhoneInputInternational
                  value={field.value}
                  countryCode={countryCode}
                  onChange={(value) => {
                    field.onChange(value);
                  }}
                  onCountryChange={(code) => {
                    setCountryCode(code);
                    // Se houver campo_lead para código do país, preencher
                    if (campo.campo_lead === 'whatsapp' || campo.campo_lead === 'telefone') {
                      const countryFieldName = `${campo.nome}_codigo_pais`;
                      if (setValue) {
                        setValue(countryFieldName, code);
                      }
                    }
                  }}
                  onBlur={field.onBlur}
                  placeholder={campo.placeholder}
                  disabled={disabled}
                  error={!!errors[campo.nome]}
                  showCountryName
                />
              );
            }}
          />
        );

      default:
        return (
          <Controller
            name={campo.nome}
            control={control}
            defaultValue=""
            render={({ field }) => {
              const mask = getMask();
              return (
                <div className="relative">
                  <Input
                    {...field}
                    type={campo.tipo === 'email' ? 'email' : campo.tipo === 'date' ? 'date' : 'text'}
                    placeholder={campo.placeholder}
                    disabled={disabled || cepLoading}
                    className={cn(errors[campo.nome] && 'border-destructive')}
                    onChange={(e) => {
                      let value = e.target.value;
                      if (mask) {
                        value = applyMask(value, mask);
                      }
                      field.onChange(value);
                    }}
                    onBlur={(e) => {
                      field.onBlur();
                      if (campo.tipo === 'cep') {
                        handleCepBlur(e.target.value);
                      }
                    }}
                  />
                  {cepLoading && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                </div>
              );
            }}
          />
        );
    }
  };

  if (campo.tipo === 'checkbox' || campo.tipo === 'hidden') {
    return <div className={fieldClass}>{renderField()}</div>;
  }

  // Campo de indicados ocupa largura total e tem label proprio
  if (campo.tipo === 'indicados') {
    return <div className="w-full">{renderField()}</div>;
  }

  return (
    <div className={fieldClass}>
      <Label htmlFor={campo.nome} className="mb-2 block text-sm font-medium">
        {campo.label}
        {campo.obrigatorio && <span className="text-destructive ml-1">*</span>}
      </Label>
      {renderField()}
      {errors[campo.nome] && (
        <p className="text-sm text-destructive mt-1">{errors[campo.nome].message}</p>
      )}
    </div>
  );
};

// Componente principal
export default function FormularioPublico() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();

  const [formulario, setFormulario] = useState<FormularioWithRelations | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [createdLeadId, setCreatedLeadId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const [startTime] = useState(Date.now());
  const [hasStartedFilling, setHasStartedFilling] = useState(false);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const pixelsInitialized = useRef(false);

  // Estado para armazenar informações do indicador (incluindo franqueado para herdar unidade)
  const [indicadorInfo, setIndicadorInfo] = useState<{
    tipo: 'influenciadora' | 'lead' | 'parceiro' | null;
    nome: string;
    nome_real?: string;  // Nome real (para mensagens WhatsApp)
    codigo: string;
    franchise_id?: string | null;
    indicador_id?: string | null;
  } | null>(null);

  // Codigo de indicacao da URL (leads normais)
  const codigoIndicacao = searchParams.get('ref') || searchParams.get('codigo');

  // Codigo de influenciadora da URL
  const codigoInfluenciadora = searchParams.get('influenciadores');

  // Codigo de parceria empresarial da URL
  const codigoParceria = searchParams.get('parceria');

  // Codigo de promoção da URL
  const codigoPromocao = searchParams.get('promo');

  // Detectar se está em iframe (embed)
  const isEmbedded = window.self !== window.top;

  // Parametros UTM e tracking completo da URL
  const utmParams = useMemo(() => ({
    utm_source: searchParams.get('utm_source') || searchParams.get('source') || searchParams.get('detected_source') || undefined,
    utm_medium: searchParams.get('utm_medium') || searchParams.get('medium') || undefined,
    utm_campaign: searchParams.get('utm_campaign') || searchParams.get('campaign') || undefined,
    utm_content: searchParams.get('utm_content') || undefined,
    utm_term: searchParams.get('utm_term') || undefined,
  }), [searchParams]);

  // Parâmetros extras de tracking (ads, embed, etc)
  const trackingParams = useMemo(() => ({
    gclid: searchParams.get('gclid') || undefined,           // Google Ads
    fbclid: searchParams.get('fbclid') || undefined,         // Facebook
    ttclid: searchParams.get('ttclid') || undefined,         // TikTok
    msclkid: searchParams.get('msclkid') || undefined,       // Microsoft Ads
    li_fat_id: searchParams.get('li_fat_id') || undefined,   // LinkedIn
    embed_url: searchParams.get('embed_url') || undefined,   // URL da página que embarcou
    embed_title: searchParams.get('embed_title') || undefined, // Título da página
    referrer_url: searchParams.get('referrer') || document.referrer || undefined,
  }), [searchParams]);

  // Carregar formulario
  useEffect(() => {
    const loadFormulario = async () => {
      if (!slug) return;

      setLoading(true);
      setError(null);

      try {
        const { data, error: fetchError } = await supabase
          .from('mt_forms')
          .select(`
            *,
            franchise:mt_franchises(id, nome_fantasia),
            fields:mt_form_fields(*)
          `)
          .eq('slug', slug)
          .eq('is_active', true)
          .maybeSingle();

        if (fetchError) throw fetchError;
        if (!data) throw new Error('Formulario nao encontrado');

        // Mapear fields → campos e ordenar
        // IMPORTANTE: DB usa 'mapear_para_lead' mas o tipo FormularioCampo usa 'campo_lead'
        if (data.fields) {
          data.campos = data.fields
            .map((f: any) => ({
              ...f,
              campo_lead: f.mapear_para_lead || f.campo_lead || null,
            }))
            .sort((a: FormularioCampo, b: FormularioCampo) => a.ordem - b.ordem);
        }

        setFormulario(data as FormularioWithRelations);

        // Carregar servicos se o formulario tiver campo de servico ou for landing page
        const hasServicoField = data.campos?.some((c: FormularioCampo) => c.tipo === 'servico');
        if (hasServicoField || data.layout_template === 'landing_page') {
          const { data: servicosData } = await supabase
            .from('mt_services')
            .select('*')
            .eq('is_active', true)
            .order('nome');
          if (servicosData) {
            setServicos(servicosData);
          }
        }

        // Inicializar pixels de tracking
        if (!pixelsInitialized.current) {
          initPixels({
            pixel_facebook: data.pixel_facebook,
            pixel_ga4: data.pixel_ga4,
            pixel_tiktok: data.pixel_tiktok,
          });
          pixelsInitialized.current = true;

          // Disparar evento de visualização nos pixels
          trackFormViewEvent({
            pixel_facebook: data.pixel_facebook,
            pixel_ga4: data.pixel_ga4,
            pixel_tiktok: data.pixel_tiktok,
          });
        }

        // Registrar visualizacao (incrementar contador)
        try {
          await supabase
            .from('mt_forms')
            .update({ total_visualizacoes: (data.total_visualizacoes || 0) + 1 })
            .eq('id', data.id);
        } catch {
          // Ignora erro de analytics - não deve bloquear o formulário
        }
      } catch (err) {
        console.error('Erro ao carregar formulario:', err);
        setError('Nao foi possivel carregar o formulario.');
      } finally {
        setLoading(false);
      }
    };

    loadFormulario();
  }, [slug, sessionId, utmParams]);

  // Buscar informações do indicador (influenciadora, lead ou parceiro)
  useEffect(() => {
    const loadIndicadorInfo = async () => {
      // Prioridade: influenciadores > parceria > ref/codigo
      const codigo = codigoInfluenciadora || codigoParceria || codigoIndicacao;
      if (!codigo) return;

      try {
        // 1. Se parâmetro é 'influenciadores', buscar APENAS em influenciadoras
        if (codigoInfluenciadora) {
          const { data: influenciadora } = await supabase
            .from('mt_influencers')
            .select('nome, nome_artistico, franchise_id')
            .eq('codigo', codigoInfluenciadora.toUpperCase())
            .maybeSingle();

          if (influenciadora) {
            setIndicadorInfo({
              tipo: 'influenciadora',
              nome: influenciadora.nome_artistico || influenciadora.nome,
              nome_real: influenciadora.nome || influenciadora.nome_artistico,
              codigo: codigoInfluenciadora.toUpperCase(),
              franchise_id: influenciadora.franchise_id || undefined,
            });
            return;
          }
        }

        // 2. Se parâmetro é 'parceria', buscar em parcerias empresariais
        if (codigoParceria) {
          const { data: parceria } = await supabase
            .from('mt_partnerships')
            .select('nome_fantasia, nome_empresa')
            .eq('codigo', codigoParceria.toUpperCase())
            .maybeSingle();

          if (parceria) {
            setIndicadorInfo({
              tipo: 'parceiro',
              nome: parceria.nome_fantasia || parceria.nome_empresa,
              codigo: codigoParceria.toUpperCase(),
            });
            return;
          }

          // Se não encontrou parceria, mostra o código
          setIndicadorInfo({
            tipo: 'parceiro',
            nome: codigoParceria.toUpperCase(),
            codigo: codigoParceria.toUpperCase(),
          });
          return;
        }

        // 3. Se parâmetro é 'ref' ou 'codigo', buscar primeiro em influenciadoras, depois em leads
        if (codigoIndicacao) {
          // Buscar em influenciadoras primeiro
          const { data: influenciadora } = await supabase
            .from('mt_influencers')
            .select('nome, nome_artistico')
            .eq('codigo', codigoIndicacao.toUpperCase())
            .maybeSingle();

          if (influenciadora) {
            setIndicadorInfo({
              tipo: 'influenciadora',
              nome: influenciadora.nome_artistico || influenciadora.nome,
              codigo: codigoIndicacao.toUpperCase(),
            });
            return;
          }

          // Se não encontrou em influenciadoras, buscar em leads (incluindo franqueado_id para herdar unidade)
          const { data: lead } = await supabase
            .from('mt_leads')
            .select('id, nome, franchise_id')
            .eq('codigo_indicacao', codigoIndicacao.toUpperCase())
            .maybeSingle();

          if (lead) {
            setIndicadorInfo({
              tipo: 'lead',
              nome: lead.nome,
              codigo: codigoIndicacao.toUpperCase(),
              franchise_id: lead.franchise_id,
              indicador_id: lead.id,
            });
            return;
          }

          // Se não encontrou em nenhum lugar, mostra só o código
          setIndicadorInfo({
            tipo: null,
            nome: codigoIndicacao.toUpperCase(),
            codigo: codigoIndicacao.toUpperCase(),
          });
        }
      } catch (err) {
        console.error('Erro ao buscar indicador:', err);
      }
    };

    loadIndicadorInfo();
  }, [codigoIndicacao, codigoInfluenciadora, codigoParceria]);

  // PostMessage para comunicar com iframe pai (altura e eventos)
  useEffect(() => {
    if (!isEmbedded) return;

    // Enviar altura inicial e a cada mudança
    const sendHeight = () => {
      const height = document.body.scrollHeight;
      window.parent.postMessage({ type: 'yeslaser-form-height', height }, '*');
    };

    // Enviar altura inicial
    sendHeight();

    // Observer para detectar mudanças no DOM
    const observer = new MutationObserver(sendHeight);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true });

    // Também enviar em resize
    window.addEventListener('resize', sendHeight);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', sendHeight);
    };
  }, [isEmbedded, loading, submitted, currentStep]);

  // Schema de validacao
  const validationSchema = useMemo(() => {
    if (!formulario?.campos) return z.object({});
    return generateValidationSchema(formulario.campos);
  }, [formulario?.campos]);

  // Resolver dinâmico: wrapper que sempre usa o schema mais recente
  const dynamicResolver = useCallback(
    async (values: any, context: any, options: any) => {
      const resolver = zodResolver(validationSchema);
      return resolver(values, context, options);
    },
    [validationSchema]
  );

  // Setup do formulario
  const {
    control,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors },
    trigger,
  } = useForm({
    resolver: dynamicResolver,
    mode: 'onBlur',
  });

  // Campos por etapa (para wizard)
  const camposByStep = useMemo(() => {
    if (!formulario?.campos) return {};

    const grouped: Record<number, FormularioCampo[]> = {};
    formulario.campos.forEach((campo) => {
      const step = campo.etapa || 1;
      if (!grouped[step]) grouped[step] = [];
      grouped[step].push(campo);
    });

    return grouped;
  }, [formulario?.campos]);

  // Etapas do wizard
  const steps = useMemo(() => {
    if (formulario?.modo !== 'wizard' || !formulario.wizard_config?.etapas) {
      return [{ id: '1', titulo: 'Dados', ordem: 1 }];
    }
    return formulario.wizard_config.etapas.sort((a, b) => a.ordem - b.ordem);
  }, [formulario]);

  const totalSteps = steps.length;
  const isLastStep = currentStep === totalSteps;
  const progressPercent = (currentStep / totalSteps) * 100;

  // Estado para exibir endereço encontrado
  const [enderecoInfo, setEnderecoInfo] = useState<string | null>(null);
  // Ref para armazenar coordenadas (useRef para evitar problema de timing com setState assíncrono)
  const coordenadasRef = useRef<{ latitude?: number; longitude?: number }>({});
  // Ref para armazenar dados de endereço completos (para garantir que sejam salvos no lead)
  const enderecoRef = useRef<{
    rua?: string;
    bairro?: string;
    cidade?: string;
    estado?: string;
  }>({});
  // Estado apenas para exibição (opcional)
  const [coordenadasDisplay, setCoordenadasDisplay] = useState<{ latitude?: number; longitude?: number }>({});

  // Handler para mudanca de CEP - busca campos de endereco por nome ou campo_lead
  // Agora usa EnderecoCompleto com latitude/longitude
  const handleCepChange = useCallback((address: EnderecoCompleto) => {
    if (!formulario?.campos) return;

    // Exibir endereço encontrado
    setEnderecoInfo(formatEnderecoDisplay(address));

    // Salvar coordenadas para usar no submit (useRef para garantir valor correto no submit)
    if (address.latitude && address.longitude) {
      coordenadasRef.current = { latitude: address.latitude, longitude: address.longitude };
      setCoordenadasDisplay({ latitude: address.latitude, longitude: address.longitude });
    }

    // Salvar dados de endereço na ref para garantir que sejam salvos no lead
    enderecoRef.current = {
      rua: address.rua || undefined,
      bairro: address.bairro || undefined,
      cidade: address.cidade || undefined,
      estado: address.estado || undefined,
    };

    // Mapear dados do CEP para possiveis nomes de campos (incluindo latitude/longitude)
    const fieldMappings = [
      { data: address.rua, patterns: ['rua', 'logradouro', 'endereco', 'address', 'street'], leads: ['rua', 'logradouro', 'endereco'] },
      { data: address.bairro, patterns: ['bairro', 'neighborhood', 'district'], leads: ['bairro'] },
      { data: address.cidade, patterns: ['cidade', 'city', 'municipio', 'cidade_cep', 'localidade'], leads: ['cidade'] },
      { data: address.estado, patterns: ['estado', 'state', 'uf', 'estado_cep'], leads: ['estado', 'uf'] },
      { data: address.latitude?.toString(), patterns: ['latitude', 'lat'], leads: ['latitude', 'lat'] },
      { data: address.longitude?.toString(), patterns: ['longitude', 'lng', 'lon'], leads: ['longitude', 'lng', 'lon'] },
    ];

    fieldMappings.forEach(({ data, patterns, leads }) => {
      if (!data) return;

      // Tentar encontrar campo pelo nome (case-insensitive)
      let campo = formulario.campos?.find(c =>
        patterns.some(p => c.nome.toLowerCase().includes(p))
      );

      // Se nao encontrou, tentar pelo campo_lead
      if (!campo) {
        campo = formulario.campos?.find(c =>
          c.campo_lead && leads.some(l => c.campo_lead?.toLowerCase().includes(l))
        );
      }

      if (campo) {
        setValue(campo.nome, data);
      }
    });

    console.log('[CEP] Endereço encontrado:', address);
  }, [setValue, formulario?.campos]);

  // Avancar etapa
  const handleNextStep = async () => {
    const currentFields = camposByStep[currentStep] || [];
    const fieldNames = currentFields.map((c) => c.nome);

    const isValid = await trigger(fieldNames);

    if (isValid) {
      setCurrentStep((prev) => Math.min(prev + 1, totalSteps));
    }
  };

  // Voltar etapa
  const handlePrevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  // Rastrear inicio de preenchimento
  const trackFormStart = useCallback(() => {
    if (hasStartedFilling || !formulario) return;

    setHasStartedFilling(true);

    // Disparar evento de inicio nos pixels
    trackFormStartEvent({
      pixel_facebook: formulario.pixel_facebook,
      pixel_ga4: formulario.pixel_ga4,
      pixel_tiktok: formulario.pixel_tiktok,
    });

  }, [hasStartedFilling, formulario, sessionId, utmParams]);

  // Submissao
  const onSubmit = async (data: Record<string, unknown>) => {
    if (!formulario) return;

    // Fallback: se o resolver retornou data vazio (schema desatualizado),
    // usar getValues() que pega os valores diretamente dos Controllers
    if (Object.keys(data).length === 0) {
      data = getValues();
    }

    // Verificar rate limiting
    if (!formSubmissionRateLimiter.checkLimit(`form_${formulario.id}`)) {
      setError('Muitas tentativas de envio. Aguarde um momento e tente novamente.');
      return;
    }

    setSubmitting(true);

    try {
      const tempoPreenchimento = Math.round((Date.now() - startTime) / 1000);

      // FIX: Garantir que dados de endereço via CEP estejam disponíveis
      // Se o usuário digitou CEP mas clicou Enviar antes do fetch completar,
      // buscar o endereço agora de forma síncrona
      const cepCampo = formulario.campos?.find(c => c.tipo === 'cep');
      const cepValue = cepCampo ? (data[cepCampo.nome] as string) : undefined;
      if (cepValue && cepValue.replace(/\D/g, '').length === 8 && !enderecoRef.current.cidade) {
        try {
          const address = await fetchAddressWithCoordinates(cepValue);
          if (address) {
            enderecoRef.current = {
              rua: address.rua || undefined,
              bairro: address.bairro || undefined,
              cidade: address.cidade || undefined,
              estado: address.estado || undefined,
            };
            if (address.latitude && address.longitude) {
              coordenadasRef.current = { latitude: address.latitude, longitude: address.longitude };
            }
          }
        } catch (cepErr) {
          console.warn('[CEP] Falha ao buscar endereço no submit:', cepErr);
        }
      }

      // Usar ID do indicador já buscado no indicadorInfo
      const indicadoPorId = indicadorInfo?.indicador_id || null;

      // Determinar franchise_id: prioriza o do formulário, mas herda do indicador se não tiver
      let franchiseIdFinal = formulario.franchise_id;
      if (!franchiseIdFinal && indicadorInfo?.franchise_id) {
        franchiseIdFinal = indicadorInfo.franchise_id;
      }

      // Determinar origem e UTMs baseados no tipo de indicação
      // Se não tiver UTMs na URL, preenche automaticamente baseado no tipo
      let origem = 'formulario';
      let campanhaFinal = utmParams.utm_campaign || `Formulario - ${formulario.nome}`;
      let utmSourceFinal = utmParams.utm_source;
      let utmMediumFinal = utmParams.utm_medium;
      let utmContentFinal = utmParams.utm_content;

      if (indicadorInfo) {
        switch (indicadorInfo.tipo) {
          case 'lead':
            origem = 'indicacao';
            if (!utmParams.utm_campaign) campanhaFinal = `Indicacao - ${indicadorInfo.nome}`;
            if (!utmParams.utm_source) utmSourceFinal = 'indicacao';
            if (!utmParams.utm_medium) utmMediumFinal = 'referral';
            if (!utmParams.utm_content) utmContentFinal = `lead_${indicadorInfo.codigo}`;
            break;
          case 'influenciadora':
            origem = 'influenciador';
            if (!utmParams.utm_campaign) campanhaFinal = `Influenciador - ${indicadorInfo.nome}`;
            if (!utmParams.utm_source) utmSourceFinal = 'influenciador';
            if (!utmParams.utm_medium) utmMediumFinal = 'social';
            if (!utmParams.utm_content) utmContentFinal = `influenciador_${indicadorInfo.codigo}`;
            break;
          case 'parceiro':
            origem = 'parceria';
            if (!utmParams.utm_campaign) campanhaFinal = `Parceria - ${indicadorInfo.nome}`;
            if (!utmParams.utm_source) utmSourceFinal = 'parceria';
            if (!utmParams.utm_medium) utmMediumFinal = 'partner';
            if (!utmParams.utm_content) utmContentFinal = `parceria_${indicadorInfo.codigo}`;
            break;
        }
      }

      // Capturar informações técnicas do dispositivo
      const deviceInfo = {
        user_agent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        screen_width: window.screen.width,
        screen_height: window.screen.height,
        viewport_width: window.innerWidth,
        viewport_height: window.innerHeight,
        device_pixel_ratio: window.devicePixelRatio,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        online: navigator.onLine,
      };

      // Mapear dados para lead (apenas colunas que existem em mt_leads)
      const leadData: Record<string, unknown> = {
        tenant_id: formulario.tenant_id,
        franchise_id: franchiseIdFinal,
        status: 'Lead Recebido',
        landing_page: formulario.slug,
        campanha: campanhaFinal,
        canal_entrada: 'site',
        origem: origem,
        indicado_por_id: indicadoPorId,
        // UTM params
        utm_source: utmSourceFinal || undefined,
        utm_medium: utmMediumFinal || undefined,
        utm_campaign: campanhaFinal || undefined,
        utm_content: utmContentFinal || undefined,
        utm_term: utmParams.utm_term || undefined,
        // Ads tracking
        gclid: trackingParams.gclid || undefined,
        fbclid: trackingParams.fbclid || undefined,
        referrer_url: trackingParams.referrer_url || undefined,
        // Coordenadas obtidas via CEP
        ...(coordenadasRef.current.latitude && { latitude: coordenadasRef.current.latitude }),
        ...(coordenadasRef.current.longitude && { longitude: coordenadasRef.current.longitude }),
        // Dados de endereço obtidos via CEP
        ...(enderecoRef.current.rua && { endereco: enderecoRef.current.rua }),
        ...(enderecoRef.current.bairro && { bairro: enderecoRef.current.bairro }),
        ...(enderecoRef.current.cidade && { cidade: enderecoRef.current.cidade }),
        ...(enderecoRef.current.estado && { estado: enderecoRef.current.estado }),
        // Dados extras (tracking e dispositivo em jsonb)
        dados_extras: {
          device_info: deviceInfo,
          tracking: {
            ttclid: trackingParams.ttclid,
            msclkid: trackingParams.msclkid,
            li_fat_id: trackingParams.li_fat_id,
            embed_url: trackingParams.embed_url,
          },
        },
      };

      // Mapear campos para lead
      formulario.campos?.forEach((campo) => {
        if (campo.campo_lead && data[campo.nome] !== undefined) {
          let valor = data[campo.nome];
          // Ignorar valores vazios para evitar erros de tipo (ex: date vazio → "")
          if (valor === '' || valor === null || valor === undefined) return;
          switch (campo.campo_lead) {
            case 'whatsapp':
            case 'telefone':
              leadData.whatsapp = valor;
              leadData.telefone = valor;
              break;
            case 'servico_interesse_id':
              leadData.servico_interesse = valor;
              break;
            default:
              leadData[campo.campo_lead] = valor;
          }
        }
      });

      // Log para debug
      console.log('Lead data construído:', leadData);
      console.log('Dados do formulário:', data);

      // Criar ou atualizar lead
      let leadId: string | undefined;
      if (leadData.email || leadData.whatsapp || leadData.telefone) {
        // Construir query de verificação de duplicatas de forma segura
        const orConditions: string[] = [];
        if (leadData.email) orConditions.push(`email.eq.${leadData.email}`);
        if (leadData.whatsapp) orConditions.push(`whatsapp.eq.${leadData.whatsapp}`);
        // Buscar também por telefone (pode ter formato diferente)
        if (leadData.telefone) {
          const cleanedPhone = String(leadData.telefone).replace(/\D/g, '');
          orConditions.push(`telefone.eq.${leadData.telefone}`);
          if (cleanedPhone !== String(leadData.telefone)) {
            orConditions.push(`telefone.eq.${cleanedPhone}`);
          }
        }

        const { data: existingLead, error: selectError } = await supabase
          .from('mt_leads')
          .select('id')
          .or(orConditions.join(','))
          .maybeSingle();

        if (selectError) {
          console.error('Erro ao buscar lead existente:', selectError);
        }

        if (existingLead) {
          // Lead já existe: atualizar APENAS dados pessoais (não sobrescrever origem/campanha/tracking)
          // Os dados de origem/campanha/tracking ficam no histórico de atividades
          const personalFields = [
            'nome', 'sobrenome', 'nome_social', 'email', 'telefone', 'whatsapp',
            'cpf', 'data_nascimento', 'genero', 'profissao', 'empresa', 'cargo',
            'cep', 'endereco', 'numero', 'complemento', 'bairro', 'cidade', 'estado',
            'latitude', 'longitude', 'servico_interesse',
          ];
          const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
          for (const field of personalFields) {
            if (leadData[field] !== undefined && leadData[field] !== null && leadData[field] !== '') {
              updateData[field] = leadData[field];
            }
          }
          // Sempre atualizar franchise_id se veio do formulário (pode ter mudado de unidade)
          if (leadData.franchise_id) updateData.franchise_id = leadData.franchise_id;

          const { error: updateError } = await supabase
            .from('mt_leads')
            .update(updateData)
            .eq('id', existingLead.id);
          if (updateError) {
            console.error('Erro ao atualizar lead:', updateError);
          }
          leadId = existingLead.id;
        } else {
          // Round Robin: determinar responsável automaticamente
          if (formulario && (formulario as any).round_robin_enabled) {
            try {
              const rrConfig: RoundRobinConfig = {
                session_id: formulario.id, // Usa form ID como session_id para o state
                tenant_id: (formulario as any).tenant_id,
                round_robin_enabled: true,
                round_robin_mode: (formulario as any).round_robin_mode || 'team',
                team_id: (formulario as any).team_id || null,
                department_id: (formulario as any).department_id || null,
                responsible_user_id: (formulario as any).responsible_user_id || null,
              };
              const rrResult = await getNextResponsible(rrConfig);
              if (rrResult.user_id) {
                leadData.responsible_user_id = rrResult.user_id;
                leadData.atribuido_para = rrResult.user_id;
                leadData.atribuido_em = new Date().toISOString();
                console.log(`[RoundRobin Form] Atribuído a ${rrResult.user_name || rrResult.user_id} via ${rrResult.method}`);
              }
            } catch (rrErr) {
              console.error('[RoundRobin Form] Erro:', rrErr);
              // Fallback: usar responsável fixo se definido
              if ((formulario as any).responsible_user_id) {
                leadData.responsible_user_id = (formulario as any).responsible_user_id;
                leadData.atribuido_para = (formulario as any).responsible_user_id;
                leadData.atribuido_em = new Date().toISOString();
              }
            }
          } else if (formulario && (formulario as any).responsible_user_id) {
            // Sem round robin, usar responsável fixo do formulário
            leadData.responsible_user_id = (formulario as any).responsible_user_id;
            leadData.atribuido_para = (formulario as any).responsible_user_id;
            leadData.atribuido_em = new Date().toISOString();
          }

          const { data: newLead, error: insertError } = await supabase
            .from('mt_leads')
            .insert(leadData)
            .select()
            .single();
          if (insertError) {
            console.error('Erro ao criar lead:', insertError);
            console.error('Dados enviados:', leadData);
            // Fallback: se duplicate key, tentar buscar e atualizar
            if (insertError.code === '23505') {
              const cleanedPhone = leadData.telefone ? String(leadData.telefone).replace(/\D/g, '') : '';
              const fallbackOr: string[] = [];
              if (leadData.email) fallbackOr.push(`email.eq.${leadData.email}`);
              if (cleanedPhone) fallbackOr.push(`telefone.eq.${cleanedPhone}`);
              if (leadData.whatsapp) fallbackOr.push(`whatsapp.eq.${leadData.whatsapp}`);
              if (fallbackOr.length > 0) {
                const { data: fallbackLead } = await supabase
                  .from('mt_leads')
                  .select('id')
                  .or(fallbackOr.join(','))
                  .maybeSingle();
                if (fallbackLead) {
                  await supabase.from('mt_leads').update(leadData).eq('id', fallbackLead.id);
                  leadId = fallbackLead.id;
                  console.log('Lead atualizado via fallback:', fallbackLead.id);
                }
              }
            }
          }
          leadId = leadId || newLead?.id;
        }

        // Registrar atividade no lead (SEMPRE - novo ou atualizado)
        if (leadId) {
          try {
            const isNew = !existingLead;
            const activityBase = {
              lead_id: leadId,
              tenant_id: formulario.tenant_id,
              franchise_id: franchiseIdFinal || null,
            };

            // Atividade principal: Lead criado ou atualizado via formulário
            // SEMPRE registra com detalhes completos (origem, campanha, canal, UTMs, etc.)
            // Isso garante histórico completo mesmo quando lead se cadastra em múltiplos canais
            await supabase.from('mt_lead_activities').insert({
              ...activityBase,
              tipo: isNew ? 'cadastro' : 'formulario',
              titulo: isNew
                ? 'Lead cadastrado via formulário'
                : `Nova submissão: ${formulario.nome}`,
              descricao: isNew
                ? `Cadastro realizado pelo formulário "${formulario.nome}" (${formulario.slug})${indicadorInfo ? ` - Indicado por: ${indicadorInfo.nome} (${indicadorInfo.codigo})` : ''}`
                : `Lead se cadastrou novamente pelo formulário "${formulario.nome}" (${formulario.slug}). Canal: ${origem || 'site'}. Campanha: ${campanhaFinal || 'N/A'}${indicadorInfo ? `. Indicado por: ${indicadorInfo.nome} (${indicadorInfo.codigo})` : ''}`,
              dados: {
                formulario_id: formulario.id,
                formulario_nome: formulario.nome,
                formulario_slug: formulario.slug,
                origem,
                campanha: campanhaFinal,
                canal_entrada: leadData.canal_entrada || 'site',
                landing_page: formulario.slug,
                // UTM completos para cada submissão
                utm_source: utmSourceFinal || null,
                utm_medium: utmMediumFinal || null,
                utm_campaign: campanhaFinal || null,
                utm_content: utmContentFinal || null,
                utm_term: utmParams.utm_term || null,
                // Ads tracking
                gclid: trackingParams.gclid || null,
                fbclid: trackingParams.fbclid || null,
                referrer_url: trackingParams.referrer_url || null,
                // Indicação
                codigo_indicacao: indicadorInfo?.codigo || null,
                tipo_indicacao: indicadorInfo?.tipo || null,
                indicador_nome: indicadorInfo?.nome || null,
                // Dados submetidos (resumo)
                dados_submetidos: Object.keys(data).reduce((acc, key) => {
                  const val = data[key];
                  if (val !== undefined && val !== null && val !== '') acc[key] = val;
                  return acc;
                }, {} as Record<string, unknown>),
                // Meta
                tempo_preenchimento_segundos: tempoPreenchimento,
                is_resubmissao: !isNew,
              },
            });

            // Atividade de indicação (se aplicável)
            if (indicadorInfo) {
              await supabase.from('mt_lead_activities').insert({
                ...activityBase,
                tipo: 'indicacao',
                titulo: indicadorInfo.tipo === 'influenciadora'
                  ? `Indicado por influenciadora: ${indicadorInfo.nome}`
                  : indicadorInfo.tipo === 'parceiro'
                    ? `Indicado por parceiro: ${indicadorInfo.nome}`
                    : `Indicado por lead: ${indicadorInfo.nome}`,
                descricao: `Código utilizado: ${indicadorInfo.codigo}`,
                dados: {
                  tipo_indicacao: indicadorInfo.tipo,
                  indicador_nome: indicadorInfo.nome,
                  indicador_codigo: indicadorInfo.codigo,
                  indicador_id: indicadorInfo.indicador_id || null,
                },
              });
            }
          } catch (actErr) {
            console.error('Erro ao registrar atividade:', actErr);
            // Não bloqueia o fluxo - atividade é complementar
          }
        }

        // Se tiver codigo de promoção, vincular ao lead e registrar uso
        if (codigoPromocao && leadId) {
          try {
            const { data: promocao } = await supabase
              .from('mt_promotions')
              .select('id, tenant_id')
              .eq('codigo', codigoPromocao.toUpperCase())
              .eq('status', 'ativa')
              .maybeSingle();

            if (promocao) {
              // Vincular promoção ao lead
              await supabase
                .from('mt_leads')
                .update({ promotion_id: promocao.id })
                .eq('id', leadId);

              // Registrar uso da promoção
              await supabase.from('mt_promotion_uses').insert({
                promotion_id: promocao.id,
                tenant_id: promocao.tenant_id,
                lead_id: leadId,
                source: 'formulario',
              });

              // Incrementar contador de usos
              await supabase.rpc('increment_field', {
                table_name: 'mt_promotions',
                field_name: 'usos_count',
                row_id: promocao.id,
              }).catch(() => {
                // Fallback: update direto se RPC não existir
                supabase
                  .from('mt_promotions')
                  .update({ usos_count: (promocao as any).usos_count ? (promocao as any).usos_count + 1 : 1 })
                  .eq('id', promocao.id);
              });
            }
          } catch (promoErr) {
            console.error('Erro ao registrar promoção:', promoErr);
          }
        }

        // Se tiver codigo de influenciadora, registrar indicacao
        if (codigoInfluenciadora && leadId) {
          const { data: influenciadora } = await supabase
            .from('mt_influencers')
            .select('id, tenant_id')
            .eq('codigo', codigoInfluenciadora.toUpperCase())
            .maybeSingle();

          if (influenciadora) {
            await supabase.from('mt_influencer_referrals').insert({
              tenant_id: influenciadora.tenant_id,
              influencer_id: influenciadora.id,
              lead_id: leadId,
              codigo_usado: codigoInfluenciadora.toUpperCase(),
              status: 'pendente',
            });

            // Envio automático de WhatsApp para o lead indicado (fire-and-forget)
            try {
              const leadPhone = String(leadData.whatsapp || leadData.telefone || '').replace(/\D/g, '');
              const leadNome = String(leadData.nome || '');
              const influencerNome = indicadorInfo?.nome_real || indicadorInfo?.nome || '';

              if (leadPhone && leadNome) {
                // Verificar se auto-send está habilitado via RPC
                const { data: notifConfig } = await supabase.rpc('get_referral_notif_config', {
                  p_tenant_id: influenciadora.tenant_id,
                  p_franchise_id: franchiseIdFinal || null,
                });

                const autoSendEnabled = notifConfig?.auto_send_whatsapp_enabled !== false;
                const onIndicacaoCriada = notifConfig?.auto_send_on_indicacao_criada !== false;

                if (autoSendEnabled && onIndicacaoCriada) {
                  const firstName = leadNome.split(' ')[0];
                  const phoneWithCountry = leadPhone.startsWith('55') ? leadPhone : `55${leadPhone}`;

                  // Usar nomes já disponíveis no contexto (sem queries adicionais)
                  // franchiseNome é buscado mais abaixo, mas aqui usamos o que já temos
                  let unidadeNome = 'nossa unidade';
                  // Tentar buscar nome da franquia se tiver ID (com timeout para não travar)
                  if (franchiseIdFinal) {
                    try {
                      const franchisePromise = supabase
                        .from('mt_franchises')
                        .select('nome_fantasia, nome, cidade')
                        .eq('id', franchiseIdFinal)
                        .single();
                      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject('timeout'), 3000));
                      const { data: refFranchise } = await Promise.race([franchisePromise, timeoutPromise]) as any;
                      if (refFranchise) {
                        const fName = refFranchise.nome_fantasia || refFranchise.nome || '';
                        unidadeNome = refFranchise.cidade ? `${fName} - ${refFranchise.cidade}` : fName;
                      }
                    } catch {
                      // Timeout ou erro - usar fallback
                    }
                  }

                  const mensagem =
                    `Olá, ${firstName}! Tudo bem? 😊\n\n` +
                    (influencerNome
                      ? `*${influencerNome}* te indicou e você ganhou um presente especial! 🎁\n\n`
                      : `Você ganhou um presente especial! 🎁\n\n`) +
                    `✨ *10 sessões de depilação a laser GRATUITAS em área P*!\n\n` +
                    `Para garantir suas sessões, é só agendar uma *avaliação gratuita* aqui na *${unidadeNome}*. ` +
                    `A avaliação é rápida, sem compromisso, e nossa especialista vai analisar sua pele e tirar todas as suas dúvidas.\n\n` +
                    `📅 Quer agendar? Me conta qual o melhor dia e horário para você!\n\n` +
                    `Te esperamos! 💜`;

                  // Enviar via edge function whatsapp-send
                  supabase.functions.invoke('whatsapp-send', {
                    body: {
                      phone: phoneWithCountry,
                      message: mensagem,
                      tenant_id: influenciadora.tenant_id,
                    },
                  }).catch(err => console.warn('[Auto-Send Indicação] Erro (não crítico):', err));
                }
              }
            } catch (autoSendErr) {
              console.warn('[Auto-Send Indicação] Erro (não crítico):', autoSendErr);
            }

            // Se também tiver promoção, atualizar stats da subscription
            if (codigoPromocao) {
              try {
                const { data: promocao } = await supabase
                  .from('mt_promotions')
                  .select('id')
                  .eq('codigo', codigoPromocao.toUpperCase())
                  .eq('status', 'ativa')
                  .maybeSingle();

                if (promocao) {
                  // Incrementar total_leads na subscription
                  const { data: sub } = await supabase
                    .from('mt_promotion_subscriptions')
                    .select('id, total_leads')
                    .eq('promotion_id', promocao.id)
                    .eq('influencer_id', influenciadora.id)
                    .maybeSingle();

                  if (sub) {
                    await supabase
                      .from('mt_promotion_subscriptions')
                      .update({ total_leads: (sub.total_leads || 0) + 1 })
                      .eq('id', sub.id);

                    // Registrar uso com influencer_id e subscription_id
                    await supabase.from('mt_promotion_uses').insert({
                      promotion_id: promocao.id,
                      tenant_id: influenciadora.tenant_id,
                      lead_id: leadId,
                      influencer_id: influenciadora.id,
                      subscription_id: sub.id,
                      source: 'formulario',
                    });
                  }
                }
              } catch (subErr) {
                console.error('Erro ao atualizar subscription:', subErr);
              }
            }
          }
        }

        // Se tiver codigo de parceria, registrar indicacao e vincular ao lead
        if (codigoParceria && leadId) {
          const { data: parceria } = await supabase
            .from('mt_partnerships')
            .select('id, tenant_id, nome_fantasia, nome_empresa')
            .eq('codigo', codigoParceria.toUpperCase())
            .eq('status', 'ativo')
            .maybeSingle();

          if (parceria) {
            // Atualizar lead com parceria_id
            await supabase
              .from('mt_leads')
              .update({ parceria_id: parceria.id })
              .eq('id', leadId);

            // Registrar indicação da parceria (trigger auto-incrementa total_indicacoes em mt_partnerships)
            await supabase.from('mt_partnership_referrals').insert({
              tenant_id: formulario.tenant_id,
              franchise_id: formulario.franchise_id || null,
              partnership_id: parceria.id,
              parceria_id: parceria.id,
              lead_id: leadId,
              codigo_usado: codigoParceria.toUpperCase(),
              code_used: codigoParceria.toUpperCase(),
              referral_code: codigoParceria.toUpperCase(),
              data_indicacao: new Date().toISOString(),
              status: 'pendente',
            });

            // Envio automático de WhatsApp para o lead indicado (fire-and-forget)
            try {
              const leadPhone = String(leadData.whatsapp || leadData.telefone || '').replace(/\D/g, '');
              const leadNome = String(leadData.nome || '');
              const parceriaNome = parceria.nome_fantasia || parceria.nome_empresa || indicadorInfo?.nome || '';

              if (leadPhone && leadNome && parceriaNome) {
                const firstName = leadNome.split(' ')[0];
                const phoneWithCountry = leadPhone.startsWith('55') ? leadPhone : `55${leadPhone}`;

                let unidadeNome = 'nossa unidade';
                if (franchiseIdFinal) {
                  try {
                    const { data: refFranchise } = await supabase
                      .from('mt_franchises')
                      .select('nome_fantasia, nome, cidade')
                      .eq('id', franchiseIdFinal)
                      .single();
                    if (refFranchise) {
                      const fName = refFranchise.nome_fantasia || refFranchise.nome || '';
                      unidadeNome = refFranchise.cidade ? `${fName} - ${refFranchise.cidade}` : fName;
                    }
                  } catch { /* usa fallback */ }
                }

                const mensagem =
                  `Olá, ${firstName}! Tudo bem? 😊\n\n` +
                  `*${parceriaNome}* tem uma parceria especial com a YESlaser para você! 🎁\n\n` +
                  `✨ *10 sessões de depilação a laser GRATUITAS em área P*!\n\n` +
                  `Para garantir suas sessões, é só agendar uma *avaliação gratuita* aqui na *${unidadeNome}*. ` +
                  `A avaliação é rápida, sem compromisso, e nossa especialista vai analisar sua pele e tirar todas as suas dúvidas.\n\n` +
                  `📅 Quer agendar? Me conta qual o melhor dia e horário para você!\n\n` +
                  `Te esperamos! 💜`;

                supabase.functions.invoke('whatsapp-send', {
                  body: {
                    phone: phoneWithCountry,
                    message: mensagem,
                    tenant_id: parceria.tenant_id || formulario.tenant_id,
                  },
                }).catch(err => console.warn('[Auto-Send Parceria] Erro (não crítico):', err));
              }
            } catch (autoSendErr) {
              console.warn('[Auto-Send Parceria] Erro (não crítico):', autoSendErr);
            }
          }
        }
      }

      // Criar submissao (mt_form_submissions)
      const submissaoData = {
        form_id: formulario.id,
        tenant_id: formulario.tenant_id,
        franchise_id: formulario.franchise_id || null,
        lead_id: leadId,
        dados: {
          ...data,
          session_id: sessionId,
          tempo_preenchimento_segundos: tempoPreenchimento,
          codigo_indicacao: codigoIndicacao || undefined,
          indicado_por_id: indicadoPorId || undefined,
        },
        user_agent: navigator.userAgent,
        referrer: document.referrer,
        utm_source: utmParams.utm_source || null,
        utm_medium: utmParams.utm_medium || null,
        utm_campaign: utmParams.utm_campaign || null,
        status: 'novo',
      };

      await supabase.from('mt_form_submissions').insert(submissaoData);

      // Processar campo de indicados (criar leads para amigos indicados)
      const indicadosCampo = formulario.campos?.find(c => c.tipo === 'indicados');
      if (indicadosCampo && data[indicadosCampo.nome] && Array.isArray(data[indicadosCampo.nome]) && leadId) {
        const indicados = data[indicadosCampo.nome] as Array<Record<string, string>>;

        for (const indicado of indicados) {
          const nomeAmigo = indicado.nome_amigo || indicado.nome;
          const whatsappAmigo = indicado.whatsapp_amigo || indicado.whatsapp || indicado.telefone;
          const emailAmigo = indicado.email_amigo || indicado.email;

          if (nomeAmigo && whatsappAmigo) {
            // Criar lead para o amigo indicado
            const indicadoLeadData = {
              nome: nomeAmigo,
              whatsapp: whatsappAmigo,
              telefone: whatsappAmigo,
              email: emailAmigo || null,
              tenant_id: formulario.tenant_id,
              franchise_id: formulario.franchise_id,
              canal_entrada: 'site',
              origem: 'indicacao',
              status: 'Lead Recebido',
              landing_page: formulario.slug,
              indicado_por_id: leadId, // Quem indicou
              campanha: utmParams.utm_campaign || `Indicacao - ${formulario.nome}`,
            };

            // Verificar se o lead indicado já existe
            const { data: existingIndicado, error: checkError } = await supabase
              .from('mt_leads')
              .select('id')
              .eq('whatsapp', whatsappAmigo)
              .maybeSingle();

            if (checkError) {
              console.error('Erro ao verificar lead indicado:', checkError);
            }

            if (!existingIndicado) {
              const { error: insertIndicadoError } = await supabase
                .from('mt_leads')
                .insert(indicadoLeadData);
              if (insertIndicadoError) {
                console.error('Erro ao criar lead indicado:', insertIndicadoError);
                console.error('Dados do indicado:', indicadoLeadData);
              }
            }
          }
        }
      }

      // Disparar eventos de conversão nos pixels (FB, GA4, TikTok)
      trackFormCompleteEvent({
        pixel_facebook: formulario.pixel_facebook,
        pixel_ga4: formulario.pixel_ga4,
        pixel_tiktok: formulario.pixel_tiktok,
      });

      // Disparar evento de lead com dados
      trackLeadEvent(
        {
          pixel_facebook: formulario.pixel_facebook,
          pixel_ga4: formulario.pixel_ga4,
          pixel_tiktok: formulario.pixel_tiktok,
        },
        {
          form_name: formulario.nome,
          form_slug: formulario.slug,
          ...data,
        }
      );

      // ===== NOTIFICAÇÃO WHATSAPP PARA FRANQUIA (NOVO LEAD) =====
      if (leadId) {
        try {
          const leadNome = String(leadData.nome || data.nome_completo || data.nome || 'Não informado');
          const leadPhone = String(leadData.whatsapp || leadData.telefone || data.whatsapp || data.telefone || '').replace(/\D/g, '');
          const leadEmail = String(leadData.email || data.email || 'Não informado');
          const origemTexto = indicadorInfo
            ? `Indicação de ${indicadorInfo.nome} (${indicadorInfo.codigo})`
            : campanhaFinal || 'Formulário do site';

          // Buscar WhatsApp da franquia vinculada ao formulário ou franquia padrão
          let franchiseWhatsApp: string | null = null;
          let franchiseNome = '';
          const targetFranchiseId = franchiseIdFinal || (formulario as any).franchise_id;

          if (targetFranchiseId) {
            const { data: franchise } = await supabase
              .from('mt_franchises')
              .select('whatsapp, nome_fantasia, nome')
              .eq('id', targetFranchiseId)
              .maybeSingle();
            if (franchise) {
              franchiseWhatsApp = franchise.whatsapp;
              franchiseNome = franchise.nome_fantasia || franchise.nome || '';
            }
          }

          // Fallback: buscar a primeira franquia ativa do tenant com WhatsApp
          if (!franchiseWhatsApp) {
            const { data: defaultFranchise } = await supabase
              .from('mt_franchises')
              .select('whatsapp, nome_fantasia, nome')
              .eq('tenant_id', formulario.tenant_id)
              .eq('is_active', true)
              .not('whatsapp', 'is', null)
              .limit(1)
              .maybeSingle();
            if (defaultFranchise) {
              franchiseWhatsApp = defaultFranchise.whatsapp;
              franchiseNome = defaultFranchise.nome_fantasia || defaultFranchise.nome || '';
            }
          }

          if (franchiseWhatsApp) {
            const franchiseMsg = `🆕 *Novo lead cadastrado!*\n\n` +
              `*Nome:* ${leadNome}\n` +
              `*WhatsApp:* ${leadPhone ? `(${leadPhone.slice(2, 4)}) ${leadPhone.slice(4, 9)}-${leadPhone.slice(9)}` : 'Não informado'}\n` +
              `*Email:* ${leadEmail}\n` +
              `*Origem:* ${origemTexto}\n` +
              `*Formulário:* ${formulario.nome}\n` +
              (franchiseNome ? `*Unidade:* ${franchiseNome}\n` : '') +
              `\n_Cadastrado em ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}_`;

            supabase.functions.invoke('whatsapp-send', {
              body: {
                phone: String(franchiseWhatsApp).replace(/\D/g, ''),
                message: franchiseMsg,
                tenant_id: formulario.tenant_id,
              },
            }).catch(err => console.warn('Erro ao notificar franquia (novo lead):', err));
          }
        } catch (notifErr) {
          console.warn('Erro ao notificar franquia:', notifErr);
        }
      }

      // ===== MAGIC TOKEN + WHATSAPP COM LINK DO PORTAL =====
      if (leadId) {
        try {
          const magicToken = crypto.randomUUID().replace(/-/g, '');
          await supabase.from('mt_cliente_magic_tokens' as any).insert({
            tenant_id: formulario.tenant_id,
            lead_id: leadId,
            token: magicToken,
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          });

          // Enviar WhatsApp com link do portal para agendar
          const clientPhone = data.whatsapp || data.telefone;
          if (clientPhone) {
            const portalUrl = `${window.location.origin}/cliente/agendar?token=${magicToken}`;
            const firstName = ((data.nome as string) || 'Cliente').split(' ')[0];
            const portalMsg = `Olá, ${firstName}! 😊\n\n` +
              `Seu cadastro foi realizado com sucesso!\n\n` +
              `Acesse seu painel para agendar sua sessão gratuita:\n${portalUrl}\n\n` +
              `É só clicar e escolher o melhor horário para você! 📅`;

            supabase.functions.invoke('whatsapp-send', {
              body: {
                phone: String(clientPhone).replace(/\D/g, ''),
                message: portalMsg,
                tenant_id: formulario.tenant_id,
              },
            }).catch(err => console.warn('Erro ao enviar WhatsApp portal:', err));
          }

          // Salvar token para redirect pós-envio
          (window as any).__magicToken = magicToken;
          (window as any).__leadId = leadId;
          (window as any).__leadData = {
            id: leadId,
            nome: data.nome_completo || data.nome || leadData.nome || 'Cliente',
            email: data.email || leadData.email,
            telefone: String(data.whatsapp || data.telefone || leadData.telefone || '').replace(/\D/g, ''),
            whatsapp: String(data.whatsapp || data.telefone || leadData.whatsapp || '').replace(/\D/g, ''),
            tenant_id: formulario.tenant_id,
            franchise_id: franchiseIdFinal,
          };
        } catch (magicErr) {
          console.warn('Erro ao gerar magic token:', magicErr);
        }
      }

      // Enviar webhook se configurado
      if (formulario.webhook_ativo && formulario.webhook_url) {
        try {
          const webhookPayload = {
            formulario_id: formulario.id,
            formulario_nome: formulario.nome,
            lead_id: leadId,
            dados: data,
            created_at: new Date().toISOString(),
            metadata: {
              session_id: sessionId,
              user_agent: navigator.userAgent,
              referrer: document.referrer,
              ...utmParams,
            },
          };

          const webhookResult = await sendWebhook(
            formulario.webhook_url,
            webhookPayload,
            formulario.webhook_headers as Record<string, string> | undefined,
            formulario.webhook_retry ? 3 : 1
          );

          // Atualizar status do webhook na submissão
          if (webhookResult.success) {
            await supabase
              .from('mt_form_submissions')
              .update({
                webhook_enviado: true,
                webhook_response_code: webhookResult.statusCode,
              })
              .eq('session_id', sessionId)
              .eq('formulario_id', formulario.id);
          }
        } catch (webhookError) {
          console.error('Erro ao enviar webhook:', webhookError);
        }
      }

      // Acao pos-envio: Redirecionar para agendamento
      // Dados pessoais ficam APENAS no localStorage (nunca na URL)
      const redirectNome = String(data.nome_completo || data.nome || '');
      const redirectEmail = String(data.email || '');
      const redirectTelefone = String(data.whatsapp || data.telefone || '').replace(/\D/g, '');
      const leadDataForRedirect = {
        id: leadId || '',
        nome: redirectNome, email: redirectEmail,
        telefone: redirectTelefone, whatsapp: redirectTelefone,
        tenant_id: formulario.tenant_id,
        franchise_id: franchiseIdFinal,
      };

      // Salvar no localStorage
      const expiry = new Date();
      expiry.setHours(expiry.getHours() + 24 * 7);
      localStorage.setItem('mt_cliente_token', JSON.stringify({ leadId: leadId || 'pending', expiry: expiry.toISOString() }));
      localStorage.setItem('mt_cliente_data', JSON.stringify(leadDataForRedirect));

      // Limpar refs do magic token
      const savedMagicToken = (window as any).__magicToken;
      if (savedMagicToken) {
        delete (window as any).__magicToken;
        delete (window as any).__leadData;
        delete (window as any).__leadId;
      }

      // Redirecionar: /cliente/agendar/yeslaser-praia-grande (só slug, sem dados pessoais)
      if (codigoInfluenciadora || codigoParceria || savedMagicToken) {
        // Buscar slug da franquia para URL amigável
        let franchiseSlug = '';
        if (franchiseIdFinal) {
          try {
            const slugPromise = supabase.from('mt_franchises').select('slug').eq('id', franchiseIdFinal).single();
            const timeoutP = new Promise((_, reject) => setTimeout(() => reject('timeout'), 2000));
            const { data: slugData } = await Promise.race([slugPromise, timeoutP]) as any;
            franchiseSlug = slugData?.slug || '';
          } catch { /* timeout - redireciona sem slug */ }
        }

        window.location.href = franchiseSlug
          ? `/cliente/agendar/${franchiseSlug}`
          : '/cliente/agendar';
        return;
      }

      if (formulario.acao_pos_envio === 'redirect' && formulario.redirect_url) {
        window.location.href = formulario.redirect_url;
        return;
      }

      if (formulario.acao_pos_envio === 'whatsapp' && formulario.whatsapp_numero) {
        let mensagem = formulario.whatsapp_mensagem || 'Ola! Acabei de preencher o formulario.';

        if (formulario.whatsapp_incluir_dados) {
          mensagem += `\n\nNome: ${data.nome || ''}\nEmail: ${data.email || ''}\nTelefone: ${data.whatsapp || data.telefone || ''}`;
        }

        const whatsappUrl = `https://wa.me/${formulario.whatsapp_numero.replace(/\D/g, '')}?text=${encodeURIComponent(mensagem)}`;
        window.open(whatsappUrl, '_blank');
      }

      // Notificar iframe pai sobre o envio bem sucedido
      if (isEmbedded) {
        window.parent.postMessage({
          type: 'yeslaser-form-submit',
          success: true,
          formSlug: formulario.slug,
          formName: formulario.nome,
          leadId: leadId,
          data: {
            nome: data.nome,
            email: data.email,
            whatsapp: data.whatsapp || data.telefone,
          },
        }, '*');
      }

      if (leadId) setCreatedLeadId(leadId);
      setSubmitted(true);
    } catch (err) {
      console.error('Erro ao submeter formulario:', err);
      setError('Erro ao enviar formulario. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Error state
  if (error || !formulario) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center">
              <AlertCircle className="h-12 w-12 text-destructive mb-4" />
              <h2 className="text-lg font-semibold mb-2">Formulario nao encontrado</h2>
              <p className="text-muted-foreground">
                {error || 'Este formulario nao existe ou esta inativo.'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state
  if (submitted) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4"
        style={{
          backgroundColor: (formulario.cor_fundo === '#T' || formulario.cor_fundo === 'transparent') ? 'transparent' : (formulario.cor_fundo || '#f9fafb'),
          backgroundImage: formulario.background_image_url ? `url(${formulario.background_image_url})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <Card className="max-w-md w-full shadow-lg">
          <CardContent className="pt-6 text-center">
            <CheckCircle2
              className="h-16 w-16 mx-auto mb-4"
              style={{ color: formulario.cor_primaria || '#22c55e' }}
            />
            <h2 className="text-2xl font-bold mb-2">Enviado com sucesso!</h2>
            <p className="text-muted-foreground">
              {formulario.mensagem_sucesso || 'Obrigado! Entraremos em contato em breve.'}
            </p>
            {createdLeadId && slug && (
              <a
                href={`/agendar/${slug}?lead_id=${createdLeadId}`}
                className="inline-flex items-center gap-2 mt-4 px-6 py-3 rounded-lg text-white font-medium transition-colors"
                style={{ backgroundColor: formulario.cor_primaria || '#8b5cf6' }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
                Agendar minha sessão
              </a>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Landing Page Template
  if (formulario.layout_template === 'landing_page') {
    return (
      <FormularioLandingPageTemplate
        formulario={formulario}
        servicos={servicos}
        onSubmit={onSubmit}
        submitting={submitting}
        submitted={submitted}
        onTrackEvent={(evento) => {
          if (evento === 'start') trackFormStart();
        }}
      />
    );
  }

  // Form
  const currentStepCampos = formulario.modo === 'wizard'
    ? (camposByStep[currentStep] || [])
    : (formulario.campos || []);

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        backgroundColor: (formulario.cor_fundo === '#T' || formulario.cor_fundo === 'transparent') ? 'transparent' : (formulario.cor_fundo || '#f9fafb'),
        backgroundImage: formulario.background_image_url ? `url(${formulario.background_image_url})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <Card className="max-w-2xl w-full shadow-lg">
        {/* Header com logo dentro */}
        <CardHeader className="text-center border-b" style={{ backgroundColor: formulario.cor_header_fundo }}>
          {/* Logo dentro do header */}
          {formulario.logo_url && (
            <img
              src={formulario.logo_url}
              alt={formulario.nome}
              className="h-16 mx-auto mb-4 object-contain"
            />
          )}
          <CardTitle
            className="text-2xl"
            style={{ color: formulario.cor_header_texto || formulario.cor_texto }}
          >
            {formulario.titulo || formulario.nome}
          </CardTitle>
          {(formulario.subtitulo || formulario.descricao) && (
            <CardDescription style={{ color: formulario.cor_header_texto ? `${formulario.cor_header_texto}99` : undefined }}>
              {formulario.subtitulo || formulario.descricao}
            </CardDescription>
          )}

          {/* Badge de indicacao, influenciadora ou parceria - mensagem amigavel */}
          {indicadorInfo && (
            <div className="mt-3">
              <span
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium"
                style={{
                  backgroundColor: `${formulario.cor_primaria}15`,
                  color: formulario.cor_primaria,
                  border: `1px solid ${formulario.cor_primaria}30`,
                }}
              >
                <span className="text-base">💜</span>
                {indicadorInfo.tipo === 'parceiro'
                  ? `Você chegou através do nosso parceiro ${indicadorInfo.nome}!`
                  : indicadorInfo.tipo === 'influenciadora'
                    ? `${indicadorInfo.nome} te indicou para fazer parte da nossa família!`
                    : indicadorInfo.tipo === 'lead'
                      ? `${indicadorInfo.nome} te indicou com carinho para fazer parte da nossa família!`
                      : `Código especial: ${indicadorInfo.codigo}`}
              </span>
            </div>
          )}
        </CardHeader>

        {/* Progress bar para wizard (fora do header) */}
        {formulario.modo === 'wizard' && formulario.mostrar_progresso && (
          <div className="px-6 pt-4">
            <div className="flex justify-between text-sm text-muted-foreground mb-2">
              <span>Etapa {currentStep} de {totalSteps}</span>
              <span>{Math.round(progressPercent)}%</span>
            </div>
            <Progress
              value={progressPercent}
              className="h-2"
              style={{
                // @ts-expect-error - CSS custom property
                '--progress-foreground': formulario.cor_primaria || undefined,
              }}
            />
            {steps[currentStep - 1] && (
              <div className="mt-3">
                <h3 className="font-medium">{steps[currentStep - 1].titulo}</h3>
                {steps[currentStep - 1].descricao && (
                  <p className="text-sm text-muted-foreground">
                    {steps[currentStep - 1].descricao}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

          <CardContent className="pt-6">
            <form onSubmit={handleSubmit(onSubmit)} onFocusCapture={trackFormStart}>
              <div className="space-y-4">
                {currentStepCampos.map((campo) => (
                  <DynamicField
                    key={campo.id}
                    campo={campo}
                    control={control}
                    errors={errors as Record<string, { message?: string }>}
                    onCepChange={handleCepChange}
                    disabled={submitting}
                    setValue={setValue}
                  />
                ))}

                {/* Feedback visual do endereço encontrado via CEP */}
                {enderecoInfo && (
                  <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
                    <MapPin className="h-4 w-4 flex-shrink-0" />
                    <span><strong>Endereço:</strong> {enderecoInfo}</span>
                    {coordenadasDisplay.latitude && coordenadasDisplay.longitude && (
                      <span className="text-xs text-green-500 ml-auto">
                        ({coordenadasDisplay.latitude.toFixed(4)}, {coordenadasDisplay.longitude.toFixed(4)})
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Botões de navegação */}
              <div className="flex justify-between mt-6 pt-4 border-t">
                {/* Botao voltar (wizard) */}
                {formulario.modo === 'wizard' && currentStep > 1 && formulario.permitir_voltar && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handlePrevStep}
                    disabled={submitting}
                  >
                    <ChevronLeft className="h-4 w-4 mr-2" />
                    Voltar
                  </Button>
                )}

                <div className="ml-auto">
                  {/* Botao avancar ou enviar */}
                  {formulario.modo === 'wizard' && !isLastStep ? (
                    <Button
                      type="button"
                      onClick={handleNextStep}
                      disabled={submitting}
                      style={{
                        backgroundColor: formulario.cor_botao,
                        color: formulario.cor_botao_texto,
                      }}
                    >
                      Proximo
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                  ) : (
                    <Button
                      type="submit"
                      disabled={submitting}
                      className={cn(formulario.botao_largura_total && 'w-full')}
                      style={{
                        backgroundColor: formulario.cor_botao,
                        color: formulario.cor_botao_texto,
                      }}
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Enviando...
                        </>
                      ) : (
                        <>
                          {formulario.texto_botao || 'Enviar'}
                          <Send className="h-4 w-4 ml-2" />
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </form>
          </CardContent>

          {/* Footer dentro do Card */}
          {formulario.mostrar_footer && formulario.texto_footer && (
            <div
              className="px-6 py-4 border-t bg-muted/30 text-center text-sm"
              style={{ color: formulario.cor_footer_texto }}
            >
              {formulario.texto_footer}
            </div>
          )}
        </Card>
    </div>
  );
}
