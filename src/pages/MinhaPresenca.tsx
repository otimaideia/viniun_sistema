import { useState, useEffect, useRef, useCallback } from 'react';
import { useMinhaPresencaMT } from '@/hooks/multitenant/useMinhaPresencaMT';
import { useGeolocation } from '@/hooks/useGeolocation';
import { minutesToTime } from '@/hooks/multitenant/useTimeCardMT';
import type { ClockOptions } from '@/hooks/multitenant/useTimeCardMT';
import { DIAS_SEMANA_SHORT } from '@/types/produtividade';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
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
  ClipboardCheck,
  Eye,
  EyeOff,
} from 'lucide-react';

const LGPD_CONSENT_KEY = 'minha-presenca-lgpd-geo-consent';

function timestampToTime(ts: string): string {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// Tela de login standalone para prestadores
// NOTE: Uses direct supabase.auth.signInWithPassword because this component is standalone
// (outside AuthProvider). See comment on MinhaPresenca component for details.
function MinhaPresencaLogin({ onLogin }: { onLogin: () => void }) {
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
            <ClipboardCheck className="h-7 w-7 text-primary" />
          </div>
          <div>
            <CardTitle className="text-xl">Minha Presenca</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Entre com suas credenciais para confirmar presenca
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

// Conteudo principal da presenca
function MinhaPresencaContent() {
  const { user, tenant } = useTenantContext();
  const {
    isMeiEmployee, isDetecting, employee, currentMonth,
    days, summary, isLoading,
    clockIn, clockOut, todayEntry,
  } = useMinhaPresencaMT();

  const { requestPosition, isRequesting: isGeoRequesting } = useGeolocation();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [geoConsent, setGeoConsent] = useState<boolean | null>(null);
  const [isClocking, setIsClocking] = useState(false);
  const selfieInputRef = useRef<HTMLInputElement>(null);

  // Relogio em tempo real
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
      toast.success('Localizacao autorizada');
    }
  };

  // Upload de selfie para Supabase Storage
  const uploadSelfie = useCallback(async (file: File): Promise<string | null> => {
    if (!user?.id || !tenant?.id) return null;
    const ext = file.name.split('.').pop() || 'jpg';
    const path = `${tenant.id}/${user.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from('attendance-selfies')
      .upload(path, file, { contentType: file.type });
    if (error) {
      console.error('[MinhaPresenca] Erro upload selfie:', error);
      return null;
    }
    const { data: urlData } = supabase.storage
      .from('attendance-selfies')
      .getPublicUrl(path);
    return urlData?.publicUrl || null;
  }, [user?.id, tenant?.id]);

  // Check-in
  const handleCheckIn = async () => {
    setIsClocking(true);
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

      const file = selfieInputRef.current?.files?.[0];
      if (file) {
        const url = await uploadSelfie(file);
        if (url) options.selfie_url = url;
        if (selfieInputRef.current) selfieInputRef.current.value = '';
      }

      await clockIn(options);
    } catch (err) {
      console.error('[MinhaPresenca] Erro check-in:', err);
      toast.error('Erro ao confirmar check-in');
    } finally {
      setIsClocking(false);
    }
  };

  // Check-out
  const handleCheckOut = async () => {
    setIsClocking(true);
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

      const file = selfieInputRef.current?.files?.[0];
      if (file) {
        const url = await uploadSelfie(file);
        if (url) options.selfie_url = url;
        if (selfieInputRef.current) selfieInputRef.current.value = '';
      }

      await clockOut(options);
    } catch (err) {
      console.error('[MinhaPresenca] Erro check-out:', err);
      toast.error('Erro ao confirmar check-out');
    } finally {
      setIsClocking(false);
    }
  };

  // Estado de carregamento
  if (isDetecting || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Nao e MEI
  if (!isMeiEmployee) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <AlertTriangle className="h-16 w-16 text-yellow-500 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Funcionalidade exclusiva para prestadores</h2>
        <p className="text-muted-foreground max-w-md">
          O registro de presenca esta disponivel apenas para prestadores de servico (MEI).
          Se voce e CLT, acesse "Meu Ponto". Se acredita que deveria ter acesso, entre em contato com o responsavel da unidade.
        </p>
      </div>
    );
  }

  // Determinar estado do botao
  const hasCheckin = !!todayEntry?.checkin_em;
  const hasCheckout = !!todayEntry?.checkout_em;

  // Ultimos 7 dias (mais recentes primeiro)
  const today = new Date().toISOString().split('T')[0];
  const last7Days = days
    .filter(d => d.data <= today)
    .slice(-7)
    .reverse();

  const formatDate = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}`;
  };

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
                  Para fins de controle de presenca, sua localizacao podera ser coletada
                  no momento do check-in e check-out. Os dados serao utilizados
                  exclusivamente para gestao de disponibilidade de servico.
                </p>
                <div className="flex gap-2 pt-1">
                  <Button
                    size="sm"
                    onClick={() => handleGeoConsent(true)}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <MapPin className="h-3.5 w-3.5 mr-1" />
                    Autorizar Localizacao
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleGeoConsent(false)}
                  >
                    Prosseguir sem
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
            Localizacao ativa
          </div>
        )}
      </div>

      {/* Botao principal */}
      <div className="space-y-3">
        {!hasCheckin && (
          <Button
            className="w-full h-16 text-lg font-semibold bg-green-600 hover:bg-green-700"
            onClick={handleCheckIn}
            disabled={isClocking || isGeoRequesting}
          >
            {isClocking ? (
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            ) : (
              <LogIn className="h-5 w-5 mr-2" />
            )}
            {isClocking ? 'Confirmando...' : 'Confirmar Check-in'}
          </Button>
        )}

        {hasCheckin && !hasCheckout && (
          <>
            <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
              <p className="text-xs text-green-600 font-medium">Check-in confirmado</p>
              <p className="text-2xl font-bold text-green-700">
                {todayEntry?.checkin_em ? timestampToTime(todayEntry.checkin_em) : '--:--'}
              </p>
            </div>
            <Button
              className="w-full h-16 text-lg font-semibold bg-orange-500 hover:bg-orange-600"
              onClick={handleCheckOut}
              disabled={isClocking || isGeoRequesting}
            >
              {isClocking ? (
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              ) : (
                <LogOut className="h-5 w-5 mr-2" />
              )}
              {isClocking ? 'Confirmando...' : 'Confirmar Check-out'}
            </Button>
          </>
        )}

        {hasCheckin && hasCheckout && (
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-3 bg-green-50 rounded-lg border border-green-200">
              <p className="text-xs text-green-600 font-medium">Check-in</p>
              <p className="text-xl font-bold text-green-700">
                {todayEntry?.checkin_em ? timestampToTime(todayEntry.checkin_em) : '--:--'}
              </p>
            </div>
            <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
              <p className="text-xs text-orange-600 font-medium">Check-out</p>
              <p className="text-xl font-bold text-orange-700">
                {todayEntry?.checkout_em ? timestampToTime(todayEntry.checkout_em) : '--:--'}
              </p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-xs text-blue-600 font-medium">Total</p>
              <p className="text-xl font-bold text-blue-700">
                {todayEntry ? minutesToTime(todayEntry.hours_worked_minutes) : '--:--'}
              </p>
            </div>
          </div>
        )}

        {/* Selfie (opcional) */}
        {(!hasCheckin || (hasCheckin && !hasCheckout)) && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => selfieInputRef.current?.click()}
            >
              <Camera className="h-4 w-4 mr-2" />
              Tirar selfie (opcional)
            </Button>
            <input
              ref={selfieInputRef}
              type="file"
              accept="image/*"
              capture="user"
              className="hidden"
            />
          </div>
        )}
      </div>

      <Separator />

      {/* Ultimos 7 dias */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Ultimos 7 dias
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
              label="Horas presentes"
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
              icon={<CheckCircle2 className="h-4 w-4 text-green-500" />}
              label="Dias presentes"
              value={String(summary.total_days_worked)}
            />
            <SummaryItem
              icon={<XCircle className="h-4 w-4 text-red-500" />}
              label="Ausencias"
              value={String(summary.faltas)}
              valueClassName={summary.faltas > 0 ? 'text-red-600' : ''}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Pagina principal standalone
// NOTE: This page manages its own auth flow (standalone totem login) and is rendered
// OUTSIDE the AuthProvider tree (no ProtectedRoute/DashboardLayout wrapper).
// Therefore, direct supabase.auth calls are required here — useAuth() cannot be used.
export default function MinhaPresenca() {
  const [authState, setAuthState] = useState<'loading' | 'logged_in' | 'logged_out'>('loading');

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
    return <MinhaPresencaLogin onLogin={() => setAuthState('logged_in')} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header minimalista */}
      <header className="sticky top-0 z-40 bg-white border-b shadow-sm">
        <div className="max-w-lg mx-auto px-4 flex items-center justify-between h-14">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-primary" />
            <span className="font-semibold text-sm">Minha Presenca</span>
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

      {/* Conteudo */}
      <main className="max-w-lg mx-auto px-4 py-6">
        <MinhaPresencaContent />
      </main>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'presente':
      return <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-green-300 text-green-700 bg-green-50">P</Badge>;
    case 'falta':
      return <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-red-300 text-red-700 bg-red-50">A</Badge>;
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
