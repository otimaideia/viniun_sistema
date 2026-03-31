import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Sparkles,
  Gift,
  TrendingUp,
  Camera,
  Heart,
  Star,
  ChevronDown,
  CheckCircle,
  Users,
  DollarSign,
  Instagram,
  Smartphone,
  Zap,
  Trophy,
  Menu,
  X,
  Percent,
  Scissors,
  MessageCircle,
  MapPin,
  Phone,
  Clock,
  Globe,
  ExternalLink,
  Mail,
} from "lucide-react";

interface LandingPageInfluenciadoraProps {
  tenantName?: string;
  accentColor?: string;
  onScrollToForm: () => void;
  franchiseName?: string;
  franchiseCity?: string;
  franchiseState?: string;
  franchiseAddress?: string;
  franchisePhone?: string;
  franchiseEmail?: string;
  franchiseHours?: string;
  logoUrl?: string;
  children?: React.ReactNode;
  // Social media
  franchiseInstagram?: string;
  franchiseTiktok?: string;
  franchiseFacebook?: string;
  franchiseWebsite?: string;
  // Map
  franchiseMapUrl?: string;
  franchiseMapEmbedUrl?: string;
  franchiseLat?: number;
  franchiseLng?: number;
}

// TikTok SVG icon (not available in lucide)
function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 0 0-.79-.05A6.34 6.34 0 0 0 3.15 15a6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.89a8.27 8.27 0 0 0 4.86 1.56V6.93a4.84 4.84 0 0 1-1.1-.24Z" />
    </svg>
  );
}

// Facebook SVG icon
function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

// WhatsApp SVG icon
function WhatsAppSvg({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  );
}

