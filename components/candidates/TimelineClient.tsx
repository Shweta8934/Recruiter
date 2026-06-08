"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";

interface LogActor {
  name: string | null;
  email: string;
}

interface AuditLogItem {
  id: string;
  action: string;
  entityType: string;
  createdAt: string;
  metadataJson: any;
  beforeJson: any;
  afterJson: any;
  actor: LogActor | null;
}

export function TimelineClient({ logs }: { logs: AuditLogItem[] }) {
  const [limit, setLimit] = useState(5);

  if (logs.length === 0) {
    return <p className="text-xs text-muted-foreground italic">No activity yet.</p>;
  }

  const visibleLogs = logs.slice(0, limit);

  return (
    <div className="space-y-6">
      <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-zinc-100 dark:before:bg-zinc-800">
        {visibleLogs.map((log) => {
          const meta = (log.metadataJson as any) || {};
          const before = (log.beforeJson as any) || {};
          const after = (log.afterJson as any) || {};
          const dateStr = format(new Date(log.createdAt), "MMM d, yyyy p");
          
          let title = "";
          let desc = "";
          let dotColorClass = "bg-blue-500";
          const isProctoring = log.entityType === 'candidate_test_attempt';

          if (log.action === 'application_status_updated') {
            title = `Stage changed: ${before.status || 'applied'} -> ${after.status || '-'}`;
            desc = `Updated by ${log.actor?.name || log.actor?.email || 'System'}`;
            dotColorClass = "bg-green-500";
          } else if (log.action === 'ai_screening_scored') {
            title = `AI Screening Completed`;
            desc = `Assessed score: ${after.aiScore ?? '-'} / 100`;
            dotColorClass = "bg-blue-500";
          } else if (log.action === 'ai_score_override') {
            title = `AI Override Applied`;
            desc = `Score changed ${before.aiScore ?? '-'} -> ${after.aiScore ?? '-'} by ${log.actor?.name || log.actor?.email || 'System'}`;
            dotColorClass = "bg-purple-500";
          } else if (log.action === 'ai_feedback_submitted') {
            title = `AI Feedback Submitted`;
            desc = `Feedback: ${after.aiFeedback || '-'} by ${log.actor?.name || log.actor?.email || 'System'}`;
            if (meta.aiFeedbackNote) desc += ` (${meta.aiFeedbackNote})`;
            dotColorClass = "bg-indigo-500";
          } else if (log.action === 'recruiter_note_added') {
            title = `Recruiter Note Added`;
            desc = `Note by ${log.actor?.name || log.actor?.email || 'System'}: "${meta.note || ''}"`;
            dotColorClass = "bg-zinc-500";
          } else if (isProctoring) {
            title = `Proctoring flag: ${meta.violationType || 'Event'}`;
            desc = `${meta.description || '-'} (Penalty: -${meta.penalty ?? 0} pts)`;
            dotColorClass = "bg-amber-500";
          } else {
            title = log.action.replace(/_/g, ' ');
            desc = `Event logged by ${log.actor?.name || log.actor?.email || 'System'}`;
          }

          return (
            <div key={log.id} className="relative group">
              <div className={`absolute -left-6 top-1.5 w-3 h-3 rounded-full border-2 border-white dark:border-zinc-950 transition-transform group-hover:scale-125 ${dotColorClass}`} />
              <div className="space-y-1">
                <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <span>{dateStr}</span>
                </div>
                <h4 className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 capitalize break-words">{title}</h4>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 break-words">{desc}</p>
                {isProctoring && (
                  <div className="mt-2 text-xs bg-amber-50/50 dark:bg-amber-950/10 border border-amber-100 dark:border-amber-900/30 rounded-lg p-2 space-y-1">
                    <div className="font-semibold text-amber-800 dark:text-amber-400">Proctoring Event Details</div>
                    {meta.mediaUrl && (
                      <div className="text-[10px] break-all">
                        <span className="font-medium text-zinc-500">Media URL:</span>{" "}
                        <a href={meta.mediaUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                          {meta.mediaUrl}
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {logs.length > limit && (
        <div className="flex justify-center pt-2">
          <Button
            size="sm"
            variant="outline"
            className="text-xs gap-1.5 h-8 font-medium"
            onClick={() => setLimit((prev) => prev + 5)}
          >
            <ChevronDown className="w-3.5 h-3.5" />
            See more
          </Button>
        </div>
      )}
    </div>
  );
}
