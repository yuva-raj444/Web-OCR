// Browser-only OCR via PaddleOCR.js (PP-OCRv6 English, default model).
// Runs entirely in the browser (WASM). Models are fetched on first use and
// cached by the browser afterwards.

type OcrInstance = Awaited<ReturnType<typeof import("@paddleocr/paddleocr-js").PaddleOCR.create>>;

let ocrPromise: Promise<OcrInstance> | null = null;

export function getOcr(): Promise<OcrInstance> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("OCR is browser-only"));
  }
  if (!ocrPromise) {
    const p = (async () => {
      const { PaddleOCR } = await import("@paddleocr/paddleocr-js");
      return PaddleOCR.create({
        lang: "en",
        ocrVersion: "PP-OCRv6",
        worker: true,
        ortOptions: { backend: "auto" },
      });
    })();
    ocrPromise = p;
    p.catch(() => {
      if (ocrPromise === p) ocrPromise = null;
    });
  }
  return ocrPromise;
}

export async function recognizeText(
  source: Blob | File,
  onProgress?: (p: number) => void,
): Promise<string> {
  onProgress?.(0.05);
  const ocr = await getOcr();
  onProgress?.(0.4);
  const [result] = await ocr.predict(source);
  onProgress?.(1);
  if (!result?.items?.length) return "";
  return result.items
    .map((it) => it.text)
    .filter(Boolean)
    .join("\n")
    .trim();
}
