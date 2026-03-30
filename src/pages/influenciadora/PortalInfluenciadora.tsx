import { useState } from 'react';
import { Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { useInfluenciadoraAuthContext } from '@/contexts/InfluenciadoraAuthContext';
import { InfluenciadoraLayout } from '@/components/influenciadora-portal/InfluenciadoraLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Users,
  DollarSign,
  Wallet,
  Repeat,
  Image,
  Copy,
  Share2,
  ArrowRight,
  TrendingUp,
  CheckCircle2,
  Clock,
  Sparkles,
  ExternalLink,
  QrCode,
  Download,
  Megaphone,
  Tag,
  Percent,
  Calendar,
} from 'lucide-react';
import { formatSeguidores, formatCurrency, gerarLinkIndicacao } from '@/types/influenciadora';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { safeGetInitials } from '@/utils/unicodeSanitizer';
import { GuidedTour } from '@/components/influenciadora-portal/GuidedTour';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function PortalInfluenciadora() {
  const { influenciadora, refreshInfluenciadora } = useInfluenciadoraAuthContext();
  const { toast } = useToast();
  const [showQRCode, setShowQRCode] = useState(false);

  // Buscar estatísticas da influenciadora
  const { data: stats } = useQuery({
    queryKey: ['influenciadora-stats', influenciadora?.id],
    queryFn: async () => {
      if (!influenciadora?.id) return null;

      // Buscar indicações
      const { data: indicacoes, error: indicacoesError } = await supabase
        .from('mt_influencer_referrals')
        .select('id, status')
        .eq('influencer_id', influenciadora.id);

      // Buscar contrato ativo
      const { data: contrato, error: contratoError } = await supabase
        .from('mt_influencer_contracts')
        .select('*')
        .eq('influencer_id', influenciadora.id)
        .eq('status', 'ativo')
        .maybeSingle();

      // Buscar pagamentos
      const { data: pagamentos, error: pagamentosError } = await supabase
        .from('mt_influencer_payments')
        .select('amount, status, payment_method')
        .eq('influencer_id', influenciadora.id);

      // Buscar posts do mês
      const mesAtual = new Date().toISOString().slice(0, 7);
      const { data: posts, error: postsError } = await supabase
        .from('mt_influencer_posts')
        .select('id, status')
        .eq('influencer_id', influenciadora.id)
        .gte('created_at', `${mesAtual}-01`);

      const totalIndicacoes = indicacoes?.length || 0;
      const indicacoesConvertidas = indicacoes?.filter(i => i.status === 'convertido').length || 0;
      const taxaConversao = totalIndicacoes > 0 ? (indicacoesConvertidas / totalIndicacoes) * 100 : 0;

      const pagamentosPendentes = pagamentos?.filter(p => p.status === 'pendente' || p.status === 'aprovado') || [];
      const saldoPendente = pagamentosPendentes.reduce((acc, p) => acc + (p.amount || 0), 0);

      const creditoPermuta = contrato?.credito_permuta || 0;
      // Credito usado precisa ser calculado a partir dos pagamentos tipo permuta
      const pagamentosPermuta = pagamentos?.filter(p => p.payment_method === 'permuta') || [];
      const creditoUsado = pagamentosPermuta.reduce((acc, p) => acc + (p.amount || 0), 0);
      const creditoDisponivel = creditoPermuta - creditoUsado;

      const postsMes = posts?.length || 0;
      const postsAprovados = posts?.filter(p => p.status === 'aprovado').length || 0;

      return {
        totalIndicacoes,
        indicacoesConvertidas,
        taxaConversao,
        saldoPendente,
        creditoDisponivel,
        postsMes,
        postsAprovados,
        temContrato: !!contrato,
      };
    },
    enabled: !!influenciadora?.id,
    refetchInterval: 60000, // Atualizar a cada minuto
  });

  // Buscar promoções ativas
  const { data: promocoesAtivas } = useQuery({
    queryKey: ['portal-promocoes-dashboard', influenciadora?.tenant_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mt_promotions')
        .select('id, titulo, codigo, descricao, tipo, desconto_tipo, desconto_valor, data_inicio, data_fim, banner_url, cor_destaque, status, services:mt_promotion_services(*, service:mt_services(id, nome, preco, categoria))')
        .eq('tenant_id', influenciadora!.tenant_id)
        .eq('status', 'ativa')
        .eq('is_public', true)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(4);
      if (error) throw error;
      return data;
    },
    enabled: !!influenciadora?.tenant_id,
  });

  // Buscar adesões da influenciadora
  const { data: minhasAdesoes } = useQuery({
    queryKey: ['portal-subscriptions-dashboard', influenciadora?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mt_promotion_subscriptions')
        .select('promotion_id, status, link_gerado, total_cliques, total_leads, total_vendas')
        .eq('influencer_id', influenciadora!.id)
        .in('status', ['aderido', 'pendente']);
      if (error) throw error;
      return data;
    },
    enabled: !!influenciadora?.id,
  });

  const getAdesao = (promotionId: string) => minhasAdesoes?.find(a => a.promotion_id === promotionId);

  const handleCopyPromoLink = (promoCode: string) => {
    if (!influenciadora?.codigo_indicacao) return;
    const link = `${window.location.origin}/form/boas-vindas?influenciadores=${influenciadora.codigo_indicacao}&promo=${promoCode}`;
    navigator.clipboard.writeText(link);
    toast({
      title: 'Link da promoção copiado!',
      description: 'Cole e compartilhe com seus seguidores.',
    });
  };

  const handleCopyCode = () => {
    if (influenciadora?.codigo_indicacao) {
      navigator.clipboard.writeText(influenciadora.codigo_indicacao);
      toast({
        title: 'Código copiado!',
        description: 'Cole e compartilhe com seus seguidores.',
      });
    }
  };

  const handleCopyLink = () => {
    if (influenciadora?.codigo_indicacao) {
      const link = gerarLinkIndicacao(influenciadora.codigo_indicacao);
      navigator.clipboard.writeText(link);
      toast({
        title: 'Link copiado!',
        description: 'Compartilhe o link com seus seguidores.',
      });
    }
  };

  const handleShare = async () => {
    if (influenciadora?.codigo_indicacao) {
      const link = gerarLinkIndicacao(influenciadora.codigo_indicacao);
      const text = `Olá! Eu indico a YESlaser para você! Use meu código ${influenciadora.codigo_indicacao} ou acesse: ${link}`;

      if (navigator.share) {
        try {
          await navigator.share({
            title: 'YESlaser - Indicação',
            text,
            url: link,
          });
        } catch (err) {
          // Usuário cancelou
        }
      } else {
        navigator.clipboard.writeText(text);
        toast({
          title: 'Mensagem copiada!',
          description: 'Cole e envie para seus seguidores.',
        });
      }
    }
  };

  const downloadQRCode = () => {
    const svg = document.getElementById("qr-code-influenciadora-svg");
    if (!svg) return;

    // Converter SVG para canvas e baixar como PNG
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new window.Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL("image/png");

      const downloadLink = document.createElement("a");
      downloadLink.download = `qrcode-influenciadora-${influenciadora?.codigo_indicacao || "indicacao"}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };

    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  };

  const displayName = influenciadora?.nome_artistico || influenciadora?.nome_completo || '';

  return (
    <InfluenciadoraLayout>
      <div className="space-y-6">
        {/* Boas-vindas */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 border-2 border-[#662E8E]/20">
              <AvatarImage src={influenciadora?.foto_perfil} />
              <AvatarFallback className="bg-[#662E8E]/10 text-[#662E8E] text-xl">
                {safeGetInitials(displayName)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Olá, {displayName.split(' ')[0]}!
              </h1>
              <p className="text-gray-500">
                Confira suas estatísticas e gerencie suas indicações
              </p>
            </div>
          </div>

          {/* Código de Indicação */}
          <Card className="bg-gradient-to-r from-[#662E8E] to-[#662E8E]/90 text-white border-0">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div>
                  <p className="text-sm text-white/80">Seu código de indicação</p>
                  <p className="text-2xl font-bold tracking-wider">
                    {influenciadora?.codigo_indicacao || '---'}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-white hover:bg-white/20"
                    onClick={handleCopyCode}
                    title="Copiar código"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-white hover:bg-white/20"
                    onClick={() => setShowQRCode(true)}
                    title="QR Code"
                  >
                    <QrCode className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-white hover:bg-white/20"
                    onClick={handleShare}
                    title="Compartilhar"
                  >
                    <Share2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Cards de Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Indicações
              </CardTitle>
              <Users className="h-4 w-4 text-[#662E8E]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalIndicacoes || 0}</div>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  {stats?.indicacoesConvertidas || 0} convertidas
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Taxa de Conversão
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-[#662E8E]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(stats?.taxaConversao || 0).toFixed(1)}%
              </div>
              <p className="text-xs text-gray-500 mt-1">
                das indicações convertidas
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Saldo a Receber
              </CardTitle>
              <Wallet className="h-4 w-4 text-[#662E8E]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(stats?.saldoPendente || 0)}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                pagamentos pendentes
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Crédito Permuta
              </CardTitle>
              <Repeat className="h-4 w-4 text-[#662E8E]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[#662E8E]">
                {formatCurrency(stats?.creditoDisponivel || 0)}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                disponível para procedimentos
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Promoções Ativas */}
        {promocoesAtivas && promocoesAtivas.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Megaphone className="h-5 w-5 text-[#662E8E]" />
                <h2 className="text-lg font-semibold">Promoções Ativas</h2>
                <Badge className="bg-[#662E8E]/10 text-[#662E8E] border-0">
                  {promocoesAtivas.length}
                </Badge>
              </div>
              <Link to="/influenciadores/promocoes">
                <Button variant="outline" size="sm">
                  Ver todas
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {promocoesAtivas.map((promo) => {
                const adesao = getAdesao(promo.id);
                const isAderido = adesao?.status === 'aderido';

                return (
                  <Card key={promo.id} className="overflow-hidden border-l-4" style={{ borderLeftColor: promo.cor_destaque || '#662E8E' }}>
                    {promo.banner_url && (
                      <div className="h-32 overflow-hidden">
                        <img src={promo.banner_url} alt={promo.titulo} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-base truncate">{promo.titulo}</CardTitle>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              <Tag className="h-3 w-3 mr-1" />
                              {promo.codigo}
                            </Badge>
                            {promo.desconto_tipo && promo.desconto_valor && (
                              <Badge className="bg-green-100 text-green-700 border-0 text-xs">
                                {promo.desconto_tipo === 'percentual' ? (
                                  <><Percent className="h-3 w-3 mr-1" />{promo.desconto_valor}% OFF</>
                                ) : (
                                  <>R$ {promo.desconto_valor} OFF</>
                                )}
                              </Badge>
                            )}
                          </div>
                        </div>
                        {isAderido && (
                          <Badge className="bg-[#662E8E]/10 text-[#662E8E] border-0 shrink-0">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Aderido
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {promo.descricao && (
                        <p className="text-sm text-gray-500 line-clamp-2">{promo.descricao}</p>
                      )}

                      {/* Serviços incluídos */}
                      {promo.services && promo.services.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {promo.services.slice(0, 3).map((ps: any) => (
                            <Badge key={ps.id} variant="secondary" className="text-xs">
                              {ps.service?.nome}
                            </Badge>
                          ))}
                          {promo.services.length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{promo.services.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}

                      {/* Validade */}
                      {promo.data_fim && (
                        <p className="text-xs text-gray-400 flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Até {format(new Date(promo.data_fim), "dd/MM/yyyy", { locale: ptBR })}
                        </p>
                      )}

                      {/* Ações */}
                      {isAderido ? (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1"
                            onClick={() => handleCopyPromoLink(promo.codigo)}
                          >
                            <Copy className="h-3 w-3 mr-1" />
                            Copiar link
                          </Button>
                          <Link to="/influenciadores/promocoes" className="flex-1">
                            <Button size="sm" variant="outline" className="w-full">
                              <ExternalLink className="h-3 w-3 mr-1" />
                              Detalhes
                            </Button>
                          </Link>
                        </div>
                      ) : (
                        <Link to="/influenciadores/promocoes">
                          <Button size="sm" className="w-full bg-[#662E8E] hover:bg-[#662E8E]/90">
                            <Megaphone className="h-3 w-3 mr-1" />
                            Aderir a esta promoção
                          </Button>
                        </Link>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Links Rápidos */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card de Compartilhar */}
          <Card className="bg-gradient-to-br from-[#F2B705]/10 to-[#F2B705]/5 border-[#F2B705]/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Share2 className="h-5 w-5 text-[#662E8E]" />
                Compartilhar Link
              </CardTitle>
              <CardDescription>
                Compartilhe seu link exclusivo e ganhe comissões
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={
                    influenciadora?.codigo_indicacao
                      ? gerarLinkIndicacao(influenciadora.codigo_indicacao)
                      : ''
                  }
                  className="bg-white"
                />
                <Button variant="outline" size="icon" onClick={handleCopyLink}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <Button
                className="w-full bg-[#662E8E] hover:bg-[#662E8E]/90"
                onClick={handleShare}
              >
                <Share2 className="h-4 w-4 mr-2" />
                Compartilhar agora
              </Button>
            </CardContent>
          </Card>

          {/* Ações Rápidas */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-[#662E8E]" />
                Ações Rápidas
              </CardTitle>
              <CardDescription>
                Acesse rapidamente as principais funções
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link to="/influenciadores/indicacoes">
                <Button variant="outline" className="w-full justify-between">
                  <span className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Ver minhas indicações
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/influenciadores/posts">
                <Button variant="outline" className="w-full justify-between">
                  <span className="flex items-center gap-2">
                    <Image className="h-4 w-4" />
                    Registrar novo post
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/influenciadores/permutas">
                <Button variant="outline" className="w-full justify-between">
                  <span className="flex items-center gap-2">
                    <Repeat className="h-4 w-4" />
                    Agendar permuta
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/influenciadores/promocoes">
                <Button variant="outline" className="w-full justify-between">
                  <span className="flex items-center gap-2">
                    <Megaphone className="h-4 w-4" />
                    Ver promoções ativas
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Posts do Mês */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Image className="h-5 w-5 text-[#662E8E]" />
                Posts deste mês
              </CardTitle>
              <CardDescription>
                Acompanhe sua produção de conteúdo
              </CardDescription>
            </div>
            <Link to="/influenciadores/posts">
              <Button variant="outline" size="sm">
                Ver todos
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#662E8E]/10 mb-4">
                  <Image className="h-8 w-8 text-[#662E8E]" />
                </div>
                <p className="text-2xl font-bold text-gray-900">{stats?.postsMes || 0}</p>
                <p className="text-gray-500">posts registrados</p>
                {(stats?.postsAprovados || 0) > 0 && (
                  <Badge className="mt-2 bg-green-100 text-green-700">
                    {stats?.postsAprovados} aprovados
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Redes Sociais */}
        {influenciadora?.redes_sociais && influenciadora.redes_sociais.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Suas Redes Sociais</CardTitle>
              <CardDescription>
                Seguidores e engajamento das suas redes cadastradas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {influenciadora.redes_sociais.map((rede) => (
                  <div
                    key={rede.id}
                    className="flex flex-col items-center p-4 bg-gray-50 rounded-lg"
                  >
                    <p className="text-sm font-medium text-gray-600 capitalize">
                      {rede.plataforma}
                    </p>
                    <p className="text-xl font-bold text-[#662E8E]">
                      {formatSeguidores(rede.seguidores)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {rede.taxa_engajamento}% engajamento
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Modal QR Code */}
        <Dialog open={showQRCode} onOpenChange={setShowQRCode}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <QrCode className="h-5 w-5 text-[#662E8E]" />
                QR Code de Indicação
              </DialogTitle>
              <DialogDescription>
                Escaneie o QR Code para acessar seu link de indicação
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col items-center space-y-4">
              <div className="bg-white p-4 rounded-lg border shadow-sm">
                <QRCodeSVG
                  id="qr-code-influenciadora-svg"
                  value={gerarLinkIndicacao(influenciadora?.codigo_indicacao || "")}
                  size={200}
                  level="H"
                  includeMargin={true}
                  bgColor="#ffffff"
                  fgColor="#662E8E"
                />
              </div>

              <div className="text-center">
                <p className="text-sm text-gray-500 mb-2">
                  Código: <span className="font-mono font-bold text-[#662E8E]">{influenciadora?.codigo_indicacao}</span>
                </p>
                <p className="text-xs text-gray-500">
                  Escaneie com a câmera do celular para acessar o formulário de indicação
                </p>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={downloadQRCode}>
                  <Download className="h-4 w-4 mr-2" />
                  Baixar QR Code
                </Button>
                <Button
                  className="bg-[#662E8E] hover:bg-[#662E8E]/90"
                  onClick={handleCopyLink}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copiar Link
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tour guiado - exibe apenas na primeira visita */}
      <GuidedTour />
    </InfluenciadoraLayout>
  );
}
