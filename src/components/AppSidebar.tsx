import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Calendar, ListOrdered, CalendarRange, ClipboardCheck,
  Users, UserCog, Sparkles, CreditCard, BarChart3, ShieldCheck,
  Building2, ScrollText, Settings,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar,
} from "@/components/ui/sidebar";
import { useAuth, Feature } from "@/context/AuthContext";

interface NavItem { title: string; url: string; icon: any; feature?: Feature; ownerOnly?: boolean; }

const items: NavItem[] = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Bookings", url: "/bookings", icon: Calendar, feature: "bookings" },
  { title: "Therapist Queue", url: "/queue", icon: ListOrdered, feature: "therapists" },
  { title: "Therapist Schedule", url: "/schedule", icon: CalendarRange, feature: "therapists" },
  { title: "Attendance", url: "/attendance", icon: ClipboardCheck, feature: "attendance" },
  { title: "Customers", url: "/customers", icon: Users, feature: "customers" },
  { title: "Therapists", url: "/therapists", icon: UserCog, feature: "therapists" },
  { title: "Services & Pricing", url: "/services", icon: Sparkles, feature: "services_pricing" },
  { title: "Payments", url: "/payments", icon: CreditCard, feature: "payments" },
  { title: "Reports", url: "/reports", icon: BarChart3, feature: "reports" },
  { title: "Admin Management", url: "/admins", icon: ShieldCheck, ownerOnly: true },
  { title: "Branch Management", url: "/branches", icon: Building2, ownerOnly: true },
  { title: "Audit Log", url: "/audit", icon: ScrollText, feature: "audit_log" },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { pathname } = useLocation();
  const { role, can } = useAuth();

  const visible = items.filter((it) => {
    if (it.ownerOnly) return role === "owner";
    if (it.feature) return can(it.feature, "view");
    return true;
  });

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <div className="px-4 py-4 border-b">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-md bg-primary flex items-center justify-center text-primary-foreground font-bold">S</div>
            {!collapsed && <div><div className="font-semibold text-sm">Serenity Spa</div><div className="text-xs text-muted-foreground">Management</div></div>}
          </div>
        </div>
        <SidebarGroup>
          <SidebarGroupLabel>Main</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visible.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={pathname === item.url}>
                    <NavLink to={item.url} className="flex items-center gap-2">
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
