import { useParams, useNavigate, Link } from "react-router-dom";
import { useTenantContext } from "@/contexts/TenantContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PropertyStatusBadge } from "@/components/imoveis/PropertyStatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft, Pencil, Trash2, Loader2, MapPin, BedDouble, Bath, Car,
  Maximize2, DollarSign, Home, Building2, Star, Calendar,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

function formatCurrency(value: number | null | undefined): string {
  if (!value) return "-";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export default function ImovelDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { tenant } = useTenantContext();

  const { data: imovel, isLoading } = useQuery({
    queryKey: ["mt-imovel", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mt_properties" as any)
        .select(`
          *,
          tipo:mt_property_types!property_type_id(id, nome),
          finalidade:mt_property_purposes!purpose_id(id, nome),
          proprietario:mt_property_owners!owner_id(id, nome, telefone, email),
          cidade:mt_locations!location_cidade_id(id, nome),
          bairro:mt_locations!location_bairro_id(id, nome),
          estado:mt_locations!location_estado_id(id, nome, uf)
        `)
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data as any;
    },
    enabled: !!id,
  });

  const { data: fotos = [] } = useQuery({
    queryKey: ["mt-imovel-fotos", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("mt_property_photos" as any)
        .select("*")
        .eq("property_id", id!)
        .order("ordem", { ascending: true });
      return data || [];
    },
    enabled: !!id,
  });

  const { data: consultas = [] } = useQuery({
    queryKey: ["mt-imovel-consultas", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("mt_property_inquiries" as any)
        .select("*")
        .eq("property_id", id!)
        .order("created_at", { ascending: false })
        .limit(20);
      return data || [];
    },
    enabled: !!id,
  });

  const handleDelete = async () => {
    try {
      const { error } = await supabase
        .from("mt_properties" as any)
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id!);
      if (error) throw error;
      toast.success("Imóvel removido com sucesso");
      navigate("/imoveis");
    } catch (err: any) {
      toast.error(`Erro ao remover: ${err.message}`);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!imovel) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Imóvel não encontrado.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/imoveis")}>
          Voltar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/imoveis")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{imovel.titulo}</h1>
              <PropertyStatusBadge situacao={imovel.situacao || "disponivel"} />
              {imovel.destaque && (
                <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">
                  <Star className="h-3 w-3 mr-1" /> Destaque
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground">
              {imovel.ref_code && `Ref: ${imovel.ref_code} - `}
              {imovel.tipo?.nome || "-"} - {imovel.finalidade?.nome || "-"}
              {imovel.bairro?.nome && ` - ${imovel.bairro.nome}`}
              {imovel.cidade?.nome && `, ${imovel.cidade.nome}`}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to={`/imoveis/${id}/editar`}>
              <Pencil className="h-4 w-4 mr-2" /> Editar
            </Link>
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="icon">
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza que deseja remover o imóvel "{imovel.titulo}"? Esta ação pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>Confirmar</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Photo gallery */}
      {fotos.length > 0 ? (
        <div className="space-y-2">
          <div className="rounded-lg overflow-hidden h-72 bg-muted">
            <img
              src={fotos[0].url}
              alt={imovel.titulo}
              className="w-full h-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          </div>
          {fotos.length > 1 && (
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
              {fotos.slice(1, 9).map((foto: any) => (
                <div key={foto.id} className="rounded overflow-hidden h-20 bg-muted cursor-pointer">
                  <img
                    src={foto.thumbnail_url || foto.url}
                    alt={foto.descricao || ""}
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                </div>
              ))}
              {fotos.length > 9 && (
                <div className="rounded h-20 bg-muted flex items-center justify-center text-sm text-muted-foreground">
                  +{fotos.length - 9} fotos
                </div>
              )}
            </div>
          )}
        </div>
      ) : imovel.foto_destaque_url ? (
        <div className="rounded-lg overflow-hidden h-72 bg-muted">
          <img src={imovel.foto_destaque_url} alt={imovel.titulo} className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className="rounded-lg h-48 bg-muted flex items-center justify-center">
          <Home className="h-16 w-16 text-muted-foreground/30" />
        </div>
      )}

      {/* Quick info cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {imovel.valor_venda && (
          <Card>
            <CardContent className="pt-4 text-center">
              <DollarSign className="h-5 w-5 mx-auto text-green-600 mb-1" />
              <p className="text-xs text-muted-foreground">Venda</p>
              <p className="font-bold text-sm">{formatCurrency(imovel.valor_venda)}</p>
            </CardContent>
          </Card>
        )}
        {imovel.valor_locacao && (
          <Card>
            <CardContent className="pt-4 text-center">
              <DollarSign className="h-5 w-5 mx-auto text-blue-600 mb-1" />
              <p className="text-xs text-muted-foreground">Locação</p>
              <p className="font-bold text-sm">{formatCurrency(imovel.valor_locacao)}/mês</p>
            </CardContent>
          </Card>
        )}
        {imovel.dormitorios != null && (
          <Card>
            <CardContent className="pt-4 text-center">
              <BedDouble className="h-5 w-5 mx-auto text-primary mb-1" />
              <p className="text-xs text-muted-foreground">Dormitórios</p>
              <p className="font-bold text-sm">{imovel.dormitorios}</p>
            </CardContent>
          </Card>
        )}
        {imovel.area_total != null && (
          <Card>
            <CardContent className="pt-4 text-center">
              <Maximize2 className="h-5 w-5 mx-auto text-primary mb-1" />
              <p className="text-xs text-muted-foreground">Área Total</p>
              <p className="font-bold text-sm">{imovel.area_total}m²</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Tabs with details */}
      <Tabs defaultValue="dados">
        <TabsList>
          <TabsTrigger value="dados">Dados</TabsTrigger>
          <TabsTrigger value="localizacao">Localização</TabsTrigger>
          <TabsTrigger value="precos">Preços</TabsTrigger>
          <TabsTrigger value="caracteristicas">Características</TabsTrigger>
          <TabsTrigger value="consultas">Consultas ({consultas.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="dados">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InfoRow label="Referência" value={imovel.ref_code} />
                <InfoRow label="Tipo" value={imovel.tipo?.nome} />
                <InfoRow label="Finalidade" value={imovel.finalidade?.nome} />
                <InfoRow label="Situação" value={imovel.situacao} />
                <InfoRow label="Dormitórios" value={imovel.dormitorios} />
                <InfoRow label="Suítes" value={imovel.suites} />
                <InfoRow label="Banheiros" value={imovel.banheiros} />
                <InfoRow label="Vagas Garagem" value={imovel.garagens} />
                <InfoRow label="Área Total" value={imovel.area_total ? `${imovel.area_total}m²` : null} />
                <InfoRow label="Área Útil" value={imovel.area_util ? `${imovel.area_util}m²` : null} />
                <InfoRow label="Mobiliado" value={imovel.mobiliado ? "Sim" : imovel.semimobiliado ? "Semi" : "Não"} />
                <InfoRow label="Proprietário" value={imovel.proprietario?.nome} />
              </div>
              {imovel.descricao && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Descrição</p>
                    <p className="text-sm whitespace-pre-wrap">{imovel.descricao}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="localizacao">
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InfoRow label="CEP" value={imovel.cep} />
                <InfoRow label="Endereço" value={imovel.endereco} />
                <InfoRow label="Número" value={imovel.numero} />
                <InfoRow label="Complemento" value={imovel.complemento} />
                <InfoRow label="Bairro" value={imovel.bairro?.nome} />
                <InfoRow label="Cidade" value={imovel.cidade?.nome} />
                <InfoRow label="Estado" value={imovel.estado?.nome || imovel.estado?.uf} />
                <InfoRow label="Ponto de Referência" value={imovel.ponto_referencia} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="precos">
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InfoRow label="Valor Venda" value={formatCurrency(imovel.valor_venda)} />
                <InfoRow label="Valor Locação" value={formatCurrency(imovel.valor_locacao)} />
                <InfoRow label="Condomínio" value={formatCurrency(imovel.valor_condominio)} />
                <InfoRow label="IPTU" value={formatCurrency(imovel.valor_iptu)} />
                <InfoRow label="Aceita Financiamento" value={imovel.aceita_financiamento ? "Sim" : "Não"} />
                <InfoRow label="Aceita Permuta" value={imovel.aceita_permuta ? "Sim" : "Não"} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="caracteristicas">
          <Card>
            <CardContent className="pt-6">
              {imovel.caracteristicas && typeof imovel.caracteristicas === "object" ? (
                <div className="flex flex-wrap gap-2">
                  {Object.entries(imovel.caracteristicas).map(([key, val]) => (
                    val ? <Badge key={key} variant="secondary">{key}</Badge> : null
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Nenhuma característica cadastrada.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="consultas">
          <Card>
            <CardContent className="pt-6">
              {consultas.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma consulta recebida.</p>
              ) : (
                <div className="space-y-4">
                  {consultas.map((c: any) => (
                    <div key={c.id} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-sm">{c.nome}</p>
                        <Badge variant={c.status === "novo" ? "default" : "secondary"}>
                          {c.status || "novo"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{c.email} - {c.telefone}</p>
                      {c.mensagem && <p className="text-sm">{c.mensagem}</p>}
                      <p className="text-xs text-muted-foreground">
                        {c.created_at && format(new Date(c.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: any }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value || "-"}</p>
    </div>
  );
}
