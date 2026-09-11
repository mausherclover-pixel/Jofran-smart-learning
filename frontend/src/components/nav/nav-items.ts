import type { Role } from '@/types/api';
import { BarChart3, LayoutDashboard, School } from 'lucide-react';

export interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
}

// One nav config per role — the sidebar is never a single generic menu with
// items hidden by permission; a Student and a Principal are different apps
// that happen to share a design system. Every href here has a real page
// behind it — see frontend/README.md for what's still a Step 4+ follow-up.
export const NAV_ITEMS: Record<Role, NavItem[]> = {
  STUDENT: [
    { href: '/student', label: 'My learning', icon: LayoutDashboard },
    { href: '/student/reports', label: 'My progress', icon: BarChart3 },
  ],
  PARENT: [{ href: '/parent', label: 'My children', icon: LayoutDashboard }],
  TEACHER: [{ href: '/teacher', label: 'My classes', icon: LayoutDashboard }],
  PRINCIPAL: [{ href: '/principal', label: 'School overview', icon: LayoutDashboard }],
  SCHOOL_ADMIN: [{ href: '/principal', label: 'School overview', icon: LayoutDashboard }],
  SUPER_ADMIN: [{ href: '/admin', label: 'Schools', icon: School }],
};
