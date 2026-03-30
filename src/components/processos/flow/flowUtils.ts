import type { Node, Edge, MarkerType } from '@xyflow/react';
import type { MTSOPStep, MTSOPFlowConnection, SOPStepTipo } from '@/types/sop';

// Cores e estilos por tipo de step
export const STEP_TIPO_STYLES: Record<SOPStepTipo, {
  bg: string; border: string; text: string; icon: string;
}> = {
  acao: { bg: '#E8F5E9', border: '#4CAF50', text: '#2E7D32', icon: '▶' },
  decisao: { bg: '#FFF3E0', border: '#FF9800', text: '#E65100', icon: '◆' },
  espera: { bg: '#F5F5F5', border: '#9E9E9E', text: '#616161', icon: '⏳' },
  verificacao: { bg: '#E3F2FD', border: '#2196F3', text: '#1565C0', icon: '✓' },
  registro: { bg: '#F3E5F5', border: '#9C27B0', text: '#6A1B9A', icon: '📝' },
};

const NODE_WIDTH = 220;
const NODE_HEIGHT = 80;
const HORIZONTAL_GAP = 60;
const VERTICAL_GAP = 100;

/**
 * Convert SOP steps to React Flow nodes
 */
export function stepsToNodes(steps: MTSOPStep[]): Node[] {
  const sorted = [...steps].sort((a, b) => a.ordem - b.ordem);
  const hasPositions = sorted.some(s => (s.position_x || 0) !== 0 || (s.position_y || 0) !== 0);

  return sorted.map((step, index) => ({
    id: step.id,
    type: 'sopStep',
    position: hasPositions
      ? { x: step.position_x || 0, y: step.position_y || 0 }
      : { x: 0, y: 0 }, // Will be set by autoLayout
    data: {
      step,
      label: step.titulo,
      tipo: step.tipo,
      ordem: step.ordem,
      tempo: step.tempo_estimado_min,
      isObrigatorio: step.is_obrigatorio,
    },
    style: {
      width: NODE_WIDTH,
    },
  }));
}

/**
 * Convert SOP flow connections to React Flow edges
 */
export function connectionsToEdges(connections: MTSOPFlowConnection[]): Edge[] {
  return connections.map((conn) => ({
    id: conn.id,
    source: conn.from_step_id,
    target: conn.to_step_id,
    label: conn.condition_label || undefined,
    animated: conn.is_default,
    type: 'smoothstep',
    markerEnd: { type: 'arrowclosed' as MarkerType },
    style: {
      strokeWidth: conn.is_default ? 2.5 : 1.5,
      stroke: conn.is_default ? '#4CAF50' : '#666',
    },
    labelStyle: {
      fontSize: 12,
      fontWeight: 500,
      fill: '#333',
    },
    labelBgStyle: {
      fill: '#fff',
      fillOpacity: 0.9,
    },
    labelBgPadding: [6, 4] as [number, number],
    labelBgBorderRadius: 4,
    data: {
      connectionId: conn.id,
      conditionLabel: conn.condition_label,
      isDefault: conn.is_default,
    },
  }));
}

/**
 * Auto-layout steps and generate default connections if none exist.
 * Uses a simple top-to-bottom layout with decision branches going right.
 */
export function autoLayout(
  nodes: Node[],
  edges: Edge[],
): { nodes: Node[]; edges: Edge[] } {
  if (nodes.length === 0) return { nodes, edges };

  const sorted = [...nodes].sort((a, b) => (a.data.ordem as number) - (b.data.ordem as number));

  let y = 0;
  const centerX = 300;

  const layoutNodes = sorted.map((node) => {
    const tipo = node.data.tipo as SOPStepTipo;
    const x = centerX - NODE_WIDTH / 2;

    const positioned = {
      ...node,
      position: { x, y },
    };

    y += NODE_HEIGHT + VERTICAL_GAP;
    return positioned;
  });

  // If no edges, create default sequential connections
  let layoutEdges = edges;
  if (edges.length === 0 && layoutNodes.length > 1) {
    layoutEdges = [];
    for (let i = 0; i < layoutNodes.length - 1; i++) {
      layoutEdges.push({
        id: `auto-${i}`,
        source: layoutNodes[i].id,
        target: layoutNodes[i + 1].id,
        type: 'smoothstep',
        animated: true,
        markerEnd: { type: 'arrowclosed' as MarkerType },
        style: { strokeWidth: 2, stroke: '#4CAF50' },
      });
    }
  }

  return { nodes: layoutNodes, edges: layoutEdges };
}

/**
 * Generate nodes from steps for the editor (with saved positions or auto-layout)
 */
export function buildFlowGraph(
  steps: MTSOPStep[],
  connections: MTSOPFlowConnection[],
): { nodes: Node[]; edges: Edge[] } {
  let nodes = stepsToNodes(steps);
  let edges = connectionsToEdges(connections);

  const hasPositions = steps.some(s => (s.position_x || 0) !== 0 || (s.position_y || 0) !== 0);

  if (!hasPositions) {
    const layout = autoLayout(nodes, edges);
    nodes = layout.nodes;
    edges = layout.edges;
  }

  return { nodes, edges };
}
