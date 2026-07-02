import { useEffect, useRef, useState } from "react";
import { Camera, Image as ImageIcon, X, Loader2 } from "lucide-react";
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
  const fileInputRef = useRef<HTMLInputElement | null>(null);
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
    if (!videoRef.current || !cameraReady) return;
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
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    await processBlob(file);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden gap-0">
        <DialogHeader className="px-4 py-3 border-b flex flex-row items-center justify-between space-y-0">
          <DialogTitle>Scan text</DialogTitle>
        </DialogHeader>

        <div className="relative bg-black aspect-video flex items-center justify-center">
          <video
            ref={videoRef}
            className="w-full h-full object-contain"
            playsInline
            muted
          />
          {!cameraReady && !processing && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white/70 gap-2 text-sm">
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

        <div className="flex items-center gap-2 p-3 border-t bg-background">
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={processing}
            className="flex-1"
          >
            <ImageIcon className="w-4 h-4 mr-2" />
            Gallery
          </Button>
          <Button onClick={capture} disabled={!cameraReady || processing} className="flex-1">
            <Camera className="w-4 h-4 mr-2" />
            Capture
          </Button>
          <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
            <X className="w-4 h-4" />
          </Button>
          <input
            ref={fileInputRef}
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
