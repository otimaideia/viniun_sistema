import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useTenantContext } from "@/contexts/TenantContext";
import { useFAQsMT } from "@/hooks/multitenant/useFAQsMT";
import { useFAQCategoriesMT } from "@/hooks/multitenant/useFAQCategoriesMT";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3,
  Eye,
  ThumbsUp,
  HelpCircle,
  Loader2,
  TrendingDown,
  FolderOpen,
  Tag,
} from "lucide-react";

export default function FAQDashboard() {
  const { tenant } = useTenantContext();
  const { data: faqs, isLoading } = useFAQsMT();
  const { categories } = useFAQCategoriesMT();

  const metrics = useMemo(() => {
    if (!faqs)
      return {
        total: 0,
        published: 0,
        totalViews: 0,
        helpfulPct: 0,
        categoriesCount: 0,
        mostViewed: [] as typeof faqs,
        leastHelpful: [] as typeof faqs,
        tagsCloud: [] as { tag: string; count: number }[],
      };

    const published = faqs.filter((f) => f.is_published);
    const totalViews = faqs.reduce((sum, f) => sum + (f.views_count || 0), 0);
    const totalHelpful = faqs.reduce(
      (sum, f) => sum + (f.helpful_count || 0),
      0
    );
    const totalNotHelpful = faqs.reduce(
      (sum, f) => sum + (f.not_helpful_count || 0),
      0
    );
    const totalVotes = totalHelpful + totalNotHelpful;
    const helpfulPct =
      totalVotes > 0 ? Math.round((totalHelpful / totalVotes) * 100) : 0;

    // Most viewed
    const mostViewed = [...faqs]
      .sort((a, b) => (b.views_count || 0) - (a.views_count || 0))
      .slice(0, 10);

    // Least helpful (at least 1 vote)
    const leastHelpful = faqs
      .filter(
        (f) => (f.helpful_count || 0) + (f.not_helpful_count || 0) > 0
      )
      .sort((a, b) => {
        const aPct =
          (a.helpful_count || 0) /
          ((a.helpful_count || 0) + (a.not_helpful_count || 0));
        const bPct =
          (b.helpful_count || 0) /
          ((b.helpful_count || 0) + (b.not_helpful_count || 0));
        return aPct - bPct;
      })
      .slice(0, 10);

    // Tags cloud
    const tagMap = new Map<string, number>();
    faqs.forEach((f) => {
      f.tags?.forEach((tag) => {
        tagMap.set(tag, (tagMap.get(tag) || 0) + 1);
      });
    });
    const tagsCloud = Array.from(tagMap.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count);

    return {
      total: faqs.length,
      published: published.length,
      totalViews,
      helpfulPct,
      categoriesCount: categories.length,
      mostViewed,
      leastHelpful,
      tagsCloud,
    };
  }, [faqs, categories]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <BarChart3 className="h-6 w-6" />
          Dashboard FAQ
        </h1>
        <p className="text-muted-foreground">
          Metricas e analises das Perguntas Frequentes
          {tenant && <span className="ml-1">- {tenant.nome_fantasia}</span>}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total FAQs</CardTitle>
            <HelpCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.total}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.published} publicadas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Total Visualizacoes
            </CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.totalViews.toLocaleString("pt-BR")}
            </div>
            <p className="text-xs text-muted-foreground">
              {metrics.total > 0
                ? `~${Math.round(metrics.totalViews / metrics.total)} por FAQ`
                : "Sem dados"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">% Util</CardTitle>
            <ThumbsUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.helpfulPct}%</div>
            <p className="text-xs text-muted-foreground">
              Taxa de aprovacao
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Categorias</CardTitle>
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.categoriesCount}</div>
            <p className="text-xs text-muted-foreground">
              Categorias cadastradas
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Most Viewed */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Mais Visualizadas
            </CardTitle>
            <CardDescription>Top 10 FAQs por visualizacoes</CardDescription>
          </CardHeader>
          <CardContent>
            {metrics.mostViewed.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhuma FAQ com visualizacoes ainda
              </p>
            ) : (
              <div className="space-y-3">
                {metrics.mostViewed.map((faq, idx) => (
                  <Link
                    key={faq.id}
                    to={`/processos/faq/${faq.id}`}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent transition-colors"
                  >
                    <span className="text-sm font-medium text-muted-foreground w-6">
                      {idx + 1}.
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {faq.pergunta}
                      </p>
                      {faq.category && (
                        <Badge
                          variant="secondary"
                          className="text-xs mt-0.5"
                          style={{
                            backgroundColor: faq.category.cor
                              ? `${faq.category.cor}20`
                              : undefined,
                            color: faq.category.cor || undefined,
                          }}
                        >
                          {faq.category.nome}
                        </Badge>
                      )}
                    </div>
                    <span className="flex items-center gap-1 text-sm text-muted-foreground shrink-0">
                      <Eye className="h-3.5 w-3.5" />
                      {faq.views_count || 0}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Least Helpful */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5" />
              Precisam de Melhoria
            </CardTitle>
            <CardDescription>
              FAQs com menor taxa de aprovacao
            </CardDescription>
          </CardHeader>
          <CardContent>
            {metrics.leastHelpful.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhuma FAQ com votos ainda
              </p>
            ) : (
              <div className="space-y-3">
                {metrics.leastHelpful.map((faq) => {
                  const total =
                    (faq.helpful_count || 0) + (faq.not_helpful_count || 0);
                  const pct =
                    total > 0
                      ? Math.round(((faq.helpful_count || 0) / total) * 100)
                      : 0;
                  return (
                    <Link
                      key={faq.id}
                      to={`/processos/faq/${faq.id}`}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {faq.pergunta}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-muted-foreground">
                            {faq.helpful_count || 0} util /{" "}
                            {faq.not_helpful_count || 0} nao util
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              pct >= 50 ? "bg-green-500" : "bg-red-500"
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium w-10 text-right">
                          {pct}%
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tags Cloud */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5" />
              Tags
            </CardTitle>
            <CardDescription>
              Tags mais usadas nas FAQs
            </CardDescription>
          </CardHeader>
          <CardContent>
            {metrics.tagsCloud.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhuma tag cadastrada ainda
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {metrics.tagsCloud.map(({ tag, count }) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="text-sm px-3 py-1"
                  >
                    {tag}
                    <span className="ml-1.5 text-xs text-muted-foreground">
                      ({count})
                    </span>
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
