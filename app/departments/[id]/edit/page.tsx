"use client";

import { useEffect, useState } from "react";
import { isValidName } from "@/lib/validation";

import { useParams, useRouter } from "next/navigation";
import { useDispatch } from "react-redux";
import { useAuth } from "@/hooks/useAuth";
import { departmentsActions } from "@/store/slices/departmentsSlice";
import { sectionsActions } from "@/store/slices/sectionsSlice";
import { DashboardLayout } from "@/components/layout";
import { PageHeader } from "@/components/common";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

type Section = {
  id: string;
  name: string;
};

export default function EditDepartmentPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const orgId = user?.organizationId;

  const [name, setName] = useState("");
  const [sections, setSections] = useState<Section[]>([]);
  const [selectedSectionIds, setSelectedSectionIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const dispatch = useDispatch();

  useEffect(() => {
    if (!orgId || !id) return;
    dispatch(sectionsActions.fetchSectionsRequest({
      organizationId: orgId,
      resolve: (data) => setSections(data ?? [])
    }));

    dispatch(departmentsActions.fetchDepartmentByIdRequest({
      id,
      resolve: (data) => {
        setName(data?.name || "");
        setSelectedSectionIds(data?.sections?.map((s: any) => s.id) || []);
        setLoading(false);
      },
      reject: () => {
        toast.error("Department not found");
        router.push("/departments");
      }
    }));
  }, [id, orgId, router, dispatch]);

  const toggleSection = (sectionId: string) => {
    setSelectedSectionIds(prev =>
      prev.includes(sectionId)
        ? prev.filter(sid => sid !== sectionId)
        : [...prev, sectionId]
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
      toast.error("Department name is required");
      return;
    }
    if (!isValidName(trimmedName, 3)) {
      toast.error("Department name must be at least 3 characters long and contain only letters and spaces.");
      return;
    }
    if (selectedSectionIds.length === 0) {
      toast.error("Please select at least one section for the department.");
      return;
    }

    setIsSubmitting(true);
    dispatch(departmentsActions.updateDepartmentRequest({
      id,
      payload: {
        name: trimmedName,
        sectionIds: selectedSectionIds
      },
      resolve: () => {
        toast.success("Department updated successfully");
        router.push("/departments");
      },
      reject: (err) => {
        toast.error(err || "Failed to update department");
        setIsSubmitting(false);
      }
    }));
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="text-center text-muted-foreground">Loading department data...</div>
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
              <Link href="/departments">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <PageHeader
              title="Edit Department"
              description="Modify department details and section mappings"
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Department Details</CardTitle>
              <CardDescription>Update name and section assignments.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="deptName">Department Name <span className="text-destructive">*</span></Label>
                <Input
                  id="deptName"
                  placeholder="e.g. Engineering"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Assign Sections <span className="text-destructive">*</span></Label>
                {sections.length === 0 ? (
                  <div className="text-sm text-muted-foreground p-4 bg-muted/30 rounded-lg border border-dashed text-center">
                    No sections exist. Create sections first.
                  </div>
                ) : (
                  <ScrollArea className="h-[200px] w-full rounded-md border p-3 bg-muted/20">
                    <div className="space-y-3">
                      {sections.map(section => (
                        <div key={section.id} className="flex items-center space-x-3 p-1 rounded-md hover:bg-muted/40 transition-colors">
                          <Checkbox
                            id={`section-${section.id}`}
                            checked={selectedSectionIds.includes(section.id)}
                            onCheckedChange={() => toggleSection(section.id)}
                          />
                          <label
                            htmlFor={`section-${section.id}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer w-full"
                          >
                            {section.name}
                          </label>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex justify-end gap-2 border-t pt-4">
              <Button variant="outline" asChild type="button">
                <Link href="/departments">Cancel</Link>
              </Button>
              <Button type="submit" disabled={isSubmitting || selectedSectionIds.length === 0}>
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
