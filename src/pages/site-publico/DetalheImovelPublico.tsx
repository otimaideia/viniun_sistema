import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Home,
  MapPin,
  BedDouble,
  Bath,
  Car,
  Maximize2,
  Ruler,
  Waves,
  Star,
  ChevronLeft,
  ChevronRight,
  X,
  ZoomIn,
  Camera,
  Phone,
  Mail,
  Calendar,
  Clock,
  DollarSign,
  Building2,
  Share2,
  Heart,
  Copy,
  Check,
  Play,
} from "lucide-react";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(value: number | null | undefined): string {
  if (!value) return "-";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("pt-BR");
}

function formatArea(value: number | null | undefined): string {
  if (!value) return "-";
  return `${value} m\u00B2`;
}

// ---------------------------------------------------------------------------
// Photo Gallery
// ---------------------------------------------------------------------------

function PublicPhotoGallery({
  fotos,
  titulo,
  fotoDestaque,
  videoUrl,
}: {
  fotos: any[];
  titulo: string;
  fotoDestaque?: string | null;
  videoUrl?: string | null;
}) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const thumbRef = useRef<HTMLDivElement>(null);

  const allPhotos = useMemo(() => {
    if (fotos.length > 0) return fotos;
    if (fotoDestaque)
      return [{ id: "destaque", url: fotoDestaque, thumbnail_url: null }];
    return [];
  }, [fotos, fotoDestaque]);

  const goNext = useCallback(() => {
    setSelectedIndex((i) => (i + 1) % allPhotos.length);
  }, [allPhotos.length]);

  const goPrev = useCallback(() => {
    setSelectedIndex((i) => (i - 1 + allPhotos.length) % allPhotos.length);
  }, [allPhotos.length]);

  useEffect(() => {
    if (!lightboxOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") goNext();
      else if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "Escape") setLightboxOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [lightboxOpen, goNext, goPrev]);

  if (allPhotos.length === 0) {
    return (
      <div className="rounded-lg h-64 md:h-96 bg-muted flex items-center justify-center">
        <Home className="h-20 w-20 text-muted-foreground/20" />
      </div>
    );
  }

  const currentFoto = allPhotos[selectedIndex];

  return (
    <>
      <div className="space-y-2">
        {/* Main photo */}
        <div
          className="relative rounded-lg overflow-hidden h-64 md:h-[480px] bg-muted cursor-pointer group"
          onClick={() => setLightboxOpen(true)}
        >
          <img
            src={currentFoto.url}
            alt={currentFoto.descricao || titulo}
            className="w-full h-full object-cover transition-transform group-hover:scale-[1.02]"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
            <ZoomIn className="h-10 w-10 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
          </div>
          {/* Counter */}
          <div className="absolute bottom-3 right-3 bg-black/60 text-white text-xs px-3 py-1 rounded-full flex items-center gap-1">
            <Camera className="h-3 w-3" />
            {selectedIndex + 1} / {allPhotos.length}
          </div>
          {/* Video button */}
          {videoUrl && (
            <a
              href={videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute top-3 left-3 bg-red-600 text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-1 hover:bg-red-700 transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <Play className="h-3 w-3" /> Video
            </a>
          )}
          {/* Arrows */}
          {allPhotos.length > 1 && (
            <>
              <button
                className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  goPrev();
                }}
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  goNext();
                }}
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          )}
        </div>

        {/* Thumbnails */}
        {allPhotos.length > 1 && (
          <div
            ref={thumbRef}
            className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin"
          >
            {allPhotos.map((foto: any, index: number) => (
              <div
                key={foto.id || index}
                className={`flex-shrink-0 rounded overflow-hidden h-16 w-24 cursor-pointer border-2 transition-all ${
                  index === selectedIndex
                    ? "border-primary ring-2 ring-primary/30"
                    : "border-transparent hover:border-muted-foreground/30"
                }`}
                onClick={() => setSelectedIndex(index)}
              >
                <img
                  src={foto.thumbnail_url || foto.url}
                  alt={foto.descricao || `Foto ${index + 1}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            className="absolute top-4 right-4 text-white hover:text-gray-300 z-10"
            onClick={() => setLightboxOpen(false)}
          >
            <X className="h-8 w-8" />
          </button>
          <div className="absolute top-4 left-4 text-white text-sm z-10">
            {selectedIndex + 1} / {allPhotos.length}
          </div>
          <img
            src={currentFoto.url}
            alt={currentFoto.descricao || titulo}
            className="max-h-[90vh] max-w-[90vw] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          {allPhotos.length > 1 && (
            <>
              <button
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/30 text-white rounded-full p-3 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  goPrev();
                }}
              >
                <ChevronLeft className="h-8 w-8" />
              </button>
              <button
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/30 text-white rounded-full p-3 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  goNext();
                }}
              >
                <ChevronRight className="h-8 w-8" />
              </button>
            </>
          )}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 max-w-[90vw] overflow-x-auto pb-2">
            {allPhotos.slice(0, 30).map((foto: any, index: number) => (
              <div
                key={foto.id || index}
                className={`flex-shrink-0 rounded overflow-hidden h-12 w-16 cursor-pointer border-2 transition-all ${
                  index === selectedIndex
                    ? "border-white"
                    : "border-transparent opacity-50 hover:opacity-100"
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedIndex(index);
                }}
              >
                <img
                  src={foto.thumbnail_url || foto.url}
                  alt=""
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Feature icon mapper
// ---------------------------------------------------------------------------

const featureIcons: Record<string, React.ReactNode> = {
  dormitorios: <BedDouble className="h-5 w-5" />,
  suites: <BedDouble className="h-5 w-5" />,
  banheiros: <Bath className="h-5 w-5" />,
  garagens: <Car className="h-5 w-5" />,
  salas: <Building2 className="h-5 w-5" />,
  area_util: <Ruler className="h-5 w-5" />,
  area_total: <Maximize2 className="h-5 w-5" />,
  distancia_praia: <Waves className="h-5 w-5" />,
};

// ---------------------------------------------------------------------------
// Contact Form
// ---------------------------------------------------------------------------

function ContactForm({
  propertyId,
  tenantId,
}: {
  propertyId: string;
  tenantId: string;
}) {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [mensagem, setMensagem] = useState("");

  const submitInquiry = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("mt_property_inquiries" as any)
        .insert({
          property_id: propertyId,
          tenant_id: tenantId,
          nome,
          email,
          telefone,
          mensagem,
          origem: "site_publico",
          status: "novo",
        });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Mensagem enviada com sucesso! Entraremos em contato.");
      setNome("");
      setEmail("");
      setTelefone("");
      setMensagem("");
    },
    onError: (err: any) => {
      toast.error(`Erro ao enviar: ${err.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !telefone.trim()) {
      toast.error("Preencha nome e telefone.");
      return;
    }
    submitInquiry.mutate();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-1">
        <Label htmlFor="contact-nome" className="text-xs">
          Nome *
        </Label>
        <Input
          id="contact-nome"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Seu nome completo"
          required
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="contact-email" className="text-xs">
          E-mail
        </Label>
        <Input
          id="contact-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="seu@email.com"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="contact-telefone" className="text-xs">
          Telefone *
        </Label>
        <Input
          id="contact-telefone"
          value={telefone}
          onChange={(e) => setTelefone(e.target.value)}
          placeholder="(XX) XXXXX-XXXX"
          required
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="contact-msg" className="text-xs">
          Mensagem
        </Label>
        <Textarea
          id="contact-msg"
          value={mensagem}
          onChange={(e) => setMensagem(e.target.value)}
          placeholder="Gostaria de mais informacoes sobre este imovel..."
          rows={3}
        />
      </div>
      <Button
        type="submit"
        className="w-full"
        disabled={submitInquiry.isPending}
      >
        {submitInquiry.isPending ? "Enviando..." : "Enviar Mensagem"}
      </Button>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Similar Properties
// ---------------------------------------------------------------------------

function SimilarProperties({
  currentId,
  bairroId,
  tipoId,
  tenantId,
}: {
  currentId: string;
  bairroId?: string | null;
  tipoId?: string | null;
  tenantId: string;
}) {
  const { data: similares = [] } = useQuery({
    queryKey: ["pub-similares", currentId, bairroId, tipoId],
    queryFn: async () => {
      let q = supabase
        .from("mt_properties" as any)
        .select(
          `id, slug, titulo, ref_code, valor_venda, valor_locacao, dormitorios, garagens, foto_destaque_url, situacao, destaque,
          tipo:mt_property_types!property_type_id(nome),
          cidade:mt_locations!location_cidade_id(nome),
          bairro:mt_locations!location_bairro_id(nome),
          mt_property_photos(url)`
        )
        .is("deleted_at", null)
        .eq("situacao", "disponivel")
        .eq("tenant_id", tenantId)
        .neq("id", currentId)
        .limit(4);

      if (bairroId) q = q.eq("location_bairro_id", bairroId);
      else if (tipoId) q = q.eq("property_type_id", tipoId);

      const { data } = await q;

      // If we got less than 4 from bairro, fill with tipo
      if (data && data.length < 4 && bairroId && tipoId) {
        const existingIds = data.map((d: any) => d.id);
        existingIds.push(currentId);
        const { data: extra } = await supabase
          .from("mt_properties" as any)
          .select(
            `id, slug, titulo, ref_code, valor_venda, valor_locacao, dormitorios, garagens, foto_destaque_url, situacao, destaque,
            tipo:mt_property_types!property_type_id(nome),
            cidade:mt_locations!location_cidade_id(nome),
            bairro:mt_locations!location_bairro_id(nome),
            mt_property_photos(url)`
          )
          .is("deleted_at", null)
          .eq("situacao", "disponivel")
          .eq("tenant_id", tenantId)
          .eq("property_type_id", tipoId)
          .not("id", "in", `(${existingIds.join(",")})`)
          .limit(4 - data.length);
        if (extra) data.push(...extra);
      }

      return data || [];
    },
    enabled: !!tenantId,
    staleTime: 60 * 1000,
  });

  if (similares.length === 0) return null;

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-bold">Imoveis Semelhantes</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {similares.map((p: any) => {
          const foto =
            p.foto_destaque_url || p.mt_property_photos?.[0]?.url || null;
          const price = p.valor_venda || p.valor_locacao;
          const slug = p.slug || p.id;
          return (
            <Link key={p.id} to={`/imovel/${slug}`} className="block group">
              <Card className="overflow-hidden hover:shadow-md transition-shadow h-full">
                <div className="relative h-40 bg-muted">
                  {foto ? (
                    <img
                      src={foto}
                      alt={p.titulo}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Home className="h-10 w-10 text-muted-foreground/30" />
                    </div>
                  )}
                </div>
                <CardContent className="p-3 space-y-1">
                  <h4 className="text-sm font-medium line-clamp-1">
                    {p.titulo}
                  </h4>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {[p.bairro?.nome, p.cidade?.nome]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                  <p className="text-sm font-bold text-primary">
                    {formatCurrency(price)}
                  </p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function DetalheImovelPublico() {
  const { slug } = useParams<{ slug: string }>();
  const [copied, setCopied] = useState(false);

  // ---- Load property ----

  const { data: imovel, isLoading } = useQuery({
    queryKey: ["pub-imovel-detail", slug],
    queryFn: async () => {
      // Try by slug first, fallback to id
      let q = supabase
        .from("mt_properties" as any)
        .select(
          `*,
          tipo:mt_property_types!property_type_id(id, nome),
          finalidade:mt_property_purposes!purpose_id(id, nome),
          cidade:mt_locations!location_cidade_id(id, nome),
          bairro:mt_locations!location_bairro_id(id, nome),
          estado:mt_locations!location_estado_id(id, nome, uf)`
        )
        .is("deleted_at", null);

      // UUID pattern check
      const isUUID =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          slug || ""
        );

      if (isUUID) {
        q = q.eq("id", slug!);
      } else {
        q = q.eq("slug", slug!);
      }

      const { data, error } = await q.single();
      if (error) {
        // Fallback: try the other field
        if (isUUID) {
          const { data: d2 } = await supabase
            .from("mt_properties" as any)
            .select(
              `*,
              tipo:mt_property_types!property_type_id(id, nome),
              finalidade:mt_property_purposes!purpose_id(id, nome),
              cidade:mt_locations!location_cidade_id(id, nome),
              bairro:mt_locations!location_bairro_id(id, nome),
              estado:mt_locations!location_estado_id(id, nome, uf)`
            )
            .is("deleted_at", null)
            .eq("slug", slug!)
            .single();
          return d2 as any;
        }
        const { data: d2 } = await supabase
          .from("mt_properties" as any)
          .select(
            `*,
            tipo:mt_property_types!property_type_id(id, nome),
            finalidade:mt_property_purposes!purpose_id(id, nome),
            cidade:mt_locations!location_cidade_id(id, nome),
            bairro:mt_locations!location_bairro_id(id, nome),
            estado:mt_locations!location_estado_id(id, nome, uf)`
          )
          .is("deleted_at", null)
          .eq("id", slug!)
          .single();
        return d2 as any;
      }
      return data as any;
    },
    enabled: !!slug,
  });

  // ---- Load photos ----

  const { data: fotos = [] } = useQuery({
    queryKey: ["pub-imovel-fotos", imovel?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("mt_property_photos" as any)
        .select("*")
        .eq("property_id", imovel!.id)
        .order("ordem", { ascending: true });
      return data || [];
    },
    enabled: !!imovel?.id,
  });

  // ---- Load features ----

  const { data: featureLinks = [] } = useQuery({
    queryKey: ["pub-imovel-features", imovel?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("mt_property_feature_links" as any)
        .select("*, feature:mt_property_features!feature_id(id, nome, categoria, icone)")
        .eq("property_id", imovel!.id);
      return data || [];
    },
    enabled: !!imovel?.id,
  });

  // ---- Features by category ----

  const featuresByCategory = useMemo(() => {
    const map: Record<string, string[]> = {};
    featureLinks.forEach((fl: any) => {
      const cat = fl.feature?.categoria || "outro";
      const nome = fl.feature?.nome;
      if (nome) {
        if (!map[cat]) map[cat] = [];
        map[cat].push(nome);
      }
    });
    return map;
  }, [featureLinks]);

  // ---- SEO ----

  useEffect(() => {
    if (!imovel) return;

    const tipoNome = imovel.tipo?.nome || "Imovel";
    const bairroNome = imovel.bairro?.nome || "";
    const cidadeNome = imovel.cidade?.nome || "";
    const dorms = imovel.dormitorios
      ? `${imovel.dormitorios} Dormitorios`
      : "";

    const titleParts = [tipoNome];
    if (bairroNome) titleParts.push(`em ${bairroNome}`);
    if (cidadeNome) titleParts.push(cidadeNome);
    if (dorms) titleParts.push(dorms);
    document.title = titleParts.join(" - ");

    // Meta description
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement("meta");
      metaDesc.setAttribute("name", "description");
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute(
      "content",
      imovel.descricao
        ? imovel.descricao.substring(0, 160)
        : `${tipoNome} ${dorms} ${bairroNome ? `em ${bairroNome}` : ""} ${cidadeNome}. ${formatCurrency(imovel.valor_venda || imovel.valor_locacao)}.`
    );

    // Canonical
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute(
      "href",
      `${window.location.origin}/imovel/${imovel.slug || imovel.id}`
    );

    return () => {
      document.title = "Viniun";
      canonical?.remove();
    };
  }, [imovel]);

  // ---- JSON-LD ----

  useEffect(() => {
    if (!imovel) return;

    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "RealEstateListing",
      name:
        imovel.titulo ||
        `${imovel.tipo?.nome || "Imovel"} em ${imovel.bairro?.nome || ""}`,
      description: imovel.descricao || "",
      url: `${window.location.origin}/imovel/${imovel.slug || imovel.id}`,
      image: fotos.length > 0
        ? fotos.map((f: any) => f.url)
        : imovel.foto_destaque_url
          ? [imovel.foto_destaque_url]
          : [],
      offers: {
        "@type": "Offer",
        price: String(imovel.valor_venda || imovel.valor_locacao || 0),
        priceCurrency: "BRL",
        availability: imovel.situacao === "disponivel"
          ? "https://schema.org/InStock"
          : "https://schema.org/SoldOut",
      },
      address: {
        "@type": "PostalAddress",
        streetAddress: imovel.endereco || "",
        addressLocality: imovel.cidade?.nome || "",
        addressRegion: imovel.estado?.uf || "",
        postalCode: imovel.cep || "",
        addressCountry: "BR",
      },
      ...(imovel.dormitorios && { numberOfRooms: imovel.dormitorios }),
      ...(imovel.banheiros && { numberOfBathroomsTotal: imovel.banheiros }),
      ...(imovel.area_util && {
        floorSize: {
          "@type": "QuantitativeValue",
          value: String(imovel.area_util),
          unitCode: "MTK",
        },
      }),
      ...(imovel.latitude &&
        imovel.longitude && {
          geo: {
            "@type": "GeoCoordinates",
            latitude: imovel.latitude,
            longitude: imovel.longitude,
          },
        }),
    };

    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.textContent = JSON.stringify(jsonLd);
    script.id = "property-jsonld";
    document.head.appendChild(script);

    return () => {
      const existing = document.getElementById("property-jsonld");
      existing?.remove();
    };
  }, [imovel, fotos]);

  // ---- Share / Copy URL ----

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: imovel?.titulo || "Imovel",
          url,
        });
      } catch {
        /* user cancelled */
      }
    } else {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Link copiado!");
    }
  };

  // ---- WhatsApp link ----

  const whatsappUrl = useMemo(() => {
    if (!imovel) return "#";
    const text = encodeURIComponent(
      `Ola! Tenho interesse no imovel: ${imovel.titulo || ""}${imovel.ref_code ? ` (Ref: ${imovel.ref_code})` : ""}\n${window.location.href}`
    );
    return `https://wa.me/?text=${text}`;
  }, [imovel]);

  // ---- Loading state ----

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b bg-white sticky top-0 z-30">
          <div className="container mx-auto px-4 py-3">
            <Skeleton className="h-6 w-32" />
          </div>
        </header>
        <main className="container mx-auto px-4 py-6 space-y-6">
          <Skeleton className="h-4 w-64" />
          <Skeleton className="h-[400px] w-full rounded-lg" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-40 w-full" />
            </div>
            <div className="space-y-4">
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!imovel) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Home className="h-16 w-16 mx-auto text-muted-foreground/30" />
          <h2 className="text-xl font-medium">Imovel nao encontrado</h2>
          <p className="text-sm text-muted-foreground">
            O imovel que voce procura nao existe ou foi removido.
          </p>
          <Button asChild variant="outline">
            <Link to="/busca">Voltar para busca</Link>
          </Button>
        </div>
      </div>
    );
  }

  // ---- Computed values ----

  const tipoNome = imovel.tipo?.nome || "Imovel";
  const finalidadeNome = imovel.finalidade?.nome || "";
  const bairroNome = imovel.bairro?.nome || "";
  const cidadeNome = imovel.cidade?.nome || "";
  const estadoUF = imovel.estado?.uf || "";
  const price = imovel.valor_venda || imovel.valor_locacao;

  // Property quick features grid
  const quickFeatures = [
    {
      label: "Dormitorios",
      value: imovel.dormitorios,
      icon: featureIcons.dormitorios,
    },
    { label: "Suites", value: imovel.suites, icon: featureIcons.suites },
    {
      label: "Banheiros",
      value: imovel.banheiros,
      icon: featureIcons.banheiros,
    },
    { label: "Garagens", value: imovel.garagens, icon: featureIcons.garagens },
    { label: "Salas", value: imovel.salas, icon: featureIcons.salas },
    {
      label: "Area Util",
      value: imovel.area_util ? `${imovel.area_util} m\u00B2` : null,
      icon: featureIcons.area_util,
    },
    {
      label: "Area Total",
      value: imovel.area_total ? `${imovel.area_total} m\u00B2` : null,
      icon: featureIcons.area_total,
    },
    {
      label: "Dist. Praia",
      value: imovel.distancia_praia
        ? `${imovel.distancia_praia}m`
        : null,
      icon: featureIcons.distancia_praia,
    },
  ].filter((f) => f.value != null && f.value !== 0 && f.value !== "0");

  const statusLabel =
    imovel.situacao === "disponivel"
      ? "Disponivel"
      : imovel.situacao === "vendido"
        ? "Vendido"
        : imovel.situacao === "reservado"
          ? "Reservado"
          : imovel.situacao || "Disponivel";

  const statusColor =
    imovel.situacao === "disponivel"
      ? "bg-green-100 text-green-800"
      : imovel.situacao === "vendido"
        ? "bg-red-100 text-red-800"
        : "bg-yellow-100 text-yellow-800";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-white sticky top-0 z-30">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="text-xl font-bold text-primary">
            Viniun Imoveis
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/busca">
              <Button variant="outline" size="sm">
                Buscar Imoveis
              </Button>
            </Link>
            <Link to="/login">
              <Button variant="ghost" size="sm">
                Entrar
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1 text-sm text-muted-foreground flex-wrap">
          <Link to="/" className="hover:text-primary">
            Home
          </Link>
          <span>/</span>
          <Link to="/busca" className="hover:text-primary">
            {tipoNome}
          </Link>
          {cidadeNome && (
            <>
              <span>/</span>
              <Link
                to={`/busca?cidade=${imovel.location_cidade_id || ""}`}
                className="hover:text-primary"
              >
                {cidadeNome}
              </Link>
            </>
          )}
          {bairroNome && (
            <>
              <span>/</span>
              <span className="text-foreground font-medium">{bairroNome}</span>
            </>
          )}
        </nav>

        {/* Title bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">
              {imovel.titulo ||
                `${tipoNome} em ${bairroNome}${cidadeNome ? `, ${cidadeNome}` : ""}`}
            </h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {imovel.ref_code && (
                <Badge variant="outline" className="text-xs">
                  Ref: {imovel.ref_code}
                </Badge>
              )}
              <Badge className={statusColor}>{statusLabel}</Badge>
              {imovel.destaque && (
                <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">
                  <Star className="h-3 w-3 mr-1" /> Destaque
                </Badge>
              )}
              {finalidadeNome && (
                <Badge variant="secondary">{finalidadeNome}</Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleShare}>
              {copied ? (
                <Check className="h-4 w-4 mr-1" />
              ) : (
                <Share2 className="h-4 w-4 mr-1" />
              )}
              {copied ? "Copiado" : "Compartilhar"}
            </Button>
          </div>
        </div>

        {/* Photo Gallery */}
        <PublicPhotoGallery
          fotos={fotos}
          titulo={imovel.titulo || tipoNome}
          fotoDestaque={imovel.foto_destaque_url}
          videoUrl={imovel.video_youtube_url}
        />

        {/* Main content + Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left content (2 cols) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quick features grid */}
            {quickFeatures.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {quickFeatures.map((feat) => (
                  <div
                    key={feat.label}
                    className="border rounded-lg p-3 text-center space-y-1"
                  >
                    <div className="flex justify-center text-primary">
                      {feat.icon}
                    </div>
                    <p className="text-sm font-semibold">{feat.value}</p>
                    <p className="text-xs text-muted-foreground">
                      {feat.label}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Description */}
            {imovel.descricao && (
              <section>
                <h2 className="text-lg font-bold mb-3">Descricao</h2>
                <div className="prose prose-sm max-w-none text-muted-foreground whitespace-pre-wrap">
                  {imovel.descricao}
                </div>
              </section>
            )}

            {/* Caracteristicas */}
            {featuresByCategory.caracteristica &&
              featuresByCategory.caracteristica.length > 0 && (
                <section>
                  <h2 className="text-lg font-bold mb-3">Caracteristicas</h2>
                  <div className="flex flex-wrap gap-2">
                    {featuresByCategory.caracteristica.map((nome) => (
                      <Badge key={nome} variant="secondary" className="text-xs">
                        {nome}
                      </Badge>
                    ))}
                  </div>
                </section>
              )}

            {/* Acabamentos */}
            {featuresByCategory.acabamento &&
              featuresByCategory.acabamento.length > 0 && (
                <section>
                  <h2 className="text-lg font-bold mb-3">Acabamentos</h2>
                  <div className="flex flex-wrap gap-2">
                    {featuresByCategory.acabamento.map((nome) => (
                      <Badge key={nome} variant="outline" className="text-xs">
                        {nome}
                      </Badge>
                    ))}
                  </div>
                </section>
              )}

            {/* Proximidades */}
            {featuresByCategory.proximidade &&
              featuresByCategory.proximidade.length > 0 && (
                <section>
                  <h2 className="text-lg font-bold mb-3">Proximidades</h2>
                  <div className="flex flex-wrap gap-2">
                    {featuresByCategory.proximidade.map((nome) => (
                      <Badge key={nome} variant="outline" className="text-xs">
                        <MapPin className="h-3 w-3 mr-1" />
                        {nome}
                      </Badge>
                    ))}
                  </div>
                </section>
              )}

            {/* Financing */}
            {imovel.aceita_financiamento && (
              <section>
                <h2 className="text-lg font-bold mb-3">Financiamento</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Caixa */}
                  {(imovel.financiamento_caixa_entrada ||
                    imovel.financiamento_caixa_parcela) && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Caixa Economica</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        {imovel.financiamento_caixa_entrada && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              Entrada
                            </span>
                            <span className="font-medium">
                              {formatCurrency(
                                imovel.financiamento_caixa_entrada
                              )}
                            </span>
                          </div>
                        )}
                        {imovel.financiamento_caixa_parcela && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              Parcela
                            </span>
                            <span className="font-medium">
                              {formatCurrency(
                                imovel.financiamento_caixa_parcela
                              )}
                            </span>
                          </div>
                        )}
                        {imovel.financiamento_caixa_parcelas && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              Parcelas
                            </span>
                            <span className="font-medium">
                              {imovel.financiamento_caixa_parcelas}x
                            </span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}
                  {/* Construtora */}
                  {(imovel.financiamento_construtora_entrada ||
                    imovel.financiamento_construtora_parcela) && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Construtora</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        {imovel.financiamento_construtora_entrada && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              Entrada
                            </span>
                            <span className="font-medium">
                              {formatCurrency(
                                imovel.financiamento_construtora_entrada
                              )}
                            </span>
                          </div>
                        )}
                        {imovel.financiamento_construtora_parcela && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              Parcela
                            </span>
                            <span className="font-medium">
                              {formatCurrency(
                                imovel.financiamento_construtora_parcela
                              )}
                            </span>
                          </div>
                        )}
                        {imovel.financiamento_construtora_parcelas && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              Parcelas
                            </span>
                            <span className="font-medium">
                              {imovel.financiamento_construtora_parcelas}x
                            </span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </div>
              </section>
            )}

            {/* Location */}
            <section>
              <h2 className="text-lg font-bold mb-3">Localizacao</h2>
              <Card>
                <CardContent className="pt-4 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    {imovel.endereco && (
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Endereco
                        </p>
                        <p className="font-medium">
                          {imovel.endereco}
                          {imovel.numero ? `, ${imovel.numero}` : ""}
                          {imovel.complemento
                            ? ` - ${imovel.complemento}`
                            : ""}
                        </p>
                      </div>
                    )}
                    {bairroNome && (
                      <div>
                        <p className="text-xs text-muted-foreground">Bairro</p>
                        <p className="font-medium">{bairroNome}</p>
                      </div>
                    )}
                    {cidadeNome && (
                      <div>
                        <p className="text-xs text-muted-foreground">Cidade</p>
                        <p className="font-medium">
                          {cidadeNome}
                          {estadoUF ? ` - ${estadoUF}` : ""}
                        </p>
                      </div>
                    )}
                    {imovel.cep && (
                      <div>
                        <p className="text-xs text-muted-foreground">CEP</p>
                        <p className="font-medium">{imovel.cep}</p>
                      </div>
                    )}
                    {imovel.ponto_referencia && (
                      <div className="sm:col-span-2">
                        <p className="text-xs text-muted-foreground">
                          Ponto de Referencia
                        </p>
                        <p className="font-medium">{imovel.ponto_referencia}</p>
                      </div>
                    )}
                  </div>

                  {/* Google Maps embed */}
                  {imovel.latitude && imovel.longitude && (
                    <div className="rounded-lg overflow-hidden mt-4">
                      <iframe
                        title="Localizacao do Imovel"
                        width="100%"
                        height="300"
                        style={{ border: 0 }}
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                        src={`https://maps.google.com/maps?q=${imovel.latitude},${imovel.longitude}&z=15&output=embed`}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            </section>
          </div>

          {/* Sidebar (1 col) */}
          <div className="space-y-4">
            {/* Price card */}
            <Card className="sticky top-20">
              <CardContent className="pt-6 space-y-4">
                {/* Prices */}
                {imovel.valor_venda && (
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Valor de Venda
                    </p>
                    <p className="text-2xl font-bold text-primary">
                      {formatCurrency(imovel.valor_venda)}
                    </p>
                  </div>
                )}
                {imovel.valor_locacao && (
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Valor de Locacao
                    </p>
                    <p className="text-2xl font-bold text-blue-600">
                      {formatCurrency(imovel.valor_locacao)}
                      <span className="text-sm font-normal">/mes</span>
                    </p>
                  </div>
                )}
                {imovel.valor_promocional && (
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Valor Promocional
                    </p>
                    <p className="text-xl font-bold text-green-600">
                      {formatCurrency(imovel.valor_promocional)}
                    </p>
                  </div>
                )}

                {/* Extra costs */}
                {(imovel.valor_condominio || imovel.valor_iptu) && (
                  <div className="border-t pt-3 space-y-1 text-sm">
                    {imovel.valor_condominio && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Condominio
                        </span>
                        <span>{formatCurrency(imovel.valor_condominio)}</span>
                      </div>
                    )}
                    {imovel.valor_iptu && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">IPTU</span>
                        <span>{formatCurrency(imovel.valor_iptu)}</span>
                      </div>
                    )}
                  </div>
                )}

                <Separator />

                {/* WhatsApp */}
                <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                  <Button className="w-full bg-green-600 hover:bg-green-700">
                    <Phone className="h-4 w-4 mr-2" /> WhatsApp
                  </Button>
                </a>

                <Separator />

                {/* Contact form */}
                <div>
                  <h3 className="text-sm font-semibold mb-3">
                    Entre em Contato
                  </h3>
                  <ContactForm
                    propertyId={imovel.id}
                    tenantId={imovel.tenant_id}
                  />
                </div>

                <Separator />

                {/* Property info */}
                <div className="space-y-2 text-xs text-muted-foreground">
                  {imovel.ref_code && (
                    <div className="flex justify-between">
                      <span>Codigo</span>
                      <span className="font-medium text-foreground">
                        {imovel.ref_code}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Atualizado em</span>
                    <span className="font-medium text-foreground">
                      {formatDate(imovel.updated_at || imovel.created_at)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Disponibilidade</span>
                    <span className="font-medium text-foreground">
                      {statusLabel}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Similar properties */}
        <SimilarProperties
          currentId={imovel.id}
          bairroId={imovel.location_bairro_id}
          tipoId={imovel.property_type_id}
          tenantId={imovel.tenant_id}
        />
      </main>

      {/* Footer */}
      <footer className="border-t bg-muted/50 py-8 mt-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>Viniun - Plataforma de Gestao Imobiliaria</p>
        </div>
      </footer>
    </div>
  );
}
