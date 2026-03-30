import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, Check, Eye, FileText, Send, Clock } from "lucide-react";
import { toast } from "sonner";
import type { MarketingTemplate } from "@/types/marketing";
import { SendTemplateModal } from "./SendTemplateModal";
import { ScheduleMessageModal } from "./ScheduleMessageModal";

interface TemplateViewModalProps {
  template: MarketingTemplate;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TemplateViewModal({ template, open, onOpenChange }: TemplateViewModalProps) {
  const [varValues, setVarValues] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);

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

  // Extrai variáveis do template (formato {variavel})
  const extractedVariables = useMemo(() => {
    const regex = /\{([^}]+)\}/g;
    const matches = template.template_content.matchAll(regex);
    const vars = new Set<string>();
    for (const match of matches) {
      vars.add(match[1]);
    }
    return Array.from(vars);
  }, [template.template_content]);

  // Gera o texto com variáveis substituídas
  const previewText = useMemo(() => {
    let text = template.template_content;
    Object.entries(varValues).forEach(([key, value]) => {
      const regex = new RegExp(`\\{${key}\\}`, "g");
      text = text.replace(regex, value || `{${key}}`);
    });
    return text;
  }, [template.template_content, varValues]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(previewText);
      setCopied(true);
      toast.success("Texto copiado para a área de transferência!");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Erro ao copiar texto");
    }
  };

  const handleVarChange = (varName: string, value: string) => {
    setVarValues((prev) => ({ ...prev, [varName]: value }));
  };

  const hasVariables = extractedVariables.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{template.nome_template}</DialogTitle>
          <DialogDescription>Detalhes do template de marketing</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={getTypeVariant(template.tipo)}>{getTypeLabel(template.tipo)}</Badge>
              {template.ativo ? (
                <Badge variant="outline" className="text-green-600 border-green-600">
                  Ativo
                </Badge>
              ) : (
                <Badge variant="secondary">Inativo</Badge>
              )}
              {template.is_default && <Badge variant="outline">Padrao</Badge>}
            </div>
            {template.tipo === "whatsapp" && (
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowScheduleModal(true)}
                  className="gap-2"
                >
                  <Clock className="h-4 w-4" />
                  Agendar
                </Button>
                <Button
                  size="sm"
                  onClick={() => setShowSendModal(true)}
                  className="gap-2 bg-green-600 hover:bg-green-700"
                >
                  <Send className="h-4 w-4" />
                  Enviar Agora
                </Button>
              </div>
            )}
          </div>

          <Separator />

          <div>
            <h4 className="font-medium mb-2">Unidade</h4>
            <p className="text-sm text-muted-foreground">
              {template.mt_franchises?.nome_fantasia || "Geral (todas as unidades)"}
            </p>
          </div>

          {hasVariables ? (
            <Tabs defaultValue="preview" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="preview" className="gap-2">
                  <Eye className="h-4 w-4" />
                  Preview
                </TabsTrigger>
                <TabsTrigger value="original" className="gap-2">
                  <FileText className="h-4 w-4" />
                  Original
                </TabsTrigger>
              </TabsList>

              <TabsContent value="preview" className="space-y-4">
                {/* Campos para preencher variáveis */}
                <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-medium text-sm">Preencher Variáveis</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {extractedVariables.map((varName) => (
                      <div key={varName} className="space-y-1">
                        <Label htmlFor={varName} className="text-xs">
                          {`{${varName}}`}
                        </Label>
                        <Input
                          id={varName}
                          value={varValues[varName] || ""}
                          onChange={(e) => handleVarChange(varName, e.target.value)}
                          placeholder={`Digite ${varName}...`}
                          className="h-8 text-sm"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Preview do texto */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">Preview do Texto</h4>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleCopy}
                      className="gap-2"
                    >
                      {copied ? (
                        <>
                          <Check className="h-4 w-4" />
                          Copiado!
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4" />
                          Copiar
                        </>
                      )}
                    </Button>
                  </div>
                  <div className="bg-muted p-4 rounded-lg whitespace-pre-wrap text-sm">
                    {previewText}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="original" className="space-y-4">
                {template.variaveis_disponiveis && template.variaveis_disponiveis.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Variaveis Disponiveis</h4>
                    <div className="flex flex-wrap gap-2">
                      {template.variaveis_disponiveis.map((variable) => (
                        <Badge key={variable} variant="outline">
                          {variable}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">Conteudo do Template</h4>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(template.template_content);
                        toast.success("Template original copiado!");
                      }}
                      className="gap-2"
                    >
                      <Copy className="h-4 w-4" />
                      Copiar Original
                    </Button>
                  </div>
                  <div className="bg-muted p-4 rounded-lg whitespace-pre-wrap text-sm">
                    {template.template_content}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          ) : (
            <>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">Conteudo do Template</h4>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCopy}
                    className="gap-2"
                  >
                    {copied ? (
                      <>
                        <Check className="h-4 w-4" />
                        Copiado!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        Copiar
                      </>
                    )}
                  </Button>
                </div>
                <div className="bg-muted p-4 rounded-lg whitespace-pre-wrap text-sm">
                  {template.template_content}
                </div>
              </div>
            </>
          )}

          <Separator />

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Criado em:</span>
              <p>{new Date(template.created_at).toLocaleDateString("pt-BR")}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Atualizado em:</span>
              <p>{new Date(template.updated_at).toLocaleDateString("pt-BR")}</p>
            </div>
          </div>
        </div>
      </DialogContent>

      {/* Send Template Modal */}
      <SendTemplateModal
        template={template}
        open={showSendModal}
        onOpenChange={setShowSendModal}
        initialVarValues={varValues}
      />

      {/* Schedule Message Modal */}
      <ScheduleMessageModal
        template={template}
        open={showScheduleModal}
        onOpenChange={setShowScheduleModal}
        initialVarValues={varValues}
      />
    </Dialog>
  );
}
