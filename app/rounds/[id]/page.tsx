"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useDispatch } from "react-redux";
import { useAuth } from "@/hooks/useAuth";
import { roundsActions } from "@/store/slices/roundsSlice";
import { DashboardLayout } from "@/components/layout";
import { PageHeader } from "@/components/common";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Pencil, ClipboardList, Award, Workflow } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

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

export default function RoundDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const orgId = user?.organizationId;
  const orgSlug = user?.organizationSlug;
  const isSuperAdmin = user?.roleSlug === 'super-admin';

  const [round, setRound] = useState<RoundMaster | null>(null);
  const [loading, setLoading] = useState(true);
  const dispatch = useDispatch();

  const getTenantHref = (path: string) => {
    if (orgSlug && !isSuperAdmin) {
      return `/organization/${orgSlug}${path}`;
    }
    return path;
  };

  useEffect(() => {
    if (!orgId || !id) return;

    dispatch(roundsActions.fetchRoundByIdRequest({
      id,
      resolve: (data) => {
        setRound(data);
        setLoading(false);
      },
      reject: () => {
        toast.error("Round not found");
        router.push(getTenantHref("/rounds"));
      }
    }));
  }, [id, orgId, router, dispatch]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="text-center text-muted-foreground">Loading round details...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (!round) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="text-center text-muted-foreground">Round not found</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild type="button">
            <Link href={getTenantHref("/rounds")}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <PageHeader
            title="Recruitment Round Details"
            description="View details and linked evaluation template"
          />
        </div>

        <Card className="border-t-4 border-t-primary">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Workflow className="h-6 w-6 text-primary shrink-0" />
                {round.name}
              </CardTitle>
              <CardDescription className="mt-1">
                Recruitment Round Configuration
              </CardDescription>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href={getTenantHref(`/rounds/${round.id}/edit`)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit Round
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-1">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Round Name</h4>
              <p className="text-base font-medium">{round.name}</p>
            </div>

            <div className="space-y-1">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Round Type</h4>
              <div>
                <Badge variant="outline" className={`mt-1 font-medium capitalize border ${ROUND_TYPE_COLORS[round.roundType] || ""}`}>
                  {ROUND_TYPE_LABELS[round.roundType] || round.roundType}
                </Badge>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Award className="h-4 w-4 text-primary" />
                Evaluation Rubric (Template)
              </h4>
              {round.evaluationTemplate ? (
                <div className="p-4 rounded-lg bg-secondary/30 border space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <ClipboardList className="h-4.5 w-4.5 text-primary shrink-0" />
                    <Link
                      href={getTenantHref(`/evaluations/${round.evaluationTemplate.id}`)}
                      className="text-primary hover:underline transition-colors"
                    >
                      {round.evaluationTemplate.name}
                    </Link>
                  </div>
                  <div className="text-xs text-muted-foreground flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <span>Click the template name above to view or modify this evaluation rubric.</span>
                    <Link
                      href={getTenantHref("/evaluations")}
                      className="text-primary hover:underline font-medium text-xs mt-1 sm:mt-0"
                    >
                      View all templates &rarr;
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground italic p-3 bg-muted/20 border border-dashed rounded-lg flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <span>No evaluation template mapped (Ungraded Stage)</span>
                  <Link
                    href={getTenantHref("/evaluations")}
                    className="text-primary hover:underline font-medium text-xs"
                  >
                    Go to templates &rarr;
                  </Link>
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex justify-end border-t pt-4">
            <Button variant="outline" asChild>
              <Link href={getTenantHref("/rounds")}>Back to List</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </DashboardLayout>
  );
}
