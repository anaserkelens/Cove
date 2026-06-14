"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

type HouseholdNavProps = {
  householdId: string;
};

type NavItem = {
  segment: string;
  label: string;
  href: string;
  icon: ReactNode;
};

const iconProps = {
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export function HouseholdNav({ householdId }: HouseholdNavProps) {
  const pathname = usePathname() ?? "";
  const base = `/app/${householdId}`;

  const items: NavItem[] = [
    {
      segment: "dashboard",
      label: "Dashboard",
      href: `${base}/dashboard`,
      icon: (
        <svg {...iconProps}>
          <rect x="3" y="3" width="7" height="9" rx="1.5" />
          <rect x="14" y="3" width="7" height="5" rx="1.5" />
          <rect x="14" y="12" width="7" height="9" rx="1.5" />
          <rect x="3" y="16" width="7" height="5" rx="1.5" />
        </svg>
      ),
    },
    {
      segment: "tasks",
      label: "Tasks",
      href: `${base}/tasks`,
      icon: (
        <svg {...iconProps}>
          <path d="M11 3 4 10l-2-2" />
          <path d="m21 6-9 9-2-2" />
          <path d="M11 18H4" />
          <path d="M21 13v6" />
        </svg>
      ),
    },
    {
      segment: "shopping",
      label: "Shopping",
      href: `${base}/shopping`,
      icon: (
        <svg {...iconProps}>
          <path d="M6 2 3 6v13a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
          <path d="M3 6h18" />
          <path d="M16 10a4 4 0 0 1-8 0" />
        </svg>
      ),
    },
    {
      segment: "calendar",
      label: "Calendar",
      href: `${base}/calendar`,
      icon: (
        <svg {...iconProps}>
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M8 2v4M16 2v4M3 10h18" />
        </svg>
      ),
    },
    {
      segment: "admin",
      label: "Home Admin",
      href: `${base}/admin`,
      icon: (
        <svg {...iconProps}>
          <path d="M3 21h18" />
          <path d="M5 21V8l7-5 7 5v13" />
          <path d="M9 21v-6h6v6" />
        </svg>
      ),
    },
    {
      segment: "reminders",
      label: "Reminders",
      href: `${base}/reminders`,
      icon: (
        <svg {...iconProps}>
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
      ),
    },
    {
      segment: "attachments",
      label: "Attachments",
      href: `${base}/attachments`,
      icon: (
        <svg {...iconProps}>
          <path d="M21.44 11.05 12.25 20.24a5.5 5.5 0 0 1-7.78-7.78l8.49-8.49a3.67 3.67 0 0 1 5.18 5.18l-8.49 8.49a1.83 1.83 0 0 1-2.59-2.59l7.78-7.78" />
        </svg>
      ),
    },
    {
      segment: "members",
      label: "Members",
      href: `${base}/members`,
      icon: (
        <svg {...iconProps}>
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
    },
    {
      segment: "settings",
      label: "Settings",
      href: `${base}/settings`,
      icon: (
        <svg {...iconProps}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
        </svg>
      ),
    },
  ];

  return (
    <nav className="hh-nav" aria-label="Household sections">
      <span className="hh-nav-label">Sections</span>
      {items.map((item) => {
        const isActive =
          pathname === item.href ||
          pathname.startsWith(`${base}/${item.segment}`);

        return (
          <Link
            key={item.segment}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
          >
            {item.icon}
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
