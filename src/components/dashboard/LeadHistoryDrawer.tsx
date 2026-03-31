import { useState, useEffect } from "react";
import { Lead, LeadStatus } from "@/types/lead-mt";
import { StatusSelect } from "./StatusSelect";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { 
  Phone, 
  Mail, 
  MapPin, 
  Calendar, 
  MessageCircle, 
  Globe,
  Briefcase,
  Save,
  User,
  Clock,
  CheckCircle,
  PartyPopper,
  FileText,
  Pencil,
  Trash2,
  Send,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { cleanPhoneNumber } from "@/utils/phone";
import { ExtendedLead } from "@/hooks/useLeadsAdapter";

// Interface para mt_lead_activities (histórico)
interface LeadHistory {
  id: string;
  tipo: string;           // action_type → tipo
  descricao: string;      // action_description → descricao
  user_nome: string;      // changed_by_name → user_nome
  created_at: string;     // changed_at → created_at
  status_anterior: string | null;  // old_value → status_anterior
  status_novo: string | null;      // new_value → status_novo
  dados: any;             // dados extras em JSON
}

// Interface para notas (usa mt_lead_activities com tipo = 'note')
interface LeadNote {
  id: string;
  descricao: string;      // note_text → descricao
  user_id: string;        // created_by → user_id
  user_nome: string;      // created_by_name → user_nome
  created_at: string;
}

interface LeadHistoryDrawerProps {
  lead: ExtendedLead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusChange: (id: string, status: LeadStatus, lead_source?: "geral" | "promocao") => void;
  onUpdateLead: (lead: ExtendedLead) => void;
  responsibleName?: string;
}

const ACTION_ICONS: Record<string, any> = {
  "status_changed": Clock,
  "contact_initiated": Phone,
  "scheduled": Calendar,
  "confirmed": CheckCircle,
  "converted": PartyPopper,
  "responsible_changed": User,
  "note_added": FileText,
};

const ACTION_COLORS: Record<string, string> = {
  "status_changed": "bg-primary",
  "contact_initiated": "bg-[#5AC9EF]",
  "scheduled": "bg-[#FFA500]",
  "confirmed": "bg-[#4CAF50]",
  "converted": "bg-[#662E8E]",
  "responsible_changed": "bg-secondary",
  "note_added": "bg-muted-foreground",
};

export function LeadHistoryDrawer({ 
  lead, 
  open, 
  onOpenChange, 
  onStatusChange,
  onUpdateLead,
  responsibleName 
}: LeadHistoryDrawerProps) {
  const [observacoes, setObservacoes] = useState("");
  const [newNote, setNewNote] = useState("");
  const [history, setHistory] = useState<LeadHistory[]>([]);
  const [notes, setNotes] = useState<LeadNote[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isSavingNote, setIsSavingNote] = useState(false);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (lead) {
      setObservacoes(lead.observacoes);
      fetchHistoryAndNotes();
    }
  }, [lead?.id]);

  const fetchHistoryAndNotes = async () => {
    if (!lead) return;
    setIsLoadingHistory(true);

    try {
      // Fetch history (atividades que NÃO são notas)
      const { data: historyData, error: historyError } = await supabase
        .from("mt_lead_activities")
        .select("id, tipo, descricao, user_nome, created_at, status_anterior, status_novo, dados")
        .eq("lead_id", lead.id)
        .neq("tipo", "note")
        .order("created_at", { ascending: false });

      if (historyError) {
        console.error("Error fetching history:", historyError);
      } else {
        setHistory((historyData || []) as LeadHistory[]);
      }

      // Fetch notes (atividades do tipo 'note')
      const { data: notesData, error: notesError } = await supabase
        .from("mt_lead_activities")
        .select("id, descricao, user_id, user_nome, created_at")
        .eq("lead_id", lead.id)
        .eq("tipo", "note")
        .order("created_at", { ascending: false });

      if (notesError) {
        console.error("Error fetching notes:", notesError);
      } else {
        setNotes((notesData || []) as LeadNote[]);
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  if (!lead) return null;

  const handleWhatsApp = () => {
    const cleanPhone = cleanPhoneNumber(lead.telefone);
    const codigoPais = lead.whatsapp_codigo_pais || lead.telefone_codigo_pais || '55';
    const primeiroNome = lead.nome.split(" ")[0];
    const mensagem = encodeURIComponent(
      `Olá ${primeiroNome}! 😊 Tudo bem? Aqui é da Viniun! Vi que você demonstrou interesse nos nossos tratamentos. Posso te ajudar com mais informações?`
    );
    window.open(`https://wa.me/${codigoPais}${cleanPhone}?text=${mensagem}`, "_blank");
  };

  const handleSaveObservacoes = () => {
    onUpdateLead({ ...lead, observacoes });
    toast.success("Observações salvas com sucesso!");
  };

  const handleAddNote = async () => {
    if (!newNote.trim() || !user) return;

    setIsSavingNote(true);
    try {
      const userName = user.email?.split("@")[0] || "Usuário";

      // Inserir nota como atividade do tipo 'note' na tabela mt_lead_activities
      const { error } = await supabase
        .from("mt_lead_activities")
        .insert({
          lead_id: lead.id,
          tipo: "note",
          titulo: "Nota",
          descricao: newNote.trim(),
          user_id: user.id,
          user_nome: userName,
        });

      if (error) throw error;

      setNewNote("");
      fetchHistoryAndNotes();
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["mt-leads"] });
      toast.success("Nota adicionada!");
    } catch (error) {
      console.error("Error adding note:", error);
      toast.error("Erro ao adicionar nota");
    } finally {
      setIsSavingNote(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      const { error } = await supabase
        .from("mt_lead_activities")
        .delete()
        .eq("id", noteId)
        .eq("tipo", "note"); // Garantir que só exclui notas

      if (error) throw error;

      fetchHistoryAndNotes();
      queryClient.invalidateQueries({ queryKey: ["mt-leads"] });
      toast.success("Nota removida!");
    } catch (error) {
      console.error("Error deleting note:", error);
      toast.error("Erro ao remover nota");
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-hidden flex flex-col">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-xl font-semibold flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            {lead.nome}
          </SheetTitle>
          {responsibleName && (
            <Badge variant="secondary" className="w-fit bg-primary/10 text-primary">
              Responsável: {responsibleName}
            </Badge>
          )}
        </SheetHeader>

        <Tabs defaultValue="timeline" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="notas">Notas</TabsTrigger>
            <TabsTrigger value="detalhes">Detalhes</TabsTrigger>
          </TabsList>

          {/* Timeline Tab */}
          <TabsContent value="timeline" className="flex-1 overflow-hidden mt-4">
            <ScrollArea className="h-[calc(100vh-220px)]">
              {isLoadingHistory ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : history.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-2 opacity-30" />
                  <p>Nenhuma ação registrada</p>
                </div>
              ) : (
                <div className="relative pl-6">
                  {/* Vertical line */}
                  <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-border" />

                  {history.map((item, index) => {
                    const Icon = ACTION_ICONS[item.tipo] || Clock;
                    const colorClass = ACTION_COLORS[item.tipo] || "bg-muted";

                    return (
                      <div key={item.id} className="relative pb-6 last:pb-0">
                        {/* Icon dot */}
                        <div className={cn(
                          "absolute -left-6 w-6 h-6 rounded-full flex items-center justify-center",
                          colorClass
                        )}>
                          <Icon className="h-3 w-3 text-white" />
                        </div>

                        <div className="bg-card border rounded-lg p-3 ml-2">
                          <p className="text-sm font-medium">
                            {item.descricao}
                          </p>
                          {item.status_anterior && item.status_novo && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {item.status_anterior} → {item.status_novo}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                            <span>por {item.user_nome || "Sistema"}</span>
                            <span>•</span>
                            <span title={format(new Date(item.created_at), "dd MMM yyyy, HH:mm", { locale: ptBR })}>
                              {formatDistanceToNow(new Date(item.created_at), { addSuffix: true, locale: ptBR })}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* Notes Tab */}
          <TabsContent value="notas" className="flex-1 overflow-hidden mt-4 flex flex-col gap-4">
            {/* Add note */}
            <div className="flex gap-2">
              <Textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Adicionar uma nota..."
                className="min-h-[80px] resize-none flex-1"
              />
              <Button 
                size="icon" 
                onClick={handleAddNote}
                disabled={!newNote.trim() || isSavingNote}
                className="h-[80px] w-12"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>

            <ScrollArea className="flex-1">
              {notes.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-2 opacity-30" />
                  <p>Nenhuma nota adicionada</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {notes.map((note) => (
                    <div key={note.id} className="bg-muted/50 rounded-lg p-3">
                      <p className="text-sm whitespace-pre-wrap">{note.descricao}</p>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{note.user_nome || "Usuário"}</span>
                          <span>•</span>
                          <span>
                            {formatDistanceToNow(new Date(note.created_at), { addSuffix: true, locale: ptBR })}
                          </span>
                        </div>
                        {note.user_id === user?.id && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                            onClick={() => handleDeleteNote(note.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* Details Tab */}
          <TabsContent value="detalhes" className="flex-1 overflow-hidden mt-4">
            <ScrollArea className="h-[calc(100vh-220px)]">
              <div className="space-y-5 pr-4">
                {/* Status */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status atual</span>
                  <StatusSelect 
                    value={lead.status} 
                    onValueChange={(status) => onStatusChange(lead.id, status, lead.lead_source)} 
                  />
                </div>

                <Separator />

                {/* Contact Info */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-foreground">Informações de Contato</h4>
                  <div className="grid gap-2">
                    <div className="flex items-center gap-3 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{lead.telefone}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{lead.email}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{lead.unidade} - {lead.cidade}</span>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Service Info */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-foreground">Detalhes</h4>
                  <div className="grid gap-2">
                    <div className="flex items-center gap-3 text-sm">
                      <Briefcase className="h-4 w-4 text-muted-foreground" />
                      <span>{lead.servico || "Não especificado"}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <Globe className="h-4 w-4 text-muted-foreground" />
                      <span>Origem: {lead.origem || "Não especificada"}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>Cadastro: {format(new Date(lead.created_at), "dd 'de' MMMM 'de' yyyy, HH:mm", { locale: ptBR })}</span>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Observations */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-foreground">Observações Internas</h4>
                  <Textarea
                    value={observacoes}
                    onChange={(e) => setObservacoes(e.target.value)}
                    placeholder="Adicione observações sobre este lead..."
                    className="min-h-[100px] resize-none"
                  />
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    onClick={handleSaveObservacoes}
                    className="w-full"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Salvar Observações
                  </Button>
                </div>

                <Separator />

                {/* WhatsApp Button */}
                <Button 
                  onClick={handleWhatsApp}
                  className="w-full bg-success hover:bg-success/90 text-white"
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Contato via WhatsApp
                </Button>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
