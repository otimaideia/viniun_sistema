import { useState, useMemo } from "react";
import { useServicosAdapter } from "@/hooks/useServicosAdapter";
import { useServicoImagensAdapter } from "@/hooks/useServicoImagensAdapter";
import { useFranqueadosAdapter } from "@/hooks/useFranqueadosAdapter";
import { usePackagesMT } from "@/hooks/multitenant/usePackagesMT";
import { useTenantContext } from "@/contexts/TenantContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Label } from "@/components/ui/label";
import { Servico } from "@/types/servico";
import { useServiceCategoriesMT } from "@/hooks/multitenant/useServiceCategoriesMT";
import { CategoryManagement } from "@/components/servicos/CategoryManagement";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Building2,
  Clock,
  LayoutGrid,
  List,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Images,
  Package,
  ShoppingBag,
  Percent,
  Calendar,
  Tag,
  Eye
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUserPermissions } from "@/hooks/multitenant/useUserPermissions";
import { toast } from "sonner";
import { Link, useNavigate } from "react-router-dom";

// Formatar duração em horas e minutos
function formatDuracao(minutos: number | null): string {
  if (!minutos) return "-";
  if (minutos < 60) return `${minutos}min`;
  const horas = Math.floor(minutos / 60);
  const mins = minutos % 60;
  return mins > 0 ? `${horas}h ${mins}min` : `${horas}h`;
}

