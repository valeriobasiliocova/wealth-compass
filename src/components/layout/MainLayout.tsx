import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

export default function MainLayout() {
    return (
        <div className="flex min-h-screen bg-background text-foreground font-sans antialiased">
            {/* Desktop Sidebar */}
            <Sidebar />

            {/* Mobile Sidebar (Sheet) */}
            <div className="md:hidden fixed z-50 bottom-4 right-4">
                <Sheet>
                    <SheetTrigger asChild>
                        <Button size="icon" className="rounded-full shadow-lg h-12 w-12 gradient-primary">
                            <Menu className="h-6 w-6" />
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="p-0 border-r w-64">
                        <Sidebar />
                    </SheetContent>
                </Sheet>
            </div>

            {/* Main Content */}
            <main className="flex-1 overflow-x-hidden">
                <Outlet />
            </main>
        </div>
    );
}
