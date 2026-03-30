import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Building2, Plus, Pencil, Trash2, Globe, MapPin, ExternalLink } from 'lucide-react';
import { useCompetitorsMT, useCompetitorPricesMT } from '@/hooks/multitenant/useCompetitivoMT';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export default function Concorrentes() {
  const navigate = useNavigate();
  const { competitors, isLoading, remove } = useCompetitorsMT();
  const { prices } = useCompetitorPricesMT();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-48" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="h-6 w-6" />
            Concorrentes
          </h1>
          <p className="text-muted-foreground text-sm">
            Gerencie os concorrentes monitorados
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate('/precificacao/concorrencia')}>
            Análise Competitiva
          </Button>
          <Button size="sm" onClick={() => navigate('/precificacao/concorrentes/novo')}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Concorrente
          </Button>
        </div>
      </div>

      {/* Cards */}
      {competitors.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">Nenhum concorrente cadastrado</p>
          <Button className="mt-4" onClick={() => navigate('/precificacao/concorrentes/novo')}>
            <Plus className="h-4 w-4 mr-2" /> Cadastrar Concorrente
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {competitors.map(comp => {
            const compPrices = prices.filter(p => p.competitor_id === comp.id);
            const lastCollect = compPrices.length > 0
              ? compPrices.reduce((latest, p) => p.data_coleta > latest ? p.data_coleta : latest, compPrices[0].data_coleta)
              : null;

            return (
              <Card key={comp.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-lg">{comp.nome}</h3>
                      {comp.website && (
                        <a
                          href={comp.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                        >
                          <Globe className="h-3 w-3" />
                          {comp.website.replace(/^https?:\/\//, '')}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {comp.tipo === 'concorrente' ? 'Concorrente' : 'Referência'}
                    </Badge>
                  </div>

                  <div className="space-y-2 text-sm text-muted-foreground mb-4">
                    {comp.regiao && (
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        <span className="capitalize">{comp.regiao}</span>
                        {comp.cidade && <span>— {comp.cidade}/{comp.estado}</span>}
                      </div>
                    )}
                    <div>
                      <span className="font-medium text-foreground">{compPrices.length}</span> preços cadastrados
                    </div>
                    {lastCollect && (
                      <div className="text-xs">
                        Última coleta: {new Date(lastCollect).toLocaleDateString('pt-BR')}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => navigate(`/precificacao/concorrentes/${comp.id}/editar`)}
                    >
                      <Pencil className="h-3 w-3 mr-1" />
                      Editar
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remover concorrente?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Isso removerá "{comp.nome}" e todos os seus preços cadastrados.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-red-600 hover:bg-red-700"
                            onClick={() => remove.mutate(comp.id)}
                          >
                            Remover
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
