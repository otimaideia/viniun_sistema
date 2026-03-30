import { useEffect, useRef } from "react";

const FormSection = () => {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'yeslaser-form-height' && iframeRef.current) {
        iframeRef.current.style.height = event.data.height + 'px';
      }
      if (event.data?.type === 'yeslaser-form-submit') {
        // Lead criado no sistema MT - disparar tracking
        if (typeof window !== "undefined" && (window as any).dataLayer) {
          (window as any).dataLayer.push({
            event: "lead_submit",
            formType: "indicacoes",
            leadId: event.data.leadId,
          });
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Capturar UTM params da URL atual para repassar ao iframe
  const utmParams = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).toString()
    : '';
  const iframeSrc = `/form/loja-contato?embed_url=yeslaserpraiagrande.com.br${utmParams ? '&' + utmParams : ''}`;

  return (
    <section id="formulario" className="py-16 bg-gradient-to-b from-muted to-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8 px-4">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-primary mb-4">
            Quero Saber Mais
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
            Preencha o formulário abaixo para receber mais informações sobre nossos tratamentos de depilação a laser!
          </p>
        </div>
        <div className="max-w-2xl mx-auto">
          <iframe
            ref={iframeRef}
            src={iframeSrc}
            style={{ width: '100%', border: 'none', minHeight: '600px' }}
            allow="geolocation"
            title="Formulário YESlaser"
          />
        </div>
      </div>
    </section>
  );
};

export default FormSection;
