import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarIcon, Filter, X, RefreshCw, Download } from "lucide-react";
import { LeadStatus, STATUS_OPTIONS, STATUS_CONFIG } from "@/types/lead-mt";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface ResponsibleUser {
  id: string;
  name: string;
}

interface GlobalFiltersProps {
  dateRange: { start: Date; end: Date } | null;
  onDateRangeChange: (range: { start: Date; end: Date } | null) => void;
  statusFilter: LeadStatus | "all";
  onStatusFilterChange: (value: LeadStatus | "all") => void;
  origemFilter: string;
  onOrigemFilterChange: (value: string) => void;
  cidadeFilter: string;
  onCidadeFilterChange: (value: string) => void;
  unidadeFilter: string;
  onUnidadeFilterChange: (value: string) => void;
  responsibleFilter?: string;
  onResponsibleFilterChange?: (value: string) => void;
  responsibleUsers?: ResponsibleUser[];
  origens: string[];
  cidades: string[];
  unidades: string[];
  onRefresh: () => void;
  isRefreshing?: boolean;
  onDownloadCSV?: () => void;
}

export function GlobalFilters({
  dateRange,
  onDateRangeChange,
  statusFilter,
  onStatusFilterChange,
  origemFilter,
  onOrigemFilterChange,
  cidadeFilter,
  onCidadeFilterChange,
  unidadeFilter,
  onUnidadeFilterChange,
  responsibleFilter,
  onResponsibleFilterChange,
  responsibleUsers = [],
  origens,
  cidades,
  unidades,
  onRefresh,
  isRefreshing = false,
  onDownloadCSV,
}: GlobalFiltersProps) {
  const [startDate, setStartDate] = useState<Date | undefined>(dateRange?.start);
  const [endDate, setEndDate] = useState<Date | undefined>(dateRange?.end);

  const activeFilterCount = [
    dateRange ? 1 : 0,
    statusFilter !== "all" ? 1 : 0,
    origemFilter !== "all" ? 1 : 0,
    cidadeFilter !== "all" ? 1 : 0,
    unidadeFilter !== "all" ? 1 : 0,
    responsibleFilter && responsibleFilter !== "all" ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  const hasActiveFilters = activeFilterCount > 0;

  const handleStartDateSelect = (date: Date | undefined) => {
    setStartDate(date);
    if (date && endDate && date <= endDate) {
      onDateRangeChange({ start: date, end: endDate });
    }
  };

  const handleEndDateSelect = (date: Date | undefined) => {
    setEndDate(date);
    if (startDate && date && startDate <= date) {
      onDateRangeChange({ start: startDate, end: date });
    }
  };

  const clearFilters = () => {
    setStartDate(undefined);
    setEndDate(undefined);
    onDateRangeChange(null);
    onStatusFilterChange("all");
    onOrigemFilterChange("all");
    onCidadeFilterChange("all");
    onUnidadeFilterChange("all");
    onResponsibleFilterChange?.("all");
  };

  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <div className="flex flex-wrap items-center gap-3">
        {/* Date Range */}
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "justify-start text-left font-normal",
                  !startDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {startDate ? format(startDate, "dd/MM/yy", { locale: ptBR }) : "Início"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={startDate}
                onSelect={handleStartDateSelect}
                initialFocus
                locale={ptBR}
              />
            </PopoverContent>
          </Popover>
          <span className="text-muted-foreground text-sm">até</span>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "justify-start text-left font-normal",
                  !endDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {endDate ? format(endDate, "dd/MM/yy", { locale: ptBR }) : "Fim"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={endDate}
                onSelect={handleEndDateSelect}
                initialFocus
                locale={ptBR}
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="h-6 w-px bg-border hidden sm:block" />

        {/* Status Filter */}
        <Select value={statusFilter} onValueChange={onStatusFilterChange}>
          <SelectTrigger className="w-[150px] h-9" aria-label="Filtrar por status">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos status</SelectItem>
            {STATUS_OPTIONS.map((status) => (
              <SelectItem key={status} value={status}>
                {STATUS_CONFIG[status]?.label || status}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Origem Filter */}
        {origens.length > 0 && (
          <Select value={origemFilter} onValueChange={onOrigemFilterChange}>
            <SelectTrigger className="w-[130px] h-9" aria-label="Filtrar por origem">
              <SelectValue placeholder="Origem" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas origens</SelectItem>
              {origens.map((origem) => (
                <SelectItem key={origem} value={origem}>
                  {origem}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Cidade Filter */}
        {cidades.length > 0 && (
          <Select value={cidadeFilter} onValueChange={onCidadeFilterChange}>
            <SelectTrigger className="w-[130px] h-9" aria-label="Filtrar por cidade">
              <SelectValue placeholder="Cidade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas cidades</SelectItem>
              {cidades.map((cidade) => (
                <SelectItem key={cidade} value={cidade}>
                  {cidade}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Unidade Filter */}
        {unidades.length > 0 && (
          <Select value={unidadeFilter} onValueChange={onUnidadeFilterChange}>
            <SelectTrigger className="w-[130px] h-9" aria-label="Filtrar por unidade">
              <SelectValue placeholder="Unidade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {unidades.map((unidade) => (
                <SelectItem key={unidade} value={unidade}>
                  {unidade}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Responsible Filter */}
        {responsibleUsers.length > 0 && onResponsibleFilterChange && (
          <Select value={responsibleFilter || "all"} onValueChange={onResponsibleFilterChange}>
            <SelectTrigger className="w-[140px] h-9" aria-label="Filtrar por responsável">
              <SelectValue placeholder="Responsável" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos responsáveis</SelectItem>
              {responsibleUsers.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <div className="flex-1" />

        {/* Clear Filters */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="text-muted-foreground hover:text-foreground gap-1.5"
            aria-label={`Limpar ${activeFilterCount} filtro${activeFilterCount > 1 ? 's' : ''} ativo${activeFilterCount > 1 ? 's' : ''}`}
          >
            <X className="h-4 w-4" />
            Limpar
            <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-primary/10 text-primary text-xs font-medium">
              {activeFilterCount}
            </span>
          </Button>
        )}

        {/* Refresh Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={isRefreshing}
          className="gap-2"
        >
          <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
          Atualizar
        </Button>

        {/* Download CSV Button */}
        {onDownloadCSV && (
          <Button
            variant="outline"
            size="sm"
            onClick={onDownloadCSV}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            CSV
          </Button>
        )}
      </div>
    </div>
  );
}
