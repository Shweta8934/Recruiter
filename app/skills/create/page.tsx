"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useDispatch } from "react-redux";
import { skillsActions } from "@/store/slices/skillsSlice";
import { useAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/components/layout";
import { PageHeader } from "@/components/common";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

export default function CreateSkillPage() {
  const router = useRouter();
  const { user } = useAuth();
  const orgId = user?.organizationId;

  const [name, setName] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const dispatch = useDispatch();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!orgId) {
      toast.error("User organization not found");
      return;
    }
    if (!trimmedName) {
      toast.error("Skill name is required");
      return;
    }

    setIsSubmitting(true);
    dispatch(skillsActions.createSkillRequest({
      payload: {
        organizationId: orgId,
        name: trimmedName,
        isActive
      },
      resolve: () => {
        toast.success('Skill created successfully');
        router.push(withBasePath('/skills'));
      },
      reject: (err) => {
        toast.error(err || 'Failed to create skill');
        setIsSubmitting(false);
      }
    }));
  };

  return (
    <DashboardLayout>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild type="button">
            <Link href="/skills">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <PageHeader
            title="Create Skill"
            description="Add a new technical skill to the directory"
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Skill Details</CardTitle>
            <CardDescription>Enter the details for the new technical skill.</CardDescription>
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
              {isSubmitting ? "Saving..." : "Save Skill"}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </DashboardLayout>
  );
}
