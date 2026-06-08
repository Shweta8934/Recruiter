"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useDispatch } from "react-redux";
import { fetchProjectByIdRequest, updateProjectRequest } from "@/store/slices/projectsSlice";
import { DashboardLayout } from "@/components/layout";
import { PageHeader } from "@/components/common";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Save } from "lucide-react";

export default function EditProjectPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const dispatch = useDispatch();

  useEffect(() => {
    if (!id) return;
    dispatch(fetchProjectByIdRequest({
      projectId: id,
      resolve: (project) => {
        setName(project?.name ?? "");
        setDescription(project?.description ?? "");
        setLoading(false);
      },
      reject: () => {
        setLoading(false);
      }
    }));
  }, [id, dispatch]);

  function save() {
    dispatch(updateProjectRequest({
      projectId: id,
      payload: { name: name.trim(), description: description.trim() },
      resolve: () => {
        router.push(`/jobs/${id}`);
      }
    }));
  }

  if (loading) return <DashboardLayout><div className="p-6">Loading...</div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/jobs/${id}`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <PageHeader title="Edit Project" description="Update project details">
            <Button onClick={save} disabled={name.trim().length < 3 || name.trim().length > 30 || (description.trim().length > 0 && (description.trim().length < 30 || description.trim().length > 500))}>
              <Save className="mr-2 h-4 w-4" />
              Save
            </Button>
          </PageHeader>
        </div>
        <Card>
          <CardContent className="pt-6 space-y-3">
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
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
