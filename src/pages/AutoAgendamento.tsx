import { useState, useEffect, useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import {
  useAvailableSlots,
  useCreatePublicAppointment,
  type SelfSchedulingConfig,
} from '@/hooks/multitenant/useSelfSchedulingMT';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Loader2,
  Calendar,
  Clock,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

// =============================================================================
// TIPOS
// =============================================================================

interface FranchisePublic {
  id: string;
  tenant_id: string;
  nome: string;
  slug?: string;
}

interface ServicePublic {
  id: string;
  nome: string;
  descricao?: string;
  duracao_minutos?: number;
  preco?: number;
}

// =============================================================================
// HELPERS
// =============================================================================

function formatDateBR(dateStr: string): string {
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

function getDayLabel(dateStr: string): string {
  const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];
  const d = new Date(dateStr + 'T12:00:00');
  return days[d.getDay()];
}

function generateCalendarDays(minDays: number, maxDays: number, diasSemana: number[]): string[] {
  const days: string[] = [];
  const today = new Date();

  for (let i = minDays; i <= maxDays; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    const dayOfWeek = d.getDay();

    if (diasSemana.includes(dayOfWeek)) {
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      days.push(dateStr);
    }
  }

  return days;
}

// =============================================================================
// STEPS
// =============================================================================

const STEPS = ['servico', 'data', 'horario', 'confirmacao'] as const;
type Step = typeof STEPS[number];

// =============================================================================
// MAIN PAGE - Public (no auth required)
// =============================================================================

export default function AutoAgendamento() {
  const { franchiseSlug } = useParams<{ franchiseSlug: string }>();
  const [searchParams] = useSearchParams();
  const leadId = searchParams.get('lead_id');

  // State
  const [step, setStep] = useState<Step>('servico');
  const [franchise, setFranchise] = useState<FranchisePublic | null>(null);
  const [services, setServices] = useState<ServicePublic[]>([]);
  const [config, setConfig] = useState<SelfSchedulingConfig | null>(null);
  const [isLoadingInit, setIsLoadingInit] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);

  // Form data
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [clienteNome, setClienteNome] = useState('');
  const [clienteTelefone, setClienteTelefone] = useState('');
  const [clienteEmail, setClienteEmail] = useState('');

  const [isSuccess, setIsSuccess] = useState(false);

  // Available slots
  const { slots, isLoading: isLoadingSlots } = useAvailableSlots(
    franchise?.id,
    selectedDate || undefined,
    selectedServiceId || undefined
  );

  const { createAppointment, isSubmitting } = useCreatePublicAppointment();

  // Load franchise, config, and services on mount
  useEffect(() => {
    async function loadInitialData() {
      if (!franchiseSlug) {
        setInitError('URL invalida');
        setIsLoadingInit(false);
        return;
      }

      try {
        // Load franchise by slug or ID
        let franchiseQuery = supabase
          .from('mt_franchises' as never)
          .select('id, tenant_id, nome, slug')
          .eq('is_active', true);

        // Try slug first, fallback to id
        const { data: franchiseData } = await franchiseQuery
          .eq('slug', franchiseSlug)
          .maybeSingle();

        let fData = franchiseData;
        if (!fData) {
          // Try by id
          const { data: byId } = await supabase
            .from('mt_franchises' as never)
            .select('id, tenant_id, nome, slug')
            .eq('id', franchiseSlug)
            .eq('is_active', true)
            .maybeSingle();
          fData = byId;
        }

        if (!fData) {
          setInitError('Unidade nao encontrada');
          setIsLoadingInit(false);
          return;
        }

        setFranchise(fData);

        // Load config
        const { data: configData } = await supabase
          .from('mt_self_scheduling_config' as never)
          .select('*')
          .eq('franchise_id', fData.id)
          .eq('is_active', true)
          .maybeSingle();

        if (!configData) {
          setInitError('Auto-agendamento nao esta disponivel para esta unidade');
          setIsLoadingInit(false);
          return;
        }

        setConfig(configData);

        // Load available services
        let servicesQuery = supabase
          .from('mt_services' as never)
          .select('id, nome, descricao, duracao_minutos, preco')
          .eq('tenant_id', fData.tenant_id)
          .eq('is_active', true)
          .is('deleted_at', null)
          .order('nome');

        // Filter by configured services if specified
        if (configData.servicos_disponiveis && configData.servicos_disponiveis.length > 0) {
          servicesQuery = servicesQuery.in('id', configData.servicos_disponiveis);
        }

        const { data: servicesData } = await servicesQuery;
        setServices(servicesData || []);

        // Pre-fill lead data if lead_id provided
        if (leadId) {
          const { data: leadData } = await supabase
            .from('mt_leads')
            .select('nome, telefone, email')
            .eq('id', leadId)
            .maybeSingle();

          if (leadData) {
            setClienteNome(leadData.nome || '');
            setClienteTelefone(leadData.telefone || '');
            setClienteEmail(leadData.email || '');
          }
        }
      } catch (err: unknown) {
        console.error('Erro ao carregar dados:', err);
        setInitError('Erro ao carregar dados. Tente novamente.');
      } finally {
        setIsLoadingInit(false);
      }
    }

    loadInitialData();
  }, [franchiseSlug, leadId]);

  // Calendar days based on config
  const calendarDays = useMemo(() => {
    if (!config) return [];
    return generateCalendarDays(
      config.dias_antecedencia_min,
      config.dias_antecedencia_max,
      config.dias_semana || [1, 2, 3, 4, 5, 6]
    );
  }, [config]);

  // Available slots filtered
  const availableSlots = useMemo(() => {
    return slots.filter(s => s.disponivel);
  }, [slots]);

  // Selected service
  const selectedService = services.find(s => s.id === selectedServiceId);

  // Navigation
  const goNext = () => {
    const idx = STEPS.indexOf(step);
    if (idx < STEPS.length - 1) {
      setStep(STEPS[idx + 1]);
    }
  };

  const goPrev = () => {
    const idx = STEPS.indexOf(step);
    if (idx > 0) {
      setStep(STEPS[idx - 1]);
    }
  };

  // Submit
  const handleSubmit = async () => {
    if (!franchise || !config) return;

    const nome = clienteNome.trim();
    if (!nome) {
      return;
    }

    try {
      await createAppointment({
        franchise_id: franchise.id,
        tenant_id: franchise.tenant_id,
        lead_id: leadId || undefined,
        cliente_nome: nome,
        cliente_telefone: clienteTelefone || undefined,
        cliente_email: clienteEmail || undefined,
        servico_id: selectedServiceId || undefined,
        servico_nome: selectedService?.nome || undefined,
        data_agendamento: selectedDate,
        hora_inicio: selectedTime,
        duracao_minutos: selectedService?.duracao_minutos || config.duracao_padrao || 60,
      });

      setIsSuccess(true);
    } catch {
      // Error handled in hook
    }
  };

  // Can proceed checks
  const canProceedFromService = !!selectedServiceId || services.length === 0;
  const canProceedFromDate = !!selectedDate;
  const canProceedFromTime = !!selectedTime;
  const canSubmit = !!clienteNome.trim() && !!selectedDate && !!selectedTime;

  // Step index for progress
  const stepIndex = STEPS.indexOf(step);
  const progress = ((stepIndex + 1) / STEPS.length) * 100;

  // ==========================================================================
  // RENDER
  // ==========================================================================

  // Loading
  if (isLoadingInit) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Error
  if (initError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <p className="text-lg text-destructive">{initError}</p>
            <p className="text-sm text-muted-foreground">
              Verifique o link e tente novamente.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success
  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
            <h2 className="text-2xl font-bold">Agendamento Confirmado!</h2>
            <p className="text-muted-foreground">
              {config?.mensagem_confirmacao ||
                'Entraremos em contato para confirmar seu agendamento.'}
            </p>
            <div className="bg-gray-50 rounded-lg p-4 text-left space-y-1 text-sm">
              {selectedService && <p><span className="font-medium">Servico:</span> {selectedService.nome}</p>}
              <p><span className="font-medium">Data:</span> {formatDateBR(selectedDate)}</p>
              <p><span className="font-medium">Horario:</span> {selectedTime}</p>
              <p><span className="font-medium">Unidade:</span> {franchise?.nome}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-lg mx-auto px-4 py-4">
          <h1 className="text-xl font-bold text-center">{franchise?.nome || 'Agendar'}</h1>
          <p className="text-sm text-muted-foreground text-center mt-1">Agende seu horario online</p>

          {/* Progress bar */}
          <div className="mt-4 h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300 rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span className={stepIndex >= 0 ? 'text-primary font-medium' : ''}>Servico</span>
            <span className={stepIndex >= 1 ? 'text-primary font-medium' : ''}>Data</span>
            <span className={stepIndex >= 2 ? 'text-primary font-medium' : ''}>Horario</span>
            <span className={stepIndex >= 3 ? 'text-primary font-medium' : ''}>Confirmar</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto px-4 py-6">

        {/* Step 1: Service selection */}
        {step === 'servico' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Selecione o servico</h2>

            {services.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Nenhum servico disponivel</p>
                <Button className="mt-4" onClick={goNext}>Continuar sem servico</Button>
              </div>
            ) : (
              <div className="space-y-2">
                {services.map(service => (
                  <Card
                    key={service.id}
                    className={`cursor-pointer transition-all ${
                      selectedServiceId === service.id
                        ? 'ring-2 ring-primary border-primary'
                        : 'hover:shadow-md'
                    }`}
                    onClick={() => setSelectedServiceId(service.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium">{service.nome}</h3>
                          {service.descricao && (
                            <p className="text-sm text-muted-foreground mt-1">{service.descricao}</p>
                          )}
                          {service.duracao_minutos && (
                            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {service.duracao_minutos} min
                            </p>
                          )}
                        </div>
                        {service.preco != null && service.preco > 0 && (
                          <span className="text-sm font-semibold text-primary">
                            R$ {service.preco.toFixed(2).replace('.', ',')}
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            <div className="flex justify-end pt-4">
              <Button onClick={goNext} disabled={!canProceedFromService} className="gap-2">
                Proximo <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Date selection */}
        {step === 'data' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Escolha a data</h2>

            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {calendarDays.map(day => (
                <Button
                  key={day}
                  variant={selectedDate === day ? 'default' : 'outline'}
                  className="flex flex-col h-auto py-3 px-2"
                  onClick={() => {
                    setSelectedDate(day);
                    setSelectedTime(''); // Reset time on date change
                  }}
                >
                  <span className="text-xs">{getDayLabel(day)}</span>
                  <span className="text-sm font-medium">
                    {day.split('-')[2]}/{day.split('-')[1]}
                  </span>
                </Button>
              ))}
            </div>

            {calendarDays.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                Nenhuma data disponivel no momento.
              </p>
            )}

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={goPrev} className="gap-2">
                <ArrowLeft className="h-4 w-4" /> Voltar
              </Button>
              <Button onClick={goNext} disabled={!canProceedFromDate} className="gap-2">
                Proximo <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Time selection */}
        {step === 'horario' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Escolha o horario</h2>
            <p className="text-sm text-muted-foreground">
              {formatDateBR(selectedDate)} ({getDayLabel(selectedDate)})
            </p>

            {isLoadingSlots ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : availableSlots.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhum horario disponivel nesta data. Tente outra data.
              </p>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {slots.map(slot => (
                  <Button
                    key={slot.hora}
                    variant={selectedTime === slot.hora ? 'default' : 'outline'}
                    disabled={!slot.disponivel}
                    className="h-12"
                    onClick={() => setSelectedTime(slot.hora)}
                  >
                    {slot.hora}
                  </Button>
                ))}
              </div>
            )}

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={goPrev} className="gap-2">
                <ArrowLeft className="h-4 w-4" /> Voltar
              </Button>
              <Button onClick={goNext} disabled={!canProceedFromTime} className="gap-2">
                Proximo <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Confirmation */}
        {step === 'confirmacao' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Confirme seus dados</h2>

            {/* Summary */}
            <Card>
              <CardContent className="p-4 space-y-2 text-sm">
                {selectedService && (
                  <p><span className="font-medium">Servico:</span> {selectedService.nome}</p>
                )}
                <p><span className="font-medium">Data:</span> {formatDateBR(selectedDate)} ({getDayLabel(selectedDate)})</p>
                <p><span className="font-medium">Horario:</span> {selectedTime}</p>
                <p><span className="font-medium">Unidade:</span> {franchise?.nome}</p>
              </CardContent>
            </Card>

            {/* Client data form */}
            {!leadId && (
              <div className="space-y-3">
                <div>
                  <Label htmlFor="cliente-nome">Nome completo *</Label>
                  <Input
                    id="cliente-nome"
                    placeholder="Seu nome completo"
                    value={clienteNome}
                    onChange={e => setClienteNome(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="cliente-telefone">Telefone</Label>
                  <Input
                    id="cliente-telefone"
                    type="tel"
                    placeholder="(11) 99999-9999"
                    value={clienteTelefone}
                    onChange={e => setClienteTelefone(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="cliente-email">E-mail</Label>
                  <Input
                    id="cliente-email"
                    type="email"
                    placeholder="seu@email.com"
                    value={clienteEmail}
                    onChange={e => setClienteEmail(e.target.value)}
                  />
                </div>
              </div>
            )}

            {leadId && (
              <Card>
                <CardContent className="p-4 text-sm space-y-1">
                  <p><span className="font-medium">Nome:</span> {clienteNome}</p>
                  {clienteTelefone && <p><span className="font-medium">Telefone:</span> {clienteTelefone}</p>}
                  {clienteEmail && <p><span className="font-medium">E-mail:</span> {clienteEmail}</p>}
                </CardContent>
              </Card>
            )}

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={goPrev} className="gap-2">
                <ArrowLeft className="h-4 w-4" /> Voltar
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!canSubmit || isSubmitting}
                className="gap-2"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                Confirmar Agendamento
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
