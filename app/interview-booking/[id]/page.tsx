"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useDispatch } from "react-redux";
import { interviewBookingActions } from "@/store/slices/interviewBookingSlice";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function InterviewBookingPage() {
  const { id } = useParams<{ id: string }>();
  const [app, setApp] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  
  // Reschedule state
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [isRejecting, setIsRejecting] = useState(false);
  const [rescheduleRequested, setRescheduleRequested] = useState(false);

  const dispatch = useDispatch();

  useEffect(() => {
    if (!id) return;
    dispatch(interviewBookingActions.fetchBookingRequest({
      id,
      resolve: (data) => {
        setApp(data);
        if (data.status === 'reschedule_requested') {
          setRescheduleRequested(true);
        }
        setLoading(false);
      },
      reject: () => setLoading(false)
    }));
  }, [id, dispatch]);

  function handleSelect(dateString: string) {
    setSaving(true);
    dispatch(interviewBookingActions.confirmBookingRequest({
      id,
      selectedDate: dateString,
      resolve: () => {
        setSaving(false);
        setConfirmed(true);
      },
      reject: () => {
        setSaving(false);
        toast.error('Failed to confirm interview. Please try again.');
      }
    }));
  }

  function handleReject() {
    setIsRejecting(true);
    dispatch(interviewBookingActions.submitRescheduleRequest({
      id,
      reason: rejectReason,
      resolve: () => {
        toast.success("Request sent successfully.");
        setShowRejectInput(false);
        setRescheduleRequested(true);
        setIsRejecting(false);
      },
      reject: (err: string) => {
        toast.error(err || "Failed to send request");
        setIsRejecting(false);
      }
    }));
  }


  if (loading) return <div className="p-10 text-center">Loading...</div>;
  if (!app) return <div className="p-10 text-center">Application not found.</div>;

  if (rescheduleRequested) {
    return (
      <div className="min-h-screen bg-muted/20 flex items-center justify-center p-4">
        <Card className="max-w-md w-full shadow-lg">
          <CardContent className="pt-10 pb-10 text-center space-y-6">
            <Clock className="w-16 h-16 mx-auto text-amber-500" />
            <div>
              <h2 className="text-2xl font-bold tracking-tight mb-2">Reschedule Requested</h2>
              <p className="text-muted-foreground">
                We have notified the recruitment team about your request to reschedule the <strong>{app.job?.title}</strong> interview.
              </p>
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              The team will review your request and get back to you with new time slots soon.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (app.interviewSelectedDate || confirmed) {

    return (
      <div className="min-h-screen bg-muted/20 flex items-center justify-center p-4">
        <Card className="max-w-md w-full shadow-lg">
          <CardContent className="pt-10 pb-10 text-center space-y-6">
            <CheckCircle2 className="w-16 h-16 mx-auto text-green-500" />
            <div>
              <h2 className="text-2xl font-bold tracking-tight mb-2">Interview Confirmed!</h2>
              <p className="text-muted-foreground">
                You are all set for your interview for the <strong>{app.job?.title}</strong> role.
              </p>
            </div>
            <div className="bg-primary/5 rounded-lg p-4 inline-block mt-4 text-left">
              <p className="font-medium text-primary">Confirmed Time:</p>
              <p className="text-lg">
                {new Date(app.interviewSelectedDate || app.interviewDate1).toLocaleString([], {
                  dateStyle: "full",
                  timeStyle: "short",
                })}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/20 flex items-center justify-center p-4">
      <Card className="max-w-md w-full shadow-lg">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-2xl">Schedule Interview</CardTitle>
          <CardDescription>
            Hi {app.fullName.split(' ')[0]}, please select a time slot for your {app.job?.title} interview.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-4">
          {!showRejectInput ? (
            <>
              <div className="space-y-3">
                {[app.interviewDate1, app.interviewDate2].filter(Boolean).map((dateStr, i) => (
                  <Button
                    key={i}
                    variant="outline"
                    className="w-full h-auto py-4 flex flex-col items-center gap-2 hover:border-primary hover:bg-primary/5 transition-all"
                    onClick={() => handleSelect(dateStr)}
                    disabled={saving}
                  >
                    <div className="flex items-center gap-2 font-medium text-lg">
                      <Calendar className="w-5 h-5" />
                      {new Date(dateStr).toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      {new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </Button>
                ))}
              </div>
              <div className="pt-4 border-t text-center">
                <Button variant="ghost" className="text-muted-foreground" onClick={() => setShowRejectInput(true)}>
                  None of these times work? Request Reschedule
                </Button>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Reason for Reschedule</label>
                <textarea 
                  className="w-full mt-1 p-3 min-h-[100px] rounded-md border bg-background text-sm"
                  placeholder="Please let us know why these times don't work, and suggest some times that work better for you..."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                />
              </div>
              <div className="flex gap-2 w-full">
                <Button variant="outline" className="flex-1" onClick={() => setShowRejectInput(false)} disabled={isRejecting}>Cancel</Button>
                <Button className="flex-1" onClick={handleReject} disabled={isRejecting || !rejectReason.trim()}>
                  {isRejecting ? 'Sending...' : 'Submit Request'}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
