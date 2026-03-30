import { useState, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  UserPlus,
  User,
  Users,
  Tag,
  Briefcase,
  GitBranch,
  Trophy,
  ListTodo,
  Clock,
  Calendar,
  Package,
  Shield,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CRMPanelHeader } from "./CRMPanelHeader";
import { LeadInfoCard } from "./LeadInfoCard";
import { LabelsCard } from "./LabelsCard";
import { ServicesCard } from "./ServicesCard";
import { PackagesCard } from "./PackagesCard";
import { FunnelCard } from "./FunnelCard";
import { ClosingCard } from "./ClosingCard";
import { TasksCard } from "./TasksCard";
import { ConversationWindowCard } from "./ConversationWindowCard";
import { ScheduleCard } from "./ScheduleCard";
import { useLeadMT } from "@/hooks/useLeadsMT";
import { wahaApi } from "@/services/waha-api";

interface CRMPanelProps {
  leadId: string | null;
  conversationId: string | null;
  phone: string | null;
  contactName: string | null;
  isGroup?: boolean;
  chatId?: string | null;
  sessionName?: string | null;
  contactAvatar?: string | null;
  onClose: () => void;
  onCreateLead?: (phone: string, name: string | null) => void;
}

type CRMTab = 'lead-info' | 'labels' | 'services' | 'packages' | 'funnel' | 'closing' | 'tasks' | 'window' | 'schedule';

const CRM_TABS: { key: CRMTab; icon: React.ElementType; label: string; color: string }[] = [
  { key: "lead-info", icon: User, label: "Dados", color: "text-blue-600 bg-blue-50" },
  { key: "labels", icon: Tag, label: "Etiquetas", color: "text-purple-600 bg-purple-50" },
  { key: "services", icon: Briefcase, label: "Catálogo", color: "text-emerald-600 bg-emerald-50" },
  { key: "packages", icon: Package, label: "Pacotes", color: "text-violet-600 bg-violet-50" },
  { key: "funnel", icon: GitBranch, label: "Funil", color: "text-orange-600 bg-orange-50" },
  { key: "closing", icon: Trophy, label: "Fechar", color: "text-yellow-600 bg-yellow-50" },
  { key: "tasks", icon: ListTodo, label: "Tarefas", color: "text-pink-600 bg-pink-50" },
  { key: "window", icon: Clock, label: "Janela", color: "text-cyan-600 bg-cyan-50" },
  { key: "schedule", icon: Calendar, label: "Agenda", color: "text-indigo-600 bg-indigo-50" },
];

