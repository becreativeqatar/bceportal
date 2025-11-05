'use client';

import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserActions } from './user-actions';
import { formatDate, formatDateTime } from '@/lib/date-format';

interface User {
  id: string;
  name: string | null;
  email: string;
  role: string;
  image: string | null;
  isSystemAccount: boolean;
  isTemporaryStaff: boolean;
  createdAt: Date;
  deletedAt: Date | null;
  deletionNotes: string | null;
  deletedBy: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  _count: {
    assets: number;
    subscriptions: number;
  };
}

interface UserListClientProps {
  users: User[];
  currentUserId: string;
}

export function UserListClient({ users, currentUserId }: UserListClientProps) {
  const activeUsers = users.filter(u => !u.deletedAt);
  const deletedUsers = users.filter(u => u.deletedAt);

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'default';
      case 'VALIDATOR':
        return 'destructive';
      case 'EMPLOYEE':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const renderUserTable = (userList: User[], showDeletionInfo = false) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Assets</TableHead>
          <TableHead>Subscriptions</TableHead>
          {showDeletionInfo ? (
            <>
              <TableHead>Deleted On</TableHead>
              <TableHead>Deleted By</TableHead>
            </>
          ) : (
            <TableHead>Created</TableHead>
          )}
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {userList.map((user) => (
          <TableRow key={user.id} className={showDeletionInfo ? 'bg-red-50' : ''}>
            <TableCell className="font-medium">
              <div className="flex items-center gap-2">
                {user.image && (
                  <img
                    src={user.image}
                    alt={user.name || user.email}
                    className="w-8 h-8 rounded-full"
                  />
                )}
                <div>
                  <div className="flex items-center gap-1">
                    {user.isSystemAccount && <span className="text-lg">🏢</span>}
                    {user.name || 'No name'}
                  </div>
                  {user.name && !user.isSystemAccount && (
                    <div className="text-sm text-gray-500 font-mono">{user.email}</div>
                  )}
                </div>
              </div>
            </TableCell>
            <TableCell className="text-base font-mono">
              {!user.name && !user.isSystemAccount && user.email}
            </TableCell>
            <TableCell>
              <Badge variant={getRoleBadgeVariant(user.role)}>
                {user.role}
              </Badge>
            </TableCell>
            <TableCell>
              {user.isSystemAccount ? (
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
                  🏢 System Account
                </Badge>
              ) : user.isTemporaryStaff ? (
                <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-300">
                  Temporary Staff
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                  Regular User
                </Badge>
              )}
            </TableCell>
            <TableCell>
              <Badge variant="outline">
                {user._count.assets} assets
              </Badge>
            </TableCell>
            <TableCell>
              <Badge variant="outline">
                {user._count.subscriptions} subscriptions
              </Badge>
            </TableCell>
            {showDeletionInfo ? (
              <>
                <TableCell>
                  {user.deletedAt && formatDateTime(user.deletedAt)}
                </TableCell>
                <TableCell>
                  {user.deletedBy ? (user.deletedBy.name || user.deletedBy.email) : 'Unknown'}
                </TableCell>
              </>
            ) : (
              <TableCell>
                {formatDate(user.createdAt)}
              </TableCell>
            )}
            <TableCell>
              <UserActions
                userId={user.id}
                userName={user.name || ''}
                userEmail={user.email}
                currentUserId={currentUserId}
                isSystemAccount={user.isSystemAccount}
                isDeleted={!!user.deletedAt}
                deletionNotes={user.deletionNotes}
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  return (
    <Tabs defaultValue="active" className="w-full">
      <TabsList>
        <TabsTrigger value="active">
          Active Users ({activeUsers.length})
        </TabsTrigger>
        <TabsTrigger value="deleted">
          Deleted Users ({deletedUsers.length})
        </TabsTrigger>
      </TabsList>
      <TabsContent value="active" className="mt-4">
        {activeUsers.length > 0 ? (
          renderUserTable(activeUsers, false)
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-600">No active users found</p>
          </div>
        )}
      </TabsContent>
      <TabsContent value="deleted" className="mt-4">
        {deletedUsers.length > 0 ? (
          renderUserTable(deletedUsers, true)
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-600">No deleted users found</p>
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}
