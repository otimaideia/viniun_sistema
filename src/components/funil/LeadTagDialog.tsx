import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tag, X, Loader2, Plus } from 'lucide-react';
import type { FunilLeadExpanded } from '@/types/funil';

interface LeadTagDialogProps {
  lead: FunilLeadExpanded | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (tags: string[]) => Promise<void>;
}

// Tags comuns sugeridas
const TAGS_SUGERIDAS = [
  'VIP',
  'Urgente',
  'Promocional',
  'Reativação',
  'Indicação',
  'Facebook',
  'Instagram',
  'Google',
  'Retorno',
  'Primeira vez',
  'Consulta grátis',
  'Pacote fechado',
];

export function LeadTagDialog({
  lead,
  open,
  onOpenChange,
  onSave,
}: LeadTagDialogProps) {
  const [tags, setTags] = useState<string[]>([]);
  const [novaTag, setNovaTag] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Definir tags iniciais quando abrir o dialog
  useEffect(() => {
    if (open && lead) {
      setTags(lead.tags || []);
      setNovaTag('');
    }
  }, [open, lead]);

  const handleAddTag = () => {
    const tagNormalizada = novaTag.trim();
    if (tagNormalizada && !tags.includes(tagNormalizada)) {
      setTags([...tags, tagNormalizada]);
      setNovaTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleAddSuggested = (tag: string) => {
    if (!tags.includes(tag)) {
      setTags([...tags, tag]);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(tags);
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  if (!lead) return null;

  const leadData = lead.lead;
  const availableSuggestions = TAGS_SUGERIDAS.filter((t) => !tags.includes(t));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Tags do Lead</DialogTitle>
          <DialogDescription>
            Gerencie as tags do lead <strong>{leadData?.nome || 'Lead'}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {/* Tags atuais */}
          <div className="space-y-2">
            <Label>Tags atuais</Label>
            <div className="flex flex-wrap gap-2 min-h-[40px] p-2 border rounded-md bg-muted/30">
              {tags.length === 0 ? (
                <span className="text-sm text-muted-foreground">Nenhuma tag</span>
              ) : (
                tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="gap-1">
                    <Tag className="h-3 w-3" />
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-1 hover:bg-muted rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))
              )}
            </div>
          </div>

          {/* Adicionar nova tag */}
          <div className="space-y-2">
            <Label htmlFor="nova-tag">Adicionar tag</Label>
            <div className="flex gap-2">
              <Input
                id="nova-tag"
                placeholder="Digite uma nova tag"
                value={novaTag}
                onChange={(e) => setNovaTag(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleAddTag}
                disabled={!novaTag.trim()}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Sugestões */}
          {availableSuggestions.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Sugestões</Label>
              <div className="flex flex-wrap gap-1">
                {availableSuggestions.map((tag) => (
                  <Badge
                    key={tag}
                    variant="outline"
                    className="cursor-pointer hover:bg-muted"
                    onClick={() => handleAddSuggested(tag)}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              'Salvar'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
