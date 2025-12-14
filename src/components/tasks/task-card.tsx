'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent } from '@/components/ui/card';
import { TaskPriorityBadge } from './task-priority-badge';
import { LabelBadge } from './label-badge';
import {
  Calendar,
  CheckSquare,
  MessageSquare,
  Paperclip,
  GripVertical,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { TaskPriority } from '@prisma/client';

interface TaskCardProps {
  task: {
    id: string;
    title: string;
    description?: string | null;
    priority: TaskPriority;
    dueDate?: string | Date | null;
    isCompleted: boolean;
    assignees: {
      user: {
        id: string;
        name?: string | null;
        image?: string | null;
      };
    }[];
    labels: {
      label: {
        id: string;
        name: string;
        color: string;
      };
    }[];
    _count?: {
      checklist: number;
      comments: number;
      attachments: number;
    };
    checklistProgress?: {
      completed: number;
      total: number;
    };
  };
  isDragging?: boolean;
  onClick?: () => void;
}

export function TaskCard({ task, isDragging, onClick }: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({
    id: task.id,
    data: {
      type: 'task',
      task,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortableDragging ? 0.5 : 1,
  };

  const dueDate = task.dueDate ? new Date(task.dueDate) : null;
  const isOverdue = dueDate && dueDate < new Date() && !task.isCompleted;

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`cursor-pointer hover:shadow-md transition-shadow ${
        isDragging ? 'shadow-lg ring-2 ring-blue-500' : ''
      } ${task.isCompleted ? 'opacity-60' : ''}`}
      onClick={onClick}
    >
      <CardContent className="p-3">
        <div className="flex items-start gap-2">
          <button
            className="mt-1 cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
          </button>

          <div className="flex-1 min-w-0">
            {/* Labels */}
            {task.labels.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {task.labels.slice(0, 3).map(({ label }) => (
                  <LabelBadge key={label.id} name={label.name} color={label.color} size="sm" />
                ))}
                {task.labels.length > 3 && (
                  <span className="text-xs text-gray-500">+{task.labels.length - 3}</span>
                )}
              </div>
            )}

            {/* Title */}
            <h4
              className={`text-sm font-medium text-gray-900 line-clamp-2 ${
                task.isCompleted ? 'line-through text-gray-500' : ''
              }`}
            >
              {task.title}
            </h4>

            {/* Meta row */}
            <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
              {/* Due date */}
              {dueDate && (
                <div
                  className={`flex items-center gap-1 ${
                    isOverdue ? 'text-red-600 font-medium' : ''
                  }`}
                >
                  <Calendar className="h-3 w-3" />
                  <span>{formatDistanceToNow(dueDate, { addSuffix: true })}</span>
                </div>
              )}

              {/* Checklist progress */}
              {task.checklistProgress && task.checklistProgress.total > 0 && (
                <div className="flex items-center gap-1">
                  <CheckSquare className="h-3 w-3" />
                  <span>
                    {task.checklistProgress.completed}/{task.checklistProgress.total}
                  </span>
                </div>
              )}

              {/* Comments */}
              {task._count?.comments ? (
                <div className="flex items-center gap-1">
                  <MessageSquare className="h-3 w-3" />
                  <span>{task._count.comments}</span>
                </div>
              ) : null}

              {/* Attachments */}
              {task._count?.attachments ? (
                <div className="flex items-center gap-1">
                  <Paperclip className="h-3 w-3" />
                  <span>{task._count.attachments}</span>
                </div>
              ) : null}
            </div>

            {/* Footer row: priority + assignees */}
            <div className="flex items-center justify-between mt-2">
              <TaskPriorityBadge priority={task.priority} size="sm" />

              {/* Assignees */}
              {task.assignees.length > 0 && (
                <div className="flex -space-x-2">
                  {task.assignees.slice(0, 3).map(({ user }) => (
                    <div
                      key={user.id}
                      className="w-6 h-6 rounded-full bg-gray-300 border-2 border-white flex items-center justify-center text-xs font-medium text-gray-700"
                      title={user.name || 'Unknown'}
                    >
                      {user.image ? (
                        <img
                          src={user.image}
                          alt={user.name || ''}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        user.name?.charAt(0).toUpperCase() || '?'
                      )}
                    </div>
                  ))}
                  {task.assignees.length > 3 && (
                    <div className="w-6 h-6 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-xs font-medium text-gray-600">
                      +{task.assignees.length - 3}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Simple version without drag-and-drop for overlays
export function TaskCardOverlay({ task }: { task: TaskCardProps['task'] }) {
  return (
    <div className="w-72">
      <TaskCard task={task} isDragging />
    </div>
  );
}
