"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useDispatch } from "react-redux";
import { organizationActions } from "@/store/slices/organizationSlice";
import { fetchProjectsRequest } from "@/store/slices/projectsSlice";
import { useAuth } from "@/hooks/useAuth";
import { usePermission } from "@/hooks/usePermission";
import { DashboardLayout } from "@/components/layout";
import { PageHeader } from "@/components/common";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Role } from "@/types";
import { ArrowLeft, Send, UserPlus } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

export default function SendInvitePage() {
  const router = useRouter();
  const { user } = useAuth();
  const { can, isSuperAdmin } = usePermission();
  const [emails, setEmails] = useState("");
  const [roleId, setRoleId] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orgRoles, setOrgRoles] = useState<Role[]>([]);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState(user?.organizationId || "");
  const [organizations, setOrganizations] = useState<
    { id: string; name: string }[]
  >([]);
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [projectId, setProjectId] = useState("");

  const dispatch = useDispatch();



  const effectiveOrganizationId = isSuperAdmin ? selectedOrganizationId : (user?.organizationId || selectedOrganizationId);
  const isHrUser = user?.roleSlug === "hr";
  const selectedOrganization = organizations.find(
    (org) => org.id === effectiveOrganizationId
  );

  useEffect(() => {
    async function loadRoles() {
      if (!effectiveOrganizationId) return;
      dispatch(organizationActions.loadRolesRequest({
        organizationId: effectiveOrganizationId,
        resolve: (data: any) => {
          let filtered = (data.roles || []) as Role[];
          if (filtered.length === 0) {
            dispatch(organizationActions.loadRolesRequest({
              resolve: (fallbackData: any) => {
                filtered = (fallbackData.roles || []).filter(
                  (r: Role) =>
                    r.organizationId === effectiveOrganizationId ||
                    r.isSystem ||
                    r.organizationId == null
                );
                setOrgRoles(filtered);
              }
            }));
          } else {
            setOrgRoles(filtered);
          }
        }
      }));
    }
    async function loadProjects() {
      if (!effectiveOrganizationId) return;
      dispatch(fetchProjectsRequest({
        organizationId: effectiveOrganizationId,
        requesterUserId: user?.id ?? "",
        resolve: (data) => {
          const mapped = data.map((p: any) => ({ id: p.id, name: p.name }));
          setProjects(mapped);
        }
      }));
    }
    async function loadOrganizations() {
      if (user?.organizationId && !isSuperAdmin) return;
      dispatch(organizationActions.loadOrganizationsRequest({
        resolve: (rows) => {
          setOrganizations(rows);
          if (!selectedOrganizationId && rows[0]?.id) {
            setSelectedOrganizationId(rows[0].id);
          }
        }
      }));
    }
    loadOrganizations();
    loadRoles();
    loadProjects();
  }, [effectiveOrganizationId, selectedOrganizationId, user?.organizationId, user?.id, dispatch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!effectiveOrganizationId) {
      toast.error("Please select an organization first");
      return;
    }
    if (isHrUser && !projectId) {
      toast.error("Please select a project");
      return;
    }
    setIsSubmitting(true);

    // Parse emails
    const emailList = emails
      .split(/[,\n]/)
      .map((e) => e.trim())
      .filter((e) => e.length > 0);



    dispatch(organizationActions.sendInviteRequest({
      payload: {
        emails: emailList,
        roleId,
        message,
        organizationId: effectiveOrganizationId,
        invitedBy: user?.id,
        inviterEmail: user?.email,
        projectId: projectId || undefined,
      },
      resolve: () => {
        const redirectPath = can("invites:view") ? "/invites" : "/members";
        router.push(redirectPath);
      },
      reject: (err) => {
        toast.error(err ?? "Failed to send invites");
        setIsSubmitting(false);
      }
    }));
  };

  const emailList = emails
    .split(/[,\n]/)
    .map((e) => e.trim())
    .filter((e) => e.length > 0);

  const exceedsLimit = false;

  return (
    <DashboardLayout>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild type="button">
            <Link href="/invites">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <PageHeader
            title="Send Invitations"
            description="Invite new members to your organization"
          >
            <Button
              type="submit"
              disabled={
                emailList.length === 0 ||
                !roleId ||
                isSubmitting ||
                exceedsLimit
              }
            >
              <Send className="mr-2 h-4 w-4" />
              {isSubmitting
                ? "Sending..."
                : `Send ${emailList.length > 1 ? `${emailList.length} Invites` : "Invite"}`}
            </Button>
          </PageHeader>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Email Input */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Invite Details
              </CardTitle>
              <CardDescription>
                Enter email addresses and select a role for the new members
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="emails">Email Addresses *</Label>
                <Textarea
                  id="emails"
                  placeholder="Enter email addresses, separated by commas or new lines..."
                  value={emails}
                  onChange={(e) => setEmails(e.target.value)}
                  rows={5}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  {emailList.length} email{emailList.length !== 1 ? "s" : ""}{" "}
                  entered
                </p>
              </div>

              <div className="space-y-2">
                {(!user?.organizationId || isSuperAdmin) && (
                  <>
                    <Label>Organization *</Label>
                    <Select
                      value={selectedOrganizationId}
                      onValueChange={setSelectedOrganizationId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select organization" />
                      </SelectTrigger>
                      <SelectContent>
                        {organizations.map((org) => (
                          <SelectItem key={org.id} value={org.id}>
                            {org.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Role *</Label>
                <Select value={roleId} onValueChange={setRoleId} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    {orgRoles.map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {orgRoles.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    No roles found for selected organization.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="project">Project {isHrUser ? "*" : "(Optional)"}</Label>
                <Select value={projectId} onValueChange={setProjectId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select project (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Personal Message (Optional)</Label>
                <Textarea
                  id="message"
                  placeholder="Add a personal message to the invitation email..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Preview */}
          <Card>
            <CardHeader>
              <CardTitle>Preview</CardTitle>
              <CardDescription>
                How the invitation email will look
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg p-4 bg-muted/30">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <span className="text-lg font-bold text-primary">
                        {selectedOrganization?.name?.charAt(0) || "O"}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold">
                        {selectedOrganization?.name || "Your Organization"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Team Invitation
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm">
                      <strong>{user?.name || "Someone"}</strong> has invited
                      you to join{" "}
                      <strong>
                        {selectedOrganization?.name || "their organization"}
                      </strong>
                      {roleId && (
                        <>
                          {" "}
                          as a{" "}
                          <strong>
                            {orgRoles.find((r) => r.id === roleId)?.name ||
                              "team member"}
                          </strong>
                        </>
                      )}
                      .
                    </p>

                    {message && (
                      <div className="bg-background rounded p-3 border">
                        <p className="text-sm italic text-muted-foreground">
                          &quot;{message}&quot;
                        </p>
                      </div>
                    )}
                  </div>

                  <Button className="w-full" disabled>
                    Accept Invitation
                  </Button>

                  <p className="text-xs text-muted-foreground text-center">
                    This invitation will expire in 7 days
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </form>
    </DashboardLayout>
  );
}
