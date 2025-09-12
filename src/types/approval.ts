import { UserRole } from "@/types/user";
import { ObjectId } from "mongodb";

export interface ApprovalRequest {
    _id?: ObjectId;
    type: 'part' | 'service' | 'payment' | 'status_change' | 'credit_payment';
    jobId: string;
    requestedBy: string; // User ID
    requestData: any; // The data being requested for approval
    status: 'pending' | 'approved' | 'rejected';
    approvedBy?: string; // User ID who approved/rejected
    approvedAt?: Date;
    rejectionReason?: string;
    createdAt: Date;
    metadata?: {
        // For parts/services
        partType?: string;
        serviceName?: string;
        amount?: number;
        warrantyPeriod?: number;
        // For payments
        paymentAmount?: number;
        paymentMethod?: string;
        billId?: string;
        // For status changes
        currentStatus?: string;
        newStatus?: string;
        vehicleNo?: string;
        // For credit payments
        customerName?: string;
        creditAmount?: number;
        remainingBalance?: number;
    };
}

// Interface for API responses (with string _id for JSON serialization)
export interface ApprovalRequestResponse {
    _id?: string;
    type: 'part' | 'service' | 'payment' | 'status_change' | 'credit_payment';
    jobId: string;
    requestedBy: string; // User ID
    requestData: any; // The data being requested for approval
    status: 'pending' | 'approved' | 'rejected';
    approvedBy?: string; // User ID who approved/rejected
    approvedAt?: Date;
    rejectionReason?: string;
    createdAt: Date;
    metadata?: {
        // For parts/services
        partType?: string;
        serviceName?: string;
        amount?: number;
        warrantyPeriod?: number;
        // For payments
        paymentAmount?: number;
        paymentMethod?: string;
        billId?: string;
        // For status changes
        currentStatus?: string;
        newStatus?: string;
        vehicleNo?: string;
        // For credit payments
        customerName?: string;
        creditAmount?: number;
        remainingBalance?: number;
    };
}

export interface ApprovalPermissions {
    canRequestParts: boolean;
    canRequestServices: boolean;
    canRequestPayments: boolean;
    canRequestStatusChanges: boolean;
    canRequestCreditPayments: boolean;
    canApproveParts: boolean;
    canApproveServices: boolean;
    canApprovePayments: boolean;
    canApproveStatusChanges: boolean;
    canApproveCreditPayments: boolean;
    canViewAllApprovals: boolean;
}

export function getApprovalPermissions(role: UserRole): ApprovalPermissions {
    switch (role) {
        case 'admin':
            return {
                canRequestParts: true,
                canRequestServices: true,
                canRequestPayments: true,
                canRequestStatusChanges: true,
                canRequestCreditPayments: true,
                canApproveParts: true,
                canApproveServices: true,
                canApprovePayments: true,
                canApproveStatusChanges: true,
                canApproveCreditPayments: true,
                canViewAllApprovals: true,
            };
        case 'manager':
            return {
                canRequestParts: true,
                canRequestServices: true,
                canRequestPayments: true,
                canRequestStatusChanges: true,
                canRequestCreditPayments: true,
                canApproveParts: true,
                canApproveServices: true,
                canApprovePayments: false, // Only admin can approve payments
                canApproveStatusChanges: true,
                canApproveCreditPayments: false, // Only admin can approve credit payments
                canViewAllApprovals: true,
            };
        case 'staff':
            return {
                canRequestParts: true,
                canRequestServices: true,
                canRequestPayments: true, // Staff can now request payments (for approval)
                canRequestStatusChanges: true, // Staff can request status changes (for approval)
                canRequestCreditPayments: true, // Staff can request credit payments (for approval)
                canApproveParts: false,
                canApproveServices: false,
                canApprovePayments: false,
                canApproveStatusChanges: false,
                canApproveCreditPayments: false,
                canViewAllApprovals: false,
            };
        case 'tax':
            return {
                canRequestParts: false,
                canRequestServices: false,
                canRequestPayments: false,
                canRequestStatusChanges: false,
                canRequestCreditPayments: false,
                canApproveParts: false,
                canApproveServices: false,
                canApprovePayments: false,
                canApproveStatusChanges: false,
                canApproveCreditPayments: false,
                canViewAllApprovals: true, // Tax role can view all approvals
            };
        default:
            return {
                canRequestParts: false,
                canRequestServices: false,
                canRequestPayments: false,
                canRequestStatusChanges: false,
                canRequestCreditPayments: false,
                canApproveParts: false,
                canApproveServices: false,
                canApprovePayments: false,
                canApproveStatusChanges: false,
                canApproveCreditPayments: false,
                canViewAllApprovals: false,
            };
    }
}
