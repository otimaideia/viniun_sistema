import { useState, useEffect, KeyboardEvent, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2, X, Reply } from "lucide-react";
import { MessageTemplates } from "./MessageTemplates";
import { EmojiPicker } from "./EmojiPicker";
import { AttachmentMenu } from "./AttachmentMenu";
import { AudioRecorder } from "./AudioRecorder";
import { SlashCommandMenu, type SlashCommand, defaultCommands } from "./SlashCommandMenu";
import { DynamicFieldMenu, dynamicFields, type LeadFieldData, type DynamicField } from "./DynamicFieldMenu";
import { ContactData } from "./ContactDialog";
import { PollData } from "./PollDialog";
import { LocationData } from "./LocationDialog";
import { EventData } from "./EventDialog";
import { toast } from "sonner";

export interface ReplyPreview {
  id: string;
  body?: string | null;
  from_me?: boolean;
  senderName?: string | null;
}

interface ChatInputProps {
  onSend: (message: string, quotedId?: string) => Promise<{ success: boolean; error?: string }>;
  onSendMedia?: (file: File, type: "image" | "document" | "audio" | "video", caption?: string) => Promise<{ success: boolean; error?: string }>;
  onSendContact?: (contact: ContactData) => Promise<{ success: boolean; error?: string }>;
  onSendPoll?: (poll: PollData) => Promise<{ success: boolean; error?: string }>;
  onSendLocation?: (location: LocationData) => Promise<{ success: boolean; error?: string }>;
  onSendEvent?: (event: EventData) => Promise<{ success: boolean; error?: string }>;
  disabled?: boolean;
  canSend?: boolean;
  leadData?: LeadFieldData | null;
  onSlashCommand?: (action: string) => void;
  replyToMessage?: ReplyPreview | null;
  onCancelReply?: () => void;
  conversationId?: string | null;
}

const MAX_MESSAGE_LENGTH = 65000;

