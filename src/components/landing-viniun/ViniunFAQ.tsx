import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

interface FAQItem {
  question: string;
  answer: string;
}

const faqs: FAQItem[] = [
  {
    question: 'Preciso instalar algum software?',
    answer:
      'Não! O Viniun é 100% na nuvem. Basta acessar pelo navegador do computador, tablet ou celular. Não precisa instalar nada.',
  },
  {
    question: 'Posso testar antes de contratar?',
    answer:
      'Sim! Oferecemos 14 dias grátis em todos os planos, sem necessidade de cartão de crédito. Você pode testar todas as funcionalidades do plano escolhido.',
  },
  {
    question: 'Como funciona o suporte?',
    answer:
      'No plano Starter, o suporte é por email. No Professional, você tem suporte prioritário via chat e WhatsApp. No Enterprise, um gerente de conta dedicado cuida de tudo.',
  },
  {
    question: 'Consigo importar meus dados de outro sistema?',
    answer:
      'Sim. Oferecemos importação via planilha (CSV/Excel) para leads, imóveis e contatos. Nos planos Professional e Enterprise, nossa equipe auxilia na migração completa.',
  },
  {
    question: 'O sistema funciona para locação também?',
    answer:
      'Com certeza! O Viniun atende tanto vendas quanto locação, com funis separados, contratos digitais e gestão financeira específica para cada modalidade.',
  },
  {
    question: 'Quantos usuários posso ter?',
    answer:
      'Depende do plano: Starter permite até 5 corretores, Professional até 20, e Enterprise é ilimitado. Administradores não contam no limite.',
  },
  {
    question: 'Posso cancelar a qualquer momento?',
    answer:
      'Sim, sem multa ou fidelidade. No plano mensal, basta cancelar antes da próxima cobrança. No anual, o acesso continua até o fim do período contratado.',
  },
];

export default function ViniunFAQ() {
  return (
    <section id="faq" className="py-20 md:py-28 bg-viniun-light/50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold text-viniun-navy mb-4">
            Perguntas Frequentes
          </h2>
          <p className="text-gray-600 text-lg">
            Tire suas dúvidas sobre o Viniun
          </p>
        </div>

        {/* Accordion */}
        <Accordion type="single" collapsible className="space-y-3">
          {faqs.map((faq, idx) => (
            <AccordionItem
              key={idx}
              value={`faq-${idx}`}
              className="bg-white rounded-xl border border-gray-100 px-6 shadow-sm"
            >
              <AccordionTrigger className="text-left text-sm font-semibold text-viniun-dark hover:text-viniun-blue hover:no-underline py-5">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-sm text-gray-600 leading-relaxed pb-5">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
