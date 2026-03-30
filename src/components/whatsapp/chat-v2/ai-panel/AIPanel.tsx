import { useState, useCallback } from 'react';
import { Sparkles, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AIPanelHeader } from './AIPanelHeader';
import { AgentSelector } from './AgentSelector';
import { AnalysisResults } from './AnalysisResults';
import { SuggestionsList } from './SuggestionsList';
import { AnalysisHistory } from './AnalysisHistory';
import { useAIAgentsMT } from '@/hooks/multitenant/useAIAgentsMT';
import { useAIAnalysisMT } from '@/hooks/multitenant/useAIAnalysisMT';
import { toast } from 'sonner';
import type { AIAgent, AIAgentAnalysis } from '@/types/ai-agent';
import type { WhatsAppMensagem } from '@/types/whatsapp-chat';

interface AIPanelProps {
  conversationId: string | null;
  messages: WhatsAppMensagem[];
  contactName: string | null;
  phone: string | null;
  onClose: () => void;
  onSendSuggestion: (text: string) => Promise<void>;
  onEditSuggestion?: (text: string) => void;
}

export function AIPanel({
  conversationId,
  messages,
  contactName,
  phone,
  onClose,
  onSendSuggestion,
  onEditSuggestion,
}: AIPanelProps) {
  const [selectedAgent, setSelectedAgent] = useState<AIAgent | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [selectedHistoryAnalysis, setSelectedHistoryAnalysis] = useState<AIAgentAnalysis | null>(null);

  const { agents, isLoading: isLoadingAgents } = useAIAgentsMT();
  const {
    latestAnalysis,
    history,
    isLoadingLatest,
    analyze,
    isAnalyzing,
    markSuggestionUsed,
    rateAnalysis,
  } = useAIAnalysisMT(conversationId);

  // The analysis to display (either latest or selected from history)
  const displayedAnalysis = selectedHistoryAnalysis || latestAnalysis;

  const handleAnalyze = useCallback(async () => {
    if (!selectedAgent || !conversationId) return;

    setSelectedHistoryAnalysis(null);

    try {
      await analyze.mutateAsync({
        agentId: selectedAgent.id,
        messages,
      });
      toast.success('Análise concluída');
    } catch {
      // Error handled by the hook
    }
  }, [selectedAgent, conversationId, messages, analyze]);

  const handleSendSuggestion = useCallback(async (text: string) => {
    setIsSending(true);
    try {
      await onSendSuggestion(text);

      // Track which suggestion was used
      if (displayedAnalysis) {
        const suggestion = displayedAnalysis.suggestions?.find(s => s.text === text);
        if (suggestion) {
          markSuggestionUsed.mutate({
            analysisId: displayedAnalysis.id,
            suggestionId: suggestion.id,
          });
        }
      }

      toast.success('Mensagem enviada');
    } catch {
      toast.error('Erro ao enviar mensagem');
    } finally {
      setIsSending(false);
    }
  }, [onSendSuggestion, displayedAnalysis, markSuggestionUsed]);

  const handleEditSuggestion = useCallback((text: string) => {
    if (onEditSuggestion) {
      onEditSuggestion(text);
      toast.success('Texto copiado para o campo de mensagem');
    }
  }, [onEditSuggestion]);

  const handleRateAnalysis = useCallback((wasHelpful: boolean) => {
    if (displayedAnalysis) {
      rateAnalysis.mutate({
        analysisId: displayedAnalysis.id,
        wasHelpful,
      });
    }
  }, [displayedAnalysis, rateAnalysis]);

  const handleSelectHistoryItem = useCallback(async (analysisId: string) => {
    // Fetch the full analysis from the history
    const historyItem = history.find(h => h.id === analysisId);
    if (historyItem) {
      setSelectedHistoryAnalysis(historyItem as AIAgentAnalysis);
      setShowHistory(false);
    }
  }, [history]);

  if (!conversationId) {
    return (
      <div className="flex h-full flex-col bg-white">
        <AIPanelHeader
          onClose={onClose}
          onToggleHistory={() => setShowHistory(!showHistory)}
          showHistory={showHistory}
        />
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center">
            <Sparkles className="h-10 w-10 mx-auto text-gray-200 mb-3" />
            <p className="text-sm text-gray-500">Selecione uma conversa</p>
            <p className="text-xs text-gray-400 mt-1">para usar os agentes IA</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-white">
      <AIPanelHeader
        onClose={onClose}
        onToggleHistory={() => {
          setShowHistory(!showHistory);
          if (!showHistory) setSelectedHistoryAnalysis(null);
        }}
        showHistory={showHistory}
      />

      <div className="flex-1 overflow-y-auto">
        {/* History view */}
        {showHistory ? (
          <AnalysisHistory
            history={history}
            onSelect={handleSelectHistoryItem}
          />
        ) : (
          <>
            {/* Agent selector */}
            <AgentSelector
              agents={agents}
              selectedAgent={selectedAgent}
              onSelect={setSelectedAgent}
              isLoading={isLoadingAgents}
            />

            {/* Analyze button */}
            {selectedAgent && (
              <div className="px-3 pb-3">
                <Button
                  className="w-full gap-2"
                  style={{ backgroundColor: selectedAgent.cor }}
                  onClick={handleAnalyze}
                  disabled={isAnalyzing || messages.length === 0}
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Analisando...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Analisar Conversa ({messages.length} msgs)
                    </>
                  )}
                </Button>

                {/* Contact info */}
                {contactName && (
                  <p className="text-[10px] text-gray-400 text-center mt-1.5">
                    Conversa com {contactName} {phone && `(${phone})`}
                  </p>
                )}
              </div>
            )}

            {/* Separator */}
            {displayedAnalysis && selectedAgent && (
              <div className="border-t border-gray-100" />
            )}

            {/* Loading state */}
            {isAnalyzing && (
              <div className="flex flex-col items-center justify-center p-8 gap-3">
                <div className="relative">
                  <div className="h-12 w-12 rounded-full border-2 border-indigo-100" />
                  <div className="absolute inset-0 h-12 w-12 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-700">Analisando conversa...</p>
                  <p className="text-xs text-gray-400 mt-1">
                    O agente está lendo {messages.length} mensagens
                  </p>
                </div>
              </div>
            )}

            {/* Error state */}
            {analyze.isError && !isAnalyzing && (
              <div className="p-4 mx-3 rounded-lg bg-red-50 border border-red-100">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-red-700">Erro na análise</p>
                    <p className="text-xs text-red-500 mt-0.5">
                      {analyze.error?.message || 'Erro desconhecido'}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2 h-7 text-xs gap-1 border-red-200 text-red-600 hover:bg-red-50"
                      onClick={handleAnalyze}
                    >
                      <RefreshCw className="h-3 w-3" />
                      Tentar novamente
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Results */}
            {displayedAnalysis && displayedAnalysis.status === 'completed' && !isAnalyzing && (
              <>
                <AnalysisResults
                  analysis={displayedAnalysis}
                  onRate={handleRateAnalysis}
                />

                {displayedAnalysis.suggestions && displayedAnalysis.suggestions.length > 0 && (
                  <>
                    <div className="border-t border-gray-100" />
                    <SuggestionsList
                      suggestions={displayedAnalysis.suggestions}
                      onSend={handleSendSuggestion}
                      onEdit={handleEditSuggestion}
                      isSending={isSending}
                      agentColor={selectedAgent?.cor || displayedAnalysis.agent?.cor || '#6366f1'}
                    />
                  </>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
