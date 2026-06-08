"use client";

import React from 'react';
import { DndContext, DragEndEvent, closestCorners, useSensor, useSensors, PointerSensor, useDroppable } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

const DEFAULT_COLUMNS = [
  { id: 'applied', title: 'Applied' },
  { id: 'written_test', title: 'Written Test' },
  { id: 'shortlisted', title: 'Shortlisted' },
  { id: 'interviewed', title: 'Interviewing' },
  { id: 'offered', title: 'Offered' },
  { id: 'rejected', title: 'Rejected' },
];

function SortableItem({ app, onItemClick, onScheduleClick }: { app: any, onItemClick?: (id: string) => void, onScheduleClick?: (app: any) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: app.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      {...attributes} 
      {...listeners} 
      onClick={() => onItemClick?.(app.id)}
      className="bg-card p-3 rounded-md border shadow-sm cursor-grab active:cursor-grabbing mb-3 hover:border-primary/50 transition-colors z-10 relative"
    >
      <div className="flex justify-between items-start mb-2 pointer-events-none gap-2">
        <div className="flex gap-3 min-w-0">
          <Avatar className="h-8 w-8 border shrink-0">
            <AvatarFallback className="text-xs bg-primary/5 text-primary">
              {app.fullName.substring(0,2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="overflow-hidden">
            <h4 className="font-medium text-sm leading-tight truncate">{app.fullName}</h4>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{app.email}</p>
          </div>
        </div>
        {onScheduleClick && (
          <button 
            type="button"
            className="pointer-events-auto shrink-0 p-1.5 text-muted-foreground hover:text-primary bg-muted hover:bg-primary/10 rounded-md"
            onClick={(e) => {
              e.stopPropagation();
              onScheduleClick(app);
            }}
            title="Schedule Interview"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-1 pointer-events-none">
            {app.yearsExperience != null && (
              <Badge variant="secondary" className="text-[9px] px-1.5 py-0 font-normal">
                {app.yearsExperience}y exp
              </Badge>
            )}
            {app.location && (
              <Badge variant="outline" className="text-[9px] px-1.5 py-0 font-normal">
                {app.location}
              </Badge>
            )}
          </div>
    </div>
  );
}

function Column({ col, applications, onItemClick, onScheduleClick }: { col: any, applications: any[], onItemClick?: (id: string) => void, onScheduleClick?: (app: any) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: col.id });
  
  return (
    <div ref={setNodeRef} className={`flex flex-col flex-shrink-0 w-[280px] bg-muted/40 rounded-xl p-3 border transition-colors ${isOver ? 'border-primary/50 bg-primary/5' : 'border-transparent'}`}>
      <div className="flex justify-between items-center mb-4 px-1">
        <h3 className="font-semibold text-sm">{col.title}</h3>
        <Badge variant="secondary" className="px-1.5 rounded-sm">{applications.length}</Badge>
      </div>
      <SortableContext items={applications.map(a => a.id)} strategy={verticalListSortingStrategy}>
        <div className="flex-1 min-h-[200px]">
          {applications.map(app => (
            <SortableItem key={app.id} app={app} onItemClick={onItemClick} onScheduleClick={onScheduleClick} />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}

export function KanbanBoard({ applications, stages, onStatusChange, onItemClick, onScheduleClick }: { applications: any[], stages?: any[], onStatusChange: (appId: string, status: string) => void, onItemClick?: (id: string) => void, onScheduleClick?: (app: any) => void }) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  // Map stages from DB if provided, else fallback to defaults
  const columns = stages && stages.length > 0 
    ? stages.map(s => ({ id: s.systemId || s.name, title: s.name })) 
    : DEFAULT_COLUMNS;

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    
    const activeApp = applications.find(a => a.id === active.id);
    if (!activeApp) return;

    let targetStatus = over.id as string;
    
    // If dropped over another item, get its status
    const overApp = applications.find(a => a.id === over.id);
    if (overApp) {
      targetStatus = overApp.status;
    }

    const getColumnId = (status: string) => {
      if (['interviewed', 'interview_scheduled', 'interview_completed', 'interview_cancelled', 'reschedule_requested'].includes(status)) {
        return 'interviewed';
      }
      return status;
    };

    const activeColId = getColumnId(activeApp.status);
    const targetColId = getColumnId(targetStatus);

    if (activeColId !== targetColId && columns.find(c => c.id === targetColId)) {
      onStatusChange(active.id as string, targetColId);
    }
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-6 pt-2 snap-x">
        {columns.map(col => {
          const apps = applications.filter(a => {
            const getColumnId = (status: string) => {
              if (['interviewed', 'interview_scheduled', 'interview_completed', 'interview_cancelled', 'reschedule_requested'].includes(status)) {
                return 'interviewed';
              }
              return status;
            };
            return getColumnId(a.status) === col.id;
          }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          return <Column key={col.id} col={col} applications={apps} onItemClick={onItemClick} onScheduleClick={onScheduleClick} />;
        })}
      </div>
    </DndContext>
  );
}
