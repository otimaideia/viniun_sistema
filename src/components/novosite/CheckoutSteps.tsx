import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface CheckoutStepsProps {
  currentStep: number; // 1-4
  steps?: string[];
}

const DEFAULT_STEPS = ['Identificacao', 'Dados Pessoais', 'Pagamento', 'Confirmacao'];

export function CheckoutSteps({ currentStep, steps = DEFAULT_STEPS }: CheckoutStepsProps) {
  return (
    <nav aria-label="Progresso do checkout" className="w-full">
      <ol className="flex items-center justify-between">
        {steps.map((label, index) => {
          const stepNumber = index + 1;
          const isCompleted = stepNumber < currentStep;
          const isCurrent = stepNumber === currentStep;
          const isFuture = stepNumber > currentStep;

          return (
            <li
              key={label}
              className={cn('flex items-center', index < steps.length - 1 && 'flex-1')}
            >
              <div className="flex flex-col items-center">
                {/* Circle */}
                <div
                  className={cn(
                    'flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-full border-2 text-sm font-semibold transition-all',
                    isCompleted && 'border-emerald-500 bg-emerald-500 text-white',
                    isCurrent && 'border-[#6B2D8B] bg-[#6B2D8B] text-white shadow-md shadow-purple-200',
                    isFuture && 'border-gray-300 bg-white text-gray-400'
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-4 w-4 sm:h-5 sm:w-5" />
                  ) : (
                    <span>{stepNumber}</span>
                  )}
                </div>

                {/* Label - hidden on mobile, shown on sm+ */}
                <span
                  className={cn(
                    'mt-1.5 text-[11px] sm:text-xs font-medium text-center whitespace-nowrap hidden sm:block',
                    isCompleted && 'text-emerald-600',
                    isCurrent && 'text-[#6B2D8B]',
                    isFuture && 'text-gray-400'
                  )}
                >
                  {label}
                </span>
              </div>

              {/* Connecting line */}
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    'mx-2 sm:mx-4 h-0.5 flex-1 transition-colors',
                    stepNumber < currentStep ? 'bg-emerald-500' : 'bg-gray-200'
                  )}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
