import { useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useTenantContext } from "@/contexts/TenantContext";
import { useRedeTabelaMT, useRedeTabelaItensMT } from "@/hooks/multitenant/useRedeTabelasMT";
import { useRedeInteressesMT } from "@/hooks/multitenant/useRedeInteressesMT";
import { useImoveisMT } from "@/hooks/multitenant/useImoveisMT";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft, Edit, Network, Building2, Globe, Lock, Users2,
  Plus, Trash2, Eye, Heart, DollarSign, Home, Bed, Maximize,
} from "lucide-react";

function formatCurrency(value: number | null | undefined): string {
  if (!value) return "-";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export default function RedeTabelaDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { tenant } = useTenantContext();

  const { data: tabela, isLoading } = useRedeTabelaMT(id);
  const { data: itens = [], isLoading: isLoadingItens, addItem, removeItem } = useRedeTabelaItensMT(id);
  const { manifestar } = useRedeInteressesMT();

  const [showAddModal, setShowAddModal] = useState(false);
  const [showInterestModal, setShowInterestModal] = useState<string | null>(null);
  const [interestNote, setInterestNote] = useState("");
  const [interestTipo, setInterestTipo] = useState<string>("consulta");

  const isOwner = tabela?.tenant_id === tenant?.id;

  if (isLoading) return <Skeleton className="h-96 w-full" />;
  if (!tabela) return <div className="text-center py-12 text-muted-foreground">Tabela não encontrada.</div>;

  const handleInterest = async (propertyId: string) => {
    try {
      await manifestar.mutateAsync({
        property_id: propertyId,
        table_id: id,
        tipo: interestTipo as any,
        observacoes: interestNote,
      });
      setShowInterestModal(null);
      setInterestNote("");
    } catch {
      // toast in hook
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/imoveis/rede")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Network className="h-6 w-6" /> {tabela.nome}
            </h1>
            <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Building2 className="h-3.5 w-3.5" />
                {tabela.tenant?.nome_fantasia || "—"}
              </span>
              <span className="flex items-center gap-1">
                {tabela.visibilidade === "publica" && <Globe className="h-3.5 w-3.5" />}
                {tabela.visibilidade === "parceiros" && <Users2 className="h-3.5 w-3.5" />}
                {tabela.visibilidade === "privada" && <Lock className="h-3.5 w-3.5" />}
                {tabela.visibilidade}
              </span>
              <Badge variant="outline">{tabela.tipo}</Badge>
              <Badge>{tabela.status}</Badge>
            </div>
          </div>
        </div>
        {isOwner && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowAddModal(true)}>
              <Plus className="h-4 w-4 mr-2" /> Adicionar Imóvel
            </Button>
            <Button variant="outline" asChild>
              <Link to={`/imoveis/rede/${id}/editar`}>
                <Edit className="h-4 w-4 mr-2" /> Editar
              </Link>
            </Button>
          </div>
        )}
      </div>

      {/* Descrição e Comissão */}
      {(tabela.descricao || tabela.comissao_percentual > 0 || tabela.comissao_valor_fixo) && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              {tabela.descricao && <p className="text-muted-foreground flex-1">{tabela.descricao}</p>}
              <div className="flex items-center gap-2 ml-4">
                <DollarSign className="h-4 w-4 text-green-600" />
                <span className="font-semibold text-green-600">
                  Comissão: {tabela.comissao_tipo === "fixo"
                    ? formatCurrency(tabela.comissao_valor_fixo)
                    : `${tabela.comissao_percentual}%`}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Métricas */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Imóveis</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold flex items-center gap-2"><Home className="h-5 w-5" /> {itens.length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Visualizações</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold flex items-center gap-2"><Eye className="h-5 w-5" /> {tabela.total_visualizacoes || 0}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Interesses</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold flex items-center gap-2"><Heart className="h-5 w-5" /> {tabela.total_interesses || 0}</div></CardContent>
        </Card>
      </div>

      {/* Lista de Imóveis */}
      <Card>
        <CardHeader>
          <CardTitle>Imóveis da Tabela ({itens.length})</CardTitle>
          <CardDescription>Imóveis compartilhados nesta tabela colaborativa</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoadingItens ? (
            <Skeleton className="h-32 w-full m-6" />
          ) : itens.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Home className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>Nenhum imóvel adicionado ainda.</p>
              {isOwner && <p className="text-sm mt-1">Clique em "Adicionar Imóvel" para começar.</p>}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Imóvel</TableHead>
                  <TableHead>Ref.</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead className="text-center">Quartos</TableHead>
                  <TableHead>Área</TableHead>
                  <TableHead>Comissão</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {itens.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {item.property?.foto_destaque_url ? (
                          <img src={item.property.foto_destaque_url} alt="" className="h-10 w-14 rounded object-cover" />
                        ) : (
                          <div className="h-10 w-14 rounded bg-muted flex items-center justify-center"><Home className="h-4 w-4 text-muted-foreground" /></div>
                        )}
                        <div>
                          <div className="font-medium line-clamp-1">{item.property?.titulo || "Sem título"}</div>
                          {item.property?.tenant?.nome_fantasia && !isOwner && (
                            <div className="text-xs text-muted-foreground">{item.property.tenant.nome_fantasia}</div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm font-mono">{item.property?.ref_code || "-"}</TableCell>
                    <TableCell>{formatCurrency(item.valor_rede || item.property?.valor_venda)}</TableCell>
                    <TableCell className="text-center">
                      <span className="flex items-center justify-center gap-1"><Bed className="h-3.5 w-3.5" /> {item.property?.dormitorios || "-"}</span>
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1"><Maximize className="h-3.5 w-3.5" /> {item.property?.area_construida ? `${item.property.area_construida}m²` : "-"}</span>
                    </TableCell>
                    <TableCell>
                      {item.comissao_percentual ? `${item.comissao_percentual}%` : item.valor_comissao ? formatCurrency(item.valor_comissao) : `${tabela.comissao_percentual}%`}
                    </TableCell>
                    <TableCell>
                      <Badge variant={item.property?.situacao === "disponivel" ? "default" : "secondary"}>
                        {item.property?.situacao || "—"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {!isOwner && (
                          <Button variant="outline" size="sm" onClick={() => setShowInterestModal(item.property_id)}>
                            <Heart className="h-3.5 w-3.5 mr-1" /> Interesse
                          </Button>
                        )}
                        {isOwner && (
                          <Button variant="ghost" size="icon" onClick={() => removeItem.mutate(item.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Modal: Adicionar Imóvel */}
      <AddPropertyModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={(propertyId) => {
          addItem.mutate({ property_id: propertyId });
          setShowAddModal(false);
        }}
        existingIds={itens.map((i) => i.property_id)}
      />

      {/* Modal: Manifestar Interesse */}
      <Dialog open={!!showInterestModal} onOpenChange={() => setShowInterestModal(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Manifestar Interesse</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Select value={interestTipo} onValueChange={setInterestTipo}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="consulta">Consulta</SelectItem>
                <SelectItem value="proposta">Proposta</SelectItem>
                <SelectItem value="reserva">Reserva</SelectItem>
                <SelectItem value="visita">Agendar Visita</SelectItem>
              </SelectContent>
            </Select>
            <Textarea
              placeholder="Observações (opcional)..."
              value={interestNote}
              onChange={(e) => setInterestNote(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInterestModal(null)}>Cancelar</Button>
            <Button onClick={() => showInterestModal && handleInterest(showInterestModal)} disabled={manifestar.isPending}>
              Enviar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// --- Sub-componente: Modal para adicionar imóvel ---

function AddPropertyModal({
  open,
  onClose,
  onAdd,
  existingIds,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (id: string) => void;
  existingIds: string[];
}) {
  const [search, setSearch] = useState("");
  const { data: imoveis = [], isLoading } = useImoveisMT();

  const filtered = (imoveis as any[])
    .filter((i: any) => !existingIds.includes(i.id))
    .filter((i: any) => !search || i.titulo?.toLowerCase().includes(search.toLowerCase()) || i.ref_code?.toLowerCase().includes(search.toLowerCase()));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader><DialogTitle>Adicionar Imóvel à Tabela</DialogTitle></DialogHeader>
        <Input placeholder="Buscar por título ou referência..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <div className="max-h-[50vh] overflow-y-auto space-y-2">
          {isLoading ? (
            <Skeleton className="h-20 w-full" />
          ) : filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Nenhum imóvel disponível.</p>
          ) : (
            filtered.slice(0, 20).map((imovel: any) => (
              <div
                key={imovel.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent cursor-pointer"
                onClick={() => onAdd(imovel.id)}
              >
                <div className="flex items-center gap-3">
                  {imovel.foto_destaque_url ? (
                    <img src={imovel.foto_destaque_url} alt="" className="h-10 w-14 rounded object-cover" />
                  ) : (
                    <div className="h-10 w-14 rounded bg-muted flex items-center justify-center"><Home className="h-4 w-4" /></div>
                  )}
                  <div>
                    <div className="font-medium text-sm">{imovel.titulo || "Sem título"}</div>
                    <div className="text-xs text-muted-foreground">Ref: {imovel.ref_code || "-"}</div>
                  </div>
                </div>
                <div className="text-right text-sm">
                  <div className="font-medium">
                    {imovel.valor_venda
                      ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(imovel.valor_venda)
                      : "-"}
                  </div>
                  <Badge variant="outline" className="text-xs">{imovel.situacao || "-"}</Badge>
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
