import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { FileText, Plus, Trash2, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { createNote, deleteNote, listNotes, type Note } from "@/lib/db";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "No Cheat" },
      {
        name: "description",
        content:
          "Offline OCR clipboard. Scan text from books, notes and screens. Every scan is appended to the selected note.",
      },
      { property: "og:title", content: "OCR Clipboard — Offline scanner" },
      {
        property: "og:description",
        content: "Scan, recognize and collect text — fully on-device.",
      },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  async function refresh() {
    setNotes(await listNotes());
    setLoading(false);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    const note = await createNote(title);
    setTitle("");
    router.navigate({ to: "/notes/$id", params: { id: note.id } });
  }

  async function onDelete(id: string) {
    await deleteNote(id);
    await refresh();
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
            <ScanLine className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold leading-tight">OCR Clipboard</h1>
            <p className="text-xs text-muted-foreground">On-device OCR</p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        <form onSubmit={onCreate} className="flex gap-2">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="New note title (e.g. Online Assessment)"
          />
          <Button type="submit" disabled={!title.trim()}>
            <Plus className="w-4 h-4 mr-1" /> New
          </Button>
        </form>

        <section className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground px-1">Your notes</h2>
          {loading ? (
            <div className="text-sm text-muted-foreground py-8 text-center">Loading…</div>
          ) : notes.length === 0 ? (
            <div className="rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">
              No notes yet. Create one to start scanning.
            </div>
          ) : (
            <ul className="divide-y rounded-lg border bg-card">
              {notes.map((n) => (
                <li key={n.id} className="flex items-center gap-2 px-3 py-2">
                  <Link
                    to="/notes/$id"
                    params={{ id: n.id }}
                    className="flex items-center gap-3 flex-1 min-w-0 py-1.5 hover:opacity-80"
                  >
                    <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="truncate font-medium">{n.title}</span>
                  </Link>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="icon" variant="ghost" aria-label="Delete note">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete "{n.title}"?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This removes the note and all its scans. This cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => onDelete(n.id)}>
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
      <Toaster richColors position="top-center" />
    </div>
  );
}
