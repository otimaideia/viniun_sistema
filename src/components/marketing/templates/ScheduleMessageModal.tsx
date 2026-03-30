import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Clock, Send, Calendar, MessageSquare } from "lucide-react";
import { useWhatsAppSessionsAdapter } from "@/hooks/useWhatsAppSessionsAdapter";
import { useScheduledMessagesAdapter } from "@/hooks/useScheduledMessagesAdapter";
import { useMarketingTemplatesAdapter } from "@/hooks/useMarketingTemplatesAdapter";
import type { MarketingTemplate } from "@/types/marketing";

interface ScheduleMessageModalProps {
  template?: MarketingTemplate;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialVarValues?: Record<string, string>;
}

export function ScheduleMessageModal({
  template,
  open,
  onOpenChange,
  initialVarValues = {},
}: ScheduleMessageModalProps) {
  const { sessions, isLoading: loadingSessoes } = useWhatsAppSessionsAdapter();
  const { templates, isLoading: loadingTemplates } = useMarketingTemplatesAdapter();
  const { createMessage, isCreating } = useScheduledMessagesAdapter();

  const [selectedSessaoId, setSelectedSessaoId] = useState<string>("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(template?.id || "");
  const [destinatario, setDestinatario] = useState("");
  const [conteudo, setConteudo] = useState(template?.template_content || "");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [varValues, setVarValues] = useState<Record<string, string>>(initialVarValues);

  // Sessões ativas
  const activeSessoes = useMemo(
    () => sessions.filter((s) => s.status === "working"),
    [sessions]
  );

  // Templates de WhatsApp
  const whatsappTemplates = useMemo(
    () => templates.filter((t) => t.tipo === "whatsapp" && t.ativo),
    [templates]
  );

  // Template selecionado
  const selectedTemplate = useMemo(() => {
    if (template) return template;
    return whatsappTemplates.find((t) => t.id === selectedTemplateId);
  }, [template, selectedTemplateId, whatsappTemplates]);

  // Extrair variáveis do template
  const templateVariables = useMemo(() => {
    if (!selectedTemplate?.template_content) return [];
    const matches = selectedTemplate.template_content.match(/\{(\w+)\}/g) || [];
    return [...new Set(matches.map((m) => m.replace(/[{}]/g, "")))];
  }, [selectedTemplate?.template_content]);

  // Preview com variáveis substituídas
  const previewText = useMemo(() => {
    if (!selectedTemplate?.template_content) return conteudo;
    let text = selectedTemplate.template_content;
    Object.entries(varValues).forEach(([key, value]) => {
      text = text.replace(new RegExp(`\\{${key}\\}`, "g"), value || `{${key}}`);
    });
    return text;
  }, [selectedTemplate?.template_content, varValues, conteudo]);

  // Atualizar conteúdo quando template mudar
  useEffect(() => {
    if (selectedTemplate?.template_content) {
      setConteudo(selectedTemplate.template_content);
    }
  }, [selectedTemplate]);

  // Reset ao abrir/fechar
  useEffect(() => {
    if (!open) {
      setSelectedSessaoId("");
      setSelectedTemplateId(template?.id || "");
      setDestinatario("");
      setConteudo(template?.template_content || "");
      setScheduledDate("");
      setScheduledTime("");
      setVarValues(initialVarValues);
    }
  }, [open, template, initialVarValues]);

  const formatPhoneNumber = (phone: string): string => {
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length >= 10) {
      return `${cleaned}@c.us`;
    }
    return phone;
  };

  const handleSchedule = async () => {
    if (!selectedSessaoId || !destinatario || !scheduledDate || !scheduledTime) {
      return;
    }

    const scheduledDateTime = new Date(`${scheduledDate}T${scheduledTime}`);
    const formattedPhone = formatPhoneNumber(destinatario);

    try {
      await createMessage({
        sessao_id: selectedSessaoId,
        destinatario: formattedPhone,
        conteudo: previewText,
        template_id: selectedTemplate?.id || null,
        agendado_para: scheduledDateTime.toISOString(),
      });
      onOpenChange(false);
    } catch (error) {
      console.error("Erro ao agendar mensagem:", error);
    }
  };

  // Data/hora mínima: agora
  const now = new Date();
  const minDate = now.toISOString().split("T")[0];
  const minTime = now.toTimeString().slice(0, 5);

  const isLoading = loadingSessoes || loadingTemplates;
  const canSchedule =
    selectedSessaoId &&
    destinatario &&
    scheduledDate &&
    scheduledTime &&
    (previewText || conteudo);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Agendar Mensagem WhatsApp
          </DialogTitle>
          <DialogDescription>
            Agende uma mensagem para ser enviada automaticamente no horario especificado.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Sessão */}
            <div className="space-y-2">
              <Label htmlFor="sessao">Sessao WhatsApp *</Label>
              <Select value={selectedSessaoId} onValueChange={setSelectedSessaoId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma sessao ativa" />
                </SelectTrigger>
                <SelectContent>
                  {activeSessoes.length === 0 ? (
                    <SelectItem value="none" disabled>
                      Nenhuma sessao ativa
                    </SelectItem>
                  ) : (
                    activeSessoes.map((sessao) => (
                      <SelectItem key={sessao.id} value={sessao.id}>
                        {sessao.nome} ({sessao.session_name})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Destinatário */}
            <div className="space-y-2">
              <Label htmlFor="destinatario">Numero do Destinatario *</Label>
              <Input
                id="destinatario"
                placeholder="Ex: 11999999999"
                value={destinatario}
                onChange={(e) => setDestinatario(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Digite apenas numeros com DDD (sem o +55)
              </p>
            </div>

            {/* Data e Hora */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Data *</Label>
                <Input
                  id="date"
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  min={minDate}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="time">Horario *</Label>
                <Input
                  id="time"
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  min={scheduledDate === minDate ? minTime : undefined}
                />
              </div>
            </div>

            {/* Template */}
            {!template && (
              <div className="space-y-2">
                <Label htmlFor="template">Template (Opcional)</Label>
                <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um template ou escreva manualmente" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum (escrever manualmente)</SelectItem>
                    {whatsappTemplates.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.nome_template}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Variáveis do Template */}
            {templateVariables.length > 0 && (
              <div className="space-y-2">
                <Label>Variaveis do Template</Label>
                <div className="grid grid-cols-2 gap-2">
                  {templateVariables.map((varName) => (
                    <div key={varName} className="space-y-1">
                      <Label htmlFor={varName} className="text-xs text-muted-foreground">
                        {`{${varName}}`}
                      </Label>
                      <Input
                        id={varName}
                        placeholder={`Valor para {${varName}}`}
                        value={varValues[varName] || ""}
                        onChange={(e) =>
                          setVarValues((prev) => ({ ...prev, [varName]: e.target.value }))
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Conteúdo personalizado se não usar template */}
            {!selectedTemplate && (
              <div className="space-y-2">
                <Label htmlFor="conteudo">Mensagem *</Label>
                <Textarea
                  id="conteudo"
                  placeholder="Digite sua mensagem..."
                  value={conteudo}
                  onChange={(e) => setConteudo(e.target.value)}
                  rows={4}
                />
              </div>
            )}

            {/* Preview */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Preview da Mensagem</span>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-sm whitespace-pre-wrap">
                  {previewText || conteudo || "Digite uma mensagem..."}
                </div>
                {scheduledDate && scheduledTime && (
                  <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    Sera enviada em{" "}
                    {new Date(`${scheduledDate}T${scheduledTime}`).toLocaleString("pt-BR")}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSchedule}
            disabled={!canSchedule || isCreating}
            className="gap-2"
          >
            {isCreating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Agendando...
              </>
            ) : (
              <>
                <Clock className="h-4 w-4" />
                Agendar Mensagem
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