export function CRMPanel({
  leadId,
  conversationId,
  phone,
  contactName,
  isGroup,
  chatId,
  sessionName,
  contactAvatar,
  onClose,
  onCreateLead,
}: CRMPanelProps) {
  const [activeTab, setActiveTab] = useState<CRMTab>("lead-info");
  const [schedulePrefill, setSchedulePrefill] = useState<{ serviceId: string; serviceName: string } | null>(null);
  const { data: lead, isLoading } = useLeadMT(leadId || undefined);

  // Group chat - show group info with members
  if (isGroup) {
    return (
      <GroupInfoPanel
        contactName={contactName}
        contactAvatar={contactAvatar}
        chatId={chatId}
        sessionName={sessionName}
        onClose={onClose}
      />
    );
  }

  // No conversation selected at all
  if (!leadId && !phone && !conversationId) {
    return (
      <div className="flex h-full flex-col bg-white">
        <CRMPanelHeader
          leadName={null}
          leadPhone={null}
          leadTemperatura={null}
          onClose={onClose}
        />
        <div className="flex flex-1 items-center justify-center p-6">
          <p className="text-sm text-[#667781] text-center">
            Selecione uma conversa para ver o CRM.
          </p>
        </div>
      </div>
    );
  }

  // Conversation selected but no lead -- offer to create
  if (!leadId) {
    return (
      <div className="flex h-full flex-col bg-white">
        <CRMPanelHeader
          leadName={contactName}
          leadPhone={phone}
          leadTemperatura={null}
          onClose={onClose}
        />
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#f0f2f5]">
            <UserPlus className="h-7 w-7 text-[#667781]" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-[#111b21]">
              Nenhum lead vinculado
            </p>
            <p className="mt-1 text-xs text-[#667781]">
              {phone
                ? "Este contato ainda não possui um lead cadastrado no CRM."
                : "Telefone não identificado. Crie um lead manualmente para vincular."}
            </p>
          </div>
          {onCreateLead && (
            <Button
              size="sm"
              className="bg-[#00a884] hover:bg-[#00a884]/90 text-white gap-2"
              onClick={() => onCreateLead(phone || '', contactName)}
            >
              <UserPlus className="h-4 w-4" />
              Criar Lead
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Lead exists -- render full CRM panel with icon tabs
  const currentTab = CRM_TABS.find(t => t.key === activeTab) || CRM_TABS[0];

  return (
    <div className="flex h-full flex-col bg-white">
      <CRMPanelHeader
        leadName={lead?.nome ?? contactName}
        leadPhone={lead?.telefone ?? lead?.whatsapp ?? phone}
        leadTemperatura={lead?.temperatura ?? null}
        leadFotoUrl={contactAvatar || null}
        onClose={onClose}
      />

      {/* Icon Tab Navigation - Grid 5x2 */}
      <TooltipProvider delayDuration={150}>
        <div className="border-b border-[#e9edef] bg-[#fafafa] px-2 py-2 flex-shrink-0">
          <div className="grid grid-cols-5 gap-1">
            {CRM_TABS.map(({ key, icon: Icon, label, color }) => {
              const isActive = activeTab === key;
              const [textColor, bgColor] = color.split(' ');
              return (
                <Tooltip key={key}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => setActiveTab(key)}
                      className={cn(
                        "flex flex-col items-center gap-0.5 rounded-lg px-1 py-1.5 transition-all",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00a884]/50",
                        isActive
                          ? cn("ring-1 ring-current/20 shadow-sm", textColor, bgColor)
                          : "text-[#667781] hover:bg-[#f0f2f5] hover:text-[#111b21]"
                      )}
                    >
                      <Icon className={cn("h-5 w-5", isActive && textColor)} />
                      <span className={cn(
                        "text-[10px] font-medium leading-none",
                        isActive ? textColor : "text-[#8696a0]"
                      )}>
                        {label}
                      </span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                    {label}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </div>
      </TooltipProvider>

      {/* Active tab content */}
      <ScrollArea className="flex-1">
        <div className="p-3">
          <CRMTabContent
            tabKey={activeTab}
            leadId={leadId!}
            conversationId={conversationId}
            chatId={chatId}
            sessionName={sessionName}
            lead={lead}
            isLoading={isLoading}
            phone={phone}
            contactName={contactName}
            onSwitchTab={setActiveTab}
            onSaleWithSessions={(serviceId, serviceName) => {
              setSchedulePrefill({ serviceId, serviceName });
              setActiveTab("schedule");
            }}
            schedulePrefill={schedulePrefill}
          />
        </div>
      </ScrollArea>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Internal: renders the correct card based on the active tab
// ---------------------------------------------------------------------------

interface CRMTabContentProps {
  tabKey: CRMTab;
  leadId: string;
  conversationId: string | null;
  chatId?: string | null;
  sessionName?: string | null;
  lead: any;
  isLoading: boolean;
  phone?: string | null;
  contactName?: string | null;
  onSwitchTab?: (tab: CRMTab) => void;
  onSaleWithSessions?: (serviceId: string, serviceName: string) => void;
  schedulePrefill?: { serviceId: string; serviceName: string } | null;
}

function CRMTabContent({
  tabKey,
  leadId,
  conversationId,
  chatId,
  sessionName,
  lead,
  isLoading,
  phone,
  contactName,
  onSwitchTab,
  onSaleWithSessions,
  schedulePrefill,
}: CRMTabContentProps) {
  switch (tabKey) {
    case "lead-info":
      return <LeadInfoCard leadId={leadId} lead={lead} isLoading={isLoading} conversationId={conversationId} />;
    case "labels":
      return <LabelsCard leadId={leadId} conversationId={conversationId} sessionName={sessionName} chatId={chatId} />;
    case "services":
      return <ServicesCard leadId={leadId} lead={lead} />;
    case "packages":
      return <PackagesCard leadId={leadId} lead={lead} />;
    case "funnel":
      return <FunnelCard leadId={leadId} lead={lead} />;
    case "closing":
      return <ClosingCard leadId={leadId} lead={lead} conversationId={conversationId} phone={phone || undefined} contactName={contactName || undefined} onSaleCompleted={onSaleWithSessions ? undefined : (onSwitchTab ? () => onSwitchTab("schedule") : undefined)} onSaleWithSchedule={onSaleWithSessions} />;
    case "tasks":
      return <TasksCard leadId={leadId} />;
    case "window":
      return <ConversationWindowCard conversationId={conversationId} />;
    case "schedule":
      return <ScheduleCard leadId={leadId} lead={lead} prefillServiceId={schedulePrefill?.serviceId} prefillServiceName={schedulePrefill?.serviceName} />;
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Group Info Panel - Shows group details and members list
// ---------------------------------------------------------------------------

interface GroupMember {
  id: string;
  name?: string;
  admin?: string | null;
}

interface GroupInfoPanelProps {
  contactName: string | null;
  contactAvatar?: string | null;
  chatId?: string | null;
  sessionName?: string | null;
  onClose: () => void;
}

function GroupInfoPanel({
  contactName,
  contactAvatar,
  chatId,
  sessionName,
  onClose,
}: GroupInfoPanelProps) {
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [description, setDescription] = useState<string | null>(null);

  useEffect(() => {
    if (!chatId || !sessionName) return;

    const fetchGroupInfo = async () => {
      setIsLoadingMembers(true);
      try {
        const config = wahaApi.getConfig();
        if (!config.isConfigured) return;

        const response = await fetch(
          `${config.apiUrl}/api/${sessionName}/groups/${chatId}`,
          { headers: { 'X-Api-Key': config.apiKey || '' } }
        );

        if (response.ok) {
          const data = await response.json();
          const participants = (data.participants || []).map((p: any) => ({
            id: p.id || '',
            name: p.name || p.pushName || undefined,
            admin: p.admin || null,
          }));
          setMembers(participants);
          setDescription(data.desc || data.description || null);
        }
      } catch (err) {
        console.error('[GroupInfo] Erro ao buscar membros:', err);
      } finally {
        setIsLoadingMembers(false);
      }
    };

    fetchGroupInfo();
  }, [chatId, sessionName]);

  const admins = members.filter(m => m.admin === 'admin' || m.admin === 'superadmin');
  const regularMembers = members.filter(m => !m.admin || m.admin === 'regular');

  return (
    <div className="flex h-full flex-col bg-white">
      <CRMPanelHeader
        leadName={contactName}
        leadPhone={null}
        leadTemperatura={null}
        onClose={onClose}
      />

      <ScrollArea className="flex-1">
        {/* Group avatar + name */}
        <div className="flex flex-col items-center gap-3 border-b border-[#e9edef] p-6">
          <div className="h-20 w-20 rounded-full bg-[#00a884]/10 flex items-center justify-center overflow-hidden">
            {contactAvatar ? (
              <img
                src={contactAvatar}
                alt={contactName || 'Grupo'}
                className="h-full w-full object-cover rounded-full"
              />
            ) : (
              <Users className="h-9 w-9 text-[#00a884]" />
            )}
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-[#111b21]">
              {contactName || 'Grupo'}
            </p>
            <p className="mt-0.5 text-xs text-[#667781]">
              Grupo · {members.length > 0 ? `${members.length} participantes` : 'Carregando...'}
            </p>
          </div>
          {description && (
            <p className="text-xs text-[#667781] text-center max-w-[220px] line-clamp-3">
              {description}
            </p>
          )}
        </div>

        {/* Members list */}
        <div className="p-3">
          <p className="text-xs font-medium text-[#008069] mb-2 px-1">
            {members.length > 0
              ? `${members.length} participantes`
              : isLoadingMembers ? 'Carregando...' : 'Nenhum participante'}
          </p>

          {isLoadingMembers && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-[#00a884]" />
            </div>
          )}

          {/* Admins first */}
          {admins.map((member) => (
            <GroupMemberItem key={member.id} member={member} isAdmin />
          ))}

          {/* Regular members */}
          {regularMembers.map((member) => (
            <GroupMemberItem key={member.id} member={member} />
          ))}
        </div>

        {/* Footer note */}
        <div className="border-t border-[#e9edef] p-4">
          <p className="text-[11px] text-[#8696a0] text-center">
            Grupos não possuem vinculação com leads no CRM.
          </p>
        </div>
      </ScrollArea>
    </div>
  );
}

function GroupMemberItem({ member, isAdmin = false }: { member: GroupMember; isAdmin?: boolean }) {
  // Extract display name from @lid IDs or use name
  const displayId = member.id.replace(/@.*$/, '');
  const displayName = member.name || (displayId.length <= 13 ? displayId : `Participante`);

  return (
    <div className="flex items-center gap-2.5 px-1 py-2 rounded-md hover:bg-[#f5f6f6]">
      <div className="h-8 w-8 rounded-full bg-[#dfe5e7] flex items-center justify-center flex-shrink-0 text-[11px] font-bold text-[#667781]">
        {displayName.substring(0, 2).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-[#111b21] truncate">
          {displayName}
        </p>
      </div>
      {isAdmin && (
        <span className="flex items-center gap-0.5 text-[10px] text-[#00a884] bg-[#e7f8f0] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0">
          <Shield className="h-2.5 w-2.5" />
          Admin
        </span>
      )}
    </div>
  );
}
