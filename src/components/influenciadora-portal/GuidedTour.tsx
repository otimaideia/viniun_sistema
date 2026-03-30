import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { X, ChevronRight, ChevronLeft, Sparkles } from 'lucide-react';

interface TourStep {
  target: string; // data-tour attribute value
  title: string;
  description: string;
  position: 'top' | 'bottom' | 'left' | 'right';
}

const TOUR_STEPS: TourStep[] = [
  {
    target: 'dashboard',
    title: '🏠 Dashboard',
    description: 'Aqui você acompanha suas estatísticas em tempo real: indicações, ganhos, posts e créditos de permuta.',
    position: 'bottom',
  },
  {
    target: 'perfil',
    title: '👤 Meu Perfil',
    description: 'Mantenha seu perfil atualizado com foto, bio, redes sociais e informações de contato.',
    position: 'bottom',
  },
  {
    target: 'contrato',
    title: '📄 Meu Contrato',
    description: 'Visualize os detalhes do seu contrato com a YESlaser, incluindo sua assinatura digital.',
    position: 'bottom',
  },
  {
    target: 'valores',
    title: '💰 Meus Valores',
    description: 'Configure seus valores por tipo de conteúdo: stories, reels, posts e muito mais.',
    position: 'bottom',
  },
  {
    target: 'indicacoes',
    title: '🔗 Minhas Indicações',
    description: 'Acompanhe todos os clientes que você indicou e o status de cada conversão.',
    position: 'bottom',
  },
  {
    target: 'ganhos',
    title: '💳 Meus Ganhos',
    description: 'Visualize seu histórico de pagamentos, comissões pendentes e extrato completo.',
    position: 'bottom',
  },
  {
    target: 'posts',
    title: '📸 Meus Posts',
    description: 'Registre e gerencie os posts que você criou para a YESlaser. Tudo organizado em um só lugar!',
    position: 'bottom',
  },
];

const STORAGE_KEY = 'influenciadoraTourCompleted';

interface TooltipPosition {
  top: number;
  left: number;
  arrowTop?: number;
  arrowLeft?: number;
  arrowPosition: 'top' | 'bottom' | 'left' | 'right';
}

