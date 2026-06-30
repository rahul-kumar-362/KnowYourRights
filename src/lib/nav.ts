import { History, MessageSquarePlus, Settings, type LucideIcon } from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

/** Primary app navigation — shared by the sidebar and the command palette. */
export const NAV: NavItem[] = [
  { label: "New analysis", href: "/chat", icon: MessageSquarePlus },
  { label: "History", href: "/history", icon: History },
  { label: "Settings", href: "/settings", icon: Settings },
];
