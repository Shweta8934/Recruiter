"use client";

import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { useAuth } from "@/hooks/useAuth";
import { departmentsActions } from "@/store/slices/departmentsSlice";
import { DashboardLayout } from "@/components/layout";
import { PageHeader, EmptyState } from "@/components/common";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Building, Layers, Pencil, Trash2 } from "lucide-react";
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

type Section = {
  id: string;
  name: string;
};

type Department = {
  id: string;
  name: string;
  sections: Section[];
};

export default function DepartmentsPage() {
  const { user } = useAuth();
  const orgId = user?.organizationId;

  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDeptId, setDeleteDeptId] = useState<string | null>(null);
  const [expandedDeptIds, setExpandedDeptIds] = useState<Set<string>>(new Set());
  const dispatch = useDispatch();

  function loadData() {
    if (!orgId) return;
    setLoading(true);
    dispatch(departmentsActions.fetchDepartmentsRequest({
      organizationId: orgId,
      resolve: (data) => {
        setDepartments(data ?? []);
        setLoading(false);
      },
      reject: () => {
        toast.error("Failed to load departments");
        setLoading(false);
      }
    }));
  }

  useEffect(() => {
    loadData();
  }, [orgId, dispatch]);

  const toggleDeptExpanded = (deptId: string) => {
    setExpandedDeptIds(prev => {
      const next = new Set(prev);
      if (next.has(deptId)) next.delete(deptId);
      else next.add(deptId);
      return next;
    });
  };

  function deleteDepartment() {
    if (!deleteDeptId) return;
    dispatch(departmentsActions.deleteDepartmentRequest({
      id: deleteDeptId,
      resolve: () => {
        toast.success("Department deleted successfully");
        setDeleteDeptId(null);
        loadData();
      },
      reject: (err) => {
        toast.error(err || "Failed to delete department");
      }
    }));
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader title="Departments" description="Organize your company into distinct departments with mapped sections.">
          <Button asChild>
            <Link href="/departments/create">
              <Plus className="mr-2 h-4 w-4" />
              Add Department
            </Link>
          </Button>
        </PageHeader>

        {!loading && departments.length === 0 ? (
          <EmptyState
            icon={Building}
            title="No departments found"
            description="Create departments and assign sections to them."
            action={
              <Button asChild>
                <Link href="/departments/create">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Department
                </Link>
              </Button>
            }
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {departments.map((dept) => (
              <Card key={dept.id} className="flex flex-col h-full border-t-4 border-t-primary group">
                <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-xl truncate pr-2">{dept.name}</CardTitle>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                      <Link href={`/departments/${dept.id}/edit`} title="Edit Department">
                        <Pencil className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => setDeleteDeptId(dept.id)} title="Delete Department">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="flex-1">
                  <div className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                    <Layers className="h-4 w-4" />
                    Sections ({dept.sections.length})
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {(() => {
                      const isExpanded = expandedDeptIds.has(dept.id);
                      const displaySections = isExpanded ? dept.sections : dept.sections.slice(0, 4);
                      const hiddenCount = dept.sections.length - 4;

                      return (
                        <>
                          {displaySections.map(section => (
                            <span key={section.id} className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-secondary text-secondary-foreground border">
                              {section.name}
                            </span>
                          ))}

                          {!isExpanded && hiddenCount > 0 && (
                            <button
                              onClick={() => toggleDeptExpanded(dept.id)}
                              className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 cursor-pointer transition-colors"
                            >
                              +{hiddenCount}
                            </button>
                          )}

                          {isExpanded && hiddenCount > 0 && (
                            <button
                              onClick={() => toggleDeptExpanded(dept.id)}
                              className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-muted text-muted-foreground hover:bg-muted/80 border cursor-pointer transition-colors"
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

      <AlertDialog open={!!deleteDeptId} onOpenChange={(val) => !val && setDeleteDeptId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the department.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deleteDepartment} className="bg-destructive text-destructive-text hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
