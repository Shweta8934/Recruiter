"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useDispatch } from "react-redux";
import { organizationActions } from "@/store/slices/organizationSlice";
import { useAuth } from "@/hooks/useAuth";
import { usePermission } from "@/hooks/usePermission";
import { DashboardLayout } from "@/components/layout";
import { PageHeader, EmptyState } from "@/components/common";
import { RoleBadge, PermissionGate } from "@/components/rbac";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { permissions as allPermissions } from "@/data/permissions";
import { toast } from "sonner";
import { 
  ArrowLeft, 
  Shield, 
  Users, 
  Pencil,
  Save,
  X,
  Lock,
  Trash2,
  Search
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

export default function RoleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { can } = usePermission();
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [role, setRole] = useState<any>(null);
  const [memberCount, setMemberCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [permSearch, setPermSearch] = useState('');
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const dispatch = useDispatch();

  useEffect(() => {
    async function load() {
      dispatch(organizationActions.loadRoleByIdRequest({
        roleId: id,
        resolve: (roleData) => {
          if (!roleData) {
            setLoading(false);
            return;
          }
          setRole(roleData);
          if (roleData.organizationId) {
            dispatch(organizationActions.loadUsersRequest({
              organizationId: roleData.organizationId,
              resolve: (usersData: any) => {
                const users = Array.isArray(usersData) ? usersData : (usersData?.users ?? []);
                setMemberCount(
                  users.filter((u: any) => u.roleId === roleData.id).length
                );
                setLoading(false);
              },
              reject: () => {
                setMemberCount(0);
                setLoading(false);
              }
            }));
          } else {
            setMemberCount(0);
            setLoading(false);
          }
        },
        reject: () => {
          setLoading(false);
        }
      }));
    }
    load();
  }, [id, dispatch]);

  if (loading) {
    return <DashboardLayout><div className="p-6">Loading...</div></DashboardLayout>;
  }

  if (!role) {
    notFound();
  }

  // Initialize selected permissions when entering edit mode
  const handleStartEdit = () => {
    setSelectedPermissions(role.permissions);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setSelectedPermissions([]);
    setIsEditing(false);
  };

  const handleSave = () => {
    dispatch(organizationActions.updateRoleRequest({
      roleId: id,
      payload: { permissions: selectedPermissions },
      resolve: () => {
        setRole({ ...role, permissions: selectedPermissions });
        setIsEditing(false);
        toast.success('Role permissions updated successfully');
      },
      reject: (err: string) => {
        toast.error(err || 'Failed to update role permissions');
      }
    }));
  };

  const handleDeleteRole = () => {
    setIsDeleting(true);
    dispatch(organizationActions.deleteRoleRequest({
      roleId: id,
      resolve: () => {
        setIsDeleting(false);
        setIsDeleteDialogOpen(false);
        toast.success(`Role "${role.name}" deleted successfully`);
        router.push('/roles');
      },
      reject: (err: string) => {
        setIsDeleting(false);
        toast.error(err || 'Failed to delete role');
      }
    }));
  };

  const togglePermission = (permissionId: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(permissionId)
        ? prev.filter((p) => p !== permissionId)
        : [...prev, permissionId]
    );
  };

  // Filter permissions by search when editing
  const filteredPermissions = (isEditing && permSearch.trim())
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

  const currentPermissions = isEditing ? selectedPermissions : role.permissions;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/roles">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <PageHeader
            title={role.name}
            description={role.description || "Manage role permissions"}
          >
            <div className="flex items-center gap-2">
              {/* Allow edit for custom roles AND org-level system roles (not global system) */}
              {(role.organizationId !== null || !role.isSystem) && can("roles:update") && (
                <>
                  {isEditing ? (
                    <>
                      <Button variant="outline" size="icon" onClick={handleCancelEdit} title="Cancel">
                        <X className="h-4 w-4" />
                      </Button>
                      <Button size="icon" onClick={handleSave} title="Save Changes">
                        <Save className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <Button size="icon" variant="outline" onClick={handleStartEdit} title="Edit Permissions">
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}
                </>
              )}
              {/* Allow delete only for custom roles (not system roles) */}
              {!role.isSystem && can("roles:delete") && !isEditing && (
                <Button
                  size="icon"
                  variant="destructive"
                  onClick={() => setIsDeleteDialogOpen(true)}
                  title="Delete Role"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </PageHeader>
        </div>

        {/* Role Overview */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Role Type
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <RoleBadge role={role} />
                {role.isSystem && (
                  <Badge variant="secondary" className="gap-1">
                    <Lock className="h-3 w-3" />
                    System
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Members
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-muted-foreground" />
                <span className="text-2xl font-bold">{memberCount}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Permissions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-muted-foreground" />
                <span className="text-2xl font-bold">
                  {currentPermissions.length}
                </span>
                <span className="text-muted-foreground">
                  / {allPermissions.length}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* System Role Warning — only for truly global system roles */}
        {role.isSystem && !role.organizationId && (
          <Card className="border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Lock className="h-5 w-5 text-amber-600 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-800 dark:text-amber-200">
                    Global System Role
                  </p>
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    This is a global system role and cannot be modified. Create a
                    custom role if you need different permissions.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Permissions by Category */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Permissions
            </CardTitle>
            <CardDescription>
              {isEditing
                ? "Check or uncheck permissions to modify this role"
                : "Permissions assigned to this role"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Permissions Search (only in edit mode) */}
            {isEditing && (
              <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search permissions to add or remove..."
                  value={permSearch}
                  onChange={(e) => setPermSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            )}
            
            {isEditing && filteredPermissions.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">No permissions match your search.</p>
            )}

            <div className="space-y-6">
              {Object.entries(permissionsByCategory).map(
                ([category, perms], index) => (
                  <div key={category}>
                    {index > 0 && <Separator className="mb-6" />}
                    <div className="space-y-4">
                      <h3 className="font-semibold capitalize text-lg">
                        {category}
                      </h3>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {perms.map((perm) => {
                          const hasPermission = currentPermissions.includes(
                            perm.id
                          );
                          return (
                              <div
                                key={perm.id}
                                className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                                  hasPermission
                                    ? "bg-primary/5 border-primary/20"
                                    : "bg-muted/30 border-transparent"
                                } ${
                                  isEditing && (role.organizationId !== null || !role.isSystem)
                                    ? "cursor-pointer hover:bg-muted"
                                    : ""
                                }`}
                            >
                              {isEditing && (role.organizationId !== null || !role.isSystem) ? (
                                <Checkbox
                                  checked={hasPermission}
                                  onClick={(e) => e.stopPropagation()}
                                  onCheckedChange={(checked) => {
                                    const shouldSelect = checked === true;
                                    if ((hasPermission && !shouldSelect) || (!hasPermission && shouldSelect)) {
                                      togglePermission(perm.id);
                                    }
                                  }}
                                  className="mt-0.5"
                                />
                              ) : (
                                <div
                                  className={`h-4 w-4 rounded-full mt-0.5 ${
                                    hasPermission
                                      ? "bg-primary"
                                      : "bg-muted-foreground/20"
                                  }`}
                                />
                              )}
                              <div className="flex-1 min-w-0">
                                <p
                                  className={`font-medium text-sm ${
                                    hasPermission
                                      ? "text-foreground"
                                      : "text-muted-foreground"
                                  }`}
                                >
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
                )
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Delete Role Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={(open) => { if (!open && !isDeleting) setIsDeleteDialogOpen(false); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Role</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the <strong>{role?.name}</strong> role? This action cannot be undone.
              {memberCount > 0 && (
                <span className="block mt-2 text-destructive font-medium">
                  ⚠️ This role has {memberCount} member{memberCount !== 1 ? 's' : ''} assigned. Reassign them before deleting.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} disabled={isDeleting}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteRole} disabled={isDeleting || memberCount > 0}>
              {isDeleting ? 'Deleting...' : 'Delete Role'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
