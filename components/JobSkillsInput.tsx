import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { jobsActions } from '@/store/slices/jobsSlice';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X, Sparkles, Loader2 } from 'lucide-react';

interface JobSkillsInputProps {
  skills: string[];
  onChange: (skills: string[]) => void;
  jobTitle: string;
  departmentId: string;
  departments: { id: string; name: string }[];
  error?: string;
}

export function JobSkillsInput({ skills, onChange, jobTitle, departmentId, departments, error }: JobSkillsInputProps) {
  const dispatch = useDispatch();
  const [inputValue, setInputValue] = useState('');
  const [isSuggesting, setIsSuggesting] = useState(false);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const newSkill = inputValue.trim();
      if (newSkill && !skills.includes(newSkill)) {
        onChange([...skills, newSkill]);
      }
      setInputValue('');
    }
  };

  const removeSkill = (skillToRemove: string) => {
    onChange(skills.filter((skill) => skill !== skillToRemove));
  };

  const suggestSkills = async () => {
    if (!jobTitle) return;
    try {
      setIsSuggesting(true);
      const departmentName = departments.find(d => d.id === departmentId)?.name || '';
      
      await new Promise<void>((resolve, reject) => {
        dispatch(jobsActions.suggestSkillsRequest({
          payload: { jobTitle, department: departmentName },
          resolve: (data) => {
            if (data.skills && Array.isArray(data.skills)) {
              const uniqueNewSkills = data.skills.filter((s: string) => !skills.includes(s));
              if (uniqueNewSkills.length > 0) {
                onChange([...skills, ...uniqueNewSkills]);
              }
            }
            resolve();
          },
          reject
        }));
      });
    } catch (error) {
      console.error('Failed to suggest skills:', error);
    } finally {
      setIsSuggesting(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>Skills Required <span className="text-destructive">*</span></Label>
        <Button 
          type="button" 
          variant="ghost" 
          size="sm" 
          onClick={suggestSkills}
          disabled={!jobTitle || isSuggesting}
          className="h-8 text-xs text-primary"
        >
          {isSuggesting ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Sparkles className="w-3 h-3 mr-1" />}
          Suggest Skills
        </Button>
      </div>
      
      <div className="flex flex-wrap gap-2 mb-2">
        {skills.map((skill) => (
          <Badge key={skill} variant="secondary" className="px-2 py-1 flex items-center gap-1">
            {skill}
            <button
              type="button"
              onClick={() => removeSkill(skill)}
              className="text-muted-foreground hover:text-foreground rounded-full"
            >
              <X className="w-3 h-3" />
            </button>
          </Badge>
        ))}
      </div>
      
      <Input 
        placeholder="Type a skill and press Enter..." 
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        className={error ? "border-destructive focus-visible:ring-destructive" : ""}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
