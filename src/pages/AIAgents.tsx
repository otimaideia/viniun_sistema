import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, BrainCircuit, MoreVertical, Power, Copy, Pencil, Trash2 } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { Skeleton } from '@/components/ui/skeleton';
import { useAIAgentsAdminMT } from '@/hooks/multitenant/useAIAgentsMT';

function getIcon(iconName: string) {
  const Icon = (LucideIcons as any)[iconName];
  return Icon || BrainCircuit;
}

export default function AIAgents() {
  const navigate = useNavigate();
  const { data: agents, isLoading, remove, toggleActive, duplicate } = useAIAgentsAdminMT();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-36" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-48 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BrainCircuit className="h-6 w-6 text-indigo-600" />
            Agentes IA
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Configure agentes de IA para analisar conversas e sugerir respostas
          </p>
        </div>
        <Button onClick={() => navigate('/whatsapp/ai-agents/novo')} className="gap-2 bg-indigo-600 hover:bg-indigo-700">
          <Plus className="h-4 w-4" />
          Novo Agente
        </Button>
      </div>

      {/* Grid */}
      {(!agents || agents.length === 0) ? (
        <div className="text-center py-16">
          <BrainCircuit className="h-16 w-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-semibold text-gray-600">Nenhum agente configurado</h3>
          <p className="text-sm text-gray-400 mt-1 mb-4">Crie seu primeiro agente IA para começar</p>
          <Button onClick={() => navigate('/whatsapp/ai-agents/novo')} className="gap-2">
            <Plus className="h-4 w-4" />
            Criar Agente
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents.map(agent => {
            const Icon = getIcon(agent.icone);
            return (
              <div
                key={agent.id}
                className="relative rounded-xl border bg-white p-5 hover:shadow-md transition-shadow cursor-pointer"
                style={{ borderLeftWidth: 4, borderLeftColor: agent.cor }}
                onClick={() => navigate(`/whatsapp/ai-agents/${agent.id}/editar`)}
              >
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-xl"
                      style={{ backgroundColor: `${agent.cor}15`, color: agent.cor }}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{agent.nome}</h3>
                      <p className="text-xs text-gray-400">{agent.codigo}</p>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={e => e.stopPropagation()}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={e => { e.stopPropagation(); navigate(`/whatsapp/ai-agents/${agent.id}/editar`); }}>
                        <Pencil className="h-4 w-4 mr-2" /> Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={e => { e.stopPropagation(); duplicate.mutate(agent.id); }}>
                        <Copy className="h-4 w-4 mr-2" /> Duplicar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={e => { e.stopPropagation(); toggleActive.mutate({ id: agent.id, is_active: !agent.is_active }); }}>
                        <Power className="h-4 w-4 mr-2" /> {agent.is_active ? 'Desativar' : 'Ativar'}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-red-600"
                        onClick={e => { e.stopPropagation(); setDeleteId(agent.id); }}
                      >
                        <Trash2 className="h-4 w-4 mr-2" /> Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Description */}
                <p className="text-sm text-gray-500 mt-3 line-clamp-2">{agent.descricao}</p>

                {/* Badges */}
                <div className="flex flex-wrap gap-1.5 mt-3">
                  <Badge variant={agent.is_active ? 'default' : 'secondary'} className="text-[10px]">
                    {agent.is_active ? 'Ativo' : 'Inativo'}
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">
                    {agent.tipo === 'quality' ? 'Qualidade' : 'Assistente'}
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">
                    {agent.model}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir agente?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O agente e todo seu histórico de análises serão removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => { if (deleteId) { remove.mutate(deleteId); setDeleteId(null); } }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
