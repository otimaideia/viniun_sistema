import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useClienteMagicAuth } from '@/hooks/useClienteMagicAuth';
import { useDisponibilidade } from '@/hooks/multitenant/useAgendamentosMT';
import { supabase } from '@/integrations/supabase/client';
import { useClienteAgendarPublic } from '@/hooks/public/useClienteAgendarPublic';
import { Lead } from '@/types/lead-mt';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Calendar, Clock, MapPin, CheckCircle2, Loader2,
  ChevronLeft, ChevronRight, Sparkles, User, Mail, Phone,
  Building2, Gift,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// Utilitários de data
function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

function getDayName(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00');
  return date.toLocaleDateString('pt-BR', { weekday: 'long' });
}

function getMonthYear(date: Date): string {
  return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

function toDateString(date: Date): string {
  return date.toISOString().split('T')[0];
}

function formatPhone(phone: string | null | undefined): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 13) return `(${digits.slice(2, 4)}) ${digits.slice(4, 9)}-${digits.slice(9)}`;
  if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  if (digits.length === 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return phone;
}

function formatFullAddress(f: Franchise): string {
  const parts = [f.endereco];
  if (f.numero) parts.push(f.numero);
  if (f.complemento) parts.push(f.complemento);
  return parts.join(', ');
}

function formatAddressLine2(f: Franchise): string {
  const parts = [];
  if (f.bairro) parts.push(f.bairro);
  if (f.cidade) parts.push(f.cidade + (f.estado ? `/${f.estado}` : ''));
  if (f.cep) parts.push(`CEP ${f.cep}`);
  return parts.join(' - ');
}

interface Franchise {
  id: string;
  nome_fantasia: string;
  nome: string;
  cidade: string;
  estado?: string;
  whatsapp?: string;
  endereco?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cep?: string;
  horario_funcionamento?: Record<string, { abre: string; fecha: string } | null> | null;
}

interface TenantBranding {
  cor_primaria: string;
  cor_primaria_hover: string;
  cor_secundaria: string;
  logo_url: string | null;
  logo_branco_url: string | null;
  nome_fantasia: string;
}

const DEFAULT_COLOR = '#662E8E';
const DEFAULT_HOVER = '#5a2680';
const DEFAULT_SECONDARY = '#5DC4DA';

