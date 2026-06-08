"use client";

import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { useAuth } from "@/hooks/useAuth";
import { organizationActions } from "@/store/slices/organizationSlice";
import { usePermission } from "@/hooks/usePermission";
import { DashboardLayout } from "@/components/layout";
import { PageHeader, EmptyState } from "@/components/common";
import { RoleBadge } from "@/components/rbac";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { User } from "@/types";
import { Search, MoreHorizontal, UserPlus, Mail, Shield, Trash2, Users } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";


type MemberWithProjects = User & {
  projectMemberships?: Array<{ project?: { id: string; name: string } | null }>;
};

export default function MembersPage() {
  const { user } = useAuth();
  const { can } = usePermission();
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedMember, setSelectedMember] = useState<User | null>(null);
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [allUsers, setAllUsers] = useState<MemberWithProjects[]>([]);
  const [totalMembers, setTotalMembers] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 5;
  const [allRoles, setAllRoles] = useState<any[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState("");
  const isSuperAdmin = user?.roleSlug === 'super-admin';
  const effectiveOrganizationId = isSuperAdmin ? "" : (user?.organizationId || selectedOrgId);
  const dispatch = useDispatch();

  useEffect(() => {
    if (user?.organizationId || isSuperAdmin) return;
    dispatch(organizationActions.loadOrganizationsRequest({
      resolve: (orgs) => {
        const firstOrgId = orgs?.[0]?.id;
        if (firstOrgId && !selectedOrgId) setSelectedOrgId(firstOrgId);
      }
    }));
  }, [user?.organizationId, selectedOrgId, isSuperAdmin, dispatch]);

  useEffect(() => {
    if (!isSuperAdmin && !effectiveOrganizationId) return;

    function loadData() {
      const usersParams: any = {
        requesterUserId: user?.id ?? '',
        page,
        limit,
      };
      if (effectiveOrganizationId) usersParams.organizationId = effectiveOrganizationId;
      if (searchQuery) usersParams.search = searchQuery;
      if (roleFilter && roleFilter !== 'all') usersParams.roleId = roleFilter;
      if (statusFilter && statusFilter !== 'all') usersParams.status = statusFilter;

      dispatch(organizationActions.loadUsersRequest({
        ...usersParams,
        resolve: (data: any) => {
          setAllUsers(data.users ?? []);
          setTotalMembers(data.totalCount ?? 0);
        }
      }));
      dispatch(organizationActions.loadRolesRequest({
        organizationId: effectiveOrganizationId,
        resolve: (data) => setAllRoles(data.roles ?? [])
      }));
    }

    loadData();
    const onFocus = () => loadData();
    window.addEventListener('focus', onFocus);
    const interval = window.setInterval(loadData, 15000);
    return () => {
      window.removeEventListener('focus', onFocus);
      window.clearInterval(interval);
    };
  }, [effectiveOrganizationId, user?.id, page, searchQuery, roleFilter, statusFilter, dispatch]);

  // Use all DB-fetched roles — the API already scopes by org correctly
  const orgRoles = allRoles;

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    setPage(1);
  };

  const handleRoleChange = (val: string) => {
    setRoleFilter(val);
    setPage(1);
  };

  const handleStatusChange = (val: string) => {
    setStatusFilter(val);
    setPage(1);
  };

  const handleChangeRole = (memberId: string, newRoleId: string) => {
    dispatch(organizationActions.updateUserRequest({
      userId: memberId,
      payload: { roleId: newRoleId },
      resolve: () => {
        setIsRoleDialogOpen(false);
        setSelectedMember(null);
        toast.success('Role updated successfully');
        // Reload members list
        dispatch(organizationActions.loadUsersRequest({
          requesterUserId: user?.id ?? '',
          organizationId: effectiveOrganizationId || undefined,
          page,
          limit,
          resolve: (data: any) => {
            setAllUsers(data.users ?? []);
            setTotalMembers(data.totalCount ?? 0);
          }
        }));
      },
      reject: (err: string) => {
        toast.error(err || 'Failed to update role');
      }
    }));
  };

  const handleRemoveMember = (memberId: string) => {
    dispatch(organizationActions.deleteUserRequest({
      userId: memberId,
      resolve: () => {
        setIsDeleteDialogOpen(false);
        setSelectedMember(null);
        toast.success('Member removed successfully');
        // Reload members list
        dispatch(organizationActions.loadUsersRequest({
          requesterUserId: user?.id ?? '',
          organizationId: effectiveOrganizationId || undefined,
          page,
          limit,
          resolve: (data: any) => {
            setAllUsers(data.users ?? []);
            setTotalMembers(data.totalCount ?? 0);
          }
        }));
      },
      reject: (err: string) => {
        setIsDeleteDialogOpen(false);
        setSelectedMember(null);
        toast.error(err || 'Failed to remove member');
      }
    }));
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="Team Members"
          description="Manage your organization's team members and their roles"
        >
          {can("invites:create") && (
            <Button asChild>
              <Link
                href="/invites/send"
                onClick={() => {
                  console.warn("[MEMBERS] Invite Member clicked", {
                    userId: user?.id,
                    organizationId: effectiveOrganizationId,
                  });
                }}
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Invite Member
              </Link>
            </Button>
          )}
        </PageHeader>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              All Members ({totalMembers})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-10"
                />
              </div>
              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={handleStatusChange}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                  <SelectItem value="deactivated">Deactivated</SelectItem>
                </SelectContent>
              </Select>
              {/* Role Filter */}
              <Select value={roleFilter} onValueChange={handleRoleChange}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  {orgRoles.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Members Table */}
            {allUsers.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No members found"
                description={
                  searchQuery || roleFilter !== "all" || statusFilter !== "all"
                    ? "Try adjusting your search or filters"
                    : "Invite team members to get started"
                }
                action={
                  can("invites:create") ? (
                    <Button asChild>
                      <Link
                        href="/invites/send"
                        onClick={() => {
                          console.warn("[MEMBERS] Invite Member clicked", {
                            userId: user?.id,
                            organizationId: effectiveOrganizationId,
                          });
                        }}
                      >
                      <UserPlus className="mr-2 h-4 w-4" />
                      Invite Member
                    </Link>
                    </Button>
          ) : undefined
                }
              />
          ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Projects</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="w-[70px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allUsers.map((member) => {
                  const memberRole = allRoles.find(
                    (r) => r.id === member.roleId
                  );
                  const isCurrentUser = member.id === user?.id;

                  return (
                    <TableRow key={member.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarImage
                              src={member.avatar}
                              alt={member.name}
                            />
                            <AvatarFallback>
                              {member.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <Link href={`/members/${member.id}`} className="group block">
                              <p className="font-medium group-hover:underline">
                                {member.name}
                                {isCurrentUser && (
                                  <span className="ml-2 text-xs text-muted-foreground">
                                    (You)
                                  </span>
                                )}
                              </p>
                              <p className="text-sm text-muted-foreground group-hover:text-foreground/80">
                                {member.email}
                              </p>
                            </Link>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {(member as any).role
                          ? <RoleBadge role={(member as any).role} />
                          : memberRole
                            ? <RoleBadge role={memberRole} />
                            : <span className="text-xs text-muted-foreground">—</span>
                        }
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {(member.projectMemberships ?? [])
                          .map((m) => m.project?.name)
                          .filter(Boolean)
                          .join(", ") || "No project"}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${member.status === "active"
                            ? "bg-primary/10 text-primary dark:bg-primary/30 dark:text-primary"
                            : member.status === "pending"
                              ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                              : "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400"
                            }`}
                        >
                          {member.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(member.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {!isCurrentUser && (
                          <div className="flex items-center justify-end gap-2">
                            {can("members:update") && (
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Change Role"
                                onClick={() => {
                                  setSelectedMember(member);
                                  setIsRoleDialogOpen(true);
                                }}
                              >
                                <Shield className="h-4 w-4" />
                              </Button>
                            )}

                            {can("members:delete") && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                title="Remove Member"
                                onClick={() => {
                                  setSelectedMember(member);
                                  setIsDeleteDialogOpen(true);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            <div className="p-4 flex items-center justify-between border-t">
              <span className="text-sm text-muted-foreground">Showing {allUsers.length} of {totalMembers} users</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage(p => p - 1)} disabled={page === 1}>Previous</Button>
                <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page * limit >= totalMembers}>Next</Button>
              </div>
            </div>
          </div>
            )}
        </CardContent>
      </Card>
    </div>

      {/* Change Role Dialog */ }
  <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Change Member Role</DialogTitle>
        <DialogDescription>
          Select a new role for {selectedMember?.name}
        </DialogDescription>
      </DialogHeader>
      <div className="py-4">
        <Select
          defaultValue={selectedMember?.roleId}
          onValueChange={(value) =>
            selectedMember && handleChangeRole(selectedMember.id, value)
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a role" />
          </SelectTrigger>
          <SelectContent>
            {orgRoles.map((role) => (
              <SelectItem key={role.id} value={role.id}>
                <div className="flex flex-col">
                  <span>{role.name}</span>
                  {role.description && (
                    <span className="text-xs text-muted-foreground">
                      {role.description}
                    </span>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </DialogContent>
  </Dialog>

  {/* Remove Member Dialog */ }
  <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Remove Member</DialogTitle>
        <DialogDescription>
          Are you sure you want to remove {selectedMember?.name} from the
          organization? This action cannot be undone.
        </DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button
          variant="outline"
          onClick={() => setIsDeleteDialogOpen(false)}
        >
          Cancel
        </Button>
        <Button
          variant="destructive"
          onClick={() =>
            selectedMember && handleRemoveMember(selectedMember.id)
          }
        >
          Remove Member
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
    </DashboardLayout >
  );
}
