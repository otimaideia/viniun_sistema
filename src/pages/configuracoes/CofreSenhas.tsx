import { useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTenantContext } from "@/contexts/TenantContext";
import { usePasswordVaultMT, usePasswordVaultFoldersMT } from "@/hooks/multitenant/usePasswordVaultMT";
import { VAULT_CATEGORIES, type VaultCategory, type VaultFilters } from "@/types/password-vault";
import { copyToClipboard } from "@/lib/password-generator";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  KeyRound,
  Plus,
  Search,
  MoreHorizontal,
  Eye,
  Pencil,
  Trash2,
  Copy,
  Star,
  StarOff,
  Shield,
  AlertTriangle,
  ArrowLeft,
  Folder,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

const CofreSenhas = () => {
  const navigate = useNavigate();
  const { accessLevel } = useTenantContext();

  // Filters state
  const [search, setSearch] = useState("");
  const [categoriaFilter, setCategoriaFilter] = useState<string>("all");
  const [folderFilter, setFolderFilter] = useState<string>("all");
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [showExpiringSoon, setShowExpiringSoon] = useState(false);

  // Delete confirmation
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Reveal state
  const [revealedValues, setRevealedValues] = useState<Record<string, string>>({});
  const [revealingId, setRevealingId] = useState<string | null>(null);

  // Build filters
  const filters: VaultFilters = {
    search: search || undefined,
    categoria: categoriaFilter !== "all" ? (categoriaFilter as VaultCategory) : undefined,
    folder_id: folderFilter === "none" ? null : folderFilter !== "all" ? folderFilter : undefined,
    is_favorite: showFavoritesOnly || undefined,
    expires_soon: showExpiringSoon || undefined,
  };

  const { entries, isLoading, stats, refetch, deleteEntry, toggleFavorite, revealValue } =
    usePasswordVaultMT(filters);
  const { folders } = usePasswordVaultFoldersMT();

  // Handle reveal
  const handleReveal = useCallback(async (entryId: string) => {
    if (revealedValues[entryId]) {
      // Hide if already revealed
      setRevealedValues((prev) => {
        const next = { ...prev };
        delete next[entryId];
        return next;
      });
      return;
    }

    setRevealingId(entryId);
    try {
      const value = await revealValue(entryId);
      setRevealedValues((prev) => ({ ...prev, [entryId]: value }));

      // Auto-hide after 30 seconds
      setTimeout(() => {
        setRevealedValues((prev) => {
          const next = { ...prev };
          delete next[entryId];
          return next;
        });
      }, 30_000);
    } catch {
      // Error handled by hook
    } finally {
      setRevealingId(null);
    }
  }, [revealedValues, revealValue]);

  // Handle copy
  const handleCopy = useCallback(async (entryId: string) => {
    try {
      let value = revealedValues[entryId];
      if (!value) {
        value = await revealValue(entryId);
      }
      await copyToClipboard(value);
      toast.success("Copiado! Limpo da area de transferencia em 30s");
    } catch {
      // Error handled by hook
    }
  }, [revealedValues, revealValue]);

  // Handle delete
  const handleDelete = async () => {
    if (!deleteId) return;
    await deleteEntry(deleteId);
    setDeleteId(null);
  };

  const getCategoryBadge = (categoria: VaultCategory) => {
    const cat = VAULT_CATEGORIES[categoria];
    return (
      <Badge
        variant="outline"
        style={{ borderColor: cat.color, color: cat.color }}
      >
        {cat.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/configuracoes")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <KeyRound className="h-6 w-6 text-red-600" />
              Cofre de Senhas
            </h1>
            <p className="text-muted-foreground text-sm">
              Gerencie credenciais, chaves de API e tokens com seguranca
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button asChild>
            <Link to="/configuracoes/cofre-senhas/novo">
              <Plus className="h-4 w-4 mr-2" /> Nova Credencial
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Favoritos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-yellow-500">{stats.favorites}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" /> Expirando
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-orange-500">{stats.expiringSoon}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <Shield className="h-3 w-3" /> Expirados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-500">{stats.expired}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={categoriaFilter} onValueChange={setCategoriaFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as categorias</SelectItem>
                {Object.entries(VAULT_CATEGORIES).map(([key, cat]) => (
                  <SelectItem key={key} value={key}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={folderFilter} onValueChange={setFolderFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Pasta" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as pastas</SelectItem>
                <SelectItem value="none">Sem pasta</SelectItem>
                {folders.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    <span className="flex items-center gap-1">
                      <Folder className="h-3 w-3" style={{ color: f.cor }} />
                      {f.nome}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant={showFavoritesOnly ? "default" : "outline"}
              size="icon"
              onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
              title="Apenas favoritos"
            >
              <Star className="h-4 w-4" />
            </Button>

            <Button
              variant={showExpiringSoon ? "destructive" : "outline"}
              size="sm"
              onClick={() => setShowExpiringSoon(!showExpiringSoon)}
            >
              <AlertTriangle className="h-4 w-4 mr-1" />
              Expirando
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Carregando...</div>
          ) : entries.length === 0 ? (
            <div className="p-8 text-center">
              <KeyRound className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
              <p className="text-muted-foreground">Nenhuma credencial encontrada</p>
              <Button asChild className="mt-4">
                <Link to="/configuracoes/cofre-senhas/novo">
                  <Plus className="h-4 w-4 mr-2" /> Adicionar primeira credencial
                </Link>
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Expiracao</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => {
                  const isRevealed = !!revealedValues[entry.id];
                  const isExpired = entry.expires_at && new Date(entry.expires_at) < new Date();
                  const isExpiringSoon = entry.expires_at && !isExpired && (() => {
                    const days = (new Date(entry.expires_at!).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
                    return days <= 30;
                  })();

                  return (
                    <TableRow key={entry.id} className="group">
                      {/* Favorite */}
                      <TableCell>
                        <button
                          onClick={() => toggleFavorite(entry.id)}
                          className="text-muted-foreground hover:text-yellow-500 transition-colors"
                        >
                          {entry.is_favorite ? (
                            <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                          ) : (
                            <StarOff className="h-4 w-4 opacity-0 group-hover:opacity-100" />
                          )}
                        </button>
                      </TableCell>

                      {/* Nome */}
                      <TableCell>
                        <Link
                          to={`/configuracoes/cofre-senhas/${entry.id}`}
                          className="font-medium hover:underline flex items-center gap-2"
                        >
                          {entry.nome}
                          {entry.url && (
                            <ExternalLink className="h-3 w-3 text-muted-foreground" />
                          )}
                        </Link>
                        {entry.folder && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Folder className="h-3 w-3" style={{ color: entry.folder.cor }} />
                            {entry.folder.nome}
                          </span>
                        )}
                        {entry.tags.length > 0 && (
                          <div className="flex gap-1 mt-1">
                            {entry.tags.slice(0, 3).map((tag) => (
                              <Badge key={tag} variant="secondary" className="text-xs py-0">
                                {tag}
                              </Badge>
                            ))}
                            {entry.tags.length > 3 && (
                              <Badge variant="secondary" className="text-xs py-0">
                                +{entry.tags.length - 3}
                              </Badge>
                            )}
                          </div>
                        )}
                      </TableCell>

                      {/* Categoria */}
                      <TableCell>{getCategoryBadge(entry.categoria)}</TableCell>

                      {/* Username */}
                      <TableCell className="text-sm text-muted-foreground">
                        {entry.username || "-"}
                      </TableCell>

                      {/* Value */}
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <code className="text-sm bg-muted px-2 py-1 rounded font-mono">
                            {isRevealed ? revealedValues[entry.id] : (entry.value_preview || "••••••••")}
                          </code>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => handleReveal(entry.id)}
                            disabled={revealingId === entry.id}
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => handleCopy(entry.id)}
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>

                      {/* Expiration */}
                      <TableCell>
                        {entry.expires_at ? (
                          <span
                            className={`text-sm ${
                              isExpired
                                ? "text-red-500 font-medium"
                                : isExpiringSoon
                                ? "text-orange-500"
                                : "text-muted-foreground"
                            }`}
                          >
                            {isExpired && <AlertTriangle className="h-3 w-3 inline mr-1" />}
                            {new Date(entry.expires_at).toLocaleDateString("pt-BR")}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>

                      {/* Actions */}
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link to={`/configuracoes/cofre-senhas/${entry.id}`}>
                                <Eye className="h-4 w-4 mr-2" /> Ver detalhes
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link to={`/configuracoes/cofre-senhas/${entry.id}/editar`}>
                                <Pencil className="h-4 w-4 mr-2" /> Editar
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleCopy(entry.id)}>
                              <Copy className="h-4 w-4 mr-2" /> Copiar valor
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => setDeleteId(entry.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" /> Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir credencial?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acao remove a credencial do cofre. Ela pode ser recuperada pelo administrador.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CofreSenhas;
