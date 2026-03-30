import { BrainCircuit, Sparkles, MessageSquare, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useTenantContext } from '@/contexts/TenantContext';

interface YESiaWelcomeProps {
  onSendMessage: (text: string) => void;
  className?: string;
}

const SUGGESTIONS_VENDEDOR = [
  'Como estão meus leads?',
  'Qual minha meta?',
  'Próximos agendamentos',
  'Leads sem contato hoje',
];

const SUGGESTIONS_ADMIN = [
  'Resumo do dia',
  'Performance da equipe',
  'Custos IA este mês',
  'Leads pendentes',
];

const SUGGESTIONS_GENERAL = [
  'O que você pode fazer?',
  'Resumo do dia',
  'Meus agendamentos',
  'Ajuda',
];

export function YESiaWelcome({ onSendMessage, className }: YESiaWelcomeProps) {
  const { user, accessLevel } = useTenantContext();

  const firstName = user?.nome?.split(' ')[0] || 'usuário';

  const isAdmin = accessLevel === 'platform' || accessLevel === 'tenant';
  const suggestions = isAdmin
    ? SUGGESTIONS_ADMIN
    : accessLevel === 'franchise'
      ? SUGGESTIONS_VENDEDOR
      : SUGGESTIONS_GENERAL;

  return (
    <div className={cn('flex flex-1 flex-col items-center justify-center px-6 py-8', className)}>
      {/* Avatar */}
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
        <BrainCircuit className="h-8 w-8 text-primary" />
      </div>

      {/* Greeting */}
      <h3 className="mb-1 text-lg font-semibold">
        Olá, {firstName}!
      </h3>
      <p className="mb-6 text-center text-sm text-muted-foreground">
        Sou a YESia, sua assistente de vendas com IA.
        <br />
        Como posso te ajudar?
      </p>

      {/* Quick suggestions */}
      <div className="flex w-full flex-col gap-2">
        <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Sparkles className="h-3 w-3" />
          Sugestões rápidas
        </p>
        {suggestions.map((text) => (
          <Button
            key={text}
            variant="outline"
            size="sm"
            className="h-auto justify-between whitespace-normal py-2.5 text-left text-sm"
            onClick={() => onSendMessage(text)}
          >
            <span className="flex items-center gap-2">
              <MessageSquare className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              {text}
            </span>
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          </Button>
        ))}
      </div>
    </div>
  );
}

export default YESiaWelcome;
