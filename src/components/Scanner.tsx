import { useEffect, useRef, useState } from "react";
import { Camera, Image as ImageIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { recognizeText } from "@/lib/ocr";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScanned: (text: string, blob: Blob) => void;
}

export function Scanner({ open, onOpenChange, onScanned }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!open) {
      stopCamera();
      return;
    }
    startCamera();
    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraReady(true);
      }
    } catch (err) {
      console.warn("Camera unavailable", err);
      setCameraReady(false);
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraReady(false);
  }

  async function processBlob(blob: Blob) {
    setProcessing(true);
    setProgress(0);
    try {
      const text = await recognizeText(blob, (p) => setProgress(p));
      if (!text) {
        toast.error("No text detected");
        return;
      }
      onScanned(text, blob);
      onOpenChange(false);
      toast.success("Text appended");
    } catch (err) {
      console.error(err);
      toast.error("OCR failed");
    } finally {
      setProcessing(false);
      setProgress(0);
    }
  }

  async function capture() {
    if (videoRef.current && cameraReady) {
      const video = videoRef.current;
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(video, 0, 0);
      const blob: Blob | null = await new Promise((res) =>
        canvas.toBlob((b) => res(b), "image/jpeg", 0.92),
      );
      if (!blob) return;
      await processBlob(blob);
      return;
    }
    // Fallback: open native camera picker
    cameraInputRef.current?.click();
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    await processBlob(file);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="p-0 gap-0 overflow-hidden max-w-none w-screen h-[100dvh] sm:h-[100dvh] rounded-none border-0 flex flex-col translate-x-0 translate-y-0 left-0 top-0 data-[state=open]:slide-in-from-bottom-4 data-[state=closed]:slide-out-to-bottom-4"
      >
        <DialogHeader className="px-4 py-3 border-b flex flex-row items-center space-y-0 shrink-0">
          <DialogTitle>Scan text</DialogTitle>
        </DialogHeader>

        <div className="relative bg-black flex-1 min-h-0 flex items-center justify-center">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            playsInline
            muted
          />
          {!cameraReady && !processing && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white/70 gap-2 text-sm px-6 text-center">
              <Camera className="w-8 h-8" />
              <span>Camera unavailable — use gallery</span>
            </div>
          )}
          {processing && (
            <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center text-white gap-3 px-6">
              <Loader2 className="w-8 h-8 animate-spin" />
              <span className="text-sm">Recognizing text…</span>
              <Progress value={progress * 100} className="w-full max-w-sm" />
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 p-3 border-t bg-background shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <Button
            variant="outline"
            onClick={() => galleryInputRef.current?.click()}
            disabled={processing}
            className="flex-1"
          >
            <ImageIcon className="w-4 h-4 mr-2" />
            Gallery
          </Button>
          <Button onClick={capture} disabled={processing} className="flex-1">
            <Camera className="w-4 h-4 mr-2" />
            Capture
          </Button>
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={onFile}
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            hidden
            onChange={onFile}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
