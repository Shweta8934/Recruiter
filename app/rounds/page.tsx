"use client";

import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { useAuth } from "@/hooks/useAuth";
import { roundsActions } from "@/store/slices/roundsSlice";
import { DashboardLayout } from "@/components/layout";
import { PageHeader, EmptyState } from "@/components/common";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eye, Plus, Workflow, Pencil, Trash2, ClipboardList, Award } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type EvaluationTemplate = {
  id: string;
  name: string;
};

type RoundMaster = {
  id: string;
  name: string;
  roundType: string;
  evaluationTemplateId: string | null;
  evaluationTemplate: EvaluationTemplate | null;
};

const ROUND_TYPE_LABELS: Record<string, string> = {
  APPLIED: "Applied / Screening",
  WRITTEN_TEST_PASSED: "Written Test Passed",
  GD_ROUND: "Group Discussion",
  INTERVIEW_ROUND: "Technical Interview",
  HR_ROUND: "HR Interview",
  FINAL_OFFER: "Final Offer",
  REJECTED: "Rejected",
};

const ROUND_TYPE_COLORS: Record<string, string> = {
  APPLIED: "bg-primary/10 text-primary border-primary/20 dark:bg-primary/30 dark:text-primary dark:border-primary/50",
  WRITTEN_TEST_PASSED: "bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800",
  GD_ROUND: "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800",
  INTERVIEW_ROUND: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800",
  HR_ROUND: "bg-pink-100 text-pink-800 border-pink-200 dark:bg-pink-900/30 dark:text-pink-300 dark:border-pink-800",
  FINAL_OFFER: "bg-primary/10 text-primary border-primary/20 dark:bg-primary/30 dark:text-primary dark:border-primary/50",
  REJECTED: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800",
};

export default function RoundsPage() {
  const { user } = useAuth();
  const orgId = user?.organizationId;
  const orgSlug = user?.organizationSlug;
  const isSuperAdmin = user?.roleSlug === 'super-admin';

  const [rounds, setRounds] = useState<RoundMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteRoundId, setDeleteRoundId] = useState<string | null>(null);
  const dispatch = useDispatch();

  const getTenantHref = (path: string) => {
    if (orgSlug && !isSuperAdmin) {
      return `/organization/${orgSlug}${path}`;
    }
    return path;
  };

  function loadData() {
    if (!orgId) return;
    setLoading(true);
    dispatch(roundsActions.fetchRoundsRequest({
      organizationId: orgId,
      resolve: (data) => {
        setRounds(data ?? []);
        setLoading(false);
      },
      reject: () => {
        toast.error("Failed to load rounds data");
        setLoading(false);
      }
    }));
  }

  useEffect(() => {
    loadData();
  }, [orgId, dispatch]);

  function deleteRound() {
    if (!deleteRoundId) return;
    dispatch(roundsActions.deleteRoundRequest({
      id: deleteRoundId,
      resolve: () => {
        toast.success("Round deleted successfully");
        setDeleteRoundId(null);
        loadData();
      },
      reject: (err) => {
        toast.error(err || "Failed to delete round");
      }
    }));
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader title="Round Master" description="Define standard recruitment stages and map them to evaluation rubrics.">
          <Button asChild>
            <Link href={getTenantHref("/rounds/create")}>
              <Plus className="mr-2 h-4 w-4" />
              Add Round
            </Link>
          </Button>
        </PageHeader>

        {!loading && rounds.length === 0 ? (
          <EmptyState
            icon={Workflow}
            title="No recruitment rounds"
            description="Create custom rounds like 'Pre-Screening' or 'Final Managerial' to standardise interviews."
            action={
              <Button asChild>
                <Link href={getTenantHref("/rounds/create")}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Round
                </Link>
              </Button>
            }
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {rounds.map((round) => (
              <Card key={round.id} className="flex flex-col h-full border-t-4 border-t-primary group">
                <CardHeader className="pb-2 flex flex-row items-start justify-between space-y-0 gap-2">
                  <div className="space-y-1 min-w-0 flex-1">
                    <CardTitle className="text-xl truncate" title={round.name}>{round.name}</CardTitle>
                    <Badge variant="outline" className={`mt-1 font-medium capitalize border ${ROUND_TYPE_COLORS[round.roundType] || ""}`}>
                      {ROUND_TYPE_LABELS[round.roundType] || round.roundType}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" asChild>
                      <Link href={getTenantHref(`/rounds/${round.id}`)} title="View Details">
                        <Eye className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" asChild>
                      <Link href={getTenantHref(`/rounds/${round.id}/edit`)} title="Edit Round">
                        <Pencil className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10" 
                      onClick={() => setDeleteRoundId(round.id)} 
                      title="Delete Round"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 mt-2">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Award className="h-3.5 w-3.5" />
                    Linked Rubric
                  </div>
                  {round.evaluationTemplate ? (
                    <div className="flex items-center gap-2 p-2 rounded-md bg-secondary/30 border text-sm font-medium">
                      <ClipboardList className="h-4 w-4 text-primary shrink-0" />
                      <Link
                        href={getTenantHref(`/evaluations/${round.evaluationTemplate.id}`)}
                        className="truncate text-primary hover:underline hover:text-primary/80 transition-colors"
                        title="View Evaluation Template"
                      >
                        {round.evaluationTemplate.name}
                      </Link>
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground italic p-2 bg-muted/20 border border-dashed rounded-md">
                      No evaluation template mapped (Ungraded Stage)
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <AlertDialog open={!!deleteRoundId} onOpenChange={(val) => !val && setDeleteRoundId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the recruitment round.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deleteRound} className="bg-destructive text-destructive-text hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </DashboardLayout>
  );
}
