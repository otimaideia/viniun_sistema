import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { MTSOPStepChecklist } from '@/types/sop';

interface ChecklistEditorProps {
  items: MTSOPStepChecklist[];
  stepId: string;
  onAdd: (stepId: string, descricao: string) => void;
  onRemove: (id: string) => void;
}

export default function ChecklistEditor({ items, stepId, onAdd, onRemove }: ChecklistEditorProps) {
  const [newItem, setNewItem] = useState('');

  const handleAdd = () => {
    const trimmed = newItem.trim();
    if (!trimmed) return;
    onAdd(stepId, trimmed);
    setNewItem('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-foreground">Checklist</label>

      {items.length > 0 && (
        <ul className="space-y-1">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
            >
              <span className="flex-1">{item.descricao}</span>
              <button
                type="button"
                onClick={() => onRemove(item.id)}
                className="shrink-0 text-muted-foreground hover:text-destructive transition-colors"
                title="Remover item"
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex gap-2">
        <Input
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Novo item do checklist..."
          className="text-sm"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAdd}
          disabled={!newItem.trim()}
        >
          <Plus className="h-4 w-4 mr-1" />
          Adicionar
        </Button>
      </div>
    </div>
  );
}
