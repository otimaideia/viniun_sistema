import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Tag, X, ChevronDown, User, Users2, Archive } from 'lucide-react';
import type { FilterTab, AssignedUser } from '@/hooks/useConversationFilters';

interface LabelOption {
  id: string;
  name: string;
  color: string | null;
}

interface ConversationFilterTabsProps {
  activeTab: FilterTab;
  onTabChange: (tab: FilterTab) => void;
  counts: Record<FilterTab, number>;
  labels?: LabelOption[];
  selectedLabelIds?: string[];
  onLabelFilterChange?: (labelIds: string[]) => void;
  assignedUsers?: AssignedUser[];
  selectedAssignedUser?: string | null;
  onAssignedUserChange?: (userId: string | null) => void;
}

const tabs: { key: FilterTab; label: string }[] = [
  { key: 'all', label: 'Tudo' },
  { key: 'mine', label: 'Minhas' },
  { key: 'unread', label: 'Não lidas' },
  { key: 'favorites', label: 'Favoritas' },
  { key: 'groups', label: 'Grupos' },
  { key: 'archived', label: 'Arquivadas' },
];

export function ConversationFilterTabs({
  activeTab,
  onTabChange,
  counts,
  labels = [],
  selectedLabelIds = [],
  onLabelFilterChange,
  assignedUsers = [],
  selectedAssignedUser = null,
  onAssignedUserChange,
}: ConversationFilterTabsProps) {
  const [showLabelDropdown, setShowLabelDropdown] = useState(false);
  const [showAssignedDropdown, setShowAssignedDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const assignedDropdownRef = useRef<HTMLDivElement>(null);

  // Fechar dropdowns ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowLabelDropdown(false);
      }
      if (assignedDropdownRef.current && !assignedDropdownRef.current.contains(e.target as Node)) {
        setShowAssignedDropdown(false);
      }
    };
    if (showLabelDropdown || showAssignedDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showLabelDropdown, showAssignedDropdown]);

  const toggleLabel = (labelId: string) => {
    if (!onLabelFilterChange) return;
    const newIds = selectedLabelIds.includes(labelId)
      ? selectedLabelIds.filter(id => id !== labelId)
      : [...selectedLabelIds, labelId];
    onLabelFilterChange(newIds);
  };

  const clearLabelFilters = () => {
    onLabelFilterChange?.([]);
    setShowLabelDropdown(false);
  };

  const hasLabels = labels.length > 0;
  const hasActiveFilters = selectedLabelIds.length > 0;

  // Nome do responsável selecionado
  const selectedAssignedName = selectedAssignedUser
    ? assignedUsers.find(u => u.id === selectedAssignedUser)?.name?.split(' ')[0] || null
    : null;

  return (
    <div className="relative flex items-center gap-1.5 px-3 py-2 overflow-x-auto overflow-y-visible scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
      {tabs.map(({ key, label }) => {
        // Tab "Minhas" com dropdown de responsáveis
        if (key === 'mine' && assignedUsers.length > 0) {
          return (
            <div key={key} className="relative" ref={assignedDropdownRef}>
              <button
                onClick={() => {
                  if (activeTab === 'mine') {
                    // Se já está na tab, abre/fecha dropdown
                    setShowAssignedDropdown(!showAssignedDropdown);
                  } else {
                    // Primeiro clique ativa a tab
                    onTabChange(key);
                    setShowAssignedDropdown(true);
                  }
                }}
                className={cn(
                  'flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium whitespace-nowrap transition-colors',
                  activeTab === key
                    ? 'bg-[#00a884]/10 text-[#00a884]'
                    : 'bg-[#f0f2f5] text-[#54656f] hover:bg-[#e9edef]'
                )}
              >
                {selectedAssignedName || label}
                {counts[key] > 0 && (
                  <span className={cn(
                    'min-w-[18px] h-[18px] rounded-full flex items-center justify-center text-[10px] font-bold px-1',
                    activeTab === key
                      ? 'bg-[#00a884] text-white'
                      : 'bg-[#667781]/20 text-[#667781]'
                  )}>
                    {counts[key]}
                  </span>
                )}
                <ChevronDown className={cn(
                  'h-3 w-3 transition-transform',
                  showAssignedDropdown && activeTab === 'mine' ? 'rotate-180' : ''
                )} />
              </button>

              {/* Dropdown de responsáveis */}
              {showAssignedDropdown && activeTab === 'mine' && (
                <div className="absolute left-0 top-full mt-1 w-52 bg-white rounded-lg shadow-lg border border-[#e9edef] z-50 py-1 max-h-64 overflow-y-auto">
                  <div className="px-3 py-1.5 text-[10px] uppercase text-[#8696a0] font-semibold tracking-wider border-b border-[#f0f2f5]">
                    Filtrar por responsável
                  </div>

                  {/* Opção "Minhas" (eu) */}
                  <button
                    onClick={() => {
                      onAssignedUserChange?.(null);
                      setShowAssignedDropdown(false);
                    }}
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-1.5 text-xs transition-colors text-left',
                      !selectedAssignedUser
                        ? 'bg-[#00a884]/5 text-[#111b21] font-medium'
                        : 'text-[#54656f] hover:bg-[#f5f6f6]'
                    )}
                  >
                    <User className="h-3.5 w-3.5 flex-shrink-0" />
                    <span>Minhas conversas</span>
                    {!selectedAssignedUser && (
                      <span className="ml-auto text-[#00a884]">✓</span>
                    )}
                  </button>

                  {/* Separador */}
                  <div className="border-t border-[#f0f2f5] my-0.5" />

                  {/* Opção "Todas atribuídas" */}
                  <button
                    onClick={() => {
                      onAssignedUserChange?.('__all__');
                      setShowAssignedDropdown(false);
                    }}
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-1.5 text-xs transition-colors text-left',
                      selectedAssignedUser === '__all__'
                        ? 'bg-[#00a884]/5 text-[#111b21] font-medium'
                        : 'text-[#54656f] hover:bg-[#f5f6f6]'
                    )}
                  >
                    <Users2 className="h-3.5 w-3.5 flex-shrink-0" />
                    <span>Todas atribuídas</span>
                    <span className="ml-auto text-[10px] text-[#8696a0]">{counts[key]}</span>
                  </button>

                  {/* Separador */}
                  <div className="border-t border-[#f0f2f5] my-0.5" />

                  {/* Lista de responsáveis */}
                  {assignedUsers.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => {
                        onAssignedUserChange?.(user.id);
                        setShowAssignedDropdown(false);
                      }}
                      className={cn(
                        'w-full flex items-center gap-2 px-3 py-1.5 text-xs transition-colors text-left',
                        selectedAssignedUser === user.id
                          ? 'bg-[#00a884]/5 text-[#111b21] font-medium'
                          : 'text-[#54656f] hover:bg-[#f5f6f6]'
                      )}
                    >
                      <span className="w-5 h-5 rounded-full bg-[#e0f2fe] text-[#0369a1] flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                        {user.name.charAt(0).toUpperCase()}
                      </span>
                      <span className="truncate">{user.name}</span>
                      <span className="ml-auto text-[10px] text-[#8696a0]">{user.count}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        }

        return (
          <button
            key={key}
            onClick={() => onTabChange(key)}
            className={cn(
              'flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium whitespace-nowrap transition-colors',
              activeTab === key
                ? 'bg-[#00a884]/10 text-[#00a884]'
                : 'bg-[#f0f2f5] text-[#54656f] hover:bg-[#e9edef]'
            )}
          >
            {label}
            {key !== 'all' && counts[key] > 0 && (
              <span className={cn(
                'min-w-[18px] h-[18px] rounded-full flex items-center justify-center text-[10px] font-bold px-1',
                activeTab === key
                  ? 'bg-[#00a884] text-white'
                  : 'bg-[#667781]/20 text-[#667781]'
              )}>
                {counts[key]}
              </span>
            )}
          </button>
        );
      })}

      {/* Label filter button + dropdown */}
      {hasLabels && (
        <div className="relative ml-auto" ref={dropdownRef}>
          <button
            onClick={() => setShowLabelDropdown(!showLabelDropdown)}
            className={cn(
              'flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-colors',
              hasActiveFilters
                ? 'bg-[#00a884]/10 text-[#00a884]'
                : 'bg-[#f0f2f5] text-[#54656f] hover:bg-[#e9edef]'
            )}
            title="Filtrar por etiqueta"
          >
            <Tag className="h-3 w-3" />
            {hasActiveFilters ? (
              <>
                <span>{selectedLabelIds.length}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    clearLabelFilters();
                  }}
                  className="hover:text-red-500 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </>
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
          </button>

          {/* Dropdown de labels */}
          {showLabelDropdown && (
            <div className="absolute right-0 top-full mt-1 w-52 bg-white rounded-lg shadow-lg border border-[#e9edef] z-50 py-1 max-h-64 overflow-y-auto">
              <div className="px-3 py-1.5 text-[10px] uppercase text-[#8696a0] font-semibold tracking-wider border-b border-[#f0f2f5]">
                Filtrar por etiqueta
              </div>
              {labels.map((label) => {
                const isSelected = selectedLabelIds.includes(label.id);
                return (
                  <button
                    key={label.id}
                    onClick={() => toggleLabel(label.id)}
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-1.5 text-xs transition-colors text-left',
                      isSelected
                        ? 'bg-[#00a884]/5 text-[#111b21]'
                        : 'text-[#54656f] hover:bg-[#f5f6f6]'
                    )}
                  >
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0 border"
                      style={{
                        backgroundColor: isSelected ? (label.color || '#6b7280') : 'transparent',
                        borderColor: label.color || '#6b7280',
                      }}
                    />
                    <span className="truncate">{label.name}</span>
                    {isSelected && (
                      <span className="ml-auto text-[#00a884]">✓</span>
                    )}
                  </button>
                );
              })}
              {hasActiveFilters && (
                <button
                  onClick={clearLabelFilters}
                  className="w-full px-3 py-1.5 text-xs text-red-500 hover:bg-red-50 border-t border-[#f0f2f5] text-left"
                >
                  Limpar filtros
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
