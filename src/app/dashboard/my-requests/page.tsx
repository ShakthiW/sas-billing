"use client";

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { ApprovalRequestResponse, getApprovalPermissions } from "@/types/approval";
import CreateApprovalRequest from "@/components/CreateApprovalRequest";
import { DashboardLayout } from "@/components/DashboardLayout";
import { FileText, Clock, CheckCircle, XCircle } from "lucide-react";

export default function MyRequestsPage() {
    const [requests, setRequests] = useState<ApprovalRequestResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();
    const { role } = useUserPermissions();

    const approvalPermissions = getApprovalPermissions(role);

    const fetchMyRequests = useCallback(async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/approvals');
            const data = await response.json();

            if (data.success) {
                setRequests(data.requests);
            } else {
                throw new Error(data.error);
            }
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Failed to fetch requests",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchMyRequests();
    }, [fetchMyRequests]);

    const handleRequestCreated = (requestId: string) => {
        // Refresh the requests list
        fetchMyRequests();
        toast({
            title: "Success",
            description: "Approval request created successfully!",
        });
    };

    const getStatusBadge = (status: string) => {
        const variants = {
            pending: { variant: "secondary" as const, icon: Clock },
            approved: { variant: "default" as const, icon: CheckCircle },
            rejected: { variant: "destructive" as const, icon: XCircle }
        };

        const config = variants[status as keyof typeof variants] || variants.pending;
        const Icon = config.icon;

        return (
            <Badge variant={config.variant} className="flex items-center gap-1">
                <Icon className="w-3 h-3" />
                {status}
            </Badge>
        );
    };

    const getTypeBadge = (type: string) => {
        const colors = {
            part: "bg-blue-100 text-blue-800",
            service: "bg-green-100 text-green-800",
            payment: "bg-purple-100 text-purple-800"
        };

        return (
            <Badge className={colors[type as keyof typeof colors] || "bg-gray-100 text-gray-800"}>
                {type}
            </Badge>
        );
    };

    const RequestCard = ({ request }: { request: ApprovalRequestResponse }) => (
        <Card className="mb-4">
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="text-lg">
                            {request.type} Request - Job #{request.jobId.slice(-6)}
                        </CardTitle>
                        <CardDescription>
                            Requested on {new Date(request.createdAt).toLocaleDateString()}
                        </CardDescription>
                    </div>
                    <div className="flex gap-2">
                        {getTypeBadge(request.type)}
                        {getStatusBadge(request.status)}
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-2">
                    {request.metadata?.partType && (
                        <p><strong>Part Type:</strong> {request.metadata.partType}</p>
                    )}
                    {request.metadata?.serviceName && (
                        <p><strong>Service:</strong> {request.metadata.serviceName}</p>
                    )}
                    {request.metadata?.amount && (
                        <p><strong>Amount:</strong> Rs. {request.metadata.amount.toFixed(2)}</p>
                    )}
                    {request.metadata?.warrantyPeriod && (
                        <p><strong>Warranty:</strong> {request.metadata.warrantyPeriod} months</p>
                    )}
                    {request.metadata?.paymentMethod && (
                        <p><strong>Payment Method:</strong> {request.metadata.paymentMethod}</p>
                    )}

                    {request.status === 'rejected' && request.rejectionReason && (
                        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
                            <p className="text-sm text-red-800">
                                <strong>Rejection Reason:</strong> {request.rejectionReason}
                            </p>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );

    const pendingRequests = requests.filter(r => r.status === 'pending');
    const processedRequests = requests.filter(r => r.status !== 'pending');

    if (loading) {
        return (
            <div className="p-6">Loading your requests...</div>
        );
    }

    return (
        <DashboardLayout title="My Requests" breadcrumbs={[{ label: "My Requests" }]}>
            <div className="p-6 space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <FileText className="w-6 h-6" />
                            My Approval Requests
                        </h1>
                        <p className="text-gray-600">View and create approval requests</p>
                    </div>
                    <CreateApprovalRequest onRequestCreated={handleRequestCreated} />
                </div>

                {/* Permission Information */}
                <Card className="bg-blue-50 border-blue-200">
                    <CardHeader>
                        <CardTitle className="text-lg text-blue-800">What can you request?</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className={`p-3 rounded ${approvalPermissions.canRequestParts ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                                <p className="font-medium">Parts</p>
                                <p className="text-sm">
                                    {approvalPermissions.canRequestParts ? 'You can request parts' : 'Not available for your role'}
                                </p>
                            </div>
                            <div className={`p-3 rounded ${approvalPermissions.canRequestServices ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                                <p className="font-medium">Services</p>
                                <p className="text-sm">
                                    {approvalPermissions.canRequestServices ? 'You can request services' : 'Not available for your role'}
                                </p>
                            </div>
                            <div className={`p-3 rounded ${approvalPermissions.canRequestPayments ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                                <p className="font-medium">Payments</p>
                                <p className="text-sm">
                                    {approvalPermissions.canRequestPayments ? 'You can request payments' : 'Not available for your role'}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Tabs defaultValue="pending" className="w-full">
                    <TabsList>
                        <TabsTrigger value="pending">
                            Pending ({pendingRequests.length})
                        </TabsTrigger>
                        <TabsTrigger value="processed">
                            Processed ({processedRequests.length})
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="pending" className="mt-6">
                        {pendingRequests.length === 0 ? (
                            <Card>
                                <CardContent className="p-6 text-center text-gray-500">
                                    <Clock className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                                    <p>No pending requests</p>
                                    <p className="text-sm">Create a new approval request using the button above</p>
                                </CardContent>
                            </Card>
                        ) : (
                            <div>
                                {pendingRequests.map(request => (
                                    <RequestCard key={request._id} request={request} />
                                ))}
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="processed" className="mt-6">
                        {processedRequests.length === 0 ? (
                            <Card>
                                <CardContent className="p-6 text-center text-gray-500">
                                    <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                                    <p>No processed requests</p>
                                </CardContent>
                            </Card>
                        ) : (
                            <div>
                                {processedRequests.map(request => (
                                    <RequestCard key={request._id} request={request} />
                                ))}
                            </div>
                        )}
                    </TabsContent>
                </Tabs>
            </div>
        </DashboardLayout>
    );
}
