// =============================================================================
// PORTAL XML EXPORT - Gera XML para portais imobiliários
// =============================================================================
// Formatos: ZAP/VivaReal (padrão Grupo ZAP), OLX, Imovelweb, genérico
// Cada portal tem seu formato XML específico
// =============================================================================

import { useState } from "react";
import { useTenantContext } from "@/contexts/TenantContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, FileText, Globe, Copy, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";

type PortalFormat = "zap" | "olx" | "imovelweb" | "chaves_na_mao";

const PORTAL_INFO: Record<PortalFormat, { name: string; description: string; color: string }> = {
  zap: { name: "ZAP Imóveis / VivaReal", description: "Formato padrão Grupo ZAP (ZAP, VivaReal, OLX Imóveis)", color: "bg-purple-100 text-purple-800" },
  olx: { name: "OLX", description: "Formato XML para OLX Brasil", color: "bg-orange-100 text-orange-800" },
  imovelweb: { name: "Imovelweb", description: "Formato padrão Imovelweb/Wimoveis", color: "bg-blue-100 text-blue-800" },
  chaves_na_mao: { name: "Chaves na Mão", description: "Formato Chaves na Mão", color: "bg-green-100 text-green-800" },
};

interface PropertyForExport {
  id: string;
  ref_code: string;
  titulo: string;
  descricao_completa: string;
  slug: string;
  valor_venda: number | null;
  valor_locacao: number | null;
  valor_condominio: number | null;
  valor_iptu: number | null;
  area_total: number | null;
  area_util: number | null;
  area_construida: number | null;
  dormitorios: number | null;
  suites: number | null;
  banheiros: number | null;
  vagas_garagem: number | null;
  finalidade: string;
  situacao: string;
  aceita_financiamento: boolean;
  aceita_permuta: boolean;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  mt_property_types: { nome: string; slug: string } | null;
  mt_property_purposes: { nome: string } | null;
  cidade_location: { nome: string; uf?: string } | null;
  bairro_location: { nome: string } | null;
  estado_location: { nome: string; uf?: string } | null;
  photos: { url: string; ordem: number }[];
}

