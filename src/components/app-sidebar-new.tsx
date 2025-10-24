"use client";

import * as React from "react";
import {
    GalleryVerticalEnd,
    CreditCard,
    LucideIcon,
    Briefcase,
    CheckCircle,
    Truck,
    FileText,
    Receipt,
    History,
    Archive,
    UserCheck,
    Settings,
    BarChart3,
    CalendarDays,
    Trash2,
    Users,
    Shield,
    Clock,
    Package,
    Wrench,
    Eye,
    DollarSign
} from "lucide-react";
import Link from "next/link";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import BankDetails from "@/components/secret/BankDetails";

import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
    SidebarRail,
} from "@/components/ui/sidebar";

interface NavigationItem {
    title: string;
    url?: string;
    onClick?: () => void;
    icon?: LucideIcon;
}

interface NavigationGroup {
    title: string;
    url: string;
    items?: NavigationItem[];
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
    const { permissions, role } = useUserPermissions();
    const [showBankDetails, setShowBankDetails] = React.useState(false);

    // Dynamic navigation based on user permissions
    const getNavigation = (): NavigationGroup[] => {
        const navItems: NavigationGroup[] = [
            {
                title: "Job Dashboard",
                url: "#",
                items: [
                    // {
                    //     title: "Active Job List",
                    //     url: "/dashboard/active-jobs",
                    // },
                    {
                        title: "Finished Job List",
                        url: "/dashboard/finished-jobs",
                    },
                    {
                        title: "Delivered Job List",
                        url: "/dashboard/delivered-jobs",
                    },
                ],
            },
            {
                title: "Billing Management",
                url: "#",
                items: [
                    {
                        title: "Draft Bills",
                        url: "/dashboard/draft-bills",
                    },
                    {
                        title: "Credit Bills",
                        url: "/dashboard/credit-bills",
                    },
                    {
                        title: "Payment Records",
                        url: "/dashboard/payments",
                    },
                ],
            },
        ];

        // Add Approvals section for all users (staff can create, managers/admins can approve)
        const approvalItems = [];

        // Staff can view their own requests
        approvalItems.push({
            title: "My Requests",
            url: "/dashboard/my-requests",
        });

        // Managers and admins can view and approve all requests
        if (role !== 'staff') {
            approvalItems.push({
                title: "Approval Management",
                url: "/dashboard/approvals",
            });
        }

        navItems.push({
            title: "Approvals",
            url: "#",
            items: approvalItems,
        });

        navItems.push({
            title: "Backlog",
            url: "#",
            items: [
                {
                    title: "Job List",
                    url: "/dashboard/all-jobs",
                },
            ],
        });

        // Add History section for users with access
        if (permissions.canAccessHistory) {
            navItems.push({
                title: "History",
                url: "#",
                items: [
                    // {
                    //     title: "Delivered Job List",
                    //     url: "/dashboard/delivered-jobs",
                    // },
                    {
                        title: "Invoices",
                        url: "#",
                    },
                    {
                        title: "Bank Details",
                        onClick: () => setShowBankDetails(true),
                        icon: CreditCard,
                    },
                    {
                        title: "Monthly Report",
                        url: "#",
                    },
                ],
            });
        }

        // Add Admin-only sections
        if (role === 'admin') {
            navItems.push({
                title: "Admin Tools",
                url: "#",
                items: [
                    {
                        title: "Recycle Bin",
                        url: "/dashboard/recycle-bin",
                    },
                ],
            });
        }

        return navItems;
    };

    const navMain = getNavigation();

    return (
        <Sidebar {...props}>
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href="/dashboard">
                                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                                    <GalleryVerticalEnd className="size-4" />
                                </div>
                                <div className="flex flex-col gap-0.5 leading-none">
                                    <span className="font-semibold">SAS Auto Billing System</span>
                                    <span className="">v1.0.0</span>
                                </div>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>
            <SidebarContent>
                <SidebarGroup>
                    <SidebarMenu>
                        {navMain.map((item) => (
                            <SidebarMenuItem key={item.title}>
                                <SidebarMenuButton asChild>
                                    <Link href={item.url} className="font-medium">
                                        {item.title}
                                    </Link>
                                </SidebarMenuButton>
                                {item.items?.length ? (
                                    <SidebarMenuSub>
                                        {item.items.map((subItem) => (
                                            <SidebarMenuSubItem key={subItem.title}>
                                                <SidebarMenuSubButton asChild={!subItem.onClick}>
                                                    {subItem.onClick ? (
                                                        <button
                                                            onClick={subItem.onClick}
                                                            className="flex items-center gap-2 w-full"
                                                        >
                                                            {subItem.icon && <subItem.icon className="w-4 h-4" />}
                                                            {subItem.title}
                                                        </button>
                                                    ) : subItem.url ? (
                                                        <Link href={subItem.url}>
                                                            {subItem.icon && <subItem.icon className="w-4 h-4" />}
                                                            {subItem.title}
                                                        </Link>
                                                    ) : (
                                                        <span className="flex items-center gap-2">
                                                            {subItem.icon && <subItem.icon className="w-4 h-4" />}
                                                            {subItem.title}
                                                        </span>
                                                    )}
                                                </SidebarMenuSubButton>
                                            </SidebarMenuSubItem>
                                        ))}
                                    </SidebarMenuSub>
                                ) : null}
                            </SidebarMenuItem>
                        ))}
                    </SidebarMenu>
                </SidebarGroup>
            </SidebarContent>
            <SidebarRail />

            {/* Bank Details Dialog */}
            {showBankDetails && (
                <BankDetails
                    isOpen={showBankDetails}
                    handleClose={() => setShowBankDetails(false)}
                />
            )}
        </Sidebar>
    );
}
