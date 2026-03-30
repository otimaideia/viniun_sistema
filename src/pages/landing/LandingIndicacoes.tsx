import { useEffect } from "react";
import Header from "@/components/landing/Header";
import HeroSection from "@/components/landing/HeroSection";
import UrgencyBar from "@/components/landing/UrgencyBar";
import ReferralForm from "@/components/landing/ReferralForm";
import WhatsAppVIPSection from "@/components/landing/WhatsAppVIPSection";
import AboutSection from "@/components/landing/AboutSection";
import ServicesSection from "@/components/landing/ServicesSection";
import BenefitsSection from "@/components/landing/BenefitsSection";
import HowItWorksSection from "@/components/landing/HowItWorksSection";
import SocialProofPopup from "@/components/landing/SocialProofPopup";
import FAQSection from "@/components/landing/FAQSection";
import FinalCTASection from "@/components/landing/FinalCTASection";
import Footer from "@/components/landing/Footer";
import WhatsAppButton from "@/components/landing/WhatsAppButton";

const Indicacoes = () => {
  useEffect(() => {
    // Update page title and meta for this specific page
    document.title = "Ganhe 10 Sessões Grátis | Depilação a Laser em Praia Grande | Yeslaser";

    // Add JSON-LD structured data
    const structuredData = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Organization",
          name: "Yeslaser Praia Grande",
          url: "https://yeslaserpraiagrande.com.br",
          logo: "https://yeslaserpraiagrande.com.br/logo.png",
          contactPoint: {
            "@type": "ContactPoint",
            telephone: "+55-13-97826-3924",
            contactType: "customer service",
            areaServed: "BR",
            availableLanguage: "Portuguese",
          },
        },
        {
          "@type": "LocalBusiness",
          name: "Yeslaser Praia Grande",
          image: "https://yeslaserpraiagrande.com.br/og-image.png",
          "@id": "https://yeslaserpraiagrande.com.br/indicacoes",
          url: "https://yeslaserpraiagrande.com.br/indicacoes",
          telephone: "+55-13-97826-3924",
          address: {
            "@type": "PostalAddress",
            streetAddress: "Rua Jaú, 1281 - Loja 1",
            addressLocality: "Praia Grande",
            addressRegion: "SP",
            postalCode: "11700-270",
            addressCountry: "BR",
          },
          openingHoursSpecification: [
            {
              "@type": "OpeningHoursSpecification",
              dayOfWeek: [
                "Monday",
                "Tuesday",
                "Wednesday",
                "Thursday",
                "Friday",
                "Saturday",
              ],
              opens: "08:00",
              closes: "19:00",
            },
          ],
        },
        {
          "@type": "FAQPage",
          mainEntity: [
            {
              "@type": "Question",
              name: "A depilação a laser dói?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Não! Nossa tecnologia possui sistema de resfriamento que torna o procedimento praticamente indolor. A maioria dos clientes descreve apenas uma leve sensação de calor.",
              },
            },
            {
              "@type": "Question",
              name: "Quantas sessões são necessárias para resultado definitivo?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Em média, 8 a 12 sessões são suficientes para eliminação de 90-95% dos pelos, dependendo do tipo de pele e região tratada.",
              },
            },
            {
              "@type": "Question",
              name: "Quais áreas estão incluídas nas 10 sessões grátis?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Você pode escolher entre axilas, virilha básica ou buço. O pacote é válido para novos clientes na unidade Praia Grande.",
              },
            },
          ],
        },
      ],
    };

    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.text = JSON.stringify(structuredData);
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <HeroSection />
      <UrgencyBar />
      <section id="formulario" className="py-16 bg-gradient-to-b from-muted to-background">
        <div className="container mx-auto px-4">
          <ReferralForm />
        </div>
      </section>
      <WhatsAppVIPSection />
      <AboutSection />
      <ServicesSection />
      <BenefitsSection />
      <HowItWorksSection />
      <FAQSection />
      <FinalCTASection />
      <Footer />
      <WhatsAppButton />
      <SocialProofPopup />
    </div>
  );
};

export default Indicacoes;
