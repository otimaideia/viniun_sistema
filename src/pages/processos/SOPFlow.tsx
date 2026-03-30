import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTenantContext } from '@/contexts/TenantContext';
import { useSOPsMT } from '@/hooks/multitenant/useSOPsMT';
import { useSOPStepsMT } from '@/hooks/multitenant/useSOPStepsMT';
import { useSOPFlowMT } from '@/hooks/multitenant/useSOPFlowMT';
import SOPFlowEditor from '@/components/processos/flow/SOPFlowEditor';
import type { MTSOPFlowConnection } from '@/types/sop';

export default function SOPFlow() {
  const { id } = useParams();
  const { isLoading: isTenantLoading } = useTenantContext();

  // Use useSOPsMT to get single SOP
  const { data: sops, isLoading: isSOPLoading } = useSOPsMT();
  const sop = sops?.find((s: any) => s.id === id);

  const { steps, isLoading: isStepsLoading, updatePositions } = useSOPStepsMT(id);
  const { connections, isLoading: isFlowLoading, replaceAll } = useSOPFlowMT(id);

  const isLoading = isTenantLoading || isSOPLoading || isStepsLoading || isFlowLoading;

  const handleSave = async (
    positions: { id: string; position_x: number; position_y: number }[],
    newConnections: Omit<MTSOPFlowConnection, 'id' | 'tenant_id' | 'created_at'>[]
  ) => {
    // Save positions
    if (positions.length > 0) {
      await updatePositions.mutateAsync(positions);
    }

    // Save connections
    if (id) {
      await replaceAll.mutateAsync({ sopId: id, connections: newConnections });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!sop || !id) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" asChild>
          <Link to="/processos"><ArrowLeft className="h-4 w-4 mr-2" /> Voltar</Link>
        </Button>
        <p className="text-muted-foreground">POP não encontrado</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-140px)]">
      {/* Header */}
      <div className="flex items-center justify-between pb-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link to={`/processos/${id}`}>
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-lg font-bold">Editor de Fluxo</h1>
            <p className="text-sm text-muted-foreground">
              {sop.codigo} - {sop.titulo}
            </p>
          </div>
        </div>
        <div className="text-xs text-muted-foreground">
          Arraste os passos para posicionar • Conecte arrastando entre os pontos • Duplo-clique na seta para editar label
        </div>
      </div>

      {/* Flow Editor - takes remaining space */}
      <div className="flex-1 min-h-0">
        <SOPFlowEditor
          steps={steps || []}
          connections={connections || []}
          onSave={handleSave}
          sopId={id}
        />
      </div>
    </div>
  );
}
