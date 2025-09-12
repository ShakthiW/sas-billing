import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
    createApprovalRequest,
    getApprovalRequests,
    approveRequest,
    addSubTaskWithApproval
} from "@/app/api/actions";
import { getUserRole } from "@/lib/services/user-role";
import { getApprovalPermissions } from "@/types/approval";

export async function GET(request: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userRole = await getUserRole(userId);
        const permissions = getApprovalPermissions(userRole);

        if (!permissions.canViewAllApprovals && userRole !== 'staff') {
            return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status') as 'pending' | 'approved' | 'rejected' | null;
        const type = searchParams.get('type') as 'part' | 'service' | 'payment' | null;

        let requests;
        if (userRole === 'staff') {
            // Staff can only see their own requests
            const allRequests = await getApprovalRequests(status || undefined, type || undefined);
            requests = allRequests.filter(req => req.requestedBy === userId);
        } else {
            // Admin/Manager can see all requests
            requests = await getApprovalRequests(status || undefined, type || undefined);
        }

        return NextResponse.json({
            success: true,
            requests,
            permissions
        });
    } catch (error: any) {
        console.error("GET /api/approvals:", error);
        return NextResponse.json(
            { error: error.message || "Failed to fetch approval requests" },
            { status: 500 }
        );
    }
}

export async function PUT(request: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userRole = await getUserRole(userId);
        const permissions = getApprovalPermissions(userRole);

        const body = await request.json();
        const { requestId, action, rejectionReason } = body;

        if (!requestId || !action) {
            return NextResponse.json({ error: "Missing requestId or action" }, { status: 400 });
        }

        if (action !== 'approve' && action !== 'reject') {
            return NextResponse.json({ error: "Invalid action. Must be 'approve' or 'reject'" }, { status: 400 });
        }

        // Get the request to check its type for permissions
        const allRequests = await getApprovalRequests();
        const approvalRequest = allRequests.find(req => req._id?.toString() === requestId);

        if (!approvalRequest) {
            return NextResponse.json({ error: "Request not found" }, { status: 404 });
        }

        // Check approval permissions based on request type
        let hasPermission = false;
        if (approvalRequest.type === 'part' && permissions.canApproveParts) hasPermission = true;
        if (approvalRequest.type === 'service' && permissions.canApproveServices) hasPermission = true;
        if (approvalRequest.type === 'payment' && permissions.canApprovePayments) hasPermission = true;
        if (approvalRequest.type === 'status_change' && permissions.canApproveStatusChanges) hasPermission = true;
        if (approvalRequest.type === 'credit_payment' && permissions.canApproveCreditPayments) hasPermission = true;

        if (!hasPermission) {
            return NextResponse.json({
                error: `No permission to ${action} ${approvalRequest.type} requests`
            }, { status: 403 });
        }

        const result = await approveRequest(requestId, userId, action, rejectionReason);

        if (result.success) {
            return NextResponse.json({ success: true });
        } else {
            return NextResponse.json({ error: result.error }, { status: 500 });
        }
    } catch (error: any) {
        console.error("PUT /api/approvals:", error);
        return NextResponse.json(
            { error: error.message || "Failed to process approval" },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userRole = await getUserRole(userId);
        const permissions = getApprovalPermissions(userRole);

        const body = await request.json();
        const { action, ...data } = body;

        switch (action) {
            case 'create':
                return await handleCreateRequest(data, userId, userRole, permissions);
            case 'approve':
            case 'reject':
                return await handleApprovalAction(data, userId, userRole, permissions, action);
            case 'add_subtask':
                return await handleAddSubTask(data, userId, userRole);
            default:
                return NextResponse.json({ error: "Invalid action" }, { status: 400 });
        }
    } catch (error: any) {
        console.error("POST /api/approvals:", error);
        return NextResponse.json(
            { error: error.message || "Failed to process request" },
            { status: 500 }
        );
    }
}

async function handleCreateRequest(
    data: any,
    userId: string,
    userRole: string,
    permissions: any
) {
    const { type, jobId, requestData, metadata } = data;

    // Check permissions
    if (type === 'part' && !permissions.canRequestParts) {
        return NextResponse.json({ error: "No permission to request parts" }, { status: 403 });
    }
    if (type === 'service' && !permissions.canRequestServices) {
        return NextResponse.json({ error: "No permission to request services" }, { status: 403 });
    }
    if (type === 'payment' && !permissions.canRequestPayments) {
        return NextResponse.json({ error: "No permission to request payments" }, { status: 403 });
    }

    const result = await createApprovalRequest(type, jobId, userId, requestData, metadata);

    if (result.success) {
        return NextResponse.json({ success: true, requestId: result.requestId });
    } else {
        return NextResponse.json({ error: result.error }, { status: 500 });
    }
}

async function handleApprovalAction(
    data: any,
    userId: string,
    userRole: string,
    permissions: any,
    action: 'approve' | 'reject'
) {
    const { requestId, rejectionReason, requestType } = data;

    // Check approval permissions based on request type
    let hasPermission = false;
    if (requestType === 'part' && permissions.canApproveParts) hasPermission = true;
    if (requestType === 'service' && permissions.canApproveServices) hasPermission = true;
    if (requestType === 'payment' && permissions.canApprovePayments) hasPermission = true;

    if (!hasPermission) {
        return NextResponse.json({
            error: `No permission to ${action} ${requestType} requests`
        }, { status: 403 });
    }

    const result = await approveRequest(requestId, userId, action, rejectionReason);

    if (result.success) {
        return NextResponse.json({ success: true });
    } else {
        return NextResponse.json({ error: result.error }, { status: 500 });
    }
}

async function handleAddSubTask(
    data: any,
    userId: string,
    userRole: any
) {
    const { jobId, subtaskData } = data;

    const result = await addSubTaskWithApproval(jobId, subtaskData, userId, userRole);

    if (result.success) {
        return NextResponse.json({
            success: true,
            requiresApproval: result.requiresApproval,
            subtaskId: result.subtaskId,
            requestId: result.requestId
        });
    } else {
        return NextResponse.json({ error: result.error }, { status: 500 });
    }
}
