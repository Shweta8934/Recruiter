"use client";
import Script from "next/script";
import { useEffect, useMemo, useState, Suspense } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useAuth } from "@/hooks/useAuth";
import { usePermission } from "@/hooks/usePermission";
import { DashboardLayout } from "@/components/layout";
import { PageHeader } from "@/components/common";
import { SubscriptionCard } from "@/components/cards";
import { PlanBadge } from "@/components/rbac";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PLAN_FEATURES, PLAN_NAMES, PLAN_PRICING } from "@/lib/constants";
import { PlanTier } from "@/types";
import { CreditCard, Download, Check, ArrowRight, Calendar, Receipt, AlertTriangle } from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";
import { subscriptionActions } from "@/store/slices/subscriptionSlice";
import { RootState } from "@/store/rootReducer";
import Link from "next/link";
import { toast } from "sonner";

type DbPayment = {
  id: string;
  amount: number;
  status: "pending" | "succeeded" | "failed";
  description: string;
  createdAt: string;
  invoiceUrl?: string | null;
};

function SubscriptionPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { organization, user } = useAuth();
  const { can } = usePermission();
  const canUpdateBilling = can("billing:update") || user?.roleSlug === "billing";
  const [isUpgradeDialogOpen, setIsUpgradeDialogOpen] = useState(false);
  const [isSuccessDialogOpen, setIsSuccessDialogOpen] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PlanTier | null>(null);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [planTier, setPlanTier] = useState<PlanTier>("free");
  const [orgPayments, setOrgPayments] = useState<DbPayment[]>([]);
  const [orgOptions, setOrgOptions] = useState<{ id: string; name: string }[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>("");
  const [dbActorUserId, setDbActorUserId] = useState<string>("");
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const allPlans: PlanTier[] = ["free", "starter", "professional", "enterprise"];

  const dispatch = useDispatch();
  const subscriptionState = useSelector((state: RootState) => state.subscription);

  const currentPlanIndex = allPlans.indexOf(planTier);

  const effectiveOrganizationId = organization?.id || user?.organizationId || selectedOrgId || "";

  useEffect(() => {
    // If we have finished checking user and they have no org at all
    if (user && !organization?.id && !user?.organizationId && !selectedOrgId) {
      const intentPlan = searchParams.get("plan");
      if (intentPlan) {
        toast.info("Please create an organization first to continue with your subscription.");
        router.push(`/organizations/create?redirect=/subscription?plan=${intentPlan}`);
      }
    }
  }, [user, organization?.id, user?.organizationId, selectedOrgId, searchParams, router]);

  useEffect(() => {
    if (!effectiveOrganizationId) return;
    dispatch(subscriptionActions.loadSubscriptionDataRequest({
      organizationId: effectiveOrganizationId,
      resolve: (data) => {
        const slug = data.subData?.subscription?.plan?.slug;
        if (slug === "starter" || slug === "professional" || slug === "enterprise") setPlanTier(slug);
        else setPlanTier("free");

        setOrgPayments((data.payData?.payments ?? []) as any[]);
        setIsDataLoaded(true);
      }
    }));
  }, [effectiveOrganizationId, dispatch]);

  // Handle URL intent (e.g. from landing page)
  useEffect(() => {
    if (!isDataLoaded) return;

    const intentPlan = searchParams.get("plan");
    if (intentPlan) {
      if (allPlans.includes(intentPlan as PlanTier)) {
        if (intentPlan !== planTier && intentPlan !== "enterprise") {
          setSelectedPlan(intentPlan as PlanTier);
          setIsUpgradeDialogOpen(true);
        } else {
          console.warn(`[SUBSCRIPTION] Ignoring intent because user is already on ${intentPlan} or it's enterprise.`);
        }
        // Remove the plan param from URL so it doesn't trigger again on refresh
        router.replace("/subscription", { scroll: false });
      }
    }
  }, [isDataLoaded, planTier, searchParams, router, allPlans]);

  useEffect(() => {
    async function loadOrganizationsForSuperAdmin() {
      if (organization?.id || user?.organizationId) return;
      dispatch(subscriptionActions.loadOrganizationsRequest({
        resolve: (orgs) => {
          const items = orgs.map((o: any) => ({ id: o.id, name: o.name }));
          setOrgOptions(items);
          if (!selectedOrgId && items.length > 0) setSelectedOrgId(items[0].id);
        }
      }));
    }
    loadOrganizationsForSuperAdmin();
  }, [organization?.id, user?.organizationId, selectedOrgId, dispatch]);

  useEffect(() => {
    async function resolveDbActor() {
      if (!user?.email) return;
      dispatch(subscriptionActions.loadUsersRequest({
        resolve: (users) => {
          const matched = users.find(
            (u: any) => u.email?.toLowerCase() === user.email.toLowerCase()
          );
          if (matched?.id) setDbActorUserId(matched.id);
        }
      }));
    }
    resolveDbActor();
  }, [user?.email, dispatch]);

  useEffect(() => {
    const success = searchParams.get("success");
    const error = searchParams.get("error");
    const plan = searchParams.get("plan");

    if (success === "true" && plan) {
      toast.success(`Successfully upgraded to ${PLAN_NAMES[plan as PlanTier] || plan}!`);
      router.replace("/subscription");
    } else if (error === "payment_failed") {
      toast.error("Payment failed. Please try again.");
      router.replace("/subscription");
    }
  }, [searchParams, router]);

  const handleUpgrade = (newPlan: PlanTier) => {
    setSelectedPlan(newPlan);
    setIsUpgradeDialogOpen(true);
  };

  const confirmUpgrade = async () => {
    if (!selectedPlan) {
    toast.error("No plan selected");
    return;
  }
  if (!effectiveOrganizationId) {
    toast.error("Please create an organization first.");
    router.push("/organizations/create");
    return;
  }
  setIsPurchasing(true);
  const payload = {
    organizationId: effectiveOrganizationId,
    planSlug: selectedPlan,
    actorUserId: dbActorUserId || undefined,
  };

  dispatch(subscriptionActions.createCheckoutSessionRequest({
    payload,
    resolve: (data) => {
      // ─── BYPASS MODE ──────────────────────────────────────────────────────
      // RAZORPAY_BYPASS=true in .env → no popup, plan activates immediately
      if (data?.bypass) {
        dispatch(subscriptionActions.verifyRazorpayPaymentRequest({
          payload: {
            razorpay_payment_id: `bypass_pay_${Date.now()}`,
            razorpay_order_id: `bypass_ord_${Date.now()}`,
            razorpay_signature: 'bypass',
            organizationId: data.organizationId,
            planSlug: data.planSlug,
            actorUserId: data.actorUserId ?? undefined,
          },
          resolve: () => {
            setIsPurchasing(false);
            setIsUpgradeDialogOpen(false);
            setSelectedPlan(null);
            toast.success(`✅ ${PLAN_NAMES[data.planSlug as PlanTier] || data.planSlug} plan activated!`);
            dispatch(subscriptionActions.loadSubscriptionDataRequest({
              organizationId: effectiveOrganizationId,
              resolve: (data) => {
                const slug = data.subData?.subscription?.plan?.slug;
                if (slug === "starter" || slug === "professional" || slug === "enterprise") setPlanTier(slug);
                else setPlanTier("free");
                setOrgPayments((data.payData?.payments ?? []) as any[]);
              },
            }));
          },
          reject: (err) => {
            setIsPurchasing(false);
            toast.error('Plan activation failed: ' + err);
          },
        }));
        return;
      }
      // ─────────────────────────────────────────────────────────────────────

      setIsPurchasing(false);
      if (!data?.success || !data?.order_id) {
        toast.error(data?.error || "Failed to create checkout session");
        return;
      }

      setIsUpgradeDialogOpen(false);

      // ─── RAZORPAY SDK POPUP ───────────────────────────────────────────────
      // Opens the Razorpay checkout modal — works in both test and live mode.
      // Test mode: use dummy card 4111 1111 1111 1111, any future date, any CVV
      const rzpOptions = {
        key: data.key_id,
        amount: data.amount,
        currency: data.currency || 'INR',
        name: 'AI Recruitment Platform',
        description: `${data.planName || selectedPlan} Plan — Monthly Subscription`,
        order_id: data.order_id,
        prefill: {
          email: user?.email || '',
        },
        theme: { color: '#4370FF' },
        modal: {
          ondismiss: () => {
            toast.error('Payment cancelled.');
          },
        },
        handler: (response: any) => {
          // Payment succeeded — verify signature on backend
          dispatch(subscriptionActions.verifyRazorpayPaymentRequest({
            payload: {
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
              organizationId: effectiveOrganizationId,
              planSlug: selectedPlan!,
              actorUserId: dbActorUserId || undefined,
            },
            resolve: () => {
              setSelectedPlan(null);
              toast.success(`✅ ${PLAN_NAMES[selectedPlan as PlanTier]} plan activated!`);
              dispatch(subscriptionActions.loadSubscriptionDataRequest({
                organizationId: effectiveOrganizationId,
                resolve: (data) => {
                  const slug = data.subData?.subscription?.plan?.slug;
                  if (slug === "starter" || slug === "professional" || slug === "enterprise") setPlanTier(slug);
                  else setPlanTier("free");
                  setOrgPayments((data.payData?.payments ?? []) as any[]);
                },
              }));
            },
            reject: (err: any) => {
              toast.error('Payment verification failed. Contact support.');
              console.error('[SUBS] verify error', err);
            },
          }));
        },
      };

      const rzp = new (window as any).Razorpay(rzpOptions);
      rzp.on('payment.failed', (response: any) => {
        toast.error(`Payment failed: ${response.error?.description || 'Unknown error'}`);
        console.error('[RAZORPAY] Payment failed', response.error);
      });
      rzp.open();
      // ─────────────────────────────────────────────────────────────────────
    },
    reject: (err) => {
      setIsPurchasing(false);
      toast.error("Checkout failed. Please try again.");
      console.error("[SUBS] checkout exception", err);
    }
  }));
};

const handleCancelSubscription = () => {
  setIsCancelDialogOpen(false);
};

const summaryFeatures = useMemo(
  () => [
    `${PLAN_FEATURES[planTier].members === -1 ? "Unlimited" : PLAN_FEATURES[planTier].members} team members`,
    `${PLAN_FEATURES[planTier].projects === -1 ? "Unlimited" : PLAN_FEATURES[planTier].projects} projects`,
    `${PLAN_FEATURES[planTier].storage === -1 ? "Unlimited" : `${PLAN_FEATURES[planTier].storage / 1024}GB`} storage`,
    PLAN_FEATURES[planTier].customRoles ? "Custom roles" : "Standard roles",
    PLAN_FEATURES[planTier].advancedAnalytics ? "Advanced analytics" : "Basic analytics",
  ],
  [planTier]
);

return (
  <DashboardLayout>
    {/* Razorpay SDK — loads checkout popup, works in test & live mode */}
    <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
    <div className="space-y-6">
      <PageHeader title="Subscription" description="Manage your subscription plan and billing" />
      {!organization?.id && !user?.organizationId && (
        <Card>
          <CardHeader>
            <CardTitle>Choose Organization</CardTitle>
            <CardDescription>Select organization to manage subscription</CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
              <SelectTrigger className="max-w-md">
                <SelectValue placeholder="Select organization" />
              </SelectTrigger>
              <SelectContent>
                {orgOptions.map((o) => (
                  <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <SubscriptionCard
          planName={PLAN_NAMES[planTier]}
          price={PLAN_PRICING[planTier].displayMonthly}
          billingCycle="monthly"
          features={summaryFeatures}
          isCurrent
        />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">Current Plan Benefits</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {summaryFeatures.map((f, i) => (
              <p key={i} className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" />{f}</p>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Available Plans</CardTitle>
          <CardDescription>Choose the plan that best fits your team&apos;s needs</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {allPlans.map((tier, index) => {
              const isCurrentPlan = tier === planTier;
              const isUpgrade = index > currentPlanIndex;
              const pricing = PLAN_PRICING[tier];
              const features = PLAN_FEATURES[tier];
              const isEnterprise = tier === 'enterprise';

              return (
                <Card key={tier} className={`relative ${isCurrentPlan ? "border-primary ring-1 ring-primary" : ""} ${features.highlight && !isCurrentPlan ? "border-primary/40" : ""}`}>
                  {isCurrentPlan && <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">Current Plan</Badge>}
                  {features.highlight && !isCurrentPlan && (
                    <Badge variant="secondary" className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary/10 text-primary">Most Popular</Badge>
                  )}
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">{PLAN_NAMES[tier]} <PlanBadge plan={tier} /></CardTitle>
                    <CardDescription>
                      <span className="text-2xl font-bold text-foreground">{pricing.displayMonthly}</span>
                      {!isEnterprise && <span className="text-muted-foreground">/month</span>}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm">
                      {features.points.map((pt: string) => (
                        <li key={pt} className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500 shrink-0" />{pt}</li>
                      ))}
                    </ul>
                  </CardContent>
                  <CardFooter>
                    {isEnterprise ? (
                      <Button className="w-full" variant="outline" asChild>
                        <a href="/contact">Talk to Sales</a>
                      </Button>
                    ) : canUpdateBilling ? (
                      isCurrentPlan ? (
                        <Button className="w-full" disabled>Current Plan</Button>
                      ) : (
                        <Button className="w-full" variant={isUpgrade ? "default" : "outline"} onClick={() => handleUpgrade(tier)}>
                          {isUpgrade ? "Upgrade" : "Downgrade"}
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      )
                    ) : null}
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Receipt className="h-5 w-5" />Payment History</CardTitle>
          <CardDescription>Recent transactions and invoices</CardDescription>
        </CardHeader>
        <CardContent>
          {orgPayments.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No payment history yet</p>
          ) : (
            <div className="space-y-4">
              {orgPayments.slice(0, 5).map((payment) => (
                <div key={payment.id} className="flex items-center justify-between p-4 rounded-lg border">
                  <div className="flex items-center gap-4">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center ${payment.status === "succeeded" ? "bg-green-100" : payment.status === "pending" ? "bg-yellow-100" : "bg-red-100"}`}>
                      {payment.status === "succeeded" ? <Check className="h-5 w-5 text-green-600" /> : payment.status === "pending" ? <Calendar className="h-5 w-5 text-yellow-600" /> : <AlertTriangle className="h-5 w-5 text-red-600" />}
                    </div>
                    <div>
                      <p className="font-medium">{payment.description}</p>
                      <p className="text-sm text-muted-foreground">{new Date(payment.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-medium">${(payment.amount / 100).toFixed(2)}</p>
                      <Badge variant={payment.status === "succeeded" ? "default" : payment.status === "pending" ? "secondary" : "destructive"}>{payment.status}</Badge>
                    </div>
                    {payment.invoiceUrl && <Button variant="ghost" size="icon" asChild><a href={payment.invoiceUrl} target="_blank" rel="noopener noreferrer"><Download className="h-4 w-4" /></a></Button>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button variant="outline" asChild className="w-full">
            <Link href="/payments">View All Payments<ArrowRight className="ml-2 h-4 w-4" /></Link>
          </Button>
        </CardFooter>
      </Card>

      {canUpdateBilling && planTier !== "free" && (
        <Card className="border-destructive/50">
          <CardHeader><CardTitle className="text-destructive">Danger Zone</CardTitle><CardDescription>Cancel your subscription.</CardDescription></CardHeader>
          <CardContent><Button variant="destructive" onClick={() => setIsCancelDialogOpen(true)}>Cancel Subscription</Button></CardContent>
        </Card>
      )}
    </div>

    <Dialog open={isUpgradeDialogOpen} onOpenChange={setIsUpgradeDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {selectedPlan && allPlans.indexOf(selectedPlan) > currentPlanIndex ? "Confirm Upgrade" : "Confirm Downgrade"}
          </DialogTitle>
          <DialogDescription>
            {selectedPlan && allPlans.indexOf(selectedPlan) > currentPlanIndex ? (
              <>You are upgrading from <strong>{PLAN_NAMES[planTier]}</strong> to <strong>{PLAN_NAMES[selectedPlan]}</strong> plan for {PLAN_PRICING[selectedPlan].displayMonthly}/month.</>
            ) : (
              <>You are downgrading from <strong>{PLAN_NAMES[planTier]}</strong> to <strong>{selectedPlan ? PLAN_NAMES[selectedPlan] : ""}</strong> plan for {selectedPlan ? PLAN_PRICING[selectedPlan].displayMonthly : "₹0"}/month.</>
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsUpgradeDialogOpen(false)} disabled={isPurchasing}>Cancel</Button>
          <Button onClick={confirmUpgrade} disabled={isPurchasing}>{isPurchasing ? "Processing..." : "Pay & Activate"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog open={isSuccessDialogOpen} onOpenChange={setIsSuccessDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Purchase Successful</DialogTitle>
          <DialogDescription>Your new subscription is now active and saved to database.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={() => setIsSuccessDialogOpen(false)}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancel Subscription</DialogTitle>
          <DialogDescription>Are you sure you want to cancel?</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsCancelDialogOpen(false)}>Keep Subscription</Button>
          <Button variant="destructive" onClick={handleCancelSubscription}>Cancel Subscription</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </DashboardLayout>
);
}

export default function SubscriptionPage() {
  return (
    <Suspense fallback={null}>
      <SubscriptionPageContent />
    </Suspense>
  );
}
