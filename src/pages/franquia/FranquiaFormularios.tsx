import { Link } from "react-router-dom";
import { useUserProfileAdapter } from "@/hooks/useUserProfileAdapter";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FileText,
  ExternalLink,
  Eye,
  Copy,
  CheckCircle2,
  XCircle
} from "lucide-react";
import { toast } from "sonner";

const FranquiaFormularios = () => {
  const { profile } = useUserProfileAdapter();

  const { data: formularios, isLoading } = useQuery({
    queryKey: ["franquia-formularios", profile?.franchise_id],
    queryFn: async () => {
      if (!profile?.franchise_id) return [];

      const { data } = await supabase
        .from("mt_forms")
        .select("*")
        .or(`franchise_id.eq.${profile.franchise_id},franchise_id.is.null`)
        .order("created_at", { ascending: false });

      return data || [];
    },
    enabled: !!profile?.franchise_id,
  });

  const copyLink = (slug: string) => {
    const url = `${window.location.origin}/form/${slug}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copiado para a área de transferência!");
  };

  if (!profile?.franchise_id) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">
          Você não está vinculado a nenhuma franquia.
        </p>
      </div>
    );
  }

  const formulariosAtivos = formularios?.filter((f) => f.is_active) || [];
  const formulariosInativos = formularios?.filter((f) => !f.is_active) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Formulários</h1>
        <p className="text-muted-foreground">
          Formulários de captação de leads da sua unidade
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
              <FileText className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">{formularios?.length || 0}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ativos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <span className="text-2xl font-bold text-green-600">{formulariosAtivos.length}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Inativos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-gray-400" />
              <span className="text-2xl font-bold text-gray-400">{formulariosInativos.length}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Grid de Formulários */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-lg" />
          ))}
        </div>
      ) : formularios?.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">
              Nenhum formulário disponível
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {formularios?.map((form) => (
            <Card key={form.id} className={`overflow-hidden ${!form.is_active ? "opacity-60" : ""}`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{form.nome}</CardTitle>
                    <CardDescription className="text-xs mt-1">
                      /{form.slug}
                    </CardDescription>
                  </div>
                  <Badge variant={form.is_active ? "default" : "secondary"}>
                    {form.is_active ? "Ativo" : "Inativo"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {form.descricao && (
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {form.descricao}
                  </p>
                )}
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyLink(form.slug)}
                  >
                    <Copy className="h-4 w-4 mr-1" />
                    Copiar Link
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                  >
                    <a
                      href={`/form/${form.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="h-4 w-4 mr-1" />
                      Abrir
                    </a>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    asChild
                  >
                    <Link to={`/formularios/${form.id}`}>
                      <Eye className="h-4 w-4 mr-1" />
                      Ver
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default FranquiaFormularios;
