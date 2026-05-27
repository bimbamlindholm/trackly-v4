import {
  BarChart3,
  Bell,
  BriefcaseBusiness,
  CalendarDays,
  Clock3,
  Coffee,
  FileBarChart,
  Home,
  LogOut,
  MoreVertical,
  Settings,
  UserPlus,
  UsersRound,
  WalletCards,
} from "lucide-react";

export const navItems = [
  { icon: Home, label: "Dashboard", to: "/admin-dashboard" },
  { icon: UsersRound, label: "Employees", to: "/admin-dashboard/employees" },
  { icon: Clock3, label: "Attendance", to: "/admin-dashboard/attendance" },
  { icon: BarChart3, label: "Reports", to: "/admin-dashboard/reports" },
  { icon: WalletCards, label: "Payroll", to: "/admin-dashboard/payroll" },
  { icon: CalendarDays, label: "Schedule", to: "/admin-dashboard/schedule" },
  { icon: Coffee, label: "Leaves", to: "/admin-dashboard/leaves" },
  { icon: Settings, label: "Workspace Settings", to: "/admin-dashboard/settings" },
];

export const overviewCards = [
  { icon: UsersRound, label: "Total Employees", value: "24", status: "+2 from yesterday", tone: "cyan" },
  { icon: UserPlus, label: "Present Today", value: "18", status: "75% of employees", tone: "green" },
  { icon: Clock3, label: "Late Today", value: "3", status: "+1 from yesterday", tone: "orange" },
  { icon: Coffee, label: "On Break", value: "2", status: "No change", tone: "purple" },
  { icon: BriefcaseBusiness, label: "Total Work Hours", value: "143h 28m", status: "Total today", tone: "blue" },
];

export const quickActions = [
  { icon: UserPlus, label: "Add Employee" },
  { icon: UsersRound, label: "Invite Member" },
  { icon: CalendarDays, label: "View Attendance" },
  { icon: FileBarChart, label: "Generate Report" },
];

export const activities = [
  { name: "John Dela Cruz", action: "Time In", time: "8:02 AM", status: "Working" },
  { name: "Maria Santos", action: "Break In", time: "12:00 PM", status: "On Break" },
  { name: "Kevin Cruz", action: "Time Out", time: "5:01 PM", status: "Completed" },
  { name: "Jessica Reyes", action: "Time In", time: "8:15 AM", status: "Working" },
  { name: "Paul Garcia", action: "Late", time: "9:05 AM", status: "Late" },
];

export const employees = [
  { employee: "John Dela Cruz", status: "Working", timeIn: "8:02 AM", breakTime: "12:00 PM - 12:45 PM", total: "8h 15m", role: "Admin" },
  { employee: "Maria Santos", status: "On Break", timeIn: "8:10 AM", breakTime: "12:05 PM - ...", total: "4h 55m", role: "Staff" },
  { employee: "Kevin Cruz", status: "Working", timeIn: "8:00 AM", breakTime: "-", total: "8h 30m", role: "Staff" },
  { employee: "Paul Garcia", status: "Late", timeIn: "9:05 AM", breakTime: "-", total: "3h 25m", role: "Staff" },
  { employee: "Jessica Reyes", status: "Offline", timeIn: "-", breakTime: "-", total: "0h 00m", role: "Staff" },
];

export const weeklyAttendance = [
  { day: "Mon", attendance: 18 },
  { day: "Tue", attendance: 20 },
  { day: "Wed", attendance: 19 },
  { day: "Thu", attendance: 21 },
  { day: "Fri", attendance: 17 },
  { day: "Sat", attendance: 8 },
  { day: "Sun", attendance: 0 },
];

// Removed hardcoded fake notifications.
// Real notifications should come from actual workspace/attendance data.
export const notifications = [];

export const bottomNavItems = [
  { icon: Bell, label: "Profile" },
  { icon: LogOut, label: "Logout" },
];

export const MoreIcon = MoreVertical;