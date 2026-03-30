import { useState, useEffect } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
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
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Plus, GitBranch, Copy, Star } from 'lucide-react';
import { useFunisAdapter, useFunilMutationsAdapter, useFunilTemplatesAdapter } from '@/hooks/useFunisAdapter';
import { useFranchiseDefaultFunnelMT } from '@/hooks/multitenant/useFranchiseDefaultFunnelMT';
import { useAccessibleFunnelsMT } from '@/hooks/multitenant/useFunnelAccessMT';
import { useTenantContext } from '@/contexts/TenantContext';
import { ETAPAS_PADRAO } from '@/types/funil';
import type { Funil } from '@/types/funil';

interface FunilSelectorProps {
  value?: string;
  onChange: (funilId: string) => void;
  franqueadoId?: string;
}

export function FunilSelector({ value, onChange, franqueadoId }: FunilSelectorProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCloneDialogOpen, setIsCloneDialogOpen] = useState(false);
  const [newFunilNome, setNewFunilNome] = useState('');
  const [newFunilDescricao, setNewFunilDescricao] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');

  const { accessLevel, franchise } = useTenantContext();
  const { funis, isLoading } = useFunisAdapter({ includeTemplates: false });
  const { templates } = useFunilTemplatesAdapter();
  const { createFunilComEtapasPadrao, cloneFunil, isCreating, isCloning } = useFunilMutationsAdapter();
  const { defaultFunnelId, isLoading: isLoadingDefault } = useFranchiseDefaultFunnelMT();
  const { data: accessibleFunnelIds, isLoading: isLoadingAccess } = useAccessibleFunnelsMT();

  // Filtrar funis: apenas por regras de acesso (o useFunisAdapter já filtra por tenant/franchise)
  const funisDisponiveis = funis.filter((f) => {
    // Filtro por acesso (se tiver regras definidas)
    const hasAccess = !accessibleFunnelIds || accessibleFunnelIds.includes(f.id);
    return hasAccess;
  });

  // Auto-selecionar funil padrão da franquia quando não há valor selecionado
  useEffect(() => {
    if (!value && !isLoading && !isLoadingDefault && funisDisponiveis.length > 0) {
      if (defaultFunnelId && funisDisponiveis.some((f) => f.id === defaultFunnelId)) {
        onChange(defaultFunnelId);
      } else {
        // Fallback: selecionar o primeiro funil disponível
        onChange(funisDisponiveis[0].id);
      }
    }
  }, [value, isLoading, isLoadingDefault, defaultFunnelId, funisDisponiveis.length]);

  const handleCreateNew = async () => {
    if (!newFunilNome.trim()) return;

    try {
      const novoFunil = await createFunilComEtapasPadrao.mutateAsync({
        funilData: {
          nome: newFunilNome,
          descricao: newFunilDescricao || undefined,
          franqueado_id: franqueadoId,
          is_template: false,
        },
        etapas: ETAPAS_PADRAO,
      });

      onChange(novoFunil.id);
      setIsCreateDialogOpen(false);
      setNewFunilNome('');
      setNewFunilDescricao('');
    } catch (error) {
      console.error('Erro ao criar funil:', error);
    }
  };

  const handleClone = async () => {
    if (!selectedTemplateId || !newFunilNome.trim()) return;

    try {
      const novoFunil = await cloneFunil.mutateAsync({
        funilOrigemId: selectedTemplateId,
        novoNome: newFunilNome,
        franqueadoId,
      });

      onChange(novoFunil.id);
      setIsCloneDialogOpen(false);
      setSelectedTemplateId('');
      setNewFunilNome('');
    } catch (error) {
      console.error('Erro ao clonar funil:', error);
    }
  };

  const canCreate = accessLevel === 'platform' || accessLevel === 'tenant' || accessLevel === 'franchise';

  return (
    <div className="flex items-center gap-2">
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-[280px]">
          <SelectValue placeholder="Selecione um funil">
            {value && (
              <div className="flex items-center gap-2">
                <GitBranch className="h-4 w-4" />
                <span className="truncate">
                  {funisDisponiveis.find((f) => f.id === value)?.nome || 'Funil'}
                </span>
                {value === defaultFunnelId && (
                  <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                )}
              </div>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {funisDisponiveis.map((funil) => (
            <SelectItem key={funil.id} value={funil.id}>
              <div className="flex items-center gap-2">
                <GitBranch className="h-4 w-4" />
                <span>{funil.nome}</span>
                {funil.id === defaultFunnelId && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    Padrão
                  </Badge>
                )}
              </div>
            </SelectItem>
          ))}

          {funisDisponiveis.length === 0 && (
            <div className="p-2 text-sm text-muted-foreground text-center">
              Nenhum funil disponível
            </div>
          )}
        </SelectContent>
      </Select>

      {/* Botão criar novo */}
      {canCreate && (
        <Button
          variant="outline"
          size="icon"
          onClick={() => setIsCreateDialogOpen(true)}
          title="Criar novo funil"
        >
          <Plus className="h-4 w-4" />
        </Button>
      )}

      {/* Botão clonar de template */}
      {canCreate && templates.length > 0 && (
        <Button
          variant="outline"
          size="icon"
          onClick={() => setIsCloneDialogOpen(true)}
          title="Clonar de template"
        >
          <Copy className="h-4 w-4" />
        </Button>
      )}

      {/* Dialog criar novo */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Novo Funil</DialogTitle>
            <DialogDescription>
              Um novo funil será criado com as etapas padrão. Você pode personalizar depois.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome do Funil</Label>
              <Input
                id="nome"
                value={newFunilNome}
                onChange={(e) => setNewFunilNome(e.target.value)}
                placeholder="Ex: Funil de Vendas"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição (opcional)</Label>
              <Textarea
                id="descricao"
                value={newFunilDescricao}
                onChange={(e) => setNewFunilDescricao(e.target.value)}
                placeholder="Descreva o objetivo deste funil..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateNew} disabled={!newFunilNome.trim() || isCreating}>
              {isCreating ? 'Criando...' : 'Criar Funil'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog clonar de template */}
      <Dialog open={isCloneDialogOpen} onOpenChange={setIsCloneDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clonar de Template</DialogTitle>
            <DialogDescription>
              Selecione um template para criar uma cópia personalizada.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Template</Label>
              <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um template" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="clone-nome">Nome do Novo Funil</Label>
              <Input
                id="clone-nome"
                value={newFunilNome}
                onChange={(e) => setNewFunilNome(e.target.value)}
                placeholder="Ex: Funil de Vendas - Minha Unidade"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCloneDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleClone}
              disabled={!selectedTemplateId || !newFunilNome.trim() || isCloning}
            >
              {isCloning ? 'Clonando...' : 'Clonar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
