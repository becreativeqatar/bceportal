'use client';

import { useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { BoardHeader } from '@/components/tasks/board-header';
import { TaskDetailDialog } from '@/components/tasks/task-detail-dialog';
import { TaskPriorityBadge } from '@/components/tasks/task-priority-badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useBoardPolling } from '@/hooks/use-board-polling';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  isToday,
} from 'date-fns';

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

export default function BoardCalendarPage() {
  const params = useParams();
  const boardId = params.id as string;

  const { data: board, loading, error, refresh } = useBoardPolling<Board>(
    `/api/boards/${boardId}`,
    { pollingInterval: 15000 }
  );

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);

  // Flatten tasks from all columns
  const allTasks = useMemo(() => {
    if (!board) return [];
    return board.columns.flatMap((col) =>
      col.tasks.map((task) => ({ ...task, column: { id: col.id, title: col.title } }))
    );
  }, [board]);

  // Get tasks with due dates
  const tasksWithDueDate = useMemo(() => {
    return allTasks.filter((task) => task.dueDate);
  }, [allTasks]);

  // Group tasks by date
  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    tasksWithDueDate.forEach((task) => {
      const dateKey = format(new Date(task.dueDate!), 'yyyy-MM-dd');
      if (!map.has(dateKey)) {
        map.set(dateKey, []);
      }
      map.get(dateKey)!.push(task);
    });
    return map;
  }, [tasksWithDueDate]);

  // Calendar days
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calendarStart = startOfWeek(monthStart);
    const calendarEnd = endOfWeek(monthEnd);
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentMonth]);

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const handleToday = () => setCurrentMonth(new Date());

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setTaskDialogOpen(true);
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
        {/* Calendar Header */}
        <Card className="mb-4">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handlePrevMonth}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={handleNextMonth}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={handleToday}>
                  Today
                </Button>
              </div>
              <h2 className="text-xl font-semibold">
                {format(currentMonth, 'MMMM yyyy')}
              </h2>
              <div className="text-sm text-gray-500">
                {tasksWithDueDate.length} tasks with due dates
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Calendar Grid */}
        <Card>
          <CardContent className="p-0">
            {/* Day headers */}
            <div className="grid grid-cols-7 border-b">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div
                  key={day}
                  className="p-2 text-center text-sm font-medium text-gray-500 border-r last:border-r-0"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar cells */}
            <div className="grid grid-cols-7">
              {calendarDays.map((day, index) => {
                const dateKey = format(day, 'yyyy-MM-dd');
                const dayTasks = tasksByDate.get(dateKey) || [];
                const isCurrentMonth = isSameMonth(day, currentMonth);
                const isCurrentDay = isToday(day);

                return (
                  <div
                    key={day.toISOString()}
                    className={`min-h-[120px] p-2 border-r border-b last:border-r-0 ${
                      !isCurrentMonth ? 'bg-gray-50' : ''
                    }`}
                  >
                    <div
                      className={`text-sm font-medium mb-1 ${
                        !isCurrentMonth
                          ? 'text-gray-400'
                          : isCurrentDay
                          ? 'text-blue-600'
                          : 'text-gray-900'
                      }`}
                    >
                      <span
                        className={`inline-flex items-center justify-center w-6 h-6 rounded-full ${
                          isCurrentDay ? 'bg-blue-600 text-white' : ''
                        }`}
                      >
                        {format(day, 'd')}
                      </span>
                    </div>

                    {/* Tasks for this day */}
                    <div className="space-y-1">
                      {dayTasks.slice(0, 3).map((task) => (
                        <button
                          key={task.id}
                          onClick={() => handleTaskClick(task)}
                          className={`w-full text-left text-xs p-1 rounded truncate ${
                            task.isCompleted
                              ? 'bg-gray-100 text-gray-500 line-through'
                              : task.priority === 'URGENT'
                              ? 'bg-red-100 text-red-800'
                              : task.priority === 'HIGH'
                              ? 'bg-orange-100 text-orange-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {task.title}
                        </button>
                      ))}
                      {dayTasks.length > 3 && (
                        <div className="text-xs text-gray-500 pl-1">
                          +{dayTasks.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
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
