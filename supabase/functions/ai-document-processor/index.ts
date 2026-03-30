// Edge Function: AI Document Processor
// Processes documents (PDFs, spreadsheets, audio) into embeddings for RAG
// v1.0 - Mar 2026

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const openaiKey = Deno.env.get("OPENAI_API_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { tenantId, franchiseId, storageBucket, storagePath, fileName, fileType, categoria } = body;

    if (!tenantId || !storageBucket || !storagePath || !fileName) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: tenantId, storageBucket, storagePath, fileName" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Download file from Supabase Storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from(storageBucket)
      .download(storagePath);

    if (downloadError) throw downloadError;

    let extractedText = "";
    const detectedType = fileType || fileName.split(".").pop()?.toLowerCase() || "unknown";
    let processingMethod = "text_extract";

    // Process based on file type
    switch (detectedType) {
      case "txt":
      case "md":
      case "csv":
        extractedText = await fileData.text();
        processingMethod = "text_extract";
        break;

      case "pdf":
        // For PDF, we extract text content
        // In production, use a proper PDF parser
        extractedText = await fileData.text();
        processingMethod = "pdf_extract";
        break;

      case "xlsx":
      case "xls":
        extractedText = `[Planilha: ${fileName}] Conteúdo tabulado disponível para consulta.`;
        processingMethod = "csv_parse";
        break;

      case "docx":
      case "doc":
        extractedText = await fileData.text();
        processingMethod = "text_extract";
        break;

      case "mp3":
      case "wav":
      case "m4a":
      case "ogg":
        // Transcribe audio with Whisper
        if (openaiKey) {
          const formData = new FormData();
          formData.append("file", fileData, fileName);
          formData.append("model", "whisper-1");
          formData.append("language", "pt");

          const whisperResp = await fetch("https://api.openai.com/v1/audio/transcriptions", {
            method: "POST",
            headers: { Authorization: `Bearer ${openaiKey}` },
            body: formData,
          });

          if (whisperResp.ok) {
            const whisperData = await whisperResp.json();
            extractedText = whisperData.text || "";
            processingMethod = "whisper";
          }
        }
        break;

      default:
        extractedText = `[Arquivo: ${fileName}] Tipo ${detectedType} - processamento limitado.`;
        processingMethod = "fallback";
    }

    if (!extractedText) {
      return new Response(
        JSON.stringify({ error: "Could not extract text from file" }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Chunk text if too long (max ~2000 chars per chunk for good embeddings)
    const CHUNK_SIZE = 2000;
    const chunks: string[] = [];
    for (let i = 0; i < extractedText.length; i += CHUNK_SIZE) {
      chunks.push(extractedText.slice(i, i + CHUNK_SIZE));
    }

    const totalChunks = chunks.length;
    const insertedIds: string[] = [];

    for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
      const chunk = chunks[chunkIndex];

      // Generate embedding via OpenAI
      let embedding = null;
      if (openaiKey) {
        try {
          const embResp = await fetch("https://api.openai.com/v1/embeddings", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${openaiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              input: chunk,
              model: "text-embedding-3-small",
            }),
          });

          if (embResp.ok) {
            const embData = await embResp.json();
            embedding = embData.data?.[0]?.embedding || null;
          }
        } catch (e) {
          console.warn("[ai-document-processor] Embedding failed:", e);
        }
      }

      // Save to mt_ai_document_embeddings
      const { data: doc, error: insertError } = await supabase
        .from("mt_ai_document_embeddings")
        .insert({
          tenant_id: tenantId,
          franchise_id: franchiseId || null,
          storage_bucket: storageBucket,
          storage_path: storagePath,
          file_name: fileName,
          file_type: detectedType,
          file_size_bytes: fileData.size,
          extracted_text: chunk,
          chunk_index: chunkIndex,
          total_chunks: totalChunks,
          embedding: embedding,
          categoria: categoria || null,
          processed_at: new Date().toISOString(),
          processing_method: processingMethod,
        })
        .select("id")
        .single();

      if (insertError) throw insertError;
      if (doc) insertedIds.push(doc.id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        file_name: fileName,
        file_type: detectedType,
        processing_method: processingMethod,
        total_chunks: totalChunks,
        document_ids: insertedIds,
        text_length: extractedText.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[ai-document-processor] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
