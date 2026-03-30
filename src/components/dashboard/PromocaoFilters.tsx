import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarIcon, X, RefreshCw, Download } from "lucide-react";
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

interface PromocaoFiltersProps {
  dateRange: { start: Date; end: Date } | null;
  onDateRangeChange: (range: { start: Date; end: Date } | null) => void;
  unidadeFilter: string;
  onUnidadeFilterChange: (value: string) => void;
  unidades: string[];
  onRefresh: () => void;
  isRefreshing?: boolean;
  onDownloadCSV?: () => void;
}

export function PromocaoFilters({
  dateRange,
  onDateRangeChange,
  unidadeFilter,
  onUnidadeFilterChange,
  unidades,
  onRefresh,
  isRefreshing = false,
  onDownloadCSV,
}: PromocaoFiltersProps) {
  const [startDate, setStartDate] = useState<Date | undefined>(dateRange?.start);
  const [endDate, setEndDate] = useState<Date | undefined>(dateRange?.end);

  const hasActiveFilters = dateRange || unidadeFilter !== "all";

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
    onUnidadeFilterChange("all");
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

        {/* Unidade Filter */}
        {unidades.length > 0 && (
          <Select value={unidadeFilter} onValueChange={onUnidadeFilterChange}>
            <SelectTrigger className="w-[150px] h-9">
              <SelectValue placeholder="Unidade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas unidades</SelectItem>
              {unidades.map((unidade) => (
                <SelectItem key={unidade} value={unidade}>
                  {unidade}
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
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4 mr-1" />
            Limpar
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
