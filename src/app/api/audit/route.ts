import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { connectToDatabase } from "@/app/api/actions";
import { ObjectId } from "mongodb";
import { getUserRole } from "@/lib/services/user-role";

interface AuditLogEntry {
    _id?: string;
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

export async function POST(request: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userRole = await getUserRole(userId);
        const body = await request.json();
        const { action, resource, resourceId, oldData, newData, metadata } = body;

        if (!action || !resource || !resourceId) {
            return NextResponse.json({
                error: "Missing required fields: action, resource, resourceId"
            }, { status: 400 });
        }

        const db = await connectToDatabase();

        const auditEntry: AuditLogEntry = {
            userId,
            userRole,
            action,
            resource,
            resourceId,
            oldData,
            newData,
            ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
            userAgent: request.headers.get('user-agent') || 'unknown',
            timestamp: new Date(),
            success: true,
            metadata
        };

        await db.collection("auditLog").insertOne(auditEntry as any);

        return NextResponse.json({
            success: true,
            message: "Audit entry logged successfully"
        });
    } catch (error: any) {
        console.error("POST /api/audit:", error);
        return NextResponse.json(
            { error: error.message || "Failed to log audit entry" },
            { status: 500 }
        );
    }
}

export async function GET(request: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userRole = await getUserRole(userId);
        if (userRole !== 'admin') {
            return NextResponse.json({
                error: "Only administrators can view audit logs"
            }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '50');
        const action = searchParams.get('action');
        const resource = searchParams.get('resource');
        const targetUserId = searchParams.get('userId');
        const dateFrom = searchParams.get('dateFrom');
        const dateTo = searchParams.get('dateTo');

        const skip = (page - 1) * limit;

        const db = await connectToDatabase();

        // Build filter query
        const filter: any = {};

        if (action) {
            filter.action = { $regex: action, $options: 'i' };
        }

        if (resource) {
            filter.resource = resource;
        }

        if (targetUserId) {
            filter.userId = targetUserId;
        }

        if (dateFrom || dateTo) {
            filter.timestamp = {};
            if (dateFrom) {
                filter.timestamp.$gte = new Date(dateFrom);
            }
            if (dateTo) {
                filter.timestamp.$lte = new Date(dateTo);
            }
        }

        // Get total count
        const total = await db.collection("auditLog").countDocuments(filter);

        // Get audit entries with pagination
        const auditEntries = await db.collection("auditLog")
            .find(filter)
            .sort({ timestamp: -1 })
            .skip(skip)
            .limit(limit)
            .toArray();

        const formattedEntries = auditEntries.map(entry => ({
            ...entry,
            _id: entry._id.toString()
        }));

        return NextResponse.json({
            success: true,
            auditEntries: formattedEntries,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error: any) {
        console.error("GET /api/audit:", error);
        return NextResponse.json(
            { error: error.message || "Failed to fetch audit logs" },
            { status: 500 }
        );
    }
}
