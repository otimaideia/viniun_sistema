import { useState } from "react";
import { Link } from "react-router-dom";
import { useSiteBannersMT, type MTSiteBanner } from "@/hooks/multitenant/useSiteBannersMT";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  Plus,
  Search,
  Image as ImageIcon,
  Loader2,
  Trash2,
  Pencil,
} from "lucide-react";

const POSICAO_LABELS: Record<string, string> = {
  hero: "Hero",
  lateral: "Lateral",
  footer: "Footer",
  popup: "Popup",
  categoria: "Categoria",
};

const POSICAO_COLORS: Record<string, string> = {
  hero: "bg-pink-100 text-pink-800",
  lateral: "bg-blue-100 text-blue-800",
  footer: "bg-gray-100 text-gray-800",
  popup: "bg-orange-100 text-orange-800",
  categoria: "bg-purple-100 text-purple-800",
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("pt-BR");
}

export default function Banners() {
  const [search, setSearch] = useState("");
  const [posicaoFilter, setPosicaoFilter] = useState<string>("all");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filterPosicao = posicaoFilter !== "all" ? posicaoFilter : undefined;
  const { banners, isLoading, remove } = useSiteBannersMT(filterPosicao);

  const filteredBanners = banners.filter((b) =>
    b.titulo.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async () => {
    if (!deleteId) return;
    remove.mutate(deleteId, {
      onSuccess: () => setDeleteId(null),
    });
  };

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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Banners do Site</h1>
          <p className="text-muted-foreground">
            Gerencie os banners exibidos no site publico
          </p>
        </div>
        <Button asChild>
          <Link to="/configuracoes/banners/novo">
            <Plus className="h-4 w-4 mr-2" />
            Novo Banner
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar banners..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={posicaoFilter} onValueChange={setPosicaoFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Posicao" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as posicoes</SelectItem>
            {Object.entries(POSICAO_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {filteredBanners.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-48 text-muted-foreground">
            <ImageIcon className="h-12 w-12 mb-4 opacity-50" />
            <p className="text-lg font-medium">Nenhum banner encontrado</p>
            <p className="text-sm">Crie um novo banner para comecar</p>
          </CardContent>
        </Card>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">Imagem</TableHead>
                <TableHead>Titulo</TableHead>
                <TableHead>Posicao</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Periodo</TableHead>
                <TableHead className="w-20 text-center">Ordem</TableHead>
                <TableHead className="w-24">Acoes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBanners.map((banner) => (
                <TableRow key={banner.id}>
                  <TableCell>
                    {banner.imagem_url ? (
                      <img
                        src={banner.imagem_url}
                        alt={banner.titulo}
                        className="w-16 h-10 object-cover rounded border"
                      />
                    ) : (
                      <div className="w-16 h-10 bg-muted rounded border flex items-center justify-center">
                        <ImageIcon className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{banner.titulo}</p>
                      {banner.subtitulo && (
                        <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                          {banner.subtitulo}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`${POSICAO_COLORS[banner.posicao] || "bg-gray-100 text-gray-800"} border-0`}
                    >
                      {POSICAO_LABELS[banner.posicao] || banner.posicao}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={banner.is_active ? "default" : "secondary"}
                    >
                      {banner.is_active ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {banner.data_inicio || banner.data_fim ? (
                      <span>
                        {formatDate(banner.data_inicio)} - {formatDate(banner.data_fim)}
                      </span>
                    ) : (
                      <span>Sem periodo</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">{banner.ordem}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" asChild>
                        <Link to={`/configuracoes/banners/${banner.id}/editar`}>
                          <Pencil className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleteId(banner.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusao</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover este banner? Esta acao nao pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
