import { MTDashboardBoardWidget, WidgetData } from '@/types/dashboard';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface WidgetTableProps {
  widget: MTDashboardBoardWidget;
  data?: WidgetData;
}

export function WidgetTable({ widget, data }: WidgetTableProps) {
  const items = data?.items || [];

  if (!items.length) {
    return (
      <div className="bg-card rounded-xl border border-border p-5 h-full flex items-center justify-center text-muted-foreground text-sm">
        Nenhum registro encontrado
      </div>
    );
  }

  // Auto-detect display columns (exclude internal fields)
  const excludeKeys = new Set(['id', 'tenant_id', 'franchise_id', 'created_by', 'updated_at', 'deleted_at', 'query_config', 'config']);
  const columns = Object.keys(items[0]).filter(k => !excludeKeys.has(k) && !k.endsWith('_id')).slice(0, 6);

  // Friendly column names
  const columnLabels: Record<string, string> = {
    nome: 'Nome', email: 'Email', telefone: 'Telefone', status: 'Status',
    created_at: 'Data', origem: 'Origem', responsavel: 'Responsável',
    horario: 'Horário', servico: 'Serviço', valor: 'Valor',
  };

  function formatCell(value: any, key: string): string {
    if (value === null || value === undefined) return '-';
    if (key === 'created_at' || key === 'updated_at' || key === 'horario') {
      try { return new Date(value).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }); }
      catch { return String(value); }
    }
    if (key === 'valor' && typeof value === 'number') return `R$ ${value.toLocaleString('pt-BR')}`;
    return String(value);
  }

  return (
    <div className="bg-card rounded-xl border border-border p-5 h-full overflow-hidden">
      <h3 className="text-sm font-semibold text-foreground mb-3">{widget.nome}</h3>
      <div className="overflow-auto max-h-[calc(100%-2rem)]">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map(col => (
                <TableHead key={col} className="text-xs">{columnLabels[col] || col}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.slice(0, widget.query_config.limit || 10).map((item, i) => (
              <TableRow key={item.id || i}>
                {columns.map(col => (
                  <TableCell key={col} className="text-sm">{formatCell(item[col], col)}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
