import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTenantContext } from "@/contexts/TenantContext";
import { useFAQsMT } from "@/hooks/multitenant/useFAQsMT";
import { useFAQCategoriesMT } from "@/hooks/multitenant/useFAQCategoriesMT";
import { useDepartments } from "@/hooks/multitenant/useDepartments";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Plus,
  HelpCircle,
  ThumbsUp,
  ThumbsDown,
  Eye,
  Pin,
  FileText,
  Loader2,
} from "lucide-react";
import type { FAQFilters } from "@/types/faq";

export default function FAQList() {
  const navigate = useNavigate();
  const { tenant, accessLevel } = useTenantContext();

  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [departmentFilter, setDepartmentFilter] = useState<string>("");

  const filters: FAQFilters = useMemo(() => {
    const f: FAQFilters = { is_published: true };
    if (searchTerm.trim()) f.search = searchTerm.trim();
    if (categoryFilter) f.category_id = categoryFilter;
    if (departmentFilter) f.department_id = departmentFilter;
    return f;
  }, [searchTerm, categoryFilter, departmentFilter]);

  const { data: faqs, isLoading, voteHelpful } = useFAQsMT(filters);
  const { categories } = useFAQCategoriesMT();
  const { departments } = useDepartments();

  const handleVote = (faq_id: string, is_helpful: boolean) => {
    voteHelpful.mutate({ faq_id, is_helpful });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const pinnedFaqs = faqs?.filter((f) => f.is_pinned) || [];
  const regularFaqs = faqs?.filter((f) => !f.is_pinned) || [];
  const allSorted = [...pinnedFaqs, ...regularFaqs];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <HelpCircle className="h-6 w-6" />
            Perguntas Frequentes (FAQ)
          </h1>
          <p className="text-muted-foreground">
            Encontre respostas para as duvidas mais comuns
            {tenant && (
              <span className="ml-1">- {tenant.nome_fantasia}</span>
            )}
          </p>
        </div>
        {(accessLevel === "platform" || accessLevel === "tenant") && (
          <Button asChild>
            <Link to="/processos/faq/novo">
              <Plus className="h-4 w-4 mr-2" />
              Nova FAQ
            </Link>
          </Button>
        )}
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar perguntas ou respostas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select
              value={categoryFilter || "__all__"}
              onValueChange={(v) => setCategoryFilter(v === "__all__" ? "" : v)}
            >
              <SelectTrigger className="w-full md:w-[220px]">
                <SelectValue placeholder="Todas as categorias" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todas as categorias</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={departmentFilter || "__all__"}
              onValueChange={(v) =>
                setDepartmentFilter(v === "__all__" ? "" : v)
              }
            >
              <SelectTrigger className="w-full md:w-[220px]">
                <SelectValue placeholder="Todos os departamentos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todos os departamentos</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id}>
                    {dept.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Results Count */}
      <p className="text-sm text-muted-foreground">
        {allSorted.length} pergunta{allSorted.length !== 1 ? "s" : ""}{" "}
        encontrada{allSorted.length !== 1 ? "s" : ""}
      </p>

      {/* FAQ Accordion List */}
      {allSorted.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <HelpCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">Nenhuma FAQ encontrada</p>
            <p className="text-sm text-muted-foreground">
              Tente ajustar os filtros ou criar uma nova pergunta
            </p>
          </CardContent>
        </Card>
      ) : (
        <Accordion type="multiple" className="space-y-3">
          {allSorted.map((faq) => (
            <AccordionItem
              key={faq.id}
              value={faq.id}
              className="border rounded-lg px-4 bg-card"
            >
              <AccordionTrigger className="hover:no-underline py-4">
                <div className="flex flex-1 items-start gap-3 text-left">
                  {faq.is_pinned && (
                    <Pin className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                  )}
                  <div className="flex-1 space-y-1.5">
                    <span className="font-semibold text-base leading-tight">
                      {faq.pergunta}
                    </span>
                    <div className="flex flex-wrap items-center gap-2">
                      {faq.category && (
                        <Badge
                          variant="secondary"
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
                      {faq.tags?.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Eye className="h-3 w-3" />
                        {faq.views_count || 0}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <ThumbsUp className="h-3 w-3" />
                        {faq.helpful_count || 0}
                      </span>
                    </div>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-4">
                <div className="space-y-4 pt-2">
                  {/* Answer */}
                  <div className="text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">
                    {faq.resposta}
                  </div>

                  {/* Linked SOP */}
                  {faq.sop && (
                    <Link
                      to={`/processos/sop/${faq.sop.id}`}
                      className="flex items-center gap-2 text-sm text-primary hover:underline"
                    >
                      <FileText className="h-4 w-4" />
                      POP vinculado: {faq.sop.codigo} - {faq.sop.titulo}
                    </Link>
                  )}

                  {/* Vote and Actions */}
                  <div className="flex items-center justify-between border-t pt-3">
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground">
                        Foi util?
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleVote(faq.id, true)}
                        disabled={voteHelpful.isPending}
                      >
                        <ThumbsUp className="h-3.5 w-3.5 mr-1" />
                        Sim ({faq.helpful_count || 0})
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleVote(faq.id, false)}
                        disabled={voteHelpful.isPending}
                      >
                        <ThumbsDown className="h-3.5 w-3.5 mr-1" />
                        Nao ({faq.not_helpful_count || 0})
                      </Button>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/processos/faq/${faq.id}`)}
                    >
                      Ver detalhes
                    </Button>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}
    </div>
  );
}
