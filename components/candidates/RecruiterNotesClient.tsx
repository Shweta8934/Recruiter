"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { format } from "date-fns";
import { MessageSquare, Save } from "lucide-react";

interface Note {
  id: string;
  note: string;
  createdAt: Date | string;
  actorName: string;
}

export function RecruiterNotesClient({
  jobId,
  applicationId,
  notes
}: {
  jobId: string;
  applicationId: string;
  notes: Note[];
}) {
  const router = useRouter();
  const [newNote, setNewNote] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSaveNote = async () => {
    if (!newNote.trim()) {
      toast.error("Please enter a note before saving");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH || '/ai-recruitment-platform'}/api/job-posts/${jobId}/applications/${applicationId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ recruiterNote: newNote }),
      });

      if (!res.ok) {
        throw new Error("Failed to save note");
      }

      toast.success("Note saved successfully");
      setNewNote("");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardContent className="space-y-4 pt-6 pb-6">
        <div className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
          <MessageSquare className="w-3.5 h-3.5" />
          Recruiter Notes
        </div>

        {notes.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">No recruiter notes added yet.</p>
        ) : (
          <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
            {notes.map((note) => (
              <div
                key={note.id}
                className="p-2.5 bg-zinc-50 dark:bg-zinc-900 rounded-lg text-xs space-y-1 border border-zinc-100 dark:border-zinc-800 overflow-hidden"
              >
                <div className="flex justify-between items-center text-[10px] text-muted-foreground gap-2">
                  <span className="font-semibold text-zinc-600 dark:text-zinc-400 truncate">{note.actorName}</span>
                  <span className="shrink-0">{format(new Date(note.createdAt), "MMM d, yyyy p")}</span>
                </div>
                <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap break-words">{note.note}</p>
              </div>
            ))}
          </div>
        )}

        <div className="space-y-2 pt-1 border-t border-zinc-100 dark:border-zinc-800">
          <Textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Add a private note…"
            className="min-h-[70px] text-xs resize-none"
          />
          <Button
            size="sm"
            className="w-full text-xs h-8 flex items-center justify-center gap-1.5"
            onClick={handleSaveNote}
            disabled={loading}
          >
            <Save className="w-3.5 h-3.5" />
            Save note
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
