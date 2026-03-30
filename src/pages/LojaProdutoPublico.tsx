import { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import useTenantDetection from '@/hooks/multitenant/useTenantDetection';
import { extractLocationHint, matchFranchiseByLocation } from '@/utils/franchiseLocation';
import { useStoreTracking } from '@/hooks/useStoreTracking';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowLeft,
  ShoppingBag,
  MessageCircle,
  Package,
  Percent,
  Clock,
  Tag,
  Barcode,
  CheckCircle,
  FileText,
  MapPin,
  Phone,
  Mail,
  Star,
  Shield,
  Users,
  Zap,
} from 'lucide-react';

// =============================================================================
// CORES E IDENTIDADE VISUAL YESLASER
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
const LOGO_URL = '/images/landing/depilacao-a-laser-em-praia-grande-yeslaser.png';

// =============================================================================
// INTERFACES
// =============================================================================

interface ProductDetail {
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
  sku: string | null;
  gtin: string | null;
  tipo: string;
}

interface PackageDetail {
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

interface PackageItem {
  id: string;
  quantidade: number;
  preco_unitario: number | null;
  service: {
    id: string;
    nome: string;
    preco: number | null;
    imagem_url: string | null;
  };
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

// =============================================================================
// HELPERS
// =============================================================================

function formatCurrency(value: number | null | undefined): string {
  if (value == null) return '';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
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

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export default function LojaProdutoPublico() {
  const { slug } = useParams<{ slug: string }>();
  const { tenant, isLoading: isTenantLoading } = useTenantDetection();
  const [searchParams] = useSearchParams();

  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [pkg, setPkg] = useState<PackageDetail | null>(null);
  const [packageItems, setPackageItems] = useState<PackageItem[]>([]);
  const [franchise, setFranchise] = useState<FranchiseData | null>(null);
  const [formSlug, setFormSlug] = useState<string>(FORM_SLUG_LOJA);
  const [sessionPhone, setSessionPhone] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const { trackEvent, getWhatsAppUrl, getFormUrl, createInfluencerReferral, influencerCode } =
    useStoreTracking(tenant?.id || null);

  const whatsappNumber = franchise?.whatsapp || franchise?.telefone || sessionPhone || tenant?.whatsapp || tenant?.telefone || null;

  const itemType = product ? 'produto' : 'pacote';
  const itemId = product?.id || pkg?.id || '';
  const itemName = product?.nome || pkg?.nome || '';

  useEffect(() => {
    if (!tenant?.id || !slug) return;

    const loadData = async () => {
      setIsLoading(true);
      setNotFound(false);

      const [franchiseRes, formRes] = await Promise.all([
        supabase.from('mt_franchises').select('id, nome, nome_fantasia, slug, endereco, numero, bairro, cidade, estado, cep, telefone, whatsapp, email, horario_funcionamento').eq('tenant_id', tenant.id).eq('is_active', true).not('endereco', 'is', null).order('nome'),
        supabase.from('mt_forms').select('slug').eq('tenant_id', tenant.id).eq('slug', FORM_SLUG_LOJA).eq('publicado', true).is('deleted_at', null).single(),
      ]);

      const locationHint = extractLocationHint(window.location.hostname, tenant.slug);
      const franchiseData = franchiseRes.data?.length
        ? matchFranchiseByLocation(franchiseRes.data, locationHint) as FranchiseData | undefined
        : undefined;
      if (franchiseData) setFranchise(franchiseData);
      if (formRes.data) setFormSlug(formRes.data.slug);

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

      // Tentar buscar como produto
      const { data: productData } = await supabase
        .from('mt_services')
        .select('id, nome, descricao, preco, preco_promocional, imagem_url, url, url_slug, categoria, marca, sku, gtin, tipo')
        .eq('tenant_id', tenant.id)
        .eq('url_slug', slug)
        .eq('tipo', 'produto')
        .eq('is_active', true)
        .is('deleted_at', null)
        .single();

      if (productData) {
        setProduct(productData);
        setPkg(null);
        setIsLoading(false);
        return;
      }

      // Tentar buscar como pacote
      const { data: pkgData } = await supabase
        .from('mt_packages')
        .select('id, nome, descricao, preco_pacote, preco_original, desconto_percentual, imagem_url, url, url_slug, categoria, data_inicio, data_fim, is_promocional, destaque')
        .eq('tenant_id', tenant.id)
        .eq('url_slug', slug)
        .eq('is_active', true)
        .is('deleted_at', null)
        .single();

      if (pkgData) {
        setPkg(pkgData);
        setProduct(null);

        const { data: items } = await supabase
          .from('mt_package_items')
          .select('id, quantidade, preco_unitario, service:mt_services(id, nome, preco, imagem_url)')
          .eq('package_id', pkgData.id)
          .order('ordem');

        if (items) setPackageItems(items as unknown as PackageItem[]);
        setIsLoading(false);
        return;
      }

      setNotFound(true);
      setIsLoading(false);
    };

    loadData();
  }, [tenant?.id, slug]);

  // Track view
  useEffect(() => {
    if (!isLoading && (product || pkg)) {
      const tipo = product ? 'produto' : 'pacote';
      const id = product?.id || pkg?.id;
      const nome = product?.nome || pkg?.nome;
      trackEvent(product ? 'view_product' : 'view_package', id, tipo as 'produto' | 'pacote', nome);
    }
  }, [isLoading, product, pkg, trackEvent]);

  // =========================================================================
  // HANDLERS
  // =========================================================================

  const handleWhatsAppClick = async () => {
    await trackEvent('click_whatsapp', itemId, itemType as 'produto' | 'pacote', itemName);
    await createInfluencerReferral(itemId, itemType as 'produto' | 'pacote');
    if (whatsappNumber) {
      window.open(getWhatsAppUrl(whatsappNumber, itemName), '_blank');
    }
  };

  const handleBuyClick = async (paymentUrl: string | null) => {
    if (paymentUrl) {
      await trackEvent('click_payment', itemId, itemType as 'produto' | 'pacote', itemName);
      await createInfluencerReferral(itemId, itemType as 'produto' | 'pacote');
      window.open(paymentUrl, '_blank');
    } else {
      await trackEvent('click_form', itemId, itemType as 'produto' | 'pacote', itemName);
      await createInfluencerReferral(itemId, itemType as 'produto' | 'pacote');
      window.location.href = getFormUrl(formSlug, itemName);
    }
  };

  const handleFormClick = async () => {
    await trackEvent('click_form', itemId, itemType as 'produto' | 'pacote', itemName);
    await createInfluencerReferral(itemId, itemType as 'produto' | 'pacote');
    window.location.href = getFormUrl(formSlug, itemName);
  };

  const lojaLink = useMemo(() => {
    const params = new URLSearchParams();
    if (influencerCode) params.set('influenciadores', influencerCode);
    const qs = params.toString();
    return `/loja${qs ? `?${qs}` : ''}`;
  }, [influencerCode]);

  const displayName = franchise?.nome_fantasia || franchise?.nome || tenant?.nome_fantasia || '';
  const address = franchise ? formatAddress(franchise) : null;
  const horario = franchise ? formatHorario(franchise.horario_funcionamento) : null;

  // =========================================================================
  // LOADING
  // =========================================================================

  if (isTenantLoading || isLoading) {
    return (
      <div className="min-h-screen" style={{ fontFamily: "'Montserrat', sans-serif", backgroundColor: COLORS.bg }}>
        {/* Header skeleton */}
        <div className="bg-white border-b border-gray-100">
          <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-32" />
          </div>
        </div>
        <div className="max-w-5xl mx-auto px-4 py-8">
          <div className="grid gap-8 md:grid-cols-2">
            <Skeleton className="aspect-square rounded-2xl" />
            <div className="space-y-4">
              <Skeleton className="h-6 w-1/4" />
              <Skeleton className="h-10 w-3/4" />
              <Skeleton className="h-8 w-1/3" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-14 w-full rounded-full" />
              <Skeleton className="h-14 w-full rounded-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // NOT FOUND
  // =========================================================================

  if (notFound) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center" style={{ fontFamily: "'Montserrat', sans-serif", backgroundColor: COLORS.bg }}>
        <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6" style={{ background: COLORS.purpleLight }}>
          <ShoppingBag className="h-10 w-10" style={{ color: COLORS.purple }} />
        </div>
        <h1 className="text-2xl font-bold" style={{ color: COLORS.text }}>Produto nao encontrado</h1>
        <p className="mt-2" style={{ color: COLORS.textSecondary }}>Este item pode ter sido removido ou nao esta mais disponivel.</p>
        <Link to={lojaLink}>
          <Button className="mt-6 rounded-full font-bold px-8 text-white" style={{ background: GRADIENT }}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar para a Loja
          </Button>
        </Link>
      </div>
    );
  }

  // =========================================================================
  // RENDER
  // =========================================================================

  return (
    <div className="min-h-screen" style={{ fontFamily: "'Montserrat', sans-serif", backgroundColor: COLORS.bg }}>
      {/* ====== HEADER (White, como site oficial) ====== */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to={lojaLink}>
              <Button size="sm" variant="ghost" className="gap-1.5 rounded-full hover:bg-gray-100" style={{ color: COLORS.purple }}>
                <ArrowLeft className="h-4 w-4" />
                Voltar
              </Button>
            </Link>
            <Link to={lojaLink}>
              <img src={LOGO_URL} alt={displayName} className="h-8" />
            </Link>
          </div>
          <div className="flex items-center gap-2">
            {whatsappNumber && (
              <Button
                size="sm"
                className="gap-1.5 rounded-full font-bold text-white border-0"
                style={{ backgroundColor: COLORS.green }}
                onClick={handleWhatsAppClick}
              >
                <MessageCircle className="h-4 w-4" />
                <span className="hidden sm:inline">WhatsApp</span>
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* === PRODUTO === */}
        {product && (
          <div className="grid gap-8 md:grid-cols-2">
            {/* Imagem */}
            <div className="aspect-square rounded-2xl overflow-hidden bg-white shadow-lg border border-gray-100">
              {product.imagem_url ? (
                <img src={product.imagem_url} alt={product.nome} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${COLORS.purpleLight}, ${COLORS.cyanLight})` }}>
                  <ShoppingBag className="h-24 w-24" style={{ color: COLORS.purple, opacity: 0.3 }} />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="space-y-5">
              {product.marca && (
                <span className="text-xs uppercase tracking-[0.2em] font-semibold" style={{ color: COLORS.purple }}>
                  {product.marca}
                </span>
              )}
              <h1 className="text-3xl md:text-4xl font-bold" style={{ color: COLORS.text }}>{product.nome}</h1>

              {product.categoria && (
                <Badge className="rounded-full px-3 py-1 text-white font-semibold text-xs" style={{ background: GRADIENT }}>
                  <Tag className="h-3 w-3 mr-1" />
                  {product.categoria}
                </Badge>
              )}

              {/* Preco */}
              <div className="p-4 rounded-2xl bg-white border border-gray-100 shadow-sm">
                <div className="flex items-baseline gap-3">
                  {product.preco_promocional && product.preco_promocional < (product.preco || 0) ? (
                    <>
                      <span className="text-lg line-through" style={{ color: COLORS.textSecondary }}>
                        {formatCurrency(product.preco)}
                      </span>
                      <span className="text-4xl font-black" style={{ color: COLORS.purple }}>
                        {formatCurrency(product.preco_promocional)}
                      </span>
                    </>
                  ) : (
                    <span className="text-4xl font-black" style={{ color: COLORS.purple }}>
                      {formatCurrency(product.preco)}
                    </span>
                  )}
                </div>
              </div>

              {product.descricao && (
                <p className="leading-relaxed whitespace-pre-wrap" style={{ color: COLORS.textSecondary }}>{product.descricao}</p>
              )}

              {(product.sku || product.gtin) && (
                <div className="flex gap-4 text-xs" style={{ color: COLORS.textSecondary }}>
                  {product.sku && (
                    <span className="flex items-center gap-1">
                      <Barcode className="h-3 w-3" />
                      SKU: {product.sku}
                    </span>
                  )}
                  {product.gtin && <span>EAN: {product.gtin}</span>}
                </div>
              )}

              {/* Trust Badges */}
              <div className="flex items-center gap-4 py-2">
                <div className="flex items-center gap-1.5 text-xs font-medium" style={{ color: COLORS.textSecondary }}>
                  <Shield className="h-4 w-4" style={{ color: COLORS.purple }} />
                  Compra segura
                </div>
                <div className="flex items-center gap-1.5 text-xs font-medium" style={{ color: COLORS.textSecondary }}>
                  <Star className="h-4 w-4" style={{ color: COLORS.gold }} />
                  Qualidade garantida
                </div>
              </div>

              <Separator />

              {/* CTAs */}
              <div className="flex flex-col gap-3">
                <Button
                  size="lg"
                  className="w-full text-white font-bold text-base rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-[1.02]"
                  style={{ background: GRADIENT }}
                  onClick={() => handleBuyClick(product.url)}
                >
                  <ShoppingBag className="h-5 w-5 mr-2" />
                  {product.url ? 'COMPRAR AGORA' : 'QUERO ESTE PRODUTO'}
                </Button>
                {whatsappNumber && (
                  <Button
                    size="lg"
                    className="w-full text-white font-bold text-base rounded-full border-0 shadow-lg hover:shadow-xl transition-all hover:scale-[1.02]"
                    style={{ backgroundColor: COLORS.green }}
                    onClick={handleWhatsAppClick}
                  >
                    <MessageCircle className="h-5 w-5 mr-2" />
                    TIRAR DUVIDAS NO WHATSAPP
                  </Button>
                )}
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full font-bold text-base rounded-full border-2 hover:bg-gray-50 transition-all"
                  style={{ borderColor: COLORS.purple, color: COLORS.purple }}
                  onClick={handleFormClick}
                >
                  <FileText className="h-5 w-5 mr-2" />
                  FORMULARIO DE CONTATO
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* === PACOTE === */}
        {pkg && (
          <div className="space-y-8">
            <div className="grid gap-8 md:grid-cols-2">
              {/* Imagem */}
              <div className="aspect-video rounded-2xl overflow-hidden bg-white shadow-lg border border-gray-100">
                {pkg.imagem_url ? (
                  <img src={pkg.imagem_url} alt={pkg.nome} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${COLORS.purpleLight}, ${COLORS.cyanLight})` }}>
                    <Package className="h-24 w-24" style={{ color: COLORS.purple, opacity: 0.3 }} />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="space-y-5">
                <div className="flex items-center gap-2 flex-wrap">
                  {pkg.is_promocional && (
                    <Badge className="rounded-full px-3 py-1 text-white font-bold text-xs" style={{ background: GRADIENT }}>
                      <Percent className="h-3 w-3 mr-1" />
                      Promocao
                    </Badge>
                  )}
                  {pkg.categoria && (
                    <Badge variant="outline" className="rounded-full px-3 py-1 font-medium text-xs" style={{ borderColor: COLORS.purple, color: COLORS.purple }}>
                      <Tag className="h-3 w-3 mr-1" />
                      {pkg.categoria}
                    </Badge>
                  )}
                </div>

                <h1 className="text-3xl md:text-4xl font-bold" style={{ color: COLORS.text }}>{pkg.nome}</h1>

                {/* Preco */}
                <div className="p-5 rounded-2xl bg-white border border-gray-100 shadow-sm">
                  <div className="flex items-baseline gap-3 flex-wrap">
                    {pkg.preco_original && pkg.preco_original > pkg.preco_pacote && (
                      <span className="text-lg line-through" style={{ color: COLORS.textSecondary }}>
                        {formatCurrency(pkg.preco_original)}
                      </span>
                    )}
                    <span className="text-4xl font-black" style={{ color: COLORS.purple }}>
                      {formatCurrency(pkg.preco_pacote)}
                    </span>
                    {pkg.desconto_percentual && pkg.desconto_percentual > 0 && (
                      <Badge className="text-white border-0 text-sm px-3 py-1 rounded-full font-bold" style={{ backgroundColor: COLORS.green }}>
                        -{Math.round(pkg.desconto_percentual)}%
                      </Badge>
                    )}
                  </div>
                </div>

                {pkg.data_fim && (
                  <div className="flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold" style={{ backgroundColor: 'rgba(234, 88, 12, 0.1)', color: '#EA580C' }}>
                    <Clock className="h-4 w-4" />
                    {daysRemaining(pkg.data_fim) === 0
                      ? 'Ultimo dia da promocao!'
                      : `Faltam ${daysRemaining(pkg.data_fim)} dias para aproveitar`}
                  </div>
                )}

                {pkg.descricao && (
                  <p className="leading-relaxed whitespace-pre-wrap" style={{ color: COLORS.textSecondary }}>{pkg.descricao}</p>
                )}

                {/* Trust Badges */}
                <div className="flex items-center gap-4 py-2">
                  <div className="flex items-center gap-1.5 text-xs font-medium" style={{ color: COLORS.textSecondary }}>
                    <Shield className="h-4 w-4" style={{ color: COLORS.purple }} />
                    Compra segura
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-medium" style={{ color: COLORS.textSecondary }}>
                    <Star className="h-4 w-4" style={{ color: COLORS.gold }} />
                    Melhor custo-beneficio
                  </div>
                </div>

                <Separator />

                {/* CTAs */}
                <div className="flex flex-col gap-3">
                  <Button
                    size="lg"
                    className="w-full text-white font-bold text-base rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-[1.02]"
                    style={{ background: GRADIENT }}
                    onClick={() => handleBuyClick(pkg.url)}
                  >
                    <ShoppingBag className="h-5 w-5 mr-2" />
                    {pkg.url ? 'COMPRAR AGORA' : 'QUERO ESTE PACOTE'}
                  </Button>
                  {whatsappNumber && (
                    <Button
                      size="lg"
                      className="w-full text-white font-bold text-base rounded-full border-0 shadow-lg hover:shadow-xl transition-all hover:scale-[1.02]"
                      style={{ backgroundColor: COLORS.green }}
                      onClick={handleWhatsAppClick}
                    >
                      <MessageCircle className="h-5 w-5 mr-2" />
                      TIRAR DUVIDAS NO WHATSAPP
                    </Button>
                  )}
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full font-bold text-base rounded-full border-2 hover:bg-gray-50 transition-all"
                    style={{ borderColor: COLORS.purple, color: COLORS.purple }}
                    onClick={handleFormClick}
                  >
                    <FileText className="h-5 w-5 mr-2" />
                    FORMULARIO DE CONTATO
                  </Button>
                </div>
              </div>
            </div>

            {/* Itens do Pacote */}
            {packageItems.length > 0 && (
              <Card className="border border-gray-100 shadow-lg rounded-2xl overflow-hidden">
                <CardHeader className="text-white py-5" style={{ background: GRADIENT }}>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <CheckCircle className="h-5 w-5" />
                    O que esta incluso ({packageItems.length} {packageItems.length === 1 ? 'item' : 'itens'})
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5">
                  <div className="space-y-3">
                    {packageItems.map((item) => (
                      <div key={item.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100 hover:shadow-sm transition-shadow">
                        {item.service?.imagem_url ? (
                          <img
                            src={item.service.imagem_url}
                            alt={item.service.nome}
                            className="h-14 w-14 rounded-xl object-cover"
                          />
                        ) : (
                          <div className="h-14 w-14 rounded-xl flex items-center justify-center" style={{ background: COLORS.purpleLight }}>
                            <ShoppingBag className="h-6 w-6" style={{ color: COLORS.purple }} />
                          </div>
                        )}
                        <div className="flex-1">
                          <p className="font-semibold" style={{ color: COLORS.text }}>{item.service?.nome}</p>
                          {item.quantidade > 1 && (
                            <p className="text-xs" style={{ color: COLORS.textSecondary }}>Quantidade: {item.quantidade}x</p>
                          )}
                        </div>
                        <span className="text-sm font-medium" style={{ color: COLORS.textSecondary }}>
                          {formatCurrency(item.preco_unitario || item.service?.preco)}
                        </span>
                      </div>
                    ))}
                  </div>
                  {pkg.preco_original && pkg.preco_original > pkg.preco_pacote && (
                    <div className="mt-5 p-4 rounded-2xl text-center" style={{ background: `linear-gradient(135deg, ${COLORS.purpleLight}, ${COLORS.cyanLight})`, border: `1px solid rgba(117, 61, 164, 0.2)` }}>
                      <p className="font-bold text-lg" style={{ color: COLORS.purple }}>
                        Voce economiza {formatCurrency(pkg.preco_original - pkg.preco_pacote)} com este pacote!
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </main>

      {/* ====== FOOTER (Dark, estilo site oficial) ====== */}
      <footer style={{ backgroundColor: COLORS.gray900 }} className="text-white mt-12">
        <div className="max-w-5xl mx-auto px-4 py-12">
          <div className="grid gap-8 md:grid-cols-3">
            {/* Coluna 1: Logo e endereco */}
            <div className="space-y-4">
              <img src={LOGO_URL} alt={displayName} className="h-10" style={{ filter: 'drop-shadow(0 0 6px rgba(255,255,255,0.5))' }} />
              {address && (
                <p className="text-gray-400 text-sm flex items-start gap-2">
                  <MapPin className="h-4 w-4 mt-0.5 shrink-0" style={{ color: COLORS.cyan }} />
                  {address}
                </p>
              )}
              {horario && (
                <p className="text-gray-400 text-sm flex items-center gap-2">
                  <Clock className="h-4 w-4 shrink-0" style={{ color: COLORS.cyan }} />
                  {horario}
                </p>
              )}
            </div>

            {/* Coluna 2: Contato */}
            <div className="space-y-4">
              <h4 className="font-bold text-lg">Contato</h4>
              {whatsappNumber && (
                <a
                  href={`https://wa.me/${whatsappNumber.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 text-sm flex items-center gap-2 hover:text-white transition-colors"
                >
                  <Phone className="h-4 w-4 shrink-0" style={{ color: COLORS.cyan }} />
                  {whatsappNumber}
                </a>
              )}
              {franchise?.email && (
                <a
                  href={`mailto:${franchise.email}`}
                  className="text-gray-400 text-sm flex items-center gap-2 hover:text-white transition-colors"
                >
                  <Mail className="h-4 w-4 shrink-0" style={{ color: COLORS.cyan }} />
                  {franchise.email}
                </a>
              )}
            </div>

            {/* Coluna 3: Atendimento */}
            <div className="space-y-4">
              <h4 className="font-bold text-lg">Atendimento</h4>
              {whatsappNumber && (
                <Button
                  size="sm"
                  className="w-full rounded-full font-bold text-white border-0"
                  style={{ backgroundColor: COLORS.green }}
                  onClick={handleWhatsAppClick}
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Fale pelo WhatsApp
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                className="w-full rounded-full font-bold border-gray-700 text-gray-300 hover:text-white hover:bg-gray-800"
                onClick={handleFormClick}
              >
                <FileText className="h-4 w-4 mr-2" />
                Formulario de Contato
              </Button>
              <Link to={lojaLink} className="block">
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full rounded-full font-bold border-gray-700 text-gray-300 hover:text-white hover:bg-gray-800"
                >
                  <ShoppingBag className="h-4 w-4 mr-2" />
                  Voltar para a Loja
                </Button>
              </Link>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-10 pt-6 text-center">
            <p className="text-xs text-gray-500">
              &copy; {new Date().getFullYear()} {tenant?.nome_fantasia}. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>

      {/* ====== BOTAO FLUTUANTE WHATSAPP ====== */}
      {whatsappNumber && (
        <button
          onClick={handleWhatsAppClick}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full flex items-center justify-center shadow-2xl hover:scale-110 transition-transform"
          style={{ backgroundColor: COLORS.green }}
          aria-label="WhatsApp"
        >
          <MessageCircle className="h-7 w-7 text-white" />
        </button>
      )}
    </div>
  );
}
