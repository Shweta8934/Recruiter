"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";

interface CandidateTabsClientProps {
  activityTab: React.ReactNode;
  screeningTab: React.ReactNode;
  resumeTab: React.ReactNode;
  interviewsTab: React.ReactNode;
  assessmentsTab?: React.ReactNode;
}

export function CandidateTabsClient({
  activityTab,
  screeningTab,
  resumeTab,
  interviewsTab,
  assessmentsTab
}: CandidateTabsClientProps) {
  const [activeTab, setActiveTab] = useState<"activity" | "screening" | "resume" | "interviews" | "assessments">("activity");

  const tabs = [
    { id: "activity", label: "Activity" },
    { id: "screening", label: "Screening" },
    { id: "resume", label: "Resume" },
    { id: "interviews", label: "Interviews" },
    { id: "assessments", label: "Assessments" },
  ] as const;

  return (
    <Card>
      <CardContent className="space-y-6 pt-6 pb-6">
        {/* Tab headers */}
        <div className="flex border-b border-zinc-200 dark:border-zinc-800 -mx-6 px-6 pb-px overflow-x-auto w-full max-w-full scrollbar-none">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 text-center font-medium pb-2.5 -mb-px transition-colors duration-200 border-b-2 whitespace-nowrap text-[10px] min-[380px]:text-xs sm:text-sm lg:text-[11px] xl:text-xs 2xl:text-sm px-0.5 min-[380px]:px-1 sm:px-3 lg:px-1 xl:px-2 2xl:px-3 ${
                activeTab === tab.id
                  ? "text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-400 font-semibold"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 border-transparent"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab contents */}
        <div>
          {activeTab === "activity" && <div className="space-y-4">{activityTab}</div>}
          {activeTab === "screening" && <div className="space-y-4">{screeningTab}</div>}
          {activeTab === "resume" && <div className="space-y-4">{resumeTab}</div>}
          {activeTab === "interviews" && <div className="space-y-4">{interviewsTab}</div>}
          {activeTab === "assessments" && <div className="space-y-4">{assessmentsTab}</div>}
        </div>
      </CardContent>
    </Card>
  );
}
