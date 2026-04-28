"use client";

import { Menu } from "@base-ui/react/menu";
import { CircleUser } from "lucide-react";
import { cn } from "@/lib/utils";

export function UserMenu() {
  return (
    <Menu.Root>
      <Menu.Trigger
        aria-label="User menu"
        className={cn(
          "inline-flex items-center justify-center rounded-lg p-1.5",
          "text-foreground transition-colors",
          "hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        )}
      >
        <CircleUser className="size-5" aria-hidden="true" />
      </Menu.Trigger>

      <Menu.Portal>
        <Menu.Positioner side="bottom" align="end" sideOffset={8}>
          <Menu.Popup
            className={cn(
              "z-50 min-w-[8rem] overflow-hidden rounded-lg border border-border",
              "bg-popover p-1 text-popover-foreground shadow-md",
              "data-[starting-style]:opacity-0 data-[ending-style]:opacity-0",
              "transition-opacity duration-150",
            )}
          >
            <Menu.LinkItem
              href="/api/auth/logout"
              closeOnClick
              className={cn(
                "flex cursor-pointer select-none items-center rounded-md px-2 py-1.5",
                "text-sm font-medium leading-none outline-none",
                "data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground",
                "transition-colors duration-100",
              )}
            >
              Log out
            </Menu.LinkItem>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
