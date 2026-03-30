import { useEffect } from "react";
import Header from "@/components/landing/Header";
import PreInaugHeroSection from "@/components/landing/PreInaugHeroSection";
import UrgencyBar from "@/components/landing/UrgencyBar";
import PreInaugFormSection from "@/components/landing/PreInaugFormSection";
import BannerIndicacoes from "@/components/landing/BannerIndicacoes";
import HowItWorksSection from "@/components/landing/HowItWorksSection";
import AllServicesSection from "@/components/landing/AllServicesSection";
import WhatsAppVIPSection from "@/components/landing/WhatsAppVIPSection";
import PreInaugLocationSection from "@/components/landing/PreInaugLocationSection";
import FAQSection from "@/components/landing/FAQSection";
import FinalCTASection from "@/components/landing/FinalCTASection";
import Footer from "@/components/landing/Footer";
import WhatsAppButton from "@/components/landing/WhatsAppButton";
import SocialProofPopup from "@/components/landing/SocialProofPopup";

const PreInauguracao = () => {
  useEffect(() => {
    // SEO + AIO/LLMO/GEO Optimized Title (includes location, price, keywords)
    document.title = "Depilação a Laser Praia Grande SP | 20 Sessões R$79,90 | Yeslaser Boqueirão";

    // Meta description otimizada para AI e motores de busca
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 
        'Depilação a laser em Praia Grande SP - Yeslaser Boqueirão oferece 20 sessões por R$79,90: 10 Axila/Barba + 10 Área P. Tecnologia premium, indolor, resultados permanentes. Rua Jaú 1281. WhatsApp (13) 97826-3924.'
      );
    }

    // Adicionar meta tags adicionais para AIO/LLMO
    const addMetaTag = (name: string, content: string) => {
      let meta = document.querySelector(`meta[name="${name}"]`);
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('name', name);
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    };

    // Keywords para SEO tradicional e AI
    addMetaTag('keywords', 'depilação a laser praia grande, laser praia grande sp, depilação boqueirão, yeslaser praia grande, depilação feminina praia grande, depilação masculina praia grande, barba laser praia grande, axila laser praia grande, depilação indolor, depilação definitiva litoral');
    
    // Geo meta tags para GEO
    addMetaTag('geo.region', 'BR-SP');
    addMetaTag('geo.placename', 'Praia Grande');
    addMetaTag('geo.position', '-24.0058;-46.4028');
    addMetaTag('ICBM', '-24.0058, -46.4028');
    
    // Open Graph para compartilhamento social
    addMetaTag('og:title', 'Depilação a Laser em Praia Grande | 20 Sessões R$79,90 | Yeslaser');
    addMetaTag('og:description', '20 sessões de depilação a laser premium por apenas R$79,90. Tecnologia indolor, resultados permanentes. Boqueirão - Praia Grande/SP.');
    addMetaTag('og:type', 'website');
    addMetaTag('og:locale', 'pt_BR');
    
    // Twitter Cards
    addMetaTag('twitter:card', 'summary_large_image');
    addMetaTag('twitter:title', 'Depilação a Laser Praia Grande | Yeslaser');
    addMetaTag('twitter:description', '20 sessões por R$79,90! Tecnologia premium e indolor.');

    // JSON-LD structured data - Enhanced for AIO/LLMO/SEO/GEO
    const structuredData = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Organization",
          "@id": "https://yeslaserpraiagrande.com.br/#organization",
          name: "Yeslaser Praia Grande",
          alternateName: ["Yeslaser", "Yes Laser Praia Grande", "Yeslaser Boqueirão"],
          url: "https://yeslaserpraiagrande.com.br",
          logo: {
            "@type": "ImageObject",
            url: "https://yeslaserpraiagrande.com.br/yeslaser-logo-official.svg",
            width: 200,
            height: 60
          },
          sameAs: [
            "https://www.instagram.com/yeslaser",
            "https://www.facebook.com/yeslaser"
          ],
          contactPoint: {
            "@type": "ContactPoint",
            telephone: "+55-13-97826-3924",
            contactType: "customer service",
            areaServed: ["Praia Grande", "Santos", "São Vicente", "Guarujá", "Mongaguá", "Itanhaém", "Peruíbe", "Cubatão"],
            availableLanguage: "Portuguese",
            hoursAvailable: {
              "@type": "OpeningHoursSpecification",
              dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
              opens: "08:00",
              closes: "19:00"
            }
          },
        },
        {
          "@type": "LocalBusiness",
          "@id": "https://yeslaserpraiagrande.com.br/#localbusiness",
          name: "Yeslaser Praia Grande - Clínica de Depilação a Laser",
          description: "Clínica especializada em depilação a laser em Praia Grande SP. Tecnologia premium, procedimento indolor, resultados permanentes. Atendemos axilas, barba, pernas, virilha e todas as áreas do corpo.",
          image: "https://yeslaserpraiagrande.com.br/og-image.png",
          url: "https://yeslaserpraiagrande.com.br",
          telephone: "+55-13-97826-3924",
          priceRange: "$",
          currenciesAccepted: "BRL",
          paymentAccepted: "Cash, Credit Card, Debit Card, Pix",
          address: {
            "@type": "PostalAddress",
            streetAddress: "Rua Jaú, 1281 - Loja 1",
            addressLocality: "Praia Grande",
            addressRegion: "SP",
            postalCode: "11700-270",
            addressCountry: "BR",
            areaServed: "Boqueirão"
          },
          geo: {
            "@type": "GeoCoordinates",
            latitude: -24.0058,
            longitude: -46.4028
          },
          areaServed: [
            { "@type": "City", name: "Praia Grande" },
            { "@type": "City", name: "Santos" },
            { "@type": "City", name: "São Vicente" },
            { "@type": "City", name: "Guarujá" },
            { "@type": "City", name: "Mongaguá" }
          ],
          hasOfferCatalog: {
            "@type": "OfferCatalog",
            name: "Serviços de Depilação a Laser",
            itemListElement: [
              { "@type": "Offer", itemOffered: { "@type": "Service", name: "Depilação a Laser Axilas" } },
              { "@type": "Offer", itemOffered: { "@type": "Service", name: "Depilação a Laser Barba" } },
              { "@type": "Offer", itemOffered: { "@type": "Service", name: "Depilação a Laser Virilha" } },
              { "@type": "Offer", itemOffered: { "@type": "Service", name: "Depilação a Laser Pernas" } },
              { "@type": "Offer", itemOffered: { "@type": "Service", name: "Depilação a Laser Área Íntima" } }
            ]
          },
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: "4.9",
            reviewCount: "523",
            bestRating: "5"
          },
          openingHoursSpecification: [
            {
              "@type": "OpeningHoursSpecification",
              dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
              opens: "08:00",
              closes: "19:00"
            },
            {
              "@type": "OpeningHoursSpecification",
              dayOfWeek: "Saturday",
              opens: "08:00",
              closes: "16:00"
            }
          ],
        },
        {
          "@type": "Product",
          name: "Pacote Pré-Inauguração - 20 Sessões de Depilação a Laser",
          description: "Pacote promocional com 20 sessões de depilação a laser: 10 sessões de Axila ou Faixa de Barba + 10 sessões BÔNUS em Área P. Tecnologia premium, indolor e com resultados permanentes.",
          brand: { "@type": "Brand", name: "Yeslaser" },
          offers: {
            "@type": "Offer",
            name: "Promoção Pré-Inauguração Yeslaser Praia Grande",
            description: "20 sessões de depilação a laser premium: 10 Axila/Barba + 10 Área P bônus",
            price: "79.90",
            priceCurrency: "BRL",
            availability: "https://schema.org/LimitedAvailability",
            validFrom: "2025-01-01",
            validThrough: "2025-03-31",
            priceValidUntil: "2025-03-31",
            url: "https://yeslaserpraiagrande.com.br",
            seller: {
              "@type": "LocalBusiness",
              name: "Yeslaser Praia Grande"
            }
          }
        },
        {
          "@type": "FAQPage",
          mainEntity: [
            {
              "@type": "Question",
              name: "Quanto custa depilação a laser em Praia Grande?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Na promoção de pré-inauguração da Yeslaser Praia Grande, você ganha 20 sessões de depilação a laser por apenas R$ 79,90: 10 sessões de Axila ou Faixa de Barba + 10 sessões BÔNUS em Área P. É a melhor oferta de depilação a laser do litoral paulista."
              }
            },
            {
              "@type": "Question",
              name: "Onde fica a Yeslaser em Praia Grande?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "A Yeslaser Praia Grande está localizada na Rua Jaú, 1281 - Loja 1, no bairro Boqueirão, em Praia Grande/SP. Fácil acesso de Santos, São Vicente, Guarujá e outras cidades do litoral."
              }
            },
            {
              "@type": "Question",
              name: "A depilação a laser dói?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Não! A Yeslaser utiliza tecnologia de ponta com sistema de resfriamento que torna o procedimento praticamente indolor. A maioria dos clientes descreve apenas uma leve sensação de calor. É muito mais confortável que cera ou lâmina."
              }
            },
            {
              "@type": "Question",
              name: "Quantas sessões são necessárias para depilação definitiva?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Em média, 8 a 10 sessões são suficientes para resultados permanentes, dependendo do tipo de pelo e área tratada. Com nosso pacote de 20 sessões, você garante o tratamento completo de duas áreas."
              }
            },
            {
              "@type": "Question",
              name: "Depilação a laser funciona em todos os tipos de pele?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Sim! A tecnologia utilizada pela Yeslaser é segura e eficaz para todos os fototipos de pele, incluindo peles morenas e negras. Nossa equipe faz uma avaliação personalizada para cada cliente."
              }
            },
            {
              "@type": "Question",
              name: "Qual o horário de funcionamento da Yeslaser Praia Grande?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "A Yeslaser Praia Grande funciona de segunda a sexta das 8h às 19h, e aos sábados das 8h às 16h. Agende pelo WhatsApp (13) 97826-3924."
              }
            }
          ]
        },
        {
          "@type": "WebPage",
          "@id": "https://yeslaserpraiagrande.com.br/#webpage",
          url: "https://yeslaserpraiagrande.com.br",
          name: "Depilação a Laser em Praia Grande | Yeslaser Boqueirão",
          description: "Clínica de depilação a laser em Praia Grande SP. Promoção: 20 sessões por R$79,90. Tecnologia premium, indolor, resultados permanentes.",
          inLanguage: "pt-BR",
          isPartOf: { "@id": "https://yeslaserpraiagrande.com.br/#website" },
          about: { "@id": "https://yeslaserpraiagrande.com.br/#localbusiness" },
          speakable: {
            "@type": "SpeakableSpecification",
            cssSelector: ["h1", "h2", ".offer-details"]
          }
        },
        {
          "@type": "WebSite",
          "@id": "https://yeslaserpraiagrande.com.br/#website",
          url: "https://yeslaserpraiagrande.com.br",
          name: "Yeslaser Praia Grande",
          publisher: { "@id": "https://yeslaserpraiagrande.com.br/#organization" },
          inLanguage: "pt-BR"
        }
      ]
    };

    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.text = JSON.stringify(structuredData);
    script.id = "structured-data-script";
    document.head.appendChild(script);

    return () => {
      const existingScript = document.getElementById("structured-data-script");
      if (existingScript) {
        document.head.removeChild(existingScript);
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <PreInaugHeroSection />
      <UrgencyBar />
      <PreInaugFormSection />
      <BannerIndicacoes />
      <HowItWorksSection />
      <AllServicesSection />
      <FAQSection />
      <PreInaugLocationSection />
      <FinalCTASection />
      <WhatsAppVIPSection />
      <Footer />
      <WhatsAppButton />
      <SocialProofPopup />
    </div>
  );
};

export default PreInauguracao;
