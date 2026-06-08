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
  applicationId: string;
  organizationId: string;
  jobId: string;
  users: any[];
  rounds: any[];
  onSuccess: () => void;
}

export function ScheduleInterviewModal({ open, onOpenChange, applicationId, organizationId, jobId, users, rounds, onSuccess }: Props) {
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  const [roundId, setRoundId] = useState<string>('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [duration, setDuration] = useState('60');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !time || selectedUsers.length === 0) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setLoading(true);
    const scheduledAt = new Date(`${date}T${time}`);
    
    dispatch(jobsActions.createInterviewRequest({
      payload: {
        organizationId,
        jobId,
        applicationId,
        roundId: roundId || undefined,
        scheduledAt: scheduledAt.toISOString(),
        duration: Number(duration),
        interviewerIds: selectedUsers
      },
      resolve: () => {
        toast.success("Interview scheduled successfully! Event created & invites sent.");
        onSuccess();
        onOpenChange(false);
        setLoading(false);
      },
      reject: (err: string) => {
        toast.error(err || "Failed to schedule interview");
        setLoading(false);
      }
    }));
  };

  const toggleUser = (userId: string) => {
    setSelectedUsers(prev => prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Schedule Interview</DialogTitle>
          <DialogDescription>Setup a Google Meet interview with the candidate.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label>Interview Round</Label>
            <Select value={roundId} onValueChange={setRoundId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a round..." />
              </SelectTrigger>
              <SelectContent>
                {rounds.map((r) => (
                  <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" required value={date} onChange={e => setDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Time</Label>
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

          <div className="space-y-2">
            <Label>Interviewers (Select at least one)</Label>
            <div className="border rounded-md max-h-40 overflow-y-auto p-2 space-y-1">
              {users.filter(u => u.role?.slug === 'interviewer').length === 0 ? (
                <p className="text-sm text-zinc-500 italic p-1">No users with 'interviewer' role found in this organization.</p>
              ) : (
                users.filter(u => u.role?.slug === 'interviewer').map(u => (
                  <label key={u.id} className="flex items-center gap-2 text-sm p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={selectedUsers.includes(u.id)} 
                      onChange={() => toggleUser(u.id)}
                      className="rounded border-gray-300"
                    />
                    {u.name || u.email}
                  </label>
                ))
              )}
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Schedule Event
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
