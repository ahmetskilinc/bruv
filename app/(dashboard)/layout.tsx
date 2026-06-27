import type { ReactNode } from "react";
import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";
import { getServerSession } from "@/lib/server/session";
import { listThreadsForUser } from "@/lib/server/threads";
import { DashboardShell } from "@/components/dashboard-shell";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  // Prefetch the thread list on the server so the sidebar paints with data on
  // first render instead of fetching it after hydration.
  const queryClient = new QueryClient();
  const session = await getServerSession();
  if (session?.user) {
    await queryClient.prefetchQuery({
      queryKey: ["threads"],
      queryFn: () => listThreadsForUser(session.user.id),
    });
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <DashboardShell>{children}</DashboardShell>
    </HydrationBoundary>
  );
}