function escapeXml(str: string | null | undefined): string {
  if (!str) return "";
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

function mapTipoToZap(tipo: string): string {
  const map: Record<string, string> = {
    apartamento: "Apartamento", casa: "Casa", terreno: "Terreno Padrão",
    sala_comercial: "Sala Comercial", loja: "Loja", galpao: "Galpão",
    cobertura: "Cobertura", kitnet: "Kitnet", flat: "Flat",
    sobrado: "Sobrado", chacara: "Chácara", fazenda: "Fazenda",
    sitio: "Sítio", predio: "Prédio Comercial",
  };
  return map[tipo?.toLowerCase()] || "Outros";
}

function mapFinalidadeToZap(finalidade: string): string {
  if (finalidade?.toLowerCase().includes("locacao") || finalidade?.toLowerCase().includes("aluguel")) return "Rental";
  return "Sale";
}

function generateZapXml(properties: PropertyForExport[], tenantName: string): string {
  const items = properties.map((p) => {
    const photos = (p.photos || [])
      .sort((a, b) => a.ordem - b.ordem)
      .slice(0, 20)
      .map((f, i) => `        <Image><URLImage>${escapeXml(f.url)}</URLImage><Main>${i === 0 ? "true" : "false"}</Main><Sequence>${i + 1}</Sequence></Image>`)
      .join("\n");

    return `    <Listing>
      <ListingID>${escapeXml(p.ref_code || p.id)}</ListingID>
      <Title>${escapeXml(p.titulo)}</Title>
      <TransactionType>${mapFinalidadeToZap(p.finalidade)}</TransactionType>
      <DetailViewUrl>https://www.viniimoveis.com.br/imovel/${escapeXml(p.slug)}</DetailViewUrl>
      <Media>
${photos}
      </Media>
      <Details>
        <PropertyType>${mapTipoToZap(p.mt_property_types?.slug || "")}</PropertyType>
        <Description>${escapeXml(p.descricao_completa?.substring(0, 5000))}</Description>
        ${p.valor_venda ? `<ListPrice>${p.valor_venda}</ListPrice>` : ""}
        ${p.valor_locacao ? `<RentalPrice>${p.valor_locacao}</RentalPrice>` : ""}
        ${p.valor_condominio ? `<PropertyAdministrationFee>${p.valor_condominio}</PropertyAdministrationFee>` : ""}
        ${p.valor_iptu ? `<YearlyTax>${p.valor_iptu}</YearlyTax>` : ""}
        ${p.area_util ? `<LivingArea unit="square metres">${p.area_util}</LivingArea>` : ""}
        ${p.area_total ? `<LotArea unit="square metres">${p.area_total}</LotArea>` : ""}
        ${p.dormitorios ? `<Bedrooms>${p.dormitorios}</Bedrooms>` : ""}
        ${p.suites ? `<Suites>${p.suites}</Suites>` : ""}
        ${p.banheiros ? `<Bathrooms>${p.banheiros}</Bathrooms>` : ""}
        ${p.vagas_garagem ? `<Garage type="Parking Spaces">${p.vagas_garagem}</Garage>` : ""}
      </Details>
      <Location>
        ${p.logradouro ? `<Address>${escapeXml(p.logradouro)}</Address>` : ""}
        ${p.numero ? `<StreetNumber>${escapeXml(p.numero)}</StreetNumber>` : ""}
        ${p.complemento ? `<Complement>${escapeXml(p.complemento)}</Complement>` : ""}
        ${p.bairro_location?.nome ? `<Neighborhood>${escapeXml(p.bairro_location.nome)}</Neighborhood>` : ""}
        ${p.cidade_location?.nome ? `<City>${escapeXml(p.cidade_location.nome)}</City>` : ""}
        ${p.estado_location?.uf ? `<State>${escapeXml(p.estado_location.uf)}</State>` : ""}
        ${p.cep ? `<PostalCode>${escapeXml(p.cep)}</PostalCode>` : ""}
        <Country>Brasil</Country>
      </Location>
    </Listing>`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<ListingDataFeed xmlns="http://www.vivareal.com/schemas/1.0/VRSync"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <Header>
    <Provider>${escapeXml(tenantName)}</Provider>
    <Email>contato@viniun.com.br</Email>
    <ContactName>${escapeXml(tenantName)}</ContactName>
  </Header>
  <Listings>
${items.join("\n")}
  </Listings>
</ListingDataFeed>`;
}

function generateOlxXml(properties: PropertyForExport[], tenantName: string): string {
  const ads = properties.map((p) => {
    const photos = (p.photos || [])
      .sort((a, b) => a.ordem - b.ordem)
      .slice(0, 10)
      .map((f) => `      <pic>${escapeXml(f.url)}</pic>`)
      .join("\n");

    const category = p.finalidade?.toLowerCase().includes("locacao") ? "1020" : "1000"; // Venda ou Aluguel de imóveis

    return `  <ad>
    <id>${escapeXml(p.ref_code || p.id)}</id>
    <title>${escapeXml(p.titulo?.substring(0, 70))}</title>
    <description>${escapeXml(p.descricao_completa?.substring(0, 6000))}</description>
    <category>${category}</category>
    <zipcode>${escapeXml(p.cep)}</zipcode>
    ${p.valor_venda ? `<price>${p.valor_venda}</price>` : ""}
    ${p.valor_locacao ? `<price>${p.valor_locacao}</price>` : ""}
    <type>${escapeXml(p.mt_property_types?.nome || "Outros")}</type>
    ${p.area_util ? `<rooms>${p.dormitorios || 0}</rooms>` : ""}
    ${p.area_util ? `<size>${p.area_util}</size>` : ""}
    ${p.vagas_garagem ? `<garage_spaces>${p.vagas_garagem}</garage_spaces>` : ""}
    <images>
${photos}
    </images>
  </ad>`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<olx_ads>
  <advertiser>
    <name>${escapeXml(tenantName)}</name>
  </advertiser>
${ads.join("\n")}
</olx_ads>`;
}

function generateImovelwebXml(properties: PropertyForExport[], tenantName: string): string {
  const props = properties.map((p) => {
    const photos = (p.photos || [])
      .sort((a, b) => a.ordem - b.ordem)
      .slice(0, 30)
      .map((f, i) => `      <foto orden="${i + 1}" url="${escapeXml(f.url)}" />`)
      .join("\n");

    const operacao = p.finalidade?.toLowerCase().includes("locacao") ? "Alquiler" : "Venta";

    return `  <propiedad>
    <codigo_aviso>${escapeXml(p.ref_code || p.id)}</codigo_aviso>
    <titulo>${escapeXml(p.titulo)}</titulo>
    <descripcion>${escapeXml(p.descricao_completa?.substring(0, 5000))}</descripcion>
    <tipo_propiedad>${escapeXml(p.mt_property_types?.nome || "Otros")}</tipo_propiedad>
    <tipo_operacion>${operacao}</tipo_operacion>
    ${p.valor_venda ? `<precio moneda="BRL">${p.valor_venda}</precio>` : ""}
    ${p.valor_locacao ? `<precio moneda="BRL">${p.valor_locacao}</precio>` : ""}
    ${p.valor_condominio ? `<expensas>${p.valor_condominio}</expensas>` : ""}
    <ubicacion>
      <pais>Brasil</pais>
      ${p.estado_location?.nome ? `<provincia>${escapeXml(p.estado_location.nome)}</provincia>` : ""}
      ${p.cidade_location?.nome ? `<ciudad>${escapeXml(p.cidade_location.nome)}</ciudad>` : ""}
      ${p.bairro_location?.nome ? `<barrio>${escapeXml(p.bairro_location.nome)}</barrio>` : ""}
      ${p.logradouro ? `<calle>${escapeXml(p.logradouro)}</calle>` : ""}
      ${p.numero ? `<numero>${escapeXml(p.numero)}</numero>` : ""}
      ${p.cep ? `<codigo_postal>${escapeXml(p.cep)}</codigo_postal>` : ""}
    </ubicacion>
    <superficie>
      ${p.area_total ? `<sup_total>${p.area_total}</sup_total>` : ""}
      ${p.area_util ? `<sup_cubierta>${p.area_util}</sup_cubierta>` : ""}
    </superficie>
    ${p.dormitorios ? `<ambientes>${p.dormitorios}</ambientes>` : ""}
    ${p.dormitorios ? `<dormitorios>${p.dormitorios}</dormitorios>` : ""}
    ${p.banheiros ? `<banos>${p.banheiros}</banos>` : ""}
    ${p.vagas_garagem ? `<cocheras>${p.vagas_garagem}</cocheras>` : ""}
    <fotos>
${photos}
    </fotos>
  </propiedad>`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<propiedades>
  <publicador>
    <nombre>${escapeXml(tenantName)}</nombre>
  </publicador>
${props.join("\n")}
</propiedades>`;
}

function generateChavesNaMaoXml(properties: PropertyForExport[], tenantName: string): string {
  return generateZapXml(properties, tenantName); // Same format as ZAP
}

const GENERATORS: Record<PortalFormat, (props: PropertyForExport[], name: string) => string> = {
  zap: generateZapXml,
  olx: generateOlxXml,
  imovelweb: generateImovelwebXml,
  chaves_na_mao: generateChavesNaMaoXml,
};

export default function PortalXmlExport() {
  const { tenant } = useTenantContext();
  const [selectedPortal, setSelectedPortal] = useState<PortalFormat>("zap");
  const [generating, setGenerating] = useState(false);
  const [xmlResult, setXmlResult] = useState<string | null>(null);

  const { data: stats } = useQuery({
    queryKey: ["portal-xml-stats", tenant?.id],
    queryFn: async () => {
      const { count } = await supabase
        .from("mt_properties" as any)
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenant!.id)
        .eq("situacao", "disponivel")
        .is("deleted_at", null);
      return { total: count || 0 };
    },
    enabled: !!tenant,
  });

  async function handleGenerate() {
    if (!tenant) return;
    setGenerating(true);
    setXmlResult(null);

    try {
      const { data: properties } = await (supabase as any)
        .from("mt_properties")
        .select(`
          id, ref_code, titulo, descricao_completa, slug,
          valor_venda, valor_locacao, valor_condominio, valor_iptu,
          area_total, area_util, area_construida,
          dormitorios, suites, banheiros, vagas_garagem,
          finalidade, situacao, aceita_financiamento, aceita_permuta,
          cep, logradouro, numero, complemento,
          mt_property_types!property_type_id(nome, slug),
          mt_property_purposes!property_purpose_id(nome),
          cidade_location:mt_locations!cidade_id(nome, uf),
          bairro_location:mt_locations!bairro_id(nome),
          estado_location:mt_locations!estado_id(nome, uf)
        `)
        .eq("tenant_id", tenant.id)
        .eq("situacao", "disponivel")
        .is("deleted_at", null)
        .order("updated_at", { ascending: false })
        .limit(5000);

      if (!properties?.length) {
        toast.error("Nenhum imóvel disponível para exportar");
        setGenerating(false);
        return;
      }

      // Load photos for all properties
      const ids = properties.map((p: any) => p.id);
      const { data: allPhotos } = await (supabase as any)
        .from("mt_property_photos")
        .select("property_id, url, ordem")
        .in("property_id", ids)
        .is("deleted_at", null)
        .order("ordem");

      const photoMap = new Map<string, { url: string; ordem: number }[]>();
      for (const photo of allPhotos || []) {
        const existing = photoMap.get(photo.property_id) || [];
        existing.push({ url: photo.url, ordem: photo.ordem });
        photoMap.set(photo.property_id, existing);
      }

      const propsWithPhotos: PropertyForExport[] = properties.map((p: any) => ({
        ...p,
        photos: photoMap.get(p.id) || [],
      }));

      const generator = GENERATORS[selectedPortal];
      const xml = generator(propsWithPhotos, tenant.nome_fantasia || "Imobiliária");
      setXmlResult(xml);
      toast.success(`XML gerado com ${properties.length} imóveis`);
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`);
    } finally {
      setGenerating(false);
    }
  }

  function handleDownload() {
    if (!xmlResult) return;
    const blob = new Blob([xmlResult], { type: "application/xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `imoveis-${selectedPortal}-${new Date().toISOString().split("T")[0]}.xml`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleCopy() {
    if (!xmlResult) return;
    navigator.clipboard.writeText(xmlResult);
    toast.success("XML copiado para área de transferência");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Exportar XML para Portais</h1>
        <p className="text-muted-foreground">
          Gere arquivos XML para envio aos portais imobiliários ({stats?.total || 0} imóveis disponíveis)
        </p>
      </div>

      {/* Portal Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {(Object.entries(PORTAL_INFO) as [PortalFormat, typeof PORTAL_INFO["zap"]][]).map(([key, info]) => (
          <Card
            key={key}
            className={`cursor-pointer transition-all ${selectedPortal === key ? "ring-2 ring-primary" : "hover:shadow-md"}`}
            onClick={() => { setSelectedPortal(key); setXmlResult(null); }}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-primary" />
                <CardTitle className="text-sm">{info.name}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">{info.description}</p>
              {selectedPortal === key && (
                <Badge className="mt-2" variant="default">Selecionado</Badge>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Generate Button */}
      <Card>
        <CardContent className="p-6 flex items-center justify-between">
          <div>
            <h3 className="font-semibold">Gerar XML - {PORTAL_INFO[selectedPortal].name}</h3>
            <p className="text-sm text-muted-foreground">
              {stats?.total || 0} imóveis serão incluídos no XML
            </p>
          </div>
          <Button onClick={handleGenerate} disabled={generating || !stats?.total}>
            {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />}
            {generating ? "Gerando..." : "Gerar XML"}
          </Button>
        </CardContent>
      </Card>

      {/* Result */}
      {xmlResult && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <CardTitle className="text-base">XML Gerado com Sucesso</CardTitle>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleCopy}>
                  <Copy className="h-4 w-4 mr-1" />Copiar
                </Button>
                <Button size="sm" onClick={handleDownload}>
                  <Download className="h-4 w-4 mr-1" />Download
                </Button>
              </div>
            </div>
            <CardDescription>
              {(xmlResult.match(/<Listing>|<ad>|<propiedad>/g) || []).length} imóveis exportados •{" "}
              {(xmlResult.length / 1024).toFixed(1)} KB
            </CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-50 border rounded-md p-4 text-xs overflow-auto max-h-96 font-mono">
              {xmlResult.substring(0, 5000)}
              {xmlResult.length > 5000 && "\n\n... (truncado para visualização)"}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
