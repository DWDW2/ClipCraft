import {
  Home,
  Video,
  Settings,
  Link2,
  Scissors,
  History,
  LayoutDashboard,
  User,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

// Menu items
const items = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard, // More suitable icon
  },
  {
    title: "Process Video",
    url: "/dashboard/process",
    icon: Video,
  },
  {
    title: "Clip History",
    url: "/dashboard/clips",
    icon: History,
  },
  {
    title: "Integrations",
    url: "/dashboard/integrations",
    icon: Link2,
  },
];

export function AppSidebar() {
  return (
    <Sidebar className="w-64 border-r bg-gray-50 dark:bg-gray-900 dark:border-gray-700">
      <SidebarContent className="flex flex-col h-full">
        <div className="px-4 py-6">
          <SidebarGroup>
            <SidebarGroupLabel className="font-semibold text-2xl tracking-tight">
              ClipCraft
            </SidebarGroupLabel>
          </SidebarGroup>
          <Separator className="my-4" />
        </div>

        <SidebarGroup className="flex-1 overflow-y-auto px-2">
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    className={cn(
                      "group flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
                      // Add active state styling (example, needs useRouter to check current path)
                      // "active": pathname === item.url
                    )}
                  >
                    <a
                      href={item.url}
                      className="w-full flex items-center gap-2"
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <div className="p-4">
          <Separator className="my-2" />
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <a
                      href="/dashboard/profile"
                      className="group flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
                    >
                      <User className="h-4 w-4" />
                      <span>Profile</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
