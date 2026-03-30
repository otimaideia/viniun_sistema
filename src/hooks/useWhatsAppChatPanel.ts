import { useState, useEffect, useCallback } from 'react';

type ActivePanel = 'list' | 'chat' | 'crm' | 'ai';

export function useWhatsAppChatPanel() {
  const [activePanel, setActivePanel] = useState<ActivePanel>('list');
  const [crmPanelOpen, setCrmPanelOpen] = useState(() => window.innerWidth >= 1280);
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [isDesktop, setIsDesktop] = useState(true);

  useEffect(() => {
    const checkBreakpoints = () => {
      const w = window.innerWidth;
      setIsMobile(w < 768);
      setIsTablet(w >= 768 && w < 1024);
      setIsDesktop(w >= 1024);
    };
    checkBreakpoints();
    window.addEventListener('resize', checkBreakpoints);
    return () => window.removeEventListener('resize', checkBreakpoints);
  }, []);

  const selectChat = useCallback((chatId: string | null) => {
    if (chatId) {
      setActivePanel('chat');
    }
  }, []);

  const goBackToList = useCallback(() => {
    setActivePanel('list');
  }, []);

  const toggleCrmPanel = useCallback(() => {
    if (isMobile) {
      setActivePanel(prev => prev === 'crm' ? 'chat' : 'crm');
    } else {
      setCrmPanelOpen(prev => {
        const newVal = !prev;
        if (newVal) setAiPanelOpen(false); // Close AI when CRM opens
        return newVal;
      });
    }
  }, [isMobile]);

  const closeCrmPanel = useCallback(() => {
    if (isMobile) {
      setActivePanel('chat');
    } else {
      setCrmPanelOpen(false);
    }
  }, [isMobile]);

  const toggleAiPanel = useCallback(() => {
    if (isMobile) {
      setActivePanel(prev => prev === 'ai' ? 'chat' : 'ai');
    } else {
      setAiPanelOpen(prev => {
        const newVal = !prev;
        if (newVal) setCrmPanelOpen(false); // Close CRM when AI opens
        return newVal;
      });
    }
  }, [isMobile]);

  const closeAiPanel = useCallback(() => {
    if (isMobile) {
      setActivePanel('chat');
    } else {
      setAiPanelOpen(false);
    }
  }, [isMobile]);

  // Icon submenu visible only on desktop (xl breakpoint)
  const iconSubmenuVisible = isDesktop;

  return {
    activePanel,
    setActivePanel,
    crmPanelOpen,
    setCrmPanelOpen,
    aiPanelOpen,
    setAiPanelOpen,
    isMobile,
    isTablet,
    isDesktop,
    iconSubmenuVisible,
    selectChat,
    goBackToList,
    toggleCrmPanel,
    closeCrmPanel,
    toggleAiPanel,
    closeAiPanel,
  };
}
