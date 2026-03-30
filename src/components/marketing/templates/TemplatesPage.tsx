import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Filter, FileText, Eye, Edit, Trash2 } from "lucide-react";
import { useMarketingTemplatesAdapter } from "@/hooks/useMarketingTemplatesAdapter";
import { TemplateFormModal } from "./TemplateFormModal";
import { TemplateViewModal } from "./TemplateViewModal";
import { TemplateDeleteDialog } from "./TemplateDeleteDialog";
import type { MarketingTemplate } from "@/types/marketing";

export function TemplatesPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<MarketingTemplate | null>(null);
  const [viewMode, setViewMode] = useState<"view" | "edit" | "delete" | null>(null);

  const { templates, isLoading, refetch } = useMarketingTemplatesAdapter();

  const filteredTemplates = templates.filter((template) => {
    const matchesSearch =
      template.nome_template.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.template_content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === "all" || template.tipo === selectedType;
    return matchesSearch && matchesType;
  });

  const handleAction = (template: MarketingTemplate, action: "view" | "edit" | "delete") => {
    setSelectedTemplate(template);
    setViewMode(action);
  };

  const closeDialog = () => {
    setSelectedTemplate(null);
    setViewMode(null);
  };

  const getTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      whatsapp: "WhatsApp",
      email: "Email",
      social_media: "Redes Sociais",
      landing_page: "Landing Page",
    };
    return types[type] || type;
  };

  const getTypeVariant = (type: string): "default" | "secondary" | "outline" | "destructive" => {
    const variants: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
      whatsapp: "default",
      email: "secondary",
      social_media: "outline",
      landing_page: "destructive",
    };
    return variants[type] || "default";
  };

  const stats = {
    whatsapp: templates.filter((t) => t.tipo === "whatsapp").length,
    email: templates.filter((t) => t.tipo === "email").length,
    social_media: templates.filter((t) => t.tipo === "social_media").length,
    active: templates.filter((t) => t.ativo).length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Templates de Marketing</h1>
          <p className="text-muted-foreground">
            Gerencie templates para WhatsApp, email e redes sociais
          </p>
        </div>
        <Button onClick={() => setShowAddModal(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Template
        </Button>
      </div>

      {/* Filtros e busca */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar templates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-3 py-2 border border-input bg-background rounded-md text-sm"
          >
            <option value="all">Todos os Tipos</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="email">Email</option>
            <option value="social_media">Redes Sociais</option>
            <option value="landing_page">Landing Page</option>
          </select>
          <Button variant="outline" size="icon">
            <Filter className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Cards de estatisticas */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{stats.whatsapp}</div>
            <div className="text-sm text-muted-foreground">Templates WhatsApp</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{stats.email}</div>
            <div className="text-sm text-muted-foreground">Templates Email</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{stats.social_media}</div>
            <div className="text-sm text-muted-foreground">Templates Redes Sociais</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{stats.active}</div>
            <div className="text-sm text-muted-foreground">Templates Ativos</div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Templates */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Templates ({filteredTemplates.length})
          </CardTitle>
          <CardDescription>Gerencie seus templates de marketing</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Carregando templates...</p>
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">
                {templates.length === 0
                  ? "Nenhum template criado ainda"
                  : "Nenhum template encontrado"}
              </p>
              <Button onClick={() => setShowAddModal(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Criar Template
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="text-left p-3 font-medium">Nome</th>
                    <th className="text-left p-3 font-medium">Tipo</th>
                    <th className="text-left p-3 font-medium hidden lg:table-cell">Unidade</th>
                    <th className="text-left p-3 font-medium hidden md:table-cell">Status</th>
                    <th className="text-left p-3 font-medium">Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTemplates.map((template) => (
                    <tr
                      key={template.id}
                      className="border-b hover:bg-muted/50 transition-colors"
                    >
                      <td className="p-3">
                        <div className="font-medium">{template.nome_template}</div>
                        <div className="text-sm text-muted-foreground mt-1 line-clamp-1">
                          {template.template_content.substring(0, 80)}...
                        </div>
                      </td>
                      <td className="p-3">
                        <Badge variant={getTypeVariant(template.tipo)}>
                          {getTypeLabel(template.tipo)}
                        </Badge>
                      </td>
                      <td className="p-3 hidden lg:table-cell">
                        <span className="text-sm">
                          {template.mt_franchises?.nome_fantasia || "Geral"}
                        </span>
                      </td>
                      <td className="p-3 hidden md:table-cell">
                        <div className="flex items-center gap-1">
                          {template.ativo ? (
                            <Badge variant="outline" className="text-green-600 border-green-600">
                              Ativo
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Inativo</Badge>
                          )}
                          {template.is_default && <Badge variant="outline">Padrao</Badge>}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleAction(template, "view")}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleAction(template, "edit")}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleAction(template, "delete")}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      <TemplateFormModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        onSuccess={() => {
          setShowAddModal(false);
          refetch();
        }}
      />

      {selectedTemplate && viewMode === "view" && (
        <TemplateViewModal
          template={selectedTemplate}
          open={true}
          onOpenChange={closeDialog}
        />
      )}

      {selectedTemplate && viewMode === "edit" && (
        <TemplateFormModal
          template={selectedTemplate}
          open={true}
          onOpenChange={closeDialog}
          onSuccess={() => {
            closeDialog();
            refetch();
          }}
        />
      )}

      {selectedTemplate && viewMode === "delete" && (
        <TemplateDeleteDialog
          template={selectedTemplate}
          open={true}
          onOpenChange={closeDialog}
          onSuccess={() => {
            closeDialog();
            refetch();
          }}
        />
      )}
    </div>
  );
}
