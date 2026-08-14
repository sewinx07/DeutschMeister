import {
  BarChart3,
  BookOpen,
  Briefcase,
  CalendarDays,
  FolderGit2,
  GraduationCap,
  Headphones,
  LayoutDashboard,
  Languages,
  Megaphone,
  MessageSquareText,
  Mic,
  Newspaper,
  PenLine,
  Send,
  Target,
  UserRound,
  Settings,
} from 'lucide-react';

export interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { title: 'Study Plan', href: '/plan', icon: CalendarDays },
      { title: 'Progress', href: '/progress', icon: BarChart3 },
    ],
  },
  {
    label: 'German Skills',
    items: [
      { title: 'German Skills', href: '/skills', icon: Languages },
      { title: 'Vocabulary', href: '/vocabulary', icon: BookOpen },
      { title: 'Grammar', href: '/grammar', icon: GraduationCap },
      { title: 'Listening', href: '/listening', icon: Headphones },
      { title: 'Reading', href: '/reading', icon: Newspaper },
      { title: 'Writing', href: '/writing', icon: PenLine },
      { title: 'Speaking', href: '/speaking', icon: Mic },
    ],
  },
  {
    label: 'Exams & Coach',
    items: [
      { title: 'Mock Exams', href: '/mock-exams', icon: Target },
      { title: 'Mistake Bank', href: '/mistakes', icon: Megaphone },
      { title: 'AI Coach', href: '/coach', icon: MessageSquareText },
    ],
  },
  {
    label: 'Career',
    items: [
      { title: 'Ausbildung', href: '/ausbildung', icon: Briefcase },
      { title: 'IT Skills & Portfolio', href: '/it-skills', icon: FolderGit2 },
      { title: 'Applications', href: '/applications', icon: Send },
      { title: 'Profile', href: '/settings', icon: UserRound },
    ],
  },
];

export const ALL_NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);

export const MOBILE_PRIMARY: NavItem[] = [
  { title: 'Home', href: '/dashboard', icon: LayoutDashboard },
  { title: 'Plan', href: '/plan', icon: CalendarDays },
  { title: 'German', href: '/skills', icon: Languages },
  { title: 'Coach', href: '/coach', icon: MessageSquareText },
  { title: 'Career', href: '/ausbildung', icon: Briefcase },
];

export const ALL_NAV_ITEMS_WITH_SETTINGS: NavItem[] = [
  ...ALL_NAV_ITEMS,
  { title: 'Settings', href: '/settings', icon: Settings },
];
