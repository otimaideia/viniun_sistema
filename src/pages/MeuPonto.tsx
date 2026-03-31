import { useState, useEffect, useCallback } from 'react';
import { useMeuPontoMT } from '@/hooks/multitenant/useMeuPontoMT';
import { useGeolocation } from '@/hooks/useGeolocation';
import { minutesToTime } from '@/hooks/multitenant/useTimeCardMT';
import type { ClockOptions } from '@/hooks/multitenant/useTimeCardMT';
import { DIAS_SEMANA_SHORT } from '@/types/produtividade';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { CameraCapture } from '@/components/totem/CameraCapture';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  LogIn,
  LogOut,
  MapPin,
  Camera,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Shield,
  Loader2,
  Timer,
  TrendingDown,
  TrendingUp,
  XCircle,
  Fingerprint,
  Eye,
  EyeOff,
  FileText,
} from 'lucide-react';
import { JUSTIFICATIVA_TIPO_LABELS } from '@/types/produtividade';

const LGPD_CONSENT_KEY = 'meu-ponto-lgpd-geo-consent';

function timestampToTime(ts: string): string {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// Tela de login standalone para funcionários
// NOTE: Uses direct supabase.auth.signInWithPassword because this component is standalone
// (outside AuthProvider). See comment on MeuPonto component for details.
function MeuPontoLogin({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (authError) {
        if (authError.message.includes('Invalid login')) {
          setError('Email ou senha incorretos');
        } else {
          setError(authError.message);
        }
        return;
      }

      onLogin();
    } catch (err) {
      setError('Erro ao fazer login. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center space-y-3 pb-4">
          <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
            <Fingerprint className="h-7 w-7 text-primary" />
          </div>
          <div>
            <CardTitle className="text-xl">Meu Ponto</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Entre com suas credenciais para registrar o ponto
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Sua senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            {error && (
              <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">{error}</p>
            )}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <LogIn className="h-4 w-4 mr-2" />
              )}
              {isLoading ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

// Conteúdo principal do ponto
function MeuPontoContent() {
  const { user, tenant } = useTenantContext();
  const {
    isCltEmployee, isDetecting, employee, currentMonth,
    days, summary, isLoading,
    clockIn, clockOut, todayEntry,
    todayRecords, nextAction, nextPunchLabel, dayComplete,
  } = useMeuPontoMT();

  const { requestPosition, isRequesting: isGeoRequesting } = useGeolocation();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [geoConsent, setGeoConsent] = useState<boolean | null>(null);

  // Step flow igual ao Totem: normal → camera → confirm → registrando → success
  type PontoStep = 'normal' | 'camera' | 'confirm' | 'registrando' | 'success';
  const [step, setStep] = useState<PontoStep>('normal');
  const [pendingAction, setPendingAction] = useState<'entrada' | 'saida'>('entrada');
  const [capturedSelfie, setCapturedSelfie] = useState<string | null>(null);
  const [successTime, setSuccessTime] = useState('');

  // Relógio em tempo real
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Carregar consentimento LGPD
  useEffect(() => {
    const stored = localStorage.getItem(LGPD_CONSENT_KEY);
    if (stored !== null) {
      setGeoConsent(stored === 'true');
    }
  }, []);

  const handleGeoConsent = (accept: boolean) => {
    setGeoConsent(accept);
    localStorage.setItem(LGPD_CONSENT_KEY, String(accept));
    if (accept) {
      toast.success('Localização autorizada');
    }
  };

  // Upload de selfie base64 para Supabase Storage
  const uploadSelfieBase64 = useCallback(async (base64: string): Promise<string | null> => {
    if (!user?.id || !tenant?.id) return null;
    try {
      const res = await fetch(base64);
      const blob = await res.blob();
      const path = `${tenant.id}/${user.id}/${Date.now()}.jpg`;
      const { error } = await supabase.storage
        .from('attendance-selfies')
        .upload(path, blob, { contentType: 'image/jpeg' });
      if (error) {
        console.error('[MeuPonto] Erro upload selfie:', error);
        return null;
      }
      const { data: urlData } = supabase.storage
        .from('attendance-selfies')
        .getPublicUrl(path);
      return urlData?.publicUrl || null;
    } catch (err) {
      console.error('[MeuPonto] Erro ao processar selfie:', err);
      return null;
    }
  }, [user?.id, tenant?.id]);

  // Step 1: Usuário clica "Registrar Entrada/Saída" → abre câmera
  const handleStartRegistro = (action: 'entrada' | 'saida') => {
    setPendingAction(action);
    setStep('camera');
  };

  // Step 2: Foto capturada → vai para confirmação
  const handlePhotoCapture = (base64: string) => {
    setCapturedSelfie(base64);
    setStep('confirm');
  };

  // Step 3: Confirma → registra ponto
  const handleConfirmRegistro = async () => {
    if (!capturedSelfie) return;
    setStep('registrando');

    try {
      const options: ClockOptions = { registro_origem: 'self_service' };

      if (geoConsent) {
        const pos = await requestPosition();
        if (pos) {
          options.latitude = pos.latitude;
          options.longitude = pos.longitude;
          options.accuracy = pos.accuracy;
        }
      }

      const url = await uploadSelfieBase64(capturedSelfie);
      if (url) options.selfie_url = url;

      if (pendingAction === 'entrada') {
        await clockIn(options);
      } else {
        await clockOut(options);
      }

      setSuccessTime(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
      setStep('success');

      // Volta para normal após 5s
      setTimeout(() => {
        setStep('normal');
        setCapturedSelfie(null);
      }, 5000);
    } catch (err) {
      console.error('[MeuPonto] Erro ao registrar:', err);
      toast.error('Erro ao registrar. Tente novamente.');
      setStep('confirm'); // volta para confirm para tentar de novo
    }
  };

  // Cancelar e voltar
  const handleCancelFlow = () => {
    setStep('normal');
    setCapturedSelfie(null);
  };

  // Estado de carregamento
  if (isDetecting || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Não é CLT
  if (!isCltEmployee) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <AlertTriangle className="h-16 w-16 text-yellow-500 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Funcionalidade exclusiva CLT</h2>
        <p className="text-muted-foreground max-w-md">
          O registro de ponto está disponível apenas para funcionários com contrato CLT.
          Se você acredita que deveria ter acesso, entre em contato com o RH.
        </p>
      </div>
    );
  }

  // Estado: existe algum registro hoje?
  const hasAnyRecord = todayRecords.length > 0;

  // Últimos 7 dias (mais recentes primeiro)
  const today = new Date().toISOString().split('T')[0];
  const last7Days = days
    .filter(d => d.data <= today)
    .slice(-7)
    .reverse();

  const formatDate = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}`;
  };

  // ===== STEP: CAMERA =====
  if (step === 'camera') {
    return (
      <div className="space-y-4">
        <div className="text-center">
          <p className="text-lg font-semibold">{employee?.nome}</p>
          <p className="text-sm text-muted-foreground">
            Tire sua foto para registrar:{' '}
            <span className="font-semibold text-primary">
              {nextPunchLabel}
            </span>
          </p>
        </div>

        <CameraCapture
          onCapture={handlePhotoCapture}
          onCancel={handleCancelFlow}
        />
      </div>
    );
  }

  // ===== STEP: CONFIRM =====
  if (step === 'confirm' && capturedSelfie) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="rounded-lg overflow-hidden mb-4">
              <img
                src={capturedSelfie}
                alt="Sua foto"
                className="w-full aspect-[4/3] object-cover"
              />
            </div>

            <p className="text-center text-sm text-muted-foreground mb-4">
              {employee?.nome}
            </p>

            <Button
              className={`w-full h-14 text-lg font-bold ${
                pendingAction === 'entrada'
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-orange-500 hover:bg-orange-600'
              }`}
              onClick={handleConfirmRegistro}
            >
              {pendingAction === 'entrada' ? (
                <LogIn className="h-5 w-5 mr-2" />
              ) : (
                <LogOut className="h-5 w-5 mr-2" />
              )}
              CONFIRMAR {nextPunchLabel.toUpperCase()}
            </Button>

            <Button
              variant="ghost"
              className="w-full mt-2 text-muted-foreground"
              onClick={() => {
                setCapturedSelfie(null);
                setStep('camera');
              }}
            >
              <Camera className="h-4 w-4 mr-2" />
              Tirar outra foto
            </Button>
          </CardContent>
        </Card>

        <Button variant="outline" className="w-full" onClick={handleCancelFlow}>
          Cancelar
        </Button>
      </div>
    );
  }

  // ===== STEP: REGISTRANDO =====
  if (step === 'registrando') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg font-semibold">Registrando ponto...</p>
        <p className="text-sm text-muted-foreground">Aguarde um momento</p>
      </div>
    );
  }

  // ===== STEP: SUCCESS =====
  if (step === 'success') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] text-center">
        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-4 animate-bounce">
          <CheckCircle2 className="h-12 w-12 text-green-500" />
        </div>
        <h2 className="text-2xl font-bold mb-1">
          {nextPunchLabel} registrada!
        </h2>
        <p className="text-3xl font-mono font-bold mb-2">{successTime}</p>
        <p className="text-sm text-muted-foreground">
          Voltando em instantes...
        </p>
      </div>
    );
  }

  // ===== STEP: NORMAL (tela principal) =====
  return (
    <div className="space-y-6">
      {/* Banner LGPD */}
      {geoConsent === null && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="space-y-2">
                <p className="text-sm text-blue-800 font-medium">
                  Aviso de Privacidade (LGPD)
                </p>
                <p className="text-xs text-blue-700">
                  Para fins de controle de ponto, sua localização poderá ser coletada
                  no momento do registro de entrada e saída. Os dados serão utilizados
                  exclusivamente para gestão de jornada de trabalho.
                </p>
                <div className="flex gap-2 pt-1">
                  <Button
                    size="sm"
                    onClick={() => handleGeoConsent(true)}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <MapPin className="h-3.5 w-3.5 mr-1" />
                    Autorizar Localização
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Header com data e hora */}
      <div className="text-center space-y-1">
        {employee && (
          <p className="text-sm text-muted-foreground">{employee.nome}</p>
        )}
        <p className="text-lg font-medium">
          {currentTime.toLocaleDateString('pt-BR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        </p>
        <p className="text-5xl font-bold tabular-nums tracking-tight">
          {currentTime.toLocaleTimeString('pt-BR')}
        </p>
        {geoConsent && (
          <div className="flex items-center justify-center gap-1 text-xs text-green-600">
            <MapPin className="h-3 w-3" />
            Localização ativa
          </div>
        )}
      </div>

      {/* Registros de hoje (múltiplas batidas) */}
      {hasAnyRecord && (
        <div className="space-y-2">
          {todayRecords.map((r, idx) => (
            <div key={r.id} className="flex items-center justify-center gap-3 text-sm">
              <span className="flex items-center gap-1 text-green-600">
                <LogIn className="h-3.5 w-3.5" />
                {r.checkin_em ? timestampToTime(r.checkin_em) : '--:--'}
              </span>
              {r.checkout_em ? (
                <span className="flex items-center gap-1 text-orange-600">
                  <LogOut className="h-3.5 w-3.5" />
                  {timestampToTime(r.checkout_em)}
                </span>
              ) : (
                <span className="text-orange-500 font-medium text-xs">Saída pendente</span>
              )}
            </div>
          ))}
          {todayEntry && (
            <div className="text-center text-xs text-muted-foreground">
              Total: <span className="font-semibold">{minutesToTime(todayEntry.hours_worked_minutes)}</span>
            </div>
          )}
        </div>
      )}

      {/* Botão principal - abre câmera */}
      <div className="space-y-3">
        {nextAction === 'entrada' ? (
          <Button
            className="w-full h-16 text-lg font-semibold bg-green-600 hover:bg-green-700"
            onClick={() => handleStartRegistro('entrada')}
          >
            <LogIn className="h-5 w-5 mr-2" />
            {nextPunchLabel}
          </Button>
        ) : (
          <Button
            className="w-full h-16 text-lg font-semibold bg-orange-500 hover:bg-orange-600"
            onClick={() => handleStartRegistro('saida')}
          >
            <LogOut className="h-5 w-5 mr-2" />
            {nextPunchLabel}
          </Button>
        )}
      </div>

      <Separator />

      {/* Últimos 7 dias */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Últimos 7 dias
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {last7Days.map(d => (
            <div
              key={d.data}
              className="flex items-center justify-between py-1.5 text-sm"
            >
              <div className="flex items-center gap-2 min-w-[100px]">
                <span className="font-medium w-12">{formatDate(d.data)}</span>
                <span className="text-muted-foreground text-xs w-8">
                  {DIAS_SEMANA_SHORT[d.weekday]}
                </span>
              </div>
              <div className="flex items-center gap-1">
                {d.status === 'presente' && d.checkin_em && d.checkout_em ? (
                  <span className="text-xs tabular-nums">
                    {timestampToTime(d.checkin_em)} - {timestampToTime(d.checkout_em)}
                  </span>
                ) : d.status === 'presente' && d.checkin_em ? (
                  <span className="text-xs text-yellow-600 tabular-nums">
                    {timestampToTime(d.checkin_em)} - ...
                  </span>
                ) : d.status === 'falta_justificada' && (d as Record<string, unknown>).justificativa_tipo ? (
                  <span className="text-xs text-amber-600 truncate max-w-[120px]" title={((d as Record<string, unknown>).justificativa_observacoes as string) || ''}>
                    {JUSTIFICATIVA_TIPO_LABELS[(d as Record<string, unknown>).justificativa_tipo as keyof typeof JUSTIFICATIVA_TIPO_LABELS] || (d as Record<string, unknown>).justificativa_tipo as string}
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </div>
              <StatusBadge status={d.status} />
            </div>
          ))}
          {last7Days.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum registro encontrado
            </p>
          )}
        </CardContent>
      </Card>

      {/* Resumo mensal */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            Resumo — {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <SummaryItem
              icon={<Timer className="h-4 w-4 text-blue-500" />}
              label="Horas trabalhadas"
              value={minutesToTime(summary.total_hours_worked_minutes)}
            />
            <SummaryItem
              icon={summary.balance_minutes >= 0
                ? <TrendingUp className="h-4 w-4 text-green-500" />
                : <TrendingDown className="h-4 w-4 text-red-500" />
              }
              label="Saldo"
              value={`${summary.balance_minutes >= 0 ? '+' : '-'}${minutesToTime(Math.abs(summary.balance_minutes))}`}
              valueClassName={summary.balance_minutes >= 0 ? 'text-green-600' : 'text-red-600'}
            />
            <SummaryItem
              icon={<Clock className="h-4 w-4 text-yellow-500" />}
              label="Atrasos"
              value={minutesToTime(summary.total_late_minutes)}
              valueClassName={summary.total_late_minutes > 0 ? 'text-yellow-600' : ''}
            />
            <SummaryItem
              icon={<TrendingUp className="h-4 w-4 text-purple-500" />}
              label="Horas extras"
              value={minutesToTime(summary.total_overtime_minutes)}
              valueClassName={summary.total_overtime_minutes > 0 ? 'text-purple-600' : ''}
            />
            <SummaryItem
              icon={<CheckCircle2 className="h-4 w-4 text-green-500" />}
              label="Dias trabalhados"
              value={String(summary.total_days_worked)}
            />
            <SummaryItem
              icon={<XCircle className="h-4 w-4 text-red-500" />}
              label="Faltas"
              value={String(summary.faltas)}
              valueClassName={summary.faltas > 0 ? 'text-red-600' : ''}
            />
            {((summary as Record<string, unknown>).faltas_justificadas as number) > 0 && (
              <SummaryItem
                icon={<FileText className="h-4 w-4 text-amber-500" />}
                label="Justificadas"
                value={String((summary as Record<string, unknown>).faltas_justificadas)}
                valueClassName="text-amber-600"
              />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Página principal standalone
// NOTE: This page manages its own auth flow (standalone totem login) and is rendered
// OUTSIDE the AuthProvider tree (no ProtectedRoute/DashboardLayout wrapper).
// Therefore, direct supabase.auth calls are required here — useAuth() cannot be used.
export default function MeuPonto() {
  const [authState, setAuthState] = useState<'loading' | 'logged_in' | 'logged_out'>('loading');

  // Verificar se já está autenticado
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthState(session ? 'logged_in' : 'logged_out');
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthState(session ? 'logged_in' : 'logged_out');
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setAuthState('logged_out');
  };

  if (authState === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (authState === 'logged_out') {
    return <MeuPontoLogin onLogin={() => setAuthState('logged_in')} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header minimalista */}
      <header className="sticky top-0 z-40 bg-white border-b shadow-sm">
        <div className="max-w-lg mx-auto px-4 flex items-center justify-between h-14">
          <div className="flex items-center gap-2">
            <Fingerprint className="h-5 w-5 text-primary" />
            <span className="font-semibold text-sm">Meu Ponto</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-muted-foreground hover:text-red-600"
          >
            <LogOut className="h-4 w-4 mr-1" />
            Sair
          </Button>
        </div>
      </header>

      {/* Conteúdo */}
      <main className="max-w-lg mx-auto px-4 py-6">
        <MeuPontoContent />
      </main>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'presente':
      return <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-green-300 text-green-700 bg-green-50">P</Badge>;
    case 'falta':
      return <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-red-300 text-red-700 bg-red-50">F</Badge>;
    case 'falta_justificada':
      return <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-300 text-amber-700 bg-amber-50">FJ</Badge>;
    case 'folga':
      return <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-gray-300 text-gray-600 bg-gray-50">FG</Badge>;
    case 'feriado':
      return <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-blue-300 text-blue-700 bg-blue-50">FE</Badge>;
    case 'domingo':
      return <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-gray-200 text-gray-400">D</Badge>;
    default:
      return <Badge variant="outline" className="text-[10px] px-1.5 py-0">—</Badge>;
  }
}

function SummaryItem({
  icon,
  label,
  value,
  valueClassName = '',
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
      {icon}
      <div>
        <p className="text-[10px] text-muted-foreground leading-tight">{label}</p>
        <p className={`text-sm font-semibold tabular-nums ${valueClassName}`}>{value}</p>
      </div>
    </div>
  );
}
