import { useState, useEffect, useCallback, useRef } from 'react';
import {
  TotemLayout,
  TotemHeader,
  TotemNumericKeyboard,
  TotemError,
  CameraCapture,
} from '@/components/totem';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { applyCPFMask, cleanCPF, validateCPF } from '@/utils/cpf';
import { supabase } from '@/integrations/supabase/client';
import useTenantDetection from '@/hooks/multitenant/useTenantDetection';
import { extractLocationHint, matchFranchiseByLocation } from '@/utils/franchiseLocation';
import { useGeolocation } from '@/hooks/useGeolocation';
import {
  User, Clock, CheckCircle, RotateCcw, ArrowLeft, LogIn, LogOut, Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const EDGE_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/totem-ponto`;

type TotemStep = 'cpf_input' | 'camera' | 'confirm' | 'registrando' | 'success' | 'error';

interface EmployeeData {
  id: string;
  user_id: string;
  nome: string;
  tenant_id: string;
  franchise_id: string | null;
  franchise_name: string;
  horario_entrada: string;
  horario_saida: string;
}

interface TodayEntry {
  id: string;
  checkin_em: string | null;
  checkout_em: string | null;
  status: string;
}

type NextAction = 'entrada' | 'saida';

interface Franchise {
  id: string;
  slug: string;
  nome_fantasia: string;
  cidade: string | null;
  estado: string | null;
  tenant_id: string;
}

async function callEdgeFunction(body: Record<string, unknown>) {
  const resp = await fetch(EDGE_FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify(body),
  });

  const data = await resp.json();
  if (!resp.ok) {
    throw new Error(data.error || 'Erro ao processar requisicao');
  }
  return data;
}

export default function TotemPresenca() {
  const { tenant } = useTenantDetection();
  const { requestPosition } = useGeolocation();

  // State
  const [step, setStep] = useState<TotemStep>('cpf_input');
  const [cpfValue, setCpfValue] = useState('');
  const [cpfDisplay, setCpfDisplay] = useState('');
  const [cpfError, setCpfError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const [employee, setEmployee] = useState<EmployeeData | null>(null);
  const [todayEntries, setTodayEntries] = useState<TodayEntry[]>([]);
  const [todayEntry, setTodayEntry] = useState<TodayEntry | null>(null);
  const [nextAction, setNextAction] = useState<NextAction>('entrada');
  const [nextPunchLabel, setNextPunchLabel] = useState('Check-in Manha');
  const [totalPunches, setTotalPunches] = useState(0);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  const [successMessage, setSuccessMessage] = useState('');
  const [successHorario, setSuccessHorario] = useState('');
  const [countdown, setCountdown] = useState(10);

  const [franchise, setFranchise] = useState<Franchise | null>(null);
  const [isLoadingFranchise, setIsLoadingFranchise] = useState(true);

  const inactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Detect franchise by domain
  useEffect(() => {
    async function detectFranchise() {
      setIsLoadingFranchise(true);
      try {
        const params = new URLSearchParams(window.location.search);
        const slugParam = params.get('unidade') || params.get('franchise');

        if (slugParam) {
          const { data } = await supabase
            .from('mt_franchises')
            .select('id, slug, nome_fantasia, cidade, estado, tenant_id')
            .eq('slug', slugParam.toLowerCase())
            .eq('is_active', true)
            .maybeSingle();
          if (data) {
            setFranchise(data);
            return;
          }
        }

        if (tenant?.id) {
          const { data: franchises } = await supabase
            .from('mt_franchises')
            .select('id, slug, nome_fantasia, cidade, estado, tenant_id')
            .eq('tenant_id', tenant.id)
            .eq('is_active', true)
            .order('nome');

          if (franchises?.length) {
            const locationHint = extractLocationHint(window.location.hostname, tenant.slug);
            const matched = matchFranchiseByLocation(franchises, locationHint);
            if (matched) {
              setFranchise(matched as Franchise);
              return;
            }
            setFranchise(franchises[0] as Franchise);
          }
        }
      } finally {
        setIsLoadingFranchise(false);
      }
    }

    detectFranchise();
  }, [tenant?.id, tenant?.slug]);

  // Inactivity reset (30s)
  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    if (step !== 'cpf_input' && step !== 'success') {
      inactivityTimer.current = setTimeout(() => {
        handleFullReset();
      }, 30000);
    }
  }, [step]);

  useEffect(() => {
    resetInactivityTimer();
    return () => {
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    };
  }, [step, resetInactivityTimer]);

  // CPF mask
  useEffect(() => {
    setCpfDisplay(applyCPFMask(cpfValue));
  }, [cpfValue]);

  // Success countdown
  useEffect(() => {
    if (step !== 'success') return;
    setCountdown(10);
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleFullReset();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [step]);

  // Live clock
  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    if (step !== 'cpf_input' && step !== 'success') return;
    setCurrentTime(new Date());
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, [step]);

  // Handlers
  const handleKeyPress = useCallback((key: string) => {
    resetInactivityTimer();
    const cleaned = cleanCPF(cpfValue);
    if (cleaned.length < 11) {
      setCpfValue(prev => prev + key);
      setCpfError(null);
    }
  }, [cpfValue, resetInactivityTimer]);

  const handleBackspace = useCallback(() => {
    resetInactivityTimer();
    setCpfValue(prev => {
      const cleaned = cleanCPF(prev);
      return cleaned.slice(0, -1);
    });
    setCpfError(null);
  }, [resetInactivityTimer]);

  const handleConfirmCPF = useCallback(async () => {
    resetInactivityTimer();
    if (!validateCPF(cpfValue)) {
      setCpfError('CPF invalido. Verifique e tente novamente.');
      return;
    }

    setIsSearching(true);
    setCpfError(null);

    try {
      const result = await callEdgeFunction({
        action: 'identificar',
        cpf: cleanCPF(cpfValue),
        tenant_slug: tenant?.slug || null,
        franchise_id: franchise?.id || null,
        tipo_busca: 'mei', // Buscar apenas prestadores MEI
      });

      setEmployee(result.employee);
      setTodayEntry(result.todayEntry);
      setTodayEntries(result.todayEntries || []);
      setNextAction(result.nextAction || 'entrada');
      setNextPunchLabel(result.nextPunchLabel || 'Check-in');
      setTotalPunches(result.totalPunches || 0);
      setStep('camera');
    } catch (err) {
      setCpfError((err as Error).message);
    } finally {
      setIsSearching(false);
    }
  }, [cpfValue, tenant?.slug, resetInactivityTimer]);

  const handlePhotoCapture = useCallback((base64: string) => {
    resetInactivityTimer();
    setCapturedPhoto(base64);
    setStep('confirm');
  }, [resetInactivityTimer]);

  const handleRegister = useCallback(async () => {
    if (!employee || !capturedPhoto) return;

    const tipo = nextAction;

    setStep('registrando');

    try {
      const geoPromise = requestPosition().catch(() => null);

      const registerPromise = callEdgeFunction({
        action: 'registrar',
        employee_id: employee.id,
        user_id: employee.user_id,
        tipo,
        selfie_base64: capturedPhoto,
        tenant_id: employee.tenant_id,
        franchise_id: employee.franchise_id,
      });

      const [geoResult, result] = await Promise.all([geoPromise, registerPromise]);

      if (geoResult && result?.entry?.id) {
        callEdgeFunction({
          action: 'atualizar_geo',
          entry_id: result.entry.id,
          tenant_id: employee.tenant_id,
          latitude: geoResult.latitude,
          longitude: geoResult.longitude,
          accuracy: geoResult.accuracy,
          tipo,
        }).catch(() => { /* geo update optional */ });
      }

      setSuccessMessage(result.message);
      setSuccessHorario(result.horario);
      setStep('success');
    } catch (err) {
      setErrorMessage((err as Error).message);
      setStep('error');
    }
  }, [employee, capturedPhoto, nextAction, requestPosition]);

  const handleFullReset = useCallback(() => {
    setStep('cpf_input');
    setCpfValue('');
    setCpfError(null);
    setEmployee(null);
    setTodayEntry(null);
    setTodayEntries([]);
    setNextAction('entrada');
    setNextPunchLabel('Check-in Manha');
    setTotalPunches(0);
    setCapturedPhoto(null);
    setErrorMessage('');
    setSuccessMessage('');
  }, []);

  const actionType = nextAction;

  // Loading
  if (isLoadingFranchise) {
    return (
      <TotemLayout>
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-12 w-12 animate-spin text-white mb-4" />
          <p className="text-white text-lg">Carregando...</p>
        </div>
      </TotemLayout>
    );
  }

  return (
    <TotemLayout>
      {/* Header */}
      <TotemHeader
        nomeUnidade={franchise?.nome_fantasia || 'Confirmar Presenca'}
        cidade={franchise?.cidade}
        estado={franchise?.estado}
      />

      {/* Subtitle */}
      <div className="text-center mb-3">
        <p className="text-white/90 text-sm font-medium">Confirmar Presenca</p>
        <p className="text-white/60 text-xs">
          {currentTime.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
          {' - '}
          {currentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </p>
      </div>

      {/* STEP: CPF Input */}
      {step === 'cpf_input' && (
        <Card className="bg-white/95 backdrop-blur shadow-xl">
          <CardContent className="p-4">
            <div className="mb-3">
              <label className="block text-xs font-medium text-gray-600 mb-1 text-center">
                Digite seu CPF
              </label>
              <div
                className={cn(
                  'w-full h-12 flex items-center justify-center',
                  'bg-gray-50 border-2 rounded-lg',
                  'text-xl md:text-2xl font-mono tracking-wider',
                  'transition-colors duration-200',
                  cpfError ? 'border-red-400 text-red-600' : 'border-gray-200',
                  !cpfDisplay && 'text-gray-400'
                )}
              >
                {cpfDisplay || '000.000.000-00'}
              </div>
              {cpfError && (
                <p className="mt-1 text-xs text-red-500 text-center">{cpfError}</p>
              )}
            </div>

            <TotemNumericKeyboard
              onKeyPress={handleKeyPress}
              onBackspace={handleBackspace}
              onConfirm={handleConfirmCPF}
              disabled={isSearching}
              className="mb-3"
            />

            <Button
              size="default"
              className="w-full h-11 text-base font-semibold bg-[#662E8E] hover:bg-[#4a2268]"
              onClick={handleConfirmCPF}
              disabled={!validateCPF(cpfValue) || isSearching}
            >
              {isSearching ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Buscando...
                </>
              ) : (
                <>
                  <User className="h-4 w-4 mr-2" />
                  Identificar
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* STEP: Camera */}
      {step === 'camera' && employee && (
        <div className="space-y-3">
          <Card className="bg-white/95 backdrop-blur shadow-xl">
            <CardContent className="p-4 text-center">
              <p className="text-lg font-bold text-gray-900">
                Ola, {employee.nome.split(' ')[0]}!
              </p>
              <p className="text-sm text-gray-500">
                Tire sua foto para confirmar: <span className="font-semibold text-[#662E8E]">{nextPunchLabel}</span>
              </p>

              {/* Today's entries history */}
              {todayEntries.length > 0 && (
                <div className="mt-2 space-y-1">
                  {todayEntries.map((e, idx) => (
                    <div key={e.id} className="flex items-center justify-center gap-3 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <LogIn className="h-3 w-3 text-green-500" />
                        {e.checkin_em ? new Date(e.checkin_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--'}
                      </span>
                      {e.checkout_em ? (
                        <span className="flex items-center gap-1">
                          <LogOut className="h-3 w-3 text-orange-500" />
                          {new Date(e.checkout_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      ) : (
                        <span className="text-orange-500 font-medium">Check-out pendente</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <CameraCapture
            onCapture={handlePhotoCapture}
            onCancel={() => {
              setStep('cpf_input');
              setCpfValue('');
            }}
          />
        </div>
      )}

      {/* STEP: Confirm */}
      {step === 'confirm' && employee && capturedPhoto && (
        <div className="space-y-3">
          <Card className="bg-white/95 backdrop-blur shadow-xl">
            <CardContent className="p-4">
              <div className="rounded-lg overflow-hidden mb-4">
                <img
                  src={capturedPhoto}
                  alt="Sua foto"
                  className="w-full aspect-[4/3] object-cover"
                />
              </div>

              <p className="text-center text-sm text-gray-600 mb-4">
                {employee.nome} - {employee.franchise_name || ''}
              </p>

              <p className="text-center text-xs text-gray-400 mb-2">
                Proximo registro: <span className="font-semibold">{nextPunchLabel}</span>
                {totalPunches > 0 && ` (${totalPunches} registro${totalPunches > 1 ? 's' : ''} hoje)`}
              </p>

              {actionType === 'entrada' ? (
                <Button
                  size="lg"
                  onClick={handleRegister}
                  className="w-full h-16 text-xl font-bold bg-green-500 hover:bg-green-600 text-white"
                >
                  <LogIn className="h-6 w-6 mr-3" />
                  {nextPunchLabel.toUpperCase()}
                </Button>
              ) : (
                <Button
                  size="lg"
                  onClick={handleRegister}
                  className="w-full h-16 text-xl font-bold bg-orange-500 hover:bg-orange-600 text-white"
                >
                  <LogOut className="h-6 w-6 mr-3" />
                  {nextPunchLabel.toUpperCase()}
                </Button>
              )}

              <Button
                variant="ghost"
                onClick={() => {
                  setCapturedPhoto(null);
                  setStep('camera');
                }}
                className="w-full mt-2 text-gray-500"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Tirar outra foto
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* STEP: Registrando */}
      {step === 'registrando' && (
        <Card className="bg-white/95 backdrop-blur shadow-xl">
          <CardContent className="p-8 text-center">
            <Loader2 className="h-16 w-16 animate-spin text-[#662E8E] mx-auto mb-4" />
            <p className="text-lg font-semibold text-gray-700">Confirmando presenca...</p>
            <p className="text-sm text-gray-500 mt-1">Aguarde um momento</p>
          </CardContent>
        </Card>
      )}

      {/* STEP: Success */}
      {step === 'success' && (
        <Card className="bg-white shadow-xl overflow-hidden">
          <CardContent className="p-8 text-center">
            <div className="mb-6">
              <div className="w-24 h-24 mx-auto rounded-full bg-green-100 flex items-center justify-center animate-bounce">
                <CheckCircle className="h-14 w-14 text-green-500" />
              </div>
            </div>

            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              {successMessage || 'Presenca confirmada!'}
            </h2>

            <p className="text-xl text-gray-600 mb-1">
              <span className="font-semibold text-[#662E8E]">{employee?.nome}</span>
            </p>
            <p className="text-2xl font-mono font-bold text-gray-800 mb-1">
              <Clock className="h-5 w-5 inline mr-1" />
              {successHorario}
            </p>
            <p className="text-gray-500 mb-6">
              {currentTime.toLocaleDateString('pt-BR')}
            </p>

            <div className="mb-6">
              <p className="text-sm text-gray-400">
                Voltando em <span className="font-bold text-[#662E8E]">{countdown}</span> segundos...
              </p>
              <div className="mt-2 h-1 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#662E8E] transition-all duration-1000 ease-linear"
                  style={{ width: `${(countdown / 10) * 100}%` }}
                />
              </div>
            </div>

            <Button variant="outline" size="lg" className="w-full" onClick={handleFullReset}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Novo Registro
            </Button>
          </CardContent>
        </Card>
      )}

      {/* STEP: Error */}
      {step === 'error' && (
        <Card className="bg-white shadow-xl overflow-hidden">
          <CardContent className="p-8 text-center">
            <div className="mb-6">
              <div className="w-20 h-20 mx-auto rounded-full bg-red-100 flex items-center justify-center">
                <svg className="h-10 w-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-2">Erro ao confirmar</h2>
            <p className="text-gray-600 mb-6">{errorMessage}</p>

            <div className="space-y-3">
              <Button
                size="lg"
                className="w-full bg-[#662E8E] hover:bg-[#4a2268]"
                onClick={() => {
                  setStep('confirm');
                }}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Tentar Novamente
              </Button>

              <Button variant="outline" size="lg" className="w-full" onClick={handleFullReset}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Voltar ao Inicio
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </TotemLayout>
  );
}
