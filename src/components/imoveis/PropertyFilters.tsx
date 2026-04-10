import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, X } from "lucide-react";

export interface PropertyFiltersData {
  search: string;
  tipo: string;
  finalidade: string;
  cidade: string;
  bairro: string;
  dormitoriosMin: string;
  valorMin: string;
  valorMax: string;
  destaque: boolean;
  lancamento: boolean;
  financiamento: boolean;
}

interface FilterOption {
  value: string;
  label: string;
}

interface PropertyFiltersProps {
  filters: PropertyFiltersData;
  onFiltersChange: (filters: PropertyFiltersData) => void;
  tipos?: FilterOption[];
  finalidades?: FilterOption[];
  cidades?: FilterOption[];
  bairros?: FilterOption[];
}

const EMPTY_FILTERS: PropertyFiltersData = {
  search: "",
  tipo: "all",
  finalidade: "all",
  cidade: "all",
  bairro: "all",
  dormitoriosMin: "",
  valorMin: "",
  valorMax: "",
  destaque: false,
  lancamento: false,
  financiamento: false,
};

export function PropertyFilters({
  filters,
  onFiltersChange,
  tipos = [],
  finalidades = [],
  cidades = [],
  bairros = [],
}: PropertyFiltersProps) {
  const update = (patch: Partial<PropertyFiltersData>) => {
    onFiltersChange({ ...filters, ...patch });
  };

  const hasActiveFilters =
    filters.tipo !== "all" ||
    filters.finalidade !== "all" ||
    filters.cidade !== "all" ||
    filters.bairro !== "all" ||
    filters.dormitoriosMin !== "" ||
    filters.valorMin !== "" ||
    filters.valorMax !== "" ||
    filters.destaque ||
    filters.lancamento ||
    filters.financiamento;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-end">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por título, referência, endereço..."
            value={filters.search}
            onChange={(e) => update({ search: e.target.value })}
            className="pl-10"
          />
        </div>

        {/* Tipo */}
        <Select value={filters.tipo} onValueChange={(v) => update({ tipo: v })}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Tipos</SelectItem>
            {tipos.map((t) => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Finalidade */}
        <Select value={filters.finalidade} onValueChange={(v) => update({ finalidade: v })}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Finalidade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {finalidades.map((f) => (
              <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Cidade */}
        <Select value={filters.cidade} onValueChange={(v) => update({ cidade: v, bairro: "all" })}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Cidade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as Cidades</SelectItem>
            {cidades.map((c) => (
              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Bairro */}
        <Select value={filters.bairro} onValueChange={(v) => update({ bairro: v })}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Bairro" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Bairros</SelectItem>
            {bairros.map((b) => (
              <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={() => onFiltersChange(EMPTY_FILTERS)}>
            <X className="h-4 w-4 mr-1" /> Limpar
          </Button>
        )}
      </div>

      {/* Row 2: dormitorios, valor, checkboxes */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2">
          <Label className="text-sm whitespace-nowrap">Dorm. mín:</Label>
          <Input
            type="number"
            min="0"
            className="w-[80px]"
            value={filters.dormitoriosMin}
            onChange={(e) => update({ dormitoriosMin: e.target.value })}
            placeholder="0"
          />
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-sm whitespace-nowrap">Valor mín:</Label>
          <Input
            type="number"
            min="0"
            className="w-[130px]"
            value={filters.valorMin}
            onChange={(e) => update({ valorMin: e.target.value })}
            placeholder="R$ 0"
          />
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-sm whitespace-nowrap">Valor máx:</Label>
          <Input
            type="number"
            min="0"
            className="w-[130px]"
            value={filters.valorMax}
            onChange={(e) => update({ valorMax: e.target.value })}
            placeholder="R$ 0"
          />
        </div>

        <div className="flex items-center gap-4 ml-4">
          <div className="flex items-center gap-2">
            <Checkbox
              id="destaque"
              checked={filters.destaque}
              onCheckedChange={(c) => update({ destaque: !!c })}
            />
            <Label htmlFor="destaque" className="text-sm">Destaque</Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="lancamento"
              checked={filters.lancamento}
              onCheckedChange={(c) => update({ lancamento: !!c })}
            />
            <Label htmlFor="lancamento" className="text-sm">Lançamento</Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="financiamento"
              checked={filters.financiamento}
              onCheckedChange={(c) => update({ financiamento: !!c })}
            />
            <Label htmlFor="financiamento" className="text-sm">Aceita Financiamento</Label>
          </div>
        </div>
      </div>
    </div>
  );
}
