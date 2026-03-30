import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "@/integrations/supabase/client";
import { useParceriaAuthContext } from "@/contexts/ParceriaAuthContext";
import { ParceriaLayout } from "@/components/parceiro-portal";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Building2,
  Users,
  TrendingUp,
  Copy,
  ExternalLink,
  Gift,
  CheckCircle2,
  Clock,
  AlertCircle,
  Globe,
  Instagram,
  Facebook,
  Linkedin,
  QrCode,
  Download,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import type { ParceriaBeneficio, ParceriaIndicacaoMetrics } from "@/types/parceria";
import { gerarLinkIndicacaoParceria } from "@/types/parceria";

// =====================================================
// Portal do Parceiro - Acesso Autenticado
// =====================================================

export default function PortalParceiro() {
  const { parceria, isLoading: isAuthLoading } = useParceriaAuthContext();
  const [showQRCode, setShowQRCode] = useState(false);

  // =====================================================
  // Query: Métricas de Indicações
  // =====================================================

  const { data: metrics, isLoading: isLoadingMetrics } = useQuery({
    queryKey: ["portal-parceria-metrics", parceria?.id],
    queryFn: async (): Promise<ParceriaIndicacaoMetrics> => {
      if (!parceria?.id) {
        return {
          total: 0,
          convertidas: 0,
          pendentes: 0,
          perdidas: 0,
          canceladas: 0,
          taxa_conversao: 0,
        };
      }

      const { data, error } = await supabase
        .from("mt_partnership_referrals")
        .select("status")
        .eq("parceria_id", parceria.id);

      if (error) throw error;

      const total = data?.length || 0;
      const convertidas = data?.filter((i) => i.status === "convertido").length || 0;
      const pendentes = data?.filter((i) => i.status === "pendente").length || 0;
      const perdidas = data?.filter((i) => i.status === "perdido").length || 0;
      const canceladas = data?.filter((i) => i.status === "cancelado").length || 0;

      return {
        total,
        convertidas,
        pendentes,
        perdidas,
        canceladas,
        taxa_conversao: total > 0 ? Math.round((convertidas / total) * 100 * 10) / 10 : 0,
      };
    },
    enabled: !!parceria?.id,
  });

  // =====================================================
  // Handlers
  // =====================================================

  const handleCopyCode = () => {
    if (parceria?.codigo_indicacao) {
      navigator.clipboard.writeText(parceria.codigo_indicacao);
      toast.success("Código copiado!");
    }
  };

  const handleCopyLink = () => {
    if (parceria?.codigo_indicacao) {
      const link = gerarLinkIndicacaoParceria(parceria.codigo_indicacao);
      navigator.clipboard.writeText(link);
      toast.success("Link de indicação copiado!");
    }
  };

  const downloadQRCode = () => {
    const svg = document.getElementById("qr-code-parceiro-svg");
    if (!svg) return;

    // Converter SVG para canvas e baixar como PNG
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL("image/png");

      const downloadLink = document.createElement("a");
      downloadLink.download = `qrcode-parceiro-${parceria?.codigo_indicacao || "indicacao"}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };

    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  };

  // =====================================================
  // Renderização: Loading
  // =====================================================

  if (isAuthLoading) {
    return (
      <ParceriaLayout>
        <div className="space-y-6">
          <Skeleton className="h-32 w-full" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
          <Skeleton className="h-64" />
        </div>
      </ParceriaLayout>
    );
  }

  // =====================================================
  // Renderização: Parceria Não Encontrada
  // =====================================================

  if (!parceria) {
    return (
      <ParceriaLayout>
        <Card className="max-w-md mx-auto">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Parceria não encontrada</h2>
            <p className="text-muted-foreground mb-4">
              Não foi possível carregar os dados da parceria.
            </p>
          </CardContent>
        </Card>
      </ParceriaLayout>
    );
  }

  // =====================================================
  // Dados Derivados
  // =====================================================

  const beneficiosAtivos = parceria.beneficios?.filter((b) => b.ativo) || [];
  const beneficioDestaque = beneficiosAtivos.find((b) => b.destaque);

  // =====================================================
  // Renderização Principal
  // =====================================================

  return (
    <ParceriaLayout>
      {/* Boas-vindas */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Bem-vindo, {parceria.nome_fantasia}!
        </h1>
        <p className="text-muted-foreground">
          Acompanhe suas indicações e compartilhe seu link exclusivo
        </p>
      </div>

      {/* Código de Indicação em Destaque */}
      <Card className="mb-6 border-blue-200 bg-gradient-to-r from-blue-50 to-white">
        <CardContent className="pt-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Seu código de indicação:</p>
              <div className="flex items-center gap-3">
                <span className="text-4xl font-mono font-bold text-blue-600">
                  {parceria.codigo_indicacao}
                </span>
                <Button variant="outline" size="sm" onClick={handleCopyCode}>
                  <Copy className="h-4 w-4 mr-1" />
                  Copiar
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button onClick={handleCopyLink} className="bg-blue-600 hover:bg-blue-700">
                <ExternalLink className="h-4 w-4 mr-2" />
                Copiar Link
              </Button>

              <Button variant="outline" onClick={() => setShowQRCode(true)}>
                <QrCode className="h-4 w-4 mr-2" />
                QR Code
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Indicações</p>
                <p className="text-3xl font-bold">{metrics?.total || 0}</p>
              </div>
              <Users className="h-10 w-10 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Convertidas</p>
                <p className="text-3xl font-bold text-green-600">{metrics?.convertidas || 0}</p>
              </div>
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pendentes</p>
                <p className="text-3xl font-bold text-yellow-600">{metrics?.pendentes || 0}</p>
              </div>
              <Clock className="h-10 w-10 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Taxa de Conversão</p>
                <p className="text-3xl font-bold text-blue-600">{metrics?.taxa_conversao || 0}%</p>
              </div>
              <TrendingUp className="h-10 w-10 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ações Rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <Link to="/parceiro/indicacoes">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Minhas Indicações</h3>
                    <p className="text-sm text-muted-foreground">
                      Visualizar todas as indicações
                    </p>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Link>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <Link to="/parceiro/ferramentas">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                    <QrCode className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Ferramentas de Divulgação</h3>
                    <p className="text-sm text-muted-foreground">
                      QR Code, links e materiais
                    </p>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Link>
        </Card>
      </div>

      {/* Benefícios Oferecidos */}
      {beneficiosAtivos.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5" />
              Benefícios para seus Indicados
            </CardTitle>
            <CardDescription>
              Seus indicados terão acesso a estes benefícios exclusivos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Benefício Destaque */}
              {beneficioDestaque && (
                <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className="bg-yellow-500 text-white p-2 rounded-lg">
                      <Gift className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold">{beneficioDestaque.titulo}</h4>
                        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                          Destaque
                        </Badge>
                      </div>
                      {beneficioDestaque.valor && (
                        <p className="text-lg font-bold text-yellow-700 mt-1">
                          {beneficioDestaque.valor}
                        </p>
                      )}
                      {beneficioDestaque.descricao && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {beneficioDestaque.descricao}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Outros Benefícios */}
              {beneficiosAtivos
                .filter((b) => !b.destaque)
                .map((beneficio) => (
                  <div
                    key={beneficio.id}
                    className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="font-medium">{beneficio.titulo}</h4>
                        {beneficio.valor && (
                          <p className="text-blue-600 font-semibold">{beneficio.valor}</p>
                        )}
                        {beneficio.descricao && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {beneficio.descricao}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Redes Sociais */}
      {(parceria.website || parceria.instagram || parceria.facebook || parceria.linkedin) && (
        <Card>
          <CardHeader>
            <CardTitle>Seus Links</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {parceria.website && (
                <Button variant="outline" asChild>
                  <a href={parceria.website} target="_blank" rel="noopener noreferrer">
                    <Globe className="h-4 w-4 mr-2" />
                    Website
                  </a>
                </Button>
              )}
              {parceria.instagram && (
                <Button variant="outline" asChild>
                  <a
                    href={`https://instagram.com/${parceria.instagram.replace("@", "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Instagram className="h-4 w-4 mr-2" />
                    Instagram
                  </a>
                </Button>
              )}
              {parceria.facebook && (
                <Button variant="outline" asChild>
                  <a href={parceria.facebook} target="_blank" rel="noopener noreferrer">
                    <Facebook className="h-4 w-4 mr-2" />
                    Facebook
                  </a>
                </Button>
              )}
              {parceria.linkedin && (
                <Button variant="outline" asChild>
                  <a href={parceria.linkedin} target="_blank" rel="noopener noreferrer">
                    <Linkedin className="h-4 w-4 mr-2" />
                    LinkedIn
                  </a>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modal QR Code */}
      <Dialog open={showQRCode} onOpenChange={setShowQRCode}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              QR Code de Indicação
            </DialogTitle>
            <DialogDescription>
              Escaneie o QR Code para acessar seu link de indicação
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center space-y-4">
            <div className="bg-white p-4 rounded-lg border shadow-sm">
              <QRCodeSVG
                id="qr-code-parceiro-svg"
                value={gerarLinkIndicacaoParceria(parceria?.codigo_indicacao || "")}
                size={200}
                level="H"
                includeMargin={true}
                bgColor="#ffffff"
                fgColor="#000000"
              />
            </div>

            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">
                Código: <span className="font-mono font-bold text-blue-600">{parceria?.codigo_indicacao}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                Escaneie com a câmera do celular para acessar o formulário de indicação
              </p>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={downloadQRCode}>
                <Download className="h-4 w-4 mr-2" />
                Baixar QR Code
              </Button>
              <Button onClick={handleCopyLink} className="bg-blue-600 hover:bg-blue-700">
                <ExternalLink className="h-4 w-4 mr-2" />
                Copiar Link
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </ParceriaLayout>
  );
}
