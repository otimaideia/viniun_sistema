import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Clock, AlertCircle } from 'lucide-react';
import type { MTSOPStep, SOPStepTipo } from '@/types/sop';
import { STEP_TIPO_STYLES } from './flowUtils';

interface SOPFlowNodeData {
  step: MTSOPStep;
  label: string;
  tipo: SOPStepTipo;
  ordem: number;
  tempo: number | null;
  isObrigatorio: boolean;
}

function SOPFlowNode({ data, selected }: NodeProps) {
  const nodeData = data as unknown as SOPFlowNodeData;
  const style = STEP_TIPO_STYLES[nodeData.tipo] || STEP_TIPO_STYLES.acao;
  const isDecision = nodeData.tipo === 'decisao';

  return (
    <div
      className="relative"
      style={{
        background: style.bg,
        border: `2px solid ${selected ? '#1976D2' : style.border}`,
        borderRadius: isDecision ? 8 : 8,
        padding: '10px 14px',
        minWidth: 180,
        maxWidth: 260,
        boxShadow: selected ? '0 0 0 2px rgba(25,118,210,0.3)' : '0 1px 3px rgba(0,0,0,0.12)',
        transform: isDecision ? 'rotate(0deg)' : undefined,
      }}
    >
      {/* Target handle (top) */}
      <Handle
        type="target"
        position={Position.Top}
        style={{
          background: style.border,
          width: 10,
          height: 10,
          border: '2px solid white',
        }}
      />

      {/* Content */}
      <div className="flex items-start gap-2">
        <span className="text-lg flex-shrink-0 mt-0.5" style={{ color: style.text }}>
          {style.icon}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span
              className="text-[10px] font-bold px-1.5 py-0.5 rounded"
              style={{ background: style.border, color: 'white' }}
            >
              {nodeData.ordem}
            </span>
            <span className="text-xs font-medium truncate" style={{ color: style.text }}>
              {nodeData.label}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1.5">
            {nodeData.tempo && (
              <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                <Clock className="h-3 w-3" />
                {nodeData.tempo}min
              </span>
            )}
            {nodeData.isObrigatorio && (
              <span className="flex items-center gap-0.5 text-[10px] text-red-500">
                <AlertCircle className="h-3 w-3" />
                Obrigatório
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Source handle (bottom) */}
      <Handle
        type="source"
        position={Position.Bottom}
        style={{
          background: style.border,
          width: 10,
          height: 10,
          border: '2px solid white',
        }}
      />

      {/* Decision: extra handles for branching */}
      {isDecision && (
        <>
          <Handle
            type="source"
            position={Position.Right}
            id="right"
            style={{
              background: '#FF9800',
              width: 10,
              height: 10,
              border: '2px solid white',
              top: '50%',
            }}
          />
          <Handle
            type="source"
            position={Position.Left}
            id="left"
            style={{
              background: '#FF9800',
              width: 10,
              height: 10,
              border: '2px solid white',
              top: '50%',
            }}
          />
        </>
      )}
    </div>
  );
}

export default memo(SOPFlowNode);