export function ChatInput({
  onSend,
  onSendMedia,
  onSendContact,
  onSendPoll,
  onSendLocation,
  onSendEvent,
  disabled,
  canSend = true,
  leadData,
  onSlashCommand,
  replyToMessage,
  onCancelReply,
  conversationId,
}: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  // Ref para evitar memory leak: não atualizar estado após unmount
  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  // Draft messages: restore on conversation change, save on type
  const draftTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!conversationId) return;
    const draft = localStorage.getItem(`whatsapp-draft-${conversationId}`);
    if (draft) {
      setMessage(draft);
    } else {
      setMessage('');
    }
  }, [conversationId]);

  useEffect(() => {
    if (!conversationId) return;
    if (draftTimeoutRef.current) clearTimeout(draftTimeoutRef.current);
    draftTimeoutRef.current = setTimeout(() => {
      if (message.trim()) {
        localStorage.setItem(`whatsapp-draft-${conversationId}`, message);
      } else {
        localStorage.removeItem(`whatsapp-draft-${conversationId}`);
      }
    }, 500);
    return () => {
      if (draftTimeoutRef.current) clearTimeout(draftTimeoutRef.current);
    };
  }, [message, conversationId]);

  // Slash command state
  const [slashMenuOpen, setSlashMenuOpen] = useState(false);
  const [slashFilter, setSlashFilter] = useState("");
  const [slashSelectedIndex, setSlashSelectedIndex] = useState(0);

  // Dynamic field state
  const [fieldMenuOpen, setFieldMenuOpen] = useState(false);
  const [fieldFilter, setFieldFilter] = useState("");
  const [fieldSelectedIndex, setFieldSelectedIndex] = useState(0);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const menuContainerRef = useRef<HTMLDivElement>(null);

  // Listen for AI suggestion edit events
  useEffect(() => {
    const handleAiSuggestion = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.text) {
        setMessage(detail.text);
        textareaRef.current?.focus();
      }
    };
    window.addEventListener('ai-suggestion-edit', handleAiSuggestion);
    return () => window.removeEventListener('ai-suggestion-edit', handleAiSuggestion);
  }, []);

  // Click-outside handler para fechar menus
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        menuContainerRef.current &&
        !menuContainerRef.current.contains(e.target as Node) &&
        (slashMenuOpen || fieldMenuOpen)
      ) {
        closeMenus();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [slashMenuOpen, fieldMenuOpen]);

  const handleSend = async () => {
    if (!message.trim() || isSending || disabled || !canSend) return;

    setIsSending(true);
    try {
      const result = await onSend(message, replyToMessage?.id);
      if (!isMountedRef.current) return;
      if (result.success) {
        setMessage("");
        if (conversationId) localStorage.removeItem(`whatsapp-draft-${conversationId}`);
        onCancelReply?.();
      } else {
        toast.error(result.error || "Erro ao enviar mensagem");
      }
    } catch (err) {
      if (!isMountedRef.current) return;
      toast.error("Erro ao enviar mensagem");
      console.error('[ChatInput] handleSend error:', err);
    } finally {
      if (isMountedRef.current) {
        setIsSending(false);
        textareaRef.current?.focus();
      }
    }
  };

  const closeMenus = useCallback(() => {
    setSlashMenuOpen(false);
    setSlashFilter("");
    setSlashSelectedIndex(0);
    setFieldMenuOpen(false);
    setFieldFilter("");
    setFieldSelectedIndex(0);
  }, []);

  const getFilteredSlashCount = useCallback(() => {
    return defaultCommands.filter(cmd =>
      cmd.label.toLowerCase().includes(slashFilter.toLowerCase()) ||
      cmd.description.toLowerCase().includes(slashFilter.toLowerCase())
    ).length;
  }, [slashFilter]);

  const getFilteredFieldCount = useCallback(() => {
    return dynamicFields.filter(f =>
      f.label.toLowerCase().includes(fieldFilter.toLowerCase()) ||
      f.key.toLowerCase().includes(fieldFilter.toLowerCase())
    ).length;
  }, [fieldFilter]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // If slash or field menu is open, handle navigation
    if (slashMenuOpen) {
      const count = getFilteredSlashCount();
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSlashSelectedIndex(prev => (prev - 1 + count) % count);
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSlashSelectedIndex(prev => (prev + 1) % count);
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        const filtered = defaultCommands.filter(cmd =>
          cmd.label.toLowerCase().includes(slashFilter.toLowerCase()) ||
          cmd.description.toLowerCase().includes(slashFilter.toLowerCase())
        );
        if (filtered[slashSelectedIndex]) {
          handleSlashSelect(filtered[slashSelectedIndex]);
        }
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        closeMenus();
        return;
      }
    }

    if (fieldMenuOpen) {
      const count = getFilteredFieldCount();
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFieldSelectedIndex(prev => (prev - 1 + count) % count);
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFieldSelectedIndex(prev => (prev + 1) % count);
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        const filtered = dynamicFields.filter(f =>
          f.label.toLowerCase().includes(fieldFilter.toLowerCase()) ||
          f.key.toLowerCase().includes(fieldFilter.toLowerCase())
        );
        if (filtered[fieldSelectedIndex]) {
          const field = filtered[fieldSelectedIndex];
          const value = leadData?.[field.key] || `[${field.label}]`;
          handleFieldSelect(field, value);
        }
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        closeMenus();
        return;
      }
    }

    // Normal Enter = send
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChange = (value: string) => {
    // Validação de comprimento máximo (limite WhatsApp: ~65536 chars)
    if (value.length > MAX_MESSAGE_LENGTH) return;

    setMessage(value);

    const lines = value.split('\n');
    const lastLine = lines[lines.length - 1];
    const bracketMatch = value.match(/\[([^\]]*)$/);

    // Detect "/" at beginning of line → slash commands
    if (lastLine.startsWith('/')) {
      setSlashMenuOpen(true);
      setSlashFilter(lastLine.slice(1));
      setSlashSelectedIndex(0);
      setFieldMenuOpen(false);
      return;
    }

    // Close slash menu if no longer starting with "/"
    if (slashMenuOpen) {
      setSlashMenuOpen(false);
      setSlashFilter("");
    }

    // Detect "[" for dynamic fields
    if (bracketMatch) {
      setFieldMenuOpen(true);
      setFieldFilter(bracketMatch[1]);
      setFieldSelectedIndex(0);
    } else if (fieldMenuOpen) {
      setFieldMenuOpen(false);
      setFieldFilter("");
    }
  };

  const handleSlashSelect = (command: SlashCommand) => {
    // Remove the slash command from message
    const lines = message.split('\n');
    lines[lines.length - 1] = '';
    setMessage(lines.join('\n').trimEnd());
    closeMenus();

    // Execute command
    if (onSlashCommand) {
      onSlashCommand(command.action);
    } else {
      // Default actions
      switch (command.action) {
        case 'open_templates':
          toast.info('Use o botao de templates ao lado');
          break;
        case 'add_note':
          toast.info('Nota interna sera implementada em breve');
          break;
        case 'create_appointment':
          toast.info('Redirecionando para agendamento...');
          break;
        case 'transfer':
          toast.info('Transferencia sera implementada em breve');
          break;
        default:
          toast.info(`Comando: ${command.label}`);
      }
    }

    textareaRef.current?.focus();
  };

  const handleFieldSelect = (field: DynamicField, value: string) => {
    // Replace the "[filter" part with the actual value
    const newMessage = message.replace(/\[([^\]]*)$/, value);
    setMessage(newMessage);
    closeMenus();
    textareaRef.current?.focus();
  };

  const handleEmojiSelect = (emoji: string) => {
    setMessage(prev => prev + emoji);
    textareaRef.current?.focus();
  };

  const handleTemplateSelect = (content: string) => {
    setMessage(content);
    textareaRef.current?.focus();
  };

  const handleSendAudio = async (audioBlob: Blob): Promise<{ success: boolean; error?: string }> => {
    if (!onSendMedia) {
      return { success: false, error: "Envio de mídia não disponível" };
    }

    // Convert Blob to File
    const file = new File([audioBlob], `audio_${Date.now()}.webm`, {
      type: audioBlob.type || "audio/webm",
    });

    return onSendMedia(file, "audio");
  };

  const handleSendMedia = async (
    file: File,
    type: "image" | "document" | "audio" | "video",
    caption?: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!onSendMedia) {
      return { success: false, error: "Envio de mídia não disponível" };
    }
    return onSendMedia(file, type, caption);
  };

  const isDisabled = disabled || !canSend;

  // AudioRecorder has 3 visual modes: mic button, recording bar, preview bar.
  // We keep ONE instance to preserve MediaRecorder state across re-renders.
  return (
    <div className="border-t bg-card">
      {/* Reply preview banner */}
      {replyToMessage && (
        <div className="flex items-center gap-2 px-3 pt-2 pb-1 bg-[#f0f0f0] dark:bg-muted border-b">
          <Reply className="h-4 w-4 text-green-600 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-green-700 truncate">
              {replyToMessage.from_me ? 'Você' : (replyToMessage.senderName || 'Contato')}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {replyToMessage.body || '📎 Mídia'}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0"
            onClick={onCancelReply}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}
      <div className="flex items-center gap-2 p-3">
        {/* Hide other elements when recording/previewing audio */}
        {!isRecording && (
          <>
            {/* Emoji picker */}
            <EmojiPicker
              onEmojiSelect={handleEmojiSelect}
              disabled={isDisabled}
            />

            {/* Attachment menu */}
            <AttachmentMenu
              onSendMedia={handleSendMedia}
              onSendContact={onSendContact}
              onSendPoll={onSendPoll}
              onSendLocation={onSendLocation}
              onSendEvent={onSendEvent}
              disabled={isDisabled || !onSendMedia}
            />

            {/* Message Templates */}
            <MessageTemplates onSelectTemplate={handleTemplateSelect} />

            {/* Message input with menus */}
            <div className="flex-1 relative" ref={menuContainerRef}>
              {/* Slash Command Menu */}
              <SlashCommandMenu
                filter={slashFilter}
                isOpen={slashMenuOpen}
                onSelect={handleSlashSelect}
                onClose={() => { setSlashMenuOpen(false); setSlashFilter(""); }}
                selectedIndex={slashSelectedIndex}
              />

              {/* Dynamic Field Menu */}
              <DynamicFieldMenu
                filter={fieldFilter}
                isOpen={fieldMenuOpen}
                leadData={leadData || null}
                onSelect={handleFieldSelect}
                onClose={() => { setFieldMenuOpen(false); setFieldFilter(""); }}
                selectedIndex={fieldSelectedIndex}
              />

              <Textarea
                ref={textareaRef}
                value={message}
                onChange={(e) => handleChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={canSend ? 'Digite uma mensagem... (/ para comandos, [ para campos)' : "Você não tem permissão para enviar mensagens"}
                className="min-h-[40px] max-h-[120px] resize-none pr-4"
                rows={1}
                disabled={isDisabled || isSending}
              />
            </div>

            {/* Send button - only when there's text */}
            {message.trim() && (
              <Button
                onClick={handleSend}
                size="icon"
                className="shrink-0 bg-green-600 hover:bg-green-700"
                disabled={isDisabled || isSending}
              >
                {isSending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            )}
          </>
        )}

        {/* Audio recorder - ONE instance always mounted when no text or recording */}
        {(!message.trim() || isRecording) && (
          <AudioRecorder
            onSend={handleSendAudio}
            disabled={isRecording ? isDisabled : (isDisabled || !onSendMedia)}
            onRecordingChange={setIsRecording}
          />
        )}
      </div>
    </div>
  );
}
