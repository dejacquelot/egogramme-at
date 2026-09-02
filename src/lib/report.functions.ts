import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const storeSchema = z.object({
  kind: z.enum(["individual", "team"]),
  refId: z.string().uuid(),
  base: z.string().trim().min(1).max(200),
  pdfBase64: z.string().min(1),
  imageBase64: z.string().min(1),
});

/**
 * Stocke le PDF et l'image d'un rapport dans le bucket Storage `reports`,
 * puis persiste les URLs publiques sur la ligne correspondante
 * (`results` pour un rapport individuel, `team_analyses` pour un collectif).
 */
export const storeReportFiles = createServerFn({ method: "POST" })
  .inputValidator((input: z.infer<typeof storeSchema>) => storeSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const bucket = supabaseAdmin.storage.from("reports");

    const pdfBytes = Buffer.from(data.pdfBase64, "base64");
    const imageBytes = Buffer.from(data.imageBase64, "base64");

    const folder = data.kind === "team" ? "team" : "individual";
    const stamp = Date.now();
    const pdfPath = `${folder}/${data.refId}/${data.base}-${stamp}.pdf`;
    const imagePath = `${folder}/${data.refId}/${data.base}-${stamp}.png`;

    const pdfUp = await bucket.upload(pdfPath, pdfBytes, {
      contentType: "application/pdf",
      upsert: true,
    });
    if (pdfUp.error) throw pdfUp.error;

    const imgUp = await bucket.upload(imagePath, imageBytes, {
      contentType: "image/png",
      upsert: true,
    });
    if (imgUp.error) throw imgUp.error;

    const pdfUrl = bucket.getPublicUrl(pdfPath).data.publicUrl;
    const imageUrl = bucket.getPublicUrl(imagePath).data.publicUrl;

    if (data.kind === "team") {
      const { error } = await supabaseAdmin
        .from("team_analyses")
        .update({ pdf_url: pdfUrl, image_url: imageUrl })
        .eq("id", data.refId);
      if (error) throw error;
    } else {
      const { error } = await supabaseAdmin
        .from("results")
        .update({ individual_pdf_url: pdfUrl, individual_image_url: imageUrl })
        .eq("id", data.refId);
      if (error) throw error;
    }

    return { pdfUrl, imageUrl };
  });
