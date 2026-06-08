"use client";

import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { useAuth } from "@/hooks/useAuth";
import { sectionsActions } from "@/store/slices/sectionsSlice";
import { DashboardLayout } from "@/components/layout";
import { PageHeader, EmptyState } from "@/components/common";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Layers, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
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

export default function SectionsPage() {
  const { user } = useAuth();
  const orgId = user?.organizationId;
  const [sections, setSections] = useState<Section[]>([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);

  const [editSectionId, setEditSectionId] = useState<string | null>(null);
  const [deleteSectionId, setDeleteSectionId] = useState<string | null>(null);
  const dispatch = useDispatch();

  function load() {
    if (!orgId) return;
    setLoading(true);
    dispatch(sectionsActions.fetchSectionsRequest({
      organizationId: orgId,
      resolve: (data) => {
        setSections(data ?? []);
        setLoading(false);
      },
      reject: () => {
        setSections([]);
        setLoading(false);
      }
    }));
  }

  useEffect(() => {
    load();
  }, [orgId, dispatch]);

  function saveSection() {
    if (!orgId || !name.trim()) return;
    const trimmed = name.trim();
    if (trimmed.length < 3 || trimmed.length > 30) {
      toast.error('Section name must be between 3 and 30 characters long.');
      return;
    }
    const nameRegex = /^[\p{L}\s'-]+$/u;
    if (!nameRegex.test(trimmed)) {
      toast.error('Section name must contain only letters and spaces.');
      return;
    }

    const isEdit = !!editSectionId;
    if (isEdit) {
      dispatch(sectionsActions.updateSectionRequest({
        id: editSectionId!,
        payload: { organizationId: orgId, name: trimmed },
        resolve: () => {
          toast.success('Section updated successfully');
          setOpen(false);
          setName('');
          setEditSectionId(null);
          load();
        },
        reject: (err) => toast.error(err || 'Failed to update section')
      }));
    } else {
      dispatch(sectionsActions.createSectionRequest({
        payload: { organizationId: orgId, name: trimmed },
        resolve: () => {
          toast.success('Section added successfully');
          setOpen(false);
          setName('');
          load();
        },
        reject: (err) => toast.error(err || 'Failed to create section')
      }));
    }
  }

  function deleteSection() {
    if (!deleteSectionId) return;
    dispatch(sectionsActions.deleteSectionRequest({
      id: deleteSectionId,
      resolve: () => {
        toast.success('Section deleted successfully');
        setDeleteSectionId(null);
        load();
      },
      reject: (err) => toast.error(err || 'Failed to delete section')
    }));
  }

  const openEdit = (section: Section) => {
    setEditSectionId(section.id);
    setName(section.name);
    setOpen(true);
  };

  const openCreate = () => {
    setEditSectionId(null);
    setName("");
    setOpen(true);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader title="Sections" description="Manage sub-divisions or functional sections within departments.">
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Add Section
          </Button>
        </PageHeader>

        {!loading && sections.length === 0 ? (
          <EmptyState
            icon={Layers}
            title="No sections found"
            description="Create sections that will be grouped under departments."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {sections.map((section) => (
              <div 
                key={section.id}
                className="group flex items-center justify-between rounded-xl border bg-card p-3 shadow-sm transition-all hover:shadow-md hover:border-primary/30"
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Layers className="h-4 w-4" />
                  </div>
                  <span className="truncate font-medium">{section.name}</span>
                </div>
                
                <div className="flex items-center gap-1 shrink-0 ml-2">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10" 
                    onClick={() => openEdit(section)}
                    title="Edit Section"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10" 
                    onClick={() => setDeleteSectionId(section.id)}
                    title="Delete Section"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editSectionId ? "Edit Section" : "Add New Section"}</DialogTitle>
            <DialogDescription>
              Sections are building blocks that can be mapped to one or more departments.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Section Name <span className="text-destructive">*</span></Label>
              <Input 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                placeholder="e.g. Frontend Development"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveSection();
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={saveSection}>{editSectionId ? "Update" : "Save"} Section</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteSectionId} onOpenChange={(val) => !val && setDeleteSectionId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the section and remove it from any mapped departments.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deleteSection} className="bg-destructive text-destructive-text hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
