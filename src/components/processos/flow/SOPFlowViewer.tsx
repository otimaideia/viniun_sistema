import { useMemo, useCallback } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Controls,
  MiniMap,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  type NodeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { MTSOPStep, MTSOPFlowConnection } from '@/types/sop';
import SOPFlowNode from './SOPFlowNode';
import { buildFlowGraph, STEP_TIPO_STYLES } from './flowUtils';

interface SOPFlowViewerProps {
  steps: MTSOPStep[];
  connections: MTSOPFlowConnection[];
}

const nodeTypes: NodeTypes = {
  sopStep: SOPFlowNode as any,
};

function SOPFlowViewerInner({ steps, connections }: SOPFlowViewerProps) {
  const { initialNodes, initialEdges } = useMemo(() => {
    const { nodes, edges } = buildFlowGraph(steps, connections);
    return { initialNodes: nodes, initialEdges: edges };
  }, [steps, connections]);

  const [nodes] = useNodesState(initialNodes);
  const [edges] = useEdgesState(initialEdges);

  const miniMapNodeColor = useCallback((node: any) => {
    const tipo = node.data?.tipo;
    return STEP_TIPO_STYLES[tipo as keyof typeof STEP_TIPO_STYLES]?.border || '#999';
  }, []);

  return (
    <div className="w-full h-[500px] border rounded-lg overflow-hidden bg-gray-50">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        minZoom={0.3}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        <Controls showInteractive={false} />
        <MiniMap
          nodeColor={miniMapNodeColor}
          maskColor="rgba(0,0,0,0.08)"
          style={{ height: 80, width: 120 }}
        />
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#ddd" />
      </ReactFlow>
    </div>
  );
}

export default function SOPFlowViewer({ steps, connections }: SOPFlowViewerProps) {
  if (steps.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <p className="text-lg font-medium">Nenhum passo cadastrado</p>
        <p className="text-sm mt-1">Adicione passos ao POP para visualizar o fluxo</p>
      </div>
    );
  }

  return (
    <ReactFlowProvider>
      <SOPFlowViewerInner steps={steps} connections={connections} />
    </ReactFlowProvider>
  );
}
