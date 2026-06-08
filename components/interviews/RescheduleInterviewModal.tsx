"use client";

import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { jobsActions } from '@/store/slices/jobsSlice';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  interviewId: string;
  currentScheduledAt: string;
  currentDuration: number;
  onSuccess: () => void;
}

export function RescheduleInterviewModal({ open, onOpenChange, interviewId, currentScheduledAt, currentDuration, onSuccess }: Props) {
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  
  // Parse existing date/time for initial values
  const initDate = currentScheduledAt ? new Date(currentScheduledAt) : new Date();
  
  const [date, setDate] = useState(initDate.toISOString().split('T')[0]);
  const [time, setTime] = useState(
    initDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) // 24h format for input type="time"
  );
  const [duration, setDuration] = useState(currentDuration.toString());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !time) {
      toast.error("Please provide the new date and time.");
      return;
    }

    setLoading(true);
    const scheduledAt = new Date(`${date}T${time}`);
    
    dispatch(jobsActions.updateInterviewRequest({
      id: interviewId,
      payload: {
        scheduledAt: scheduledAt.toISOString(),
        duration: Number(duration),
      },
      resolve: () => {
        toast.success("Interview rescheduled successfully! Updates sent to Google Calendar.");
        onSuccess();
        onOpenChange(false);
        setLoading(false);
      },
      reject: (err: string) => {
        toast.error(err || "Failed to reschedule interview");
        setLoading(false);
      }
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Reschedule Interview</DialogTitle>
          <DialogDescription>Pick a new date and time. Attendees will be notified automatically.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>New Date</Label>
              <Input type="date" required value={date} onChange={e => setDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>New Time</Label>
              <Input type="time" required value={time} onChange={e => setTime(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Duration (minutes)</Label>
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="30">30 Minutes</SelectItem>
                <SelectItem value="45">45 Minutes</SelectItem>
                <SelectItem value="60">1 Hour</SelectItem>
                <SelectItem value="90">1.5 Hours</SelectItem>
                <SelectItem value="120">2 Hours</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="pt-4 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Confirm Reschedule
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
