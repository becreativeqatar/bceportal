'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TaskPriorityBadge } from './task-priority-badge';
import { LabelBadge } from './label-badge';
import { DatePicker } from '@/components/ui/date-picker';
import {
  Calendar,
  CheckSquare,
  MessageSquare,
  Paperclip,
  Users,
  Tag,
  Trash2,
  Plus,
  X,
  Loader2,
  Clock,
  ChevronDown,
  ChevronUp,
  Download,
  Edit2,
  FileText,
  Image as ImageIcon,
  File,
  Upload,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { TaskPriority } from '@prisma/client';

interface Attachment {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  createdAt: string;
  uploadedBy: {
    id: string;
    name?: string | null;
  };
}

interface TaskDetailDialogProps {
  taskId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
  boardMembers: {
    role: string;
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }[];
  boardLabels: {
    id: string;
    name: string;
    color: string;
  }[];
}

interface Task {
  id: string;
  title: string;
  description?: string | null;
  priority: TaskPriority;
  dueDate?: string | null;
  isCompleted: boolean;
  createdAt: string;
  updatedAt: string;
  column: {
    id: string;
    title: string;
  };
  assignees: {
    userId: string;
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }[];
  labels: {
    labelId: string;
    label: {
      id: string;
      name: string;
      color: string;
    };
  }[];
  checklist: {
    id: string;
    title: string;
    isCompleted: boolean;
    position: number;
  }[];
  comments: {
    id: string;
    content: string;
    createdAt: string;
    author: {
      id: string;
      name?: string | null;
      image?: string | null;
    };
  }[];
  _count: {
    attachments: number;
  };
}

export function TaskDetailDialog({
  taskId,
  open,
  onOpenChange,
  onUpdate,
  boardMembers,
  boardLabels,
}: TaskDetailDialogProps) {
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Editing states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('MEDIUM');
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [isCompleted, setIsCompleted] = useState(false);

  // Sections visibility
  const [showChecklist, setShowChecklist] = useState(true);
  const [showComments, setShowComments] = useState(true);

  // New items
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const [newComment, setNewComment] = useState('');

  // Attachments
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [showAttachments, setShowAttachments] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Comment editing
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentContent, setEditingCommentContent] = useState('');

  useEffect(() => {
    if (open && taskId) {
      fetchTask();
      fetchAttachments();
    }
  }, [open, taskId]);

  const fetchTask = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/tasks/${taskId}`);
      if (response.ok) {
        const data = await response.json();
        // API returns task directly, not wrapped in { task: ... }
        setTask(data);
        setTitle(data.title);
        setDescription(data.description || '');
        setPriority(data.priority);
        setDueDate(data.dueDate ? new Date(data.dueDate) : undefined);
        setIsCompleted(data.isCompleted);
      }
    } catch (error) {
      console.error('Failed to fetch task:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description: description || null,
          priority,
          dueDate: dueDate?.toISOString() || null,
          isCompleted,
        }),
      });

      if (response.ok) {
        onUpdate();
        fetchTask();
      }
    } catch (error) {
      console.error('Failed to save task:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        onOpenChange(false);
        onUpdate();
      }
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  };

  const handleToggleAssignee = async (userId: string) => {
    if (!task) return;

    const currentAssignees = task.assignees.map((a) => a.userId);
    const newAssignees = currentAssignees.includes(userId)
      ? currentAssignees.filter((id) => id !== userId)
      : [...currentAssignees, userId];

    try {
      await fetch(`/api/tasks/${taskId}/assignees`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assigneeIds: newAssignees }),
      });
      fetchTask();
      onUpdate();
    } catch (error) {
      console.error('Failed to update assignees:', error);
    }
  };

  const handleToggleLabel = async (labelId: string) => {
    if (!task) return;

    const currentLabels = task.labels.map((l) => l.labelId);
    const newLabels = currentLabels.includes(labelId)
      ? currentLabels.filter((id) => id !== labelId)
      : [...currentLabels, labelId];

    try {
      await fetch(`/api/tasks/${taskId}/labels`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ labelIds: newLabels }),
      });
      fetchTask();
      onUpdate();
    } catch (error) {
      console.error('Failed to update labels:', error);
    }
  };

  const handleAddChecklistItem = async () => {
    if (!newChecklistItem.trim()) return;

    try {
      await fetch(`/api/tasks/${taskId}/checklist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newChecklistItem.trim() }),
      });
      setNewChecklistItem('');
      fetchTask();
      onUpdate();
    } catch (error) {
      console.error('Failed to add checklist item:', error);
    }
  };

  const handleToggleChecklistItem = async (itemId: string, completed: boolean) => {
    try {
      await fetch(`/api/tasks/${taskId}/checklist/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isCompleted: completed }),
      });
      fetchTask();
      onUpdate();
    } catch (error) {
      console.error('Failed to update checklist item:', error);
    }
  };

  const handleDeleteChecklistItem = async (itemId: string) => {
    try {
      await fetch(`/api/tasks/${taskId}/checklist/${itemId}`, {
        method: 'DELETE',
      });
      fetchTask();
      onUpdate();
    } catch (error) {
      console.error('Failed to delete checklist item:', error);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    try {
      await fetch(`/api/tasks/${taskId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newComment.trim() }),
      });
      setNewComment('');
      fetchTask();
    } catch (error) {
      console.error('Failed to add comment:', error);
    }
  };

  const handleEditComment = async (commentId: string) => {
    if (!editingCommentContent.trim()) return;

    try {
      await fetch(`/api/tasks/${taskId}/comments/${commentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editingCommentContent.trim() }),
      });
      setEditingCommentId(null);
      setEditingCommentContent('');
      fetchTask();
    } catch (error) {
      console.error('Failed to edit comment:', error);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Are you sure you want to delete this comment?')) return;

    try {
      await fetch(`/api/tasks/${taskId}/comments/${commentId}`, {
        method: 'DELETE',
      });
      fetchTask();
    } catch (error) {
      console.error('Failed to delete comment:', error);
    }
  };

  const fetchAttachments = async () => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/attachments`);
      if (response.ok) {
        const data = await response.json();
        setAttachments(data.attachments || []);
      }
    } catch (error) {
      console.error('Failed to fetch attachments:', error);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingAttachment(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`/api/tasks/${taskId}/attachments`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        fetchAttachments();
        fetchTask(); // Update _count
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to upload file');
      }
    } catch (error) {
      console.error('Failed to upload attachment:', error);
    } finally {
      setUploadingAttachment(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDownloadAttachment = async (attachmentId: string) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/attachments/${attachmentId}`);
      if (response.ok) {
        const data = await response.json();
        window.open(data.downloadUrl, '_blank');
      }
    } catch (error) {
      console.error('Failed to download attachment:', error);
    }
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    if (!confirm('Are you sure you want to delete this attachment?')) return;

    try {
      await fetch(`/api/tasks/${taskId}/attachments/${attachmentId}`, {
        method: 'DELETE',
      });
      fetchAttachments();
      fetchTask(); // Update _count
    } catch (error) {
      console.error('Failed to delete attachment:', error);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return ImageIcon;
    if (mimeType === 'application/pdf') return FileText;
    return File;
  };

  const checklistProgress = task?.checklist
    ? {
        completed: task.checklist.filter((i) => i.isCompleted).length,
        total: task.checklist.length,
      }
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : task ? (
          <>
            <DialogHeader className="space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex-1 pr-4">
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    onBlur={handleSave}
                    className="text-xl font-semibold border-0 px-0 focus-visible:ring-0"
                    placeholder="Task title"
                  />
                  <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                    <span>in {task.column.title}</span>
                    {task.isCompleted && (
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        Completed
                      </Badge>
                    )}
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={handleDelete}>
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            </DialogHeader>

            <div className="grid grid-cols-3 gap-6 mt-4">
              {/* Main content */}
              <div className="col-span-2 space-y-6">
                {/* Description */}
                <div>
                  <Label className="text-sm font-medium text-gray-700">Description</Label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    onBlur={handleSave}
                    placeholder="Add a description..."
                    className="mt-2"
                    rows={3}
                  />
                </div>

                {/* Labels */}
                <div>
                  <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <Tag className="h-4 w-4" />
                    Labels
                  </Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {boardLabels.map((label) => {
                      const isSelected = task.labels.some((l) => l.labelId === label.id);
                      return (
                        <button
                          key={label.id}
                          onClick={() => handleToggleLabel(label.id)}
                          className={`transition-opacity ${isSelected ? '' : 'opacity-40 hover:opacity-70'}`}
                        >
                          <LabelBadge name={label.name} color={label.color} />
                        </button>
                      );
                    })}
                    {boardLabels.length === 0 && (
                      <span className="text-sm text-gray-400">No labels available</span>
                    )}
                  </div>
                </div>

                {/* Checklist */}
                <div>
                  <button
                    onClick={() => setShowChecklist(!showChecklist)}
                    className="flex items-center gap-2 text-sm font-medium text-gray-700 w-full"
                  >
                    <CheckSquare className="h-4 w-4" />
                    Checklist
                    {checklistProgress && checklistProgress.total > 0 && (
                      <span className="text-gray-500">
                        ({checklistProgress.completed}/{checklistProgress.total})
                      </span>
                    )}
                    {showChecklist ? (
                      <ChevronUp className="h-4 w-4 ml-auto" />
                    ) : (
                      <ChevronDown className="h-4 w-4 ml-auto" />
                    )}
                  </button>

                  {showChecklist && (
                    <div className="mt-2 space-y-2">
                      {/* Progress bar */}
                      {checklistProgress && checklistProgress.total > 0 && (
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-green-600 h-2 rounded-full transition-all"
                            style={{
                              width: `${(checklistProgress.completed / checklistProgress.total) * 100}%`,
                            }}
                          />
                        </div>
                      )}

                      {/* Items */}
                      {task.checklist.map((item) => (
                        <div key={item.id} className="flex items-center gap-2 group">
                          <Checkbox
                            checked={item.isCompleted}
                            onCheckedChange={(checked) =>
                              handleToggleChecklistItem(item.id, checked as boolean)
                            }
                          />
                          <span
                            className={`flex-1 text-sm ${
                              item.isCompleted ? 'line-through text-gray-400' : ''
                            }`}
                          >
                            {item.title}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                            onClick={() => handleDeleteChecklistItem(item.id)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}

                      {/* Add item */}
                      <div className="flex items-center gap-2">
                        <Input
                          placeholder="Add an item..."
                          value={newChecklistItem}
                          onChange={(e) => setNewChecklistItem(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleAddChecklistItem()}
                          className="h-8 text-sm"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleAddChecklistItem}
                          disabled={!newChecklistItem.trim()}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Comments */}
                <div>
                  <button
                    onClick={() => setShowComments(!showComments)}
                    className="flex items-center gap-2 text-sm font-medium text-gray-700 w-full"
                  >
                    <MessageSquare className="h-4 w-4" />
                    Comments ({task.comments.length})
                    {showComments ? (
                      <ChevronUp className="h-4 w-4 ml-auto" />
                    ) : (
                      <ChevronDown className="h-4 w-4 ml-auto" />
                    )}
                  </button>

                  {showComments && (
                    <div className="mt-2 space-y-3">
                      {/* Add comment */}
                      <div className="flex gap-2">
                        <Textarea
                          placeholder="Write a comment..."
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          className="flex-1"
                          rows={2}
                        />
                        <Button onClick={handleAddComment} disabled={!newComment.trim()}>
                          Post
                        </Button>
                      </div>

                      {/* Comment list */}
                      {task.comments.map((comment) => (
                        <div key={comment.id} className="flex gap-3 p-3 bg-gray-50 rounded-lg group">
                          <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-xs font-medium flex-shrink-0">
                            {comment.author.image ? (
                              <img
                                src={comment.author.image}
                                alt=""
                                className="w-full h-full rounded-full object-cover"
                              />
                            ) : (
                              comment.author.name?.charAt(0).toUpperCase() || '?'
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">
                                {comment.author.name || 'Unknown'}
                              </span>
                              <span className="text-xs text-gray-500">
                                {formatDistanceToNow(new Date(comment.createdAt), {
                                  addSuffix: true,
                                })}
                              </span>
                              <div className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                  onClick={() => {
                                    setEditingCommentId(comment.id);
                                    setEditingCommentContent(comment.content);
                                  }}
                                >
                                  <Edit2 className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 text-red-500 hover:text-red-600"
                                  onClick={() => handleDeleteComment(comment.id)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                            {editingCommentId === comment.id ? (
                              <div className="mt-2">
                                <Textarea
                                  value={editingCommentContent}
                                  onChange={(e) => setEditingCommentContent(e.target.value)}
                                  rows={2}
                                  className="text-sm"
                                />
                                <div className="flex gap-2 mt-2">
                                  <Button
                                    size="sm"
                                    onClick={() => handleEditComment(comment.id)}
                                    disabled={!editingCommentContent.trim()}
                                  >
                                    Save
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setEditingCommentId(null);
                                      setEditingCommentContent('');
                                    }}
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <p className="text-sm text-gray-700 mt-1">{comment.content}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Sidebar */}
              <div className="space-y-4">
                {/* Status */}
                <div>
                  <Label className="text-sm font-medium text-gray-700">Status</Label>
                  <div className="mt-2">
                    <Button
                      variant={isCompleted ? 'default' : 'outline'}
                      size="sm"
                      className="w-full"
                      onClick={() => {
                        setIsCompleted(!isCompleted);
                        setTimeout(handleSave, 0);
                      }}
                    >
                      {isCompleted ? 'Mark Incomplete' : 'Mark Complete'}
                    </Button>
                  </div>
                </div>

                {/* Priority */}
                <div>
                  <Label className="text-sm font-medium text-gray-700">Priority</Label>
                  <Select
                    value={priority}
                    onValueChange={(value: TaskPriority) => {
                      setPriority(value);
                      setTimeout(handleSave, 0);
                    }}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LOW">Low</SelectItem>
                      <SelectItem value="MEDIUM">Medium</SelectItem>
                      <SelectItem value="HIGH">High</SelectItem>
                      <SelectItem value="URGENT">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Due Date */}
                <div>
                  <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Due Date
                  </Label>
                  <div className="mt-2">
                    <DatePicker
                      value={dueDate ? format(dueDate, 'yyyy-MM-dd') : ''}
                      onChange={(value) => {
                        setDueDate(value ? new Date(value) : undefined);
                        setTimeout(handleSave, 0);
                      }}
                    />
                  </div>
                </div>

                {/* Assignees */}
                <div>
                  <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Assignees
                  </Label>
                  <div className="mt-2 space-y-2 max-h-48 overflow-y-auto">
                    {boardMembers.map(({ user }) => {
                      const isAssigned = task.assignees.some((a) => a.userId === user.id);
                      return (
                        <button
                          key={user.id}
                          onClick={() => handleToggleAssignee(user.id)}
                          className={`flex items-center gap-2 w-full p-2 rounded-md transition-colors ${
                            isAssigned ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-100'
                          }`}
                        >
                          <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center text-xs font-medium">
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
                          <span className="text-sm truncate">{user.name || user.email}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Attachments */}
                <div>
                  <button
                    onClick={() => setShowAttachments(!showAttachments)}
                    className="flex items-center gap-2 text-sm font-medium text-gray-700 w-full"
                  >
                    <Paperclip className="h-4 w-4" />
                    Attachments ({attachments.length})
                    {showAttachments ? (
                      <ChevronUp className="h-4 w-4 ml-auto" />
                    ) : (
                      <ChevronDown className="h-4 w-4 ml-auto" />
                    )}
                  </button>

                  {showAttachments && (
                    <div className="mt-2 space-y-2">
                      {/* Upload button */}
                      <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        onChange={handleFileUpload}
                        accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingAttachment}
                      >
                        {uploadingAttachment ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4 mr-2" />
                            Upload File
                          </>
                        )}
                      </Button>

                      {/* Attachment list */}
                      {attachments.length > 0 && (
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {attachments.map((attachment) => {
                            const FileIcon = getFileIcon(attachment.mimeType);
                            return (
                              <div
                                key={attachment.id}
                                className="flex items-center gap-2 p-2 bg-gray-50 rounded-md group"
                              >
                                <FileIcon className="h-4 w-4 text-gray-500 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-medium truncate">
                                    {attachment.fileName}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {formatFileSize(attachment.fileSize)}
                                  </p>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0"
                                    onClick={() => handleDownloadAttachment(attachment.id)}
                                  >
                                    <Download className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 text-red-500 hover:text-red-600 opacity-0 group-hover:opacity-100"
                                    onClick={() => handleDeleteAttachment(attachment.id)}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Meta info */}
                <div className="pt-4 border-t text-xs text-gray-500 space-y-1">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Created {formatDistanceToNow(new Date(task.createdAt), { addSuffix: true })}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Updated {formatDistanceToNow(new Date(task.updatedAt), { addSuffix: true })}
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-12 text-gray-500">Task not found</div>
        )}
      </DialogContent>
    </Dialog>
  );
}
