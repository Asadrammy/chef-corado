import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Role } from '@/types';
import { redirect } from 'next/navigation';

export async function requireAuth() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect('/auth/login');
  }
  return session;
}

export async function requireRole(requiredRole: Role | Role[]) {
  const session = await requireAuth();
  const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];

  if (!roles.includes(session.user.role as Role)) {
    redirect('/');
  }

  return session;
}

export async function requireAdmin() {
  return requireRole(Role.ADMIN);
}

export async function requireChef() {
  return requireRole(Role.CHEF);
}

export async function requireClient() {
  return requireRole(Role.CLIENT);
}
