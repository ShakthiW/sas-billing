"use client";

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { ApprovalRequestResponse } from "@/types/approval";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Check, X, Eye, CheckCheck, XCircle, RotateCcw, CreditCard } from "lucide-react";

interface ApprovalsPageProps { }

export default function ApprovalsPage({ }: ApprovalsPageProps) {
    const [approvals, setApprovals] = useState<ApprovalRequestResponse[]>([]);
    const [selectedApproval, setSelectedApproval] = useState<ApprovalRequestResponse | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [bulkActionLoading, setBulkActionLoading] = useState(false);
    const { toast } = useToast();
    const { permissions } = useUserPermissions();

    const fetchApprovals = useCallback(async (status?: string, type?: string) => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (status) params.append('status', status);
            if (type) params.append('type', type);

            const response = await fetch(`/api/approvals?${params}`);
            const data = await response.json();

            if (data.success) {
                setApprovals(data.requests);
            } else {
                throw new Error(data.error);
            }
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Failed to fetch approvals",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchApprovals();
    }, [fetchApprovals]);

    const handleApproval = async (requestId: string, action: 'approve' | 'reject') => {
        try {
            setActionLoading(requestId);
            const response = await fetch('/api/approvals', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    requestId,
                    action,
                    rejectionReason: action === 'reject' ? rejectionReason : undefined
                })
            });

            const data = await response.json();

            if (data.success) {
                toast({
                    title: "Success",
                    description: `Request ${action}d successfully`
                });
                setIsDialogOpen(false);
                setSelectedApproval(null);
                setRejectionReason('');
                fetchApprovals(); // Refresh the list
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
            setActionLoading(null);
        }
    };

    const handleQuickApproval = async (requestId: string, action: 'approve' | 'reject') => {
        try {
            setActionLoading(requestId);
            const response = await fetch('/api/approvals', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    requestId,
                    action,
                    rejectionReason: action === 'reject' ? 'Quick rejection' : undefined
                })
            });

            const data = await response.json();

            if (data.success) {
                toast({
                    title: "Success",
                    description: `Request ${action}d successfully`
                });
                fetchApprovals(); // Refresh the list
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
            setActionLoading(null);
        }
    };

    const handleBulkAction = async (action: 'approve' | 'reject') => {
        if (selectedIds.size === 0) {
            toast({
                title: "No Selection",
                description: "Please select requests to process",
                variant: "destructive"
            });
            return;
        }

        try {
            setBulkActionLoading(true);
            const promises = Array.from(selectedIds).map(requestId =>
                fetch('/api/approvals', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        requestId,
                        action,
                        rejectionReason: action === 'reject' ? 'Bulk rejection' : undefined
                    })
                }).then(res => res.json())
            );

            const results = await Promise.all(promises);
            const failures = results.filter(result => !result.success);

            if (failures.length === 0) {
                toast({
                    title: "Success",
                    description: `${selectedIds.size} request${selectedIds.size > 1 ? 's' : ''} ${action}d successfully`
                });
            } else {
                toast({
                    title: "Partial Success",
                    description: `${results.length - failures.length} successful, ${failures.length} failed`,
                    variant: "destructive"
                });
            }

            setSelectedIds(new Set());
            fetchApprovals();
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || `Failed to bulk ${action}`,
                variant: "destructive"
            });
        } finally {
            setBulkActionLoading(false);
        }
    };

    const toggleSelection = (requestId: string) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(requestId)) {
            newSelected.delete(requestId);
        } else {
            newSelected.add(requestId);
        }
        setSelectedIds(newSelected);
    };

    const toggleSelectAll = (requests: ApprovalRequestResponse[]) => {
        const allIds = requests.map(r => r._id!).filter(Boolean);
        if (selectedIds.size === allIds.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(allIds));
        }
    };

    const getStatusBadge = (status: string) => {
        const variants = {
            pending: { variant: "default", icon: RotateCcw },
            approved: { variant: "secondary", icon: Check },
            rejected: { variant: "destructive", icon: X }
        } as const;

        const config = variants[status as keyof typeof variants] || { variant: "default", icon: RotateCcw };
        const Icon = config.icon;

        return (
            <Badge variant={config.variant as any} className="flex items-center gap-1">
                <Icon className="w-3 h-3" />
                {status}
            </Badge>
        );
    };

    const getTypeBadge = (type: string) => {
        const configs = {
            part: { color: "bg-blue-100 text-blue-800 border-blue-200", icon: CheckCheck },
            service: { color: "bg-green-100 text-green-800 border-green-200", icon: CheckCheck },
            payment: { color: "bg-purple-100 text-purple-800 border-purple-200", icon: CreditCard },
            status_change: { color: "bg-orange-100 text-orange-800 border-orange-200", icon: RotateCcw },
            credit_payment: { color: "bg-pink-100 text-pink-800 border-pink-200", icon: CreditCard }
        };

        const config = configs[type as keyof typeof configs] || configs.part;
        const Icon = config.icon;

        return (
            <Badge className={`${config.color} border flex items-center gap-1`}>
                <Icon className="w-3 h-3" />
                {type.replace('_', ' ')}
            </Badge>
        );
    };

    const canApprove = (request: ApprovalRequestResponse) => {
        if (request.type === 'part') return permissions.canApproveParts;
        if (request.type === 'service') return permissions.canApproveServices;
        if (request.type === 'payment') return permissions.canApprovePayments;
        if (request.type === 'status_change') return permissions.canApprovePayments; // Using payment approval for status changes temporarily
        if (request.type === 'credit_payment') return permissions.canApprovePayments; // Using payment approval for credit payments
        return false;
    };

    const getRequestDescription = (approval: ApprovalRequestResponse) => {
        const metadata = approval.metadata;
        switch (approval.type) {
            case 'status_change':
                return `${metadata?.currentStatus} → ${metadata?.newStatus} (${metadata?.vehicleNo})`;
            case 'credit_payment':
                return `$${metadata?.creditAmount} payment for ${metadata?.customerName}`;
            case 'payment':
                return `$${metadata?.paymentAmount} payment`;
            case 'part':
                return `${metadata?.partType || 'Part Request'}`;
            case 'service':
                return `${metadata?.serviceName || 'Service Request'}`;
            default:
                return 'Approval needed';
        }
    };

    const ApprovalCard = ({ approval }: { approval: ApprovalRequestResponse }) => (
        <Card className="mb-4 hover:shadow-md transition-shadow">
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div className="flex items-start gap-3">
                        {approval.status === 'pending' && canApprove(approval) && (
                            <Checkbox
                                checked={selectedIds.has(approval._id!)}
                                onCheckedChange={() => toggleSelection(approval._id!)}
                                className="mt-1"
                            />
                        )}
                        <div>
                            <CardTitle className="text-lg">
                                Job #{approval.jobId.slice(-6)} - {approval.type.replace('_', ' ')} Request
                            </CardTitle>
                            <CardDescription>
                                {getRequestDescription(approval)}
                            </CardDescription>
                            <CardDescription className="text-xs text-muted-foreground">
                                Requested on {new Date(approval.createdAt).toLocaleDateString()} at {new Date(approval.createdAt).toLocaleTimeString()}
                            </CardDescription>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        {getTypeBadge(approval.type)}
                        {getStatusBadge(approval.status)}
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                    {/* Request Details */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        {approval.metadata?.partType && (
                            <div><span className="font-medium">Part:</span> {approval.metadata.partType}</div>
                        )}
                        {approval.metadata?.serviceName && (
                            <div><span className="font-medium">Service:</span> {approval.metadata.serviceName}</div>
                        )}
                        {approval.metadata?.amount && (
                            <div><span className="font-medium">Amount:</span> Rs. {approval.metadata.amount.toFixed(2)}</div>
                        )}
                        {approval.metadata?.warrantyPeriod && (
                            <div><span className="font-medium">Warranty:</span> {approval.metadata.warrantyPeriod} months</div>
                        )}
                        {approval.metadata?.paymentAmount && (
                            <div><span className="font-medium">Payment:</span> Rs. {approval.metadata.paymentAmount.toFixed(2)}</div>
                        )}
                        {approval.metadata?.currentStatus && (
                            <div><span className="font-medium">Current Status:</span> {approval.metadata.currentStatus}</div>
                        )}
                        {approval.metadata?.newStatus && (
                            <div><span className="font-medium">New Status:</span> {approval.metadata.newStatus}</div>
                        )}
                        {approval.metadata?.customerName && (
                            <div><span className="font-medium">Customer:</span> {approval.metadata.customerName}</div>
                        )}
                    </div>

                    {/* Action Buttons */}
                    {approval.status === 'pending' && canApprove(approval) && (
                        <div className="flex gap-2 pt-2 border-t">
                            <Button
                                onClick={() => handleQuickApproval(approval._id!, 'approve')}
                                size="sm"
                                className="flex items-center gap-1"
                                disabled={actionLoading === approval._id}
                            >
                                <Check className="w-3 h-3" />
                                {actionLoading === approval._id ? 'Approving...' : 'Approve'}
                            </Button>
                            <Button
                                onClick={() => handleQuickApproval(approval._id!, 'reject')}
                                size="sm"
                                variant="outline"
                                className="flex items-center gap-1"
                                disabled={actionLoading === approval._id}
                            >
                                <X className="w-3 h-3" />
                                {actionLoading === approval._id ? 'Rejecting...' : 'Reject'}
                            </Button>
                            <Button
                                onClick={() => {
                                    setSelectedApproval(approval);
                                    setIsDialogOpen(true);
                                }}
                                size="sm"
                                variant="secondary"
                                className="flex items-center gap-1"
                                disabled={actionLoading === approval._id}
                            >
                                <Eye className="w-3 h-3" />
                                Review
                            </Button>
                        </div>
                    )}

                    {/* Rejection Reason Display */}
                    {approval.status === 'rejected' && approval.rejectionReason && (
                        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                            <p className="text-sm text-red-800">
                                <span className="font-medium">Rejection Reason:</span> {approval.rejectionReason}
                            </p>
                        </div>
                    )}

                    {/* Approval Info */}
                    {approval.status !== 'pending' && approval.approvedBy && (
                        <div className="mt-4 p-3 bg-gray-50 border rounded-md">
                            <p className="text-sm text-gray-700">
                                <span className="font-medium">
                                    {approval.status === 'approved' ? 'Approved' : 'Rejected'} by:
                                </span> {approval.approvedBy}
                                {approval.approvedAt && (
                                    <span className="ml-2 text-xs text-gray-500">
                                        on {new Date(approval.approvedAt).toLocaleDateString()}
                                    </span>
                                )}
                            </p>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );

    if (loading) {
        return <div className="p-6">Loading approvals...</div>;
    }

    const pendingApprovals = approvals.filter(a => a.status === 'pending');
    const processedApprovals = approvals.filter(a => a.status !== 'pending');

    return (
        <DashboardLayout title="Approvals" breadcrumbs={[{ label: "Approvals" }]}>
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold">Approval Management</h1>
                    <p className="text-gray-600">Manage approval requests for parts, services, and payments</p>
                </div>

                <Tabs defaultValue="pending" className="w-full">
                    <TabsList>
                        <TabsTrigger value="pending">
                            Pending ({pendingApprovals.length})
                        </TabsTrigger>
                        <TabsTrigger value="processed">
                            Processed ({processedApprovals.length})
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="pending" className="mt-6">
                        {pendingApprovals.length === 0 ? (
                            <Card>
                                <CardContent className="p-6 text-center text-gray-500">
                                    No pending approvals
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="space-y-4">
                                {/* Bulk Actions */}
                                {selectedIds.size > 0 && (
                                    <Card className="bg-blue-50 border-blue-200">
                                        <CardContent className="p-4">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-medium">
                                                    {selectedIds.size} request{selectedIds.size > 1 ? 's' : ''} selected
                                                </span>
                                                <div className="flex gap-2">
                                                    <Button
                                                        onClick={() => handleBulkAction('approve')}
                                                        size="sm"
                                                        disabled={bulkActionLoading}
                                                        className="flex items-center gap-1"
                                                    >
                                                        <CheckCheck className="w-3 h-3" />
                                                        {bulkActionLoading ? 'Processing...' : 'Approve All'}
                                                    </Button>
                                                    <Button
                                                        onClick={() => handleBulkAction('reject')}
                                                        size="sm"
                                                        variant="outline"
                                                        disabled={bulkActionLoading}
                                                        className="flex items-center gap-1"
                                                    >
                                                        <XCircle className="w-3 h-3" />
                                                        {bulkActionLoading ? 'Processing...' : 'Reject All'}
                                                    </Button>
                                                    <Button
                                                        onClick={() => setSelectedIds(new Set())}
                                                        size="sm"
                                                        variant="ghost"
                                                        disabled={bulkActionLoading}
                                                    >
                                                        Clear Selection
                                                    </Button>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}

                                {/* Select All Option */}
                                {pendingApprovals.filter(canApprove).length > 0 && (
                                    <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-md">
                                        <Checkbox
                                            checked={selectedIds.size === pendingApprovals.filter(canApprove).length && selectedIds.size > 0}
                                            onCheckedChange={() => toggleSelectAll(pendingApprovals.filter(canApprove))}
                                        />
                                        <span className="text-sm font-medium">
                                            Select all {pendingApprovals.filter(canApprove).length} approvable requests
                                        </span>
                                    </div>
                                )}

                                {/* Approval Cards */}
                                {pendingApprovals.map(approval => (
                                    <ApprovalCard key={approval._id} approval={approval} />
                                ))}
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="processed" className="mt-6">
                        {processedApprovals.length === 0 ? (
                            <Card>
                                <CardContent className="p-6 text-center text-gray-500">
                                    No processed approvals
                                </CardContent>
                            </Card>
                        ) : (
                            <div>
                                {processedApprovals.map(approval => (
                                    <ApprovalCard key={approval._id} approval={approval} />
                                ))}
                            </div>
                        )}
                    </TabsContent>
                </Tabs>

                {/* Approval Dialog */}
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Review {selectedApproval?.type} Request</DialogTitle>
                            <DialogDescription>
                                Job #{selectedApproval?.jobId.slice(-6)} - {selectedApproval?.type} request
                            </DialogDescription>
                        </DialogHeader>

                        {selectedApproval && (
                            <div className="space-y-4">
                                <div className="p-4 bg-gray-50 rounded">
                                    <h4 className="font-medium mb-2">Request Details</h4>
                                    {selectedApproval.metadata?.partType && (
                                        <p>Part Type: {selectedApproval.metadata.partType}</p>
                                    )}
                                    {selectedApproval.metadata?.serviceName && (
                                        <p>Service: {selectedApproval.metadata.serviceName}</p>
                                    )}
                                    {selectedApproval.metadata?.amount && (
                                        <p>Amount: Rs. {selectedApproval.metadata.amount.toFixed(2)}</p>
                                    )}
                                    {selectedApproval.metadata?.warrantyPeriod && (
                                        <p>Warranty: {selectedApproval.metadata.warrantyPeriod} months</p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-2">
                                        Rejection Reason (if rejecting)
                                    </label>
                                    <Textarea
                                        value={rejectionReason}
                                        onChange={(e) => setRejectionReason(e.target.value)}
                                        placeholder="Enter reason for rejection..."
                                        rows={3}
                                    />
                                </div>
                            </div>
                        )}

                        <DialogFooter>
                            <Button
                                variant="outline"
                                onClick={() => setIsDialogOpen(false)}
                                disabled={!!actionLoading}
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={() => selectedApproval && handleApproval(selectedApproval._id!, 'reject')}
                                disabled={!!actionLoading}
                            >
                                Reject
                            </Button>
                            <Button
                                onClick={() => selectedApproval && handleApproval(selectedApproval._id!, 'approve')}
                                disabled={!!actionLoading}
                            >
                                Approve
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </DashboardLayout>
    );
}
