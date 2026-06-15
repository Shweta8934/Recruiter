"use client";

import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { jobsActions } from '@/store/slices/jobsSlice';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  interviewId: string;
  templateId?: string | null;
  onSuccess: () => void;
  existingFeedback?: any;
}

export function FeedbackModal({ open, onOpenChange, interviewId, templateId, onSuccess, existingFeedback }: Props) {
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  const [fetchingParams, setFetchingParams] = useState(false);
  const [parameters, setParameters] = useState<any[]>([]);
  
  const [recommendation, setRecommendation] = useState<string>('');
  const [comments, setComments] = useState<string>('');
  const [scores, setScores] = useState<Record<string, number>>({});

  useEffect(() => {
    if (open) {
      if (existingFeedback) {
        setRecommendation(existingFeedback.recommendation || '');
        setComments(existingFeedback.comments || '');
        const initialScores: Record<string, number> = {};
        if (existingFeedback.parameterScores) {
          existingFeedback.parameterScores.forEach((ps: any) => {
            initialScores[ps.parameterId] = ps.score;
          });
        }
        setScores(initialScores);
      } else {
        setRecommendation('');
        setComments('');
        setScores({});
      }
    }
  }, [open, existingFeedback]);

  useEffect(() => {
    if (open && templateId) {
      setFetchingParams(true);
      dispatch(jobsActions.fetchEvaluationTemplateByIdRequest({
        templateId,
        resolve: (data: any) => {
          if (data.template?.parameters) {
            setParameters(data.template.parameters);
            setScores(prev => {
              const newScores = { ...prev };
              data.template.parameters.forEach((p: any) => {
                if (newScores[p.id] === undefined) {
                  newScores[p.id] = 3;
                }
              });
              return newScores;
            });
          }
          setFetchingParams(false);
        },
        reject: () => setFetchingParams(false)
      }));
    } else {
      setParameters([]);
      if (!existingFeedback) {
        setScores({});
      }
    }
  }, [open, templateId, dispatch, existingFeedback]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recommendation) {
      toast.error("Please select an overall recommendation.");
      return;
    }

    setLoading(true);
    const payloadScores = Object.entries(scores).map(([parameterId, score]) => ({
      parameterId,
      score
    }));

    if (existingFeedback) {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH || '/ai-recruitment-platform'}/api/interviews/${interviewId}/feedback`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ recommendation, comments, scores: payloadScores }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to update feedback");
        
        toast.success("Feedback updated successfully!");
        onSuccess();
        onOpenChange(false);
      } catch (err: any) {
        toast.error(err.message || "Failed to update feedback");
      } finally {
        setLoading(false);
      }
    } else {
      dispatch(jobsActions.submitInterviewFeedbackRequest({
        interviewId,
        payload: { recommendation, comments, scores: payloadScores },
        resolve: () => {
          toast.success("Feedback submitted successfully!");
          onSuccess();
          onOpenChange(false);
          setLoading(false);
        },
        reject: (err: string) => {
          toast.error(err || "Failed to submit feedback");
          setLoading(false);
        }
      }));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Provide Feedback</DialogTitle>
          <DialogDescription>Submit your evaluation for this candidate.</DialogDescription>
        </DialogHeader>

        {fetchingParams ? (
          <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6 mt-2">
            
            {parameters.length > 0 && (
              <div className="space-y-4 border-b pb-4">
                <h4 className="font-semibold text-sm">Skills Evaluation</h4>
                {parameters.map(p => (
                  <div key={p.id} className="space-y-2">
                    <div className="flex justify-between items-center text-sm">
                      <Label>{p.name}</Label>
                      <span className="font-medium bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded">{scores[p.id] || 3}/5</span>
                    </div>
                    <div className="flex justify-between gap-2 mt-3">
                      {[
                        { val: 1, label: "Poor" },
                        { val: 2, label: "Needs Improvement" },
                        { val: 3, label: "Meets Expectations" },
                        { val: 4, label: "Strong" },
                        { val: 5, label: "Exceptional" }
                      ].map((opt) => (
                        <div key={opt.val} className="flex-1 flex flex-col items-center">
                          <button
                            type="button"
                            onClick={() => setScores(prev => ({ ...prev, [p.id]: opt.val }))}
                            className={`w-full py-2 text-sm font-medium border rounded-md transition-colors ${
                              scores[p.id] === opt.val
                                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                                : "bg-background text-muted-foreground hover:bg-muted"
                            }`}
                          >
                            {opt.val}
                          </button>
                          <span className="text-[10px] text-center mt-1 text-muted-foreground leading-tight px-1">
                            {opt.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-2">
              <Label>Overall Recommendation <span className="text-red-500">*</span></Label>
              <Select value={recommendation} onValueChange={setRecommendation}>
                <SelectTrigger><SelectValue placeholder="Select recommendation..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Strong Hire">Strong Hire</SelectItem>
                  <SelectItem value="Hire">Hire</SelectItem>
                  <SelectItem value="No Hire">No Hire</SelectItem>
                  <SelectItem value="Strong No Hire">Strong No Hire</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Additional Comments</Label>
              <Textarea 
                placeholder="Share your detailed thoughts..." 
                className="h-24"
                value={comments}
                onChange={e => setComments(e.target.value)}
              />
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Submit Feedback
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
