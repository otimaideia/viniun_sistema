import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Search, Plus, ClipboardList, Filter } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useTenantContext } from '@/contexts/TenantContext';
import { TenantSelector } from '@/components/multitenant/TenantSelector';
import { useSOPsMT } from '@/hooks/multitenant/useSOPsMT';
import { useSOPCategoriesMT } from '@/hooks/multitenant/useSOPCategoriesMT';
import { useDepartments } from '@/hooks/multitenant/useDepartments';
import {
  SOP_STATUS_CONFIG,
  SOP_PRIORIDADE_CONFIG,
  type SOPStatus,
  type SOPPrioridade,
  type SOPFilters,
} from '@/types/sop';

export default function SOPsList() {
  const navigate = useNavigate();
  const { accessLevel } = useTenantContext();
  const [filters, setFilters] = useState<SOPFilters>({});
  const [searchInput, setSearchInput] = useState('');

  const { data: sops, isLoading } = useSOPsMT(filters);
  const { categories } = useSOPCategoriesMT();
  const { departments } = useDepartments();

  const handleSearch = (value: string) => {
    setSearchInput(value);
    setFilters((prev) => ({ ...prev, search: value || undefined }));
  };

  const clearFilters = () => {
    setSearchInput('');
    setFilters({});
  };

  const hasActiveFilters = filters.status || filters.category_id || filters.department_id || filters.prioridade;

  return (
    <div className="space-y-6">
      {accessLevel === 'platform' && <TenantSelector variant="dropdown" />}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardList className="h-6 w-6" />
            POPs - Procedimentos Operacionais Padrão
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie os procedimentos operacionais padronizados
          </p>
        </div>
        <Button asChild>
          <Link to="/processos/novo">
            <Plus className="h-4 w-4 mr-2" />
            Novo POP
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por titulo, codigo ou descricao..."
                value={searchInput}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select
              value={filters.status || 'all'}
              onValueChange={(v) =>
                setFilters((prev) => ({ ...prev, status: v === 'all' ? undefined : (v as SOPStatus) }))
              }
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos status</SelectItem>
                {Object.entries(SOP_STATUS_CONFIG).map(([key, cfg]) => (
                  <SelectItem key={key} value={key}>
                    {cfg.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.category_id || 'all'}
              onValueChange={(v) =>
                setFilters((prev) => ({ ...prev, category_id: v === 'all' ? undefined : v }))
              }
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas categorias</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.department_id || 'all'}
              onValueChange={(v) =>
                setFilters((prev) => ({ ...prev, department_id: v === 'all' ? undefined : v }))
              }
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Departamento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos departamentos</SelectItem>
                {departments?.map((dep: any) => (
                  <SelectItem key={dep.id} value={dep.id}>
                    {dep.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.prioridade || 'all'}
              onValueChange={(v) =>
                setFilters((prev) => ({ ...prev, prioridade: v === 'all' ? undefined : (v as SOPPrioridade) }))
              }
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Prioridade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas prioridades</SelectItem>
                {Object.entries(SOP_PRIORIDADE_CONFIG).map(([key, cfg]) => (
                  <SelectItem key={key} value={key}>
                    {cfg.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <Filter className="h-4 w-4 mr-1" />
                Limpar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-3 p-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-12 bg-muted animate-pulse rounded" />
              ))}
            </div>
          ) : !sops?.length ? (
            <div className="text-center py-12">
              <ClipboardList className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-40" />
              <p className="text-muted-foreground">Nenhum POP encontrado.</p>
              <Button asChild variant="outline" className="mt-4">
                <Link to="/processos/novo">Criar primeiro POP</Link>
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Codigo</TableHead>
                  <TableHead>Titulo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Departamento</TableHead>
                  <TableHead>Prioridade</TableHead>
                  <TableHead>Versao</TableHead>
                  <TableHead className="text-right">Acoes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sops.map((sop) => {
                  const statusCfg = SOP_STATUS_CONFIG[sop.status];
                  const prioridadeCfg = SOP_PRIORIDADE_CONFIG[sop.prioridade];
                  return (
                    <TableRow
                      key={sop.id}
                      className="cursor-pointer"
                      onClick={() => navigate(`/processos/${sop.id}`)}
                    >
                      <TableCell className="font-mono text-sm">{sop.codigo}</TableCell>
                      <TableCell className="font-medium">
                        {sop.titulo}
                        {sop.is_template && (
                          <Badge variant="outline" className="ml-2 text-xs">
                            Template
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={`${statusCfg.bgColor} ${statusCfg.color} border-0`}>
                          {statusCfg.label}
                        </Badge>
                      </TableCell>
                      <TableCell>{sop.department?.nome || '-'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`${prioridadeCfg.color}`}>
                          {prioridadeCfg.label}
                        </Badge>
                      </TableCell>
                      <TableCell>v{sop.versao_label || sop.versao}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/processos/${sop.id}/editar`);
                          }}
                        >
                          Editar
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
