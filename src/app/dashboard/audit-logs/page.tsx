"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { FileText, User, Calendar, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";

interface AuditLogEntry {
    _id: string;
    userId: string;
    userRole: string;
    action: string;
    resource: string;
    resourceId: string;
    oldData?: any;
    newData?: any;
    ipAddress?: string;
    userAgent?: string;
    timestamp: Date;
    success: boolean;
    errorMessage?: string;
    metadata?: Record<string, any>;
}

export default function AuditLogsPage() {
    const [auditEntries, setAuditEntries] = useState<AuditLogEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedEntry, setSelectedEntry] = useState<AuditLogEntry | null>(null);
    const [detailsDialog, setDetailsDialog] = useState(false);
    const [filters, setFilters] = useState({
        action: '',
        resource: '',
        userId: '',
        dateFrom: '',
        dateTo: ''
    });
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 50,
        total: 0,
        totalPages: 0
    });

    const { permissions, role } = useUserPermissions();

    const fetchAuditLogs = useCallback(async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams({
                page: pagination.page.toString(),
                limit: pagination.limit.toString(),
                ...Object.fromEntries(
                    Object.entries(filters).filter(([_, value]) => value !== '')
                )
            });

            const response = await fetch(`/api/audit?${params}`);
            const data = await response.json();

            if (data.success) {
                setAuditEntries(data.auditEntries || []);
                setPagination(prev => ({
                    ...prev,
                    total: data.pagination.total,
                    totalPages: data.pagination.totalPages
                }));
            } else {
                throw new Error(data.error);
            }
        } catch (error: any) {
            console.error("Failed to fetch audit logs:", error);
            toast({
                title: "Error",
                description: "Failed to load audit logs",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    }, [pagination.page, pagination.limit, filters]);

    useEffect(() => {
        if (role === 'admin') {
            fetchAuditLogs();
        }
    }, [role, fetchAuditLogs]);

    const handleFilterChange = (key: string, value: string) => {
        setFilters(prev => ({ ...prev, [key]: value }));
        setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page
    };

    const clearFilters = () => {
        setFilters({
            action: '',
            resource: '',
            userId: '',
            dateFrom: '',
            dateTo: ''
        });
        setPagination(prev => ({ ...prev, page: 1 }));
    };

    const formatDate = (date: Date | string) => {
        return new Date(date).toLocaleString();
    };

    const getActionIcon = (action: string) => {
        if (action.includes('create')) return '➕';
        if (action.includes('update') || action.includes('edit')) return '✏️';
        if (action.includes('delete')) return '🗑️';
        if (action.includes('approve')) return '✅';
        if (action.includes('reject')) return '❌';
        if (action.includes('login')) return '🔐';
        return '📝';
    };

    const getActionBadge = (action: string, success: boolean) => {
        const variant = success ? 'default' : 'destructive';
        return (
            <Badge variant={variant} className="flex items-center gap-1">
                <span>{getActionIcon(action)}</span>
                <span>{action.replace(/_/g, ' ').toUpperCase()}</span>
            </Badge>
        );
    };

    const getResourceBadge = (resource: string) => {
        const colorMap: Record<string, string> = {
            job: 'bg-blue-100 text-blue-800',
            bill: 'bg-green-100 text-green-800',
            payment: 'bg-yellow-100 text-yellow-800',
            creditPayment: 'bg-purple-100 text-purple-800',
            user: 'bg-red-100 text-red-800',
            approval: 'bg-orange-100 text-orange-800'
        };

        return (
            <Badge className={colorMap[resource] || 'bg-gray-100 text-gray-800'}>
                {resource.toUpperCase()}
            </Badge>
        );
    };

    if (role !== 'admin') {
        return (
            <DashboardLayout title="Access Denied" breadcrumbs={[{ label: "Audit Logs" }]}>
                <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
                    <Card>
                        <CardContent className="flex flex-col items-center justify-center py-12">
                            <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
                            <h3 className="text-lg font-semibold mb-2">Access Denied</h3>
                            <p className="text-muted-foreground text-center">
                                Only administrators can access audit logs.
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout title="Audit Logs" breadcrumbs={[{ label: "Audit Logs" }]}>
            <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
                {/* Statistics */}
                <div className="grid auto-rows-min gap-4 md:grid-cols-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Entries</CardTitle>
                            <FileText className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{pagination.total}</div>
                            <p className="text-xs text-muted-foreground">
                                Audit log entries
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
                            <CheckCircle className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {auditEntries.length > 0
                                    ? Math.round((auditEntries.filter(e => e.success).length / auditEntries.length) * 100)
                                    : 0}%
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Successful actions
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Failed Actions</CardTitle>
                            <XCircle className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {auditEntries.filter(e => !e.success).length}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                In current page
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Unique Users</CardTitle>
                            <User className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {new Set(auditEntries.map(e => e.userId)).size}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Active users
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Filters */}
                <Card>
                    <CardHeader>
                        <CardTitle>Filters</CardTitle>
                        <CardDescription>Filter audit logs by various criteria</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                            <div>
                                <label className="text-sm font-medium mb-1 block">Action</label>
                                <Input
                                    placeholder="e.g., create_payment"
                                    value={filters.action}
                                    onChange={(e) => handleFilterChange('action', e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-1 block">Resource</label>
                                <Select value={filters.resource} onValueChange={(value) => handleFilterChange('resource', value)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="All resources" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="">All Resources</SelectItem>
                                        <SelectItem value="job">Jobs</SelectItem>
                                        <SelectItem value="bill">Bills</SelectItem>
                                        <SelectItem value="payment">Payments</SelectItem>
                                        <SelectItem value="creditPayment">Credit Payments</SelectItem>
                                        <SelectItem value="user">Users</SelectItem>
                                        <SelectItem value="approval">Approvals</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-1 block">User ID</label>
                                <Input
                                    placeholder="User ID"
                                    value={filters.userId}
                                    onChange={(e) => handleFilterChange('userId', e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-1 block">From Date</label>
                                <Input
                                    type="date"
                                    value={filters.dateFrom}
                                    onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-1 block">To Date</label>
                                <Input
                                    type="date"
                                    value={filters.dateTo}
                                    onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                                />
                            </div>
                            <div className="flex items-end">
                                <Button variant="outline" onClick={clearFilters} className="w-full">
                                    Clear Filters
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Audit Logs Table */}
                <Card>
                    <CardHeader>
                        <CardTitle>Audit Logs ({pagination.total} entries)</CardTitle>
                        <CardDescription>
                            Detailed log of all system actions and changes
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="text-center py-8">Loading...</div>
                        ) : auditEntries.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                No audit entries found
                            </div>
                        ) : (
                            <>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Timestamp</TableHead>
                                            <TableHead>User</TableHead>
                                            <TableHead>Action</TableHead>
                                            <TableHead>Resource</TableHead>
                                            <TableHead>Resource ID</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Details</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {auditEntries.map((entry) => (
                                            <TableRow key={entry._id}>
                                                <TableCell className="font-mono text-xs">
                                                    {formatDate(entry.timestamp)}
                                                </TableCell>
                                                <TableCell>
                                                    <div>
                                                        <div className="font-medium text-sm">{entry.userId}</div>
                                                        <div className="text-xs text-muted-foreground">{entry.userRole}</div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    {getActionBadge(entry.action, entry.success)}
                                                </TableCell>
                                                <TableCell>
                                                    {getResourceBadge(entry.resource)}
                                                </TableCell>
                                                <TableCell className="font-mono text-xs">
                                                    {entry.resourceId}
                                                </TableCell>
                                                <TableCell>
                                                    {entry.success ? (
                                                        <Badge variant="default" className="bg-green-100 text-green-800">
                                                            Success
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="destructive">
                                                            Failed
                                                        </Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => {
                                                            setSelectedEntry(entry);
                                                            setDetailsDialog(true);
                                                        }}
                                                    >
                                                        View Details
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>

                                {/* Pagination */}
                                <div className="flex items-center justify-between mt-4">
                                    <div className="text-sm text-muted-foreground">
                                        Page {pagination.page} of {pagination.totalPages}
                                        ({pagination.total} total entries)
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={pagination.page === 1}
                                            onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                                        >
                                            Previous
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={pagination.page === pagination.totalPages}
                                            onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                                        >
                                            Next
                                        </Button>
                                    </div>
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Details Dialog */}
            <Dialog open={detailsDialog} onOpenChange={setDetailsDialog}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Audit Entry Details</DialogTitle>
                        <DialogDescription>
                            Detailed information about this audit log entry
                        </DialogDescription>
                    </DialogHeader>

                    {selectedEntry && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <h4 className="font-medium mb-2">Basic Information</h4>
                                    <div className="space-y-2 text-sm">
                                        <div><strong>Timestamp:</strong> {formatDate(selectedEntry.timestamp)}</div>
                                        <div><strong>User ID:</strong> {selectedEntry.userId}</div>
                                        <div><strong>User Role:</strong> {selectedEntry.userRole}</div>
                                        <div><strong>Action:</strong> {selectedEntry.action}</div>
                                        <div><strong>Resource:</strong> {selectedEntry.resource}</div>
                                        <div><strong>Resource ID:</strong> {selectedEntry.resourceId}</div>
                                        <div><strong>Success:</strong> {selectedEntry.success ? 'Yes' : 'No'}</div>
                                        {selectedEntry.errorMessage && (
                                            <div><strong>Error:</strong> {selectedEntry.errorMessage}</div>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <h4 className="font-medium mb-2">Technical Information</h4>
                                    <div className="space-y-2 text-sm">
                                        <div><strong>IP Address:</strong> {selectedEntry.ipAddress || 'N/A'}</div>
                                        <div><strong>User Agent:</strong> {selectedEntry.userAgent || 'N/A'}</div>
                                    </div>
                                </div>
                            </div>

                            {selectedEntry.oldData && (
                                <div>
                                    <h4 className="font-medium mb-2">Previous Data</h4>
                                    <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto max-h-40">
                                        {JSON.stringify(selectedEntry.oldData, null, 2)}
                                    </pre>
                                </div>
                            )}

                            {selectedEntry.newData && (
                                <div>
                                    <h4 className="font-medium mb-2">New Data</h4>
                                    <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto max-h-40">
                                        {JSON.stringify(selectedEntry.newData, null, 2)}
                                    </pre>
                                </div>
                            )}

                            {selectedEntry.metadata && (
                                <div>
                                    <h4 className="font-medium mb-2">Metadata</h4>
                                    <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto max-h-40">
                                        {JSON.stringify(selectedEntry.metadata, null, 2)}
                                    </pre>
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </DashboardLayout>
    );
}
