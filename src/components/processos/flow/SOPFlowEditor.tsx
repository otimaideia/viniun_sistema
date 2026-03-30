import { useMemo, useCallback, useState } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Controls,
  MiniMap,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  addEdge,
  type Connection,
  type Edge,
  type Node,
  type NodeTypes,
  type OnConnect,
  type NodeChange,
  type EdgeChange,
  Panel,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Save, LayoutGrid, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import type { MTSOPStep, MTSOPFlowConnection } from '@/types/sop';
import SOPFlowNode from './SOPFlowNode';
import { buildFlowGraph, autoLayout, STEP_TIPO_STYLES } from './flowUtils';

interface SOPFlowEditorProps {
  steps: MTSOPStep[];
  connections: MTSOPFlowConnection[];
  onSave: (
    positions: { id: string; position_x: number; position_y: number }[],
    connections: Omit<MTSOPFlowConnection, 'id' | 'tenant_id' | 'created_at'>[]
  ) => Promise<void>;
  sopId: string;
}

const nodeTypes: NodeTypes = {
  sopStep: SOPFlowNode as any,
};

function SOPFlowEditorInner({ steps, connections, onSave, sopId }: SOPFlowEditorProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const { initialNodes, initialEdges } = useMemo(() => {
    const { nodes, edges } = buildFlowGraph(steps, connections);
    return { initialNodes: nodes, initialEdges: edges };
  }, [steps, connections]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const handleNodesChange = useCallback((changes: NodeChange[]) => {
    onNodesChange(changes);
    if (changes.some(c => c.type === 'position' && (c as any).dragging === false)) {
      setHasChanges(true);
    }
  }, [onNodesChange]);

  const handleEdgesChange = useCallback((changes: EdgeChange[]) => {
    onEdgesChange(changes);
    setHasChanges(true);
  }, [onEdgesChange]);

  const onConnect: OnConnect = useCallback((connection: Connection) => {
    const newEdge: Edge = {
      ...connection,
      id: `new-${Date.now()}`,
      type: 'smoothstep',
      animated: false,
      markerEnd: { type: 'arrowclosed' as MarkerType },
      style: { strokeWidth: 1.5, stroke: '#666' },
      label: '',
    };
    setEdges((eds) => addEdge(newEdge, eds));
    setHasChanges(true);
  }, [setEdges]);

  const handleAutoLayout = useCallback(() => {
    const { nodes: layoutNodes, edges: layoutEdges } = autoLayout(
      nodes.map(n => ({ ...n, position: { x: 0, y: 0 } })),
      edges,
    );
    setNodes(layoutNodes);
    if (edges.length === 0) {
      setEdges(layoutEdges);
    }
    setHasChanges(true);
  }, [nodes, edges, setNodes, setEdges]);

  const handleDeleteSelected = useCallback(() => {
    setEdges((eds) => eds.filter((e) => !e.selected));
    setHasChanges(true);
  }, [setEdges]);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      // Extract positions from nodes
      const positions = nodes.map((n) => ({
        id: n.id,
        position_x: n.position.x,
        position_y: n.position.y,
      }));

      // Extract connections from edges (skip auto-generated ones)
      const newConnections = edges.map((e) => ({
        sop_id: sopId,
        from_step_id: e.source,
        to_step_id: e.target,
        condition_label: (e.label as string) || null,
        is_default: e.animated || false,
      }));

      await onSave(positions, newConnections);
      setHasChanges(false);
      toast.success('Fluxo salvo com sucesso');
    } catch (err) {
      toast.error('Erro ao salvar fluxo');
    } finally {
      setIsSaving(false);
    }
  }, [nodes, edges, sopId, onSave]);

  const onEdgeDoubleClick = useCallback((_: React.MouseEvent, edge: Edge) => {
    const label = prompt('Label da conexão (ex: Sim, Não, Aprovado):',
      (edge.label as string) || '');
    if (label === null) return;

    setEdges((eds) =>
      eds.map((e) =>
        e.id === edge.id
          ? {
              ...e,
              label: label || undefined,
              labelStyle: { fontSize: 12, fontWeight: 500, fill: '#333' },
              labelBgStyle: { fill: '#fff', fillOpacity: 0.9 },
              labelBgPadding: [6, 4] as [number, number],
              labelBgBorderRadius: 4,
            }
          : e
      )
    );
    setHasChanges(true);
  }, [setEdges]);

  const miniMapNodeColor = useCallback((node: any) => {
    const tipo = node.data?.tipo;
    return STEP_TIPO_STYLES[tipo as keyof typeof STEP_TIPO_STYLES]?.border || '#999';
  }, []);

  return (
    <div className="w-full h-full border rounded-lg overflow-hidden bg-gray-50">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={onConnect}
        onEdgeDoubleClick={onEdgeDoubleClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        minZoom={0.2}
        maxZoom={3}
        deleteKeyCode="Delete"
        proOptions={{ hideAttribution: true }}
        snapToGrid
        snapGrid={[10, 10]}
      >
        <Panel position="top-right" className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleAutoLayout}
          >
            <LayoutGrid className="h-4 w-4 mr-1.5" />
            Auto-Layout
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDeleteSelected}
          >
            <Trash2 className="h-4 w-4 mr-1.5" />
            Deletar Seleção
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-1.5" />
            )}
            Salvar Fluxo
          </Button>
        </Panel>
        <Controls />
        <MiniMap
          nodeColor={miniMapNodeColor}
          maskColor="rgba(0,0,0,0.08)"
          style={{ height: 80, width: 120 }}
        />
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#ddd" />
      </ReactFlow>

      {/* Legend */}
      <div className="absolute bottom-2 left-2 bg-white/90 border rounded-lg p-2 text-[10px] space-y-1 z-10">
        <p className="font-semibold text-xs mb-1">Legenda</p>
        {Object.entries(STEP_TIPO_STYLES).map(([tipo, s]) => (
          <div key={tipo} className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded" style={{ background: s.border }} />
            <span className="capitalize">{tipo === 'acao' ? 'Ação' : tipo === 'decisao' ? 'Decisão' : tipo === 'verificacao' ? 'Verificação' : tipo}</span>
          </div>
        ))}
        <p className="text-muted-foreground mt-1">Duplo-clique na seta para editar label</p>
      </div>
    </div>
  );
}

export default function SOPFlowEditor(props: SOPFlowEditorProps) {
  if (props.steps.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <p className="text-lg font-medium">Nenhum passo cadastrado</p>
        <p className="text-sm mt-1">Adicione passos ao POP primeiro para criar o fluxo</p>
      </div>
    );
  }

  return (
    <ReactFlowProvider>
      <SOPFlowEditorInner {...props} />
    </ReactFlowProvider>
  );
}
