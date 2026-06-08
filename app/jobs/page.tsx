"use client";

import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import Link from "next/link";
import { fetchProjectsRequest, createProjectRequest, deleteProjectRequest } from "@/store/slices/projectsSlice";
import type { RootState } from "@/store/rootReducer";
import { useAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/components/layout";
import { PageHeader, EmptyState } from "@/components/common";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Briefcase, Plus, Trash2, Users, Eye, Edit, AlertTriangle } from "lucide-react";

type Project = {
  id: string;
  name: string;
  description?: string | null;
  status: string;
  members?: Array<{ userId: string }>;
};

export default function ProjectsPage() {
  const { user } = useAuth();
  const orgId = user?.organizationId;
  const dispatch = useDispatch();
  const { projects, isLoading } = useSelector((state: RootState) => state.projects);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);

  useEffect(() => {
    if (orgId && projects.length === 0) {
      dispatch(fetchProjectsRequest({ organizationId: orgId, requesterUserId: user?.id }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, dispatch, projects.length]);

  function createProject() {
    if (!orgId || !name.trim()) return;
    dispatch(createProjectRequest({
      organizationId: orgId,
      name: name.trim(),
      description: description.trim(),
      createdBy: user?.id,
    }));
    setOpen(false);
    setName("");
    setDescription("");
  }

  function confirmDeleteProject(id: string) {
    setProjectToDelete(id);
    setDeleteOpen(true);
  }

  function handleDeleteProject() {
    if (projectToDelete) {
      dispatch(deleteProjectRequest(projectToDelete));
    }
    setDeleteOpen(false);
    setProjectToDelete(null);
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader title="Projects" description="Project CRUD for your organization">
          <Button onClick={() => setOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Project
          </Button>
        </PageHeader>

        {projects.length === 0 ? (
          <EmptyState
            icon={Briefcase}
            title="No projects yet"
            description="Create multiple projects under this organization."
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => (
              <Card key={p.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{p.name}</span>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" asChild>
                        <Link href={`/jobs/${p.id}`}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button variant="ghost" size="icon" asChild>
                        <Link href={`/jobs/${p.id}/edit`}>
                          <Edit className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => confirmDeleteProject(p.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-sm text-muted-foreground">{p.description || "No description"}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Users className="h-3 w-3" />
                    {p.members?.length || 0} members
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Project</DialogTitle>
            <DialogDescription>
              Add a new project under this organization.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Project Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
              {name.trim().length > 0 && (name.trim().length < 3 || name.trim().length > 30) && (
                <p className="text-xs text-destructive">Project name must be between 3 and 30 characters.</p>
              )}
            </div>
            <div className="space-y-1">
              <Label>Description</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} />
              {description.trim().length > 0 && (description.trim().length < 30 || description.trim().length > 500) && (
                <p className="text-xs text-destructive">Description must be between 30 and 500 characters.</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={createProject} disabled={name.trim().length < 3 || name.trim().length > 30 || (description.trim().length > 0 && (description.trim().length < 30 || description.trim().length > 500))}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Delete Project
            </DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-2 mt-2">
                <p>Are you sure you want to delete this project? This action cannot be undone.</p>
                {projects.find(p => p.id === projectToDelete)?.members?.length ? (
                  <p className="font-semibold text-destructive">
                    Warning: This project has {projects.find(p => p.id === projectToDelete)?.members?.length} member(s). Deleting the project will also remove all associated members.
                  </p>
                ) : null}
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteProject}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </DashboardLayout>
  );
}
