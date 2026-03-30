import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTenantContext } from '@/contexts/TenantContext';
import { useBadges } from '@/hooks/multitenant/useGamificationMT';
import { BADGE_RARIDADE_CONFIG } from '@/types/treinamento';
import type { BadgeCategoria, BadgeRaridade, MTGamificationBadge } from '@/types/treinamento';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Award, Lock, Filter } from 'lucide-react';

// ============================================================
// Constants
// ============================================================

const CATEGORIA_CONFIG: Record<BadgeCategoria, { label: string; emoji: string }> = {
  aprendizado: { label: 'Aprendizado', emoji: '📚' },
  consistencia: { label: 'Consistência', emoji: '🔥' },
  excelencia: { label: 'Excelência', emoji: '⭐' },
  social: { label: 'Social', emoji: '🤝' },
  marco: { label: 'Marcos', emoji: '🏆' },
  especial: { label: 'Especial', emoji: '💎' },
};

const ALL_CATEGORIAS: (BadgeCategoria | 'todas')[] = ['todas', 'aprendizado', 'consistencia', 'excelencia', 'social', 'marco', 'especial'];

const RARIDADE_OPTIONS: { value: BadgeRaridade | 'todas'; label: string }[] = [
  { value: 'todas', label: 'Todas as Raridades' },
  { value: 'comum', label: 'Comum' },
  { value: 'incomum', label: 'Incomum' },
  { value: 'raro', label: 'Raro' },
  { value: 'epico', label: 'Epico' },
  { value: 'lendario', label: 'Lendario' },
];

function getRaridadeBorderColor(raridade: string, earned: boolean): string {
  if (!earned) return 'border-gray-200';
  switch (raridade) {
    case 'comum': return 'border-gray-400';
    case 'incomum': return 'border-green-400';
    case 'raro': return 'border-blue-400';
    case 'epico': return 'border-purple-400';
    case 'lendario': return 'border-yellow-400';
    default: return 'border-gray-300';
  }
}

function getRaridadeGlow(raridade: string, earned: boolean): string {
  if (!earned) return '';
  switch (raridade) {
    case 'raro': return 'shadow-md shadow-blue-200';
    case 'epico': return 'shadow-md shadow-purple-200';
    case 'lendario': return 'shadow-lg shadow-yellow-300 ring-1 ring-yellow-300/50';
    default: return '';
  }
}

// ============================================================
// Badge Card Component
// ============================================================

