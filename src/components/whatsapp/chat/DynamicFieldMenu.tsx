import { useEffect, useRef } from 'react';

export interface LeadFieldData {
  nome?: string;
  telefone?: string;
  email?: string;
  cidade?: string;
  servico?: string;
  franquia?: string;
}

interface DynamicField {
  id: string;
  label: string;
  key: keyof LeadFieldData;
  placeholder: string;
}

const fields: DynamicField[] = [
  { id: 'nome', label: 'Nome', key: 'nome', placeholder: 'Nome do lead' },
  { id: 'telefone', label: 'Telefone', key: 'telefone', placeholder: 'Telefone do lead' },
  { id: 'email', label: 'Email', key: 'email', placeholder: 'Email do lead' },
  { id: 'cidade', label: 'Cidade', key: 'cidade', placeholder: 'Cidade do lead' },
  { id: 'servico', label: 'Servico', key: 'servico', placeholder: 'Servico de interesse' },
  { id: 'franquia', label: 'Franquia', key: 'franquia', placeholder: 'Franquia do lead' },
];

interface DynamicFieldMenuProps {
  filter: string;
  isOpen: boolean;
  leadData: LeadFieldData | null;
  onSelect: (field: DynamicField, value: string) => void;
  onClose: () => void;
  selectedIndex: number;
}

export function DynamicFieldMenu({ filter, isOpen, leadData, onSelect, onClose, selectedIndex }: DynamicFieldMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  const filteredFields = fields.filter(f =>
    f.label.toLowerCase().includes(filter.toLowerCase()) ||
    f.key.toLowerCase().includes(filter.toLowerCase())
  );

  useEffect(() => {
    if (menuRef.current) {
      const selected = menuRef.current.querySelector('[data-selected="true"]');
      selected?.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  if (!isOpen || filteredFields.length === 0) return null;

  const hasLead = leadData && Object.values(leadData).some(v => v);

  return (
    <div
      ref={menuRef}
      style={{
        position: 'absolute',
        bottom: '100%',
        left: 0,
        right: 0,
        maxHeight: '260px',
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
          Campos do Lead {filter ? `— "${filter}"` : ''}
        </span>
      </div>

      {!hasLead && (
        <div style={{
          padding: '12px',
          fontSize: 12,
          color: '#e65100',
          background: '#fff3e0',
          borderBottom: '1px solid #f0f2f5',
        }}>
          Nenhum lead vinculado a esta conversa. Os campos serao inseridos como placeholders.
        </div>
      )}

      {filteredFields.map((field, index) => {
        const isSelected = index === selectedIndex;
        const value = leadData?.[field.key] || '';

        return (
          <div
            key={field.id}
            data-selected={isSelected}
            onClick={() => onSelect(field, value || `[${field.label}]`)}
            onMouseEnter={(e) => {
              if (!isSelected) e.currentTarget.style.background = '#f5f6f6';
            }}
            onMouseLeave={(e) => {
              if (!isSelected) e.currentTarget.style.background = 'transparent';
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 12px',
              cursor: 'pointer',
              background: isSelected ? '#f0f2f5' : 'transparent',
              transition: 'background 0.15s',
            }}
          >
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: '#111b21' }}>
                [{field.label}]
              </div>
              <div style={{ fontSize: 11, color: '#667781' }}>
                {field.placeholder}
              </div>
            </div>
            {value && (
              <div style={{
                fontSize: 12,
                color: '#25d366',
                fontWeight: 500,
                maxWidth: 120,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {value}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export { fields as dynamicFields };
export type { DynamicField };
