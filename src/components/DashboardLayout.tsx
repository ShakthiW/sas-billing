"use client";

import * as React from "react";
import { AppSidebar } from "@/components/app-sidebar";
import {
    SidebarInset,
    SidebarProvider,
    SidebarTrigger,
} from "@/components/ui/sidebar";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell } from "lucide-react";
import { NotificationPanel } from "@/components/NotificationPanel";
import { NotificationTrigger } from "@/components/NotificationTrigger";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { cn } from "@/lib/utils";

interface DashboardLayoutProps {
    children: React.ReactNode;
    title?: string;
    breadcrumbs?: Array<{
        label: string;
        href?: string;
    }>;
}

export function DashboardLayout({
    children,
    title = "Dashboard",
    breadcrumbs = []
}: DashboardLayoutProps) {
    const [isNotificationPanelOpen, setIsNotificationPanelOpen] = React.useState(false);
    const [notificationCount, setNotificationCount] = React.useState(0);
    const { role } = useUserPermissions();

    // Fetch notification count for admin/manager
    const fetchNotificationCount = React.useCallback(async () => {
        if (role === 'staff') return;

        try {
            const response = await fetch('/api/approvals?status=pending');
            const data = await response.json();

            if (data.success) {
                setNotificationCount(data.requests?.length || 0);
            }
        } catch (error) {
            console.error('Failed to fetch notification count:', error);
        }
    }, [role]);    // Fetch count on mount and every 30 seconds
    React.useEffect(() => {
        fetchNotificationCount();

        const interval = setInterval(fetchNotificationCount, 30000);
        return () => clearInterval(interval);
    }, [fetchNotificationCount]);

    // Memoized callback for notification count changes
    const handleNotificationCountChange = React.useCallback((count: number) => {
        setNotificationCount(count);
    }, []);

    return (
        <SidebarProvider>
            <AppSidebar />
            <SidebarInset>
                <header className="flex h-14 ipad:h-16 shrink-0 items-center gap-2 border-b sticky top-0 bg-white z-50">
                    <div className="flex items-center gap-2 px-2 ipad:px-4 lg:px-3 flex-1">
                        <SidebarTrigger className="ipad:size-default" />
                        <Separator orientation="vertical" className="mr-2 h-4" />
                        <h1 className="text-base ipad:text-lg lg:text-xl font-bold mr-2 ipad:mr-4">{title}</h1>
                        <Separator orientation="vertical" className="mr-2 h-4 hidden ipad:block" />
                        <Breadcrumb className="hidden ipad:block">
                            <BreadcrumbList>
                                <BreadcrumbItem className="hidden ipad:block">
                                    <BreadcrumbLink href="/dashboard">
                                        SAS Auto Air-conditioning Service
                                    </BreadcrumbLink>
                                </BreadcrumbItem>
                                {breadcrumbs.length > 0 && (
                                    <BreadcrumbSeparator className="hidden ipad:block" />
                                )}
                                {breadcrumbs.map((breadcrumb, index) => (
                                    <React.Fragment key={index}>
                                        <BreadcrumbItem>
                                            {breadcrumb.href ? (
                                                <BreadcrumbLink href={breadcrumb.href}>
                                                    {breadcrumb.label}
                                                </BreadcrumbLink>
                                            ) : (
                                                <BreadcrumbPage>{breadcrumb.label}</BreadcrumbPage>
                                            )}
                                        </BreadcrumbItem>
                                        {index < breadcrumbs.length - 1 && (
                                            <BreadcrumbSeparator className="hidden ipad:block" />
                                        )}
                                    </React.Fragment>
                                ))}
                            </BreadcrumbList>
                        </Breadcrumb>
                    </div>

                    {/* Notification Bell - Only for admin/manager */}
                    {role !== 'staff' && (
                        <div className="flex items-center px-3">
                            <Button
                                variant="ghost"
                                size="sm"
                                className={cn(
                                    "relative",
                                    notificationCount > 0 && "animate-pulse"
                                )}
                                onClick={() => setIsNotificationPanelOpen(true)}
                            >
                                <Bell className={cn(
                                    "w-5 h-5",
                                    notificationCount > 0 && "text-orange-600"
                                )} />
                                {notificationCount > 0 && (
                                    <Badge
                                        variant="destructive"
                                        className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs animate-bounce"
                                    >
                                        {notificationCount > 9 ? '9+' : notificationCount}
                                    </Badge>
                                )}
                            </Button>
                        </div>
                    )}
                </header>
                <div className="flex flex-1 flex-col gap-3 ipad:gap-4 p-3 ipad:p-5 lg:p-4">
                    {children}
                </div>
            </SidebarInset>

            {/* Notification Panel */}
            <NotificationPanel
                isOpen={isNotificationPanelOpen}
                onClose={() => setIsNotificationPanelOpen(false)}
                onNotificationCountChange={handleNotificationCountChange}
            />

            {/* Notification Trigger for toast notifications */}
            <NotificationTrigger />
        </SidebarProvider>
    );
}
