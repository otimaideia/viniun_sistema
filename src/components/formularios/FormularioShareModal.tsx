import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Copy,
  Check,
  Share2,
  Link,
  QrCode,
  MessageCircle,
  Facebook,
  Twitter,
  Download,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

interface FormularioShareModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formularioSlug: string;
  formularioNome: string;
  codigoIndicacao?: string; // Se tiver codigo de indicacao para adicionar ao link
}

const FormularioShareModal: React.FC<FormularioShareModalProps> = ({
  open,
  onOpenChange,
  formularioSlug,
  formularioNome,
  codigoIndicacao,
}) => {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const baseUrl = window.location.origin;
  const formUrl = codigoIndicacao
    ? `${baseUrl}/form/${formularioSlug}?ref=${codigoIndicacao}`
    : `${baseUrl}/form/${formularioSlug}`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(formUrl);
      setCopied(true);
      toast({
        title: 'Link copiado!',
        description: 'O link do formulario foi copiado para a area de transferencia.',
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        title: 'Erro ao copiar',
        description: 'Nao foi possivel copiar o link.',
        variant: 'destructive',
      });
    }
  };

  const shareWhatsApp = () => {
    const text = encodeURIComponent(`Confira este formulario: ${formularioNome}\n${formUrl}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const shareFacebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(formUrl)}`, '_blank');
  };

  const shareTwitter = () => {
    const text = encodeURIComponent(`Confira este formulario: ${formularioNome}`);
    window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(formUrl)}&text=${text}`, '_blank');
  };

  const downloadQRCode = () => {
    const svg = document.getElementById('qr-code-svg');
    if (!svg) return;

    // Converter SVG para canvas e baixar como PNG
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL('image/png');

      const downloadLink = document.createElement('a');
      downloadLink.download = `qrcode-${formularioSlug}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Compartilhar Formulario
          </DialogTitle>
          <DialogDescription>
            Compartilhe o formulario "{formularioNome}" com seus clientes
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="link" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="link" className="flex items-center gap-2">
              <Link className="h-4 w-4" />
              Link
            </TabsTrigger>
            <TabsTrigger value="qrcode" className="flex items-center gap-2">
              <QrCode className="h-4 w-4" />
              QR Code
            </TabsTrigger>
          </TabsList>

          <TabsContent value="link" className="space-y-4">
            {/* Link do formulario */}
            <div className="space-y-2">
              <Label>Link do formulario</Label>
              <div className="flex items-center gap-2">
                <Input
                  value={formUrl}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={copyToClipboard}
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {codigoIndicacao && (
                <p className="text-xs text-muted-foreground">
                  Este link inclui seu codigo de indicacao: <code className="bg-muted px-1 rounded">{codigoIndicacao}</code>
                </p>
              )}
            </div>

            {/* Botoes de compartilhamento */}
            <div className="space-y-2">
              <Label>Compartilhar via</Label>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 gap-2"
                  onClick={shareWhatsApp}
                >
                  <MessageCircle className="h-4 w-4 text-green-500" />
                  WhatsApp
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 gap-2"
                  onClick={shareFacebook}
                >
                  <Facebook className="h-4 w-4 text-blue-600" />
                  Facebook
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 gap-2"
                  onClick={shareTwitter}
                >
                  <Twitter className="h-4 w-4 text-sky-500" />
                  Twitter
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="qrcode" className="space-y-4">
            {/* QR Code */}
            <div className="flex flex-col items-center space-y-4">
              <div className="bg-white p-4 rounded-lg border shadow-sm">
                <QRCodeSVG
                  id="qr-code-svg"
                  value={formUrl}
                  size={200}
                  level="H"
                  includeMargin={true}
                  bgColor="#ffffff"
                  fgColor="#000000"
                />
              </div>

              <p className="text-sm text-muted-foreground text-center">
                Escaneie o QR Code com a camera do celular para acessar o formulario
              </p>

              <Button
                variant="outline"
                className="gap-2"
                onClick={downloadQRCode}
              >
                <Download className="h-4 w-4" />
                Baixar QR Code
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        {/* Dica para indicacoes */}
        {!codigoIndicacao && (
          <div className="bg-muted/50 p-3 rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong>Dica:</strong> Para rastrear indicacoes, adicione seu codigo de indicacao ao link.
              Ex: {formUrl}?ref=SEU_CODIGO
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default FormularioShareModal;
