import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
    LayoutDashboard,
    ArrowRightLeft,
    TrendingUp,
    Bitcoin,
    Settings,
    LogOut
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Separator } from "@/components/ui/separator";

const sidebarItems = [
    {
        title: "Dashboard",
        icon: LayoutDashboard,
        href: "/",
    },
    {
        title: "Cash Flow",
        icon: ArrowRightLeft,
        href: "/cash-flow",
    },
    {
        title: "Investments",
        icon: TrendingUp,
        href: "/investments",
    },
    {
        title: "Crypto",
        icon: Bitcoin,
        href: "/crypto",
    },
    {
        title: "Settings",
        icon: Settings,
        href: "/settings",
    },
];

export function Sidebar() {
    const location = useLocation();
    const { signOut } = useAuth();

    return (
        <div className="h-full w-full bg-card flex flex-col">
            <div className="p-6">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                    Wealth Compass
                </h1>
                <p className="text-xs text-muted-foreground mt-1">Personal Finance System</p>
            </div>

            <Separator className="mb-4" />

            <div className="flex-1 px-4 space-y-2">
                {sidebarItems.map((item) => (
                    <Link key={item.href} to={item.href}>
                        <Button
                            variant={location.pathname === item.href ? "secondary" : "ghost"}
                            className={cn(
                                "w-full justify-start gap-3",
                                location.pathname === item.href && "bg-secondary/50 font-medium"
                            )}
                        >
                            <item.icon className="h-5 w-5" />
                            {item.title}
                        </Button>
                    </Link>
                ))}
            </div>

            <div className="p-4 border-t border-border">
                <Button variant="ghost" className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive" onClick={() => signOut()}>
                    <LogOut className="h-5 w-5" />
                    Sign Out
                </Button>
            </div>
        </div>
    );
}
