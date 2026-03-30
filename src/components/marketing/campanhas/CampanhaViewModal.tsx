import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Users, TrendingUp, DollarSign, Target, BarChart3 } from "lucide-react";
import type { MarketingCampanha } from "@/types/marketing";

interface CampanhaViewModalProps {
  campanha: MarketingCampanha;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CampanhaViewModal({ campanha, open, onOpenChange }: CampanhaViewModalProps) {
  // Cálculos de ROI
  const budgetReal = campanha.budget_real || 0;
  const budgetEstimado = campanha.budget_estimado || 0;
  const leadsGerados = campanha.leads_gerados || 0;
  const conversoes = campanha.conversoes || 0;
  const receitaGerada = campanha.receita_gerada || 0;

  const budgetProgress = budgetEstimado > 0 ? (budgetReal / budgetEstimado) * 100 : 0;
  const taxaConversao = leadsGerados > 0 ? (conversoes / leadsGerados) * 100 : 0;
  const cpl = leadsGerados > 0 ? budgetReal / leadsGerados : 0; // Custo por Lead
  const cac = conversoes > 0 ? budgetReal / conversoes : 0; // Custo de Aquisição por Cliente
  const roi = budgetReal > 0 ? ((receitaGerada - budgetReal) / budgetReal) * 100 : 0; // ROI %

  const formatCurrency = (value: number) =>
    value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      ativa: "Ativa",
      pausada: "Pausada",
      finalizada: "Finalizada",
    };
    return labels[status] || status;
  };

  const getStatusVariant = (status: string): "default" | "secondary" | "outline" => {
    const variants: Record<string, "default" | "secondary" | "outline"> = {
      ativa: "default",
      pausada: "secondary",
      finalizada: "outline",
    };
    return variants[status] || "default";
  };

  const getCanalLabel = (canal: string) => {
    const labels: Record<string, string> = {
      whatsapp: "WhatsApp",
      email: "Email",
      facebook: "Facebook",
      instagram: "Instagram",
      google: "Google Ads",
      tiktok: "TikTok",
    };
    return labels[canal] || canal;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{campanha.nome}</DialogTitle>
          <DialogDescription>Detalhes da campanha de marketing</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={getStatusVariant(campanha.status)}>
              {getStatusLabel(campanha.status)}
            </Badge>
            <Badge variant="outline">
              {campanha.tipo === "geral" ? "Geral" : "Unidade Especifica"}
            </Badge>
          </div>

          {campanha.descricao && (
            <div>
              <h4 className="font-medium mb-2">Descricao</h4>
              <p className="text-sm text-muted-foreground">{campanha.descricao}</p>
            </div>
          )}

          <Separator />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium mb-2">Unidade</h4>
              <p className="text-sm text-muted-foreground">
                {campanha.mt_franchises?.nome_fantasia || "Geral (todas as unidades)"}
              </p>
            </div>

            <div>
              <h4 className="font-medium mb-2">Budget Estimado</h4>
              <p className="text-sm text-muted-foreground">
                {campanha.budget_estimado
                  ? campanha.budget_estimado.toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })
                  : "Nao definido"}
              </p>
            </div>

            <div>
              <h4 className="font-medium mb-2">Data de Inicio</h4>
              <p className="text-sm text-muted-foreground">
                {campanha.data_inicio
                  ? new Date(campanha.data_inicio).toLocaleDateString("pt-BR")
                  : "Nao definida"}
              </p>
            </div>

            <div>
              <h4 className="font-medium mb-2">Data de Fim</h4>
              <p className="text-sm text-muted-foreground">
                {campanha.data_fim
                  ? new Date(campanha.data_fim).toLocaleDateString("pt-BR")
                  : "Nao definida"}
              </p>
            </div>
          </div>

          {/* Seção de ROI e Métricas */}
          <Separator />
          <div>
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Performance e ROI
            </h4>

            {/* Budget Real vs Estimado */}
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">Budget Utilizado</span>
                <span className="font-medium">
                  {formatCurrency(budgetReal)} / {formatCurrency(budgetEstimado)}
                </span>
              </div>
              <Progress
                value={Math.min(budgetProgress, 100)}
                className={`h-2 ${budgetProgress > 100 ? "[&>div]:bg-red-500" : ""}`}
              />
              {budgetProgress > 100 && (
                <p className="text-xs text-red-500 mt-1">
                  Budget excedido em {(budgetProgress - 100).toFixed(1)}%
                </p>
              )}
            </div>

            {/* Cards de métricas */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card>
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 text-blue-600 mb-1">
                    <Users className="h-4 w-4" />
                    <span className="text-xs font-medium">Leads</span>
                  </div>
                  <p className="text-xl font-bold">{leadsGerados}</p>
                  {cpl > 0 && (
                    <p className="text-xs text-muted-foreground">
                      CPL: {formatCurrency(cpl)}
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 text-green-600 mb-1">
                    <TrendingUp className="h-4 w-4" />
                    <span className="text-xs font-medium">Conversões</span>
                  </div>
                  <p className="text-xl font-bold">{conversoes}</p>
                  {leadsGerados > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Taxa: {taxaConversao.toFixed(1)}%
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 text-purple-600 mb-1">
                    <Target className="h-4 w-4" />
                    <span className="text-xs font-medium">CAC</span>
                  </div>
                  <p className="text-xl font-bold">
                    {cac > 0 ? formatCurrency(cac) : "—"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Custo/Cliente
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 text-amber-600 mb-1">
                    <DollarSign className="h-4 w-4" />
                    <span className="text-xs font-medium">ROI</span>
                  </div>
                  <p className={`text-xl font-bold ${roi >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {budgetReal > 0 ? `${roi.toFixed(1)}%` : "—"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Receita: {formatCurrency(receitaGerada)}
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {campanha.canais && campanha.canais.length > 0 && (
            <>
              <Separator />
              <div>
                <h4 className="font-medium mb-2">Canais de Divulgacao</h4>
                <div className="flex flex-wrap gap-2">
                  {campanha.canais.map((canal) => (
                    <Badge key={canal} variant="outline">
                      {getCanalLabel(canal)}
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}

          {(campanha.utm_source ||
            campanha.utm_medium ||
            campanha.utm_campaign ||
            campanha.utm_term) && (
            <>
              <Separator />
              <div>
                <h4 className="font-medium mb-2">Parametros UTM</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {campanha.utm_source && (
                    <div>
                      <span className="text-muted-foreground">Source:</span> {campanha.utm_source}
                    </div>
                  )}
                  {campanha.utm_medium && (
                    <div>
                      <span className="text-muted-foreground">Medium:</span> {campanha.utm_medium}
                    </div>
                  )}
                  {campanha.utm_campaign && (
                    <div>
                      <span className="text-muted-foreground">Campaign:</span>{" "}
                      {campanha.utm_campaign}
                    </div>
                  )}
                  {campanha.utm_term && (
                    <div>
                      <span className="text-muted-foreground">Term:</span> {campanha.utm_term}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {campanha.objetivo && (
            <>
              <Separator />
              <div>
                <h4 className="font-medium mb-2">Objetivo</h4>
                <p className="text-sm text-muted-foreground">{campanha.objetivo}</p>
              </div>
            </>
          )}

          {campanha.publico_alvo && (
            <div>
              <h4 className="font-medium mb-2">Publico Alvo</h4>
              <p className="text-sm text-muted-foreground">{campanha.publico_alvo}</p>
            </div>
          )}

          <Separator />

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Criado em:</span>
              <p>{new Date(campanha.created_at).toLocaleDateString("pt-BR")}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Atualizado em:</span>
              <p>{new Date(campanha.updated_at).toLocaleDateString("pt-BR")}</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
