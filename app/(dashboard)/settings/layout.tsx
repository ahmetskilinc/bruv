import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "@phosphor-icons/react/ssr";
import { SettingsNav } from "@/components/settings/settings-nav";

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex h-full w-full max-w-2xl flex-col gap-6 overflow-y-auto p-6">
      <div>
        <Link
          href="/"
          className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-sm"
        >
          <ArrowLeft className="size-4" />
          back to chat
        </Link>
        <h1 className="mt-2 text-2xl font-semibold lowercase">settings</h1>
      </div>
      <SettingsNav />
      {children}
    </div>
  );
}
