'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { KanbanBoard } from '@/components/tasks/kanban-board';
import { TaskDetailDialog } from '@/components/tasks/task-detail-dialog';
import { TaskQuickAdd } from '@/components/tasks/task-quick-add';
import { BoardHeader } from '@/components/tasks/board-header';
import { AddColumnDialog } from '@/components/tasks/add-column-dialog';
import { Loader2 } from 'lucide-react';
import { useBoardPolling } from '@/hooks/use-board-polling';

interface Task {
  id: string;
  title: string;
  description?: string | null;
  priority: any;
  dueDate?: string | Date | null;
  isCompleted: boolean;
  position: number;
  assignees: any[];
  labels: any[];
  _count?: any;
  checklistProgress?: any;
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
  ownerId: string;
  owner: {
    id: string;
    name?: string | null;
  };
  columns: Column[];
  members: {
    role: string;
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }[];
  labels: {
    id: string;
    name: string;
    color: string;
  }[];
}

export default function BoardDetailPage() {
  const params = useParams();
  const boardId = params.id as string;

  const { data: board, loading, error, refresh } = useBoardPolling<Board>(
    `/api/boards/${boardId}`,
    { pollingInterval: 15000 }
  );

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [quickAddColumnId, setQuickAddColumnId] = useState<string | null>(null);
  const [addColumnOpen, setAddColumnOpen] = useState(false);

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setTaskDialogOpen(true);
  };

  const handleAddTask = (columnId: string) => {
    setQuickAddColumnId(columnId);
  };

  const handleTaskCreated = async (title: string, columnId: string) => {
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          columnId,
        }),
      });

      if (response.ok) {
        refresh();
      }
    } catch (error) {
      console.error('Failed to create task:', error);
    }
    setQuickAddColumnId(null);
  };

  const handleTaskMove = async (taskId: string, targetColumnId: string, position: number) => {
    try {
      await fetch(`/api/tasks/${taskId}/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          columnId: targetColumnId,
          position,
        }),
      });
      // Don't refresh immediately - let optimistic update handle it
    } catch (error) {
      console.error('Failed to move task:', error);
      refresh(); // Refresh on error to restore state
    }
  };

  const handleColumnReorder = async (columnIds: string[]) => {
    try {
      await fetch(`/api/boards/${boardId}/columns`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ columnIds }),
      });
    } catch (error) {
      console.error('Failed to reorder columns:', error);
      refresh();
    }
  };

  const handleTaskReorder = async (columnId: string, taskIds: string[]) => {
    try {
      // Reordering tasks within the same column
      // We use the move endpoint for each task
      for (let i = 0; i < taskIds.length; i++) {
        await fetch(`/api/tasks/${taskIds[i]}/move`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            columnId,
            position: i,
          }),
        });
      }
    } catch (error) {
      console.error('Failed to reorder tasks:', error);
      refresh();
    }
  };

  const handleUpdateColumn = async (columnId: string, title: string) => {
    try {
      await fetch(`/api/boards/${boardId}/columns/${columnId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      });
      refresh();
    } catch (error) {
      console.error('Failed to update column:', error);
    }
  };

  const handleDeleteColumn = async (columnId: string) => {
    if (!confirm('Are you sure you want to delete this column? All tasks in it will be deleted.')) {
      return;
    }

    try {
      await fetch(`/api/boards/${boardId}/columns/${columnId}`, {
        method: 'DELETE',
      });
      refresh();
    } catch (error) {
      console.error('Failed to delete column:', error);
    }
  };

  const handleAddColumn = async (title: string) => {
    try {
      await fetch(`/api/boards/${boardId}/columns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      });
      refresh();
      setAddColumnOpen(false);
    } catch (error) {
      console.error('Failed to add column:', error);
    }
  };

  const handleTaskUpdate = () => {
    refresh();
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
          <p className="text-gray-500">The board you're looking for doesn't exist or you don't have access.</p>
        </div>
      </div>
    );
  }

  // Transform columns for KanbanBoard
  const columnsWithTasks = board.columns.map((col) => ({
    ...col,
    tasks: col.tasks || [],
  }));

  return (
    <div className="h-full flex flex-col">
      <BoardHeader board={board} onRefresh={refresh} />

      <div className="flex-1 overflow-hidden p-4">
        <KanbanBoard
          boardId={board.id}
          columns={columnsWithTasks}
          onTaskClick={handleTaskClick}
          onAddTask={handleAddTask}
          onAddColumn={() => setAddColumnOpen(true)}
          onTaskMove={handleTaskMove}
          onColumnReorder={handleColumnReorder}
          onTaskReorder={handleTaskReorder}
          onUpdateColumn={handleUpdateColumn}
          onDeleteColumn={handleDeleteColumn}
        />
      </div>

      {/* Quick Add Task */}
      {quickAddColumnId && (
        <TaskQuickAdd
          columnId={quickAddColumnId}
          onSubmit={handleTaskCreated}
          onCancel={() => setQuickAddColumnId(null)}
        />
      )}

      {/* Add Column Dialog */}
      <AddColumnDialog
        open={addColumnOpen}
        onOpenChange={setAddColumnOpen}
        onSubmit={handleAddColumn}
      />

      {/* Task Detail Dialog */}
      {selectedTask && (
        <TaskDetailDialog
          taskId={selectedTask.id}
          open={taskDialogOpen}
          onOpenChange={setTaskDialogOpen}
          onUpdate={handleTaskUpdate}
          boardMembers={board.members}
          boardLabels={board.labels}
        />
      )}
    </div>
  );
}
