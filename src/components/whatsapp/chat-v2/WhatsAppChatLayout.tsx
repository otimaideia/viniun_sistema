import { cn } from '@/lib/utils';

interface WhatsAppChatLayoutProps {
  iconSubmenu: React.ReactNode;
  conversationList: React.ReactNode;
  chatArea: React.ReactNode;
  crmPanel: React.ReactNode;
  aiPanel?: React.ReactNode;
  iconSubmenuVisible: boolean;
  crmPanelOpen: boolean;
  aiPanelOpen?: boolean;
  isMobile: boolean;
  isTablet: boolean;
  activePanel: 'list' | 'chat' | 'crm' | 'ai';
}

/**
 * Full-bleed layout that negates the DashboardLayout padding.
 * DashboardLayout applies p-4 sm:p-6 and has h-14 (56px) header on desktop.
 * On mobile, header is also h-14 (56px).
 */
export function WhatsAppChatLayout({
  iconSubmenu,
  conversationList,
  chatArea,
  crmPanel,
  aiPanel,
  iconSubmenuVisible,
  crmPanelOpen,
  aiPanelOpen = false,
  isMobile,
  isTablet,
  activePanel,
}: WhatsAppChatLayoutProps) {
  // Mobile: show one panel at a time
  if (isMobile) {
    return (
      <div className="-m-4 flex h-[calc(100vh-56px)] w-[calc(100%+2rem)] overflow-hidden bg-[#f0f2f5]">
        {activePanel === 'list' && (
          <div className="w-full h-full">{conversationList}</div>
        )}
        {activePanel === 'chat' && (
          <div className="w-full h-full">{chatArea}</div>
        )}
        {activePanel === 'crm' && (
          <div className="w-full h-full">{crmPanel}</div>
        )}
        {activePanel === 'ai' && aiPanel && (
          <div className="w-full h-full">{aiPanel}</div>
        )}
      </div>
    );
  }

  // Desktop/Tablet: multi-column layout
  // Negate DashboardLayout padding: -m-4 sm:-m-6, expand width accordingly
  return (
    <div className={cn(
      "relative flex overflow-hidden bg-[#f0f2f5]",
      "-m-4 sm:-m-6",
      "h-[calc(100vh-56px)]",
      "w-[calc(100%+2rem)] sm:w-[calc(100%+3rem)]"
    )}>
      {/* Column 1: Icon submenu */}
      {iconSubmenuVisible && (
        <div className="flex-shrink-0 h-full">
          {iconSubmenu}
        </div>
      )}

      {/* Column 2: Conversation list */}
      <div className={cn(
        "flex-shrink-0 border-r border-[#e9edef] bg-white h-full overflow-hidden",
        isTablet ? "w-[300px]" : "w-[340px]"
      )}>
        {conversationList}
      </div>

      {/* Column 3: Chat area */}
      <div className="flex-1 min-w-0 h-full overflow-hidden">
        {chatArea}
      </div>

      {/* Column 4: Right Panel (CRM or AI - mutually exclusive) */}
      {(crmPanelOpen || aiPanelOpen) && (
        <div className={cn(
          "flex-shrink-0 border-l border-[#e9edef] bg-white h-full overflow-hidden",
          isTablet
            ? "absolute right-0 top-0 z-40 h-full w-[340px] shadow-xl"
            : "w-[360px]"
        )}>
          {aiPanelOpen && aiPanel ? aiPanel : crmPanel}
        </div>
      )}
    </div>
  );
}
