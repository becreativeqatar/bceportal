'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  LayoutDashboard,
  List,
  Calendar,
  Settings,
  RefreshCw,
  Users,
  MoreHorizontal,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface BoardHeaderProps {
  board: {
    id: string;
    title: string;
    description?: string | null;
    isArchived: boolean;
    members: {
      role: string;
      user: {
        id: string;
        name?: string | null;
        image?: string | null;
      };
    }[];
  };
  onRefresh?: () => void;
}

export function BoardHeader({ board, onRefresh }: BoardHeaderProps) {
  const pathname = usePathname();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await onRefresh?.();
    setTimeout(() => setRefreshing(false), 500);
  };

  const isActive = (path: string) => {
    if (path === '') {
      return pathname === `/admin/tasks/boards/${board.id}`;
    }
    return pathname === `/admin/tasks/boards/${board.id}/${path}`;
  };

  return (
    <div className="border-b bg-white">
      <div className="px-4 py-3">
        {/* Top row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <Link
              href="/admin/tasks/boards"
              className="text-gray-500 hover:text-gray-700"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-gray-900">{board.title}</h1>
                {board.isArchived && (
                  <Badge variant="secondary">Archived</Badge>
                )}
              </div>
              {board.description && (
                <p className="text-sm text-gray-500 mt-0.5">{board.description}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Member avatars */}
            <div className="flex -space-x-2 mr-2">
              {board.members.slice(0, 4).map(({ user }) => (
                <div
                  key={user.id}
                  className="w-8 h-8 rounded-full bg-gray-300 border-2 border-white flex items-center justify-center text-xs font-medium text-gray-700"
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
              {board.members.length > 4 && (
                <div className="w-8 h-8 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-xs font-medium text-gray-600">
                  +{board.members.length - 4}
                </div>
              )}
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>

            <Link href={`/admin/tasks/boards/${board.id}/settings`}>
              <Button variant="ghost" size="sm">
                <Settings className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>

        {/* View tabs */}
        <div className="flex items-center gap-1">
          <Link href={`/admin/tasks/boards/${board.id}`}>
            <Button
              variant={isActive('') ? 'secondary' : 'ghost'}
              size="sm"
              className="gap-2"
            >
              <LayoutDashboard className="h-4 w-4" />
              Board
            </Button>
          </Link>
          <Link href={`/admin/tasks/boards/${board.id}/list`}>
            <Button
              variant={isActive('list') ? 'secondary' : 'ghost'}
              size="sm"
              className="gap-2"
            >
              <List className="h-4 w-4" />
              List
            </Button>
          </Link>
          <Link href={`/admin/tasks/boards/${board.id}/calendar`}>
            <Button
              variant={isActive('calendar') ? 'secondary' : 'ghost'}
              size="sm"
              className="gap-2"
            >
              <Calendar className="h-4 w-4" />
              Calendar
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
