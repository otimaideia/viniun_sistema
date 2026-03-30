import { useEffect, useRef } from 'react';
import {
  FileText,
  Zap,
  StickyNote,
  ArrowRightLeft,
  Calendar,
  Tag,
  TrendingUp,
  UserPlus,
  ExternalLink,
} from 'lucide-react';

export interface SlashCommand {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  category: 'templates' | 'rapidas' | 'acoes' | 'funil';
  action: string;
}

const defaultCommands: SlashCommand[] = [
  {
    id: 'template',
    label: 'template',
    description: 'Enviar template de mensagem',
    icon: <FileText size={16} />,
    category: 'templates',
    action: 'open_templates',
  },
  {
    id: 'rapida',
    label: 'rapida',
    description: 'Resposta rapida pre-definida',
    icon: <Zap size={16} />,
    category: 'rapidas',
    action: 'open_quick_replies',
  },
  {
    id: 'nota',
    label: 'nota',
    description: 'Adicionar nota interna',
    icon: <StickyNote size={16} />,
    category: 'acoes',
    action: 'add_note',
  },
  {
    id: 'agendar',
    label: 'agendar',
    description: 'Criar agendamento para este lead',
    icon: <Calendar size={16} />,
    category: 'acoes',
    action: 'create_appointment',
  },
  {
    id: 'transferir',
    label: 'transferir',
    description: 'Transferir conversa para outro atendente',
    icon: <ArrowRightLeft size={16} />,
    category: 'acoes',
    action: 'transfer',
  },
  {
    id: 'tag',
    label: 'tag',
    description: 'Adicionar etiqueta a conversa',
    icon: <Tag size={16} />,
    category: 'acoes',
    action: 'add_tag',
  },
  {
    id: 'funil',
    label: 'funil',
    description: 'Ver/mover lead no funil de vendas',
    icon: <TrendingUp size={16} />,
    category: 'funil',
    action: 'open_funnel',
  },
  {
    id: 'responsavel',
    label: 'responsavel',
    description: 'Atribuir responsavel ao lead',
    icon: <UserPlus size={16} />,
    category: 'funil',
    action: 'assign_responsible',
  },
  {
    id: 'lead',
    label: 'lead',
    description: 'Abrir ficha completa do lead',
    icon: <ExternalLink size={16} />,
    category: 'funil',
    action: 'open_lead',
  },
];

interface SlashCommandMenuProps {
  filter: string;
  isOpen: boolean;
  onSelect: (command: SlashCommand) => void;
  onClose: () => void;
  selectedIndex: number;
}

const categoryLabels: Record<string, string> = {
  templates: 'Templates',
  rapidas: 'Respostas Rapidas',
  acoes: 'Acoes',
  funil: 'Funil de Vendas',
};

export function SlashCommandMenu({ filter, isOpen, onSelect, onClose, selectedIndex }: SlashCommandMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  const filteredCommands = defaultCommands.filter(cmd =>
    cmd.label.toLowerCase().includes(filter.toLowerCase()) ||
    cmd.description.toLowerCase().includes(filter.toLowerCase())
  );

  // Group by category
  const grouped = filteredCommands.reduce((acc, cmd) => {
    if (!acc[cmd.category]) acc[cmd.category] = [];
    acc[cmd.category].push(cmd);
    return acc;
  }, {} as Record<string, SlashCommand[]>);

  useEffect(() => {
    if (menuRef.current) {
      const selected = menuRef.current.querySelector('[data-selected="true"]');
      selected?.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  if (!isOpen || filteredCommands.length === 0) return null;

  let flatIndex = 0;

  return (
    <div
      ref={menuRef}
      style={{
        position: 'absolute',
        bottom: '100%',
        left: 0,
        right: 0,
        maxHeight: '280px',
        overflowY: 'auto',
        background: '#fff',
        borderRadius: '8px 8px 0 0',
        boxShadow: '0 -4px 12px rgba(0,0,0,0.15)',
        border: '1px solid #e9edef',
        borderBottom: 'none',
        zIndex: 50,
      }}
    >
      <div style={{ padding: '8px 12px', borderBottom: '1px solid #f0f2f5' }}>
        <span style={{ fontSize: 11, color: '#667781', fontWeight: 500 }}>
          Comandos {filter ? `— "${filter}"` : ''}
        </span>
      </div>

      {Object.entries(grouped).map(([category, commands]) => (
        <div key={category}>
          <div style={{
            padding: '6px 12px',
            fontSize: 10,
            color: '#8696a0',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            fontWeight: 600,
          }}>
            {categoryLabels[category] || category}
          </div>
          {commands.map((cmd) => {
            const currentIndex = flatIndex++;
            const isSelected = currentIndex === selectedIndex;

            return (
              <div
                key={cmd.id}
                data-selected={isSelected}
                onClick={() => onSelect(cmd)}
                onMouseEnter={(e) => {
                  if (!isSelected) e.currentTarget.style.background = '#f5f6f6';
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) e.currentTarget.style.background = 'transparent';
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 12px',
                  cursor: 'pointer',
                  background: isSelected ? '#f0f2f5' : 'transparent',
                  transition: 'background 0.15s',
                }}
              >
                <div style={{ color: '#25d366', flexShrink: 0 }}>
                  {cmd.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#111b21' }}>
                    /{cmd.label}
                  </div>
                  <div style={{ fontSize: 11, color: '#667781' }}>
                    {cmd.description}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export { defaultCommands };
