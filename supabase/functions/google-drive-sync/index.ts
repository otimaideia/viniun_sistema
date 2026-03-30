import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

// Google Drive API base URL
const DRIVE_API_BASE = "https://www.googleapis.com/drive/v3";

// Mapeamento de nomes de pasta para categorias
const FOLDER_TO_CATEGORY: Record<string, string> = {
  "destaques": "destaques",
  "destaque": "destaques",
  "material yes laser": "material_yeslaser",
  "material yeslaser": "material_yeslaser",
  "yeslaser": "material_yeslaser",
  "material a-edgel": "material_aedgel",
  "material aedgel": "material_aedgel",
  "a-edgel": "material_aedgel",
  "aedgel": "material_aedgel",
  "stories": "stories",
  "story": "stories",
  "tv interna": "tv_interna",
  "tv": "tv_interna",
  "promocoes": "promocoes",
  "promoções": "promocoes",
  "promocao": "promocoes",
  "promoção": "promocoes",
  "datas comemorativas": "datas_comemorativas",
  "datas": "datas_comemorativas",
  "comemorativas": "datas_comemorativas",
  "institucional": "institucional",
};

// Tipos de arquivos de imagem suportados
const IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
];

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  thumbnailLink?: string;
  webContentLink?: string;
  webViewLink?: string;
  imageMediaMetadata?: {
    width?: number;
    height?: number;
  };
  size?: string;
  createdTime?: string;
  modifiedTime?: string;
}

interface DriveFolder {
  id: string;
  name: string;
  category: string;
}

interface SyncResult {
  folder: string;
  category: string;
  files: DriveFile[];
  created: number;
  skipped: number;
  errors: string[];
}

// Função para normalizar nome de pasta para categoria
function normalizeToCategory(folderName: string): string {
  const normalized = folderName.toLowerCase().trim();

  // Busca direta no mapeamento
  if (FOLDER_TO_CATEGORY[normalized]) {
    return FOLDER_TO_CATEGORY[normalized];
  }

  // Busca parcial
  for (const [key, value] of Object.entries(FOLDER_TO_CATEGORY)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return value;
    }
  }

  // Se não encontrar, converte para slug
  return normalized
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/(^_|_$)/g, "");
}

// Lista pastas dentro de um folder do Drive
async function listDriveFolders(
  apiKey: string,
  parentFolderId: string
): Promise<DriveFolder[]> {
  const query = `'${parentFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  const url = `${DRIVE_API_BASE}/files?q=${encodeURIComponent(query)}&key=${apiKey}&fields=files(id,name)`;

  const response = await fetch(url);
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Erro ao listar pastas do Drive: ${error}`);
  }

  const data = await response.json();

  return (data.files || []).map((folder: any) => ({
    id: folder.id,
    name: folder.name,
    category: normalizeToCategory(folder.name),
  }));
}

// Lista arquivos de imagem dentro de uma pasta
async function listDriveImages(
  apiKey: string,
  folderId: string
): Promise<DriveFile[]> {
  const mimeQuery = IMAGE_MIME_TYPES.map(m => `mimeType='${m}'`).join(" or ");
  const query = `'${folderId}' in parents and (${mimeQuery}) and trashed=false`;
  const fields = "files(id,name,mimeType,thumbnailLink,webContentLink,webViewLink,imageMediaMetadata,size,createdTime,modifiedTime)";
  const url = `${DRIVE_API_BASE}/files?q=${encodeURIComponent(query)}&key=${apiKey}&fields=${fields}&pageSize=1000`;

  const response = await fetch(url);
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Erro ao listar imagens do Drive: ${error}`);
  }

  const data = await response.json();
  return data.files || [];
}

// Gera URL pública para o arquivo
function getPublicUrl(fileId: string): string {
  return `https://drive.google.com/uc?export=view&id=${fileId}`;
}

// Gera URL de download direto
function getDownloadUrl(fileId: string): string {
  return `https://drive.google.com/uc?export=download&id=${fileId}`;
}