export default function Servicos() {
  const navigate = useNavigate();
  const { accessLevel, franchise } = useTenantContext();
  const [topTab, setTopTab] = useState<"servicos" | "produtos" | "pacotes">("servicos");
  const isFranchiseAdmin = accessLevel === 'franchise';

  const {
    servicos: allServicos,
    franchiseServices: franqueadoServicos,
    isLoading,
    deleteServico,
    updateFranqueadoServicos,
  } = useServicosAdapter();

  const {
    pacotes,
    isLoading: isLoadingPacotes,
    deletePacote,
  } = usePackagesMT({ is_active: true });

  const { categories, getCategoryLabel, getCategoriesByTipo } = useServiceCategoriesMT();

  const {
    allImagens,
    isLoadingAll: isLoadingImagens,
    getImagensByServico,
  } = useServicoImagensAdapter();

  const { franqueados: allFranqueados } = useFranqueadosAdapter();
  const { hasPermission } = useUserPermissions();

  // Para franchise admin: mostrar apenas sua franquia
  const franqueados = useMemo(() => {
    if (isFranchiseAdmin && franchise) {
      return allFranqueados.filter(f => f.id === franchise.id);
    }
    return allFranqueados;
  }, [allFranqueados, isFranchiseAdmin, franchise]);

  // Filtrar por tipo baseado na tab ativa
  const servicos = useMemo(() => {
    if (topTab === "servicos") return allServicos.filter(s => !s.tipo || s.tipo === 'servico');
    if (topTab === "produtos") return allServicos.filter(s => s.tipo === 'produto');
    return allServicos;
  }, [allServicos, topTab]);

  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [showVinculosModal, setShowVinculosModal] = useState(false);
  const [deletingServico, setDeletingServico] = useState<Servico | null>(null);
  const [selectedFranqueado, setSelectedFranqueado] = useState<string | null>(null);
  const [selectedServicos, setSelectedServicos] = useState<string[]>([]);

  const filteredServicos = servicos.filter(s => {
    const matchesSearch = s.nome.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === "all" || s.categoria === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const handleOpenVinculos = (franqueadoId: string) => {
    const vinculos = franqueadoServicos.filter(v => v.franchise_id === franqueadoId);
    setSelectedServicos(vinculos.map(v => v.service_id));
    setSelectedFranqueado(franqueadoId);
    setShowVinculosModal(true);
  };

  const handleSaveVinculos = () => {
    if (selectedFranqueado) {
      updateFranqueadoServicos({ franqueadoId: selectedFranqueado, servicoIds: selectedServicos });
      setShowVinculosModal(false);
    }
  };

  const toggleServico = (servicoId: string) => {
    setSelectedServicos(prev =>
      prev.includes(servicoId)
        ? prev.filter(id => id !== servicoId)
        : [...prev, servicoId]
    );
  };

  const getServicoCount = (franqueadoId: string) => {
    return franqueadoServicos.filter(v => v.franchise_id === franqueadoId).length;
  };

  // Componente de Carousel de imagens para o card
  const ImageCarousel = ({ servicoId, imagemCapa }: { servicoId: string; imagemCapa: string | null }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const images = getImagensByServico(servicoId);

    // Se não tem imagens na galeria, usa a imagem de capa ou placeholder
    const allImages = images.length > 0
      ? images.map(img => img.url)
      : imagemCapa
        ? [imagemCapa]
        : [];

    const showNavigation = allImages.length > 1;

    const goToPrev = (e: React.MouseEvent) => {
      e.stopPropagation();
      setCurrentIndex((prev) => (prev - 1 + allImages.length) % allImages.length);
    };

    const goToNext = (e: React.MouseEvent) => {
      e.stopPropagation();
      setCurrentIndex((prev) => (prev + 1) % allImages.length);
    };

    if (allImages.length === 0) {
      return (
        <div className="flex items-center justify-center h-full bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30">
          <Sparkles className="h-12 w-12 text-purple-300 dark:text-purple-600" />
        </div>
      );
    }

    return (
      <div className="relative h-full group">
        <img
          src={allImages[currentIndex]}
          alt={`Imagem ${currentIndex + 1}`}
          className="w-full h-full object-cover transition-opacity"
          onError={(e) => {
            (e.target as HTMLImageElement).src = "https://placehold.co/400x300?text=Erro";
          }}
        />

        {/* Navegação */}
        {showNavigation && (
          <>
            <button
              onClick={goToPrev}
              className="absolute left-1 top-1/2 -translate-y-1/2 bg-black/50 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={goToNext}
              className="absolute right-1 top-1/2 -translate-y-1/2 bg-black/50 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
            >
              <ChevronRight className="h-4 w-4" />
            </button>

            {/* Indicadores */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
              {allImages.map((_, index) => (
                <button
                  key={index}
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentIndex(index);
                  }}
                  className={cn(
                    "h-1.5 rounded-full transition-all",
                    index === currentIndex
                      ? "w-4 bg-white"
                      : "w-1.5 bg-white/50 hover:bg-white/75"
                  )}
                />
              ))}
            </div>

            {/* Contador */}
            <div className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
              <Images className="h-3 w-3" />
              {currentIndex + 1}/{allImages.length}
            </div>
          </>
        )}
      </div>
    );
  };

  // Card de Serviço para visualização em galeria
  const ServicoCard = ({ servico }: { servico: Servico }) => {
    const imageCount = getImagensByServico(servico.id).length;

    return (
      <Card
        className={cn(
          "group overflow-hidden transition-all duration-200 hover:shadow-lg cursor-pointer",
          !servico.ativo && "opacity-60"
        )}
        onClick={() => navigate(`/servicos/${servico.id}`)}
      >
        {/* Imagens do Serviço (Carousel) */}
        <div className="relative h-40">
          <ImageCarousel servicoId={servico.id} imagemCapa={servico.imagem_url} />

          {/* Overlay com ações */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-200 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
            <Button
              size="icon"
              variant="secondary"
              className="h-9 w-9"
              onClick={(e) => { e.stopPropagation(); navigate(`/servicos/${servico.id}`); }}
            >
              <Eye className="h-4 w-4" />
            </Button>
            {hasPermission('servicos.edit') && (
              <Button
                size="icon"
                variant="secondary"
                className="h-9 w-9"
                onClick={(e) => { e.stopPropagation(); navigate(`/servicos/${servico.id}/editar`); }}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            )}
            {hasPermission('servicos.delete') && (
              <Button
                size="icon"
                variant="destructive"
                className="h-9 w-9"
                onClick={(e) => { e.stopPropagation(); setDeletingServico(servico); }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Badge de status */}
          {!servico.ativo && (
            <Badge variant="secondary" className="absolute top-2 right-2">
              Inativo
            </Badge>
          )}
        </div>

        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-base line-clamp-2">{servico.nome}</h3>
          </div>
          {servico.categoria && (
            <Badge variant="outline" className="w-fit text-xs">
              {getCategoryLabel(servico.categoria)}
            </Badge>
          )}
        </CardHeader>

        <CardContent className="pb-3">
          {servico.descricao && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
              {servico.descricao}
            </p>
          )}
        </CardContent>

        <CardFooter className="pt-0 border-t flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>{formatDuracao(servico.duracao_minutos)}</span>
          </div>
          {imageCount > 0 && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Images className="h-3 w-3" />
              {imageCount} {imageCount === 1 ? "foto" : "fotos"}
            </div>
          )}
        </CardFooter>
      </Card>
    );
  };

  return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Catálogo</h1>
            <p className="text-sm text-muted-foreground">
              Gerencie serviços, produtos e pacotes oferecidos
            </p>
          </div>
          <div className="flex gap-2">
            {hasPermission('servicos.create') && topTab !== 'pacotes' && (
              <Button asChild>
                <Link to={topTab === 'produtos' ? '/servicos/novo?tipo=produto' : '/servicos/novo'}>
                  <Plus className="h-4 w-4 mr-2" />
                  {topTab === 'produtos' ? 'Novo Produto' : 'Novo Serviço'}
                </Link>
              </Button>
            )}
            {hasPermission('servicos.create') && topTab === 'pacotes' && (
              <Button asChild>
                <Link to="/servicos/pacotes/novo">
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Pacote
                </Link>
              </Button>
            )}
          </div>
        </div>

        {/* Tabs de nível superior: Serviços / Produtos / Pacotes */}
        <Tabs value={topTab} onValueChange={(v) => setTopTab(v as typeof topTab)}>
          <TabsList>
            <TabsTrigger value="servicos" className="gap-2">
              <Sparkles className="h-4 w-4" />
              Serviços
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                {allServicos.filter(s => !s.tipo || s.tipo === 'servico').length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="produtos" className="gap-2">
              <ShoppingBag className="h-4 w-4" />
              Produtos
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                {allServicos.filter(s => s.tipo === 'produto').length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="pacotes" className="gap-2">
              <Package className="h-4 w-4" />
              Pacotes
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                {pacotes.length}
              </Badge>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Conteúdo da tab Pacotes */}
        {topTab === 'pacotes' && (
          <div className="space-y-4">
            {isLoadingPacotes ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-48 w-full" />)}
              </div>
            ) : pacotes.length === 0 ? (
              <Card className="p-12 text-center">
                <Package className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium mb-2">Nenhum pacote cadastrado</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Crie pacotes agrupando serviços e produtos com preço promocional
                </p>
                {hasPermission('servicos.create') && (
                  <Button onClick={() => navigate('/servicos/pacotes/novo')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Criar Primeiro Pacote
                  </Button>
                )}
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {pacotes.map((pkg) => {
                  const itemCount = pkg.items?.length || 0;
                  const isVigente = (!pkg.data_inicio || new Date(pkg.data_inicio) <= new Date()) &&
                                    (!pkg.data_fim || new Date(pkg.data_fim) >= new Date());
                  const desconto = pkg.desconto_percentual || (pkg.preco_original > 0
                    ? Math.round((1 - pkg.preco_pacote / pkg.preco_original) * 100)
                    : 0);

                  return (
                    <Card
                      key={pkg.id}
                      className={cn(
                        "group cursor-pointer hover:shadow-lg transition-all",
                        !isVigente && "opacity-60"
                      )}
                      onClick={() => navigate(`/servicos/pacotes/${pkg.id}`)}
                    >
                      {/* Imagem ou placeholder */}
                      <div className="relative h-32 bg-gradient-to-br from-violet-100 to-purple-100 dark:from-violet-900/30 dark:to-purple-900/30">
                        {pkg.imagem_url ? (
                          <img src={pkg.imagem_url} alt={pkg.nome} className="w-full h-full object-cover" />
                        ) : (
                          <div className="flex items-center justify-center h-full">
                            <Package className="h-10 w-10 text-violet-300 dark:text-violet-600" />
                          </div>
                        )}
                        {/* Badge de desconto */}
                        {desconto > 0 && (
                          <Badge className="absolute top-2 right-2 bg-green-600 text-white gap-1">
                            <Percent className="h-3 w-3" />
                            -{desconto}%
                          </Badge>
                        )}
                        {pkg.is_promocional && (
                          <Badge className="absolute top-2 left-2 bg-amber-500 text-white">
                            Promoção
                          </Badge>
                        )}
                      </div>

                      <CardHeader className="pb-2">
                        <h3 className="font-semibold text-base line-clamp-1">{pkg.nome}</h3>
                        {pkg.categoria && (
                          <Badge variant="outline" className="w-fit text-xs">{pkg.categoria}</Badge>
                        )}
                      </CardHeader>

                      <CardContent className="pb-2">
                        {pkg.descricao && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{pkg.descricao}</p>
                        )}
                        <div className="flex items-center gap-2">
                          <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">{itemCount} {itemCount === 1 ? 'item' : 'itens'}</span>
                        </div>
                      </CardContent>

                      <CardFooter className="pt-0 border-t flex items-center justify-between">
                        <div>
                          {pkg.preco_original > 0 && pkg.preco_original !== pkg.preco_pacote && (
                            <span className="text-xs text-muted-foreground line-through mr-2">
                              R$ {pkg.preco_original.toFixed(2)}
                            </span>
                          )}
                          <span className="text-sm font-bold text-green-600">
                            R$ {pkg.preco_pacote.toFixed(2)}
                          </span>
                        </div>
                        {pkg.data_fim && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            até {new Date(pkg.data_fim).toLocaleDateString('pt-BR')}
                          </div>
                        )}
                      </CardFooter>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Conteúdo das tabs Serviços e Produtos */}
        {isLoading || isLoadingImagens ? (
          <div className="space-y-4">
            <Skeleton className="h-10 w-full max-w-sm" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <Skeleton key={i} className="h-64 w-full" />
              ))}
            </div>
          </div>
        ) : topTab !== 'pacotes' ? (
          <Tabs defaultValue="galeria" className="space-y-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <TabsList>
                <TabsTrigger value="galeria" className="gap-2">
                  <LayoutGrid className="h-4 w-4" />
                  Galeria
                </TabsTrigger>
                {!isFranchiseAdmin && (
                  <TabsTrigger value="franquias" className="gap-2">
                    <Building2 className="h-4 w-4" />
                    Por Franquia
                  </TabsTrigger>
                )}
              </TabsList>

              {/* Filtros */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar serviços..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 w-full sm:w-64"
                  />
                </div>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="Categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as categorias</SelectItem>
                    {getCategoriesByTipo(topTab === 'produtos' ? 'produto' : 'servico').map((cat) => (
                      <SelectItem key={cat.codigo} value={cat.codigo}>
                        <span className="flex items-center gap-2">
                          {cat.cor && <span className="h-2 w-2 rounded-full" style={{ backgroundColor: cat.cor }} />}
                          {cat.nome}
                        </span>
                      </SelectItem>
                    ))}
                    <SelectItem value="sem_categoria">Sem categoria</SelectItem>
                  </SelectContent>
                </Select>
                {!isFranchiseAdmin && (
                  <CategoryManagement />
                )}
                <div className="flex border rounded-lg">
                  <Button
                    variant={viewMode === "grid" ? "secondary" : "ghost"}
                    size="icon"
                    className="rounded-r-none"
                    onClick={() => setViewMode("grid")}
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === "list" ? "secondary" : "ghost"}
                    size="icon"
                    className="rounded-l-none"
                    onClick={() => setViewMode("list")}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Galeria de Serviços */}
            <TabsContent value="galeria" className="space-y-6">
              {viewMode === "grid" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredServicos.map((servico) => (
                    <ServicoCard key={servico.id} servico={servico} />
                  ))}
                  {filteredServicos.length === 0 && (
                    <div className="col-span-full py-12 text-center text-muted-foreground">
                      Nenhum serviço encontrado
                    </div>
                  )}
                </div>
              ) : (
                // Visualização em Lista
                <div className="rounded-xl border border-border bg-card overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-muted/50">
                        <th className="text-left p-3 font-medium">Imagens</th>
                        <th className="text-left p-3 font-medium">Nome</th>
                        <th className="text-left p-3 font-medium hidden md:table-cell">Categoria</th>
                        <th className="text-left p-3 font-medium hidden lg:table-cell">Descrição</th>
                        <th className="text-left p-3 font-medium">Duração</th>
                        <th className="text-left p-3 font-medium">Status</th>
                        <th className="text-right p-3 font-medium">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredServicos.map((servico) => {
                        const imageCount = getImagensByServico(servico.id).length;
                        return (
                          <tr key={servico.id} className="border-t">
                            <td className="p-3">
                              <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 overflow-hidden relative">
                                {servico.imagem_url ? (
                                  <img
                                    src={servico.imagem_url}
                                    alt={servico.nome}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="flex items-center justify-center h-full">
                                    <Sparkles className="h-5 w-5 text-purple-300" />
                                  </div>
                                )}
                                {imageCount > 1 && (
                                  <div className="absolute bottom-0 right-0 bg-black/70 text-white text-[10px] px-1 rounded-tl">
                                    +{imageCount - 1}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="p-3 font-medium">{servico.nome}</td>
                            <td className="p-3 hidden md:table-cell">
                              {servico.categoria ? (
                                <Badge variant="outline">
                                  {getCategoryLabel(servico.categoria)}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </td>
                            <td className="p-3 hidden lg:table-cell text-muted-foreground">
                              <span className="line-clamp-1">{servico.descricao || "-"}</span>
                            </td>
                            <td className="p-3">
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <Clock className="h-4 w-4" />
                                {formatDuracao(servico.duracao_minutos)}
                              </div>
                            </td>
                            <td className="p-3">
                              <Badge variant={servico.ativo ? "default" : "secondary"}>
                                {servico.ativo ? "Ativo" : "Inativo"}
                              </Badge>
                            </td>
                            <td className="p-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  asChild
                                >
                                  <Link to={`/servicos/${servico.id}`}>
                                    <Eye className="h-4 w-4" />
                                  </Link>
                                </Button>
                                {hasPermission('servicos.edit') && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    asChild
                                  >
                                    <Link to={`/servicos/${servico.id}/editar`}>
                                      <Pencil className="h-4 w-4" />
                                    </Link>
                                  </Button>
                                )}
                                {hasPermission('servicos.delete') && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-destructive hover:text-destructive"
                                    onClick={() => setDeletingServico(servico)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {filteredServicos.length === 0 && (
                        <tr>
                          <td colSpan={7} className="text-center text-muted-foreground py-8">
                            Nenhum serviço encontrado
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Estatísticas Rápidas */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="p-4">
                  <div className="text-2xl font-bold text-purple-600">{servicos.length}</div>
                  <div className="text-sm text-muted-foreground">
                    Total de {topTab === 'produtos' ? 'Produtos' : 'Serviços'}
                  </div>
                </Card>
                <Card className="p-4">
                  <div className="text-2xl font-bold text-green-600">{servicos.filter(s => s.ativo).length}</div>
                  <div className="text-sm text-muted-foreground">Ativos</div>
                </Card>
                <Card className="p-4">
                  <div className="text-2xl font-bold text-blue-600">
                    {topTab === 'produtos'
                      ? servicos.filter(s => s.preco).length
                      : servicos.filter(s => s.duracao_minutos).length
                    }
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {topTab === 'produtos' ? 'Com Preço' : 'Com Duração'}
                  </div>
                </Card>
                <Card className="p-4">
                  <div className="text-2xl font-bold text-pink-600">
                    {allImagens.length}
                  </div>
                  <div className="text-sm text-muted-foreground">Imagens na Galeria</div>
                </Card>
              </div>
            </TabsContent>

            {/* Franquias e Vínculos */}
            <TabsContent value="franquias" className="space-y-4">
              <Accordion type="single" collapsible className="border rounded-lg">
                {franqueados.map((franqueado) => (
                  <AccordionItem key={franqueado.id} value={franqueado.id}>
                    <AccordionTrigger className="px-4 hover:no-underline">
                      <div className="flex items-center gap-3">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span>{franqueado.nome_fantasia}</span>
                        <Badge variant="outline" className="ml-2">
                          {getServicoCount(franqueado.id)} serviços
                        </Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4">
                      <div className="flex flex-wrap gap-2 mb-3">
                        {franqueadoServicos
                          .filter(v => v.franchise_id === franqueado.id)
                          .map(v => {
                            const servico = allServicos.find(s => s.id === v.service_id);
                            return servico ? (
                              <Badge key={v.id} variant="secondary" className="gap-1">
                                {servico.nome}
                                {servico.duracao_minutos && (
                                  <span className="text-xs opacity-70">
                                    ({formatDuracao(servico.duracao_minutos)})
                                  </span>
                                )}
                              </Badge>
                            ) : null;
                          })}
                        {getServicoCount(franqueado.id) === 0 && (
                          <span className="text-sm text-muted-foreground">
                            Nenhum serviço vinculado
                          </span>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenVinculos(franqueado.id)}
                      >
                        Gerenciar Serviços
                      </Button>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </TabsContent>
          </Tabs>
        ) : null}

        {/* Vinculos Modal */}
        <Dialog open={showVinculosModal} onOpenChange={setShowVinculosModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Gerenciar Serviços da Franquia</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {servicos.filter(s => s.ativo).map((servico) => (
                <div key={servico.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id={`vinculo-${servico.id}`}
                      checked={selectedServicos.includes(servico.id)}
                      onCheckedChange={() => toggleServico(servico.id)}
                    />
                    <Label htmlFor={`vinculo-${servico.id}`} className="cursor-pointer flex-1">
                      <span>{servico.nome}</span>
                      {servico.duracao_minutos && (
                        <span className="text-xs text-muted-foreground ml-2">
                          ({formatDuracao(servico.duracao_minutos)})
                        </span>
                      )}
                    </Label>
                  </div>
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowVinculosModal(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveVinculos}>
                Salvar Vínculos
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={!!deletingServico} onOpenChange={(open) => !open && setDeletingServico(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir o serviço "{deletingServico?.nome}"?
                Isso também removerá todos os vínculos com franquias e todas as imagens da galeria.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (deletingServico) {
                    if (!hasPermission('servicos.delete')) {
                      toast.error('Você não tem permissão para excluir serviços');
                      setDeletingServico(null);
                      return;
                    }
                    deleteServico(deletingServico.id);
                    setDeletingServico(null);
                  }
                }}
                className="bg-destructive hover:bg-destructive/90"
              >
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
  );
}