export function GuidedTour() {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [tooltipPos, setTooltipPos] = useState<TooltipPosition | null>(null);
  const [highlightRect, setHighlightRect] = useState<DOMRect | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Iniciar tour se nunca foi completado
  useEffect(() => {
    const completed = localStorage.getItem(STORAGE_KEY);
    if (!completed) {
      // Pequeno delay para garantir que o DOM está pronto
      const timer = setTimeout(() => setIsActive(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  const getTargetElement = useCallback((step: TourStep): Element | null => {
    return document.querySelector(`[data-tour="${step.target}"]`);
  }, []);

  const calculatePosition = useCallback((
    targetRect: DOMRect,
    preferredPosition: TourStep['position'],
    tooltipWidth: number = 320,
    tooltipHeight: number = 160
  ): TooltipPosition => {
    const padding = 12;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let top = 0;
    let left = 0;
    let arrowPosition: TooltipPosition['arrowPosition'] = preferredPosition;

    // Calcular posição com base na preferência
    switch (preferredPosition) {
      case 'bottom':
        top = targetRect.bottom + padding;
        left = targetRect.left + targetRect.width / 2 - tooltipWidth / 2;
        arrowPosition = 'top';
        break;
      case 'top':
        top = targetRect.top - tooltipHeight - padding;
        left = targetRect.left + targetRect.width / 2 - tooltipWidth / 2;
        arrowPosition = 'bottom';
        break;
      case 'right':
        top = targetRect.top + targetRect.height / 2 - tooltipHeight / 2;
        left = targetRect.right + padding;
        arrowPosition = 'left';
        break;
      case 'left':
        top = targetRect.top + targetRect.height / 2 - tooltipHeight / 2;
        left = targetRect.left - tooltipWidth - padding;
        arrowPosition = 'right';
        break;
    }

    // Ajustar para não sair da tela
    if (left < padding) left = padding;
    if (left + tooltipWidth > viewportWidth - padding) {
      left = viewportWidth - tooltipWidth - padding;
    }
    if (top < padding) {
      top = targetRect.bottom + padding;
      arrowPosition = 'top';
    }
    if (top + tooltipHeight > viewportHeight - padding) {
      top = targetRect.top - tooltipHeight - padding;
      arrowPosition = 'bottom';
    }

    return { top, left, arrowPosition };
  }, []);

  const updatePositions = useCallback(() => {
    if (!isActive || currentStep >= TOUR_STEPS.length) return;

    const step = TOUR_STEPS[currentStep];
    const target = getTargetElement(step);

    if (!target) return;

    const rect = target.getBoundingClientRect();
    setHighlightRect(rect);

    const tooltipHeight = tooltipRef.current?.offsetHeight || 160;
    const tooltipWidth = tooltipRef.current?.offsetWidth || 320;

    const pos = calculatePosition(rect, step.position, tooltipWidth, tooltipHeight);
    setTooltipPos(pos);

    // Scroll para garantir que o elemento está visível
    target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
  }, [isActive, currentStep, getTargetElement, calculatePosition]);

  useEffect(() => {
    if (!isActive) return;

    // Pequeno delay após mudança de step para scroll acontecer
    const timer = setTimeout(updatePositions, 300);

    window.addEventListener('resize', updatePositions);
    window.addEventListener('scroll', updatePositions);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updatePositions);
      window.removeEventListener('scroll', updatePositions);
    };
  }, [isActive, currentStep, updatePositions]);

  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      completeTour();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const completeTour = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setIsActive(false);
    setHighlightRect(null);
    setTooltipPos(null);
  };

  if (!isActive) return null;

  const currentTourStep = TOUR_STEPS[currentStep];
  const progress = ((currentStep + 1) / TOUR_STEPS.length) * 100;

  return (
    <>
      {/* Overlay escuro */}
      <div
        className="fixed inset-0 z-[9998] pointer-events-none"
        style={{ background: 'rgba(0, 0, 0, 0.6)' }}
      >
        {/* "Buraco" no overlay para destacar o elemento */}
        {highlightRect && (
          <div
            className="absolute transition-all duration-300"
            style={{
              top: highlightRect.top - 4,
              left: highlightRect.left - 4,
              width: highlightRect.width + 8,
              height: highlightRect.height + 8,
              borderRadius: '8px',
              boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.6)',
              outline: '3px solid #F2B705',
              outlineOffset: '2px',
            }}
          />
        )}
      </div>

      {/* Área clicável do overlay (exceto o tooltip) */}
      <div
        className="fixed inset-0 z-[9999] cursor-pointer"
        onClick={completeTour}
        aria-label="Fechar tour"
      />

      {/* Tooltip */}
      {tooltipPos && (
        <div
          ref={tooltipRef}
          className="fixed z-[10000] w-80 bg-white rounded-xl shadow-2xl border border-gray-100 pointer-events-auto"
          style={{
            top: tooltipPos.top,
            left: tooltipPos.left,
          }}
          onClick={e => e.stopPropagation()}
        >
          {/* Arrow */}
          {tooltipPos.arrowPosition === 'top' && (
            <div
              className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white border-l border-t border-gray-100 rotate-45"
            />
          )}
          {tooltipPos.arrowPosition === 'bottom' && (
            <div
              className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white border-r border-b border-gray-100 rotate-45"
            />
          )}
          {tooltipPos.arrowPosition === 'left' && (
            <div
              className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-l border-b border-gray-100 rotate-45"
            />
          )}
          {tooltipPos.arrowPosition === 'right' && (
            <div
              className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-r border-t border-gray-100 rotate-45"
            />
          )}

          {/* Header */}
          <div className="p-4 pb-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#662E8E] to-[#F2B705] flex items-center justify-center flex-shrink-0">
                  <Sparkles className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-medium">
                    Passo {currentStep + 1} de {TOUR_STEPS.length}
                  </p>
                  <h3 className="font-bold text-gray-900 text-sm leading-tight">
                    {currentTourStep.title}
                  </h3>
                </div>
              </div>
              <button
                onClick={completeTour}
                className="p-1 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600 flex-shrink-0"
                aria-label="Fechar tour"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Barra de progresso */}
          <div className="px-4 pb-3">
            <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#662E8E] to-[#F2B705] transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Descrição */}
          <div className="px-4 pb-4">
            <p className="text-sm text-gray-600 leading-relaxed">
              {currentTourStep.description}
            </p>
          </div>

          {/* Botões */}
          <div className="px-4 pb-4 flex items-center justify-between gap-2">
            <button
              onClick={completeTour}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              Pular tour
            </button>

            <div className="flex items-center gap-2">
              {currentStep > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrev}
                  className="h-8 text-xs"
                >
                  <ChevronLeft className="h-3 w-3 mr-1" />
                  Anterior
                </Button>
              )}
              <Button
                size="sm"
                onClick={handleNext}
                className="h-8 text-xs bg-gradient-to-r from-[#662E8E] to-[#662E8E]/80 hover:from-[#662E8E]/90 hover:to-[#662E8E]/70"
              >
                {currentStep < TOUR_STEPS.length - 1 ? (
                  <>
                    Próximo
                    <ChevronRight className="h-3 w-3 ml-1" />
                  </>
                ) : (
                  <>
                    Concluir
                    <Sparkles className="h-3 w-3 ml-1" />
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Dots de navegação */}
          <div className="px-4 pb-4 flex items-center justify-center gap-1.5">
            {TOUR_STEPS.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentStep(idx)}
                className={`transition-all duration-200 rounded-full ${
                  idx === currentStep
                    ? 'w-4 h-2 bg-[#662E8E]'
                    : 'w-2 h-2 bg-gray-200 hover:bg-gray-300'
                }`}
                aria-label={`Ir para passo ${idx + 1}`}
              />
            ))}
          </div>
        </div>
      )}
    </>
  );
}
