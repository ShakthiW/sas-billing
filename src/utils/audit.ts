import { connectToDatabase } from "@/app/api/actions";

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

// Helper function to log actions automatically
export async function logAuditAction(
    userId: string,
    userRole: string,
    action: string,
    resource: string,
    resourceId: string,
    oldData?: any,
    newData?: any,
    metadata?: Record<string, any>,
    success: boolean = true,
    errorMessage?: string
) {
    try {
        const db = await connectToDatabase();

        const auditEntry: AuditLogEntry = {
            userId,
            userRole,
            action,
            resource,
            resourceId,
            oldData,
            newData,
            timestamp: new Date(),
            success,
            errorMessage,
            metadata
        };

        await db.collection("auditLog").insertOne(auditEntry as any);
        return { success: true };
    } catch (error: any) {
        console.error("Failed to log audit action:", error);
        return { success: false, error: error.message };
    }
}
