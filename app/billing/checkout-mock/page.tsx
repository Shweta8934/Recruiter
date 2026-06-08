"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { subscriptionActions } from "@/store/slices/subscriptionSlice";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Shield, CreditCard, Lock, CheckCircle2, XCircle, Info, RefreshCw } from "lucide-react";
import { BackButton } from "@/components/common";
import { PLAN_NAMES, PLAN_PRICING } from "@/lib/constants";
import { PlanTier } from "@/types";

export default function MockCheckoutPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const sessionId = searchParams.get("session_id") || "mock_session";
  const planSlug = (searchParams.get("planSlug") || "starter") as PlanTier;
  const organizationId = searchParams.get("organizationId") || "";
  const actorUserId = searchParams.get("actorUserId") || "";

  const [email, setEmail] = useState("");
  const [cardNumber, setCardNumber] = useState("4242 •••• •••• 4242");
  const [expiry, setExpiry] = useState("12 / 29");
  const [cvc, setCvc] = useState("424");
  const [cardName, setCardName] = useState("Jane Doe");

  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("");

  const planName = PLAN_NAMES[planSlug] || "Starter";
  const planPrice = PLAN_PRICING[planSlug]?.monthly || 29;
  const dispatch = useDispatch();

  useEffect(() => {
    function loadMockUser() {
      dispatch(subscriptionActions.loadUsersRequest({
        resolve: (users) => {
          if (users && users.length > 0) {
            const user = users.find((u: any) => u.id === actorUserId) || users[0];
            setEmail(user.email || "billing@company.com");
            setCardName(user.name || "Jane Doe");
          }
        },
        reject: (err) => {
          console.error("Failed to load mock user email", err);
        }
      }));
    }
    loadMockUser();
  }, [actorUserId, dispatch]);

  const triggerWebhook = async (status: "succeeded" | "failed") => {
    setLoading(true);
    setLoadingText(status === "succeeded" ? "Authorizing with Stripe..." : "Declining transaction...");

    try {
      const isSuccess = status === "succeeded";
      const webhookPayload = {
        id: `evt_mock_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        object: "event",
        api_version: "2023-10-16",
        created: Math.floor(Date.now() / 1000),
        type: isSuccess ? "checkout.session.completed" : "invoice.payment_failed",
        data: {
          object: {
            id: sessionId,
            customer_email: email || "customer@example.com",
            amount_total: planPrice * 100,
            currency: "usd",
            payment_status: isSuccess ? "paid" : "unpaid",
            status: isSuccess ? "complete" : "open",
            metadata: {
              organizationId,
              planSlug,
              actorUserId,
              simulated: "true",
            },
          },
        },
      };

      dispatch(subscriptionActions.simulateWebhookRequest({
        payload: webhookPayload,
        resolve: (data) => {
          if (!data.success) {
            toast.error(data.error || "Webhook dispatch returned error status");
            setLoading(false);
            return;
          }
          setTimeout(() => {
            setLoading(false);
            if (isSuccess) {
              router.push(`/subscription?success=true&plan=${planSlug}`);
            } else {
              router.push(`/subscription?error=payment_failed`);
            }
          }, 1000);
        },
        reject: (err) => {
          toast.error("Failed to simulate webhook processing. Check server logs.");
          setLoading(false);
        }
      }));
    } catch (err) {
      toast.error("Failed to simulate webhook processing. Check server logs.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4 antialiased">
      <div className="absolute top-0 left-0 right-0 bg-primary/10 border-b border-primary/20 text-primary py-2.5 px-4 text-center text-xs flex items-center justify-center gap-2 z-50">
        <Info className="h-4 w-4 shrink-0" />
        <span>You are in <strong>Stripe Test Mode</strong>. No real money will be charged. Click below to simulate checkout reactions.</span>
      </div>

      <div className="w-full max-w-5xl grid md:grid-cols-12 gap-8 items-stretch pt-8 mt-12">
        {/* Left Side: Summary & Branding */}
        <div className="md:col-span-5 flex flex-col justify-between p-6 bg-card text-card-foreground rounded-3xl border shadow-sm">
          <div>
            <BackButton
              label="Back to Application"
              className="mb-8 -ml-2 text-muted-foreground hover:text-foreground"
            />

            <div className="flex items-center gap-2 mb-6">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center font-bold text-primary-foreground shadow-sm">
                S
              </div>
              <span className="font-bold text-lg tracking-tight">SaaS RBAC Starter</span>
            </div>

            <div className="space-y-1">
              <span className="text-muted-foreground text-sm font-medium">Subscribe to</span>
              <h2 className="text-3xl font-extrabold tracking-tight">{planName} Plan</h2>
              <div className="flex items-baseline gap-1 mt-4">
                <span className="text-4xl font-extrabold">${planPrice}</span>
                <span className="text-muted-foreground text-sm">per month</span>
              </div>
            </div>

            <div className="mt-8 space-y-4 pt-6 border-t text-sm text-muted-foreground">
              <div className="flex justify-between">
                <span>{planName} Plan (Monthly)</span>
                <span>${planPrice}.00</span>
              </div>
              <div className="flex justify-between font-medium">
                <span>Tax</span>
                <span>$0.00</span>
              </div>
              <div className="flex justify-between font-semibold text-foreground pt-2 border-t border-dashed text-base">
                <span>Total due today</span>
                <span>${planPrice}.00</span>
              </div>
            </div>
          </div>

          <div className="mt-12 space-y-2.5 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5 font-medium text-primary">
              <Shield className="h-3.5 w-3.5" />
              <span>Guaranteed safe checkout</span>
            </div>
            <p>Your subscription will renew automatically every month. You can cancel at any time in the portal.</p>
          </div>
        </div>

        {/* Right Side: Payment Form & Webhook Dispatchers */}
        <div className="md:col-span-7 flex flex-col gap-6">
          <Card className="rounded-3xl shadow-lg border">
            <CardHeader className="border-b bg-muted/30 pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-primary" /> Payment details
                </CardTitle>
                <Badge variant="outline" className="text-primary border-primary/30 flex gap-1 items-center py-0.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse"></span>
                  Test Mode
                </Badge>
              </div>
              <CardDescription>
                Fill the simulated payment form below. Use any mock details.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 pt-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="font-semibold">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="space-y-4">
                <Label className="font-semibold">Card information</Label>
                <div className="rounded-lg border bg-background overflow-hidden divide-y">
                  <div className="p-3">
                    <Input
                      placeholder="Card number"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      className="border-0 p-0 h-auto bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none font-mono"
                    />
                  </div>
                  <div className="grid grid-cols-2 divide-x">
                    <div className="p-3">
                      <Input
                        placeholder="MM / YY"
                        value={expiry}
                        onChange={(e) => setExpiry(e.target.value)}
                        className="border-0 p-0 h-auto bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none font-mono"
                      />
                    </div>
                    <div className="p-3">
                      <Input
                        placeholder="CVC"
                        value={cvc}
                        onChange={(e) => setCvc(e.target.value)}
                        className="border-0 p-0 h-auto bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name" className="font-semibold">Cardholder name</Label>
                <Input
                  id="name"
                  placeholder="Jane Doe"
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value)}
                />
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-3 pb-6 pt-2 border-t bg-muted/10">
              {loading ? (
                <Button className="w-full py-6 flex items-center justify-center gap-2 cursor-not-allowed opacity-90 rounded-xl" disabled>
                  <RefreshCw className="h-5 w-5 animate-spin" />
                  {loadingText}
                </Button>
              ) : (
                <div className="w-full flex flex-col sm:flex-row gap-3">
                  <Button
                    onClick={() => triggerWebhook("succeeded")}
                    className="flex-1 py-6 rounded-xl flex items-center justify-center gap-2 shadow-md"
                  >
                    <CheckCircle2 className="h-5 w-5" />
                    Authorize Success Payment
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => triggerWebhook("failed")}
                    className="sm:max-w-[200px] flex-1 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20 py-6 rounded-xl flex items-center justify-center gap-2"
                  >
                    <XCircle className="h-5 w-5" />
                    Simulate Decline
                  </Button>
                </div>
              )}

              <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground mt-2">
                <Lock className="h-3 w-3 text-primary" />
                <span>Payments are simulated securely using mock Stripe protocols</span>
              </div>
            </CardFooter>
          </Card>

          <div className="p-5 bg-primary/5 rounded-2xl border border-primary/10 flex gap-4 text-xs text-primary/80">
            <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div className="space-y-1 leading-relaxed">
              <span className="font-bold text-primary">How this simulation works:</span>
              <p>When you click <strong>"Authorize Success Payment"</strong>, the browser calls your mock Stripe Webhook Endpoint at <code>/api/webhooks/stripe</code> with a simulated Stripe <code>checkout.session.completed</code> event payload. The endpoint updates your Prisma subscription table and payment ledger dynamically.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
