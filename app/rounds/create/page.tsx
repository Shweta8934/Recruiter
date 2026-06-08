"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useDispatch } from "react-redux";
import { useAuth } from "@/hooks/useAuth";
import { roundsActions } from "@/store/slices/roundsSlice";
import { evaluationsActions } from "@/store/slices/evaluationsSlice";
import { DashboardLayout } from "@/components/layout";
import { PageHeader } from "@/components/common";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

type EvaluationTemplate = {
  id: string;
  name: string;
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

export default function CreateRoundPage() {
  const router = useRouter();
  const { user } = useAuth();
  const orgId = user?.organizationId;
  const userId = user?.id;
  const orgSlug = user?.organizationSlug;
  const isSuperAdmin = user?.roleSlug === 'super-admin';

  const [name, setName] = useState("");
  const [roundType, setRoundType] = useState("");
  const [evaluationTemplateId, setEvaluationTemplateId] = useState("");
  const [templates, setTemplates] = useState<EvaluationTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const dispatch = useDispatch();

  const getTenantHref = (path: string) => {
    if (orgSlug && !isSuperAdmin) {
      return `/organization/${orgSlug}${path}`;
    }
    return path;
  };

  useEffect(() => {
    if (!orgId) return;
    dispatch(evaluationsActions.fetchEvaluationsRequest({
      organizationId: orgId,
      resolve: (data) => {
        setTemplates(data ?? []);
        setLoadingTemplates(false);
      },
      reject: () => {
        toast.error("Failed to load evaluation templates");
        setLoadingTemplates(false);
      }
    }));
  }, [orgId, dispatch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!orgId) {
      toast.error("User organization not found");
      return;
    }
    if (!userId) {
      toast.error("User context not found. Please log in.");
      return;
    }
    if (!trimmedName) {
      toast.error("Round name is required");
      return;
    }
    if (trimmedName.length < 3) {
      toast.error("Round name must be at least 3 characters long.");
      return;
    }
    if (/\d/.test(trimmedName)) {
      toast.error("Round name cannot contain numbers.");
      return;
    }
    if (!roundType) {
      toast.error("Round type is required");
      return;
    }

    setIsSubmitting(true);
    const templateVal = evaluationTemplateId === "none" || !evaluationTemplateId ? null : evaluationTemplateId;

    dispatch(roundsActions.createRoundRequest({
      payload: {
        organizationId: orgId,
        createdById: userId,
        name: trimmedName,
        roundType,
        evaluationTemplateId: templateVal
      },
      resolve: () => {
        toast.success("Round created successfully");
        router.push(getTenantHref("/rounds"));
      },
      reject: (err) => {
        toast.error(err || "Failed to create round");
        setIsSubmitting(false);
      }
    }));
  };

  return (
    <DashboardLayout>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild type="button">
            <Link href={getTenantHref("/rounds")}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <PageHeader
            title="Create Recruitment Round"
            description="Define a new round and map it to an evaluation rubric"
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Round Details</CardTitle>
            <CardDescription>Enter parameters for the new recruitment round.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="roundName">Round Name <span className="text-destructive">*</span></Label>
              <Input
                id="roundName"
                placeholder="e.g. Java Technical Round"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="roundType">Round Type <span className="text-destructive">*</span></Label>
              <select
                id="roundType"
                value={roundType}
                onChange={(e) => setRoundType(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                required
              >
                <option value="" disabled>Select Round Type</option>
                {Object.entries(ROUND_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="evalTemplate">Evaluation Template (Optional)</Label>
              {loadingTemplates ? (
                <div className="text-sm text-muted-foreground">Loading templates...</div>
              ) : (
                <select
                  id="evalTemplate"
                  value={evaluationTemplateId}
                  onChange={(e) => setEvaluationTemplateId(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="" disabled>Select Evaluation Template</option>
                  <option value="none">None / No Rubric</option>
                  {templates.map((tpl) => (
                    <option key={tpl.id} value={tpl.id}>
                      {tpl.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex justify-end gap-2 border-t pt-4">
            <Button variant="outline" asChild type="button">
              <Link href={getTenantHref("/rounds")}>Cancel</Link>
            </Button>
            <Button type="submit" disabled={isSubmitting || !name.trim() || !roundType}>
              <Save className="mr-2 h-4 w-4" />
              {isSubmitting ? "Saving..." : "Save Round"}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </DashboardLayout>
  );
}
