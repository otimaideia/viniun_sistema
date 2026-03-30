import { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import useTenantDetection from '@/hooks/multitenant/useTenantDetection';
import { extractLocationHint, matchFranchiseByLocation } from '@/utils/franchiseLocation';
import { useStoreTracking } from '@/hooks/useStoreTracking';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import {
  ShoppingBag,
  MessageCircle,
  Package,
  Percent,
  Phone,
  Mail,
  MapPin,
  ArrowRight,
  Sparkles,
  Clock,
  FileText,
  Instagram,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Loader2,
  Send,
  Star,
  Shield,
  Users,
  Zap,
} from 'lucide-react';

// =============================================================================
// INTERFACES
// =============================================================================

interface StoreProduct {
  id: string;
  nome: string;
  descricao: string | null;
  preco: number | null;
  preco_promocional: number | null;
  imagem_url: string | null;
  url: string | null;
  url_slug: string | null;
  categoria: string | null;
  marca: string | null;
}

interface StorePackage {
  id: string;
  nome: string;
  descricao: string | null;
  preco_pacote: number;
  preco_original: number | null;
  desconto_percentual: number | null;
  imagem_url: string | null;
  url: string | null;
  url_slug: string | null;
  categoria: string | null;
  data_inicio: string | null;
  data_fim: string | null;
  is_promocional: boolean;
  destaque: boolean;
}

interface FranchiseData {
  id: string;
  nome: string;
  nome_fantasia: string | null;
  endereco: string | null;
  numero: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;
  telefone: string | null;
  whatsapp: string | null;
  email: string | null;
  horario_funcionamento: Record<string, { abre: string; fecha: string } | null> | null;
}

interface TenantBranding {
  cor_primaria: string;
  cor_primaria_hover: string;
  cor_secundaria: string;
  cor_accent: string;
  logo_url: string | null;
  logo_branco_url: string | null;
  favicon_url: string | null;
  fonte_familia: string | null;
  fonte_familia_titulo: string | null;
  cor_fundo: string;
  cor_texto_primario: string;
  cor_texto_secundario: string;
}

// =============================================================================
// CONSTANTS - YESlaser Visual Identity
// =============================================================================

const COLORS = {
  purple: '#753DA4',
  purpleHover: '#6B3AA3',
  purpleDark: '#5A2D8C',
  purpleLight: 'rgba(117, 61, 164, 0.1)',
  cyan: '#7CC4DA',
  cyanHover: '#5DC4DA',
  cyanLight: 'rgba(124, 196, 218, 0.2)',
  green: '#25D366',
  greenHover: '#20BD5A',
  blue: '#2563EB',
  red: '#EF4444',
  gold: '#FACC15',
  white: '#FFFFFF',
  bg: '#FAFAFA',
  text: '#1A1A1A',
  textSecondary: '#666666',
  gray100: '#F5F5F5',
  gray200: '#E5E5E5',
  gray800: '#1F2937',
  gray900: '#111827',
};

const GRADIENT = `linear-gradient(135deg, ${COLORS.purple}, ${COLORS.cyan})`;
const GRADIENT_HERO = `linear-gradient(to right, ${COLORS.purpleHover}, ${COLORS.cyanHover})`;

// =============================================================================
// HELPERS
// =============================================================================

function formatCurrency(value: number | null | undefined): string {
  if (value == null) return '';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function isPackageValid(pkg: StorePackage): boolean {
  const now = new Date();
  if (pkg.data_inicio && new Date(pkg.data_inicio) > now) return false;
  if (pkg.data_fim && new Date(pkg.data_fim) < now) return false;
  return true;
}

function daysRemaining(dataFim: string | null): number | null {
  if (!dataFim) return null;
  const diff = new Date(dataFim).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function formatAddress(f: FranchiseData): string {
  const parts = [];
  if (f.endereco) parts.push(f.endereco);
  if (f.numero) parts.push(f.numero);
  if (f.bairro) parts.push(f.bairro);
  if (f.cidade && f.estado) parts.push(`${f.cidade} - ${f.estado}`);
  if (f.cep) parts.push(`CEP ${f.cep}`);
  return parts.join(', ');
}

function formatHorario(horario: Record<string, { abre: string; fecha: string } | null> | null): string {
  if (!horario) return '';
  const seg = horario.segunda;
  const sab = horario.sabado;
  if (!seg) return '';
  let text = `Seg-Sex: ${seg.abre} - ${seg.fecha}`;
  if (sab) text += ` | Sab: ${sab.abre} - ${sab.fecha}`;
  return text;
}

const FORM_SLUG_LOJA = 'loja-contato';
const LOGO_URL = '/images/landing/depilacao-a-laser-em-praia-grande-yeslaser.png';

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export default function LojaPublica() {
  const { tenant, isLoading: isTenantLoading } = useTenantDetection();
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [packages, setPackages] = useState<StorePackage[]>([]);
  const [branding, setBranding] = useState<TenantBranding | null>(null);
  const [franchise, setFranchise] = useState<FranchiseData | null>(null);
  const [formSlug, setFormSlug] = useState<string>(FORM_SLUG_LOJA);
  const [formId, setFormId] = useState<string | null>(null);
  const [sessionPhone, setSessionPhone] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Form states
  const [formNome, setFormNome] = useState('');
  const [formWhatsapp, setFormWhatsapp] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formGenero, setFormGenero] = useState('');
  const [formCep, setFormCep] = useState('');
  const [formLogradouro, setFormLogradouro] = useState('');
  const [formBairro, setFormBairro] = useState('');
  const [formCidade, setFormCidade] = useState('');
  const [formUf, setFormUf] = useState('');
  const [formInteresse, setFormInteresse] = useState('');
  const [formConsent, setFormConsent] = useState(false);
  const [formStep, setFormStep] = useState(1);
  const [isLoadingCep, setIsLoadingCep] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  const { trackEvent, getWhatsAppUrl, getFormUrl, createInfluencerReferral, influencerCode } =
    useStoreTracking(tenant?.id || null);

  const whatsappNumber = franchise?.whatsapp || franchise?.telefone || sessionPhone || tenant?.whatsapp || tenant?.telefone || null;

  // =========================================================================
  // CARREGAR DADOS
  // =========================================================================

  useEffect(() => {
    if (!tenant?.id) return;

    const loadData = async () => {
      setIsLoading(true);

      const [productsRes, packagesRes, brandingRes, franchiseRes, formRes] = await Promise.all([
        supabase
          .from('mt_services')
          .select('id, nome, descricao, preco, preco_promocional, imagem_url, url, url_slug, categoria, marca')
          .eq('tenant_id', tenant.id)
          .eq('tipo', 'produto')
          .eq('is_active', true)
          .is('deleted_at', null)
          .order('ordem'),
        supabase
          .from('mt_packages')
          .select('id, nome, descricao, preco_pacote, preco_original, desconto_percentual, imagem_url, url, url_slug, categoria, data_inicio, data_fim, is_promocional, destaque')
          .eq('tenant_id', tenant.id)
          .eq('is_active', true)
          .is('deleted_at', null)
          .order('destaque', { ascending: false })
          .order('ordem'),
        supabase
          .from('mt_tenant_branding')
          .select('cor_primaria, cor_primaria_hover, cor_secundaria, cor_accent, logo_url, logo_branco_url, favicon_url, fonte_familia, fonte_familia_titulo, cor_fundo, cor_texto_primario, cor_texto_secundario')
          .eq('tenant_id', tenant.id)
          .single(),
        supabase
          .from('mt_franchises')
          .select('id, nome, nome_fantasia, slug, endereco, numero, bairro, cidade, estado, cep, telefone, whatsapp, email, horario_funcionamento')
          .eq('tenant_id', tenant.id)
          .eq('is_active', true)
          .not('endereco', 'is', null)
          .order('nome'),
        supabase
          .from('mt_forms')
          .select('id, slug')
          .eq('tenant_id', tenant.id)
          .eq('slug', FORM_SLUG_LOJA)
          .eq('publicado', true)
          .is('deleted_at', null)
          .single(),
      ]);

      if (productsRes.data) setProducts(productsRes.data);
      if (packagesRes.data) setPackages(packagesRes.data.filter(isPackageValid));
      if (brandingRes.data) setBranding(brandingRes.data);

      const locationHint = extractLocationHint(window.location.hostname, tenant.slug);
      const franchiseData = franchiseRes.data?.length
        ? matchFranchiseByLocation(franchiseRes.data, locationHint) as FranchiseData | undefined
        : undefined;
      if (franchiseData) setFranchise(franchiseData);
      if (formRes.data) {
        setFormSlug(formRes.data.slug);
        setFormId(formRes.data.id);
      }

      const franchiseId = franchiseData?.id;
      if (franchiseId) {
        const { data: waSession } = await supabase
          .from('mt_whatsapp_sessions')
          .select('telefone')
          .eq('tenant_id', tenant.id)
          .eq('franchise_id', franchiseId)
          .eq('is_active', true)
          .not('telefone', 'is', null)
          .limit(1);
        if (waSession?.[0]?.telefone) {
          setSessionPhone(waSession[0].telefone);
        }
      }

      setIsLoading(false);
    };

    loadData();
  }, [tenant?.id]);

  useEffect(() => {
    if (tenant?.id && !isLoading) {
      trackEvent('view_store');
    }
  }, [tenant?.id, isLoading, trackEvent]);

  const buildLojaLink = (slug: string) => {
    const params = new URLSearchParams();
    if (influencerCode) params.set('influenciadores', influencerCode);
    const qs = params.toString();
    return `/loja/${slug}${qs ? `?${qs}` : ''}`;
  };

  // =========================================================================
  // HANDLERS
  // =========================================================================

  const handleWhatsAppClick = async (itemId?: string, itemTipo?: 'produto' | 'pacote', itemNome?: string) => {
    await trackEvent('click_whatsapp', itemId, itemTipo, itemNome);
    if (itemId && itemTipo) await createInfluencerReferral(itemId, itemTipo);
    if (whatsappNumber) {
      const url = itemNome
        ? getWhatsAppUrl(whatsappNumber, itemNome)
        : `https://wa.me/${whatsappNumber.replace(/\D/g, '')}`;
      window.open(url, '_blank');
    }
  };

  const handleBuyClick = async (itemId: string, itemTipo: 'produto' | 'pacote', itemNome: string, paymentUrl: string | null) => {
    if (paymentUrl) {
      await trackEvent('click_payment', itemId, itemTipo, itemNome);
      await createInfluencerReferral(itemId, itemTipo);
      window.open(paymentUrl, '_blank');
    } else {
      await trackEvent('click_form', itemId, itemTipo, itemNome);
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleFormClick = async (itemId?: string, itemTipo?: 'produto' | 'pacote', itemNome?: string) => {
    await trackEvent('click_form', itemId, itemTipo, itemNome);
    if (itemId && itemTipo) await createInfluencerReferral(itemId, itemTipo);
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant?.id || !formNome.trim()) return;
    if (!formConsent) { setFormError('Voce precisa aceitar os termos para continuar.'); return; }

    setFormSubmitting(true);
    setFormError(null);

    try {
      await trackEvent('click_form', undefined, undefined, 'Formulário Loja');
      const whatsClean = formWhatsapp.replace(/\D/g, '');
      const cepClean = formCep.replace(/\D/g, '');

      const orConditions: string[] = [];
      if (formEmail) orConditions.push(`email.eq.${formEmail}`);
      if (whatsClean) orConditions.push(`whatsapp.eq.${whatsClean}`);

      let leadId: string | undefined;
      let existing: { id: string } | null = null;

      if (orConditions.length > 0) {
        const { data: existingData } = await supabase
          .from('mt_leads')
          .select('id')
          .eq('tenant_id', tenant.id)
          .or(orConditions.join(','))
          .maybeSingle();
        existing = existingData;

        if (existing) {
          await supabase.from('mt_leads').update({
            nome: formNome.trim(),
            genero: formGenero || null,
            cep: cepClean || null,
            endereco: formLogradouro || null,
            bairro: formBairro || null,
            cidade: formCidade || null,
            estado: formUf || null,
            servico_interesse: formInteresse || null,
            ultimo_contato: new Date().toISOString(),
            landing_page: window.location.href,
          }).eq('id', existing.id);
          leadId = existing.id;
        }
      }

      if (!leadId) {
        const leadData: Record<string, unknown> = {
          tenant_id: tenant.id,
          franchise_id: franchise?.id || null,
          nome: formNome.trim(),
          whatsapp: whatsClean || null,
          telefone: whatsClean || null,
          email: formEmail || null,
          genero: formGenero || null,
          cep: cepClean || null,
          endereco: formLogradouro || null,
          bairro: formBairro || null,
          cidade: formCidade || null,
          estado: formUf || null,
          servico_interesse: formInteresse || null,
          origem: 'loja',
          utm_source: 'loja',
          utm_medium: 'formulario',
          landing_page: window.location.href,
          referrer_url: document.referrer || null,
          influenciador_codigo: influencerCode || null,
          status: 'novo',
          temperatura: 'morno',
          tags: ['loja-online'],
          dados_extras: {
            interesse: formInteresse,
            genero: formGenero,
            cep: cepClean,
            endereco: formLogradouro,
            bairro: formBairro,
            cidade: formCidade,
            estado: formUf,
            consent: formConsent,
            source: 'loja-publica',
          },
        };

        const { data: newLead } = await supabase
          .from('mt_leads')
          .insert(leadData)
          .select('id')
          .single();
        leadId = newLead?.id;
      }

      // Registrar atividade no lead (SEMPRE)
      if (leadId && tenant?.id) {
        try {
          const isNew = !existing;
          await supabase.from('mt_lead_activities').insert({
            lead_id: leadId,
            tenant_id: tenant.id,
            franchise_id: franchise?.id || null,
            tipo: isNew ? 'cadastro' : 'formulario',
            titulo: isNew ? 'Lead cadastrado via Loja Online' : 'Nova submissão via Loja Online',
            descricao: isNew
              ? `Cadastro realizado pela loja online${formInteresse ? ` - Interesse: ${formInteresse}` : ''}${influencerCode ? ` - Cód. influenciadora: ${influencerCode}` : ''}`
              : `Lead se cadastrou novamente pela loja online${formInteresse ? ` - Interesse: ${formInteresse}` : ''}${influencerCode ? ` - Cód. influenciadora: ${influencerCode}` : ''}`,
            dados: {
              origem: 'loja',
              canal_entrada: 'loja-online',
              landing_page: window.location.href,
              referrer_url: document.referrer || null,
              interesse: formInteresse,
              influencer_code: influencerCode || null,
              is_resubmissao: !isNew,
              dados_submetidos: {
                nome: formNome.trim(),
                whatsapp: whatsClean,
                email: formEmail,
                genero: formGenero,
                cep: cepClean,
                interesse: formInteresse,
              },
            },
            user_nome: 'Sistema (Loja Pública)',
          });
        } catch (actErr) {
          console.error('[LojaPublica] Erro ao registrar atividade:', actErr);
        }
      }

      if (formId) {
        await supabase.from('mt_form_submissions').insert({
          tenant_id: tenant.id,
          form_id: formId,
          lead_id: leadId || null,
          dados: {
            nome_completo: formNome.trim(),
            whatsapp: whatsClean,
            email: formEmail,
            genero: formGenero,
            cep: cepClean,
            endereco: formLogradouro,
            bairro: formBairro,
            cidade: formCidade,
            estado: formUf,
            interesse: formInteresse,
            consent: formConsent,
          },
          ip_address: null,
          user_agent: navigator.userAgent,
          referrer: document.referrer || null,
          utm_source: 'loja',
          utm_medium: 'formulario',
        });
      }

      if (influencerCode) {
        await createInfluencerReferral('form', 'produto');
      }

      setFormSubmitted(true);
    } catch (err) {
      console.error('[LojaPublica] Erro ao enviar formulário:', err);
      setFormError('Erro ao enviar. Tente novamente.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handlePhoneChange = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    let formatted = digits;
    if (digits.length > 2) formatted = `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length > 7) formatted = `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    setFormWhatsapp(formatted);
  };

  const handleCepChange = async (value: string) => {
    const formatted = value.replace(/\D/g, '').replace(/^(\d{5})(\d)/, '$1-$2');
    setFormCep(formatted);
    const clean = formatted.replace(/\D/g, '');
    if (clean.length === 8) {
      setIsLoadingCep(true);
      try {
        const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
        const data = await res.json();
        if (!data.erro) {
          setFormLogradouro(data.logradouro || '');
          setFormBairro(data.bairro || '');
          setFormCidade(data.localidade || '');
          setFormUf(data.uf || '');
        }
      } catch { /* ignore */ } finally {
        setIsLoadingCep(false);
      }
    }
  };

  const handleNextStep = () => {
    if (!formNome.trim()) { setFormError('Preencha seu nome.'); return; }
    if (!formWhatsapp.trim() || formWhatsapp.replace(/\D/g, '').length < 10) { setFormError('Preencha um WhatsApp valido.'); return; }
    setFormError(null);
    setFormStep(2);
  };

  // =========================================================================
  // LOADING / NOT FOUND
  // =========================================================================

  if (isTenantLoading || isLoading) {
    return (
      <div className="min-h-screen" style={{ fontFamily: 'Montserrat, sans-serif', background: COLORS.bg }}>
        <div className="h-16 bg-white shadow-sm" />
        <div className="max-w-6xl mx-auto px-4 py-8">
          <Skeleton className="h-[400px] w-full mb-8 rounded-2xl" />
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-[380px] rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ fontFamily: 'Montserrat, sans-serif', background: COLORS.bg }}>
        <div className="text-center">
          <h1 className="text-2xl font-bold" style={{ color: COLORS.text }}>Loja nao encontrada</h1>
          <p className="mt-2" style={{ color: COLORS.textSecondary }}>Verifique o endereco e tente novamente.</p>
        </div>
      </div>
    );
  }

  const featuredPackage = packages.find((p) => p.destaque);
  const displayName = franchise?.nome_fantasia || franchise?.nome || tenant.nome_fantasia;
  const address = franchise ? formatAddress(franchise) : null;
  const horario = franchise ? formatHorario(franchise.horario_funcionamento) : null;
  const logoUrl = branding?.logo_url || LOGO_URL;
  const logoWhiteUrl = branding?.logo_branco_url || null;

  // =========================================================================
  // RENDER
  // =========================================================================

  return (
    <div className="min-h-screen" style={{ fontFamily: 'Montserrat, sans-serif', background: COLORS.bg }}>
      {/* ============================================================== */}
      {/* HEADER - Branco com logo (estilo site oficial)                  */}
      {/* ============================================================== */}
      <header className="sticky top-0 z-50 bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logoUrl} alt={displayName} className="h-9 md:h-11" />
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <button
              onClick={() => formRef.current?.scrollIntoView({ behavior: 'smooth' })}
              className="text-sm font-semibold hover:opacity-80 transition-opacity"
              style={{ color: COLORS.text }}
            >
              Contato
            </button>
            {whatsappNumber && (
              <button
                onClick={() => handleWhatsAppClick()}
                className="text-sm font-semibold hover:opacity-80 transition-opacity"
                style={{ color: COLORS.text }}
              >
                WhatsApp
              </button>
            )}
          </nav>
          <Button
            size="sm"
            className="text-white font-bold shadow-md border-0 rounded-full px-6"
            style={{ background: COLORS.purple }}
            onClick={() => handleFormClick()}
          >
            Comprar Agora
          </Button>
        </div>
      </header>

      {/* ============================================================== */}
      {/* HERO - Gradiente roxo/cyan (estilo site oficial)               */}
      {/* ============================================================== */}
      <section
        className="relative overflow-hidden"
        style={{ background: GRADIENT_HERO }}
      >
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.15), transparent 70%)' }} />
        </div>
        <div className="relative z-10 max-w-6xl mx-auto px-4 py-12 md:py-20 text-center text-white">
          {featuredPackage ? (
            <>
              <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-full px-4 py-1.5 mb-6 text-sm font-semibold">
                <Sparkles className="h-4 w-4" />
                {featuredPackage.is_promocional ? 'PROMOCAO ESPECIAL' : 'DESTAQUE'}
              </div>
              <h1 className="text-3xl md:text-5xl lg:text-6xl font-extrabold mb-4 leading-tight">
                {featuredPackage.nome}
              </h1>
              {featuredPackage.descricao && (
                <p className="text-white/80 mb-6 text-lg max-w-2xl mx-auto line-clamp-3">{featuredPackage.descricao}</p>
              )}

              {/* Preco com card glass */}
              <div className="inline-block bg-white/10 backdrop-blur-sm rounded-2xl p-6 mb-6">
                {featuredPackage.preco_original && featuredPackage.preco_original > featuredPackage.preco_pacote && (
                  <p className="text-sm text-white/60 line-through mb-1">
                    {formatCurrency(featuredPackage.preco_original)}
                  </p>
                )}
                <p className="text-5xl md:text-6xl font-extrabold">{formatCurrency(featuredPackage.preco_pacote)}</p>
                {featuredPackage.desconto_percentual && featuredPackage.desconto_percentual > 0 && (
                  <Badge className="bg-red-500 text-white border-0 text-sm px-3 py-1 mt-2">
                    -{Math.round(featuredPackage.desconto_percentual)}% OFF
                  </Badge>
                )}
              </div>

              {featuredPackage.data_fim && (
                <div className="flex items-center justify-center gap-2 mb-6 text-sm">
                  <div className="bg-yellow-400 text-yellow-900 rounded-full px-3 py-0.5 font-bold flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {daysRemaining(featuredPackage.data_fim) === 0
                      ? 'ULTIMO DIA!'
                      : `Faltam ${daysRemaining(featuredPackage.data_fim)} dias`}
                  </div>
                </div>
              )}

              {/* CTAs (estilo site oficial: 3 botoes) */}
              <div className="flex flex-wrap justify-center gap-3">
                <Button
                  size="lg"
                  className="font-bold shadow-lg rounded-full px-8 text-base border-2 border-white/30 text-white"
                  style={{ background: COLORS.green }}
                  onClick={() => handleWhatsAppClick(featuredPackage.id, 'pacote', featuredPackage.nome)}
                >
                  <MessageCircle className="h-5 w-5 mr-2" />
                  FALAR NO WHATSAPP
                </Button>
                <Button
                  size="lg"
                  className="font-bold shadow-lg rounded-full px-8 text-base text-white border-0"
                  style={{ background: COLORS.cyan }}
                  onClick={() => handleBuyClick(featuredPackage.id, 'pacote', featuredPackage.nome, featuredPackage.url)}
                >
                  <ShoppingBag className="h-5 w-5 mr-2" />
                  COMPRAR AGORA
                </Button>
                {featuredPackage.url_slug && (
                  <Link to={buildLojaLink(featuredPackage.url_slug)}>
                    <Button size="lg" className="font-bold rounded-full px-8 text-base bg-white/15 hover:bg-white/25 text-white border border-white/30">
                      Ver Detalhes <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </Link>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-full px-4 py-1.5 mb-6 text-sm font-semibold">
                <Sparkles className="h-4 w-4" />
                {displayName?.toUpperCase()}
              </div>
              <h1 className="text-3xl md:text-5xl lg:text-6xl font-extrabold mb-4 leading-tight">
                Nossos Servicos e Pacotes
              </h1>
              <p className="text-white/80 mb-8 text-lg max-w-2xl mx-auto">
                Confira nossas opcoes de tratamentos e pacotes especiais
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <Button
                  size="lg"
                  className="font-bold shadow-lg rounded-full px-8 text-base text-white border-0"
                  style={{ background: COLORS.green }}
                  onClick={() => handleWhatsAppClick()}
                >
                  <MessageCircle className="h-5 w-5 mr-2" />
                  FALAR NO WHATSAPP
                </Button>
                <Button
                  size="lg"
                  className="font-bold rounded-full px-8 text-base bg-white/15 hover:bg-white/25 text-white border border-white/30"
                  onClick={() => handleFormClick()}
                >
                  <FileText className="h-5 w-5 mr-2" />
                  CONTATO
                </Button>
              </div>
            </>
          )}

          {/* Trust badges (estilo site oficial) */}
          <div className="flex flex-wrap justify-center gap-6 mt-10 text-sm text-white/80">
            <div className="flex items-center gap-2">
              <div className="flex -space-x-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                ))}
              </div>
              <span>+500 clientes</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              <span>Tecnologia de ponta</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span>Profissionais certificados</span>
            </div>
            {franchise?.bairro && franchise?.cidade && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <span>{franchise.bairro} - {franchise.cidade}</span>
              </div>
            )}
          </div>
        </div>
      </section>

      <main className="max-w-6xl mx-auto px-4 py-12 space-y-16">
        {/* ============================================================== */}
        {/* PACOTES / PROMOCOES                                            */}
        {/* ============================================================== */}
        {packages.length > 0 && (
          <section>
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-4 text-sm font-semibold" style={{ background: COLORS.purpleLight, color: COLORS.purple }}>
                <Package className="h-4 w-4" />
                NOSSOS PACOTES
              </div>
              <h2 className="text-3xl md:text-4xl font-extrabold" style={{ color: COLORS.text }}>
                {packages.some((p) => p.is_promocional) ? 'Promocoes Especiais' : 'Pacotes Disponiveis'}
              </h2>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {packages
                .filter((p) => !p.destaque || packages.length <= 1)
                .map((pkg) => (
                  <Card key={pkg.id} className="overflow-hidden hover:shadow-2xl transition-all duration-300 group border border-gray-100 bg-white rounded-2xl">
                    {pkg.imagem_url && (
                      <div className="aspect-video overflow-hidden bg-gray-100">
                        <img
                          src={pkg.imagem_url}
                          alt={pkg.nome}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      </div>
                    )}
                    <CardContent className="p-5 space-y-3">
                      <div className="flex items-start justify-between">
                        <h3 className="font-bold text-lg line-clamp-2" style={{ color: COLORS.text }}>{pkg.nome}</h3>
                        {pkg.is_promocional && (
                          <Badge className="shrink-0 ml-2 text-white border-0 rounded-full" style={{ background: COLORS.purple }}>
                            <Percent className="h-3 w-3 mr-1" />
                            Promo
                          </Badge>
                        )}
                      </div>
                      {pkg.descricao && (
                        <p className="text-sm line-clamp-2" style={{ color: COLORS.textSecondary }}>{pkg.descricao}</p>
                      )}
                      <div className="flex items-baseline gap-2">
                        {pkg.preco_original && pkg.preco_original > pkg.preco_pacote && (
                          <span className="text-sm line-through text-gray-400">
                            {formatCurrency(pkg.preco_original)}
                          </span>
                        )}
                        <span className="text-2xl font-extrabold" style={{ color: COLORS.purple }}>
                          {formatCurrency(pkg.preco_pacote)}
                        </span>
                        {pkg.desconto_percentual && pkg.desconto_percentual > 0 && (
                          <Badge className="bg-green-100 text-green-700 border-0 rounded-full">
                            -{Math.round(pkg.desconto_percentual)}%
                          </Badge>
                        )}
                      </div>
                      {pkg.data_fim && (
                        <p className="text-xs flex items-center gap-1 font-semibold" style={{ color: COLORS.red }}>
                          <Clock className="h-3 w-3" />
                          {daysRemaining(pkg.data_fim) === 0
                            ? 'Ultimo dia!'
                            : `Faltam ${daysRemaining(pkg.data_fim)} dias`}
                        </p>
                      )}
                      <div className="flex gap-2 pt-2">
                        <Button
                          size="sm"
                          className="flex-1 text-white font-bold rounded-full"
                          style={{ background: COLORS.purple }}
                          onClick={() => handleBuyClick(pkg.id, 'pacote', pkg.nome, pkg.url)}
                        >
                          <ShoppingBag className="h-3.5 w-3.5 mr-1" />
                          {pkg.url ? 'Comprar' : 'Quero Este'}
                        </Button>
                        {whatsappNumber && (
                          <Button
                            size="sm"
                            className="flex-1 text-white border-0 font-bold rounded-full"
                            style={{ background: COLORS.green }}
                            onClick={() => handleWhatsAppClick(pkg.id, 'pacote', pkg.nome)}
                          >
                            <MessageCircle className="h-3.5 w-3.5 mr-1" />
                            WhatsApp
                          </Button>
                        )}
                      </div>
                      {pkg.url_slug && (
                        <Link
                          to={buildLojaLink(pkg.url_slug)}
                          className="text-sm hover:underline flex items-center gap-1 mt-1 font-semibold"
                          style={{ color: COLORS.purple }}
                        >
                          Ver detalhes <ChevronRight className="h-3.5 w-3.5" />
                        </Link>
                      )}
                    </CardContent>
                  </Card>
                ))}
            </div>
          </section>
        )}

        {/* ============================================================== */}
        {/* PRODUTOS                                                        */}
        {/* ============================================================== */}
        {products.length > 0 && (
          <section>
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-4 text-sm font-semibold" style={{ background: COLORS.cyanLight, color: COLORS.purple }}>
                <ShoppingBag className="h-4 w-4" />
                NOSSOS SERVICOS
              </div>
              <h2 className="text-3xl md:text-4xl font-extrabold" style={{ color: COLORS.text }}>
                Procedimentos Disponiveis
              </h2>
              <p className="mt-2 max-w-xl mx-auto" style={{ color: COLORS.textSecondary }}>
                Tratamentos de alta tecnologia para cuidar de voce
              </p>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {products.map((product) => (
                <Card key={product.id} className="overflow-hidden hover:shadow-2xl transition-all duration-300 group border border-gray-100 bg-white rounded-2xl">
                  {product.imagem_url ? (
                    <div className="aspect-square overflow-hidden bg-gray-50">
                      <img
                        src={product.imagem_url}
                        alt={product.nome}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                  ) : (
                    <div className="aspect-square flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${COLORS.purpleLight}, ${COLORS.cyanLight})` }}>
                      <ShoppingBag className="h-12 w-12" style={{ color: COLORS.purple }} />
                    </div>
                  )}
                  <CardContent className="p-4 space-y-2">
                    {product.marca && (
                      <span className="text-xs uppercase tracking-widest font-semibold" style={{ color: COLORS.cyan }}>
                        {product.marca}
                      </span>
                    )}
                    <h3 className="font-bold line-clamp-2" style={{ color: COLORS.text }}>{product.nome}</h3>
                    {product.descricao && (
                      <p className="text-xs line-clamp-2" style={{ color: COLORS.textSecondary }}>{product.descricao}</p>
                    )}
                    <div className="flex items-baseline gap-2">
                      {product.preco_promocional && product.preco_promocional < (product.preco || 0) ? (
                        <>
                          <span className="text-sm line-through text-gray-400">
                            {formatCurrency(product.preco)}
                          </span>
                          <span className="text-xl font-extrabold" style={{ color: COLORS.purple }}>
                            {formatCurrency(product.preco_promocional)}
                          </span>
                        </>
                      ) : (
                        <span className="text-xl font-extrabold" style={{ color: COLORS.purple }}>
                          {formatCurrency(product.preco)}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2 pt-1">
                      <Button
                        size="sm"
                        className="flex-1 text-xs text-white font-bold rounded-full"
                        style={{ background: COLORS.purple }}
                        onClick={() => handleBuyClick(product.id, 'produto', product.nome, product.url)}
                      >
                        {product.url ? 'Comprar' : 'Quero Este'}
                      </Button>
                      {whatsappNumber && (
                        <Button
                          size="sm"
                          className="flex-1 text-xs text-white border-0 font-bold rounded-full"
                          style={{ background: COLORS.green }}
                          onClick={() => handleWhatsAppClick(product.id, 'produto', product.nome)}
                        >
                          <MessageCircle className="h-3 w-3 mr-1" />
                          WhatsApp
                        </Button>
                      )}
                    </div>
                    {product.url_slug && (
                      <Link
                        to={buildLojaLink(product.url_slug)}
                        className="text-xs hover:underline flex items-center gap-1 font-semibold"
                        style={{ color: COLORS.purple }}
                      >
                        Ver detalhes <ChevronRight className="h-3 w-3" />
                      </Link>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* ============================================================== */}
        {/* SEM PRODUTOS NEM PACOTES                                        */}
        {/* ============================================================== */}
        {products.length === 0 && packages.length === 0 && (
          <div className="text-center py-20">
            <ShoppingBag className="h-16 w-16 mx-auto mb-4" style={{ color: COLORS.cyan }} />
            <h2 className="text-xl font-bold" style={{ color: COLORS.text }}>Catalogo em breve</h2>
            <p className="mt-2" style={{ color: COLORS.textSecondary }}>Estamos preparando nossos produtos e pacotes.</p>
            <div className="flex flex-wrap justify-center gap-3 mt-6">
              <Button
                className="text-white font-bold rounded-full"
                style={{ background: COLORS.purple }}
                onClick={() => handleFormClick()}
              >
                <FileText className="h-4 w-4 mr-2" />
                Quero Saber Mais
              </Button>
              {whatsappNumber && (
                <Button
                  className="text-white border-0 font-bold rounded-full"
                  style={{ background: COLORS.green }}
                  onClick={() => handleWhatsAppClick()}
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Fale Conosco
                </Button>
              )}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* FORMULARIO DE CONTATO INLINE (estilo site oficial)             */}
        {/* ============================================================== */}
        <section ref={formRef} id="formulario" className="scroll-mt-20">
          <Card className="border border-gray-100 shadow-2xl overflow-hidden rounded-2xl bg-white">
            {/* Header do form com gradiente */}
            <div className="relative p-8 text-white text-center overflow-hidden" style={{ background: GRADIENT }}>
              <div className="absolute inset-0 opacity-10" style={{ background: 'radial-gradient(circle at 30% 50%, rgba(255,255,255,0.3), transparent)' }} />
              <div className="relative z-10">
                <div className="flex justify-center gap-3 mb-4">
                  {logoWhiteUrl ? (
                    <img src={logoWhiteUrl} alt={displayName} className="h-10" />
                  ) : (
                    <img src={logoUrl} alt={displayName} className="h-10" style={{ filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.8)) drop-shadow(0 0 2px rgba(255,255,255,1))' }} />
                  )}
                </div>
                <h2 className="text-2xl md:text-3xl font-extrabold mb-2">
                  {formSubmitted ? 'Cadastro Recebido!' : 'Quero Saber Mais'}
                </h2>
                <p className="text-white/80 max-w-lg mx-auto">
                  {formSubmitted
                    ? 'Nossa equipe entrara em contato pelo WhatsApp em breve.'
                    : 'Preencha seus dados e nossa equipe entrara em contato rapidamente pelo WhatsApp.'}
                </p>
              </div>
            </div>

            <CardContent className="p-6 md:p-8">
              {formSubmitted ? (
                <div className="text-center py-6 space-y-4">
                  <CheckCircle2 className="h-16 w-16 mx-auto" style={{ color: COLORS.green }} />
                  <p className="text-lg font-bold" style={{ color: COLORS.text }}>
                    Obrigado, {formNome.split(' ')[0]}!
                  </p>
                  <p style={{ color: COLORS.textSecondary }}>
                    Recebemos seus dados e em breve voce recebera uma mensagem no WhatsApp.
                  </p>
                  {whatsappNumber && (
                    <Button
                      size="lg"
                      className="text-white border-0 mt-4 font-bold rounded-full"
                      style={{ background: COLORS.green }}
                      onClick={() => handleWhatsAppClick()}
                    >
                      <MessageCircle className="h-5 w-5 mr-2" />
                      Falar Agora no WhatsApp
                    </Button>
                  )}
                </div>
              ) : (
                <div className="max-w-lg mx-auto">
                  {/* Progress bar */}
                  <div className="mb-6">
                    <div className="flex justify-between text-sm mb-2" style={{ color: COLORS.textSecondary }}>
                      <span>Etapa {formStep} de 2</span>
                      <span>{formStep === 1 ? '50%' : '100%'}</span>
                    </div>
                    <Progress value={formStep === 1 ? 50 : 100} className="h-2" />
                    <p className="text-sm font-medium mt-2" style={{ color: COLORS.text }}>
                      {formStep === 1 ? 'Seus Dados' : 'Endereco e Interesse'}
                    </p>
                  </div>

                  <form onSubmit={handleFormSubmit} className="space-y-4">
                    {/* ========== ETAPA 1: Dados Pessoais ========== */}
                    {formStep === 1 && (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="form-nome" className="font-semibold" style={{ color: COLORS.text }}>
                            Nome Completo *
                          </Label>
                          <Input
                            id="form-nome"
                            placeholder="Digite seu nome completo"
                            value={formNome}
                            onChange={(e) => setFormNome(e.target.value)}
                            required
                            className="h-12 rounded-xl border-gray-200 focus:border-purple-400 focus:ring-purple-400"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="form-email" className="font-semibold" style={{ color: COLORS.text }}>
                            E-mail
                          </Label>
                          <Input
                            id="form-email"
                            type="email"
                            placeholder="seu@email.com"
                            value={formEmail}
                            onChange={(e) => setFormEmail(e.target.value)}
                            className="h-12 rounded-xl border-gray-200 focus:border-purple-400 focus:ring-purple-400"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="form-genero" className="font-semibold" style={{ color: COLORS.text }}>
                            Genero *
                          </Label>
                          <Select value={formGenero} onValueChange={setFormGenero}>
                            <SelectTrigger id="form-genero" className="h-12 rounded-xl border-gray-200">
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Feminino">Feminino</SelectItem>
                              <SelectItem value="Masculino">Masculino</SelectItem>
                              <SelectItem value="Outro">Outro</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="form-whatsapp" className="font-semibold" style={{ color: COLORS.text }}>
                            WhatsApp *
                          </Label>
                          <Input
                            id="form-whatsapp"
                            placeholder="(13) 99999-9999"
                            value={formWhatsapp}
                            onChange={(e) => handlePhoneChange(e.target.value)}
                            required
                            className="h-12 rounded-xl border-gray-200 focus:border-purple-400 focus:ring-purple-400"
                          />
                        </div>

                        {formError && (
                          <p className="text-sm text-red-500 text-center">{formError}</p>
                        )}

                        <Button
                          type="button"
                          size="lg"
                          className="w-full text-white font-bold shadow-lg rounded-full text-base h-14"
                          style={{ background: GRADIENT }}
                          onClick={handleNextStep}
                        >
                          Proximo
                          <ChevronRight className="h-5 w-5 ml-2" />
                        </Button>
                      </>
                    )}

                    {/* ========== ETAPA 2: Endereco e Interesse ========== */}
                    {formStep === 2 && (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="form-cep" className="font-semibold" style={{ color: COLORS.text }}>
                            CEP *
                          </Label>
                          <div className="relative">
                            <Input
                              id="form-cep"
                              placeholder="00000-000"
                              value={formCep}
                              onChange={(e) => handleCepChange(e.target.value)}
                              maxLength={9}
                              required
                              className="h-12 rounded-xl border-gray-200 focus:border-purple-400 focus:ring-purple-400 pr-10"
                            />
                            {isLoadingCep && (
                              <Loader2 className="absolute right-3 top-3.5 h-5 w-5 animate-spin" style={{ color: COLORS.purple }} />
                            )}
                          </div>
                          <p className="text-xs" style={{ color: COLORS.textSecondary }}>
                            Digite o CEP para buscar o endereco automaticamente
                          </p>
                          {formLogradouro && formCidade && (
                            <div className="mt-1 p-2.5 bg-green-50 border border-green-200 rounded-xl text-xs">
                              <p className="text-green-800">
                                <strong>Endereco encontrado:</strong><br />
                                {formLogradouro}<br />
                                {formBairro} - {formCidade}/{formUf}
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="form-interesse" className="font-semibold" style={{ color: COLORS.text }}>
                            O que te interessa?
                          </Label>
                          <Select value={formInteresse} onValueChange={setFormInteresse}>
                            <SelectTrigger className="h-12 rounded-xl border-gray-200">
                              <SelectValue placeholder="Selecione seu interesse..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Depilação a Laser">Depilacao a Laser</SelectItem>
                              <SelectItem value="Estética Facial">Estetica Facial</SelectItem>
                              <SelectItem value="Estética Corporal">Estetica Corporal</SelectItem>
                              <SelectItem value="Pacote Promocional">Pacote Promocional</SelectItem>
                              <SelectItem value="Outro">Outro</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                          <div className="flex items-start space-x-3">
                            <Checkbox
                              id="form-consent"
                              checked={formConsent}
                              onCheckedChange={(checked) => setFormConsent(checked as boolean)}
                              className="mt-0.5 border-blue-400"
                            />
                            <Label htmlFor="form-consent" className="text-sm cursor-pointer leading-relaxed" style={{ color: COLORS.text }}>
                              Concordo com a Politica de Privacidade e autorizo contato via WhatsApp. *
                            </Label>
                          </div>
                        </div>

                        {formError && (
                          <p className="text-sm text-red-500 text-center">{formError}</p>
                        )}

                        <div className="flex flex-col gap-3 pt-2">
                          <div className="flex gap-3">
                            <Button
                              type="button"
                              size="lg"
                              variant="outline"
                              className="font-bold rounded-full h-14 px-6"
                              onClick={() => { setFormStep(1); setFormError(null); }}
                            >
                              <ChevronLeft className="h-5 w-5 mr-1" />
                              Voltar
                            </Button>
                            <Button
                              type="submit"
                              size="lg"
                              disabled={formSubmitting || !formConsent}
                              className="flex-1 text-white font-bold shadow-lg rounded-full text-base h-14"
                              style={{ background: COLORS.green }}
                            >
                              {formSubmitting ? (
                                <>
                                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                                  Enviando...
                                </>
                              ) : (
                                <>
                                  <MessageCircle className="h-5 w-5 mr-2" />
                                  ENVIAR
                                </>
                              )}
                            </Button>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex-1 h-px bg-gray-200" />
                            <span className="text-xs font-semibold text-gray-400 uppercase">ou pague direto</span>
                            <div className="flex-1 h-px bg-gray-200" />
                          </div>
                          <Button
                            type="button"
                            size="lg"
                            className="w-full text-white font-bold shadow-lg rounded-full text-base h-14"
                            style={{ background: GRADIENT }}
                            onClick={() => {
                              if (featuredPackage?.url) {
                                handleBuyClick(featuredPackage.id, 'pacote', featuredPackage.nome, featuredPackage.url);
                              } else {
                                handleFormClick();
                              }
                            }}
                          >
                            <ShoppingBag className="h-5 w-5 mr-2" />
                            COMPRAR AGORA{featuredPackage ? ` - ${formatCurrency(featuredPackage.preco_pacote)}` : ''}
                          </Button>
                        </div>
                      </>
                    )}

                    {/* Trust indicators */}
                    <div className="flex items-center justify-center gap-4 pt-2 text-xs" style={{ color: COLORS.textSecondary }}>
                      <span className="flex items-center gap-1">
                        <Shield className="h-3.5 w-3.5" style={{ color: COLORS.purple }} />
                        Dados seguros
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Phone className="h-3.5 w-3.5" style={{ color: COLORS.purple }} />
                        Atendimento humanizado
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Zap className="h-3.5 w-3.5" style={{ color: COLORS.purple }} />
                        Resposta imediata
                      </span>
                    </div>
                  </form>
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      </main>

      {/* ================================================================== */}
      {/* FOOTER (estilo site oficial)                                       */}
      {/* ================================================================== */}
      <footer style={{ background: COLORS.gray900 }} className="text-white mt-12">
        <div className="max-w-6xl mx-auto px-4 py-12">
          <div className="grid gap-8 md:grid-cols-3">
            {/* Coluna 1: Logo + Descricao */}
            <div>
              {logoWhiteUrl ? (
                <img src={logoWhiteUrl} alt={displayName} className="h-12 mb-4" />
              ) : (
                <img src={logoUrl} alt={displayName} className="h-12 mb-4" style={{ filter: 'drop-shadow(0 0 6px rgba(255,255,255,0.5))' }} />
              )}
              <p className="text-gray-400 text-sm leading-relaxed">
                {displayName}{franchise?.cidade ? ` — ${franchise.cidade}` : ''}
              </p>
            </div>

            {/* Coluna 2: Contato */}
            <div className="space-y-3">
              <h4 className="font-bold text-lg mb-4">Contato</h4>
              {address && (
                <p className="text-gray-400 text-sm flex items-start gap-2">
                  <MapPin className="h-4 w-4 mt-0.5 shrink-0" style={{ color: COLORS.purple }} />
                  {address}
                </p>
              )}
              {whatsappNumber && (
                <a
                  href={`https://wa.me/${whatsappNumber.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 text-sm flex items-center gap-2 hover:text-white transition-colors"
                >
                  <Phone className="h-4 w-4 shrink-0" style={{ color: COLORS.purple }} />
                  {whatsappNumber}
                </a>
              )}
              {franchise?.email && (
                <a
                  href={`mailto:${franchise.email}`}
                  className="text-gray-400 text-sm flex items-center gap-2 hover:text-white transition-colors"
                >
                  <Mail className="h-4 w-4 shrink-0" style={{ color: COLORS.purple }} />
                  {franchise.email}
                </a>
              )}
              {horario && (
                <p className="text-gray-400 text-sm flex items-center gap-2">
                  <Clock className="h-4 w-4 shrink-0" style={{ color: COLORS.purple }} />
                  {horario}
                </p>
              )}
            </div>

            {/* Coluna 3: Links / Atendimento */}
            <div className="space-y-3">
              <h4 className="font-bold text-lg mb-4">Links</h4>
              {whatsappNumber && (
                <Button
                  size="sm"
                  className="w-full text-white border-0 font-bold rounded-full"
                  style={{ background: COLORS.green }}
                  onClick={() => handleWhatsAppClick()}
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Fale pelo WhatsApp
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                className="w-full border-gray-700 text-gray-300 hover:text-white hover:bg-gray-800 rounded-full"
                onClick={() => handleFormClick()}
              >
                <FileText className="h-4 w-4 mr-2" />
                Formulario de Contato
              </Button>
              <div className="flex items-center gap-3 pt-2">
                <a
                  href={`https://instagram.com/${tenant?.slug || 'yeslaser'}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-500 hover:text-white transition-colors"
                >
                  <Instagram className="h-5 w-5" />
                </a>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-10 pt-6 text-center">
            <p className="text-xs text-gray-500">
              &copy; {new Date().getFullYear()} {tenant.nome_fantasia}. Todos os direitos reservados.
              {franchise?.cidade && franchise.estado && (
                <span> | {franchise.cidade} - {franchise.estado}</span>
              )}
            </p>
          </div>
        </div>
      </footer>

      {/* ================================================================== */}
      {/* BOTAO WHATSAPP FLUTUANTE (estilo site oficial)                     */}
      {/* ================================================================== */}
      {whatsappNumber && (
        <button
          onClick={() => handleWhatsAppClick()}
          className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-2xl flex items-center justify-center text-white transition-transform hover:scale-110"
          style={{ background: COLORS.green }}
          title="Fale conosco no WhatsApp"
        >
          <MessageCircle className="h-7 w-7" />
        </button>
      )}
    </div>
  );
}
