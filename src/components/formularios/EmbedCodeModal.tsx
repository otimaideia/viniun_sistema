import React, { useState, useMemo } from 'react';
import { Copy, Check, Code, Frame, Smartphone, Monitor, Tablet } from 'lucide-react';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';

interface EmbedCodeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formularioSlug: string;
  formularioNome: string;
}

type EmbedType = 'iframe' | 'popup' | 'inline';
type DevicePreview = 'desktop' | 'tablet' | 'mobile';

const EmbedCodeModal: React.FC<EmbedCodeModalProps> = ({
  open,
  onOpenChange,
  formularioSlug,
  formularioNome,
}) => {
  const { toast } = useToast();
  const [embedType, setEmbedType] = useState<EmbedType>('iframe');
  const [width, setWidth] = useState('100%');
  const [height, setHeight] = useState('600');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [devicePreview, setDevicePreview] = useState<DevicePreview>('desktop');

  const baseUrl = window.location.origin;
  const formUrl = `${baseUrl}/form/${formularioSlug}`;

  // Gerar codigo iframe
  const iframeCode = useMemo(() => {
    return `<iframe
  src="${formUrl}"
  width="${width}"
  height="${height}px"
  frameborder="0"
  style="border: none; max-width: 100%;"
  title="${formularioNome}"
  loading="lazy"
></iframe>`;
  }, [formUrl, width, height, formularioNome]);

  // Gerar codigo popup/lightbox
  const popupCode = useMemo(() => {
    return `<!-- Botao para abrir o formulario -->
<button
  onclick="openViniunFormPopup()"
  style="
    background: #10b981;
    color: white;
    padding: 12px 24px;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-size: 16px;
  "
>
  Abrir Formulario
</button>

<!-- Script do popup -->
<script>
function openViniunFormPopup() {
  // Criar overlay
  var overlay = document.createElement('div');
  overlay.id = 'viniun-form-overlay';
  overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);z-index:9999;display:flex;align-items:center;justify-content:center;';

  // Criar container
  var container = document.createElement('div');
  container.style.cssText = 'background:white;border-radius:12px;max-width:90%;max-height:90%;width:600px;height:700px;position:relative;overflow:hidden;';

  // Botao fechar
  var closeBtn = document.createElement('button');
  closeBtn.innerHTML = '&times;';
  closeBtn.style.cssText = 'position:absolute;top:10px;right:10px;background:none;border:none;font-size:24px;cursor:pointer;z-index:10;color:#666;';
  closeBtn.onclick = function() { document.body.removeChild(overlay); };

  // Iframe
  var iframe = document.createElement('iframe');
  iframe.src = '${formUrl}';
  iframe.style.cssText = 'width:100%;height:100%;border:none;';

  container.appendChild(closeBtn);
  container.appendChild(iframe);
  overlay.appendChild(container);
  document.body.appendChild(overlay);

  // Fechar ao clicar no overlay
  overlay.onclick = function(e) {
    if (e.target === overlay) document.body.removeChild(overlay);
  };
}
</script>`;
  }, [formUrl]);

  // Gerar codigo inline (widget)
  const inlineCode = useMemo(() => {
    return `<!-- Container do formulario Viniun -->
<div id="viniun-form-container"></div>

<!-- Script de carregamento -->
<script>
(function() {
  var container = document.getElementById('viniun-form-container');
  if (!container) return;

  var iframe = document.createElement('iframe');
  iframe.src = '${formUrl}';
  iframe.style.cssText = 'width:100%;min-height:${height}px;border:none;display:block;';
  iframe.title = '${formularioNome}';
  iframe.loading = 'lazy';

  // Auto-resize baseado no conteudo
  window.addEventListener('message', function(e) {
    if (e.data && e.data.type === 'viniun-form-height') {
      iframe.style.height = e.data.height + 'px';
    }
  });

  container.appendChild(iframe);
})();
</script>`;
  }, [formUrl, height, formularioNome]);

  const getCurrentCode = () => {
    switch (embedType) {
      case 'iframe':
        return iframeCode;
      case 'popup':
        return popupCode;
      case 'inline':
        return inlineCode;
      default:
        return iframeCode;
    }
  };

  const copyToClipboard = async (code: string, type: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(type);
      toast({
        title: 'Codigo copiado!',
        description: 'O codigo de incorporacao foi copiado para a area de transferencia.',
      });
      setTimeout(() => setCopiedCode(null), 2000);
    } catch {
      toast({
        title: 'Erro ao copiar',
        description: 'Nao foi possivel copiar o codigo.',
        variant: 'destructive',
      });
    }
  };

  const getPreviewWidth = () => {
    switch (devicePreview) {
      case 'mobile':
        return '320px';
      case 'tablet':
        return '768px';
      case 'desktop':
        return '100%';
      default:
        return '100%';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Code className="h-5 w-5" />
            Codigo de Incorporacao
          </DialogTitle>
          <DialogDescription>
            Escolha como incorporar o formulario "{formularioNome}" em seu site
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="iframe" value={embedType} onValueChange={(v) => setEmbedType(v as EmbedType)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="iframe" className="flex items-center gap-2">
              <Frame className="h-4 w-4" />
              iFrame
            </TabsTrigger>
            <TabsTrigger value="popup" className="flex items-center gap-2">
              <Monitor className="h-4 w-4" />
              Popup
            </TabsTrigger>
            <TabsTrigger value="inline" className="flex items-center gap-2">
              <Code className="h-4 w-4" />
              Widget
            </TabsTrigger>
          </TabsList>

          <TabsContent value="iframe" className="space-y-4">
            <div className="bg-muted/50 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground mb-3">
                O metodo mais simples. Cole o codigo HTML diretamente na pagina onde deseja exibir o formulario.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="width">Largura</Label>
                  <Input
                    id="width"
                    value={width}
                    onChange={(e) => setWidth(e.target.value)}
                    placeholder="100% ou 600px"
                  />
                </div>
                <div>
                  <Label htmlFor="height">Altura (px)</Label>
                  <Input
                    id="height"
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                    placeholder="600"
                    type="number"
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="popup" className="space-y-4">
            <div className="bg-muted/50 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">
                Abre o formulario em uma janela popup/lightbox quando o visitante clicar em um botao.
                Ideal para captura de leads sem sair da pagina atual.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="inline" className="space-y-4">
            <div className="bg-muted/50 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground mb-3">
                Carrega o formulario dinamicamente em um container. Inclui auto-redimensionamento
                baseado no conteudo do formulario.
              </p>
              <div>
                <Label htmlFor="minHeight">Altura minima (px)</Label>
                <Input
                  id="minHeight"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  placeholder="600"
                  type="number"
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Codigo gerado */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Codigo HTML</Label>
            <Button
              variant="outline"
              size="sm"
              onClick={() => copyToClipboard(getCurrentCode(), embedType)}
              className="gap-2"
            >
              {copiedCode === embedType ? (
                <>
                  <Check className="h-4 w-4 text-green-500" />
                  Copiado!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copiar codigo
                </>
              )}
            </Button>
          </div>
          <div className="relative">
            <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto text-sm max-h-[200px] overflow-y-auto">
              <code>{getCurrentCode()}</code>
            </pre>
          </div>
        </div>

        {/* Preview */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Preview</Label>
            <RadioGroup
              value={devicePreview}
              onValueChange={(v) => setDevicePreview(v as DevicePreview)}
              className="flex gap-2"
            >
              <div className="flex items-center">
                <RadioGroupItem value="desktop" id="desktop" className="sr-only" />
                <Label
                  htmlFor="desktop"
                  className={`cursor-pointer p-2 rounded ${devicePreview === 'desktop' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
                >
                  <Monitor className="h-4 w-4" />
                </Label>
              </div>
              <div className="flex items-center">
                <RadioGroupItem value="tablet" id="tablet" className="sr-only" />
                <Label
                  htmlFor="tablet"
                  className={`cursor-pointer p-2 rounded ${devicePreview === 'tablet' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
                >
                  <Tablet className="h-4 w-4" />
                </Label>
              </div>
              <div className="flex items-center">
                <RadioGroupItem value="mobile" id="mobile" className="sr-only" />
                <Label
                  htmlFor="mobile"
                  className={`cursor-pointer p-2 rounded ${devicePreview === 'mobile' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
                >
                  <Smartphone className="h-4 w-4" />
                </Label>
              </div>
            </RadioGroup>
          </div>
          <div className="border rounded-lg p-4 bg-muted/30 flex justify-center">
            <div
              style={{ width: getPreviewWidth(), transition: 'width 0.3s ease' }}
              className="bg-white rounded-lg shadow-lg overflow-hidden"
            >
              <iframe
                src={formUrl}
                style={{ width: '100%', height: '400px', border: 'none' }}
                title={`Preview - ${formularioNome}`}
              />
            </div>
          </div>
        </div>

        {/* Link direto */}
        <div className="border-t pt-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <Label className="text-sm text-muted-foreground">Link direto do formulario</Label>
              <div className="flex items-center gap-2 mt-1">
                <code className="flex-1 bg-muted px-3 py-2 rounded text-sm truncate">
                  {formUrl}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(formUrl, 'link')}
                >
                  {copiedCode === 'link' ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EmbedCodeModal;
