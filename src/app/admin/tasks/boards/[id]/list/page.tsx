'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { BoardHeader } from '@/components/tasks/board-header';
import { TaskDetailDialog } from '@/components/tasks/task-detail-dialog';
import { TaskPriorityBadge } from '@/components/tasks/task-priority-badge';
import { LabelBadge } from '@/components/tasks/label-badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Loader2, Search, Calendar, Users } from 'lucide-react';
import { useBoardPolling } from '@/hooks/use-board-polling';
import { formatDistanceToNow } from 'date-fns';

interface Task {
  id: string;
  title: string;
  description?: string | null;
  priority: any;
  dueDate?: string | Date | null;
  isCompleted: boolean;
  position: number;
  column: {
    id: string;
    title: string;
  };
  assignees: any[];
  labels: any[];
}

interface Column {
  id: string;
  title: string;
  position: number;
  tasks: Task[];
}

interface Board {
  id: string;
  title: string;
  description?: string | null;
  isArchived: boolean;
  columns: Column[];
  members: any[];
  labels: any[];
}

export default function BoardListPage() {
  const params = useParams();
  const boardId = params.id as string;

  const { data: board, loading, error, refresh } = useBoardPolling<Board>(
    `/api/boards/${boardId}`,
    { pollingInterval: 15000 }
  );

  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [columnFilter, setColumnFilter] = useState<string>('all');
  const [completedFilter, setCompletedFilter] = useState<string>('incomplete');

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);

  // Flatten tasks from all columns
  const allTasks = board?.columns.flatMap((col) =>
    col.tasks.map((task) => ({ ...task, column: { id: col.id, title: col.title } }))
  ) || [];

  // Apply filters
  const filteredTasks = allTasks.filter((task) => {
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
    const matchesColumn = columnFilter === 'all' || task.column.id === columnFilter;
    const matchesCompleted =
      completedFilter === 'all' ||
      (completedFilter === 'incomplete' && !task.isCompleted) ||
      (completedFilter === 'complete' && task.isCompleted);

    return matchesSearch && matchesPriority && matchesColumn && matchesCompleted;
  });

  // Sort tasks by column position, then by task position
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    const colA = board?.columns.find((c) => c.id === a.column.id);
    const colB = board?.columns.find((c) => c.id === b.column.id);
    if (colA?.position !== colB?.position) {
      return (colA?.position || 0) - (colB?.position || 0);
    }
    return a.position - b.position;
  });

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setTaskDialogOpen(true);
  };

  const handleToggleComplete = async (task: Task) => {
    try {
      await fetch(`/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isCompleted: !task.isCompleted }),
      });
      refresh();
    } catch (error) {
      console.error('Failed to toggle task:', error);
    }
  };

  if (loading && !board) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error || !board) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Board not found</h2>
          <p className="text-gray-500">The board doesn't exist or you don't have access.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <BoardHeader board={board} onRefresh={refresh} />

      <div className="flex-1 overflow-auto p-4">
        {/* Filters */}
        <Card className="mb-4">
          <CardContent className="pt-4">
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
              <Select value={columnFilter} onValueChange={setColumnFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Column" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Columns</SelectItem>
                  {board.columns.map((col) => (
                    <SelectItem key={col.id} value={col.id}>
                      {col.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

        {/* Task Table */}
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>Task</TableHead>
                <TableHead className="w-32">Column</TableHead>
                <TableHead className="w-28">Priority</TableHead>
                <TableHead className="w-36">Due Date</TableHead>
                <TableHead className="w-32">Assignees</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedTasks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                    No tasks found
                  </TableCell>
                </TableRow>
              ) : (
                sortedTasks.map((task) => {
                  const dueDate = task.dueDate ? new Date(task.dueDate) : null;
                  const isOverdue = dueDate && dueDate < new Date() && !task.isCompleted;

                  return (
                    <TableRow
                      key={task.id}
                      className={`cursor-pointer hover:bg-gray-50 ${
                        task.isCompleted ? 'opacity-60' : ''
                      }`}
                    >
                      <TableCell>
                        <Checkbox
                          checked={task.isCompleted}
                          onCheckedChange={() => handleToggleComplete(task)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </TableCell>
                      <TableCell onClick={() => handleTaskClick(task)}>
                        <div>
                          <span
                            className={`font-medium ${
                              task.isCompleted ? 'line-through text-gray-500' : ''
                            }`}
                          >
                            {task.title}
                          </span>
                          {task.labels.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {task.labels.slice(0, 3).map(({ label }: any) => (
                                <LabelBadge
                                  key={label.id}
                                  name={label.name}
                                  color={label.color}
                                  size="sm"
                                />
                              ))}
                              {task.labels.length > 3 && (
                                <span className="text-xs text-gray-500">
                                  +{task.labels.length - 3}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell onClick={() => handleTaskClick(task)}>
                        <span className="text-sm text-gray-600">{task.column.title}</span>
                      </TableCell>
                      <TableCell onClick={() => handleTaskClick(task)}>
                        <TaskPriorityBadge priority={task.priority} size="sm" />
                      </TableCell>
                      <TableCell onClick={() => handleTaskClick(task)}>
                        {dueDate && (
                          <div
                            className={`flex items-center gap-1 text-sm ${
                              isOverdue ? 'text-red-600 font-medium' : 'text-gray-600'
                            }`}
                          >
                            <Calendar className="h-3 w-3" />
                            {formatDistanceToNow(dueDate, { addSuffix: true })}
                          </div>
                        )}
                      </TableCell>
                      <TableCell onClick={() => handleTaskClick(task)}>
                        {task.assignees.length > 0 && (
                          <div className="flex -space-x-2">
                            {task.assignees.slice(0, 3).map(({ user }: any) => (
                              <div
                                key={user.id}
                                className="w-6 h-6 rounded-full bg-gray-300 border-2 border-white flex items-center justify-center text-xs font-medium"
                                title={user.name || 'Unknown'}
                              >
                                {user.image ? (
                                  <img
                                    src={user.image}
                                    alt=""
                                    className="w-full h-full rounded-full object-cover"
                                  />
                                ) : (
                                  user.name?.charAt(0).toUpperCase() || '?'
                                )}
                              </div>
                            ))}
                            {task.assignees.length > 3 && (
                              <div className="w-6 h-6 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-xs">
                                +{task.assignees.length - 3}
                              </div>
                            )}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </Card>
      </div>

      {/* Task Detail Dialog */}
      {selectedTask && (
        <TaskDetailDialog
          taskId={selectedTask.id}
          open={taskDialogOpen}
          onOpenChange={setTaskDialogOpen}
          onUpdate={refresh}
          boardMembers={board.members}
          boardLabels={board.labels}
        />
      )}
    </div>
  );
}
