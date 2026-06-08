"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useDispatch } from "react-redux";
import { organizationActions } from "@/store/slices/organizationSlice";
import { useAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/components/layout";
import { PageHeader } from "@/components/common";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { permissions as allPermissions } from "@/data/permissions";
import { ArrowLeft, Shield, Save, Search } from "lucide-react";
import Link from "next/link";

const ROLE_COLORS = [
  { name: "Blue", value: "#3b82f6" },
  { name: "Green", value: "#22c55e" },
  { name: "Purple", value: "#a855f7" },
  { name: "Orange", value: "#f97316" },
  { name: "Pink", value: "#ec4899" },
  { name: "Cyan", value: "#06b6d4" },
  { name: "Red", value: "#ef4444" },
  { name: "Yellow", value: "#eab308" },
];

export default function CreateRolePage() {
  const router = useRouter();
  const { organization } = useAuth();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(ROLE_COLORS[0].value);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [permSearch, setPermSearch] = useState('');
  const dispatch = useDispatch();

  const togglePermission = (permissionId: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(permissionId)
        ? prev.filter((p) => p !== permissionId)
        : [...prev, permissionId]
    );
  };

  const toggleCategory = (category: string) => {
    const categoryPermissions = allPermissions
      .filter((p) => p.category === category)
      .map((p) => p.id);
    
    const allSelected = categoryPermissions.every((p) =>
      selectedPermissions.includes(p)
    );

    if (allSelected) {
      setSelectedPermissions((prev) =>
        prev.filter((p) => !categoryPermissions.includes(p))
      );
    } else {
      setSelectedPermissions((prev) => [
        ...new Set([...prev, ...categoryPermissions]),
      ]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const roleSlug = name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    dispatch(organizationActions.createRoleRequest({
      payload: {
        name: name.trim(),
        slug: roleSlug || `role-${Date.now()}`,
        description: description.trim() || "Custom role",
        organizationId: organization?.id ?? null,
        isSystem: false,
        permissions: selectedPermissions,
        color,
      },
      resolve: () => {
        router.push("/roles");
      },
      reject: () => {
        setIsSubmitting(false);
      }
    }));
  };

  // Filter permissions by search
  const filteredPermissions = permSearch.trim()
    ? allPermissions.filter(
        (p) =>
          p?.name?.toLowerCase().includes(permSearch.toLowerCase()) ||
          p?.description?.toLowerCase().includes(permSearch.toLowerCase()) ||
          p?.id?.toLowerCase().includes(permSearch.toLowerCase())
      )
    : allPermissions;

  // Group permissions by category
  const permissionsByCategory = filteredPermissions.reduce((acc, perm) => {
    if (!acc[perm.category]) {
      acc[perm.category] = [];
    }
    acc[perm.category].push(perm);
    return acc;
  }, {} as Record<string, typeof allPermissions>);

  return (
    <DashboardLayout>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild type="button">
            <Link href="/roles">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <PageHeader
            title="Create Role"
            description="Define a new custom role with specific permissions"
          >
            <Button type="submit" disabled={!name.trim() || isSubmitting}>
              <Save className="mr-2 h-4 w-4" />
              {isSubmitting ? "Creating..." : "Create Role"}
            </Button>
          </PageHeader>
        </div>

        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>Role Details</CardTitle>
            <CardDescription>
              Basic information about this role
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Role Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., Project Manager"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Role Color</Label>
                <div className="flex gap-2 flex-wrap">
                  {ROLE_COLORS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      className={`h-8 w-8 rounded-full transition-all ${
                        color === c.value
                          ? "ring-2 ring-offset-2 ring-primary"
                          : "hover:scale-110"
                      }`}
                      style={{ backgroundColor: c.value }}
                      onClick={() => setColor(c.value)}
                      title={c.name}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe what this role is for..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Preview */}
        <Card>
          <CardHeader>
            <CardTitle>Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div
                className="h-10 w-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${color}20` }}
              >
                <Shield className="h-5 w-5" style={{ color }} />
              </div>
              <div>
                <p className="font-medium">{name || "Role Name"}</p>
                <p className="text-sm text-muted-foreground">
                  {selectedPermissions.length} permission
                  {selectedPermissions.length !== 1 ? "s" : ""} selected
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Permissions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Permissions
            </CardTitle>
            <CardDescription>
              Select the permissions this role should have
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Permissions Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search permissions..."
                value={permSearch}
                onChange={(e) => setPermSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            {filteredPermissions.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">No permissions match your search.</p>
            )}
            <div className="space-y-6">
              {Object.entries(permissionsByCategory).map(
                ([category, perms], index) => {
                  const categoryPermIds = perms.map((p) => p.id);
                  const selectedCount = categoryPermIds.filter((p) =>
                    selectedPermissions.includes(p)
                  ).length;
                  const allSelected = selectedCount === perms.length;
                  const someSelected = selectedCount > 0 && !allSelected;

                  return (
                    <div key={category}>
                      {index > 0 && <Separator className="mb-6" />}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={allSelected}
                              ref={(el) => {
                                if (el) {
                                  (el as HTMLButtonElement & { indeterminate: boolean }).indeterminate = someSelected;
                                }
                              }}
                              onClick={(e) => e.stopPropagation()}
                              onCheckedChange={(checked) => {
                                const shouldSelectAll = checked === true;
                                if ((allSelected && !shouldSelectAll) || (!allSelected && shouldSelectAll)) {
                                  toggleCategory(category);
                                }
                              }}
                            />
                            <h3 className="font-semibold capitalize text-lg">
                              {category}
                            </h3>
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {selectedCount} / {perms.length}
                          </span>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                          {perms.map((perm) => {
                            const isSelected = selectedPermissions.includes(
                              perm.id
                            );
                            return (
                              <div
                                key={perm.id}
                                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                                  isSelected
                                    ? "bg-primary/5 border-primary/20"
                                    : "hover:bg-muted"
                                }`}
                              >
                                <Checkbox
                                  checked={isSelected}
                                  onClick={(e) => e.stopPropagation()}
                                  onCheckedChange={(checked) => {
                                    const shouldSelect = checked === true;
                                    if ((isSelected && !shouldSelect) || (!isSelected && shouldSelect)) {
                                      togglePermission(perm.id);
                                    }
                                  }}
                                  className="mt-0.5"
                                />
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-sm">
                                    {perm.name}
                                  </p>
                                  {perm.description && (
                                    <p className="text-xs text-muted-foreground line-clamp-2">
                                      {perm.description}
                                    </p>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          </CardContent>
        </Card>
      </form>
    </DashboardLayout>
  );
}
