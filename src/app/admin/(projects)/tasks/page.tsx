'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TaskPriorityBadge } from '@/components/tasks/task-priority-badge';
import { LabelBadge } from '@/components/tasks/label-badge';
import {
  CheckCircle,
  Circle,
  Calendar,
  Search,
  LayoutDashboard,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { TaskPriority } from '@prisma/client';

interface Task {
  id: string;
  title: string;
  description?: string | null;
  priority: TaskPriority;
  dueDate?: string | null;
  isCompleted: boolean;
  column: {
    id: string;
    title: string;
    board: {
      id: string;
      title: string;
    };
  };
  assignees: any[];
  labels: any[];
  checklistProgress?: {
    completed: number;
    total: number;
  };
}

export default function MyTasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [completedFilter, setCompletedFilter] = useState<string>('incomplete');

  useEffect(() => {
    fetchTasks();
  }, [priorityFilter, completedFilter, searchTerm]);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (priorityFilter !== 'all') params.append('priority', priorityFilter);
      if (completedFilter === 'incomplete') params.append('isCompleted', 'false');
      if (completedFilter === 'complete') params.append('isCompleted', 'true');
      if (searchTerm) params.append('q', searchTerm);

      const response = await fetch(`/api/tasks/my-tasks?${params}`);
      if (response.ok) {
        const data = await response.json();
        setTasks(data.tasks);
      }
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleTaskCompletion = async (task: Task) => {
    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isCompleted: !task.isCompleted }),
      });

      if (response.ok) {
        setTasks(tasks.map((t) =>
          t.id === task.id ? { ...t, isCompleted: !t.isCompleted } : t
        ));
      }
    } catch (error) {
      console.error('Failed to toggle task:', error);
    }
  };

  const incompleteTasks = tasks.filter((t) => !t.isCompleted);
  const completedTasks = tasks.filter((t) => t.isCompleted);

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Tasks</h1>
            <p className="text-gray-600 mt-1">
              Tasks assigned to you across all boards
            </p>
          </div>
          <Link href="/admin/tasks/boards">
            <Button variant="outline">
              <LayoutDashboard className="h-4 w-4 mr-2" />
              View Boards
            </Button>
          </Link>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search tasks..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="URGENT">Urgent</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="LOW">Low</SelectItem>
                </SelectContent>
              </Select>
              <Select value={completedFilter} onValueChange={setCompletedFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="incomplete">Incomplete</SelectItem>
                  <SelectItem value="complete">Completed</SelectItem>
                  <SelectItem value="all">All</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Task List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : tasks.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-500">No tasks found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {incompleteTasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                onToggle={() => toggleTaskCompletion(task)}
              />
            ))}

            {completedTasks.length > 0 && completedFilter !== 'incomplete' && (
              <>
                <div className="pt-4">
                  <h3 className="text-sm font-medium text-gray-500 mb-2">
                    Completed ({completedTasks.length})
                  </h3>
                </div>
                {completedTasks.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    onToggle={() => toggleTaskCompletion(task)}
                  />
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function TaskRow({ task, onToggle }: { task: Task; onToggle: () => void }) {
  const dueDate = task.dueDate ? new Date(task.dueDate) : null;
  const isOverdue = dueDate && dueDate < new Date() && !task.isCompleted;

  return (
    <Card className={task.isCompleted ? 'opacity-60' : ''}>
      <CardContent className="py-4">
        <div className="flex items-start gap-4">
          <button
            onClick={onToggle}
            className="mt-1 text-gray-400 hover:text-blue-600 transition-colors"
          >
            {task.isCompleted ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : (
              <Circle className="h-5 w-5" />
            )}
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4">
              <div>
                <Link
                  href={`/admin/tasks/boards/${task.column.board.id}`}
                  className={`font-medium text-gray-900 hover:text-blue-600 ${
                    task.isCompleted ? 'line-through' : ''
                  }`}
                >
                  {task.title}
                </Link>
                <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                  <span>{task.column.board.title}</span>
                  <span>•</span>
                  <span>{task.column.title}</span>
                </div>
              </div>
              <TaskPriorityBadge priority={task.priority} size="sm" />
            </div>

            {/* Labels */}
            {task.labels.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {task.labels.map(({ label }: any) => (
                  <LabelBadge key={label.id} name={label.name} color={label.color} size="sm" />
                ))}
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
              {dueDate && (
                <div
                  className={`flex items-center gap-1 ${
                    isOverdue ? 'text-red-600 font-medium' : ''
                  }`}
                >
                  <Calendar className="h-4 w-4" />
                  <span>
                    {isOverdue ? 'Overdue: ' : 'Due '}
                    {formatDistanceToNow(dueDate, { addSuffix: true })}
                  </span>
                </div>
              )}

              {task.checklistProgress && task.checklistProgress.total > 0 && (
                <div className="flex items-center gap-1">
                  <span>
                    {task.checklistProgress.completed}/{task.checklistProgress.total} items
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
