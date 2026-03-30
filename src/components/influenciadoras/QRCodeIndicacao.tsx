import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { QrCode, Copy, Download, Share2, Check } from 'lucide-react';
import { toast } from 'sonner';

interface QRCodeIndicacaoProps {
  codigo_indicacao: string;
  nome_influenciadora: string;
  formulario_slug?: string;
  tenant_slug?: string;
}

export function QRCodeIndicacao({
  codigo_indicacao,
  nome_influenciadora,
  formulario_slug = 'cadastro-leads',
  tenant_slug = 'yeslaser',
}: QRCodeIndicacaoProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [copied, setCopied] = useState(false);

  // Gerar URL de indicação
  const baseUrl = window.location.origin;
  const urlIndicacao = `${baseUrl}/form/${tenant_slug}/${formulario_slug}?influenciadores=${codigo_indicacao}`;

  // Função para copiar link
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(urlIndicacao);
      setCopied(true);
      toast.success('Link copiado para área de transferência!');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Erro ao copiar link');
    }
  };

  // Função para baixar QR Code
  const downloadQRCode = () => {
    const canvas = document.getElementById('qrcode-canvas') as HTMLCanvasElement;
    if (!canvas) return;

    const url = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `qrcode-${codigo_indicacao}.png`;
    link.href = url;
    link.click();

    toast.success('QR Code baixado!');
  };

  // Função para compartilhar (se suportado pelo navegador)
  const shareLink = async () => {
    if (!navigator.share) {
      toast.error('Compartilhamento não suportado neste navegador');
      return;
    }

    try {
      await navigator.share({
        title: `Indicação de ${nome_influenciadora}`,
        text: `Use meu código ${codigo_indicacao} para ganhar benefícios!`,
        url: urlIndicacao,
      });
      toast.success('Link compartilhado!');
    } catch (error) {
      // Usuário cancelou o compartilhamento
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowDialog(true)}
        className="gap-2"
      >
        <QrCode className="h-4 w-4" />
        Ver QR Code
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>QR Code de Indicação</DialogTitle>
            <DialogDescription>
              Compartilhe este código para rastrear suas indicações
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* QR Code */}
            <div className="flex flex-col items-center space-y-3">
              <div className="bg-white p-4 rounded-lg shadow-lg">
                <QRCodeSVG
                  id="qrcode-canvas"
                  value={urlIndicacao}
                  size={200}
                  level="H"
                  includeMargin
                />
              </div>

              <Badge variant="secondary" className="text-lg font-mono">
                {codigo_indicacao}
              </Badge>
            </div>

            {/* Link de Indicação */}
            <div className="space-y-2">
              <Label htmlFor="link">Link de Indicação</Label>
              <div className="flex gap-2">
                <Input
                  id="link"
                  value={urlIndicacao}
                  readOnly
                  className="font-mono text-xs"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={copyLink}
                  title="Copiar link"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Ações */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={downloadQRCode}
              >
                <Download className="mr-2 h-4 w-4" />
                Baixar QR Code
              </Button>
              {navigator.share && (
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={shareLink}
                >
                  <Share2 className="mr-2 h-4 w-4" />
                  Compartilhar
                </Button>
              )}
            </div>

            {/* Instruções */}
            <Card className="bg-muted/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Como usar?</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground space-y-2">
                <p>
                  1. <strong>Compartilhe o QR Code</strong> em suas redes sociais
                </p>
                <p>
                  2. <strong>Pessoas apontam a câmera</strong> e acessam o formulário
                </p>
                <p>
                  3. <strong>Indicação é registrada automaticamente</strong> com seu código
                </p>
                <p>
                  4. <strong>Acompanhe suas comissões</strong> na aba "Indicações"
                </p>
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
