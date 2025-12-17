'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
import { LabelBadge } from '@/components/tasks/label-badge';
import {
  ArrowLeft,
  Loader2,
  Trash2,
  Plus,
  X,
  Users,
  Tag,
  Settings,
  AlertTriangle,
} from 'lucide-react';
import Link from 'next/link';

interface BoardMember {
  userId: string;
  role: string;
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

interface BoardLabel {
  id: string;
  name: string;
  color: string;
}

interface Board {
  id: string;
  title: string;
  description?: string | null;
  isArchived: boolean;
  ownerId: string;
  members: BoardMember[];
  labels: BoardLabel[];
}

const LABEL_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#6b7280', // gray
];

export default function BoardSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const boardId = params.id as string;

  const [board, setBoard] = useState<Board | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  // New member state
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('MEMBER');
  const [addingMember, setAddingMember] = useState(false);

  // New label state
  const [newLabelName, setNewLabelName] = useState('');
  const [newLabelColor, setNewLabelColor] = useState(LABEL_COLORS[0]);
  const [addingLabel, setAddingLabel] = useState(false);

  useEffect(() => {
    fetchBoard();
  }, [boardId]);

  const fetchBoard = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/boards/${boardId}`);
      if (response.ok) {
        const data = await response.json();
        setBoard(data.board);
        setTitle(data.board.title);
        setDescription(data.board.description || '');
      }
    } catch (error) {
      console.error('Failed to fetch board:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDetails = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/boards/${boardId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description: description || null }),
      });

      if (response.ok) {
        fetchBoard();
      }
    } catch (error) {
      console.error('Failed to save board:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleAddMember = async () => {
    if (!newMemberEmail.trim()) return;

    setAddingMember(true);
    try {
      const response = await fetch(`/api/boards/${boardId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newMemberEmail.trim(),
          role: newMemberRole,
        }),
      });

      if (response.ok) {
        setNewMemberEmail('');
        setNewMemberRole('MEMBER');
        fetchBoard();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to add member');
      }
    } catch (error) {
      console.error('Failed to add member:', error);
    } finally {
      setAddingMember(false);
    }
  };

  const handleUpdateMemberRole = async (userId: string, role: string) => {
    try {
      await fetch(`/api/boards/${boardId}/members/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      fetchBoard();
    } catch (error) {
      console.error('Failed to update member:', error);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!confirm('Are you sure you want to remove this member?')) return;

    try {
      await fetch(`/api/boards/${boardId}/members/${userId}`, {
        method: 'DELETE',
      });
      fetchBoard();
    } catch (error) {
      console.error('Failed to remove member:', error);
    }
  };

  const handleAddLabel = async () => {
    if (!newLabelName.trim()) return;

    setAddingLabel(true);
    try {
      const response = await fetch(`/api/boards/${boardId}/labels`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newLabelName.trim(),
          color: newLabelColor,
        }),
      });

      if (response.ok) {
        setNewLabelName('');
        setNewLabelColor(LABEL_COLORS[0]);
        fetchBoard();
      }
    } catch (error) {
      console.error('Failed to add label:', error);
    } finally {
      setAddingLabel(false);
    }
  };

  const handleDeleteLabel = async (labelId: string) => {
    if (!confirm('Are you sure you want to delete this label?')) return;

    try {
      await fetch(`/api/boards/${boardId}/labels/${labelId}`, {
        method: 'DELETE',
      });
      fetchBoard();
    } catch (error) {
      console.error('Failed to delete label:', error);
    }
  };

  const handleDeleteBoard = async () => {
    if (!confirm('Are you sure you want to delete this board? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/boards/${boardId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        router.push('/admin/tasks/boards');
      }
    } catch (error) {
      console.error('Failed to delete board:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!board) {
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
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Back button */}
        <Link
          href={`/admin/tasks/boards/${boardId}`}
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Board
        </Link>

        <h1 className="text-2xl font-bold text-gray-900 mb-6">Board Settings</h1>

        <div className="space-y-6">
          {/* General Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                General
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Board Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>
              <Button onClick={handleSaveDetails} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save Changes
              </Button>
            </CardContent>
          </Card>

          {/* Members */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Members ({board.members.length})
              </CardTitle>
              <CardDescription>Manage who has access to this board</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Add member */}
              <div className="flex gap-2 mb-4">
                <Input
                  placeholder="Email address"
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                  className="flex-1"
                />
                <Select value={newMemberRole} onValueChange={setNewMemberRole}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MEMBER">Member</SelectItem>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={handleAddMember} disabled={addingMember || !newMemberEmail.trim()}>
                  {addingMember ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                </Button>
              </div>

              {/* Member list */}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead className="w-32">Role</TableHead>
                    <TableHead className="w-16"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {board.members.map(({ user, role, userId }) => (
                    <TableRow key={userId}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-sm font-medium">
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
                          <div>
                            <div className="font-medium">{user.name || 'Unknown'}</div>
                            <div className="text-sm text-gray-500">{user.email}</div>
                          </div>
                          {userId === board.ownerId && (
                            <Badge variant="secondary">Owner</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {userId === board.ownerId ? (
                          <span className="text-sm text-gray-500">Owner</span>
                        ) : (
                          <Select
                            value={role}
                            onValueChange={(newRole) => handleUpdateMemberRole(userId, newRole)}
                          >
                            <SelectTrigger className="h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="MEMBER">Member</SelectItem>
                              <SelectItem value="ADMIN">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </TableCell>
                      <TableCell>
                        {userId !== board.ownerId && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveMember(userId)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Labels */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Tag className="h-5 w-5" />
                Labels ({board.labels.length})
              </CardTitle>
              <CardDescription>Create labels to categorize tasks</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Add label */}
              <div className="flex gap-2 mb-4">
                <Input
                  placeholder="Label name"
                  value={newLabelName}
                  onChange={(e) => setNewLabelName(e.target.value)}
                  className="flex-1"
                />
                <div className="flex gap-1">
                  {LABEL_COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => setNewLabelColor(color)}
                      className={`w-8 h-8 rounded-md border-2 ${
                        newLabelColor === color ? 'border-gray-900' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <Button onClick={handleAddLabel} disabled={addingLabel || !newLabelName.trim()}>
                  {addingLabel ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                </Button>
              </div>

              {/* Label list */}
              <div className="space-y-2">
                {board.labels.map((label) => (
                  <div
                    key={label.id}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded-md"
                  >
                    <LabelBadge name={label.name} color={label.color} />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteLabel(label.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                ))}
                {board.labels.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4">
                    No labels yet. Create one above.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-5 w-5" />
                Danger Zone
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Delete this board</p>
                  <p className="text-sm text-gray-500">
                    Once deleted, all columns, tasks, and data will be permanently removed.
                  </p>
                </div>
                <Button variant="destructive" onClick={handleDeleteBoard}>
                  Delete Board
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
