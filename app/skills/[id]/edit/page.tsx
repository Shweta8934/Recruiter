"use client";

import { useEffect, useState } from "react";
import { isValidName } from "@/lib/validation";
import { useDispatch } from "react-redux";
import { skillsActions } from "@/store/slices/skillsSlice";

import { useParams, useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout";
import { PageHeader } from "@/components/common";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

export default function EditSkillPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [name, setName] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const dispatch = useDispatch();

  useEffect(() => {
    if (!id) return;
    dispatch(skillsActions.fetchSkillByIdRequest({
      skillId: id,
      resolve: (skill) => {
        setName(skill?.prettyName || skill?.name || '');
        setIsActive(skill?.isActive !== false);
        setLoading(false);
      },
      reject: () => {
        toast.error('Skill not found');
        router.push('/skills');
      }
    }));
  }, [id, router, dispatch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error("Skill name is required");
      return;
    }
    if (!isValidName(trimmedName, 3)) {
      toast.error("Skill name must be at least 3 characters long and contain only letters and spaces.");
      return;
    }

    setIsSubmitting(true);
    dispatch(skillsActions.updateSkillRequest({
      skillId: id,
      payload: { name: trimmedName, isActive },
      resolve: () => {
        toast.success('Skill updated successfully');
        router.push('/skills');
      },
      reject: (err) => {
        toast.error(err || 'Failed to update skill');
        setIsSubmitting(false);
      }
    }));
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="text-center text-muted-foreground">Loading skill details...</div>
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
              <Link href="/skills">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <PageHeader
              title="Edit Skill"
              description="Modify skill name and active status"
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Skill Details</CardTitle>
              <CardDescription>Update the skill's properties.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="skillName">Skill Name <span className="text-destructive">*</span></Label>
                <Input
                  id="skillName"
                  placeholder="e.g. React"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <input
                  type="checkbox"
                  id="isActive"
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                />
                <label
                  htmlFor="isActive"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  Is Active
                </label>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end gap-2 border-t pt-4">
              <Button variant="outline" asChild type="button">
                <Link href="/skills">Cancel</Link>
              </Button>
              <Button type="submit" disabled={isSubmitting || !name.trim()}>
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
