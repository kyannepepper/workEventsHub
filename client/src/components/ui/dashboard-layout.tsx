import { ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import {
  CalendarRange,
  UserPlus,
  ClipboardList,
  QrCode,
  LogOut,
  Menu,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";

type NavItem = {
  title: string;
  href: string;
  icon: React.ElementType;
};

const navItems: NavItem[] = [
  {
    title: "My Events",
    href: "/",
    icon: CalendarRange,
  },
  {
    title: "Create Event",
    href: "/events/new",
    icon: UserPlus,
  },
  {
    title: "Attendees",
    href: "/attendees",
    icon: ClipboardList,
  },
  {
    title: "Check-In",
    href: "/check-in",
    icon: QrCode,
  },
];

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [location] = useLocation();
  const isMobile = useIsMobile();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    toast({
      title: "Logged out",
      description: "You have been successfully logged out",
    });
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Mobile menu toggle */}
      {isMobile && (
        <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between p-4 bg-white border-b shadow-sm">
          <h1 className="text-lg font-bold">Utah Events Admin</h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </Button>
        </div>
      )}

      {/* Sidebar */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 bg-white border-r shadow-sm transition-transform",
          isMobile && !mobileMenuOpen ? "-translate-x-full" : "translate-x-0",
          isMobile && "mt-16",
        )}
      >
        <div className="flex flex-col h-full">
          {!isMobile && (
            <div className="px-6 py-6">
              <h1 className="text-xl font-bold">Utah Events Admin</h1>
              <p className="text-sm text-muted-foreground">{user?.department}</p>
            </div>
          )}

          <nav className="flex-1 px-3 py-3 space-y-1">
            {navItems.map((item) => {
              const isActive = location === item.href;
              return (
                <Link 
                  key={item.href} 
                  href={item.href}
                  className={cn(
                    "flex items-center px-3 py-2 text-sm font-medium rounded-md hover:bg-slate-100",
                    isActive
                      ? "bg-slate-100 text-primary font-semibold"
                      : "text-gray-700"
                  )}
                  onClick={() => isMobile && setMobileMenuOpen(false)}
                >
                  <item.icon className={cn("h-5 w-5 mr-3")} />
                  {item.title}
                </Link>
              );
            })}
          </nav>

          <div className="p-3 mt-auto">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={handleLogout}
            >
              <LogOut className="h-5 w-5 mr-3" /> Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <main 
        className={cn(
          "flex-1 px-4 sm:px-6 lg:px-8 py-6", 
          isMobile ? "mt-16 ml-0" : "ml-64"
        )}
      >
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}