// Handler principal
Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Criar cliente Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Obter parâmetros
    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "list";

    // Obter body se for POST
    let body: any = {};
    if (req.method === "POST") {
      body = await req.json();
    }

    // Buscar API Key do banco de dados se não foi passada no body
    let googleApiKey = body.api_key || Deno.env.get("GOOGLE_API_KEY");
    let defaultFolderId = Deno.env.get("GOOGLE_DRIVE_FOLDER_ID") || "";

    if (!googleApiKey) {
      // Buscar configuração do banco
      const { data: configData, error: configError } = await supabase
        .from("mt_tenant_settings")
        .select("key, value")
        .in("key", ["GOOGLE_DRIVE_API_KEY", "GOOGLE_DRIVE_DEFAULT_FOLDER"]);

      if (!configError && configData) {
        const configMap = configData.reduce((acc: any, item: any) => {
          acc[item.key] = item.value;
          return acc;
        }, {} as Record<string, string>);

        googleApiKey = configMap["GOOGLE_DRIVE_API_KEY"] || "";
        defaultFolderId = configMap["GOOGLE_DRIVE_DEFAULT_FOLDER"] || defaultFolderId;
      }
    }

    const driveFolderId = body.folder_id || defaultFolderId || "1F1H0_aG9iY7mbdOgJKCQLHMRUvx-YajP";

    if (!googleApiKey) {
      return new Response(
        JSON.stringify({
          error: "Google API Key não configurada",
          message: "Configure a API Key em Configurações → Integrações → Google Drive"
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============================================
    // ACTION: list - Lista pastas e arquivos
    // ============================================
    if (action === "list") {
      console.log(`Listando conteúdo do Drive folder: ${driveFolderId}`);

      // Listar pastas
      const folders = await listDriveFolders(googleApiKey, driveFolderId);
      console.log(`Encontradas ${folders.length} pastas`);

      // Para cada pasta, listar imagens
      const result: { folders: any[]; totalImages: number } = {
        folders: [],
        totalImages: 0,
      };

      for (const folder of folders) {
        const images = await listDriveImages(googleApiKey, folder.id);
        result.folders.push({
          ...folder,
          imageCount: images.length,
          images: images.slice(0, 5), // Apenas preview das 5 primeiras
        });
        result.totalImages += images.length;
      }

      // Também listar imagens na raiz
      const rootImages = await listDriveImages(googleApiKey, driveFolderId);
      if (rootImages.length > 0) {
        result.folders.push({
          id: driveFolderId,
          name: "Raiz",
          category: "geral",
          imageCount: rootImages.length,
          images: rootImages.slice(0, 5),
        });
        result.totalImages += rootImages.length;
      }

      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============================================
    // ACTION: sync - Sincroniza com o banco
    // ============================================
    if (action === "sync") {
      console.log(`Sincronizando Drive folder: ${driveFolderId}`);

      const results: SyncResult[] = [];
      let totalCreated = 0;
      let totalSkipped = 0;
      let totalErrors = 0;

      // Listar pastas
      const folders = await listDriveFolders(googleApiKey, driveFolderId);

      // Adicionar raiz como pasta
      folders.push({
        id: driveFolderId,
        name: "Raiz",
        category: "geral",
      });

      // Obter todos os file_url existentes para evitar duplicatas
      const { data: existingAssets } = await supabase
        .from("mt_marketing_assets")
        .select("file_url");

      const existingUrls = new Set(
        (existingAssets || []).map((a: any) => a.file_url)
      );

      // Para cada pasta, processar imagens
      for (const folder of folders) {
        const syncResult: SyncResult = {
          folder: folder.name,
          category: folder.category,
          files: [],
          created: 0,
          skipped: 0,
          errors: [],
        };

        try {
          const images = await listDriveImages(googleApiKey, folder.id);

          for (const image of images) {
            const fileUrl = getPublicUrl(image.id);

            // Verificar se já existe
            if (existingUrls.has(fileUrl)) {
              syncResult.skipped++;
              continue;
            }

            // Determinar tipo do asset
            let tipo = "imagem";
            const nameLower = image.name.toLowerCase();
            if (nameLower.includes("banner")) tipo = "banner";
            else if (nameLower.includes("logo")) tipo = "logo";
            else if (nameLower.includes("stories") || nameLower.includes("story")) tipo = "arte_social";

            // Criar asset
            const { error } = await supabase
              .from("mt_marketing_assets")
              .insert({
                nome: image.name.split(".")[0],
                tipo,
                categoria: folder.category,
                file_url: fileUrl,
                file_type: image.mimeType,
                file_size: image.size ? parseInt(image.size) : null,
                dimensoes: image.imageMediaMetadata ? {
                  width: image.imageMediaMetadata.width,
                  height: image.imageMediaMetadata.height,
                } : {},
                tags: [folder.category, tipo],
                ativo: true,
              });

            if (error) {
              syncResult.errors.push(`${image.name}: ${error.message}`);
              totalErrors++;
            } else {
              syncResult.created++;
              syncResult.files.push(image);
              existingUrls.add(fileUrl); // Adicionar ao set para evitar duplicatas no mesmo lote
            }
          }
        } catch (error) {
          syncResult.errors.push(`Erro na pasta ${folder.name}: ${error}`);
        }

        totalCreated += syncResult.created;
        totalSkipped += syncResult.skipped;
        results.push(syncResult);
      }

      return new Response(
        JSON.stringify({
          success: true,
          summary: {
            totalCreated,
            totalSkipped,
            totalErrors,
            foldersProcessed: results.length,
          },
          details: results,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============================================
    // ACTION: preview - Mostra o que seria sincronizado
    // ============================================
    if (action === "preview") {
      console.log(`Preview da sincronização do Drive folder: ${driveFolderId}`);

      // Listar pastas
      const folders = await listDriveFolders(googleApiKey, driveFolderId);

      // Adicionar raiz
      folders.push({
        id: driveFolderId,
        name: "Raiz",
        category: "geral",
      });

      // Obter URLs existentes
      const { data: existingAssets } = await supabase
        .from("mt_marketing_assets")
        .select("file_url");

      const existingUrls = new Set(
        (existingAssets || []).map((a: any) => a.file_url)
      );

      const preview: any[] = [];
      let totalNew = 0;
      let totalExisting = 0;

      for (const folder of folders) {
        const images = await listDriveImages(googleApiKey, folder.id);

        const newImages: any[] = [];
        const existingImages: any[] = [];

        for (const image of images) {
          const fileUrl = getPublicUrl(image.id);
          if (existingUrls.has(fileUrl)) {
            existingImages.push({ name: image.name, url: fileUrl });
            totalExisting++;
          } else {
            newImages.push({
              name: image.name,
              url: fileUrl,
              thumbnailLink: image.thumbnailLink,
              dimensions: image.imageMediaMetadata,
            });
            totalNew++;
          }
        }

        preview.push({
          folder: folder.name,
          category: folder.category,
          newImages,
          existingImages: existingImages.length,
          totalImages: images.length,
        });
      }

      return new Response(
        JSON.stringify({
          totalNew,
          totalExisting,
          folders: preview,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Ação não reconhecida. Use: list, preview, ou sync" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
