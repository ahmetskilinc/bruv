"use client";

import { useRouter } from "next/navigation";
import {
  SignOut,
  PuzzlePiece,
  GearSix,
  ShieldCheck,
} from "@phosphor-icons/react";
import { useSession, signOut } from "@/lib/auth-client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function UserMenu() {
  const { data } = useSession();
  const router = useRouter();
  const user = data?.user;
  const initial = (user?.name ?? user?.email ?? "?").slice(0, 1).toUpperCase();
  const isAdmin = user?.email?.toLowerCase() === "akx9@icloud.com";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="hover:bg-sidebar-accent flex w-full items-center gap-2 rounded-md p-1.5 text-left">
        <Avatar className="size-7">
          <AvatarFallback>{initial}</AvatarFallback>
        </Avatar>
        <span className="truncate text-sm">
          {user?.name ?? user?.email ?? "account"}
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {user?.email && (
          <DropdownMenuGroup>
            <DropdownMenuLabel className="truncate font-normal">
              {user.email}
            </DropdownMenuLabel>
          </DropdownMenuGroup>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => router.push("/settings/profile")}>
            <GearSix data-icon="inline-start" />
            profile
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push("/settings/integrations")}>
            <PuzzlePiece data-icon="inline-start" />
            integrations
          </DropdownMenuItem>
        </DropdownMenuGroup>
        {isAdmin && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => router.push("/admin")}>
                <ShieldCheck data-icon="inline-start" />
                admin
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem
            onClick={async () => {
              await signOut();
              router.push("/login");
            }}
          >
            <SignOut data-icon="inline-start" />
            sign out
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
