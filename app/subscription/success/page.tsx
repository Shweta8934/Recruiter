"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useDispatch } from "react-redux";
import { subscriptionActions } from "@/store/slices/subscriptionSlice";
import { PLAN_NAMES } from "@/lib/constants";
import { PlanTier } from "@/types";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

type VerifyStatus = "verifying" | "success" | "error";

export default function SubscriptionSuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const dispatch = useDispatch();

  const [status, setStatus] = useState<VerifyStatus>("verifying");
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    // Razorpay Payment Link callback appends these query params automatically
    const razorpay_payment_id = searchParams.get("razorpay_payment_id");
    const razorpay_payment_link_id = searchParams.get("razorpay_payment_link_id");
    const razorpay_payment_link_reference_id = searchParams.get("razorpay_payment_link_reference_id");
    const razorpay_payment_link_status = searchParams.get("razorpay_payment_link_status");
    const razorpay_signature = searchParams.get("razorpay_signature");

    // Our own params embedded in the callback_url
    const organizationId = searchParams.get("organizationId");
    const planSlug = searchParams.get("planSlug") as PlanTier | null;
    const actorUserId = searchParams.get("actorUserId") || undefined;

    // Guard: if payment was cancelled or params are missing
    if (!razorpay_payment_id || !razorpay_signature || !organizationId || !planSlug) {
      setErrorMessage("Payment was cancelled or required parameters are missing.");
      setStatus("error");
      return;
    }

    if (razorpay_payment_link_status !== "paid") {
      setErrorMessage(`Payment was not completed. Status: ${razorpay_payment_link_status ?? "unknown"}`);
      setStatus("error");
      return;
    }

    // Send to verification endpoint
    dispatch(
      subscriptionActions.verifyRazorpayPaymentRequest({
        payload: {
          razorpay_payment_id,
          razorpay_payment_link_id,
          razorpay_payment_link_reference_id,
          razorpay_payment_link_status,
          razorpay_signature,
          organizationId,
          planSlug,
          actorUserId,
        },
        resolve: () => {
          setStatus("success");
        },
        reject: (err: string) => {
          setErrorMessage(err || "Signature verification failed.");
          setStatus("error");
        },
      })
    );
  }, [searchParams, dispatch]);

  const planSlug = searchParams.get("planSlug") as PlanTier | null;
  const planDisplayName = planSlug ? (PLAN_NAMES[planSlug] || planSlug) : "your new";

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full text-center space-y-6 rounded-2xl border bg-card p-10 shadow-lg">
        {status === "verifying" && (
          <>
            <Loader2 className="mx-auto h-16 w-16 animate-spin text-primary" />
            <h1 className="text-2xl font-bold">Verifying your payment…</h1>
            <p className="text-muted-foreground text-sm">
              Please wait while we confirm your subscription.
            </p>
          </>
        )}

        {status === "success" && (
          <>
            <CheckCircle2 className="mx-auto h-16 w-16 text-green-500" />
            <h1 className="text-2xl font-bold">Payment Successful!</h1>
            <p className="text-muted-foreground text-sm">
              Your <span className="font-semibold text-foreground">{planDisplayName}</span> plan is now
              active. Welcome aboard!
            </p>
            <Button asChild className="w-full" size="lg">
              <Link href="/subscription">Go to Subscription</Link>
            </Button>
          </>
        )}

        {status === "error" && (
          <>
            <XCircle className="mx-auto h-16 w-16 text-destructive" />
            <h1 className="text-2xl font-bold">Payment Issue</h1>
            <p className="text-muted-foreground text-sm">{errorMessage}</p>
            <div className="flex flex-col gap-3">
              <Button asChild className="w-full" size="lg">
                <Link href="/subscription">Back to Plans</Link>
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
