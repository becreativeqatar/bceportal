'use client';

import { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X } from 'lucide-react';

interface TaskQuickAddProps {
  columnId: string;
  onSubmit: (title: string, columnId: string) => void;
  onCancel: () => void;
}

export function TaskQuickAdd({ columnId, onSubmit, onCancel }: TaskQuickAddProps) {
  const [title, setTitle] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim()) {
      onSubmit(title.trim(), columnId);
      setTitle('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit}>
            <div className="flex items-center gap-2 mb-4">
              <h3 className="text-lg font-semibold">Quick Add Task</h3>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="ml-auto h-8 w-8 p-0"
                onClick={onCancel}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <Input
              ref={inputRef}
              placeholder="Enter task title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              className="mb-4"
            />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              <Button type="submit" disabled={!title.trim()}>
                Add Task
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
