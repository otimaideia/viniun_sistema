import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, BookOpen, Users, Layers, Star } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTenantContext } from '@/contexts/TenantContext';
import { useTrainingTracksMT } from '@/hooks/multitenant/useTrainingTracksMT';
import { TRACK_NIVEL_CONFIG } from '@/types/treinamento';
import type { TrackNivel } from '@/types/treinamento';

export default function TrainingTracks() {
  const { isLoading: isTenantLoading } = useTenantContext();
  const [search, setSearch] = useState('');
  const [nivelFilter, setNivelFilter] = useState<string>('all');
  const [publishedFilter, setPublishedFilter] = useState<string>('all');

  const { tracks, isLoading } = useTrainingTracksMT({
    search: search || undefined,
    nivel: nivelFilter !== 'all' ? (nivelFilter as TrackNivel) : undefined,
    is_published:
      publishedFilter === 'all'
        ? undefined
        : publishedFilter === 'published',
  });

  const loading = isLoading || isTenantLoading;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="h-6 w-6" />
            Trilhas de Treinamento
          </h1>
          <p className="text-muted-foreground">
            Gerencie as trilhas de aprendizagem
          </p>
        </div>
        <Button asChild>
          <Link to="/treinamentos/trilhas/novo">
            <Plus className="h-4 w-4 mr-2" />
            Nova Trilha
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar trilhas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={nivelFilter} onValueChange={setNivelFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Nivel" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os niveis</SelectItem>
            {Object.entries(TRACK_NIVEL_CONFIG).map(([key, cfg]) => (
              <SelectItem key={key} value={key}>
                {cfg.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={publishedFilter} onValueChange={setPublishedFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="published">Publicadas</SelectItem>
            <SelectItem value="draft">Rascunho</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tracks Grid */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="h-32 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : tracks.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">
              Nenhuma trilha encontrada
            </h3>
            <p className="text-muted-foreground text-center mb-4">
              Crie sua primeira trilha de treinamento para comecar.
            </p>
            <Button asChild>
              <Link to="/treinamentos/trilhas/novo">
                <Plus className="h-4 w-4 mr-2" />
                Criar Trilha
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {tracks.map((track) => {
            const nivelConfig = TRACK_NIVEL_CONFIG[track.nivel];
            return (
              <Link
                key={track.id}
                to={`/treinamentos/trilhas/${track.id}`}
                className="block"
              >
                <Card className="hover:shadow-md transition-shadow h-full">
                  <CardContent className="pt-6">
                    {/* Header */}
                    <div className="flex items-start gap-3 mb-4">
                      <div
                        className="w-12 h-12 rounded-lg flex items-center justify-center text-white flex-shrink-0"
                        style={{
                          backgroundColor: track.cor || '#6366f1',
                        }}
                      >
                        <BookOpen className="h-6 w-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate">{track.titulo}</h3>
                        <p className="text-xs text-muted-foreground">
                          {track.codigo}
                        </p>
                      </div>
                    </div>

                    {/* Description */}
                    {track.descricao && (
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                        {track.descricao}
                      </p>
                    )}

                    {/* Badges */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      <Badge
                        variant="outline"
                        className={`${nivelConfig.bgColor} ${nivelConfig.color} border-0`}
                      >
                        {nivelConfig.label}
                      </Badge>
                      {!track.is_published && (
                        <Badge variant="secondary">Rascunho</Badge>
                      )}
                      {track.is_obrigatoria && (
                        <Badge variant="destructive" className="text-xs">
                          Obrigatoria
                        </Badge>
                      )}
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Layers className="h-3.5 w-3.5" />
                        <span>{track.modules_count || 0} modulos</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        <span>{track.enrolled_count || 0}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Star className="h-3.5 w-3.5" />
                        <span>{track.total_xp} XP</span>
                      </div>
                    </div>

                    {/* Duration */}
                    {track.duracao_estimada_horas && (
                      <p className="text-xs text-muted-foreground mt-2">
                        ~{track.duracao_estimada_horas}h de duracao
                      </p>
                    )}
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
