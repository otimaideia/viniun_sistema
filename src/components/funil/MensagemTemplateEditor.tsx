import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Plus,
  Edit2,
  Trash2,
  FileText,
  Copy,
  Loader2,
  MessageSquare,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  useFunilMensagemTemplatesAdapter,
  useFunilMensagemTemplateMutationsAdapter,
  type FunilMensagemTemplate,
} from '@/hooks/useFunilAutomacoesAdapter';

interface MensagemTemplateEditorProps {
  funilId: string;
}

// Variáveis disponíveis para templates
const VARIAVEIS_DISPONIVEIS = [
  { key: '{{nome}}', descricao: 'Nome do lead' },
  { key: '{{etapa}}', descricao: 'Nome da etapa atual' },
  { key: '{{unidade}}', descricao: 'Unidade/Franquia' },
  { key: '{{responsavel}}', descricao: 'Nome do responsável' },
  { key: '{{telefone}}', descricao: 'Telefone do lead' },
  { key: '{{data}}', descricao: 'Data atual formatada' },
];

export function MensagemTemplateEditor({ funilId }: MensagemTemplateEditorProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<FunilMensagemTemplate | null>(null);
  const [deleteTemplateId, setDeleteTemplateId] = useState<string | null>(null);

  const { templates, isLoading } = useFunilMensagemTemplatesAdapter(funilId);
  const { createTemplate, updateTemplate, deleteTemplate } =
    useFunilMensagemTemplateMutationsAdapter();
  const isCreating = createTemplate.isPending;
  const isUpdating = updateTemplate.isPending;
  const isDeleting = deleteTemplate.isPending;

  // Form state
  const [formNome, setFormNome] = useState('');
  const [formMensagem, setFormMensagem] = useState('');

  const handleOpenDialog = (template?: FunilMensagemTemplate) => {
    if (template) {
      setEditingTemplate(template);
      setFormNome(template.nome);
      setFormMensagem(template.conteudo);
    } else {
      setEditingTemplate(null);
      setFormNome('');
      setFormMensagem('');
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formNome.trim() || !formMensagem.trim()) {
      toast.error('Preencha todos os campos');
      return;
    }

    // Extrair variáveis usadas na mensagem
    const variaveisUsadas = VARIAVEIS_DISPONIVEIS.filter((v) =>
      formMensagem.includes(v.key)
    ).map((v) => v.key);

    try {
      const data = {
        funil_id: funilId,
        nome: formNome,
        tipo: 'texto' as const,
        conteudo: formMensagem,
        variaveis: variaveisUsadas,
        is_active: true,
      };

      if (editingTemplate) {
        await updateTemplate.mutateAsync({ id: editingTemplate.id, ...data });
      } else {
        await createTemplate.mutateAsync(data);
      }

      setIsDialogOpen(false);
    } catch (error) {
      console.error('Erro ao salvar template:', error);
    }
  };

  const handleDelete = async () => {
    if (!deleteTemplateId) return;

    try {
      await deleteTemplate.mutateAsync(deleteTemplateId);
      setDeleteTemplateId(null);
    } catch (error) {
      console.error('Erro ao excluir template:', error);
    }
  };

  const insertVariable = (variavel: string) => {
    setFormMensagem((prev) => prev + variavel);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiado!');
  };

  // Preview da mensagem com variáveis substituídas
  const getPreview = () => {
    let preview = formMensagem;
    preview = preview.replace(/{{nome}}/g, 'Maria Silva');
    preview = preview.replace(/{{etapa}}/g, 'Contato Iniciado');
    preview = preview.replace(/{{unidade}}/g, 'Viniun Centro');
    preview = preview.replace(/{{responsavel}}/g, 'João');
    preview = preview.replace(/{{telefone}}/g, '(11) 99999-9999');
    preview = preview.replace(/{{data}}/g, new Date().toLocaleDateString('pt-BR'));
    return preview;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Templates de Mensagem</CardTitle>
            <CardDescription>
              Crie templates para automações de WhatsApp
            </CardDescription>
          </div>
          <Button size="sm" onClick={() => handleOpenDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Template
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : templates.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nenhum template criado</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => handleOpenDialog()}
            >
              <Plus className="h-4 w-4 mr-2" />
              Criar primeiro template
            </Button>
          </div>
        ) : (
          <ScrollArea className="h-[300px]">
            <div className="space-y-2 pr-4">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className="p-3 rounded-lg border bg-muted/30 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-primary" />
                      <span className="font-medium">{template.nome}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => copyToClipboard(template.conteudo)}
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleOpenDialog(template)}
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive"
                        onClick={() => setDeleteTemplateId(template.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {template.conteudo}
                  </p>
                  {template.variaveis && template.variaveis.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {template.variaveis.map((v) => (
                        <Badge key={v} variant="outline" className="text-xs">
                          {v}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>

      {/* Dialog de edição */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? 'Editar Template' : 'Novo Template'}
            </DialogTitle>
            <DialogDescription>
              Crie uma mensagem com variáveis dinâmicas
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            {/* Formulário */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome do template</Label>
                <Input
                  id="nome"
                  value={formNome}
                  onChange={(e) => setFormNome(e.target.value)}
                  placeholder="Ex: Boas-vindas"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="mensagem">Mensagem</Label>
                <Textarea
                  id="mensagem"
                  value={formMensagem}
                  onChange={(e) => setFormMensagem(e.target.value)}
                  placeholder="Digite a mensagem..."
                  rows={6}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  Clique para inserir variáveis
                </Label>
                <div className="flex flex-wrap gap-1">
                  {VARIAVEIS_DISPONIVEIS.map((v) => (
                    <Button
                      key={v.key}
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => insertVariable(v.key)}
                      title={v.descricao}
                    >
                      {v.key}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            {/* Preview */}
            <div className="space-y-2">
              <Label>Preview</Label>
              <div className="bg-muted rounded-lg p-4 min-h-[200px]">
                <div className="bg-green-100 dark:bg-green-900/30 rounded-lg p-3 text-sm whitespace-pre-wrap">
                  {getPreview() || (
                    <span className="text-muted-foreground italic">
                      Digite uma mensagem para ver o preview
                    </span>
                  )}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                As variáveis serão substituídas pelos dados reais do lead
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={!formNome.trim() || !formMensagem.trim() || isCreating || isUpdating}
            >
              {isCreating || isUpdating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmação de exclusão */}
      <AlertDialog open={!!deleteTemplateId} onOpenChange={() => setDeleteTemplateId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover template?</AlertDialogTitle>
            <AlertDialogDescription>
              O template não poderá mais ser usado em automações.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
