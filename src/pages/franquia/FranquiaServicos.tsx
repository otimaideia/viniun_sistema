import { useUserProfileAdapter } from "@/hooks/useUserProfileAdapter";
import { useServicosAdapter } from "@/hooks/useServicosAdapter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sparkles,
  Clock,
  DollarSign
} from "lucide-react";

const FranquiaServicos = () => {
  const { profile } = useUserProfileAdapter();
  const { servicos, isLoading } = useServicosAdapter();

  if (!profile?.franqueado_id) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">
          Você não está vinculado a nenhuma franquia.
        </p>
      </div>
    );
  }

  // Filtrar serviços ativos
  const servicosAtivos = servicos.filter((s) => s.is_active !== false);

  // Agrupar por categoria
  const categorias = servicosAtivos.reduce((acc, servico) => {
    const cat = servico.categoria || "Outros";
    if (!acc[cat]) {
      acc[cat] = [];
    }
    acc[cat].push(servico);
    return acc;
  }, {} as Record<string, typeof servicosAtivos>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Serviços Oferecidos</h1>
        <p className="text-muted-foreground">
          Catálogo de serviços disponíveis na sua unidade
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">{servicosAtivos.length}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Categorias</CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold">{Object.keys(categorias).length}</span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Promoções</CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold text-green-600">
              {servicosAtivos.filter((s) => s.preco_promocional).length}
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Grid de Serviços */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-lg" />
          ))}
        </div>
      ) : servicosAtivos.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Sparkles className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">
              Nenhum serviço cadastrado ainda
            </p>
          </CardContent>
        </Card>
      ) : (
        Object.entries(categorias).map(([categoria, servicosCat]) => (
          <div key={categoria} className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-primary"></span>
              {categoria}
              <Badge variant="secondary">{servicosCat.length}</Badge>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {servicosCat.map((servico) => (
                <Card key={servico.id} className="overflow-hidden hover:shadow-md transition-shadow">
                  {servico.imagem_url && (
                    <div className="h-32 bg-muted">
                      <img
                        src={servico.imagem_url}
                        alt={servico.nome}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-base">{servico.nome}</CardTitle>
                      {servico.preco_promocional && (
                        <Badge className="bg-green-600">Promoção</Badge>
                      )}
                    </div>
                    {servico.descricao && (
                      <CardDescription className="line-clamp-2">
                        {servico.descricao}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-sm">
                      {servico.duracao_minutos && (
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          {servico.duracao_minutos} min
                        </span>
                      )}
                      <span className="flex items-center gap-1 font-semibold">
                        <DollarSign className="h-4 w-4" />
                        {servico.preco_promocional ? (
                          <>
                            <span className="line-through text-muted-foreground text-xs mr-1">
                              R$ {Number(servico.preco).toFixed(2)}
                            </span>
                            R$ {Number(servico.preco_promocional).toFixed(2)}
                          </>
                        ) : (
                          <>R$ {Number(servico.preco || 0).toFixed(2)}</>
                        )}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default FranquiaServicos;
