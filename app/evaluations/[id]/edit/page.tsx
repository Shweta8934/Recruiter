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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Save, Plus, Trash } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

import { isValidName } from "@/lib/validation";

type Parameter = {
  id?: string;
  name: string;
  weight: number;
};

export default function EditEvaluationPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const orgId = user?.organizationId;
  const orgSlug = user?.organizationSlug;
  const isSuperAdmin = user?.roleSlug === 'super-admin';

  const [name, setName] = useState("");
  const [cutoffScore, setCutoffScore] = useState<number>(60);
  const [parameters, setParameters] = useState<Parameter[]>([{ name: "", weight: 10 }]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const dispatch = useDispatch();

  const getTenantHref = (path: string) => {
    if (orgSlug && !isSuperAdmin) {
      return `/organization/${orgSlug}${path}`;
    }
    return path;
  };

  useEffect(() => {
    if (!id) return;
    dispatch(evaluationsActions.fetchEvaluationByIdRequest({
      id,
      resolve: (data) => {
        if (data) {
          setName(data.name);
          setCutoffScore(data.cutoffScore);
          setParameters(
            data.parameters.map((p: any) => ({
              name: p.name,
              weight: p.weight,
            }))
          );
        }
        setLoading(false);
      },
      reject: () => {
        toast.error("Evaluation template not found");
        router.push(getTenantHref("/evaluations"));
      }
    }));
  }, [id, router, dispatch]);

  const addParameterRow = () => {
    setParameters(prev => [...prev, { name: "", weight: 10 }]);
  };

  const removeParameterRow = (index: number) => {
    setParameters(prev => prev.filter((_, i) => i !== index));
  };

  const updateParameterField = (index: number, field: keyof Parameter, value: string | number) => {
    setParameters(prev =>
      prev.map((param, i) => {
        if (i === index) {
          return { ...param, [field]: value };
        }
        return param;
      })
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();

    if (!orgId) {
      toast.error("User organization not found");
      return;
    }
    if (!trimmedName) {
      toast.error("Template name is required");
      return;
    }
    if (!isValidName(trimmedName, 3)) {
      toast.error("Evaluation template name must be at least 3 characters long and contain only letters and spaces.");
      return;
    }
    if (cutoffScore < 0 || cutoffScore > 100) {
      toast.error("Cutoff score must be between 0 and 100");
      return;
    }
    if (parameters.length === 0) {
      toast.error("Please add at least one parameter");
      return;
    }
    const invalidParams = parameters.some(p => !p.name.trim());
    if (invalidParams) {
      toast.error("All parameters must have a name");
      return;
    }
    const invalidWeights = parameters.some(p => p.weight < 0 || p.weight > 10);
    if (invalidWeights) {
      toast.error("Parameter weight must be between 0 and 10");
      return;
    }

    setIsSubmitting(true);
    dispatch(evaluationsActions.updateEvaluationRequest({
      id,
      payload: {
        name: trimmedName,
        cutoffScore,
        parameters: parameters.map(p => ({
          name: p.name.trim(),
          weight: Number(p.weight)
        }))
      },
      resolve: () => {
        toast.success("Evaluation template updated successfully");
        router.push(getTenantHref("/evaluations"));
      },
      reject: (err) => {
        toast.error(err || "Failed to update template");
        setIsSubmitting(false);
      }
    }));
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="text-center text-muted-foreground">Loading evaluation template...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild type="button">
              <Link href={getTenantHref("/evaluations")}>
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <PageHeader
              title="Edit Evaluation Template"
              description="Update the evaluation rubric configuration"
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Template Details</CardTitle>
              <CardDescription>
                Modify template metadata and criteria parameters.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="templateName">Template Name <span className="text-destructive">*</span></Label>
                  <Input
                    id="templateName"
                    placeholder="e.g. Technical Interview Rubric"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cutoffScore">Cutoff (%) <span className="text-destructive">*</span></Label>
                  <Input
                    id="cutoffScore"
                    type="number"
                    min={0}
                    max={100}
                    value={cutoffScore}
                    onChange={(e) => setCutoffScore(Number(e.target.value))}
                    required
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold">Parameters & Weights (0-10) <span className="text-destructive">*</span></Label>
                  <Button type="button" variant="outline" size="sm" onClick={addParameterRow} className="h-8">
                    <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Param
                  </Button>
                </div>

                <ScrollArea className="h-[250px] rounded-md border p-4 bg-muted/10">
                  <div className="space-y-3">
                    {parameters.map((param, index) => (
                      <div key={index} className="flex gap-2 items-center">
                        <div className="flex-1">
                          <Input
                            placeholder="Parameter Name (e.g. Problem Solving)"
                            value={param.name}
                            onChange={(e) => updateParameterField(index, "name", e.target.value)}
                            className="h-10"
                            required
                          />
                        </div>
                        <div className="w-28">
                          <Input
                            type="number"
                            min={0}
                            max={10}
                            placeholder="Weight (0-10)"
                            value={param.weight}
                            onChange={(e) => updateParameterField(index, "weight", Number(e.target.value))}
                            className="h-10"
                            required
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeParameterRow(index)}
                          disabled={parameters.length <= 1}
                          className="h-10 w-10 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end gap-2 border-t pt-4">
              <Button variant="outline" asChild type="button">
                <Link href={getTenantHref("/evaluations")}>Cancel</Link>
              </Button>
              <Button type="submit" disabled={isSubmitting || !name.trim() || parameters.length === 0}>
                <Save className="mr-2 h-4 w-4" />
                {isSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            </CardFooter>
          </Card>
        </form>
      </div>
    </DashboardLayout>
  );
}