export default function ClienteAgendar() {
  const navigate = useNavigate();
  const { franchiseSlug } = useParams<{ franchiseSlug: string }>();
  const { isAuthenticating, lead: magicLead, error: authError, hasToken, checkExistingAuth } = useClienteMagicAuth();
  const {
    fetchBranding, fetchFranchiseBySlug, fetchFranchiseDetailBySlug,
    fetchFranchisesByTenant, createMagicToken, logAppointmentNotifications,
  } = useClienteAgendarPublic();

  const [lead, setLead] = useState<Lead | null>(null);
  const [franchises, setFranchises] = useState<Franchise[]>([]);
  const [selectedFranchise, setSelectedFranchise] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [createdAppointment, setCreatedAppointment] = useState<any>(null);
  const [branding, setBranding] = useState<TenantBranding | null>(null);

  const primaryColor = branding?.cor_primaria || DEFAULT_COLOR;
  const primaryHover = branding?.cor_primaria_hover || DEFAULT_HOVER;
  const secondaryColor = branding?.cor_secundaria || DEFAULT_SECONDARY;
  const tenantName = branding?.nome_fantasia || '';
  const logoUrl = branding?.logo_branco_url || branding?.logo_url || null;

  const franchise = franchises.find(f => f.id === selectedFranchise);

  const { slots, isLoading: isSlotsLoading } = useDisponibilidade(
    selectedFranchise || undefined,
    selectedDate || undefined,
    undefined,
    franchise?.horario_funcionamento
  );

  // Resolver lead: magic auth → localStorage → URL params
  useEffect(() => {
    if (magicLead) {
      setLead(magicLead);
      return;
    }
    if (!hasToken) {
      const existingLead = checkExistingAuth();
      if (existingLead) {
        setLead(existingLead);
        return;
      }
    }
    // Fallback: se tem franchiseSlug mas sem dados no localStorage, buscar tenant do franchise
    if (franchiseSlug) {
      const fetchTenantFromSlug = async () => {
        const f = await fetchFranchiseBySlug(franchiseSlug);
        if (f) {
          setLead({ id: '', nome: 'Cliente', tenant_id: f.tenant_id, franchise_id: f.id } as Lead);
        }
      };
      fetchTenantFromSlug();
    }
  }, [magicLead, hasToken, checkExistingAuth, franchiseSlug]);

  // Buscar branding do tenant
  useEffect(() => {
    if (!lead?.tenant_id) return;
    const loadBranding = async () => {
      const b = await fetchBranding(lead.tenant_id);
      setBranding(b);
    };
    loadBranding();
  }, [lead?.tenant_id]);

  // Detectar franquia pelo domínio
  const detectFranchiseByDomain = (list: Franchise[]): string | null => {
    const hostname = window.location.hostname.toLowerCase();
    for (const f of list) {
      const cidade = (f.cidade || '').toLowerCase().replace(/\s+/g, '');
      if (cidade && hostname.includes(cidade)) return f.id;
      const parts = (f.nome_fantasia || f.nome || '').toLowerCase().split(/\s+/);
      for (const p of parts) { if (p.length > 3 && hostname.includes(p)) return f.id; }
    }
    if (hostname === 'localhost' || hostname === '127.0.0.1') return list[0]?.id || null;
    return null;
  };

  // Buscar franquias e auto-selecionar
  useEffect(() => {
    if (!lead?.tenant_id) return;
    const fetchData = async () => {
      // Se tem slug na URL, buscar franchise direto pelo slug (mais rapido)
      if (franchiseSlug) {
        const slugFranchise = await fetchFranchiseDetailBySlug(franchiseSlug);

        if (slugFranchise) {
          setFranchises([slugFranchise]);
          setSelectedFranchise(slugFranchise.id);
          // Se nao tem tenant_id no lead, pegar do franchise
          if (!lead.tenant_id && slugFranchise.tenant_id) {
            setLead(prev => prev ? { ...prev, tenant_id: slugFranchise.tenant_id } : prev);
          }
          return;
        }
      }

      // Fallback: buscar todas as franquias do tenant
      const data = await fetchFranchisesByTenant(lead.tenant_id);
      if (data) {
        setFranchises(data);
        if (lead.franchise_id && data.some(f => f.id === lead.franchise_id)) {
          setSelectedFranchise(lead.franchise_id);
        } else {
          const d = detectFranchiseByDomain(data);
          setSelectedFranchise(d || data[0]?.id || '');
        }
      }
    };
    fetchData();
  }, [lead?.tenant_id, lead?.franchise_id, franchiseSlug]);

  // Calendário
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const dayNames = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
    const horario = franchise?.horario_funcionamento;
    const isClosedDay = (dow: number) => {
      if (!horario) return dow === 0;
      const s = horario[dayNames[dow]];
      return s === null || s === undefined;
    };
    const days: { date: string; day: number; isCurrentMonth: boolean; isPast: boolean; isToday: boolean; isClosed: boolean }[] = [];
    const startDow = firstDay.getDay();
    for (let i = startDow - 1; i >= 0; i--) {
      const d = new Date(year, month, -i);
      days.push({ date: toDateString(d), day: d.getDate(), isCurrentMonth: false, isPast: true, isToday: false, isClosed: isClosedDay(d.getDay()) });
    }
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const date = new Date(year, month, d);
      days.push({ date: toDateString(date), day: d, isCurrentMonth: true, isPast: date < today, isToday: date.getTime() === today.getTime(), isClosed: isClosedDay(date.getDay()) });
    }
    return days;
  }, [currentMonth, franchise?.horario_funcionamento]);

  // Horários
  const availableSlots = useMemo(() => {
    if (!slots.length) return [];
    const now = new Date();
    const isToday = selectedDate === toDateString(now);
    return slots.filter(s => {
      if (!s.disponivel) return false;
      if (isToday) {
        const [h, m] = s.hora.split(':').map(Number);
        return h * 60 + m > now.getHours() * 60 + now.getMinutes() + 30;
      }
      return true;
    });
  }, [slots, selectedDate]);

  // Confirmar agendamento
  const handleConfirm = async () => {
    if (!lead || !selectedFranchise || !selectedDate || !selectedTime) return;
    setIsSubmitting(true);
    try {
      // Se lead.id está vazio (CORS falhou na criação), buscar pelo telefone/email
      let resolvedLeadId = lead.id || null;
      if (!resolvedLeadId && (lead.telefone || lead.email)) {
        const orConds: string[] = [];
        if (lead.telefone) orConds.push(`telefone.eq.${lead.telefone}`);
        if (lead.whatsapp) orConds.push(`whatsapp.eq.${lead.whatsapp}`);
        if (lead.email) orConds.push(`email.eq.${lead.email}`);
        if (orConds.length > 0) {
          const { data: foundLead } = await supabase
            .from('mt_leads')
            .select('id')
            .eq('tenant_id', lead.tenant_id)
            .or(orConds.join(','))
            .maybeSingle();
          if (foundLead) {
            resolvedLeadId = foundLead.id;
            // Atualizar lead no state e localStorage
            const updatedLead = { ...lead, id: foundLead.id };
            setLead(updatedLead);
            localStorage.setItem('mt_cliente_data', JSON.stringify(updatedLead));
          }
        }
      }

      // Buscar nome do influenciador que indicou (se houver)
      let influencerNome = '';
      if (resolvedLeadId) {
        try {
          const { data: referral } = await supabase
            .from('mt_influencer_referrals')
            .select('influencer_id, influencer:mt_influencers(nome, nome_artistico)')
            .eq('lead_id', resolvedLeadId)
            .maybeSingle();
          if (referral?.influencer) {
            const inf = referral.influencer as { nome?: string; nome_artistico?: string };
            influencerNome = inf.nome || inf.nome_artistico || '';
          }
        } catch {}
      }

      const servicoNome = 'Avaliação + Sessões de Serviços Exclusivos';

      const { data: appointment, error: createError } = await supabase
        .from('mt_appointments')
        .insert({
          tenant_id: lead.tenant_id,
          franchise_id: selectedFranchise,
          lead_id: resolvedLeadId || null,
          tipo: 'cortesia',
          cliente_nome: lead.nome || 'Cliente',
          cliente_telefone: lead.telefone || lead.whatsapp || null,
          cliente_email: lead.email || null,
          servico_nome: servicoNome,
          data_agendamento: selectedDate,
          hora_inicio: selectedTime,
          duracao_minutos: 50,
          status: 'agendado',
          confirmado: true,
          confirmado_em: new Date().toISOString(),
          confirmado_via: 'portal_cliente',
          origem: 'portal_cliente',
          cortesia_motivo: influencerNome
            ? `Indicação de ${influencerNome} - cortesia via formulário`
            : 'Indicação - cortesia via formulário',
        })
        .select()
        .single();

      if (createError) throw createError;
      setCreatedAppointment(appointment);

      const firstName = (lead.nome || 'Cliente').split(' ')[0];
      const dateFormatted = formatDate(selectedDate);
      const dayName = getDayName(selectedDate);
      const franchiseName = franchise?.nome_fantasia || franchise?.nome || 'Unidade';
      const indicadoPor = influencerNome ? `\n*Indicado por:* ${influencerNome}` : '';

      // ===== GERAR LINKS COM TOKENS =====
      const origin = window.location.origin;

      // Token para o cliente (acesso ao painel de agendamentos)
      let clienteTokenLink = '';
      if (resolvedLeadId) {
        try {
          const clienteToken = await createMagicToken({
            tenant_id: lead.tenant_id,
            lead_id: resolvedLeadId,
            type: 'cliente',
          });
          clienteTokenLink = `${origin}/cliente/agendar/${franchiseSlug || ''}?token=${clienteToken}`;
        } catch {}
      }

      // Token para o influenciador (acesso à área de indicações)
      let influencerTokenLink = '';
      let influencerData: { id: string; tenant_id: string; nome?: string; nome_artistico?: string } | null = null;
      if (resolvedLeadId) {
        try {
          const { data: referral } = await supabase
            .from('mt_influencer_referrals')
            .select('influencer_id, influencer:mt_influencers(id, whatsapp, nome, tenant_id)')
            .eq('lead_id', resolvedLeadId)
            .maybeSingle();
          if (referral?.influencer) {
            influencerData = referral.influencer as typeof influencerData;
            const infToken = await createMagicToken({
              tenant_id: influencerData.tenant_id,
              influencer_id: influencerData.id,
              type: 'influenciador',
            });
            influencerTokenLink = `${origin}/influenciadores/painel?token=${infToken}`;
          }
        } catch {}
      }

      // Link para a empresa (lead no painel admin)
      const leadAdminLink = resolvedLeadId ? `${origin}/leads/${resolvedLeadId}` : '';

      // ===== NOTIFICAÇÕES WHATSAPP (3 destinatários) =====

      // 1. Notificar a FRANQUIA/EMPRESA
      const franchisePhone = String(franchise?.whatsapp || '').replace(/\D/g, '');
      if (franchisePhone) {
        const empresaMsg = `📅 *Novo agendamento online!*\n\n` +
          `*Cliente:* ${lead.nome}\n` +
          `*Telefone:* ${lead.telefone || lead.whatsapp || 'não informado'}\n` +
          `*Email:* ${lead.email || 'não informado'}\n` +
          `*Serviço:* ${servicoNome}\n` +
          `*Data:* ${dateFormatted} (${dayName})\n` +
          `*Horário:* ${selectedTime}\n` +
          `*Tipo:* Cortesia (indicação)${indicadoPor}\n` +
          `*Unidade:* ${franchiseName}\n` +
          (franchise?.endereco ? `📌 ${formatFullAddress(franchise)}` + (franchise?.bairro ? ` - ${franchise.bairro}` : '') + '\n' : '') +
          (leadAdminLink ? `\n🔗 *Ver lead:* ${leadAdminLink}\n` : '') +
          `\n_Agendado via Portal do Cliente_`;

        supabase.functions.invoke('whatsapp-send', {
          body: {
            phone: franchisePhone.startsWith('55') ? franchisePhone : `55${franchisePhone}`,
            message: empresaMsg,
            tenant_id: lead.tenant_id,
          }
        }).catch(() => {});
      }

      // 2. Confirmar para o CLIENTE
      const rawClientPhone = String(lead.telefone || lead.whatsapp || '').replace(/\D/g, '');
      const clientPhone = rawClientPhone
        ? (rawClientPhone.startsWith('55') ? rawClientPhone : `55${rawClientPhone}`)
        : '';
      if (clientPhone) {
        const clienteMsg = `✅ *Agendamento confirmado!*\n\n` +
          `${firstName}, sua sessão está marcada:\n\n` +
          `📅 *${dateFormatted}* (${dayName})\n` +
          `🕐 *${selectedTime}*\n` +
          `💆 ${servicoNome}\n` +
          `📍 ${franchiseName}` +
          (franchise?.endereco ? `\n📌 ${formatFullAddress(franchise)}` + (franchise?.bairro ? ` - ${franchise.bairro}` : '') : '') +
          (influencerNome ? `\n\n🎁 Indicação de *${influencerNome}*` : '') +
          (clienteTokenLink ? `\n\n📋 *Sua agenda:* ${clienteTokenLink}` : '') +
          `\n\nTe esperamos! 😊`;

        supabase.functions.invoke('whatsapp-send', {
          body: { phone: clientPhone, message: clienteMsg, tenant_id: lead.tenant_id }
        }).catch(() => {});
      }

      // 3. Notificar o INFLUENCIADOR que indicou
      if (influencerData) {
        const infPhone = String(influencerData.whatsapp || '').replace(/\D/g, '');
        if (infPhone) {
          const infMsg = `🎉 *Boa notícia, ${influencerData.nome}!*\n\n` +
            `*${lead.nome}*, que você indicou, acabou de agendar uma sessão cortesia!\n\n` +
            `📅 *${dateFormatted}* (${dayName})\n` +
            `🕐 *${selectedTime}*\n` +
            `📍 ${franchiseName}\n` +
            (influencerTokenLink ? `\n🔗 *Suas indicações:* ${influencerTokenLink}\n` : '') +
            `\nObrigado pela indicação! 💜`;

          supabase.functions.invoke('whatsapp-send', {
            body: {
              phone: infPhone.startsWith('55') ? infPhone : `55${infPhone}`,
              message: infMsg,
              tenant_id: lead.tenant_id,
            }
          }).catch(() => {});
        }
      }

      // Log notificacoes (fire-and-forget)
      logAppointmentNotifications({
        tenant_id: lead.tenant_id,
        franchise_id: selectedFranchise,
        appointment_id: appointment.id,
      });

      setIsSuccess(true);
      toast.success('Agendamento confirmado!');
    } catch (err) {
      console.error('Erro ao criar agendamento:', err);
      toast.error('Erro ao agendar. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // === LOADING ===
  if (isAuthenticating) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}>
        <div className="text-center text-white">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4" />
          <p className="text-lg font-medium opacity-90">Preparando seu acesso...</p>
        </div>
      </div>
    );
  }

  // === ERRO ===
  if (authError && !lead) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: `linear-gradient(135deg, ${primaryColor}15, white)` }}>
        <Card className="max-w-md w-full shadow-xl rounded-2xl">
          <CardContent className="pt-8 pb-8 text-center">
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <Calendar className="h-10 w-10 text-red-400" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Link inválido</h2>
            <p className="text-gray-500 mb-8">{authError}</p>
            <Button onClick={() => navigate('/cliente')} variant="outline" className="rounded-xl px-8">
              Fazer login manualmente
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // === SEM LEAD ===
  if (!lead) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: `linear-gradient(135deg, ${primaryColor}15, white)` }}>
        <Card className="max-w-md w-full shadow-xl rounded-2xl">
          <CardContent className="pt-8 pb-8 text-center">
            <p className="text-gray-500 mb-6">Faça login para agendar sua sessão</p>
            <Button onClick={() => navigate('/cliente')} className="rounded-xl px-8" style={{ backgroundColor: primaryColor }}>
              Ir para login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // === SUCESSO ===
  if (isSuccess && createdAppointment) {
    const sf = franchises.find(f => f.id === selectedFranchise);
    return (
      <div className="min-h-screen" style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}>
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card className="max-w-md w-full shadow-2xl rounded-2xl overflow-hidden">
            {/* Badge de sucesso */}
            <div className="pt-10 pb-6 text-center" style={{ background: `linear-gradient(135deg, ${primaryColor}08, ${primaryColor}15)` }}>
              <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5 shadow-lg">
                <CheckCircle2 className="h-12 w-12 text-green-500" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Agendamento Confirmado!</h2>
              <p className="text-gray-500 mt-1">Você receberá uma confirmação por WhatsApp</p>
            </div>

            <CardContent className="px-6 pb-8">
              {/* Dados do agendamento */}
              <div className="rounded-xl p-5 my-4 space-y-3 border" style={{ borderColor: `${primaryColor}30`, backgroundColor: `${primaryColor}05` }}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${primaryColor}15` }}>
                    <Calendar className="h-4 w-4" style={{ color: primaryColor }} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Data</p>
                    <p className="font-semibold text-gray-900">{formatDate(selectedDate)} ({getDayName(selectedDate)})</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${primaryColor}15` }}>
                    <Clock className="h-4 w-4" style={{ color: primaryColor }} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Horário</p>
                    <p className="font-semibold text-gray-900">{selectedTime}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${primaryColor}15` }}>
                    <Sparkles className="h-4 w-4" style={{ color: primaryColor }} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Serviço</p>
                    <p className="font-semibold text-gray-900">Avaliação + Sessões de Serviços Exclusivos</p>
                  </div>
                </div>
                {sf && (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${primaryColor}15` }}>
                      <MapPin className="h-4 w-4" style={{ color: primaryColor }} />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Unidade</p>
                      <p className="font-semibold text-gray-900">{sf.nome_fantasia || sf.nome}</p>
                      {sf.endereco && <p className="text-xs text-gray-500">{formatFullAddress(sf)}</p>}
                      {(sf.bairro || sf.cidade) && <p className="text-xs text-gray-400">{formatAddressLine2(sf)}</p>}
                    </div>
                  </div>
                )}
              </div>

              {/* Dados do cliente */}
              <div className="rounded-xl p-4 mb-6 bg-gray-50 space-y-2">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Seus dados</p>
                <p className="text-sm text-gray-700 flex items-center gap-2"><User className="h-3.5 w-3.5 text-gray-400" /> {lead.nome}</p>
                {lead.email && <p className="text-sm text-gray-700 flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-gray-400" /> {lead.email}</p>}
                {(lead.telefone || lead.whatsapp) && <p className="text-sm text-gray-700 flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-gray-400" /> {formatPhone(lead.telefone || lead.whatsapp)}</p>}
              </div>

              <div className="space-y-3">
                <Button
                  onClick={() => navigate('/cliente/dashboard')}
                  className="w-full py-6 text-base font-bold rounded-xl shadow-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-xl"
                  style={{ backgroundColor: primaryColor }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = primaryHover)}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = primaryColor)}
                >
                  Ir para meu painel
                </Button>
                <Button
                  onClick={() => { setIsSuccess(false); setSelectedDate(''); setSelectedTime(''); setCreatedAppointment(null); }}
                  variant="outline"
                  className="w-full py-5 rounded-xl"
                >
                  Agendar outra sessão
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // === TELA PRINCIPAL ===
  const firstName = (lead.nome || 'Cliente').split(' ')[0];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header com gradiente */}
      <div className="relative overflow-hidden text-white" style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}>
        {/* Decoração */}
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-10 -translate-y-1/2 translate-x-1/3" style={{ backgroundColor: 'white' }} />
        <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full opacity-10 translate-y-1/2 -translate-x-1/4" style={{ backgroundColor: 'white' }} />

        <div className="relative z-10 max-w-lg mx-auto px-4 pt-8 pb-12">
          {/* Logo/Nome */}
          <div className="flex items-center gap-3 mb-6">
            {logoUrl ? (
              <img src={logoUrl} alt={tenantName} className="h-10 w-auto brightness-0 invert" />
            ) : tenantName ? (
              <span className="text-xl font-bold tracking-wide">{tenantName}</span>
            ) : null}
          </div>

          {/* Saudação */}
          <h1 className="text-2xl md:text-3xl font-bold mb-1">Olá, {firstName}!</h1>
          <p className="text-white/80 text-base">Agende sua sessão cortesia</p>

          {/* Badge presentinho */}
          <div className="mt-4 inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 text-sm font-medium">
            <Gift className="h-4 w-4" />
            10 sessões gratuitas via indicação
          </div>
        </div>

        {/* Wave */}
        <svg viewBox="0 0 1440 60" className="w-full block -mb-px" preserveAspectRatio="none">
          <path d="M0,30 C360,60 720,0 1080,30 C1260,45 1380,30 1440,30 L1440,60 L0,60 Z" fill="#f9fafb" />
        </svg>
      </div>

      <div className="max-w-lg mx-auto px-4 -mt-2 pb-8 space-y-4">
        {/* Card: Dados da cliente */}
        <Card className="shadow-md rounded-2xl border-0 overflow-hidden">
          <div className="h-1" style={{ background: `linear-gradient(90deg, ${primaryColor}, ${secondaryColor})` }} />
          <CardContent className="pt-4 pb-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Seus dados</p>
            <div className="space-y-2.5">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${primaryColor}12` }}>
                  <User className="h-4 w-4" style={{ color: primaryColor }} />
                </div>
                <span className="text-sm font-medium text-gray-900">{lead.nome || 'Cliente'}</span>
              </div>
              {lead.email && (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${primaryColor}12` }}>
                    <Mail className="h-4 w-4" style={{ color: primaryColor }} />
                  </div>
                  <span className="text-sm text-gray-700">{lead.email}</span>
                </div>
              )}
              {(lead.telefone || lead.whatsapp) && (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${primaryColor}12` }}>
                    <Phone className="h-4 w-4" style={{ color: primaryColor }} />
                  </div>
                  <span className="text-sm text-gray-700">{formatPhone(lead.telefone || lead.whatsapp)}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Card: Serviço */}
        <Card className="shadow-md rounded-2xl border-0">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-sm" style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}>
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="font-bold text-gray-900">Avaliação + Sessões de Serviços Exclusivos</p>
                <p className="text-sm text-gray-500">Duração: ~50 minutos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card: Unidade */}
        {franchise && (
          <Card className="shadow-md rounded-2xl border-0">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${primaryColor}12` }}>
                  <Building2 className="h-6 w-6" style={{ color: primaryColor }} />
                </div>
                <div>
                  <p className="font-bold text-gray-900">{franchise.nome_fantasia || franchise.nome}</p>
                  {franchise.endereco && <p className="text-sm text-gray-500">{formatFullAddress(franchise)}</p>}
                  {(franchise.bairro || franchise.cidade) && (
                    <p className="text-xs text-gray-400">{formatAddressLine2(franchise)}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Card: Calendário */}
        {selectedFranchise && (
          <Card className="shadow-md rounded-2xl border-0">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Calendar className="h-4 w-4" style={{ color: primaryColor }} />
                  Escolha o dia
                </p>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg"
                    onClick={() => setCurrentMonth(p => new Date(p.getFullYear(), p.getMonth() - 1))}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm font-medium capitalize min-w-[130px] text-center">{getMonthYear(currentMonth)}</span>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg"
                    onClick={() => setCurrentMonth(p => new Date(p.getFullYear(), p.getMonth() + 1))}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {/* Dias da semana */}
              <div className="grid grid-cols-7 gap-1 mb-1">
                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
                  <div key={d} className="text-center text-[11px] font-semibold text-gray-400 py-1 uppercase">{d}</div>
                ))}
              </div>
              {/* Dias */}
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map(({ date, day, isCurrentMonth, isPast, isToday, isClosed }) => {
                  const isDisabled = !isCurrentMonth || isPast || isClosed;
                  const isSelected = date === selectedDate;
                  return (
                    <button
                      key={date}
                      disabled={isDisabled}
                      onClick={() => { setSelectedDate(date); setSelectedTime(''); }}
                      className={cn(
                        'h-10 rounded-xl text-sm font-medium transition-all duration-200',
                        isDisabled && 'text-gray-300 cursor-not-allowed',
                        !isDisabled && !isSelected && 'text-gray-700 hover:bg-gray-100',
                        isSelected && 'shadow-md',
                      )}
                      style={
                        isSelected
                          ? { background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`, color: 'white' }
                          : isToday && !isSelected
                          ? { boxShadow: `inset 0 0 0 2px ${primaryColor}`, color: primaryColor, fontWeight: 700 }
                          : undefined
                      }
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Card: Horários */}
        {selectedDate && (
          <Card className="shadow-md rounded-2xl border-0">
            <CardContent className="pt-4 pb-4">
              <p className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-4">
                <Clock className="h-4 w-4" style={{ color: primaryColor }} />
                Horários - {formatDate(selectedDate)}
              </p>
              {isSlotsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" style={{ color: primaryColor }} />
                </div>
              ) : availableSlots.length === 0 ? (
                <p className="text-gray-500 text-center py-6 text-sm">
                  Nenhum horário disponível neste dia. Tente outro dia.
                </p>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {availableSlots.map(slot => {
                    const sel = selectedTime === slot.hora;
                    return (
                      <button
                        key={slot.hora}
                        onClick={() => setSelectedTime(slot.hora)}
                        className={cn(
                          'py-3 rounded-xl text-sm font-semibold transition-all duration-200 border-2',
                          sel && 'shadow-md text-white border-transparent',
                          !sel && 'border-gray-200 text-gray-700 hover:border-gray-400',
                        )}
                        style={sel ? { background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`, borderColor: 'transparent' } : undefined}
                      >
                        {slot.hora}
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Botão Confirmar */}
        {selectedTime && (
          <div className="pt-2">
            <Button
              onClick={handleConfirm}
              disabled={isSubmitting}
              className="w-full py-7 text-lg font-bold rounded-2xl shadow-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl"
              style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}
            >
              {isSubmitting ? (
                <><Loader2 className="h-5 w-5 animate-spin mr-2" /> Agendando...</>
              ) : (
                <><CheckCircle2 className="h-5 w-5 mr-2" /> Confirmar Agendamento</>
              )}
            </Button>
          </div>
        )}

        {/* Resumo fixo */}
        {(selectedFranchise || selectedDate || selectedTime) && !isSuccess && (
          <Card className="shadow-sm rounded-xl border-0 bg-white/80 backdrop-blur-sm">
            <CardContent className="py-3 px-4">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600">
                {franchise && (
                  <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" style={{ color: primaryColor }} /> {franchise.nome_fantasia || franchise.nome}</span>
                )}
                {selectedDate && (
                  <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" style={{ color: primaryColor }} /> {formatDate(selectedDate)}</span>
                )}
                {selectedTime && (
                  <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" style={{ color: primaryColor }} /> {selectedTime}</span>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
