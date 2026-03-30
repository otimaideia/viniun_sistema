import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Copy,
  Share2,
  QrCode,
  MessageCircle,
  Mail,
  Users,
  Gift,
} from "lucide-react";
import type { Lead } from "@/types/lead-mt";
import { gerarLinkIndicacao, gerarMensagemWhatsApp } from "@/types/indicacao";

interface IndicacaoShareCardProps {
  lead: Lead;
  formularioSlug?: string;
  className?: string;
}

export function IndicacaoShareCard({ lead, formularioSlug, className }: IndicacaoShareCardProps) {
  const [showQR, setShowQR] = useState(false);

  if (!lead.codigo_indicacao) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Compartilhar Indicacao
          </CardTitle>
          <CardDescription>
            Este lead ainda nao possui codigo de indicacao
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            O codigo de indicacao sera gerado automaticamente apos salvar o lead.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Usa o formulário padrão centralizado (boas-vindas)
  const linkIndicacao = gerarLinkIndicacao(lead.codigo_indicacao);
  const mensagemWhatsApp = gerarMensagemWhatsApp(lead.nome, lead.codigo_indicacao);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(linkIndicacao);
    toast.success("Link copiado para a area de transferencia!");
  };

  const handleCopyCodigo = () => {
    navigator.clipboard.writeText(lead.codigo_indicacao || "");
    toast.success("Codigo copiado!");
  };

  const handleShareWhatsApp = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(mensagemWhatsApp)}`;
    window.open(url, "_blank");
  };

  const handleShareEmail = () => {
    const subject = encodeURIComponent("Indique e Ganhe - YESlaser");
    const body = encodeURIComponent(mensagemWhatsApp);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-primary" />
              Compartilhar Indicacao
            </CardTitle>
            <CardDescription>
              Compartilhe este codigo para ganhar beneficios
            </CardDescription>
          </div>
          {lead.quantidade_indicacoes !== undefined && lead.quantidade_indicacoes > 0 && (
            <Badge variant="secondary" className="gap-1">
              <Users className="h-3 w-3" />
              {lead.quantidade_indicacoes} indicacoes
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Codigo de Indicacao */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Codigo de Indicacao</label>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-muted rounded-lg p-3 text-center">
              <span className="text-2xl font-bold tracking-widest text-primary">
                {lead.codigo_indicacao}
              </span>
            </div>
            <Button variant="outline" size="icon" onClick={handleCopyCodigo}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Link de Indicacao */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Link de Indicacao</label>
          <div className="flex items-center gap-2">
            <Input
              value={linkIndicacao}
              readOnly
              className="text-sm"
            />
            <Button variant="outline" size="icon" onClick={handleCopyLink}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Botoes de Compartilhamento */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            className="gap-2"
            onClick={handleShareWhatsApp}
          >
            <MessageCircle className="h-4 w-4 text-green-500" />
            WhatsApp
          </Button>
          <Button
            variant="outline"
            className="gap-2"
            onClick={handleShareEmail}
          >
            <Mail className="h-4 w-4 text-blue-500" />
            E-mail
          </Button>
        </div>

        {/* Estatisticas */}
        {lead.quantidade_indicacoes !== undefined && (
          <div className="pt-4 border-t">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-primary">
                  {lead.quantidade_indicacoes}
                </p>
                <p className="text-xs text-muted-foreground">
                  Pessoas indicadas
                </p>
              </div>
              <div>
                <p className="text-2xl font-bold text-emerald-600">
                  {lead.quantidade_indicacoes > 0 ? "Ativo" : "Aguardando"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Status
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
