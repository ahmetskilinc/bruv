"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { SidebarSimple } from "@phosphor-icons/react";
import {
  AppHeader,
  Button,
  Sidebar,
  useSidebar,
  type SidebarLinkComponent,
} from "bruv-ui";
import { AppSidebar } from "@/components/app-sidebar";

// Adapter so bruv-ui's Sidebar can navigate via Next's Link (its href type
// differs from the generic link contract bruv expects).
const LinkAdapter: SidebarLinkComponent = ({
  href,
  to,
  className,
  children,
  ...rest
}) => (
  <Link href={href ?? to ?? "#"} className={className} {...rest}>
    {children}
  </Link>
);

// Always-visible toggle that lives in the top header. On desktop it
// collapses/expands the sidebar; on mobile it opens/closes the drawer.
function SidebarToggle() {
  const { collapsed, toggle, mobile, mobileOpen, setMobileOpen } = useSidebar();
  return (
    <Button
      variant="transparent"
      iconLeft={<SidebarSimple />}
      aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      onClick={() => (mobile ? setMobileOpen(!mobileOpen) : toggle())}
    />
  );
}

export function DashboardShell({ children }: { children: ReactNode }) {
  return (
    <Sidebar.Provider linkComponent={LinkAdapter}>
      <div className="flex h-svh overflow-hidden">
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <AppHeader className="shrink-0 border-b">
            <SidebarToggle />
          </AppHeader>
          <main className="min-h-0 flex-1 overflow-hidden">{children}</main>
        </div>
      </div>
    </Sidebar.Provider>
  );
}
