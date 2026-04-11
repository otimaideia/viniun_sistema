import { useState, useEffect, useMemo } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search,
  MapPin,
  BedDouble,
  Car,
  Home,
  Star,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  ArrowUpDown,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(value: number | null | undefined): string {
  if (!value) return "-";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);
}

type SortOption = "recentes" | "menor_valor" | "maior_valor";

const PAGE_SIZE = 20;

// ---------------------------------------------------------------------------
// PropertySearchCard (inline component)
// ---------------------------------------------------------------------------

interface SearchPropertyCardProps {
  property: any;
}

function PropertySearchCard({ property }: SearchPropertyCardProps) {
  const price = property.valor_venda || property.valor_locacao;
  const tipo = property.tipo?.nome || "";
  const cidade = property.cidade?.nome || "";
  const bairro = property.bairro?.nome || "";
  const foto =
    property.foto_destaque_url ||
    property.mt_property_photos?.[0]?.url ||
    null;

  const slug = property.slug || property.id;

  return (
    <Link to={`/imovel/${slug}`} className="block group">
      <Card className="overflow-hidden hover:shadow-lg transition-shadow h-full">
        {/* Photo */}
        <div className="relative h-52 bg-muted">
          {foto ? (
            <img
              src={foto}
              alt={property.titulo || "Imovel"}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Home className="h-14 w-14 text-muted-foreground/30" />
            </div>
          )}
          {property.destaque && (
            <div className="absolute top-2 left-2 bg-yellow-500 text-white text-xs font-semibold px-2 py-0.5 rounded flex items-center gap-1">
              <Star className="h-3 w-3" /> Destaque
            </div>
          )}
          {tipo && (
            <Badge
              variant="secondary"
              className="absolute bottom-2 left-2 bg-white/90 text-foreground"
            >
              {tipo}
            </Badge>
          )}
        </div>

        {/* Content */}
        <CardContent className="p-4 space-y-2">
          <h3 className="font-semibold text-sm line-clamp-2 min-h-[2.5rem]">
            {property.titulo || "Imovel sem titulo"}
          </h3>

          {(bairro || cidade) && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">
                {[bairro, cidade].filter(Boolean).join(", ")}
              </span>
            </div>
          )}

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {property.dormitorios != null && property.dormitorios > 0 && (
              <span className="flex items-center gap-1">
                <BedDouble className="h-3 w-3" /> {property.dormitorios} quartos
              </span>
            )}
            {property.garagens != null && property.garagens > 0 && (
              <span className="flex items-center gap-1">
                <Car className="h-3 w-3" /> {property.garagens} vagas
              </span>
            )}
          </div>

          {property.ref_code && (
            <p className="text-[11px] text-muted-foreground">
              Ref: {property.ref_code}
            </p>
          )}

          <p className="font-bold text-primary text-base pt-1">
            {formatCurrency(price)}
            {property.valor_locacao && !property.valor_venda && (
              <span className="text-xs font-normal text-muted-foreground">
                /mes
              </span>
            )}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// BuscaImoveis (main page)
// ---------------------------------------------------------------------------

export default function BuscaImoveis() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Filters from URL
  const [tipo, setTipo] = useState(searchParams.get("tipo") || "all");
  const [finalidade, setFinalidade] = useState(
    searchParams.get("finalidade") || "all"
  );
  const [cidade, setCidade] = useState(searchParams.get("cidade") || "all");
  const [bairro, setBairro] = useState(searchParams.get("bairro") || "all");
  const [dormitorios, setDormitorios] = useState(
    searchParams.get("dormitorios") || "all"
  );
  const [valorMax, setValorMax] = useState(
    searchParams.get("valor_max") || ""
  );
  const [sort, setSort] = useState<SortOption>(
    (searchParams.get("ordem") as SortOption) || "recentes"
  );
  const [page, setPage] = useState(
    parseInt(searchParams.get("pagina") || "0", 10)
  );
  const [filtersOpen, setFiltersOpen] = useState(true);

  // Detect tenant from URL or default
  const tenantSlug = searchParams.get("tenant") || null;

  // ---- Lookup options (public, no auth) ----

  const { data: tipos = [] } = useQuery({
    queryKey: ["pub-property-types", tenantSlug],
    queryFn: async () => {
      let q = supabase
        .from("mt_property_types" as any)
        .select("id, nome")
        .is("deleted_at", null)
        .order("nome");
      if (tenantSlug) {
        const { data: t } = await supabase
          .from("mt_tenants" as any)
          .select("id")
          .eq("slug", tenantSlug)
          .single();
        if (t) q = q.eq("tenant_id", t.id);
      }
      const { data } = await q;
      return (data || []) as { id: string; nome: string }[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: finalidades = [] } = useQuery({
    queryKey: ["pub-property-purposes", tenantSlug],
    queryFn: async () => {
      let q = supabase
        .from("mt_property_purposes" as any)
        .select("id, nome")
        .is("deleted_at", null)
        .order("nome");
      if (tenantSlug) {
        const { data: t } = await supabase
          .from("mt_tenants" as any)
          .select("id")
          .eq("slug", tenantSlug)
          .single();
        if (t) q = q.eq("tenant_id", t.id);
      }
      const { data } = await q;
      return (data || []) as { id: string; nome: string }[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: cidades = [] } = useQuery({
    queryKey: ["pub-locations-cidades", tenantSlug],
    queryFn: async () => {
      let q = supabase
        .from("mt_locations" as any)
        .select("id, nome")
        .eq("tipo", "cidade")
        .is("deleted_at", null)
        .order("nome");
      if (tenantSlug) {
        const { data: t } = await supabase
          .from("mt_tenants" as any)
          .select("id")
          .eq("slug", tenantSlug)
          .single();
        if (t) q = q.eq("tenant_id", t.id);
      }
      const { data } = await q;
      return (data || []) as { id: string; nome: string }[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: bairros = [] } = useQuery({
    queryKey: ["pub-locations-bairros", tenantSlug, cidade],
    queryFn: async () => {
      let q = supabase
        .from("mt_locations" as any)
        .select("id, nome")
        .eq("tipo", "bairro")
        .is("deleted_at", null)
        .order("nome");
      if (cidade !== "all") {
        q = q.eq("parent_id", cidade);
      }
      if (tenantSlug) {
        const { data: t } = await supabase
          .from("mt_tenants" as any)
          .select("id")
          .eq("slug", tenantSlug)
          .single();
        if (t) q = q.eq("tenant_id", t.id);
      }
      const { data } = await q;
      return (data || []) as { id: string; nome: string }[];
    },
    staleTime: 5 * 60 * 1000,
  });

  // ---- Main property query ----

  const {
    data: result,
    isLoading,
    isFetching,
  } = useQuery({
    queryKey: [
      "pub-busca-imoveis",
      tipo,
      finalidade,
      cidade,
      bairro,
      dormitorios,
      valorMax,
      sort,
      page,
      tenantSlug,
    ],
    queryFn: async () => {
      let q = supabase
        .from("mt_properties" as any)
        .select(
          `*, tipo:mt_property_types!property_type_id(id, nome), finalidade:mt_property_purposes!purpose_id(id, nome), cidade:mt_locations!location_cidade_id(id, nome), bairro:mt_locations!location_bairro_id(id, nome), mt_property_photos(url, thumbnail_url)`,
          { count: "exact" }
        )
        .is("deleted_at", null)
        .eq("situacao", "disponivel");

      // Tenant filter
      if (tenantSlug) {
        const { data: t } = await supabase
          .from("mt_tenants" as any)
          .select("id")
          .eq("slug", tenantSlug)
          .single();
        if (t) q = q.eq("tenant_id", t.id);
      }

      // Apply filters
      if (tipo !== "all") q = q.eq("property_type_id", tipo);
      if (finalidade !== "all") q = q.eq("purpose_id", finalidade);
      if (cidade !== "all") q = q.eq("location_cidade_id", cidade);
      if (bairro !== "all") q = q.eq("location_bairro_id", bairro);
      if (dormitorios !== "all")
        q = q.gte("dormitorios", parseInt(dormitorios));
      if (valorMax)
        q = q.lte("valor_venda", parseFloat(valorMax));

      // Sort
      if (sort === "menor_valor") {
        q = q.order("valor_venda", { ascending: true, nullsFirst: false });
      } else if (sort === "maior_valor") {
        q = q.order("valor_venda", { ascending: false });
      } else {
        q = q.order("created_at", { ascending: false });
      }

      // Pagination
      q = q.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      const { data, error, count } = await q;
      if (error) throw error;
      return { items: data || [], total: count || 0 };
    },
    staleTime: 30 * 1000,
  });

  const properties = result?.items || [];
  const totalCount = result?.total || 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  // ---- Sync URL params ----

  useEffect(() => {
    const params: Record<string, string> = {};
    if (tipo !== "all") params.tipo = tipo;
    if (finalidade !== "all") params.finalidade = finalidade;
    if (cidade !== "all") params.cidade = cidade;
    if (bairro !== "all") params.bairro = bairro;
    if (dormitorios !== "all") params.dormitorios = dormitorios;
    if (valorMax) params.valor_max = valorMax;
    if (sort !== "recentes") params.ordem = sort;
    if (page > 0) params.pagina = String(page);
    if (tenantSlug) params.tenant = tenantSlug;
    setSearchParams(params, { replace: true });
  }, [
    tipo,
    finalidade,
    cidade,
    bairro,
    dormitorios,
    valorMax,
    sort,
    page,
    tenantSlug,
    setSearchParams,
  ]);

  // ---- Dynamic SEO ----

  useEffect(() => {
    const parts: string[] = [];
    const tipoNome = tipos.find((t) => t.id === tipo)?.nome;
    const finalidadeNome = finalidades.find((f) => f.id === finalidade)?.nome;
    const cidadeNome = cidades.find((c) => c.id === cidade)?.nome;

    if (tipoNome) parts.push(`${tipoNome}s`);
    else parts.push("Imoveis");

    if (finalidadeNome) parts.push(`para ${finalidadeNome}`);
    if (cidadeNome) parts.push(`em ${cidadeNome}`);

    document.title = `${parts.join(" ")} | Busca de Imoveis`;

    // Meta description
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement("meta");
      metaDesc.setAttribute("name", "description");
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute(
      "content",
      `Encontre ${parts.join(" ").toLowerCase()}. ${totalCount} imoveis disponiveis.`
    );

    return () => {
      document.title = "Viniun";
    };
  }, [tipo, finalidade, cidade, tipos, finalidades, cidades, totalCount]);

  // ---- Breadcrumb labels ----

  const breadcrumbParts = useMemo(() => {
    const parts: { label: string; href?: string }[] = [
      { label: "Home", href: "/" },
      { label: "Busca" },
    ];
    const tipoNome = tipos.find((t) => t.id === tipo)?.nome;
    const cidadeNome = cidades.find((c) => c.id === cidade)?.nome;
    if (tipoNome) parts.push({ label: tipoNome });
    if (cidadeNome) parts.push({ label: cidadeNome });
    return parts;
  }, [tipo, cidade, tipos, cidades]);

  const handleSearch = () => {
    setPage(0);
  };

  const handleClearFilters = () => {
    setTipo("all");
    setFinalidade("all");
    setCidade("all");
    setBairro("all");
    setDormitorios("all");
    setValorMax("");
    setSort("recentes");
    setPage(0);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header bar */}
      <header className="border-b bg-white sticky top-0 z-30">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="text-xl font-bold text-primary">
            Viniun Imoveis
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="outline" size="sm">
                Entrar
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1 text-sm text-muted-foreground">
          {breadcrumbParts.map((part, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && <span>/</span>}
              {part.href ? (
                <Link
                  to={part.href}
                  className="hover:text-primary transition-colors"
                >
                  {part.label}
                </Link>
              ) : (
                <span className={i === breadcrumbParts.length - 1 ? "text-foreground font-medium" : ""}>
                  {part.label}
                </span>
              )}
            </span>
          ))}
        </nav>

        {/* Search filters */}
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={() => setFiltersOpen(!filtersOpen)}
                className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors"
              >
                <SlidersHorizontal className="h-4 w-4" />
                Filtros de Busca
              </button>
              {(tipo !== "all" ||
                finalidade !== "all" ||
                cidade !== "all" ||
                bairro !== "all" ||
                dormitorios !== "all" ||
                valorMax) && (
                <button
                  onClick={handleClearFilters}
                  className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                >
                  Limpar filtros
                </button>
              )}
            </div>

            {filtersOpen && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                {/* Tipo */}
                <div className="space-y-1">
                  <Label className="text-xs">Tipo</Label>
                  <Select value={tipo} onValueChange={(v) => { setTipo(v); setPage(0); }}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {tipos.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Finalidade */}
                <div className="space-y-1">
                  <Label className="text-xs">Finalidade</Label>
                  <Select value={finalidade} onValueChange={(v) => { setFinalidade(v); setPage(0); }}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Todas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      {finalidades.map((f) => (
                        <SelectItem key={f.id} value={f.id}>
                          {f.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Cidade */}
                <div className="space-y-1">
                  <Label className="text-xs">Cidade</Label>
                  <Select
                    value={cidade}
                    onValueChange={(v) => {
                      setCidade(v);
                      setBairro("all");
                      setPage(0);
                    }}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Todas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      {cidades.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Bairro */}
                <div className="space-y-1">
                  <Label className="text-xs">Bairro</Label>
                  <Select value={bairro} onValueChange={(v) => { setBairro(v); setPage(0); }}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {bairros.map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Dormitorios */}
                <div className="space-y-1">
                  <Label className="text-xs">Dormitorios</Label>
                  <Select value={dormitorios} onValueChange={(v) => { setDormitorios(v); setPage(0); }}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="1">1+</SelectItem>
                      <SelectItem value="2">2+</SelectItem>
                      <SelectItem value="3">3+</SelectItem>
                      <SelectItem value="4">4+</SelectItem>
                      <SelectItem value="5">5+</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Valor Max */}
                <div className="space-y-1">
                  <Label className="text-xs">Valor Max</Label>
                  <Input
                    type="number"
                    placeholder="R$ maximo"
                    className="h-9"
                    value={valorMax}
                    onChange={(e) => setValorMax(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Results header */}
        <div className="flex items-center justify-between">
          <div>
            {isLoading ? (
              <Skeleton className="h-5 w-48" />
            ) : (
              <p className="text-sm text-muted-foreground">
                {totalCount === 0
                  ? "Nenhum imovel encontrado para esta busca"
                  : `Encontramos ${totalCount} ${totalCount === 1 ? "imovel" : "imoveis"} para sua busca`}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
            <Select
              value={sort}
              onValueChange={(v) => {
                setSort(v as SortOption);
                setPage(0);
              }}
            >
              <SelectTrigger className="h-8 w-[160px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recentes">Mais Recentes</SelectItem>
                <SelectItem value="menor_valor">Menor Valor</SelectItem>
                <SelectItem value="maior_valor">Maior Valor</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Results grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="h-52 w-full rounded-lg" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-5 w-1/3" />
              </div>
            ))}
          </div>
        ) : properties.length === 0 ? (
          <div className="text-center py-20">
            <Home className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-medium mb-2">
              Nenhum imovel encontrado
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Tente ajustar os filtros para encontrar mais resultados.
            </p>
            <Button variant="outline" onClick={handleClearFilters}>
              Limpar filtros
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {properties.map((property: any) => (
              <PropertySearchCard key={property.id} property={property} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-6 pb-8">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 7) {
                  pageNum = i;
                } else if (page < 3) {
                  pageNum = i;
                } else if (page > totalPages - 4) {
                  pageNum = totalPages - 7 + i;
                } else {
                  pageNum = page - 3 + i;
                }
                return (
                  <Button
                    key={pageNum}
                    variant={pageNum === page ? "default" : "outline"}
                    size="sm"
                    className="w-8 h-8 p-0"
                    onClick={() => setPage(pageNum)}
                  >
                    {pageNum + 1}
                  </Button>
                );
              })}
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
            >
              Proxima <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t bg-muted/50 py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>Viniun - Plataforma de Gestao Imobiliaria</p>
        </div>
      </footer>
    </div>
  );
}
