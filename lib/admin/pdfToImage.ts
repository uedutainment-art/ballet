"use client";

// Renders the first page of a PDF File to a PNG Blob, sized for OpenAI
// Vision (long edge ≈ 1600px is a sweet spot for quality + payload size).
// Uses pdfjs-dist via dynamic import so the heavy bundle (~1MB) only loads
// when the user actually picks a PDF.

const TARGET_LONG_EDGE = 1600;

export async function pdfFirstPageToPng(file: File): Promise<Blob> {
  if (typeof window === "undefined") {
    throw new Error("pdfFirstPageToPng is browser-only");
  }
  const pdfjs = await import("pdfjs-dist");
  if (!pdfjs.GlobalWorkerOptions.workerSrc) {
    pdfjs.GlobalWorkerOptions.workerSrc =
      `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
  }

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({data: arrayBuffer}).promise;
  try {
    const page = await pdf.getPage(1);

    // Compute scale so the long edge lands near TARGET_LONG_EDGE.
    const baseViewport = page.getViewport({scale: 1});
    const longEdge = Math.max(baseViewport.width, baseViewport.height);
    const scale = Math.max(0.5, Math.min(3, TARGET_LONG_EDGE / longEdge));
    const viewport = page.getViewport({scale});

    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const ctx = canvas.getContext("2d", {alpha: false});
    if (!ctx) throw new Error("canvas 2D context unavailable");

    await page.render({canvasContext: ctx, viewport, canvas}).promise;

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("canvas.toBlob returned null"));
        },
        "image/png",
        0.95,
      );
    });
  } finally {
    await pdf.destroy();
  }
}

// Convert a File or Blob to a base64 data URL (browser FileReader).
export function fileToDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(r.error ?? new Error("FileReader error"));
    r.readAsDataURL(file);
  });
}
