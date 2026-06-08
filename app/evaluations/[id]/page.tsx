"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useDispatch } from "react-redux";
import { useAuth } from "@/hooks/useAuth";
import { evaluationsActions } from "@/store/slices/evaluationsSlice";
import { DashboardLayout } from "@/components/layout";
import { PageHeader } from "@/components/common";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Pencil, ClipboardList, Award, Trash2, ListChecks, Sliders, CheckCircle } from "lucide-react";
import { toast } from "sonner";
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

type Parameter = {
  id: string;
  name: string;
  weight: number;
};

type RoundMaster = {
  id: string;
  name: string;
};

type EvaluationTemplate = {
  id: string;
  name: string;
  cutoffScore: number;
  parameters: Parameter[];
  rounds: RoundMaster[];
};

export default function EvaluationTemplateDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const orgId = user?.organizationId;
  const orgSlug = user?.organizationSlug;
  const isSuperAdmin = user?.roleSlug === 'super-admin';

  const [template, setTemplate] = useState<EvaluationTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const dispatch = useDispatch();

  const getTenantHref = (path: string) => {
    if (orgSlug && !isSuperAdmin) {
      return `/organization/${orgSlug}${path}`;
    }
    return path;
  };

  const loadData = () => {
    if (!id) return;
    dispatch(evaluationsActions.fetchEvaluationByIdRequest({
      id,
      resolve: (data) => {
        setTemplate(data);
        setLoading(false);
      },
      reject: () => {
        toast.error("Evaluation template not found");
        router.push(getTenantHref("/evaluations"));
      }
    }));
  };

  useEffect(() => {
    loadData();
  }, [id, router, dispatch]);

  const handleDelete = () => {
    if (!id) return;
    dispatch(evaluationsActions.deleteEvaluationRequest({
      id,
      resolve: () => {
        toast.success("Evaluation template deleted successfully");
        setDeleteDialogOpen(false);
        router.push(getTenantHref("/evaluations"));
      },
      reject: (err) => {
        toast.error(err || "Failed to delete evaluation template");
      }
    }));
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="text-center text-muted-foreground">Loading template details...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (!template) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="text-center text-muted-foreground">Evaluation template not found</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild type="button">
            <Link href={getTenantHref("/evaluations")}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <PageHeader
            title="Evaluation Rubric Details"
            description="View template criteria parameters and cutoff configuration"
          />
        </div>

        <Card className="border-t-4 border-t-primary">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-2xl flex items-center gap-2">
                <ClipboardList className="h-6 w-6 text-primary shrink-0" />
                {template.name}
              </CardTitle>
              <CardDescription className="mt-1">
                Evaluation Template Configured Rubric
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href={getTenantHref(`/evaluations/${template.id}/edit`)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit Template
                </Link>
              </Button>
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Template
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Template Name</h4>
                <p className="text-base font-medium">{template.name}</p>
              </div>

              <div className="space-y-1">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Minimum Passing Cutoff Score</h4>
                <div>
                  <Badge variant="outline" className="mt-1 font-bold border bg-primary/10 text-primary border-primary/20">
                    {template.cutoffScore}%
                  </Badge>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 border-b pb-2">
                <Sliders className="h-4 w-4 text-primary" />
                Evaluation Criteria Parameters & Weights
              </h4>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {template.parameters.map((param) => (
                  <Card key={param.id} className="bg-secondary/10 border hover:bg-secondary/20 transition-colors">
                    <CardHeader className="p-3 pb-1 flex flex-row items-center justify-between space-y-0">
                      <CardTitle className="text-sm font-semibold truncate flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-primary shrink-0" />
                        {param.name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 pt-0">
                      <div className="text-xs text-muted-foreground flex justify-between items-center mt-1">
                        <span>Evaluation Weight:</span>
                        <span className="font-bold text-primary">{param.weight} / 10</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 border-b pb-2">
                <Award className="h-4 w-4 text-primary" />
                Mapped Recruitment Rounds ({template.rounds?.length || 0})
              </h4>
              {template.rounds && template.rounds.length > 0 ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  {template.rounds.map((round) => (
                    <div 
                      key={round.id}
                      className="p-3 rounded-lg bg-secondary/30 border flex items-center justify-between text-sm"
                    >
                      <span className="font-medium text-foreground">{round.name}</span>
                      <Button variant="link" size="sm" asChild className="p-0 h-auto">
                        <Link href={getTenantHref(`/rounds/${round.id}`)}>
                          View Round &rarr;
                        </Link>
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground italic p-4 bg-muted/20 border border-dashed rounded-lg flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <span>No recruitment rounds mapped to this evaluation template yet.</span>
                  <Link
                    href={getTenantHref("/rounds")}
                    className="text-primary hover:underline font-medium text-xs"
                  >
                    Go to Round Master &rarr;
                  </Link>
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex justify-end border-t pt-4">
            <Button variant="outline" asChild>
              <Link href={getTenantHref("/evaluations")}>Back to List</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the evaluation template.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
