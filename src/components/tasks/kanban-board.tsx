'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { ColumnContainer } from './column-container';
import { TaskCardOverlay } from './task-card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

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

interface KanbanBoardProps {
  boardId: string;
  columns: Column[];
  onTaskClick?: (task: Task) => void;
  onAddTask?: (columnId: string) => void;
  onAddColumn?: () => void;
  onTaskMove?: (taskId: string, targetColumnId: string, position: number) => Promise<void>;
  onColumnReorder?: (columnIds: string[]) => Promise<void>;
  onTaskReorder?: (columnId: string, taskIds: string[]) => Promise<void>;
  onUpdateColumn?: (columnId: string, title: string) => Promise<void>;
  onDeleteColumn?: (columnId: string) => Promise<void>;
}

export function KanbanBoard({
  boardId,
  columns,
  onTaskClick,
  onAddTask,
  onAddColumn,
  onTaskMove,
  onColumnReorder,
  onTaskReorder,
  onUpdateColumn,
  onDeleteColumn,
}: KanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<'column' | 'task' | null>(null);
  const [localColumns, setLocalColumns] = useState(columns);

  // Update local state when props change
  useEffect(() => {
    setLocalColumns(columns);
  }, [columns]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const findTask = (taskId: string): Task | undefined => {
    for (const column of localColumns) {
      const task = column.tasks.find((t) => t.id === taskId);
      if (task) return task;
    }
    return undefined;
  };

  const findColumnByTaskId = (taskId: string): Column | undefined => {
    return localColumns.find((col) => col.tasks.some((t) => t.id === taskId));
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const type = active.data.current?.type as 'column' | 'task';
    setActiveId(active.id as string);
    setActiveType(type);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeType = active.data.current?.type;
    const overType = over.data.current?.type;

    if (activeType !== 'task') return;

    const activeTaskId = active.id as string;
    const overId = over.id as string;

    const activeColumn = findColumnByTaskId(activeTaskId);
    if (!activeColumn) return;

    let overColumn: Column | undefined;
    let overIndex: number;

    if (overType === 'column') {
      // Dropping directly on a column
      overColumn = localColumns.find((col) => col.id === overId);
      overIndex = overColumn?.tasks.length ?? 0;
    } else if (overType === 'task') {
      // Dropping on another task
      overColumn = findColumnByTaskId(overId);
      overIndex = overColumn?.tasks.findIndex((t) => t.id === overId) ?? 0;
    }

    if (!overColumn) return;

    // Only update if moving to different column
    if (activeColumn.id !== overColumn.id) {
      setLocalColumns((prevColumns) => {
        const activeColumnIndex = prevColumns.findIndex((c) => c.id === activeColumn.id);
        const overColumnIndex = prevColumns.findIndex((c) => c.id === overColumn!.id);

        const activeTaskIndex = prevColumns[activeColumnIndex].tasks.findIndex(
          (t) => t.id === activeTaskId
        );
        const task = prevColumns[activeColumnIndex].tasks[activeTaskIndex];

        const newColumns = [...prevColumns];

        // Remove from source column
        newColumns[activeColumnIndex] = {
          ...newColumns[activeColumnIndex],
          tasks: newColumns[activeColumnIndex].tasks.filter((t) => t.id !== activeTaskId),
        };

        // Add to target column
        const newTasks = [...newColumns[overColumnIndex].tasks];
        newTasks.splice(overIndex, 0, task);
        newColumns[overColumnIndex] = {
          ...newColumns[overColumnIndex],
          tasks: newTasks,
        };

        return newColumns;
      });
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) {
      setActiveId(null);
      setActiveType(null);
      return;
    }

    const activeType = active.data.current?.type;

    if (activeType === 'column') {
      // Reorder columns
      const oldIndex = localColumns.findIndex((c) => c.id === active.id);
      const newIndex = localColumns.findIndex((c) => c.id === over.id);

      if (oldIndex !== newIndex) {
        const newOrder = arrayMove(localColumns, oldIndex, newIndex);
        setLocalColumns(newOrder);
        try {
          await onColumnReorder?.(newOrder.map((c) => c.id));
        } catch (error) {
          // Revert on error
          setLocalColumns(columns);
        }
      }
    } else if (activeType === 'task') {
      const activeTaskId = active.id as string;
      const overType = over.data.current?.type;

      let targetColumnId: string;
      let targetIndex: number;

      if (overType === 'column') {
        targetColumnId = over.id as string;
        const targetColumn = localColumns.find((c) => c.id === targetColumnId);
        targetIndex = targetColumn?.tasks.length ?? 0;
      } else {
        const overColumn = findColumnByTaskId(over.id as string);
        targetColumnId = overColumn?.id ?? '';
        targetIndex = overColumn?.tasks.findIndex((t) => t.id === over.id) ?? 0;
      }

      // Check if the task is now in target column (from dragOver)
      const taskColumn = findColumnByTaskId(activeTaskId);
      if (taskColumn?.id === targetColumnId) {
        // Reorder within same column
        const taskIndex = taskColumn.tasks.findIndex((t) => t.id === activeTaskId);
        if (taskIndex !== targetIndex && taskIndex !== -1) {
          const newTasks = arrayMove(taskColumn.tasks, taskIndex, targetIndex);
          const newColumns = localColumns.map((col) =>
            col.id === targetColumnId ? { ...col, tasks: newTasks } : col
          );
          setLocalColumns(newColumns);
          try {
            await onTaskReorder?.(targetColumnId, newTasks.map((t) => t.id));
          } catch (error) {
            setLocalColumns(columns);
          }
        }
      } else {
        // Move was handled in dragOver, just persist
        try {
          await onTaskMove?.(activeTaskId, targetColumnId, targetIndex);
        } catch (error) {
          setLocalColumns(columns);
        }
      }
    }

    setActiveId(null);
    setActiveType(null);
  };

  const activeTask = activeId && activeType === 'task' ? findTask(activeId) : null;
  const activeColumn = activeId && activeType === 'column'
    ? localColumns.find((c) => c.id === activeId)
    : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4 min-h-[calc(100vh-250px)]">
        <SortableContext
          items={localColumns.map((c) => c.id)}
          strategy={horizontalListSortingStrategy}
        >
          {localColumns.map((column) => (
            <ColumnContainer
              key={column.id}
              column={column}
              onTaskClick={onTaskClick}
              onAddTask={onAddTask}
              onUpdateColumn={onUpdateColumn}
              onDeleteColumn={onDeleteColumn}
            />
          ))}
        </SortableContext>

        {/* Add column button */}
        <div className="min-w-[280px]">
          <Button
            variant="outline"
            className="w-full h-12 border-dashed"
            onClick={onAddColumn}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Column
          </Button>
        </div>
      </div>

      <DragOverlay>
        {activeTask && <TaskCardOverlay task={activeTask} />}
        {activeColumn && (
          <div className="w-80 bg-gray-100 rounded-lg p-3 shadow-lg opacity-80">
            <h3 className="font-semibold text-gray-900">{activeColumn.title}</h3>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
