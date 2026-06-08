"use client";

import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { authActions } from '@/store/slices/authSlice';
import { organizationActions } from '@/store/slices/organizationSlice';
import { RootState } from '@/store/rootReducer';
import { useRouter, useParams } from 'next/navigation';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle, 
  XCircle, 
  Clock,
  Building2,
  Users,
  Shield,
  ArrowRight,
  Eye,
  EyeOff
} from "lucide-react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const acceptSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  password: z.string()
    .min(12, 'Password must be at least 12 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
});

type AcceptFormData = z.infer<typeof acceptSchema>;

export default function AcceptInvitePage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;
  const dispatch = useDispatch();
  
  const [isDeclined, setIsDeclined] = useState(false);
  const [isAccepted, setIsAccepted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [invite, setInvite] = useState<any>(null);
  const [organization, setOrganization] = useState<any>(null);
  const [role, setRole] = useState<any>(null);
  const [inviter, setInviter] = useState<any>(null);
  const [inviteLoading, setInviteLoading] = useState(true);
  const [acceptError, setAcceptError] = useState<string | null>(null);
  const isSubmitting = useSelector((state: RootState) => state.auth.isLoading);

  // Fallback to fetch invite info initially since we don't have an auth state yet (user isn't logged in)
  useEffect(() => {
    function loadInvite() {
      dispatch(organizationActions.loadInviteByTokenRequest({
        token,
        resolve: (data) => {
          setInvite(data.invite ?? null);
          setOrganization(data.organization ?? null);
          setRole(data.role ?? null);
          setInviter(data.inviter ?? null);
          setInviteLoading(false);
        },
        reject: () => {
          setInvite(null);
          setInviteLoading(false);
        }
      }));
    }
    loadInvite();
  }, [token, dispatch]);

  const isExpired = invite ? new Date(invite.expiresAt) < new Date() : false;

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<AcceptFormData>({
    resolver: zodResolver(acceptSchema),
    defaultValues: { name: "", password: "" },
  });

  const passwordValue = watch('password') || ''
  const requirements = [
    { label: 'At least 12 characters', met: passwordValue.length >= 12 },
    { label: 'One uppercase letter', met: /[A-Z]/.test(passwordValue) },
    { label: 'One lowercase letter', met: /[a-z]/.test(passwordValue) },
    { label: 'One number', met: /[0-9]/.test(passwordValue) },
    { label: 'One special character', met: /[^A-Za-z0-9]/.test(passwordValue) }
  ]

  const onSubmit = async (data: AcceptFormData) => {
    setAcceptError(null);
    dispatch(authActions.acceptInviteRequest({
      token,
      payload: { name: data.name, password: data.password, email: invite?.email },
      resolve: (dashboardRoute?: string) => {
        if (dashboardRoute) {
          // Auto-login succeeded — redirect directly to dashboard
          toast.success(`Welcome aboard! Redirecting to your dashboard...`);
          router.push(dashboardRoute);
        } else {
          // Fallback: auto-login failed, ask to log in manually
          toast.success('Account setup successful. Please log in.');
          setIsAccepted(true);
        }
      },
      reject: (error: string) => {
        setAcceptError(error || 'Failed to accept invite');
        toast.error(error || 'Failed to accept invite');
      }
    }));
  };

  const handleDecline = () => {
    if (!invite?.id) return;
    dispatch(organizationActions.declineInviteRequest({
      inviteId: invite.id,
      resolve: () => setIsDeclined(true),
      reject: () => toast.error('Failed to decline invite')
    }));
  };

  if (inviteLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Loading Invitation...</CardTitle>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Invalid or not found
  if (!invite) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <XCircle className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle>Invalid Invitation</CardTitle>
            <CardDescription>
              This invitation link is invalid or has been revoked.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button asChild className="w-full">
              <Link href="/login">Go to Login</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Expired
  if (isExpired) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-amber-500/10 flex items-center justify-center">
              <Clock className="h-6 w-6 text-amber-500" />
            </div>
            <CardTitle>Invitation Expired</CardTitle>
            <CardDescription>
              This invitation has expired. Please contact the organization admin
              for a new invitation.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center text-sm text-muted-foreground">
              <p>
                Organization: <strong>{organization?.name}</strong>
              </p>
              <p>
                Expired on:{" "}
                <strong>
                  {new Date(invite.expiresAt).toLocaleDateString()}
                </strong>
              </p>
            </div>
          </CardContent>
          <CardFooter>
            <Button asChild className="w-full">
              <Link href="/login">Go to Login</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Already accepted
  if (invite.status === "accepted" || isAccepted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-green-500" />
            </div>
            <CardTitle>
              {isAccepted ? "Welcome Aboard!" : "Invitation Accepted"}
            </CardTitle>
            <CardDescription>
              {isAccepted
                ? `You're now a member of ${organization?.name}!`
                : "This invitation has already been accepted."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-lg border">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{organization?.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {organization?.industry}
                  </p>
                </div>
              </div>

              {role && (
                <div className="flex items-center gap-3 p-3 rounded-lg border">
                  <div
                    className="h-10 w-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${role.color}20` }}
                  >
                    <Shield className="h-5 w-5" style={{ color: role.color }} />
                  </div>
                  <div>
                    <p className="font-medium">Your Role: {role.name}</p>
                    {role.description && (
                      <p className="text-sm text-muted-foreground">
                        {role.description}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter>
            <Button asChild className="w-full">
              <Link href="/login">
                Continue to Dashboard
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Declined
  if (isDeclined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-muted flex items-center justify-center">
              <XCircle className="h-6 w-6 text-muted-foreground" />
            </div>
            <CardTitle>Invitation Declined</CardTitle>
            <CardDescription>
              You&apos;ve declined the invitation to join {organization?.name}.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button asChild variant="outline" className="w-full">
              <Link href="/">Go to Home</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Valid invitation - show accept/decline
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 rounded-xl bg-primary/10 flex items-center justify-center">
            <span className="text-2xl font-bold text-primary">
              {organization?.name?.charAt(0) || "O"}
            </span>
          </div>
          <CardTitle className="text-xl">
            You&apos;ve been invited to join
          </CardTitle>
          <CardDescription className="text-lg font-semibold text-foreground">
            {organization?.name}
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={invite?.email || ""} disabled className="bg-muted" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Your Name</Label>
              <Input id="name" {...register("name")} />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Set Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  className="pr-10"
                  {...register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors focus:outline-none"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {/* Live Password Checklist */}
              <div className="mt-2 flex flex-col gap-1">
                {requirements.map((req, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className={`h-1.5 w-1.5 rounded-full ${req.met ? 'bg-green-500' : 'bg-muted-foreground/30'}`} />
                    <span className={`text-xs ${req.met ? 'text-green-600 dark:text-green-500 font-medium' : 'text-muted-foreground'}`}>
                      {req.label}
                    </span>
                  </div>
                ))}
              </div>
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>
            {acceptError && <p className="text-sm text-destructive">{acceptError}</p>}

            {/* Organization Info */}
            <div className="flex items-center gap-3 p-3 rounded-lg border">
              <Building2 className="h-5 w-5 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm font-medium">Organization</p>
                <p className="text-sm text-muted-foreground">
                  {organization?.industry} •{" "}
                  {organization?.size?.replace("_", "-")} employees
                </p>
              </div>
            </div>

            {/* Role */}
            {role && (
              <div className="flex items-center gap-3 p-3 rounded-lg border">
                <Shield className="h-5 w-5" style={{ color: role.color }} />
                <div className="flex-1">
                  <p className="text-sm font-medium">Your Role</p>
                  <div className="flex items-center gap-2">
                    <Badge
                      style={{
                        backgroundColor: `${role.color}20`,
                        color: role.color,
                      }}
                    >
                      {role.name}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {role.permissions.length} permissions
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Invited by */}
            {inviter && (
              <div className="flex items-center gap-3 p-3 rounded-lg border">
                <Users className="h-5 w-5 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Invited by</p>
                  <p className="text-sm text-muted-foreground">{inviter.name}</p>
                </div>
              </div>
            )}

            {/* Expiry */}
            <div className="flex items-center gap-3 p-3 rounded-lg border">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm font-medium">Expires</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(invite.expiresAt).toLocaleDateString()} at{" "}
                  {new Date(invite.expiresAt).toLocaleTimeString()}
                </p>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={handleDecline}
              disabled={isSubmitting}
            >
              Decline
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Accepting..." : "Accept Invitation"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
