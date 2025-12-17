'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Plus,
  Search,
  LayoutDashboard,
  Users,
  Calendar,
  MoreHorizontal,
  Archive,
  Trash2,
  Settings,
  Loader2,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';

interface Board {
  id: string;
  title: string;
  description?: string | null;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  owner: {
    id: string;
    name?: string | null;
  };
  _count: {
    columns: number;
    members: number;
  };
  members: {
    role: string;
    user: {
      id: string;
      name?: string | null;
      image?: string | null;
    };
  }[];
}

export default function BoardsPage() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showArchived, setShowArchived] = useState(false);

  useEffect(() => {
    fetchBoards();
  }, [showArchived]);

  const fetchBoards = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (showArchived) params.append('includeArchived', 'true');

      const response = await fetch(`/api/boards?${params}`);
      if (response.ok) {
        const data = await response.json();
        setBoards(data.boards);
      }
    } catch (error) {
      console.error('Failed to fetch boards:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleArchiveBoard = async (boardId: string, archive: boolean) => {
    try {
      const response = await fetch(`/api/boards/${boardId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isArchived: archive }),
      });

      if (response.ok) {
        fetchBoards();
      }
    } catch (error) {
      console.error('Failed to archive board:', error);
    }
  };

  const handleDeleteBoard = async (boardId: string) => {
    if (!confirm('Are you sure you want to delete this board? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/boards/${boardId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchBoards();
      }
    } catch (error) {
      console.error('Failed to delete board:', error);
    }
  };

  const filteredBoards = boards.filter((board) => {
    const matchesSearch = board.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      board.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesArchived = showArchived || !board.isArchived;
    return matchesSearch && matchesArchived;
  });

  const activeBoards = filteredBoards.filter((b) => !b.isArchived);
  const archivedBoards = filteredBoards.filter((b) => b.isArchived);

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Task Boards</h1>
            <p className="text-gray-600 mt-1">
              Manage your projects and collaborate with your team
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/admin/tasks">
              <Button variant="outline">
                <LayoutDashboard className="h-4 w-4 mr-2" />
                My Tasks
              </Button>
            </Link>
            <Link href="/admin/tasks/boards/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Board
              </Button>
            </Link>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex-1 min-w-[200px] max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search boards..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <Button
            variant={showArchived ? 'default' : 'outline'}
            onClick={() => setShowArchived(!showArchived)}
          >
            <Archive className="h-4 w-4 mr-2" />
            {showArchived ? 'Hide Archived' : 'Show Archived'}
          </Button>
        </div>

        {/* Board Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : filteredBoards.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <LayoutDashboard className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No boards found</h3>
              <p className="text-gray-500 mb-4">
                {searchTerm
                  ? 'Try adjusting your search terms'
                  : 'Create your first board to get started'}
              </p>
              {!searchTerm && (
                <Link href="/admin/tasks/boards/new">
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Board
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {/* Active Boards */}
            {activeBoards.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Active Boards ({activeBoards.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {activeBoards.map((board) => (
                    <BoardCard
                      key={board.id}
                      board={board}
                      onArchive={() => handleArchiveBoard(board.id, true)}
                      onDelete={() => handleDeleteBoard(board.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Archived Boards */}
            {showArchived && archivedBoards.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-gray-500 mb-4">
                  Archived ({archivedBoards.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {archivedBoards.map((board) => (
                    <BoardCard
                      key={board.id}
                      board={board}
                      onArchive={() => handleArchiveBoard(board.id, false)}
                      onDelete={() => handleDeleteBoard(board.id)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function BoardCard({
  board,
  onArchive,
  onDelete,
}: {
  board: Board;
  onArchive: () => void;
  onDelete: () => void;
}) {
  return (
    <Card className={`hover:shadow-md transition-shadow ${board.isArchived ? 'opacity-60' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <Link href={`/admin/tasks/boards/${board.id}`} className="flex-1">
            <CardTitle className="text-lg hover:text-blue-600 transition-colors">
              {board.title}
            </CardTitle>
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/admin/tasks/boards/${board.id}/settings`}>
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onArchive}>
                <Archive className="h-4 w-4 mr-2" />
                {board.isArchived ? 'Restore' : 'Archive'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDelete} className="text-red-600">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {board.description && (
          <p className="text-sm text-gray-500 line-clamp-2 mt-1">{board.description}</p>
        )}
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center justify-between text-sm text-gray-500">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <LayoutDashboard className="h-4 w-4" />
              <span>{board._count.columns} columns</span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              <span>{board._count.members}</span>
            </div>
          </div>
        </div>

        {/* Member avatars */}
        {board.members.length > 0 && (
          <div className="flex items-center mt-3">
            <div className="flex -space-x-2">
              {board.members.slice(0, 5).map(({ user }) => (
                <div
                  key={user.id}
                  className="w-7 h-7 rounded-full bg-gray-300 border-2 border-white flex items-center justify-center text-xs font-medium text-gray-700"
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
              {board.members.length > 5 && (
                <div className="w-7 h-7 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-xs font-medium text-gray-600">
                  +{board.members.length - 5}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex items-center gap-1 mt-3 text-xs text-gray-400">
          <Calendar className="h-3 w-3" />
          <span>Updated {formatDistanceToNow(new Date(board.updatedAt), { addSuffix: true })}</span>
        </div>
      </CardContent>
    </Card>
  );
}
