import { useState, useRef, ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Paperclip,
  FileText,
  Image,
  Camera,
  Mic,
  User,
  BarChart3,
  MapPin,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { ContactDialog, ContactData } from "./ContactDialog";
import { PollDialog, PollData } from "./PollDialog";
import { LocationDialog, LocationData } from "./LocationDialog";

interface AttachmentMenuProps {
  onSendMedia: (file: File, type: "image" | "document" | "audio" | "video", caption?: string) => Promise<{ success: boolean; error?: string }>;
  onSendContact?: (contact: ContactData) => Promise<{ success: boolean; error?: string }>;
  onSendPoll?: (poll: PollData) => Promise<{ success: boolean; error?: string }>;
  onSendLocation?: (location: LocationData) => Promise<{ success: boolean; error?: string }>;
  disabled?: boolean;
}

// Tipos de arquivo aceitos
const ACCEPTED_IMAGE_TYPES = "image/jpeg,image/png,image/gif,image/webp";
const ACCEPTED_VIDEO_TYPES = "video/mp4,video/webm,video/quicktime";
const ACCEPTED_AUDIO_TYPES = "audio/mpeg,audio/mp3,audio/ogg,audio/wav,audio/webm,audio/aac";
const ACCEPTED_DOCUMENT_TYPES = ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar";

// Tamanho máximo (16MB para WAHA)
const MAX_FILE_SIZE = 16 * 1024 * 1024;

interface AttachmentOption {
  id: string;
  icon: React.ElementType;
  label: string;
  color: string;
  bgColor: string;
  accept?: string;
  type?: "image" | "document" | "audio" | "video";
  action?: "dialog";
}

const ATTACHMENT_OPTIONS: AttachmentOption[] = [
  {
    id: "document",
    icon: FileText,
    label: "Documento",
    color: "text-purple-600",
    bgColor: "bg-purple-100",
    accept: ACCEPTED_DOCUMENT_TYPES,
    type: "document",
  },
  {
    id: "photos",
    icon: Image,
    label: "Fotos e vídeos",
    color: "text-blue-600",
    bgColor: "bg-blue-100",
    accept: `${ACCEPTED_IMAGE_TYPES},${ACCEPTED_VIDEO_TYPES}`,
  },
  {
    id: "camera",
    icon: Camera,
    label: "Câmera",
    color: "text-pink-600",
    bgColor: "bg-pink-100",
    accept: "image/*",
  },
  {
    id: "audio",
    icon: Mic,
    label: "Áudio",
    color: "text-orange-600",
    bgColor: "bg-orange-100",
    accept: ACCEPTED_AUDIO_TYPES,
    type: "audio",
  },
  {
    id: "contact",
    icon: User,
    label: "Contato",
    color: "text-cyan-600",
    bgColor: "bg-cyan-100",
    action: "dialog",
  },
  {
    id: "poll",
    icon: BarChart3,
    label: "Enquete",
    color: "text-green-600",
    bgColor: "bg-green-100",
    action: "dialog",
  },
  {
    id: "location",
    icon: MapPin,
    label: "Localização",
    color: "text-red-600",
    bgColor: "bg-red-100",
    action: "dialog",
  },
  // Evento removido - API WAHA não suporta endpoint /api/sendEvent
];

export function AttachmentMenu({
  onSendMedia,
  onSendContact,
  onSendPoll,
  onSendLocation,
  disabled,
}: AttachmentMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [pollDialogOpen, setPollDialogOpen] = useState(false);
  const [locationDialogOpen, setLocationDialogOpen] = useState(false);

  // Refs para inputs de arquivo
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  const validateFile = (file: File, maxSize = MAX_FILE_SIZE): boolean => {
    if (file.size > maxSize) {
      toast.error(`Arquivo muito grande. Máximo: ${maxSize / 1024 / 1024}MB`);
      return false;
    }
    return true;
  };

  const detectMediaType = (file: File): "image" | "video" | "audio" | "document" => {
    if (file.type.startsWith("image/")) return "image";
    if (file.type.startsWith("video/")) return "video";
    if (file.type.startsWith("audio/")) return "audio";
    return "document";
  };

  const handleFileSelect = async (e: ChangeEvent<HTMLInputElement>, option: AttachmentOption) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!validateFile(file)) {
      e.target.value = "";
      return;
    }

    setIsUploading(true);
    setIsOpen(false);

    try {
      const mediaType = option.type || detectMediaType(file);
      const result = await onSendMedia(file, mediaType);

      if (result.success) {
        toast.success("Arquivo enviado com sucesso!");
      } else {
        toast.error(result.error || "Erro ao enviar arquivo");
      }
    } catch (err) {
      toast.error("Erro ao processar arquivo");
      console.error("Erro ao enviar arquivo:", err);
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const handleOptionClick = (option: AttachmentOption) => {
    if (option.action === "dialog") {
      setIsOpen(false);

      switch (option.id) {
        case "contact":
          setContactDialogOpen(true);
          break;
        case "poll":
          setPollDialogOpen(true);
          break;
        case "location":
          setLocationDialogOpen(true);
          break;
      }
    } else if (option.accept) {
      fileInputRefs.current[option.id]?.click();
    }
  };

  const handleSendContact = async (contact: ContactData): Promise<{ success: boolean; error?: string }> => {
    if (!onSendContact) {
      return { success: false, error: "Envio de contato não disponível nesta sessão" };
    }
    return onSendContact(contact);
  };

  const handleSendPoll = async (poll: PollData): Promise<{ success: boolean; error?: string }> => {
    if (!onSendPoll) {
      return { success: false, error: "Envio de enquete não disponível nesta sessão" };
    }
    return onSendPoll(poll);
  };

  const handleSendLocation = async (location: LocationData): Promise<{ success: boolean; error?: string }> => {
    if (!onSendLocation) {
      return { success: false, error: "Envio de localização não disponível nesta sessão" };
    }
    return onSendLocation(location);
  };

  return (
    <>
      {/* Hidden file inputs */}
      {ATTACHMENT_OPTIONS.filter((opt) => opt.accept).map((option) => (
        <input
          key={option.id}
          ref={(el) => (fileInputRefs.current[option.id] = el)}
          type="file"
          accept={option.accept}
          capture={option.id === "camera" ? "environment" : undefined}
          onChange={(e) => handleFileSelect(e, option)}
          className="hidden"
        />
      ))}

      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0"
            disabled={disabled || isUploading}
          >
            {isUploading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Paperclip className="h-5 w-5 text-muted-foreground" />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[280px] p-3"
          side="top"
          align="start"
          sideOffset={8}
        >
          <div className="grid grid-cols-4 gap-3">
            {ATTACHMENT_OPTIONS.map((option) => (
              <button
                key={option.id}
                onClick={() => handleOptionClick(option)}
                className="flex flex-col items-center gap-1.5 p-2 rounded-lg hover:bg-muted transition-colors"
                disabled={disabled || isUploading}
              >
                <div className={`w-11 h-11 rounded-full ${option.bgColor} flex items-center justify-center`}>
                  <option.icon className={`h-5 w-5 ${option.color}`} />
                </div>
                <span className="text-[10px] text-muted-foreground text-center leading-tight">
                  {option.label}
                </span>
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {/* Dialogs */}
      <ContactDialog
        open={contactDialogOpen}
        onOpenChange={setContactDialogOpen}
        onSend={handleSendContact}
      />

      <PollDialog
        open={pollDialogOpen}
        onOpenChange={setPollDialogOpen}
        onSend={handleSendPoll}
      />

      <LocationDialog
        open={locationDialogOpen}
        onOpenChange={setLocationDialogOpen}
        onSend={handleSendLocation}
      />
    </>
  );
}
