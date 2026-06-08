"use client";

import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { useAuth } from "@/hooks/useAuth";
import { evaluationsActions } from "@/store/slices/evaluationsSlice";
import { DashboardLayout } from "@/components/layout";
import { PageHeader, EmptyState } from "@/components/common";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eye, Plus, ClipboardList, Pencil, Trash2, Sliders } from "lucide-react";
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
  id?: string;
  name: string;
  weight: number;
};

type EvaluationTemplate = {
  id: string;
  name: string;
  cutoffScore: number;
  parameters: Parameter[];
};

export default function EvaluationsPage() {
  const { user } = useAuth();
  const orgId = user?.organizationId;
  const orgSlug = user?.organizationSlug;
  const isSuperAdmin = user?.roleSlug === 'super-admin';

  const [templates, setTemplates] = useState<EvaluationTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTemplateId, setDeleteTemplateId] = useState<string | null>(null);
  const [expandedTemplateIds, setExpandedTemplateIds] = useState<Set<string>>(new Set());
  const dispatch = useDispatch();

  const getTenantHref = (path: string) => {
    if (orgSlug && !isSuperAdmin) {
      return `/organization/${orgSlug}${path}`;
    }
    return path;
  };

  function loadTemplates() {
    if (!orgId) return;
    setLoading(true);
    dispatch(evaluationsActions.fetchEvaluationsRequest({
      organizationId: orgId,
      resolve: (data) => {
        setTemplates(data ?? []);
        setLoading(false);
      },
      reject: () => {
        console.error("Failed to load evaluation templates");
        setLoading(false);
      }
    }));
  }

  useEffect(() => {
    loadTemplates();
  }, [orgId, dispatch]);

  const toggleTemplateExpanded = (templateId: string) => {
    setExpandedTemplateIds(prev => {
      const next = new Set(prev);
      if (next.has(templateId)) next.delete(templateId);
      else next.add(templateId);
      return next;
    });
  };

  function deleteTemplate() {
    if (!deleteTemplateId) return;
    dispatch(evaluationsActions.deleteEvaluationRequest({
      id: deleteTemplateId,
      resolve: () => {
        toast.success("Evaluation template deleted successfully");
        setDeleteTemplateId(null);
        loadTemplates();
      },
      reject: (err) => {
        toast.error(err || "Failed to delete template");
      }
    }));
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader title="Evaluation System" description="Create scoring rubrics and templates to grade candidates consistently.">
          <Button asChild>
            <Link href={getTenantHref("/evaluations/create")}>
              <Plus className="mr-2 h-4 w-4" />
              Add Template
            </Link>
          </Button>
        </PageHeader>

        {loading ? (
          <div className="p-6 text-center text-muted-foreground">Loading templates...</div>
        ) : templates.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="No evaluation templates"
            description="Build your first template with parameter scales (0-10) and cutoff scores."
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {templates.map((template) => (
              <Card key={template.id} className="flex flex-col h-full border-t-4 border-t-primary group">
                <CardHeader className="pb-2 flex flex-row items-start justify-between space-y-0 gap-2">
                  <div className="space-y-1 min-w-0 flex-1">
                    <CardTitle className="text-xl truncate" title={template.name}>{template.name}</CardTitle>
                    <CardDescription className="text-xs">
                      Cutoff: <span className="font-semibold text-primary">{template.cutoffScore}%</span>
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" asChild>
                      <Link href={getTenantHref(`/evaluations/${template.id}`)} title="View Details">
                        <Eye className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" asChild>
                      <Link href={getTenantHref(`/evaluations/${template.id}/edit`)} title="Edit Template">
                        <Pencil className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10" 
                      onClick={() => setDeleteTemplateId(template.id)}
                      title="Delete Template"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 mt-2">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Sliders className="h-3 w-3" />
                    Criteria & Weights ({template.parameters.length})
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {(() => {
                      const isExpanded = expandedTemplateIds.has(template.id);
                      const displayParams = isExpanded ? template.parameters : template.parameters.slice(0, 3);
                      const hiddenCount = template.parameters.length - 3;

                      return (
                        <>
                          {displayParams.map((param, index) => (
                            <span key={index} className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-secondary text-secondary-foreground border">
                              {param.name} <span className="ml-1 text-primary font-bold">({param.weight}w)</span>
                            </span>
                          ))}

                          {!isExpanded && hiddenCount > 0 && (
                            <button
                              onClick={() => toggleTemplateExpanded(template.id)}
                              className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 cursor-pointer transition-colors"
                            >
                              +{hiddenCount} more
                            </button>
                          )}

                          {isExpanded && hiddenCount > 0 && (
                            <button
                              onClick={() => toggleTemplateExpanded(template.id)}
                              className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-muted text-muted-foreground hover:bg-muted/80 border cursor-pointer transition-colors"
                            >
                              Show less
                            </button>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <AlertDialog open={!!deleteTemplateId} onOpenChange={(val) => !val && setDeleteTemplateId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the evaluation template.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deleteTemplate} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
