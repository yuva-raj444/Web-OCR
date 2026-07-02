import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Copy, Eraser, ScanLine, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import {
  addScan,
  clearScans,
  deleteScan,
  getNote,
  listScans,
  type Note,
  type Scan,
} from "@/lib/db";
import { Scanner } from "@/components/Scanner";

export const Route = createFileRoute("/notes/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `No Cheat` },
      { name: "description", content: `Scanned text for note ${params.id}.` },
    ],
  }),
  component: NotePage,
});

const SEPARATOR = "\n\n--------------------------------\n\n";

function NotePage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [note, setNote] = useState<Note | null>(null);
  const [scans, setScans] = useState<Scan[]>([]);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const [n, s] = await Promise.all([getNote(id), listScans(id)]);
    if (!n) {
      navigate({ to: "/" });
      return;
    }
    setNote(n);
    setScans(s);
    setLoading(false);
  }, [id, navigate]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const combined = scans.map((s) => s.text).join(SEPARATOR);

  async function handleScanned(text: string, blob: Blob) {
    await addScan(id, text, blob);
    await refresh();
  }

  async function handleCopy() {
    if (!combined) return;
    try {
      await navigator.clipboard.writeText(combined);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Copy failed");
    }
  }

  async function handleClear() {
    await clearScans(id);
    await refresh();
    toast.success("Clipboard cleared");
  }

  async function handleDeleteScan(scanId: string) {
    await deleteScan(scanId);
    await refresh();
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b sticky top-0 bg-background/95 backdrop-blur z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-2">
          <Button asChild variant="ghost" size="icon">
            <Link to="/">
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
          <h1 className="font-semibold truncate flex-1">{note?.title ?? "…"}</h1>
          <Button variant="outline" size="sm" onClick={handleCopy} disabled={!combined}>
            <Copy className="w-4 h-4 mr-1.5" /> Copy
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" disabled={!combined}>
                <Eraser className="w-4 h-4 mr-1.5" /> Clear
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Clear clipboard?</AlertDialogTitle>
                <AlertDialogDescription>
                  All scans in this note will be deleted.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleClear}>Clear</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </header>

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-6 pb-28">
        {loading ? (
          <div className="text-sm text-muted-foreground py-12 text-center">Loading…</div>
        ) : scans.length === 0 ? (
          <div className="rounded-lg border border-dashed py-16 text-center text-sm text-muted-foreground">
            No scans yet. Tap <span className="font-medium">Scan</span> to capture text.
          </div>
        ) : (
          <article className="space-y-0 rounded-lg border bg-card p-5">
            {scans.map((s, i) => (
              <div key={s.id} className="group relative">
                {i > 0 && (
                  <div className="my-4 border-t border-dashed border-border" aria-hidden />
                )}
                <pre className="whitespace-pre-wrap break-words font-sans text-[15px] leading-relaxed text-foreground">
                  {s.text}
                </pre>
                <Button
                  size="icon"
                  variant="ghost"
                  className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition"
                  onClick={() => handleDeleteScan(s.id)}
                  aria-label="Delete scan"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </article>
        )}
      </main>

      <div className="fixed bottom-0 inset-x-0 border-t bg-background/95 backdrop-blur">
        <div className="max-w-3xl mx-auto px-4 py-3">
          <Button size="lg" className="w-full" onClick={() => setScannerOpen(true)}>
            <ScanLine className="w-5 h-5 mr-2" />
            Scan
          </Button>
        </div>
      </div>

      <Scanner open={scannerOpen} onOpenChange={setScannerOpen} onScanned={handleScanned} />
      <Toaster richColors position="top-center" />
    </div>
  );
}
