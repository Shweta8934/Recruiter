"use client";

import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { subscriptionActions } from "@/store/slices/subscriptionSlice";
import { RootState } from "@/store/rootReducer";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/common";
import { DashboardCard } from "@/components/cards";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Receipt, TrendingUp, DollarSign, ArrowRight, Download, Sparkles, Check, Calendar, AlertTriangle } from "lucide-react";
import { PlanBadge } from "@/components/rbac";
import { format } from "date-fns";

type DbPayment = {
  id: string;
  amount: number;
  status: "succeeded" | "pending" | "failed";
  description: string;
  createdAt: string;
  invoiceUrl?: string | null;
};

type DbPlan = {
  name: string;
  slug: string;
  price: number;
  billingCycle: string;
};

export default function BillingDashboardPage() {
  const { user } = useAuth();
  const dispatch = useDispatch();
  const [payments, setPayments] = useState<DbPayment[]>([]);
  const [plan, setPlan] = useState<DbPlan | null>(null);
  const orgId = user?.organizationId;

  useEffect(() => {
    if (!orgId) return;
    dispatch(subscriptionActions.loadSubscriptionDataRequest({
      organizationId: orgId,
      resolve: (data) => {
        setPayments((data.payments ?? []) as DbPayment[]);
        setPlan((data.subscription?.plan ?? null) as DbPlan | null);
      }
    }));
  }, [orgId, dispatch]);

  const recentPayments = useMemo(() => payments.slice(0, 5), [payments]);
  const totalSpent = useMemo(
    () => payments.filter((p) => p.status === "succeeded").reduce((sum, p) => sum + p.amount, 0),
    [payments]
  );
  const monthlyCost = plan ? (plan.price / 100).toFixed(2) : "0.00";

  if (!orgId) {
    return (
      <div className="p-6 text-sm text-muted-foreground">No organization assigned.</div>
    );
  }

  return (
    <div className="space-y-6">
        <PageHeader title="Billing Dashboard" description="Manage your subscription and payment details">
          <Link href="/subscription">
            <Button>
              <Sparkles className="mr-2 h-4 w-4" />
              Manage Plan
            </Button>
          </Link>
        </PageHeader>

        <Card>
          <CardContent className="flex items-center justify-between p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
                <CreditCard className="h-7 w-7 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold">{plan?.name || "Free"} Plan</h3>
                  <PlanBadge plan={(plan?.slug as any) || "free"} />
                </div>
                <p className="text-sm text-muted-foreground">
                  ${monthlyCost}/{plan?.billingCycle === "yearly" ? "year" : "month"}
                </p>
              </div>
            </div>
            <Link href="/subscription">
              <Button>
                Upgrade <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <DashboardCard title="Current Plan" value={plan?.name || "Free"} description="Active subscription" icon={CreditCard} />
          <DashboardCard title="Monthly Cost" value={`$${monthlyCost}`} description="Per billing cycle" icon={DollarSign} />
          <DashboardCard title="Total Payments" value={payments.length} description="All time" icon={Receipt} />
          <DashboardCard title="Total Spent" value={`$${(totalSpent / 100).toFixed(2)}`} description="All time" icon={TrendingUp} />
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Payment History</CardTitle>
              <CardDescription>Recent transactions</CardDescription>
            </div>
            <Button variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </CardHeader>
          <CardContent>
            {recentPayments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No payment history yet</div>
            ) : (
              <div className="space-y-4">
                {recentPayments.map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between rounded-lg border p-4">
                    <div className="flex items-center gap-4">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${payment.status === "succeeded" ? "bg-primary/10" : payment.status === "pending" ? "bg-yellow-100" : "bg-red-100"}`}>
                        {payment.status === "succeeded" ? <Check className="h-5 w-5 text-primary" /> : payment.status === "pending" ? <Calendar className="h-5 w-5 text-yellow-600" /> : <AlertTriangle className="h-5 w-5 text-red-600" />}
                      </div>
                      <div>
                        <p className="font-medium">{payment.description}</p>
                        <p className="text-sm text-muted-foreground">{format(new Date(payment.createdAt), "MMM d, yyyy")}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-semibold">${(payment.amount / 100).toFixed(2)}</span>
                      <Badge variant={payment.status === "succeeded" ? "default" : payment.status === "pending" ? "secondary" : "destructive"}>
                        {payment.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
  );
}
