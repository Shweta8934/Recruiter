"use client";

import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useAuth } from "@/hooks/useAuth";
import { subscriptionActions } from "@/store/slices/subscriptionSlice";
import { jobsActions } from "@/store/slices/jobsSlice";
import { RootState } from "@/store/rootReducer";
import { DashboardLayout } from "@/components/layout";
import { PageHeader } from "@/components/common";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ReportsPage() {
  const { user } = useAuth();
  const orgId = user?.organizationId;
  const role = user?.roleSlug;

  const dispatch = useDispatch();
  const [payments, setPayments] = useState<any[]>([]);
  const [subscription, setSubscription] = useState<any>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);

  useEffect(() => {
    if (!orgId) return;

    dispatch(subscriptionActions.loadSubscriptionDataRequest({
      organizationId: orgId,
      resolve: (data) => {
        setPayments(data.payments ?? []);
        setSubscription(data.subscription ?? null);
      }
    }));

    dispatch(jobsActions.fetchJobPostsRequest({
      organizationId: orgId,
      resolve: async (jobsData) => {
        const allJobs = jobsData ?? [];
        setJobs(allJobs);
        
        const appLists = await Promise.all(
          allJobs.map((j: any) =>
            new Promise<any[]>((resolveApps) => {
              dispatch(jobsActions.fetchJobApplicationsRequest({
                jobId: j.id,
                resolve: (apps) => resolveApps(apps ?? []),
                reject: () => resolveApps([])
              }));
            })
          )
        );
        
        setApplications(appLists.flat());
      },
      reject: () => {
        setJobs([]);
      }
    }));
  }, [orgId, dispatch]);

  const totalPaid = useMemo(
    () => payments.filter((p) => p.status === "succeeded").reduce((s, p) => s + p.amount, 0),
    [payments]
  );

  const recruiterView = (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card><CardHeader><CardTitle>Open Job Posts</CardTitle></CardHeader><CardContent>{jobs.length}</CardContent></Card>
      <Card><CardHeader><CardTitle>Total Applicants</CardTitle></CardHeader><CardContent>{applications.length}</CardContent></Card>
      <Card><CardHeader><CardTitle>Applied</CardTitle></CardHeader><CardContent>{applications.filter((a) => a.status === "applied").length}</CardContent></Card>
      <Card><CardHeader><CardTitle>Interview/Offer</CardTitle></CardHeader><CardContent>{applications.filter((a) => a.status === "interview" || a.status === "offer").length}</CardContent></Card>
    </div>
  );

  const billingView = (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card><CardHeader><CardTitle>Current Plan</CardTitle></CardHeader><CardContent>{subscription?.plan?.name || "Free"}</CardContent></Card>
      <Card><CardHeader><CardTitle>Billing Cycle</CardTitle></CardHeader><CardContent>{subscription?.plan?.billingCycle || "monthly"}</CardContent></Card>
      <Card><CardHeader><CardTitle>Total Transactions</CardTitle></CardHeader><CardContent>{payments.length}</CardContent></Card>
      <Card><CardHeader><CardTitle>Total Paid</CardTitle></CardHeader><CardContent>${(totalPaid / 100).toFixed(2)}</CardContent></Card>
    </div>
  );

  const genericView = (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Card><CardHeader><CardTitle>Organization Jobs</CardTitle></CardHeader><CardContent>{jobs.length}</CardContent></Card>
      <Card><CardHeader><CardTitle>Applications</CardTitle></CardHeader><CardContent>{applications.length}</CardContent></Card>
      <Card><CardHeader><CardTitle>Payments</CardTitle></CardHeader><CardContent>{payments.length}</CardContent></Card>
    </div>
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader title="Reports" description="Analytics and usage insights" />
        {role === "recruiter" ? recruiterView : role === "billing" ? billingView : genericView}
      </div>
    </DashboardLayout>
  );
}
