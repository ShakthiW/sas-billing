"use client";

import { useEffect, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useUserPermissions } from '@/hooks/useUserPermissions';

export function NotificationTrigger() {
    const { toast } = useToast();
    const { role } = useUserPermissions();
    const lastNotificationCount = useRef<number>(0);

    useEffect(() => {
        // Only run for admin/manager
        if (role === 'staff') return;

        const checkForNewNotifications = async () => {
            try {
                const response = await fetch('/api/approvals?status=pending');
                const data = await response.json();

                if (data.success) {
                    const currentCount = data.requests?.length || 0;

                    // If we have more notifications than before, show toast
                    if (currentCount > lastNotificationCount.current && lastNotificationCount.current > 0) {
                        const newRequestsCount = currentCount - lastNotificationCount.current;
                        toast({
                            title: "New Approval Request",
                            description: `${newRequestsCount} new request${newRequestsCount > 1 ? 's' : ''} need${newRequestsCount === 1 ? 's' : ''} your attention`,
                            duration: 5000,
                        });
                    }

                    lastNotificationCount.current = currentCount;
                }
            } catch (error) {
                console.error('Failed to check notifications:', error);
            }
        };

        // Initial check after component mounts
        const initialTimer = setTimeout(() => {
            checkForNewNotifications();
        }, 2000);

        // Then check every 60 seconds
        const interval = setInterval(checkForNewNotifications, 60000);

        return () => {
            clearTimeout(initialTimer);
            clearInterval(interval);
        };
    }, [role, toast]);

    return null; // This component doesn't render anything
}
