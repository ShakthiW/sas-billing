"use client";

import { useState, useEffect } from 'react';
import { Bell, X, Check, XCircle, Clock, User, FileText, CreditCard, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { ApprovalRequestResponse } from '@/types/approval';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { cn } from '@/lib/utils';

interface NotificationPanelProps {
    isOpen: boolean;
    onClose: () => void;
    onNotificationCountChange?: (count: number) => void;
}

export function NotificationPanel({ isOpen, onClose, onNotificationCountChange }: NotificationPanelProps) {
    const [notifications, setNotifications] = useState<ApprovalRequestResponse[]>([]);
    const [loading, setLoading] = useState(false);
    const [processing, setProcessing] = useState<string | null>(null);
    const { toast } = useToast();
    const { role } = useUserPermissions();

    // Fetch pending notifications
    const fetchNotifications = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/approvals?status=pending');
            const data = await response.json();

            if (data.success) {
                const newNotifications = data.requests || [];
                setNotifications(newNotifications);
            }
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
        } finally {
            setLoading(false);
        }
    };

    // Update parent count when notifications change
    useEffect(() => {
        onNotificationCountChange?.(notifications.length);
    }, [notifications.length, onNotificationCountChange]);

    // Handle quick approval/rejection
    const handleQuickAction = async (requestId: string, action: 'approve' | 'reject') => {
        try {
            setProcessing(requestId);

            const response = await fetch('/api/approvals', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    requestId,
                    action,
                    rejectionReason: action === 'reject' ? 'Quick rejection from notifications' : undefined
                })
            });

            const data = await response.json();

            if (data.success) {
                toast({
                    title: action === 'approve' ? "Request Approved" : "Request Rejected",
                    description: `Request has been ${action}d successfully`,
                });

                // Remove from notifications
                setNotifications(prev => prev.filter(n => n._id !== requestId));
            } else {
                throw new Error(data.error);
            }
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || `Failed to ${action} request`,
                variant: "destructive"
            });
        } finally {
            setProcessing(null);
        }
    };

    // Get icon for request type
    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'status_change':
                return <RotateCcw className="w-4 h-4" />;
            case 'credit_payment':
                return <CreditCard className="w-4 h-4" />;
            case 'payment':
                return <CreditCard className="w-4 h-4" />;
            case 'part':
            case 'service':
                return <FileText className="w-4 h-4" />;
            default:
                return <FileText className="w-4 h-4" />;
        }
    };

    // Get notification title
    const getNotificationTitle = (notification: ApprovalRequestResponse) => {
        switch (notification.type) {
            case 'status_change':
                return `Status Change Request`;
            case 'credit_payment':
                return `Credit Payment Request`;
            case 'payment':
                return `Payment Request`;
            case 'part':
                return `Part Request`;
            case 'service':
                return `Service Request`;
            default:
                return `Approval Request`;
        }
    };

    // Get notification description
    const getNotificationDescription = (notification: ApprovalRequestResponse) => {
        const metadata = notification.metadata;

        switch (notification.type) {
            case 'status_change':
                return `${metadata?.currentStatus} → ${metadata?.newStatus} (${metadata?.vehicleNo})`;
            case 'credit_payment':
                return `$${metadata?.creditAmount} payment for ${metadata?.customerName}`;
            case 'payment':
                return `$${metadata?.paymentAmount} payment`;
            case 'part':
                return `${metadata?.partType || 'Part Request'}`;
            case 'service':
                return `${metadata?.serviceName}`;
            default:
                return 'Approval needed';
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchNotifications();
        }
    }, [isOpen]);

    // Auto-refresh every 30 seconds when panel is open
    useEffect(() => {
        if (!isOpen) return;

        const interval = setInterval(() => {
            fetchNotifications();
        }, 30000);

        return () => clearInterval(interval);
    }, [isOpen]);

    // Only show to admin/manager
    if (role === 'staff') {
        return null;
    }

    return (
        <>
            {/* Backdrop */}
            <div
                className={cn(
                    "fixed inset-0 bg-black/20 z-40 transition-opacity",
                    isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
                )}
                onClick={onClose}
            />

            {/* Panel */}
            <div
                className={cn(
                    "fixed right-0 top-0 h-full w-96 bg-background border-l shadow-lg z-50 transition-transform",
                    isOpen ? "translate-x-0" : "translate-x-full"
                )}
            >
                <div className="flex flex-col h-full">
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b">
                        <div className="flex items-center gap-2">
                            <Bell className="w-5 h-5" />
                            <h2 className="font-semibold">Notifications</h2>
                            {notifications.length > 0 && (
                                <Badge variant="secondary">{notifications.length}</Badge>
                            )}
                        </div>
                        <Button variant="ghost" size="sm" onClick={onClose}>
                            <X className="w-4 h-4" />
                        </Button>
                    </div>

                    {/* Content */}
                    <ScrollArea className="flex-1 p-4">
                        {loading ? (
                            <div className="space-y-3">
                                {[...Array(3)].map((_, i) => (
                                    <div key={i} className="h-20 bg-muted rounded-md animate-pulse" />
                                ))}
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="text-center text-muted-foreground py-8">
                                <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                <p>No pending approvals</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {notifications.map((notification) => (
                                    <Card key={notification._id} className="hover:shadow-md transition-shadow">
                                        <CardHeader className="pb-2">
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-center gap-2">
                                                    {getTypeIcon(notification.type)}
                                                    <CardTitle className="text-sm">
                                                        {getNotificationTitle(notification)}
                                                    </CardTitle>
                                                </div>
                                                <Badge variant="outline" className="text-xs">
                                                    <Clock className="w-3 h-3 mr-1" />
                                                    {new Date(notification.createdAt).toLocaleDateString()}
                                                </Badge>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="pt-0">
                                            <p className="text-sm text-muted-foreground mb-3">
                                                {getNotificationDescription(notification)}
                                            </p>

                                            <div className="flex items-center gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="default"
                                                    onClick={() => handleQuickAction(notification._id!, 'approve')}
                                                    disabled={processing === notification._id}
                                                    className="flex-1"
                                                >
                                                    <Check className="w-3 h-3 mr-1" />
                                                    Approve
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleQuickAction(notification._id!, 'reject')}
                                                    disabled={processing === notification._id}
                                                    className="flex-1"
                                                >
                                                    <XCircle className="w-3 h-3 mr-1" />
                                                    Reject
                                                </Button>
                                            </div>

                                            {processing === notification._id && (
                                                <div className="mt-2 text-xs text-muted-foreground text-center">
                                                    Processing...
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </ScrollArea>

                    {/* Footer */}
                    <div className="p-4 border-t">
                        <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => window.location.href = '/dashboard/approvals'}
                        >
                            View All Approvals
                        </Button>
                    </div>
                </div>
            </div>
        </>
    );
}
