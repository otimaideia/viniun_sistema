import { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ChevronUp,
  ChevronDown,
  MoreHorizontal,
  Eye,
  DollarSign,
  UserPlus,
  MessageSquare,
  Trash2,
  Loader2,
  ChevronsUpDown,
} from 'lucide-react';
import { safeGetInitials } from '@/utils/unicodeSanitizer';
import { useFunilEtapasAdapter } from '@/hooks/useFunilEtapasAdapter';
import { useFunilLeads } from '@/hooks/useFunilLeads';
import type { FunilEtapa, FunilLeadExpanded, FunilFilters } from '@/types/funil';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface FunilListViewProps {
  funilId: string;
  filters?: FunilFilters;
  onOpenDetail?: (lead: FunilLeadExpanded) => void;
  onOpenChat?: (conversaId: string) => void;
  onAssignResponsavel?: (lead: FunilLeadExpanded) => void;
  onEditValor?: (lead: FunilLeadExpanded) => void;
  onRemoveLead?: (lead: FunilLeadExpanded) => void;
}

type SortField = 'nome' | 'etapa' | 'valor' | 'responsavel' | 'dias' | 'data_entrada';
type SortDirection = 'asc' | 'desc';

const PAGE_SIZE = 25;

export function FunilListView({
  funilId,
  filters,
  onOpenDetail,
  onOpenChat,
  onAssignResponsavel,
  onEditValor,
  onRemoveLead,
}: FunilListViewProps) {
  const [sortField, setSortField] = useState<SortField>('data_entrada');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState(0);

  const { etapas, isLoading: isLoadingEtapas } = useFunilEtapasAdapter(funilId);
  const { leads, isLoading: isLoadingLeads } = useFunilLeads(funilId, filters);

  const getDiasNaEtapa = (dataEtapa: string | undefined | null) => {
    if (!dataEtapa) return 0;
    const time = new Date(dataEtapa).getTime();
    if (isNaN(time)) return 0;
    return Math.floor((Date.now() - time) / (1000 * 60 * 60 * 24));
  };

  const sortedLeads = useMemo(() => {
    const sorted = [...leads].sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'nome':
          comparison = (a.lead?.nome || '').localeCompare(b.lead?.nome || '');
          break;
        case 'etapa': {
          const etapaA = etapas.find(e => e.id === (a.stage_id || a.etapa_id));
          const etapaB = etapas.find(e => e.id === (b.stage_id || b.etapa_id));
          comparison = (etapaA?.ordem || 0) - (etapaB?.ordem || 0);
          break;
        }
        case 'valor':
          comparison = (a.valor_estimado || 0) - (b.valor_estimado || 0);
          break;
        case 'responsavel':
          comparison = (a.responsavel?.full_name || 'zzz').localeCompare(b.responsavel?.full_name || 'zzz');
          break;
        case 'dias':
          comparison = getDiasNaEtapa(a.data_etapa) - getDiasNaEtapa(b.data_etapa);
          break;
        case 'data_entrada':
          comparison = (new Date(a.data_entrada || a.created_at).getTime() || 0) - (new Date(b.data_entrada || b.created_at).getTime() || 0);
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }, [leads, sortField, sortDirection, etapas]);

  const totalPages = Math.ceil(sortedLeads.length / PAGE_SIZE);
  const paginatedLeads = sortedLeads.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(0);
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronsUpDown className="h-3 w-3 ml-1 opacity-40" />;
    return sortDirection === 'asc'
      ? <ChevronUp className="h-3 w-3 ml-1" />
      : <ChevronDown className="h-3 w-3 ml-1" />;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
    }).format(value);
  };

  if (isLoadingEtapas || isLoadingLeads) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (leads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-muted-foreground">
        <p className="text-lg font-medium">Nenhum lead no funil</p>
        <p className="text-sm">Adicione leads para comecar</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto p-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead
                className="cursor-pointer select-none hover:bg-muted/50"
                onClick={() => handleSort('nome')}
              >
                <div className="flex items-center">
                  Lead <SortIcon field="nome" />
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer select-none hover:bg-muted/50"
                onClick={() => handleSort('etapa')}
              >
                <div className="flex items-center">
                  Etapa <SortIcon field="etapa" />
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer select-none hover:bg-muted/50 text-right"
                onClick={() => handleSort('valor')}
              >
                <div className="flex items-center justify-end">
                  Valor <SortIcon field="valor" />
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer select-none hover:bg-muted/50"
                onClick={() => handleSort('responsavel')}
              >
                <div className="flex items-center">
                  Responsavel <SortIcon field="responsavel" />
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer select-none hover:bg-muted/50 text-center"
                onClick={() => handleSort('dias')}
              >
                <div className="flex items-center justify-center">
                  Dias <SortIcon field="dias" />
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer select-none hover:bg-muted/50"
                onClick={() => handleSort('data_entrada')}
              >
                <div className="flex items-center">
                  Entrada <SortIcon field="data_entrada" />
                </div>
              </TableHead>
              <TableHead className="w-[60px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedLeads.map((lead) => {
              const etapa = lead.etapa || etapas.find(e => e.id === (lead.stage_id || lead.etapa_id));
              const dias = getDiasNaEtapa(lead.data_etapa);
              const esfriando = etapa?.meta_dias ? dias >= etapa.meta_dias : false;

              return (
                <TableRow
                  key={lead.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => onOpenDetail?.(lead)}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs bg-primary/10 text-primary">
                          {safeGetInitials(lead.lead?.nome)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate max-w-[200px]">
                          {lead.lead?.nome || 'Sem nome'}
                        </p>
                        <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                          {lead.lead?.telefone || lead.lead?.email || ''}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      style={{
                        borderColor: etapa?.cor || '#64748b',
                        color: etapa?.cor || '#64748b',
                        backgroundColor: `${etapa?.cor || '#64748b'}15`,
                      }}
                    >
                      {etapa?.nome || 'Sem etapa'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {lead.valor_estimado ? formatCurrency(lead.valor_estimado) : (
                      <span className="text-muted-foreground text-xs">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {lead.responsavel ? (
                      <span className="text-sm">{lead.responsavel.full_name}</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Nao atribuido</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <span className={`text-sm font-medium ${esfriando ? 'text-orange-600' : ''}`}>
                      {dias}d
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {lead.data_entrada || lead.created_at
                        ? format(new Date(lead.data_entrada || lead.created_at), 'dd/MM/yy', { locale: ptBR })
                        : '-'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {/* Botao WhatsApp direto */}
                      {(lead.whatsapp_cache?.conversa_id || lead.lead?.telefone) && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (lead.whatsapp_cache?.conversa_id) {
                              onOpenChat?.(lead.whatsapp_cache.conversa_id);
                            } else {
                              const phone = (lead.lead?.telefone || '').replace(/\D/g, '');
                              if (phone) window.open(`https://wa.me/${phone}`, '_blank');
                            }
                          }}
                        >
                          <MessageSquare className="h-4 w-4" />
                        </Button>
                      )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onOpenDetail?.(lead); }}>
                          <Eye className="h-4 w-4 mr-2" />
                          Ver detalhes
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEditValor?.(lead); }}>
                          <DollarSign className="h-4 w-4 mr-2" />
                          Editar valor
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onAssignResponsavel?.(lead); }}>
                          <UserPlus className="h-4 w-4 mr-2" />
                          Atribuir responsavel
                        </DropdownMenuItem>
                        {lead.whatsapp_cache?.conversa_id && (
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onOpenChat?.(lead.whatsapp_cache!.conversa_id!); }}>
                            <MessageSquare className="h-4 w-4 mr-2" />
                            Abrir WhatsApp
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={(e) => { e.stopPropagation(); onRemoveLead?.(lead); }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Remover do funil
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Paginacao */}
      {totalPages > 1 && (
        <div className="border-t p-3 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {sortedLeads.length} leads | Pagina {currentPage + 1} de {totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
              disabled={currentPage === 0}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))}
              disabled={currentPage >= totalPages - 1}
            >
              Proximo
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