function BadgeCard({ badge }: { badge: MTGamificationBadge }) {
  const earned = badge.earned ?? false;
  const raridadeConfig = BADGE_RARIDADE_CONFIG[badge.raridade];
  const borderColor = getRaridadeBorderColor(badge.raridade, earned);
  const glow = getRaridadeGlow(badge.raridade, earned);

  // Secret badge not earned - show mystery
  if (badge.is_secret && !earned) {
    return (
      <Card className={`border-2 border-dashed border-gray-300 ${glow} transition-all`}>
        <CardContent className="p-5 flex flex-col items-center text-center space-y-2">
          <div className="relative">
            <span className="text-4xl opacity-30">❓</span>
            <Lock className="h-4 w-4 absolute -bottom-1 -right-1 text-gray-400" />
          </div>
          <p className="font-medium text-muted-foreground">???</p>
          <p className="text-xs text-muted-foreground italic">Badge secreto - continue explorando!</p>
          <Badge variant="secondary" className={`text-xs ${raridadeConfig.color} ${raridadeConfig.bgColor}`}>
            {raridadeConfig.label}
          </Badge>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={`border-2 ${borderColor} ${glow} transition-all ${
        earned ? 'hover:scale-[1.02]' : 'opacity-50 grayscale'
      }`}
    >
      <CardContent className="p-5 flex flex-col items-center text-center space-y-2 relative">
        {/* Lock overlay for not earned */}
        {!earned && (
          <div className="absolute top-2 right-2">
            <Lock className="h-4 w-4 text-gray-400" />
          </div>
        )}

        {/* Emoji icon */}
        <span className={`text-4xl ${earned ? '' : 'grayscale'}`}>
          {badge.icone_emoji || '🏅'}
        </span>

        {/* Nome */}
        <p className="font-semibold text-sm">{badge.nome}</p>

        {/* Descrição */}
        <p className="text-xs text-muted-foreground line-clamp-2">{badge.descricao}</p>

        {/* Raridade + XP */}
        <div className="flex items-center gap-2 flex-wrap justify-center">
          <Badge variant="secondary" className={`text-xs ${raridadeConfig.color} ${raridadeConfig.bgColor}`}>
            {raridadeConfig.label}
          </Badge>
          <span className="text-xs text-green-600 font-semibold">+{badge.xp_reward} XP</span>
        </div>

        {/* Earned date */}
        {earned && badge.earned_at && (
          <p className="text-xs text-green-600">
            Conquistado em {new Date(badge.earned_at).toLocaleDateString('pt-BR')}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================
// Component
// ============================================================

export default function BadgesGallery() {
  const { isLoading: isTenantLoading } = useTenantContext();
  const [activeTab, setActiveTab] = useState<BadgeCategoria | 'todas'>('todas');
  const [raridadeFilter, setRaridadeFilter] = useState<BadgeRaridade | 'todas'>('todas');

  const categoriaFilter = activeTab === 'todas' ? undefined : activeTab;
  const { data: allBadges, isLoading } = useBadges(categoriaFilter);

  const loading = isTenantLoading || isLoading;

  // Apply rarity filter client-side
  const badges = useMemo(() => {
    if (!allBadges) return undefined;
    if (raridadeFilter === 'todas') return allBadges;
    return allBadges.filter((b) => b.raridade === raridadeFilter);
  }, [allBadges, raridadeFilter]);

  // Count stats (from all badges, not filtered)
  const totalBadges = allBadges?.length || 0;
  const earnedCount = allBadges?.filter((b) => b.earned).length || 0;
  const filteredCount = badges?.length || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Award className="h-6 w-6 text-purple-500" />
            Galeria de Badges
          </h1>
          <p className="text-muted-foreground">
            {earnedCount} de {totalBadges} badges conquistados
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={raridadeFilter} onValueChange={(v) => setRaridadeFilter(v as BadgeRaridade | 'todas')}>
            <SelectTrigger className="w-48">
              <Filter className="h-4 w-4 mr-1" />
              <SelectValue placeholder="Raridade" />
            </SelectTrigger>
            <SelectContent>
              {RARIDADE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Link to="/gamificacao">
            <Badge variant="outline" className="cursor-pointer hover:bg-accent">
              Meu Perfil
            </Badge>
          </Link>
        </div>
      </div>

      {/* Progress bar */}
      {totalBadges > 0 && (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="h-3 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-purple-400 to-violet-500 transition-all duration-500"
                    style={{ width: `${(earnedCount / totalBadges) * 100}%` }}
                  />
                </div>
              </div>
              <span className="text-sm font-bold text-purple-600 whitespace-nowrap">
                {Math.round((earnedCount / totalBadges) * 100)}%
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Category Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as BadgeCategoria | 'todas')}>
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="todas">Todas</TabsTrigger>
          {(Object.keys(CATEGORIA_CONFIG) as BadgeCategoria[]).map((cat) => (
            <TabsTrigger key={cat} value={cat}>
              {CATEGORIA_CONFIG[cat].emoji} {CATEGORIA_CONFIG[cat].label}
            </TabsTrigger>
          ))}
        </TabsList>

        {ALL_CATEGORIAS.map((cat) => (
          <TabsContent key={cat} value={cat} className="mt-6">
            {loading ? (
              <div className="flex items-center justify-center h-48">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : !badges?.length ? (
              <div className="text-center py-16 text-muted-foreground">
                <Award className="h-12 w-12 mx-auto mb-4 opacity-40" />
                <p>Nenhum badge disponível nesta categoria.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {/* Show earned first, then unearned */}
                {[...badges]
                  .sort((a, b) => {
                    if (a.earned && !b.earned) return -1;
                    if (!a.earned && b.earned) return 1;
                    return 0;
                  })
                  .map((badge) => (
                    <BadgeCard key={badge.id} badge={badge} />
                  ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
