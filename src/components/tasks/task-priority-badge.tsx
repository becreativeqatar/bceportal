'use client';

import { Badge } from '@/components/ui/badge';
import { TaskPriority } from '@prisma/client';

interface TaskPriorityBadgeProps {
  priority: TaskPriority;
  size?: 'sm' | 'default';
}

const priorityConfig: Record<TaskPriority, { label: string; className: string }> = {
  LOW: {
    label: 'Low',
    className: 'bg-gray-100 text-gray-700 border-gray-300',
  },
  MEDIUM: {
    label: 'Medium',
    className: 'bg-blue-100 text-blue-700 border-blue-300',
  },
  HIGH: {
    label: 'High',
    className: 'bg-orange-100 text-orange-700 border-orange-300',
  },
  URGENT: {
    label: 'Urgent',
    className: 'bg-red-100 text-red-700 border-red-300',
  },
};

export function TaskPriorityBadge({ priority, size = 'default' }: TaskPriorityBadgeProps) {
  const config = priorityConfig[priority];

  return (
    <Badge
      variant="outline"
      className={`${config.className} ${size === 'sm' ? 'text-xs px-1.5 py-0' : ''}`}
    >
      {config.label}
    </Badge>
  );
}