export default function LandingPageInfluenciadora({
  tenantName = "Viniun",
  accentColor = "#7c3aed",
  onScrollToForm,
  franchiseName,
  franchiseCity,
  franchiseState,
  franchiseAddress,
  franchisePhone,
  franchiseEmail,
  franchiseHours,
  logoUrl,
  children,
  franchiseInstagram,
  franchiseTiktok,
  franchiseFacebook,
  franchiseWebsite,
  franchiseMapUrl,
  franchiseMapEmbedUrl,
  franchiseLat,
  franchiseLng,
}: LandingPageInfluenciadoraProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [currentTestimonial, setCurrentTestimonial] = useState(0);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Auto-rotate testimonials
  const testimonials = [
    { text: "Melhor parceria que já fiz! Recebo serviços incríveis e ainda ganho comissão.", author: "Camila R.", location: franchiseCity || "São Paulo", rating: 5 },
    { text: "O contrato é super simples, sem burocracia. Amo fazer conteúdo para a Viniun!", author: "Juliana M.", location: franchiseCity || "São Paulo", rating: 5 },
    { text: "Meus seguidores amam o cupom exclusivo! E eu amo os serviços gratuitos.", author: "Amanda S.", location: franchiseCity || "São Paulo", rating: 5 },
    { text: "Ganhei o prêmio Top 3 e escolhi o prêmio premium. Experiência incrível do início ao fim!", author: "Fernanda L.", location: franchiseCity || "São Paulo", rating: 5 },
    { text: "A equipe é super atenciosa e profissional. Recomendo para todas as influencers!", author: "Mariana F.", location: franchiseCity || "São Paulo", rating: 5 },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [testimonials.length]);

  // ── SEO: Structured Data (JSON-LD) ────────────────────────────────────
  useEffect(() => {
    const displayCity = franchiseCity || "Brasil";
    const displayState = franchiseState || "SP";
    const fullName = franchiseName || `${tenantName} ${displayCity}`;
    const siteUrl = franchiseWebsite || `https://www.viniun.com.br`;
    const phoneClean = franchisePhone?.replace(/\D/g, "") || "";

    // SEO Meta tags
    document.title = `Programa de Influenciadoras ${fullName} | Seja Parceira ${tenantName}`;

    const setMeta = (name: string, content: string) => {
      let el = document.querySelector(`meta[name="${name}"]`) || document.querySelector(`meta[property="${name}"]`);
      if (!el) {
        el = document.createElement("meta");
        if (name.startsWith("og:") || name.startsWith("twitter:")) {
          el.setAttribute("property", name);
        } else {
          el.setAttribute("name", name);
        }
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    const description = `Seja influenciadora ${tenantName} em ${displayCity}! Ganhe 3 serviços/mês de permuta, 1% de comissão sobre vendas, cupom exclusivo e prêmios no ranking mensal. Cadastre-se agora!`;
    setMeta("description", description);
    setMeta("keywords", `influenciadora ${displayCity}, programa influencer ${tenantName}, parceria ${tenantName} ${displayCity}, influencer, permuta serviços, ${tenantName} ${displayCity}`);

    // Open Graph
    setMeta("og:title", `Programa de Influenciadoras | ${fullName}`);
    setMeta("og:description", description);
    setMeta("og:type", "website");
    setMeta("og:url", window.location.href);
    setMeta("og:site_name", fullName);
    if (logoUrl) setMeta("og:image", logoUrl);

    // Twitter
    setMeta("twitter:card", "summary_large_image");
    setMeta("twitter:title", `Programa de Influenciadoras | ${fullName}`);
    setMeta("twitter:description", description);

    // GEO meta tags
    setMeta("geo.region", `BR-${displayState}`);
    setMeta("geo.placename", displayCity);
    if (franchiseLat && franchiseLng) {
      setMeta("geo.position", `${franchiseLat};${franchiseLng}`);
      setMeta("ICBM", `${franchiseLat}, ${franchiseLng}`);
    }

    // JSON-LD Structured Data - LocalBusiness + FAQPage + Product + Organization
    const structuredData = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Organization",
          "@id": `${siteUrl}/#organization`,
          name: fullName,
          alternateName: [tenantName, `${tenantName} ${displayCity}`, fullName],
          url: siteUrl,
          logo: { "@type": "ImageObject", url: logoUrl || `${siteUrl}/images/landing/viniun-logo.png` },
          sameAs: [
            franchiseInstagram ? `https://instagram.com/${franchiseInstagram.replace("@", "")}` : null,
            franchiseFacebook || null,
            franchiseTiktok ? `https://tiktok.com/${franchiseTiktok.startsWith("@") ? franchiseTiktok : `@${franchiseTiktok}`}` : null,
          ].filter(Boolean),
          ...(phoneClean && {
            contactPoint: {
              "@type": "ContactPoint",
              telephone: `+${phoneClean}`,
              contactType: "customer service",
              areaServed: displayCity,
              availableLanguage: "Portuguese",
            },
          }),
        },
        {
          "@type": "LocalBusiness",
          "@id": `${siteUrl}/#localbusiness`,
          name: `${fullName} - Soluções Imobiliárias`,
          description: `Programa de parceria com influenciadoras da ${fullName}. Permuta mensal de 3 serviços, 1% de comissão sobre vendas, cupom exclusivo e prêmios no ranking.`,
          image: logoUrl,
          priceRange: "$$",
          currenciesAccepted: "BRL",
          paymentAccepted: "Cash, Credit Card, Debit Card, Pix",
          ...(franchiseAddress && {
            address: {
              "@type": "PostalAddress",
              streetAddress: franchiseAddress.split(",").slice(0, 2).join(",").trim(),
              addressLocality: displayCity,
              addressRegion: displayState,
              addressCountry: "BR",
            },
          }),
          ...(franchiseLat && franchiseLng && {
            geo: { "@type": "GeoCoordinates", latitude: franchiseLat, longitude: franchiseLng },
          }),
          areaServed: { "@type": "City", name: displayCity },
          aggregateRating: { "@type": "AggregateRating", ratingValue: "4.9", reviewCount: "523", bestRating: "5" },
          ...(phoneClean && { telephone: `+${phoneClean}` }),
          ...(franchiseEmail && { email: franchiseEmail }),
          ...(siteUrl && { url: siteUrl }),
        },
        {
          "@type": "Product",
          name: `Programa de Influenciadoras ${tenantName}`,
          description: `Parceria com permuta mensal: 3 serviços/mês, 1% de comissão sobre vendas, cupom exclusivo e prêmios no ranking Top 3.`,
          brand: { "@type": "Brand", name: tenantName },
          offers: {
            "@type": "Offer",
            name: `Parceria Influenciadora ${fullName}`,
            description: "Permuta: 3 serviços/mês + 1% comissão + cupom exclusivo + prêmios ranking",
            price: "0",
            priceCurrency: "BRL",
            availability: "https://schema.org/LimitedAvailability",
            validFrom: "2026-02-20",
            priceValidUntil: "2026-03-31",
          },
        },
        {
          "@type": "FAQPage",
          mainEntity: [
            { "@type": "Question", name: `Como ser influenciadora ${tenantName} em ${displayCity}?`, acceptedAnswer: { "@type": "Answer", text: `Para se tornar influenciadora ${tenantName} em ${displayCity}, você precisa ter pelo menos 5.000 seguidores em qualquer rede social, perfil público e morar na região. Cadastre-se pelo formulário e nossa equipe avalia seu perfil em até 48h.` } },
            { "@type": "Question", name: `O que eu ganho como influenciadora ${tenantName}?`, acceptedAnswer: { "@type": "Answer", text: `Você ganha 3 serviços gratuitos por mês, 1% de comissão sobre vendas feitas com seu cupom exclusivo, e as Top 3 do ranking ganham prêmios premium.` } },
            { "@type": "Question", name: "Como funciona a permuta com influenciadoras?", acceptedAnswer: { "@type": "Answer", text: "É um contrato simples de permuta: você recebe serviços gratuitos em troca de conteúdo estratégico nas redes sociais (stories, posts e reels seguindo nosso plano de conteúdo mensal)." } },
            { "@type": "Question", name: "Quanto uma influenciadora ganha de comissão?", acceptedAnswer: { "@type": "Answer", text: "Você recebe 1% de comissão sobre cada contrato fechado por sua indicação via cupom exclusivo. Exemplo: cliente fechou R$1.300 → você ganha comissão automática sobre a venda." } },
            { "@type": "Question", name: `Quais os prêmios do ranking de influenciadoras ${tenantName}?`, acceptedAnswer: { "@type": "Answer", text: "As 3 influenciadoras com mais vendas no mês ganham prêmios premium exclusivos." } },
            { "@type": "Question", name: "Por que o valor do contrato é diferente do valor real dos serviços?", acceptedAnswer: { "@type": "Answer", text: "O valor declarado no contrato é uma margem de referência. Como fazemos promoções frequentes, usamos um valor médio que reflete a realidade das promoções, mantendo tudo transparente e justo para ambas as partes." } },
          ],
        },
        {
          "@type": "WebPage",
          "@id": `${window.location.href}#webpage`,
          url: window.location.href,
          name: `Programa de Influenciadoras ${fullName}`,
          description,
          speakable: { "@type": "SpeakableSpecification", cssSelector: ["h1", "h2", ".offer-details"] },
        },
      ],
    };

    // Remove previous script if exists
    document.getElementById("influencer-lp-structured-data")?.remove();
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.text = JSON.stringify(structuredData);
    script.id = "influencer-lp-structured-data";
    document.head.appendChild(script);

    return () => {
      document.getElementById("influencer-lp-structured-data")?.remove();
    };
  }, [tenantName, franchiseName, franchiseCity, franchiseState, franchisePhone, franchiseEmail, logoUrl, franchiseWebsite, franchiseInstagram, franchiseFacebook, franchiseTiktok, franchiseLat, franchiseLng]);

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setIsMobileMenuOpen(false);
  };

  const displayName = franchiseName || `${tenantName}${franchiseCity ? ` ${franchiseCity}` : ""}`;
  const finalLogo = logoUrl || "/images/landing/viniun-logo.png";
  const whatsappClean = franchisePhone?.replace(/\D/g, "") || "";
  const igHandle = franchiseInstagram?.replace("@", "") || "viniun";

  return (
    <div className="w-full">
      {/* ── Header / Navbar ─────────────────────────────────────────────── */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled ? "bg-white/95 backdrop-blur-md shadow-md" : "bg-white"
        }`}
      >
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-[70px]">
            <img
              src={finalLogo}
              alt={`${displayName} - Programa de Influenciadoras`}
              className="h-10 md:h-12 w-auto cursor-pointer transition-transform hover:scale-105"
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            />

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-8">
              <button onClick={() => scrollToSection("beneficios")} className="text-foreground hover:text-primary transition-colors font-medium">Benefícios</button>
              <button onClick={() => scrollToSection("plano-conteudo")} className="text-foreground hover:text-primary transition-colors font-medium">Plano de Conteúdo</button>
              <button onClick={() => scrollToSection("premios")} className="text-foreground hover:text-primary transition-colors font-medium">Prêmios</button>
              <button onClick={() => scrollToSection("localizacao")} className="text-foreground hover:text-primary transition-colors font-medium">Localização</button>
              <button onClick={() => scrollToSection("faq")} className="text-foreground hover:text-primary transition-colors font-medium">FAQ</button>
            </nav>

            <div className="hidden md:flex items-center gap-3">
              <Link to="/influenciadores/login">
                <Button
                  variant="ghost"
                  className="text-foreground hover:text-primary font-medium border border-transparent hover:border-border"
                >
                  Já sou parceira
                </Button>
              </Link>
              <Button
                onClick={onScrollToForm}
                className="bg-gradient-to-r from-[#7c3aed] to-[#3b82f6] hover:from-[#6d28d9] hover:to-[#2563eb] text-white font-semibold uppercase tracking-wide shadow-lg hover:shadow-xl transition-all"
              >
                Cadastre-se Agora
              </Button>
            </div>

            {/* Mobile Menu Button */}
            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="md:hidden text-foreground">
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>

            {/* Mobile Menu */}
            {isMobileMenuOpen && (
              <div className="absolute top-[70px] left-0 right-0 bg-white shadow-lg md:hidden py-4 px-4 border-t border-border">
                <nav className="flex flex-col gap-4">
                  <button onClick={() => scrollToSection("beneficios")} className="text-foreground hover:text-primary transition-colors font-medium text-left">Benefícios</button>
                  <button onClick={() => scrollToSection("plano-conteudo")} className="text-foreground hover:text-primary transition-colors font-medium text-left">Plano de Conteúdo</button>
                  <button onClick={() => scrollToSection("premios")} className="text-foreground hover:text-primary transition-colors font-medium text-left">Prêmios</button>
                  <button onClick={() => scrollToSection("localizacao")} className="text-foreground hover:text-primary transition-colors font-medium text-left">Localização</button>
                  <button onClick={() => scrollToSection("faq")} className="text-foreground hover:text-primary transition-colors font-medium text-left">FAQ</button>
                  <Link to="/influenciadores/login" onClick={() => setIsMobileMenuOpen(false)}>
                    <Button
                      variant="outline"
                      className="w-full font-medium"
                    >
                      Já sou parceira
                    </Button>
                  </Link>
                  <Button
                    onClick={() => { onScrollToForm(); setIsMobileMenuOpen(false); }}
                    className="bg-gradient-to-r from-[#7c3aed] to-[#3b82f6] text-white font-semibold uppercase tracking-wide"
                  >
                    Cadastre-se Agora
                  </Button>
                </nav>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Spacer for fixed header */}
      <div className="h-[70px]" />

      {/* ── Hero Section ───────────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden py-16 sm:py-24 px-4"
        style={{ background: "linear-gradient(135deg, #e8e0f7 0%, #d4e4f9 50%, #f0eaf8 100%)" }}
      >
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 right-0 w-[60%] h-full" style={{
            backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 80px, rgba(124,58,237,0.08) 80px, rgba(124,58,237,0.08) 81px)",
          }} />
        </div>

        <div className="relative max-w-5xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div>
              <p className="text-sm uppercase tracking-widest text-purple-600 font-semibold mb-2">PROGRAMA DE PARCERIA COM</p>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black mb-4 leading-tight">
                <span className="text-[#7c3aed]">influencers</span>
              </h1>
              <p className="text-lg sm:text-xl text-gray-700 mb-6 max-w-lg">
                Visibilidade e benefícios para você e seus seguidores!
                {franchiseCity && (
                  <span className="block mt-2 text-purple-700 font-semibold">
                    Oportunidade para influencers em {franchiseCity}!
                  </span>
                )}
              </p>

              <div className="flex flex-col sm:flex-row gap-3 mb-8">
                <Button
                  size="lg"
                  onClick={onScrollToForm}
                  className="bg-gradient-to-r from-[#7c3aed] to-[#3b82f6] hover:from-[#6d28d9] hover:to-[#2563eb] text-white font-bold text-lg px-8 py-6 rounded-full shadow-xl"
                >
                  Quero me cadastrar
                  <ChevronDown className="ml-2 h-5 w-5 animate-bounce" />
                </Button>
              </div>

              <div className="inline-block bg-[#3b82f6]/10 border border-[#3b82f6]/30 rounded-lg px-4 py-2">
                <p className="text-sm font-bold text-[#3b82f6]">CADASTRE-SE DE 20/02 A 31/03</p>
              </div>
            </div>

            {/* Right: Visual */}
            <div className="hidden lg:flex justify-center">
              <div className="relative">
                <div className="w-72 h-72 rounded-3xl bg-gradient-to-br from-purple-200 to-blue-200 flex items-center justify-center shadow-2xl transform rotate-3">
                  <div className="w-64 h-64 rounded-2xl bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center transform -rotate-3">
                    <Users className="h-20 w-20 text-purple-500 mb-4" />
                    <p className="text-2xl font-black text-purple-700">venha</p>
                    <p className="text-2xl font-black text-[#3b82f6]">fazer parte!</p>
                  </div>
                </div>
                <div className="absolute -top-4 -left-4 w-10 h-10 rounded-full bg-purple-400/30 flex items-center justify-center"><Heart className="h-5 w-5 text-purple-500" /></div>
                <div className="absolute -bottom-2 -right-6 w-8 h-8 rounded-full bg-pink-400/30 flex items-center justify-center"><Heart className="h-4 w-4 text-pink-500" /></div>
                <div className="absolute top-1/2 -right-8 w-7 h-7 rounded-full bg-purple-300/40 flex items-center justify-center"><Heart className="h-3 w-3 text-purple-400" /></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── O que você recebe ──────────────────────────────────────────── */}
      <section id="beneficios" className="py-16 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-3">
            O que você recebe como influenciadora {displayName}?
          </h2>
          <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
            Permuta mensal com contrato simples: benefícios reais em troca de conteúdo estratégico.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <BenefitCard icon={<Gift className="h-8 w-8" />} title="3 Serviços/mês" description="Serviços exclusivos gratuitos como permuta pela parceria." color="#7c3aed" />
            <BenefitCard icon={<Percent className="h-8 w-8" />} title="1% de Comissão" description="Sobre cada contrato fechado por sua indicação. Ex: cliente fechou R$1.300 → você ganha comissão sobre a venda." color="#3b82f6" />
            <BenefitCard icon={<Trophy className="h-8 w-8" />} title="Prêmios Top 3" description="As 3 melhores do ranking mensal ganham prêmios premium exclusivos." color="#f59e0b" />
            <BenefitCard icon={<DollarSign className="h-8 w-8" />} title="Cupom Exclusivo" description="Cupom personalizado com seu nome (ex: JULIA10). Condição especial para seus seguidores." color="#ec4899" />
            <BenefitCard icon={<Star className="h-8 w-8" />} title="Benefício p/ Seguidores" description="Quem vier pela sua indicação ganha condições exclusivas e benefícios especiais." color="#06b6d4" />
            <BenefitCard icon={<Heart className="h-8 w-8" />} title="Contrato Simples" description="Contrato digital de permuta sem burocracia. Assinatura 100% online com validade jurídica." color="#10b981" />
          </div>
        </div>
      </section>

      {/* ── Plano de Conteúdo ──────────────────────────────────────────── */}
      <section id="plano-conteudo" className="py-16 px-4 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-3">Plano de Conteúdo Mensal</h2>
          <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
            Conteúdo estratégico, não só "story solto". Veja o roteiro simples para cada procedimento.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <ContentCard icon={<Camera className="h-6 w-6" />} title="Antes do Atendimento" color="#7c3aed" items={[
              `1 story anunciando que vai fazer o procedimento`,
              `Ex: "Vou começar meu tratamento na ${tenantName} 😍"`,
              "Mencionar o cupom exclusivo",
            ]} />
            <ContentCard icon={<Sparkles className="h-6 w-6" />} title="Durante o Atendimento" color="#3b82f6" items={[
              "3 a 5 stories: chegada, ambiente, procedimento",
              "Mostrar o atendimento humanizado",
              "Sem expor demais — conteúdo autêntico",
            ]} />
            <ContentCard icon={<TrendingUp className="h-6 w-6" />} title="Depois do Atendimento" color="#ec4899" items={[
              "1 story com relato sincero do resultado",
              "1 post no feed OU Reels",
              '"Quem vier pela minha indicação ganha condição especial 💖"',
            ]} />
          </div>

          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-6">
            <Card className="border-2 border-purple-200 bg-purple-50/50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 mb-3">
                  <Instagram className="h-5 w-5 text-purple-600" />
                  <h3 className="font-semibold text-purple-900">Metas Mensais</h3>
                </div>
                <ul className="space-y-2 text-sm text-purple-800">
                  <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-purple-500 flex-shrink-0" /> Stories no dia de cada sessão (3 a 5 por visita)</li>
                  <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-purple-500 flex-shrink-0" /> 1 post no feed ou Reels após cada procedimento</li>
                  <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-purple-500 flex-shrink-0" /> Usar cupom exclusivo nos CTAs</li>
                  <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-purple-500 flex-shrink-0" /> Marcar a unidade {tenantName} no local</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-2 border-blue-200 bg-blue-50/50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 mb-3">
                  <Gift className="h-5 w-5 text-blue-600" />
                  <h3 className="font-semibold text-blue-900">Benefício para Seguidores</h3>
                </div>
                <ul className="space-y-2 text-sm text-blue-800">
                  <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" /> Cupom com seu nome (ex: JULIA10)</li>
                  <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" /> 10 sessões em uma área P</li>
                  <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" /> 2 sessões de massagem/pump glúteo</li>
                  <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" /> <strong>Tudo por apenas R$ 79,90</strong></li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* ── Prêmios do Ranking ────────────────────────────────────────── */}
      <section id="premios" className="py-16 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-3">Prêmio Especial — Top 3 do Ranking</h2>
          <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
            As 3 influenciadoras com mais vendas indicadas poderão escolher entre procedimentos premium:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <Card className="border-2 border-yellow-300 bg-gradient-to-b from-yellow-50 to-white shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="pt-6 text-center">
                <div className="w-16 h-16 rounded-full bg-yellow-100 flex items-center justify-center mx-auto mb-4"><Trophy className="h-8 w-8 text-yellow-600" /></div>
                <p className="text-xs uppercase tracking-wider text-yellow-600 font-bold mb-1">1º Lugar</p>
                <p className="font-bold text-lg mb-3">Escolha seu prêmio</p>
                <p className="text-sm text-muted-foreground">Escolha entre os procedimentos premium abaixo</p>
              </CardContent>
            </Card>
            <Card className="border-2 border-gray-300 bg-gradient-to-b from-gray-50 to-white shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="pt-6 text-center">
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4"><Trophy className="h-8 w-8 text-gray-500" /></div>
                <p className="text-xs uppercase tracking-wider text-gray-500 font-bold mb-1">2º Lugar</p>
                <p className="font-bold text-lg mb-3">Escolha seu prêmio</p>
                <p className="text-sm text-muted-foreground">Escolha entre os procedimentos premium abaixo</p>
              </CardContent>
            </Card>
            <Card className="border-2 border-amber-300 bg-gradient-to-b from-amber-50 to-white shadow-lg hover:shadow-xl transition-shadow sm:col-span-2 lg:col-span-1">
              <CardContent className="pt-6 text-center">
                <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4"><Trophy className="h-8 w-8 text-amber-700" /></div>
                <p className="text-xs uppercase tracking-wider text-amber-700 font-bold mb-1">3º Lugar</p>
                <p className="font-bold text-lg mb-3">Escolha seu prêmio</p>
                <p className="text-sm text-muted-foreground">Escolha entre os procedimentos premium abaixo</p>
              </CardContent>
            </Card>
          </div>

          <Card className="border-2 border-purple-200 bg-purple-50/30">
            <CardContent className="pt-6">
              <h3 className="font-bold text-center mb-4 text-purple-900">Prêmios disponíveis para as Top 3:</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {[
                  { name: "Serviço Premium A", icon: <Sparkles className="h-4 w-4" /> },
                  { name: "Serviço Premium B", icon: <Scissors className="h-4 w-4" /> },
                  { name: "Serviço Premium C", icon: <Zap className="h-4 w-4" /> },
                  { name: "Consultoria VIP", icon: <Star className="h-4 w-4" /> },
                  { name: "Atendimento Exclusivo", icon: <Heart className="h-4 w-4" /> },
                  { name: "Pacote Especial", icon: <TrendingUp className="h-4 w-4" /> },
                  { name: "Benefício Premium", icon: <Sparkles className="h-4 w-4" /> },
                ].map((proc) => (
                  <div key={proc.name} className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-purple-100">
                    <span className="text-purple-500">{proc.icon}</span>
                    <span className="text-sm font-medium text-purple-900">{proc.name}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ── Como Funciona ──────────────────────────────────────────────── */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-12">Como funciona?</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <StepCard number={1} icon={<Smartphone className="h-6 w-6" />} title="Cadastre-se" description="Preencha o formulário abaixo com seus dados e redes sociais." />
            <StepCard number={2} icon={<Users className="h-6 w-6" />} title="Análise" description="Nossa equipe avalia seu perfil e entra em contato em até 48h." />
            <StepCard number={3} icon={<Zap className="h-6 w-6" />} title="Contrato" description="Assine seu contrato digital de permuta e receba seu cupom exclusivo." />
            <StepCard number={4} icon={<Heart className="h-6 w-6" />} title="Comece!" description="Faça seus procedimentos, crie conteúdo estratégico e ganhe comissões!" />
          </div>
        </div>
      </section>

      {/* ── Comissão ──────────────────────────────────────────────────── */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gradient-to-r from-[#7c3aed]/5 to-[#3b82f6]/5 border-2 border-purple-200 rounded-2xl p-8 sm:p-12 text-center">
            <DollarSign className="h-12 w-12 text-purple-600 mx-auto mb-4" />
            <h2 className="text-2xl sm:text-3xl font-bold mb-4">Ganhe 1% de comissão sobre cada venda</h2>
            <p className="text-muted-foreground max-w-xl mx-auto mb-6">Cada contrato fechado por indicação sua gera comissão automática.</p>
            <div className="inline-block bg-white border-2 border-purple-300 rounded-xl px-6 py-4 shadow-sm">
              <p className="text-sm text-muted-foreground mb-1">Exemplo:</p>
              <p className="text-lg font-bold text-purple-900">
                Cliente fechou <span className="text-green-600">R$ 1.300</span> → você recebe comissão sobre a venda
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Avaliações / Depoimentos ──────────────────────────────────── */}
      <section className="py-16 px-4 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-yellow-100 text-yellow-800 font-semibold px-4 py-2 rounded-full text-sm mb-4">
              <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
              4.9 estrelas no Google
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold mb-3">O que dizem nossas influenciadoras</h2>
            <p className="text-muted-foreground">Avaliações reais de quem já faz parte do programa</p>
          </div>

          <div className="relative overflow-hidden">
            <div className="flex transition-transform duration-500 ease-out" style={{ transform: `translateX(-${currentTestimonial * 100}%)` }}>
              {testimonials.map((t, index) => (
                <div key={index} className="min-w-full px-4">
                  <Card className="shadow-lg">
                    <CardContent className="p-8 md:p-12">
                      <div className="flex gap-1 mb-4 justify-center">
                        {[...Array(t.rating)].map((_, i) => (
                          <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                        ))}
                      </div>
                      <p className="text-lg md:text-xl text-center text-foreground mb-6 italic leading-relaxed">"{t.text}"</p>
                      <div className="text-center">
                        <p className="font-semibold text-foreground">— {t.author}, {t.location}</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          </div>

          {/* Dots */}
          <div className="flex justify-center gap-2 mt-6">
            {testimonials.map((_, index) => (
              <button key={index} onClick={() => setCurrentTestimonial(index)} className={`w-2 h-2 rounded-full transition-all ${index === currentTestimonial ? "bg-purple-600 w-8" : "bg-gray-300 hover:bg-purple-300"}`} aria-label={`Depoimento ${index + 1}`} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Localização com Mapa ───────────────────────────────────────── */}
      <section id="localizacao" className="py-16 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold mb-3">
              Nossa <span className="text-purple-600">Localização</span>
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              {franchiseCity ? `Venha nos visitar em ${franchiseCity}! Conheça nossa estrutura completa.` : "Venha nos visitar! Conheça nossa estrutura completa."}
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 items-stretch">
            {/* Google Maps Embed */}
            <div className="rounded-2xl overflow-hidden shadow-lg border border-border min-h-[300px] md:min-h-[400px]">
              {franchiseMapEmbedUrl ? (
                <iframe
                  src={franchiseMapEmbedUrl}
                  width="100%"
                  height="100%"
                  style={{ border: 0, minHeight: "300px" }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title={`Localização ${displayName}`}
                  className="w-full h-full"
                />
              ) : (
                <div className="w-full h-full min-h-[300px] bg-gray-100 flex items-center justify-center">
                  <div className="text-center text-muted-foreground">
                    <MapPin className="h-12 w-12 mx-auto mb-2 text-purple-300" />
                    <p className="font-medium">{displayName}</p>
                    {franchiseAddress && <p className="text-sm mt-1">{franchiseAddress}</p>}
                  </div>
                </div>
              )}
            </div>

            {/* Contact Info */}
            <div className="space-y-5">
              {franchiseAddress && (
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground mb-1">Endereço</h3>
                    <p className="text-muted-foreground text-sm">{franchiseAddress}</p>
                  </div>
                </div>
              )}

              {whatsappClean && (
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <MessageCircle className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground mb-1">WhatsApp</h3>
                    <a href={`https://wa.me/${whatsappClean}`} target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:underline font-medium text-sm">
                      {franchisePhone}
                    </a>
                  </div>
                </div>
              )}

              {franchiseEmail && (
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Mail className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground mb-1">Email</h3>
                    <a href={`mailto:${franchiseEmail}`} className="text-purple-600 hover:underline font-medium text-sm">{franchiseEmail}</a>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-pink-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Instagram className="w-6 h-6 text-pink-600" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground mb-1">Instagram</h3>
                  <a href={`https://instagram.com/${igHandle}`} target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:underline font-medium text-sm">
                    @{igHandle}
                  </a>
                </div>
              </div>

              {franchiseTiktok && (
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <TikTokIcon className="w-6 h-6 text-gray-800" />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground mb-1">TikTok</h3>
                    <a href={`https://tiktok.com/${franchiseTiktok.startsWith("@") ? franchiseTiktok : `@${franchiseTiktok}`}`} target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:underline font-medium text-sm">
                      {franchiseTiktok.startsWith("@") ? franchiseTiktok : `@${franchiseTiktok}`}
                    </a>
                  </div>
                </div>
              )}

              {franchiseFacebook && (
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <FacebookIcon className="w-6 h-6 text-blue-700" />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground mb-1">Facebook</h3>
                    <a href={franchiseFacebook} target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:underline font-medium text-sm">
                      Facebook
                    </a>
                  </div>
                </div>
              )}

              {franchiseHours && (
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Clock className="w-6 h-6 text-yellow-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground mb-1">Horário</h3>
                    <p className="text-muted-foreground text-sm">{franchiseHours}</p>
                  </div>
                </div>
              )}

              {franchiseMapUrl && (
                <Button onClick={() => window.open(franchiseMapUrl, "_blank")} className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold mt-2" size="lg">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Abrir no Google Maps
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Requisitos ─────────────────────────────────────────────────── */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold mb-8">Requisitos</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="flex flex-col items-center gap-2 p-4">
              <div className="w-14 h-14 rounded-full bg-purple-100 flex items-center justify-center"><Users className="h-6 w-6 text-purple-600" /></div>
              <p className="font-semibold">5.000+ seguidores</p>
              <p className="text-sm text-muted-foreground">Em pelo menos uma rede social</p>
            </div>
            <div className="flex flex-col items-center gap-2 p-4">
              <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center"><Instagram className="h-6 w-6 text-blue-600" /></div>
              <p className="font-semibold">Perfil público</p>
              <p className="text-sm text-muted-foreground">Conta aberta e ativa</p>
            </div>
            <div className="flex flex-col items-center gap-2 p-4">
              <div className="w-14 h-14 rounded-full bg-pink-100 flex items-center justify-center"><MapPin className="h-6 w-6 text-pink-600" /></div>
              <p className="font-semibold">Morar na região</p>
              <p className="text-sm text-muted-foreground">{franchiseCity ? `Em ${franchiseCity} ou proximidades` : "Perto de uma unidade"}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ────────────────────────────────────────────────────────── */}
      <section id="faq" className="py-16 px-4 bg-white">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-8">Perguntas Frequentes</h2>
          <div className="space-y-4">
            <FaqItem question="O que eu recebo como influenciadora?" answer="Você recebe 3 serviços gratuitos por mês como permuta, além de 1% de comissão sobre vendas feitas com seu cupom." />
            <FaqItem question="Como funciona a permuta?" answer="É um contrato simples: você recebe serviços gratuitos em troca de conteúdo estratégico nas redes sociais (stories, posts e reels seguindo nosso plano de conteúdo)." />
            <FaqItem question="Como ganho comissão?" answer="Você recebe um cupom exclusivo com seu nome (ex: JULIA10). Cada venda feita com seu cupom gera 1% de comissão automática para você." />
            <FaqItem question="O que meus seguidores ganham?" answer="Quem vier pela sua indicação ganha condições exclusivas e benefícios especiais." />
            <FaqItem question="O que são os prêmios do ranking?" answer="As 3 influenciadoras com mais vendas indicadas ganham prêmios premium exclusivos." />
            <FaqItem question="Preciso ter muitos seguidores?" answer="A partir de 5.000 seguidores em qualquer rede social você já pode se candidatar. Valorizamos engajamento mais do que números." />
            <FaqItem question="Quanto tempo dura o contrato?" answer="O contrato de permuta é mensal e renovável. Você pode sair a qualquer momento sem multa." />
            <FaqItem question="Por que o valor do contrato é diferente do valor real dos serviços?" answer="O valor declarado no contrato é uma margem de referência. Como fazemos promoções frequentes, usamos um valor médio que reflete a realidade das promoções, mantendo tudo transparente e justo para ambas as partes." />
          </div>
        </div>
      </section>

      {/* ── CTA Final ──────────────────────────────────────────────────── */}
      <section className="py-16 px-4 text-center text-white" style={{ background: "linear-gradient(135deg, #7c3aed, #3b82f6)" }}>
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4">Venha fazer parte!</h2>
          <p className="text-white/90 mb-3">Preencha o formulário abaixo e nossa equipe entrará em contato em até 48h.</p>
          <p className="text-sm text-white/70 mb-8 font-semibold">CADASTRE-SE DE 20/02 A 31/03</p>
          <Button size="lg" onClick={onScrollToForm} className="bg-white text-gray-900 hover:bg-white/90 font-bold text-lg px-8 py-6 rounded-full shadow-xl">
            Cadastrar agora
            <ChevronDown className="ml-2 h-5 w-5 animate-bounce" />
          </Button>
        </div>
      </section>

      {/* ── Conteúdo extra (formulário de cadastro) ────────────────────── */}
      {children}

      {/* ── Footer Completo ───────────────────────────────────────────── */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            {/* Col 1: Logo + Descrição */}
            <div>
              <img src={finalLogo} alt={displayName} className="h-14 mb-4" style={{ filter: "drop-shadow(0 0 5px rgba(255,255,255,0.4))" }} />
              <p className="text-gray-400 text-sm leading-relaxed">
                {displayName}
                {franchiseCity && ` — ${franchiseCity}`}
                <br />
                Plataforma completa de gestão imobiliária.
              </p>
            </div>

            {/* Col 2: Contato */}
            <div>
              <h4 className="font-bold text-lg mb-4">Contato</h4>
              <div className="space-y-3 text-sm">
                {franchiseAddress && (
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
                    <p className="text-gray-400">{franchiseAddress}</p>
                  </div>
                )}
                {franchisePhone && (
                  <a href={`https://wa.me/${whatsappClean}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
                    <Phone className="w-4 h-4 text-purple-400 flex-shrink-0" />
                    {franchisePhone}
                  </a>
                )}
                {franchiseEmail && (
                  <a href={`mailto:${franchiseEmail}`} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
                    <Mail className="w-4 h-4 text-purple-400 flex-shrink-0" />
                    {franchiseEmail}
                  </a>
                )}
                {franchiseHours && (
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-purple-400 flex-shrink-0" />
                    <p className="text-gray-400">{franchiseHours}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Col 3: Redes Sociais */}
            <div>
              <h4 className="font-bold text-lg mb-4">Redes Sociais</h4>
              <div className="space-y-3 text-sm">
                <a href={`https://instagram.com/${igHandle}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
                  <Instagram className="w-4 h-4 text-pink-400" />
                  @{igHandle}
                </a>
                {franchiseTiktok && (
                  <a href={`https://tiktok.com/${franchiseTiktok.startsWith("@") ? franchiseTiktok : `@${franchiseTiktok}`}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
                    <TikTokIcon className="w-4 h-4" />
                    {franchiseTiktok.startsWith("@") ? franchiseTiktok : `@${franchiseTiktok}`}
                  </a>
                )}
                {franchiseFacebook && (
                  <a href={franchiseFacebook} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
                    <FacebookIcon className="w-4 h-4 text-blue-400" />
                    Facebook
                  </a>
                )}
                {franchiseWebsite && (
                  <a href={franchiseWebsite} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
                    <Globe className="w-4 h-4 text-blue-300" />
                    {franchiseWebsite.replace("https://", "").replace("http://", "")}
                  </a>
                )}
              </div>
            </div>

            {/* Col 4: Atendimento */}
            <div>
              <h4 className="font-bold text-lg mb-4">Atendimento</h4>
              {whatsappClean && (
                <a
                  href={`https://wa.me/${whatsappClean}?text=${encodeURIComponent(`Olá! Quero saber mais sobre o programa de influenciadoras ${displayName}!`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm font-semibold rounded-full px-4 py-2 transition-opacity hover:opacity-90 w-fit mb-4"
                  style={{ background: "#25D366", color: "#fff" }}
                >
                  <WhatsAppSvg className="w-4 h-4" />
                  Fale pelo WhatsApp
                </a>
              )}
              <div className="text-sm text-gray-400">
                <p>Política de Privacidade</p>
                <p className="mt-1">Termos de Uso</p>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-6 text-center text-xs text-gray-500">
            © {new Date().getFullYear()} {displayName}. Todos os direitos reservados.
            {franchiseCity && franchiseState && <span> | {franchiseCity} - {franchiseState}</span>}
          </div>
        </div>
      </footer>

      {/* ── WhatsApp Flutuante ─────────────────────────────────────────── */}
      {whatsappClean && (
        <button
          onClick={() => {
            if (typeof window !== "undefined" && (window as any).dataLayer) {
              (window as any).dataLayer.push({ event: "whatsapp_click", clickLocation: "floating_button" });
            }
            window.open(
              `https://wa.me/${whatsappClean}?text=${encodeURIComponent(`Olá! Quero saber mais sobre o programa de influenciadoras ${displayName}!`)}`,
              "_blank"
            );
          }}
          className="fixed bottom-6 right-6 z-50 w-16 h-16 bg-[#25D366] hover:bg-[#22c55e] rounded-full shadow-2xl flex items-center justify-center transition-transform hover:scale-110 group"
          style={{ animation: "pulse 2s infinite" }}
          aria-label="Fale conosco no WhatsApp"
        >
          <WhatsAppSvg className="w-9 h-9 text-white" />
          <span className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
            Fale com a gente!
          </span>
        </button>
      )}
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function BenefitCard({ icon, title, description, color }: { icon: React.ReactNode; title: string; description: string; color: string }) {
  return (
    <Card className="text-center hover:shadow-lg transition-shadow border-0 shadow-md">
      <CardContent className="pt-6 pb-6">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: `${color}15`, color }}>{icon}</div>
        <h3 className="font-bold mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

function StepCard({ number, icon, title, description }: { number: number; icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="relative mb-4">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#7c3aed] to-[#3b82f6] flex items-center justify-center text-white shadow-lg">{icon}</div>
        <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-yellow-400 text-yellow-900 text-xs font-bold flex items-center justify-center">{number}</div>
      </div>
      <h3 className="font-bold mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function ContentCard({ icon, title, color, items }: { icon: React.ReactNode; title: string; color: string; items: string[] }) {
  return (
    <Card className="border-t-4" style={{ borderTopColor: color }}>
      <CardContent className="pt-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}15`, color }}>{icon}</div>
          <h3 className="font-bold">{title}</h3>
        </div>
        <ul className="space-y-2">
          {items.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
              <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color }} />
              {item}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function FaqItem({ question, answer }: { question: string; answer: string }) {
  return (
    <details className="group border rounded-lg">
      <summary className="flex items-center justify-between p-4 cursor-pointer font-medium hover:bg-gray-50 rounded-lg">
        {question}
        <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
      </summary>
      <p className="px-4 pb-4 text-sm text-muted-foreground">{answer}</p>
    </details>
  );
}
