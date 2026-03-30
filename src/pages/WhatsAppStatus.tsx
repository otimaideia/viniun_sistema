import { useState, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Plus,
  Type,
  Image as ImageIcon,
  Video,
  Send,
  Loader2,
  X,
  Palette,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ModuleLayout } from '@/components/shared/index';
import { useWhatsAppSessionsAdapter } from '@/hooks/useWhatsAppSessionsAdapter';
import { useStatus, STATUS_BACKGROUND_COLORS, STATUS_FONTS } from '@/hooks/useStatus';
import { useUserProfileAdapter } from '@/hooks/useUserProfileAdapter';

export default function WhatsAppStatus() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionIdParam = searchParams.get('session');
  const { isUnidade, unidadeId } = useUserProfileAdapter();

  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(sessionIdParam);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [createType, setCreateType] = useState<'text' | 'image' | 'video'>('text');

  // Estado para status de texto
  const [statusText, setStatusText] = useState('');
  const [backgroundColor, setBackgroundColor] = useState(STATUS_BACKGROUND_COLORS[0].hex);
  const [fontId, setFontId] = useState(0);

  // Estado para status de mídia
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Hooks
  const { sessions: sessoes, isLoading: loadingSessions } = useWhatsAppSessionsAdapter(isUnidade ? unidadeId || undefined : undefined);
  const validSessions = sessoes.filter(s => s.status === 'working');

  const currentSession = validSessions.find(s => s.id === selectedSessionId);

  const { sendTextStatus, sendImageStatus, sendVideoStatus, isLoading: isSending } = useStatus({
    sessionName: currentSession?.session_name || '',
    onSuccess: () => {
      resetForm();
      setIsCreateDialogOpen(false);
    },
  });

  const resetForm = () => {
    setStatusText('');
    setBackgroundColor(STATUS_BACKGROUND_COLORS[0].hex);
    setFontId(0);
    setSelectedFile(null);
    setMediaPreview(null);
    setCaption('');
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);

    // Criar preview
    const reader = new FileReader();
    reader.onload = (ev) => {
      setMediaPreview(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSendTextStatus = async () => {
    if (!statusText.trim()) return;

    await sendTextStatus.mutateAsync({
      text: statusText,
      backgroundColor,
      font: fontId,
    });
  };

  const handleSendMediaStatus = async () => {
    if (!selectedFile || !currentSession) return;

    setIsUploading(true);
    try {
      // Converter arquivo para base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          const base64Data = result.split(',')[1];
          resolve(base64Data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(selectedFile);
      });

      const fileData = {
        base64,
        mimetype: selectedFile.type,
      };

      if (createType === 'image') {
        await sendImageStatus.mutateAsync({
          file: fileData,
          caption: caption || undefined,
        });
      } else if (createType === 'video') {
        await sendVideoStatus.mutateAsync({
          file: fileData,
          caption: caption || undefined,
        });
      }
    } catch (error) {
      console.error('Erro ao enviar status:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSend = () => {
    if (createType === 'text') {
      handleSendTextStatus();
    } else {
      handleSendMediaStatus();
    }
  };

  // Se não há sessão selecionada, mostrar seletor
  if (!selectedSessionId && validSessions.length > 0) {
    setSelectedSessionId(validSessions[0].id);
  }

  return (
    <ModuleLayout
      title="Status"
      description="Publique atualizações para seus contatos"
      breadcrumbs={[
        { label: 'WhatsApp', href: '/whatsapp' },
        { label: 'Status' },
      ]}
      actions={
        validSessions.length > 1 ? (
          <Select
            value={selectedSessionId || ''}
            onValueChange={setSelectedSessionId}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Selecione a sessão" />
            </SelectTrigger>
            <SelectContent>
              {validSessions.map((session) => (
                <SelectItem key={session.id} value={session.id}>
                  {session.nome || session.session_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : undefined
      }
    >

      {/* Conteúdo */}
      <div className="py-4">
        {loadingSessions ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : validSessions.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="rounded-full bg-muted p-4 mb-4">
                <ImageIcon className="h-8 w-8 text-muted-foreground" />
              </div>
              <h2 className="text-lg font-semibold">Nenhuma sessão ativa</h2>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                Você precisa ter uma sessão WhatsApp ativa para publicar status.
              </p>
              <Button
                className="mt-4"
                onClick={() => navigate('/whatsapp/sessoes')}
              >
                Ir para Sessões
              </Button>
            </div>
          ) : (
            <div className="max-w-2xl mx-auto space-y-6">
              {/* Meu Status */}
              <div className="rounded-lg border bg-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">Meu Status</h2>
                  <Button onClick={() => setIsCreateDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Novo Status
                  </Button>
                </div>

                <p className="text-sm text-muted-foreground">
                  Clique em "Novo Status" para publicar uma atualização.
                  <br />
                  Seus contatos poderão ver por 24 horas.
                </p>

                {/* Cards de tipo de status */}
                <div className="grid grid-cols-3 gap-4 mt-6">
                  <button
                    onClick={() => {
                      setCreateType('text');
                      setIsCreateDialogOpen(true);
                    }}
                    className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 hover:border-primary hover:bg-muted/50 transition-colors"
                  >
                    <div className="rounded-full bg-primary/10 p-3">
                      <Type className="h-6 w-6 text-primary" />
                    </div>
                    <span className="text-sm font-medium">Texto</span>
                  </button>

                  <button
                    onClick={() => {
                      setCreateType('image');
                      setIsCreateDialogOpen(true);
                    }}
                    className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 hover:border-primary hover:bg-muted/50 transition-colors"
                  >
                    <div className="rounded-full bg-green-500/10 p-3">
                      <ImageIcon className="h-6 w-6 text-green-500" />
                    </div>
                    <span className="text-sm font-medium">Imagem</span>
                  </button>

                  <button
                    onClick={() => {
                      setCreateType('video');
                      setIsCreateDialogOpen(true);
                    }}
                    className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 hover:border-primary hover:bg-muted/50 transition-colors"
                  >
                    <div className="rounded-full bg-blue-500/10 p-3">
                      <Video className="h-6 w-6 text-blue-500" />
                    </div>
                    <span className="text-sm font-medium">Vídeo</span>
                  </button>
                </div>
              </div>

              {/* Info */}
              <div className="rounded-lg border bg-muted/50 p-4">
                <h3 className="font-medium mb-2">Sobre o Status</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Status ficam visíveis por 24 horas</li>
                  <li>• Você pode publicar texto, imagens ou vídeos</li>
                  <li>• Todos os seus contatos poderão ver</li>
                  <li>• Use cores e fontes para personalizar textos</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Dialog de Criar Status */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Novo Status</DialogTitle>
            </DialogHeader>

            <Tabs value={createType} onValueChange={(v) => setCreateType(v as typeof createType)}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="text" className="gap-2">
                  <Type className="h-4 w-4" />
                  Texto
                </TabsTrigger>
                <TabsTrigger value="image" className="gap-2">
                  <ImageIcon className="h-4 w-4" />
                  Imagem
                </TabsTrigger>
                <TabsTrigger value="video" className="gap-2">
                  <Video className="h-4 w-4" />
                  Vídeo
                </TabsTrigger>
              </TabsList>

              {/* Tab: Texto */}
              <TabsContent value="text" className="space-y-4 mt-4">
                {/* Preview */}
                <div
                  className="rounded-lg p-6 min-h-[200px] flex items-center justify-center"
                  style={{ backgroundColor }}
                >
                  <p
                    className="text-white text-xl text-center font-medium"
                    style={{
                      fontFamily: STATUS_FONTS[fontId]?.name || 'sans-serif',
                    }}
                  >
                    {statusText || 'Digite seu status...'}
                  </p>
                </div>

                {/* Texto */}
                <div>
                  <Label>Mensagem</Label>
                  <Textarea
                    value={statusText}
                    onChange={(e) => setStatusText(e.target.value)}
                    placeholder="O que você está pensando?"
                    className="mt-1"
                    rows={3}
                    maxLength={700}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {statusText.length}/700 caracteres
                  </p>
                </div>

                {/* Cor de fundo */}
                <div>
                  <Label className="flex items-center gap-2">
                    <Palette className="h-4 w-4" />
                    Cor de fundo
                  </Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {STATUS_BACKGROUND_COLORS.map((color) => (
                      <button
                        key={color.id}
                        onClick={() => setBackgroundColor(color.hex)}
                        className={`h-8 w-8 rounded-full transition-transform hover:scale-110 ${
                          backgroundColor === color.hex
                            ? 'ring-2 ring-primary ring-offset-2'
                            : ''
                        }`}
                        style={{ backgroundColor: color.hex }}
                        title={color.name}
                      />
                    ))}
                  </div>
                </div>

                {/* Fonte */}
                <div>
                  <Label>Fonte</Label>
                  <Select
                    value={fontId.toString()}
                    onValueChange={(v) => setFontId(parseInt(v))}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_FONTS.map((font) => (
                        <SelectItem key={font.id} value={font.id.toString()}>
                          {font.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </TabsContent>

              {/* Tab: Imagem */}
              <TabsContent value="image" className="space-y-4 mt-4">
                {mediaPreview ? (
                  <div className="relative">
                    <img
                      src={mediaPreview}
                      alt="Preview"
                      className="w-full rounded-lg max-h-[300px] object-contain bg-muted"
                    />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2"
                      onClick={() => {
                        setSelectedFile(null);
                        setMediaPreview(null);
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full rounded-lg border-2 border-dashed p-12 hover:border-primary hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <ImageIcon className="h-12 w-12 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        Clique para selecionar uma imagem
                      </span>
                    </div>
                  </button>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileSelect}
                />

                <div>
                  <Label>Legenda (opcional)</Label>
                  <Input
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Adicione uma legenda..."
                    className="mt-1"
                  />
                </div>
              </TabsContent>

              {/* Tab: Vídeo */}
              <TabsContent value="video" className="space-y-4 mt-4">
                {mediaPreview ? (
                  <div className="relative">
                    <video
                      src={mediaPreview}
                      controls
                      className="w-full rounded-lg max-h-[300px] bg-muted"
                    />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2"
                      onClick={() => {
                        setSelectedFile(null);
                        setMediaPreview(null);
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full rounded-lg border-2 border-dashed p-12 hover:border-primary hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <Video className="h-12 w-12 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        Clique para selecionar um vídeo
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Máximo: 30 segundos
                      </span>
                    </div>
                  </button>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={handleFileSelect}
                />

                <div>
                  <Label>Legenda (opcional)</Label>
                  <Input
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Adicione uma legenda..."
                    className="mt-1"
                  />
                </div>
              </TabsContent>
            </Tabs>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  resetForm();
                  setIsCreateDialogOpen(false);
                }}
                disabled={isSending || isUploading}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSend}
                disabled={
                  isSending ||
                  isUploading ||
                  (createType === 'text' && !statusText.trim()) ||
                  ((createType === 'image' || createType === 'video') && !selectedFile)
                }
              >
                {(isSending || isUploading) ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Publicando...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Publicar
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
    </ModuleLayout>
  );
}
