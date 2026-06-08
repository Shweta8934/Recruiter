"use client";

import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useAuth } from "@/hooks/useAuth";
import { usePermission } from "@/hooks/usePermission";
import { DashboardLayout } from "@/components/layout";
import { PageHeader, EmptyState } from "@/components/common";
import { RoleBadge, PermissionGate } from "@/components/rbac";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { Role, User } from "@/types";
import { Invite } from "@/types";
import {
  Search,
  MoreHorizontal,
  UserPlus,
  Mail,
  Copy,
  Trash2,
  RefreshCw,
  Clock,
  CheckCircle,
  XCircle
} from "lucide-react";
import Link from "next/link";
import { organizationActions } from "@/store/slices/organizationSlice";
import { RootState } from "@/store/rootReducer";
import { toast } from "sonner";

export default function InvitesPage() {
  const { organization, user } = useAuth();
  const { can } = usePermission();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedInvite, setSelectedInvite] = useState<Invite | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [allInvites, setAllInvites] = useState<Invite[]>([]);
  const [allRoles, setAllRoles] = useState<Role[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState("");

  const dispatch = useDispatch();
  const organizationState = useSelector((state: RootState) => state.organization);

  const effectiveOrganizationId =
    organization?.id || user?.organizationId || selectedOrganizationId;

  useEffect(() => {
    if (!effectiveOrganizationId) return;
    dispatch(organizationActions.loadInvitesRequest({
      organizationId: effectiveOrganizationId,
      requesterUserId: user?.id ?? "",
      resolve: (data: any) => setAllInvites(data || [])
    }));
    dispatch(organizationActions.loadRolesRequest({
      organizationId: effectiveOrganizationId,
      resolve: (data: any) => setAllRoles(data.roles || [])
    }));
    dispatch(organizationActions.loadUsersRequest({
      organizationId: effectiveOrganizationId,
      requesterUserId: user?.id ?? "",
      resolve: (data: any) => setAllUsers(data.users || [])
    }));
  }, [effectiveOrganizationId, user?.id, dispatch]);

  useEffect(() => {
    async function loadOrganizationsIfNeeded() {
      if (organization?.id || user?.organizationId) return;
      dispatch(organizationActions.loadOrganizationsRequest({
        resolve: (data) => {
          const firstId = data?.[0]?.id as string | undefined;
          if (firstId && !selectedOrganizationId) setSelectedOrganizationId(firstId);
        }
      }));
    }
    loadOrganizationsIfNeeded();
  }, [organization?.id, user?.organizationId, selectedOrganizationId, dispatch]);

  // Filter invites by organization
  const orgInvites = allInvites.filter(
    (i) => i.organizationId === effectiveOrganizationId
  );

  // Apply search filter
  const filteredInvites = orgInvites.filter((invite) =>
    invite.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group by status
  const pendingInvites = filteredInvites.filter((i) => i.status === "pending");
  const acceptedInvites = filteredInvites.filter((i) => i.status === "accepted");
  const expiredInvites = filteredInvites.filter((i) => i.status === "expired");

  const handleResendInvite = (invite: Invite) => {
    dispatch(organizationActions.updateInviteRequest({
      inviteId: invite.id,
      payload: { resend: true, actorUserId: user?.id ?? "" },
      resolve: (data: any) => {
        setAllInvites((prev) => prev.map((i) => (i.id === invite.id ? data.invite : i)));
        toast.success(`Invitation resent successfully to ${invite.email}`);
      },
      reject: (err: string) => {
        toast.error(err ?? "Failed to resend invitation");
      }
    }));
  };

  const handleCopyLink = (invite: Invite) => {
    const link = `${window.location.origin}/invite/accept/${invite.token}`;
    navigator.clipboard.writeText(link);
    toast.success("Invitation link copied to clipboard");
  };

  const handleDeleteInvite = () => {
    if (selectedInvite?.id) {
      dispatch(organizationActions.revokeInviteRequest({
        inviteId: selectedInvite.id,
        actorUserId: user?.id ?? "",
        resolve: () => {
          setAllInvites((prev) => prev.filter((i) => i.id !== selectedInvite?.id));
          setIsDeleteDialogOpen(false);
          setSelectedInvite(null);
          toast.success("Invitation revoked successfully");
        },
        reject: (err: string) => {
          toast.error(err ?? "Failed to revoke invitation");
        }
      }));
    } else {
      setIsDeleteDialogOpen(false);
      setSelectedInvite(null);
    }
  };

  const getStatusIcon = (status: Invite["status"]) => {
    switch (status) {
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case "accepted":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "expired":
      case "cancelled":
        return <XCircle className="h-4 w-4 text-red-600" />;
    }
  };

  const getStatusBadgeVariant = (status: Invite["status"]) => {
    switch (status) {
      case "pending":
        return "secondary" as const;
      case "accepted":
        return "default" as const;
      case "expired":
      case "cancelled":
        return "destructive" as const;
    }
  };

  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="Team Invitations"
          description="Manage invitations to your organization"
        >
          <PermissionGate permissions={["invites:create"]}>
            <Button asChild>
              <Link href="/invites/send">
                <UserPlus className="mr-2 h-4 w-4" />
                Send Invite
              </Link>
            </Button>
          </PermissionGate>
        </PageHeader>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Pending
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-yellow-600">
                {pendingInvites.length}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Accepted
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600">
                {acceptedInvites.length}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Expired
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-red-600">
                {expiredInvites.length}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Invites Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              All Invitations ({filteredInvites.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Search */}
            <div className="mb-6">
              <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Table */}
            {filteredInvites.length === 0 ? (
              <EmptyState
                icon={Mail}
                title="No invitations found"
                description={
                  searchQuery
                    ? "Try adjusting your search"
                    : "Send invites to grow your team"
                }
                action={
                  can("invites:create") ? (
                    <Button asChild>
                      <Link href="/invites/send">
                        <UserPlus className="mr-2 h-4 w-4" />
                        Send Invite
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
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Invited By</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead className="w-[70px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInvites.map((invite) => {
                      const role = allRoles.find((r) => r.id === invite.roleId);
                      const inviter = allUsers.find(
                        (u) => u.id === invite.invitedBy
                      );
                      const expired = isExpired(invite.expiresAt);

                      return (
                        <TableRow key={invite.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center">
                                <Mail className="h-4 w-4 text-muted-foreground" />
                              </div>
                              <span className="font-medium">{invite.email}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {role && <RoleBadge role={role} />}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {inviter?.name || "Unknown"}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getStatusIcon(
                                expired && invite.status === "pending"
                                  ? "expired"
                                  : invite.status
                              )}
                              <Badge
                                variant={getStatusBadgeVariant(
                                  expired && invite.status === "pending"
                                    ? "expired"
                                    : invite.status
                                )}
                              >
                                {expired && invite.status === "pending"
                                  ? "Expired"
                                  : invite.status}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {new Date(invite.expiresAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            {invite.status === "pending" && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreHorizontal className="h-4 w-4" />
                                    <span className="sr-only">Actions</span>
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={() => handleCopyLink(invite)}
                                  >
                                    <Copy className="mr-2 h-4 w-4" />
                                    Copy Link
                                  </DropdownMenuItem>
                                  {can("invites:update") && (
                                    <DropdownMenuItem
                                      onClick={() => handleResendInvite(invite)}
                                    >
                                      <RefreshCw className="mr-2 h-4 w-4" />
                                      Resend Invite
                                    </DropdownMenuItem>
                                  )}
                                  {can("invites:delete") && (
                                    <DropdownMenuItem
                                      className="text-destructive"
                                      onClick={() => {
                                        setSelectedInvite(invite);
                                        setIsDeleteDialogOpen(true);
                                      }}
                                    >
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Revoke Invite
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Delete/Revoke Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke Invitation</DialogTitle>
            <DialogDescription>
              Are you sure you want to revoke the invitation for{" "}
              <strong>{selectedInvite?.email}</strong>? They will no longer be
              able to join your organization with this invite link.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteInvite}>
              Revoke Invitation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
