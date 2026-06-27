"use client";

import { useRouter } from "next/navigation";
import {
  SignOut,
  PuzzlePiece,
  GearSix,
  ShieldCheck,
} from "@phosphor-icons/react";
import { useSession, signOut } from "@/lib/auth-client";
import { Avatar, DropdownMenu } from "bruv-ui";

export function UserMenu() {
  const { data } = useSession();
  const router = useRouter();
  const user = data?.user;
  const initial = (user?.name ?? user?.email ?? "?").slice(0, 1).toUpperCase();
  const isAdmin = user?.email?.toLowerCase() === "akx9@icloud.com";

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger className="hover:bg-sidebar-accent flex w-full items-center gap-2 rounded-md p-1.5 text-left">
        <Avatar initials={initial} className="size-7" />
        <span className="truncate text-sm">
          {user?.name ?? user?.email ?? "account"}
        </span>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content align="start" className="w-56">
        {user?.email && (
          <DropdownMenu.Group>
            <DropdownMenu.Label className="truncate font-normal">
              {user.email}
            </DropdownMenu.Label>
          </DropdownMenu.Group>
        )}
        <DropdownMenu.Separator />
        <DropdownMenu.Group>
          <DropdownMenu.Item onClick={() => router.push("/settings/profile")} icon={<GearSix />}>
            profile
          </DropdownMenu.Item>
          <DropdownMenu.Item onClick={() => router.push("/settings/integrations")} icon={<PuzzlePiece />}>
            integrations
          </DropdownMenu.Item>
        </DropdownMenu.Group>
        {isAdmin && (
          <>
            <DropdownMenu.Separator />
            <DropdownMenu.Group>
              <DropdownMenu.Item onClick={() => router.push("/admin")} icon={<ShieldCheck />}>
                admin
              </DropdownMenu.Item>
            </DropdownMenu.Group>
          </>
        )}
        <DropdownMenu.Separator />
        <DropdownMenu.Group>
          <DropdownMenu.Item
            onClick={async () => {
              await signOut();
              router.push("/login");
            }}
            icon={<SignOut />}
          >
            sign out
          </DropdownMenu.Item>
        </DropdownMenu.Group>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
}
