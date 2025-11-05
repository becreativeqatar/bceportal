import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { Role } from '@prisma/client';

export default async function AccreditationPage() {
  const session = await getServerSession(authOptions);

  if (process.env.NODE_ENV !== 'development' && (!session || session.user.role !== Role.ADMIN)) {
    redirect('/login');
  }

  // Redirect to projects page as it's now the main accreditation view
  redirect('/admin/accreditation/projects');
}
