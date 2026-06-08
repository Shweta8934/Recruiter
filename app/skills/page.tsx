"use client";

import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { useAuth } from "@/hooks/useAuth";
import { skillsActions } from "@/store/slices/skillsSlice";
import { DashboardLayout } from "@/components/layout";
import { PageHeader, EmptyState } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Plus, Code, Trash2, Pencil } from "lucide-react";
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

type Skill = {
  id: string;
  name: string;
  prettyName: string;
  isActive: boolean;
};

export default function SkillsPage() {
  const { user } = useAuth();
  const orgId = user?.organizationId;
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteSkillId, setDeleteSkillId] = useState<string | null>(null);
  const dispatch = useDispatch();

  function load() {
    if (!orgId) return;
    setLoading(true);
    dispatch(skillsActions.fetchSkillsRequest({
      organizationId: orgId,
      resolve: (data) => {
        setSkills(data);
        setLoading(false);
      },
      reject: () => {
        toast.error('Failed to load skills');
        setLoading(false);
      }
    }));
  }

  useEffect(() => {
    load();
  }, [orgId, dispatch]);

  function deleteSkill() {
    if (!deleteSkillId) return;
    dispatch(skillsActions.deleteSkillRequest({
      skillId: deleteSkillId,
      resolve: () => {
        toast.success('Skill deleted successfully');
        setDeleteSkillId(null);
        load();
      },
      reject: (err) => {
        toast.error(err || 'Failed to delete skill');
      }
    }));
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader title="Skills" description="Manage technical skills and tags for job postings.">
          <Button asChild>
            <Link href="/skills/create">
              <Plus className="mr-2 h-4 w-4" />
              Add Skill
            </Link>
          </Button>
        </PageHeader>

        {!loading && skills.length === 0 ? (
          <EmptyState
            icon={Code}
            title="No skills added"
            description="Start building your organization's skill directory."
            action={
              <Button asChild>
                <Link href="/skills/create">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Skill
                </Link>
              </Button>
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {skills.map((skill) => (
              <div
                key={skill.id}
                className="group flex items-center justify-between rounded-xl border bg-card p-3 shadow-sm transition-all hover:shadow-md hover:border-primary/30"
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <div
                    className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                      skill.isActive !== false ? 'bg-primary shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'bg-muted-foreground/30'
                    }`}
                    title={skill.isActive !== false ? "Active" : "Inactive"}
                  />
                  <span className={`truncate font-medium ${skill.isActive === false ? 'text-muted-foreground line-through opacity-70' : ''}`}>
                    {skill.prettyName}
                  </span>
                </div>

                <div className="flex items-center gap-1 shrink-0 ml-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
                    asChild
                  >
                    <Link href={`/skills/${skill.id}/edit`} title="Edit Skill">
                      <Pencil className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    onClick={() => setDeleteSkillId(skill.id)}
                    title="Delete Skill"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AlertDialog open={!!deleteSkillId} onOpenChange={(val) => !val && setDeleteSkillId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the skill and remove it from your organization.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deleteSkill} className="bg-destructive text-destructive-text hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
