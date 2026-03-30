import { Lock, MessageSquare } from "lucide-react";

export function EmptyStateView() {
  return (
    <div className="flex h-full flex-col items-center justify-center bg-[#f0f2f5]">
      {/* Main content - centered */}
      <div className="flex flex-col items-center gap-6">
        {/* WhatsApp icon with gradient */}
        <div className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-gradient-to-br from-[#00a884] to-[#25d366] shadow-lg shadow-[#00a884]/20">
          <MessageSquare className="h-9 w-9 text-white" strokeWidth={1.5} />
        </div>

        {/* Title */}
        <h2 className="text-2xl font-light text-[#41525d]">
          WhatsApp Business
        </h2>

        {/* Subtitle */}
        <p className="max-w-sm text-center text-sm text-[#667781]">
          Selecione uma conversa para começar
        </p>
      </div>

      {/* Encryption notice - pinned to bottom area */}
      <div className="mt-auto pb-8 pt-16">
        <div className="flex items-center gap-1.5 text-xs text-[#8696a0]">
          <Lock className="h-3 w-3" />
          <span>
            Suas mensagens são protegidas com criptografia de ponta a ponta.
          </span>
        </div>
      </div>
    </div>
  );
}
