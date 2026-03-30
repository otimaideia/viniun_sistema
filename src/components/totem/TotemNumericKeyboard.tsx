import { Button } from '@/components/ui/button';
import { Delete, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TotemNumericKeyboardProps {
  onKeyPress: (key: string) => void;
  onBackspace: () => void;
  onConfirm: () => void;
  disabled?: boolean;
  className?: string;
}

export function TotemNumericKeyboard({
  onKeyPress,
  onBackspace,
  onConfirm,
  disabled = false,
  className,
}: TotemNumericKeyboardProps) {
  const keys = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['backspace', '0', 'confirm'],
  ];

  const handleKeyClick = (key: string) => {
    if (disabled) return;

    if (key === 'backspace') {
      onBackspace();
    } else if (key === 'confirm') {
      onConfirm();
    } else {
      onKeyPress(key);
    }
  };

  return (
    <div className={cn('grid grid-cols-3 gap-1.5', className)}>
      {keys.flat().map((key, index) => {
        const isBackspace = key === 'backspace';
        const isConfirm = key === 'confirm';

        return (
          <Button
            key={index}
            variant={isConfirm ? 'default' : 'secondary'}
            size="default"
            disabled={disabled}
            onClick={() => handleKeyClick(key)}
            className={cn(
              'h-11 text-lg font-semibold',
              'transition-all duration-150',
              'active:scale-95',
              isConfirm && 'bg-green-500 hover:bg-green-600 text-white',
              isBackspace && 'bg-gray-200 hover:bg-gray-300'
            )}
          >
            {isBackspace ? (
              <Delete className="h-5 w-5" />
            ) : isConfirm ? (
              <Check className="h-5 w-5" />
            ) : (
              key
            )}
          </Button>
        );
      })}
    </div>
  );
}
