import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTenantContext } from '@/contexts/TenantContext';
import { useXPHistory } from '@/hooks/multitenant/useGamificationMT';
import { XP_SOURCE_LABELS } from '@/types/treinamento';
import type { XPSource, MTGamificationXPLog } from '@/types/treinamento';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { History, TrendingUp, Star, Zap } from 'lucide-react';

// ============================================================
// Helpers
// ============================================================

function formatFullDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDayKey(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function getDayKey(dateStr: string): string {
  return new Date(dateStr).toISOString().split('T')[0];
}

function getSourceIcon(source: XPSource): string {
  switch (source) {
    case 'lesson_complete': return '📖';
    case 'lesson_first_access': return '👀';
    case 'module_complete': return '📦';
    case 'track_complete': return '🎓';
    case 'quiz_pass': return '✅';
    case 'quiz_perfect': return '🌟';
    case 'streak_bonus': return '🔥';
    case 'badge_earned': return '🏅';
    case 'daily_login': return '📅';
    case 'sop_execution': return '📋';
    case 'faq_created': return '💡';
    case 'manual_admin': return '⚙️';
    default: return '⚡';
  }
}

function getSourceBadgeColor(source: XPSource): string {
  switch (source) {
    case 'track_complete': return 'bg-purple-100 text-purple-700';
    case 'module_complete': return 'bg-blue-100 text-blue-700';
    case 'quiz_pass':
    case 'quiz_perfect': return 'bg-green-100 text-green-700';
    case 'streak_bonus': return 'bg-orange-100 text-orange-700';
    case 'badge_earned': return 'bg-yellow-100 text-yellow-700';
    default: return 'bg-gray-100 text-gray-700';
  }
}

// ============================================================
// Grouped entries by day
// ============================================================

interface DayGroup {
  dayKey: string;
  label: string;
  entries: MTGamificationXPLog[];
  totalXP: number;
}

function groupByDay(entries: MTGamificationXPLog[]): DayGroup[] {
  const groups = new Map<string, DayGroup>();

  for (const entry of entries) {
    const key = getDayKey(entry.created_at);
    if (!groups.has(key)) {
      groups.set(key, {
        dayKey: key,
        label: formatDayKey(entry.created_at),
        entries: [],
        totalXP: 0,
      });
    }
    const group = groups.get(key)!;
    group.entries.push(entry);
    group.totalXP += entry.amount;
  }

  return Array.from(groups.values());
}

// ============================================================
// Source filter options
// ============================================================

const SOURCE_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: 'Todas as fontes' },
  ...Object.entries(XP_SOURCE_LABELS).map(([value, label]) => ({ value, label })),
];

// ============================================================
// Component
// ============================================================

export default function XPHistory() {
  const { isLoading: isTenantLoading } = useTenantContext();
  const { data: allEntries, isLoading } = useXPHistory(200);
  const [sourceFilter, setSourceFilter] = useState<string>('all');

  const loading = isTenantLoading || isLoading;

  // Filter entries
  const filteredEntries = useMemo(() => {
    if (!allEntries) return [];
    if (sourceFilter === 'all') return allEntries;
    return allEntries.filter((e) => e.source === sourceFilter);
  }, [allEntries, sourceFilter]);

  // Group by day
  const dayGroups = useMemo(() => groupByDay(filteredEntries), [filteredEntries]);

  // Total XP in filtered results
  const totalFiltered = filteredEntries.reduce((sum, e) => sum + e.amount, 0);

  // Today's XP
  const todayXP = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return (allEntries || [])
      .filter((e) => getDayKey(e.created_at) === today)
      .reduce((sum, e) => sum + e.amount, 0);
  }, [allEntries]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <History className="h-6 w-6 text-blue-500" />
            Histórico de XP
          </h1>
          <p className="text-muted-foreground">Todas as suas conquistas de experiência</p>
        </div>
        <Link to="/gamificacao">
          <Badge variant="outline" className="cursor-pointer hover:bg-accent">
            Meu Perfil
          </Badge>
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="py-4 flex items-center gap-3">
            <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-yellow-50 shrink-0">
              <Zap className="h-6 w-6 text-yellow-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-yellow-600">{totalFiltered.toLocaleString('pt-BR')}</p>
              <p className="text-xs text-muted-foreground">
                XP{sourceFilter !== 'all' ? ' filtrado' : ' total exibido'}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 flex items-center gap-3">
            <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-green-50 shrink-0">
              <TrendingUp className="h-6 w-6 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">{todayXP.toLocaleString('pt-BR')}</p>
              <p className="text-xs text-muted-foreground">XP hoje</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 flex items-center gap-3">
            <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-blue-50 shrink-0">
              <Star className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-600">{filteredEntries.length}</p>
              <p className="text-xs text-muted-foreground">
                Atividades{sourceFilter !== 'all' ? ' (filtradas)' : ''}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <Select value={sourceFilter} onValueChange={setSourceFilter}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Filtrar por fonte" />
          </SelectTrigger>
          <SelectContent>
            {SOURCE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {sourceFilter !== 'all' && (
          <button
            onClick={() => setSourceFilter('all')}
            className="text-sm text-primary hover:underline"
          >
            Limpar filtro
          </button>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : !filteredEntries.length ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <Star className="h-12 w-12 mx-auto mb-4 opacity-40" />
            <p>Nenhuma transação de XP encontrada.</p>
            <p className="text-sm mt-1">Complete atividades para ganhar XP!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {dayGroups.map((group) => (
            <Card key={group.dayKey}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center justify-between">
                  <span className="capitalize">{group.label}</span>
                  <Badge variant="secondary" className="bg-green-100 text-green-700">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    +{group.totalXP.toLocaleString('pt-BR')} XP
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">XP</TableHead>
                      <TableHead>Fonte</TableHead>
                      <TableHead className="hidden md:table-cell">Descrição</TableHead>
                      <TableHead className="text-right w-32">Hora</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {group.entries.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell>
                          <span className="font-bold text-green-600">+{entry.amount}</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span>{getSourceIcon(entry.source as XPSource)}</span>
                            <Badge
                              variant="secondary"
                              className={`text-xs ${getSourceBadgeColor(entry.source as XPSource)}`}
                            >
                              {XP_SOURCE_LABELS[entry.source as XPSource] || entry.source}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                          {entry.descricao || '-'}
                        </TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground">
                          {new Date(entry.created_at).toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
