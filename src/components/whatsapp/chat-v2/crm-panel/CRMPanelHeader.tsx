import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getInitials, formatPhone } from "../helpers";
import { cn } from "@/lib/utils";

interface CRMPanelHeaderProps {
  leadName: string | null;
  leadPhone: string | null;
  leadTemperatura: string | null;
  leadFotoUrl?: string | null;
  onClose: () => void;
}

const temperaturaConfig: Record<string, { label: string; className: string }> = {
  quente: { label: "Quente", className: "bg-red-100 text-red-600" },
  morno: { label: "Morno", className: "bg-amber-100 text-amber-600" },
  frio: { label: "Frio", className: "bg-blue-100 text-blue-600" },
};

export function CRMPanelHeader({
  leadName,
  leadPhone,
  leadTemperatura,
  leadFotoUrl,
  onClose,
}: CRMPanelHeaderProps) {
  const initials = getInitials(leadName);
  const formattedPhone = formatPhone(leadPhone);
  const tempConfig = leadTemperatura
    ? temperaturaConfig[leadTemperatura]
    : null;

  return (
    <div className="flex items-center justify-between gap-3 border-b border-[#e9edef] bg-white px-4 py-3 flex-shrink-0">
      {/* Left: avatar + info */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {/* Avatar */}
        <div className="h-[40px] w-[40px] rounded-full bg-[#dfe5e7] flex items-center justify-center flex-shrink-0 text-sm font-bold text-[#667781] overflow-hidden">
          {leadFotoUrl ? (
            <img
              src={leadFotoUrl}
              alt={leadName || "Lead"}
              className="h-full w-full object-cover rounded-full"
            />
          ) : (
            initials
          )}
        </div>

        {/* Name + phone + badge */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium text-[#111b21] truncate leading-tight">
              {leadName || "Sem nome"}
            </h3>
            {tempConfig && (
              <span
                className={cn(
                  "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold flex-shrink-0",
                  tempConfig.className
                )}
              >
                {tempConfig.label}
              </span>
            )}
          </div>
          {formattedPhone && (
            <p className="text-xs text-[#667781] truncate leading-tight mt-0.5">
              {formattedPhone}
            </p>
          )}
        </div>
      </div>

      {/* Right: close button */}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-[#54656f] hover:bg-[#f0f2f5] rounded-full flex-shrink-0"
        onClick={onClose}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
