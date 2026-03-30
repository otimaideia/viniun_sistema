import { useState, useMemo, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Search, MessageSquare, User, Phone, Check, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useWhatsAppSessionsAdapter } from "@/hooks/useWhatsAppSessionsAdapter";
import { useWahaConfigAdapter } from "@/hooks/useWahaConfigAdapter";
import { wahaApi } from "@/services/waha-api";
import type { MarketingTemplate } from "@/types/marketing";
import type { WhatsAppSessao } from "@/types/whatsapp-sessao";

interface SendTemplateModalProps {
  template: MarketingTemplate;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialVarValues?: Record<string, string>;
}

interface WahaChat {
  id: string;
  name: string;
  picture?: string;
  lastMessage?: {
    body: string;
    timestamp: number;
  };
}

export function SendTemplateModal({
  template,
  open,
  onOpenChange,
  initialVarValues = {},
}: SendTemplateModalProps) {
  // State
  const [selectedSessaoId, setSelectedSessaoId] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedChat, setSelectedChat] = useState<WahaChat | null>(null);
  const [manualPhone, setManualPhone] = useState("");
  const [varValues, setVarValues] = useState<Record<string, string>>(initialVarValues);
  const [chats, setChats] = useState<WahaChat[]>([]);
  const [isLoadingChats, setIsLoadingChats] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [contactMode, setContactMode] = useState<"search" | "manual">("search");

  // Hooks
  const { sessions, isLoading: isLoadingSessoes } = useWhatsAppSessionsAdapter();
  const { config } = useWahaConfigAdapter();

  // Filter active sessions only
  const activeSessoes = useMemo(() => {
    return sessions.filter((s) => s.status === "working" && s.is_active);
  }, [sessions]);

  // Selected session object
  const selectedSessao = useMemo(() => {
    return sessions.find((s) => s.id === selectedSessaoId);
  }, [sessions, selectedSessaoId]);

  // Extract variables from template
  const extractedVariables = useMemo(() => {
    const regex = /\{([^}]+)\}/g;
    const matches = template.template_content.matchAll(regex);
    const vars = new Set<string>();
    for (const match of matches) {
      vars.add(match[1]);
    }
    return Array.from(vars);
  }, [template.template_content]);

  // Generate preview text with variable substitution
  const previewText = useMemo(() => {
    let text = template.template_content;
    Object.entries(varValues).forEach(([key, value]) => {
      const regex = new RegExp(`\\{${key}\\}`, "g");
      text = text.replace(regex, value || `{${key}}`);
    });
    return text;
  }, [template.template_content, varValues]);

  // Check if all required variables are filled
  const allVariablesFilled = useMemo(() => {
    return extractedVariables.every((v) => varValues[v]?.trim());
  }, [extractedVariables, varValues]);

  // Filter chats by search term
  const filteredChats = useMemo(() => {
    if (!searchTerm.trim()) return chats.slice(0, 20);
    const term = searchTerm.toLowerCase();
    return chats
      .filter(
        (chat) =>
          chat.name?.toLowerCase().includes(term) ||
          chat.id.toLowerCase().includes(term)
      )
      .slice(0, 20);
  }, [chats, searchTerm]);

  // Configure WAHA API when config changes
  useEffect(() => {
    if (config?.api_url && config?.api_key) {
      wahaApi.setConfig(config.api_url, config.api_key);
    }
  }, [config]);

  // Load chats when session is selected
  useEffect(() => {
    if (!selectedSessao?.session_name || !config?.api_url) return;

    const loadChats = async () => {
      setIsLoadingChats(true);
      try {
        const rawChats = await wahaApi.getChats(selectedSessao.session_name, 100);
        const formattedChats: WahaChat[] = (rawChats as unknown[]).map((chat: unknown) => {
          const c = chat as Record<string, unknown>;
          return {
            id: String(c.id || ""),
            name: String(c.name || c.id || ""),
            picture: c.picture ? String(c.picture) : undefined,
            lastMessage: c.lastMessage
              ? {
                  body: String((c.lastMessage as Record<string, unknown>).body || ""),
                  timestamp: Number((c.lastMessage as Record<string, unknown>).timestamp || 0),
                }
              : undefined,
          };
        });
        setChats(formattedChats);
      } catch (error) {
        console.error("Erro ao carregar chats:", error);
        toast.error("Erro ao carregar contatos da sessao");
      } finally {
        setIsLoadingChats(false);
      }
    };

    loadChats();
  }, [selectedSessao?.session_name, config?.api_url]);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (open) {
      setVarValues(initialVarValues);
      setSelectedChat(null);
      setManualPhone("");
      setSearchTerm("");
      // Auto-select first active session
      if (activeSessoes.length > 0 && !selectedSessaoId) {
        setSelectedSessaoId(activeSessoes[0].id);
      }
    }
  }, [open, initialVarValues, activeSessoes, selectedSessaoId]);

  const handleVarChange = (varName: string, value: string) => {
    setVarValues((prev) => ({ ...prev, [varName]: value }));
  };

  const formatPhoneNumber = (phone: string): string => {
    // Remove all non-digits
    let cleaned = phone.replace(/\D/g, "");
    // Add Brazil code if not present
    if (!cleaned.startsWith("55")) {
      cleaned = "55" + cleaned;
    }
    // Format as WhatsApp chatId
    return cleaned + "@c.us";
  };

  const handleSend = async () => {
    if (!selectedSessao?.session_name) {
      toast.error("Selecione uma sessao WhatsApp");
      return;
    }

    const chatId = contactMode === "manual"
      ? formatPhoneNumber(manualPhone)
      : selectedChat?.id;

    if (!chatId) {
      toast.error("Selecione um contato ou digite um numero");
      return;
    }

    if (extractedVariables.length > 0 && !allVariablesFilled) {
      toast.error("Preencha todas as variaveis do template");
      return;
    }

    setIsSending(true);
    try {
      await wahaApi.sendText({
        session: selectedSessao.session_name,
        chatId: chatId,
        text: previewText,
      });

      toast.success("Mensagem enviada com sucesso!");
      onOpenChange(false);
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
      toast.error("Erro ao enviar mensagem. Verifique a conexao da sessao.");
    } finally {
      setIsSending(false);
    }
  };

  const hasVariables = extractedVariables.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-green-600" />
            Enviar Template via WhatsApp
          </DialogTitle>
          <DialogDescription>
            Envie o template "{template.nome_template}" para um contato via WhatsApp
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6">
            {/* Step 1: Select Session */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="rounded-full">1</Badge>
                <Label className="font-medium">Selecionar Sessao WhatsApp</Label>
              </div>

              {isLoadingSessoes ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Carregando sessoes...
                </div>
              ) : activeSessoes.length === 0 ? (
                <div className="flex items-center gap-2 text-amber-600 bg-amber-50 p-3 rounded-lg">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm">
                    Nenhuma sessao WhatsApp conectada. Conecte uma sessao primeiro.
                  </span>
                </div>
              ) : (
                <Select value={selectedSessaoId} onValueChange={setSelectedSessaoId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma sessao" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeSessoes.map((sessao) => (
                      <SelectItem key={sessao.id} value={sessao.id}>
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-green-500" />
                          {sessao.nome}
                          {sessao.franqueado?.nome_fantasia && (
                            <span className="text-muted-foreground">
                              ({sessao.franqueado.nome_fantasia})
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <Separator />

            {/* Step 2: Select Contact */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="rounded-full">2</Badge>
                  <Label className="font-medium">Selecionar Contato</Label>
                </div>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant={contactMode === "search" ? "default" : "outline"}
                    onClick={() => setContactMode("search")}
                  >
                    <Search className="h-4 w-4 mr-1" />
                    Buscar
                  </Button>
                  <Button
                    size="sm"
                    variant={contactMode === "manual" ? "default" : "outline"}
                    onClick={() => setContactMode("manual")}
                  >
                    <Phone className="h-4 w-4 mr-1" />
                    Digitar
                  </Button>
                </div>
              </div>

              {contactMode === "manual" ? (
                <div className="space-y-2">
                  <Label htmlFor="phone">Numero do WhatsApp</Label>
                  <Input
                    id="phone"
                    placeholder="Ex: 11999999999"
                    value={manualPhone}
                    onChange={(e) => setManualPhone(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Digite o numero com DDD, sem o 55. Ex: 11999999999
                  </p>
                </div>
              ) : (
                <>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar contato..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9"
                      disabled={!selectedSessaoId}
                    />
                  </div>

                  {isLoadingChats ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : selectedSessaoId && filteredChats.length > 0 ? (
                    <div className="border rounded-lg divide-y max-h-[200px] overflow-y-auto">
                      {filteredChats.map((chat) => (
                        <button
                          key={chat.id}
                          onClick={() => setSelectedChat(chat)}
                          className={`w-full p-3 text-left hover:bg-muted/50 transition-colors flex items-center gap-3 ${
                            selectedChat?.id === chat.id ? "bg-primary/10" : ""
                          }`}
                        >
                          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                            {chat.picture ? (
                              <img
                                src={chat.picture}
                                alt={chat.name}
                                className="h-10 w-10 rounded-full object-cover"
                              />
                            ) : (
                              <User className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{chat.name}</p>
                            {chat.lastMessage && (
                              <p className="text-xs text-muted-foreground truncate">
                                {chat.lastMessage.body}
                              </p>
                            )}
                          </div>
                          {selectedChat?.id === chat.id && (
                            <Check className="h-5 w-5 text-primary" />
                          )}
                        </button>
                      ))}
                    </div>
                  ) : selectedSessaoId ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      {searchTerm
                        ? "Nenhum contato encontrado"
                        : "Nenhum chat disponivel"}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Selecione uma sessao para buscar contatos
                    </p>
                  )}
                </>
              )}
            </div>

            {/* Step 3: Fill Variables (if any) */}
            {hasVariables && (
              <>
                <Separator />
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="rounded-full">3</Badge>
                    <Label className="font-medium">Preencher Variaveis</Label>
                  </div>
                  <div className="grid grid-cols-2 gap-3 p-4 bg-muted/50 rounded-lg">
                    {extractedVariables.map((varName) => (
                      <div key={varName} className="space-y-1">
                        <Label htmlFor={`var-${varName}`} className="text-xs">
                          {`{${varName}}`}
                        </Label>
                        <Input
                          id={`var-${varName}`}
                          value={varValues[varName] || ""}
                          onChange={(e) => handleVarChange(varName, e.target.value)}
                          placeholder={`Digite ${varName}...`}
                          className="h-8 text-sm"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            <Separator />

            {/* Preview */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="rounded-full">
                  {hasVariables ? "4" : "3"}
                </Badge>
                <Label className="font-medium">Preview da Mensagem</Label>
              </div>
              <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                <div className="flex items-start gap-2">
                  <MessageSquare className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm whitespace-pre-wrap">{previewText}</p>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="mt-4 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSend}
            disabled={
              isSending ||
              !selectedSessaoId ||
              (contactMode === "manual" ? !manualPhone : !selectedChat) ||
              (hasVariables && !allVariablesFilled)
            }
            className="gap-2"
          >
            {isSending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Enviar Mensagem
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
