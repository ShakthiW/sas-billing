"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { useUser } from "@clerk/nextjs";
import { Plus, FileText, AlertCircle } from "lucide-react";
import { getApprovalPermissions } from "@/types/approval";

interface CreateApprovalRequestProps {
    jobId?: string; // Optional - for job-specific requests
    onRequestCreated?: (requestId: string) => void;
}

export default function CreateApprovalRequest({ jobId, onRequestCreated }: CreateApprovalRequestProps) {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [requestType, setRequestType] = useState<'part' | 'service' | 'payment'>('part');
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [partType, setPartType] = useState('');
    const [serviceName, setServiceName] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Cheque' | 'Bank Transfer'>('Cash');
    const [warrantyPeriod, setWarrantyPeriod] = useState<number>(12);
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);
    const [currentJobId, setCurrentJobId] = useState(jobId || '');

    const { toast } = useToast();
    const { permissions, role } = useUserPermissions();
    const { user } = useUser();

    // Get approval permissions
    const approvalPermissions = getApprovalPermissions(role);

    // Check permissions
    const canRequestParts = approvalPermissions.canRequestParts;
    const canRequestServices = approvalPermissions.canRequestServices;
    const canRequestPayments = approvalPermissions.canRequestPayments;

    const hasAnyPermission = canRequestParts || canRequestServices || canRequestPayments;

    const resetForm = () => {
        setRequestType('part');
        setDescription('');
        setAmount('');
        setPartType('');
        setServiceName('');
        setPaymentMethod('Cash');
        setWarrantyPeriod(12);
        setNotes('');
        setCurrentJobId(jobId || '');
    };

    const handleSubmit = async () => {
        if (!user?.id) {
            toast({
                title: "Error",
                description: "User not authenticated",
                variant: "destructive"
            });
            return;
        }

        // Validation
        if (!currentJobId.trim()) {
            toast({
                title: "Error",
                description: "Job ID is required",
                variant: "destructive"
            });
            return;
        }

        if (!description.trim()) {
            toast({
                title: "Error",
                description: "Description is required",
                variant: "destructive"
            });
            return;
        }

        // Type-specific validation
        if (requestType === 'part' && !partType.trim()) {
            toast({
                title: "Error",
                description: "Part type is required",
                variant: "destructive"
            });
            return;
        }

        if (requestType === 'service' && !serviceName.trim()) {
            toast({
                title: "Error",
                description: "Service name is required",
                variant: "destructive"
            });
            return;
        }

        if (requestType === 'payment') {
            const amountValue = parseFloat(amount);
            if (!amount || isNaN(amountValue) || amountValue <= 0) {
                toast({
                    title: "Error",
                    description: "Valid payment amount is required",
                    variant: "destructive"
                });
                return;
            }
        }

        try {
            setLoading(true);

            // Prepare request data based on type
            let requestData: any = {
                description: description.trim(),
                notes: notes.trim()
            };

            let metadata: any = {};

            switch (requestType) {
                case 'part':
                    requestData = {
                        ...requestData,
                        taskType: 'parts',
                        partsType: partType.trim(),
                        warrantyPeriod
                    };
                    metadata = {
                        partType: partType.trim(),
                        warrantyPeriod,
                        amount: amount ? parseFloat(amount) : undefined
                    };
                    break;

                case 'service':
                    requestData = {
                        ...requestData,
                        taskType: 'service',
                        serviceType: serviceName.trim()
                    };
                    metadata = {
                        serviceName: serviceName.trim(),
                        amount: amount ? parseFloat(amount) : undefined
                    };
                    break;

                case 'payment':
                    requestData = {
                        ...requestData,
                        paymentAmount: parseFloat(amount),
                        paymentMethod,
                        jobId: currentJobId
                    };
                    metadata = {
                        paymentAmount: parseFloat(amount),
                        paymentMethod,
                        jobId: currentJobId
                    };
                    break;
            }

            const response = await fetch('/api/approvals', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'create',
                    type: requestType,
                    jobId: currentJobId,
                    requestData,
                    metadata
                })
            });

            const data = await response.json();

            if (data.success) {
                toast({
                    title: "Success",
                    description: `${requestType.charAt(0).toUpperCase() + requestType.slice(1)} request submitted for approval`,
                });

                onRequestCreated?.(data.requestId);
                setIsDialogOpen(false);
                resetForm();
            } else {
                throw new Error(data.error);
            }
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Failed to submit approval request",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    const getRequirementText = () => {
        switch (requestType) {
            case 'part':
                return canRequestParts
                    ? "This part request will be submitted for approval by admin/manager"
                    : "You don't have permission to request parts";
            case 'service':
                return canRequestServices
                    ? "This service request will be submitted for approval by admin/manager"
                    : "You don't have permission to request services";
            case 'payment':
                return canRequestPayments
                    ? "This payment request will be submitted for admin approval"
                    : "You don't have permission to request payments";
            default:
                return "";
        }
    };

    const canSubmitType = () => {
        switch (requestType) {
            case 'part': return canRequestParts;
            case 'service': return canRequestServices;
            case 'payment': return canRequestPayments;
            default: return false;
        }
    };

    if (!hasAnyPermission) {
        return null; // Don't show the component if user has no permissions
    }

    return (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
                <Button
                    variant="outline"
                    className="flex items-center gap-2"
                    onClick={() => setIsDialogOpen(true)}
                >
                    <Plus className="w-4 h-4" />
                    Request Approval
                </Button>
            </DialogTrigger>

            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FileText className="w-5 h-5" />
                        Create Approval Request
                    </DialogTitle>
                    <DialogDescription>
                        Submit a request for approval by admin or manager
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Request Type Selection */}
                    <div>
                        <Label htmlFor="requestType">Request Type</Label>
                        <Select value={requestType} onValueChange={(value: any) => setRequestType(value)}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select request type" />
                            </SelectTrigger>
                            <SelectContent>
                                {canRequestParts && <SelectItem value="part">Part Request</SelectItem>}
                                {canRequestServices && <SelectItem value="service">Service Request</SelectItem>}
                                {canRequestPayments && <SelectItem value="payment">Payment Request</SelectItem>}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Job ID */}
                    <div>
                        <Label htmlFor="jobId">Job ID</Label>
                        <Input
                            id="jobId"
                            value={currentJobId}
                            onChange={(e) => setCurrentJobId(e.target.value)}
                            placeholder="Enter job ID (vehicle number)"
                            disabled={!!jobId} // Disable if jobId is provided as prop
                        />
                    </div>

                    {/* Type-specific fields */}
                    {requestType === 'part' && (
                        <div>
                            <Label htmlFor="partType">Part Type</Label>
                            <Input
                                id="partType"
                                value={partType}
                                onChange={(e) => setPartType(e.target.value)}
                                placeholder="e.g., Engine Oil, Brake Pads, Battery"
                            />
                        </div>
                    )}

                    {requestType === 'service' && (
                        <div>
                            <Label htmlFor="serviceName">Service Name</Label>
                            <Input
                                id="serviceName"
                                value={serviceName}
                                onChange={(e) => setServiceName(e.target.value)}
                                placeholder="e.g., Oil Change, Brake Service, Engine Repair"
                            />
                        </div>
                    )}

                    {requestType === 'payment' && (
                        <>
                            <div>
                                <Label htmlFor="amount">Payment Amount (Rs.)</Label>
                                <Input
                                    id="amount"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder="Enter payment amount"
                                />
                            </div>
                            <div>
                                <Label htmlFor="paymentMethod">Payment Method</Label>
                                <Select value={paymentMethod} onValueChange={(value: any) => setPaymentMethod(value)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select payment method" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Cash">Cash</SelectItem>
                                        <SelectItem value="Cheque">Cheque</SelectItem>
                                        <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </>
                    )}

                    {/* Amount (optional for parts/services) */}
                    {(requestType === 'part' || requestType === 'service') && (
                        <div>
                            <Label htmlFor="amount">Estimated Amount (Optional)</Label>
                            <Input
                                id="amount"
                                type="number"
                                step="0.01"
                                min="0"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="Enter estimated cost"
                            />
                        </div>
                    )}

                    {/* Warranty Period (for parts only) */}
                    {requestType === 'part' && (
                        <div>
                            <Label htmlFor="warrantyPeriod">Warranty Period (Months)</Label>
                            <Input
                                id="warrantyPeriod"
                                type="number"
                                min="1"
                                max="60"
                                value={warrantyPeriod}
                                onChange={(e) => setWarrantyPeriod(parseInt(e.target.value) || 12)}
                            />
                        </div>
                    )}

                    {/* Description */}
                    <div>
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Provide detailed description of the request..."
                            rows={3}
                        />
                    </div>

                    {/* Additional Notes */}
                    <div>
                        <Label htmlFor="notes">Additional Notes (Optional)</Label>
                        <Textarea
                            id="notes"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Any additional information or special requirements..."
                            rows={2}
                        />
                    </div>

                    {/* Permission/Requirement Notice */}
                    <Card className={canSubmitType() ? "border-blue-200 bg-blue-50" : "border-red-200 bg-red-50"}>
                        <CardContent className="p-4">
                            <div className="flex items-center gap-2">
                                <AlertCircle className={`w-5 h-5 ${canSubmitType() ? 'text-blue-600' : 'text-red-600'}`} />
                                <div>
                                    <p className={`font-medium ${canSubmitType() ? 'text-blue-800' : 'text-red-800'}`}>
                                        {canSubmitType() ? 'Request Information' : 'Permission Required'}
                                    </p>
                                    <p className={`text-sm ${canSubmitType() ? 'text-blue-700' : 'text-red-700'}`}>
                                        {getRequirementText()}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => setIsDialogOpen(false)}
                        disabled={loading}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={loading || !canSubmitType()}
                    >
                        {loading ? "Submitting..." : "Submit Request"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
