"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";

interface JobDescriptionViewerProps {
  description: string;
}

export function JobDescriptionViewer({ description }: JobDescriptionViewerProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-white rounded-xl shadow-sm border p-6 sm:p-8 relative">
      <h2 className="text-xl font-semibold mb-6">Job Description</h2>
      
      <div 
        className={`prose prose-blue max-w-none text-gray-600 prose-headings:text-gray-900 prose-a:text-[#4370FF] overflow-hidden transition-all duration-300 ${isExpanded ? "" : "max-h-[300px]"}`}
      >
        <div dangerouslySetInnerHTML={{ __html: description }} />
      </div>

      {!isExpanded && (
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white to-transparent pointer-events-none rounded-b-xl" />
      )}

      <div className={`flex justify-center ${!isExpanded ? "absolute bottom-6 left-0 right-0" : "mt-8"}`}>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setIsExpanded(!isExpanded)}
          className="bg-white hover:bg-gray-50 shadow-sm"
        >
          {isExpanded ? (
            <>Show Less <ChevronUp className="w-4 h-4 ml-2" /></>
          ) : (
            <>See More <ChevronDown className="w-4 h-4 ml-2" /></>
          )}
        </Button>
      </div>
    </div>
  );
}
