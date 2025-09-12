import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { connectToDatabase } from "@/app/api/actions";
import { ObjectId } from "mongodb";
import { getUserRole } from "@/lib/services/user-role";
import { validateAdminPassword, logAdminPasswordUsage, ADMIN_PASSWORD_ACTIONS } from "@/lib/services/admin-password";
import { getUserPermissions } from "@/types/user";
import { headers } from "next/headers";

export async function POST(request: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userRole = await getUserRole(userId);
        const permissions = getUserPermissions(userRole);

        // Check if user has permission to delete jobs
        if (!permissions.canDeleteJobs) {
            return NextResponse.json({
                error: "You don't have permission to delete items. Please contact an administrator."
            }, { status: 403 });
        }

        const body = await request.json();
        const { itemType, itemId, reason, adminPassword } = body;

        if (!itemType || !itemId) {
            return NextResponse.json({
                error: "Missing required fields: itemType, itemId"
            }, { status: 400 });
        }

        // Admin password is required for all deletion actions
        if (!adminPassword) {
            return NextResponse.json({
                error: "Admin password is required for deletion actions"
            }, { status: 400 });
        }

        // Validate admin password
        const passwordValidation = await validateAdminPassword(adminPassword);
        if (!passwordValidation.isValid) {
            return NextResponse.json({
                error: "Invalid admin password"
            }, { status: 401 });
        }

        const db = await connectToDatabase();

        // Validate that the item exists
        let collection: string;
        let item: any;

        switch (itemType) {
            case 'job':
                collection = 'jobs';
                item = await db.collection(collection).findOne({ _id: new ObjectId(itemId) });
                break;
            case 'bill':
                collection = 'bills';
                item = await db.collection(collection).findOne({ _id: new ObjectId(itemId) });
                break;
            case 'payment':
                collection = 'creditPayments';
                item = await db.collection(collection).findOne({ _id: new ObjectId(itemId) });
                break;
            default:
                return NextResponse.json({
                    error: "Invalid item type. Supported: job, bill, payment"
                }, { status: 400 });
        }

        if (!item) {
            return NextResponse.json({
                error: "Item not found"
            }, { status: 404 });
        }

        // Check if item is already deleted
        if (item.deleted) {
            return NextResponse.json({
                error: "Item is already deleted"
            }, { status: 400 });
        }

        const deleteRecord = {
            originalId: itemId,
            itemType,
            originalData: item,
            deletedBy: userId,
            deletedAt: new Date(),
            reason: reason || "No reason provided",
            status: userRole === 'admin' ? 'deleted' : 'pending_approval', // Admin can delete directly
            restorable: true
        };

        if (userRole === 'admin') {
            // Get request headers for logging
            const headersList = await headers();
            const ipAddress = headersList.get('x-forwarded-for') ||
                headersList.get('x-real-ip') ||
                'unknown';
            const userAgent = headersList.get('user-agent') || 'unknown';

            // Log password usage
            await logAdminPasswordUsage(
                passwordValidation.passwordId!,
                userId,
                itemType === 'job' ? ADMIN_PASSWORD_ACTIONS.DELETE_JOB :
                    itemType === 'bill' ? ADMIN_PASSWORD_ACTIONS.DELETE_BILL :
                        ADMIN_PASSWORD_ACTIONS.DELETE_PAYMENT,
                itemId,
                itemType,
                { reason, itemData: item },
                ipAddress,
                userAgent
            );

            // Admin can delete directly
            await db.collection(collection).updateOne(
                { _id: new ObjectId(itemId) },
                {
                    $set: {
                        deleted: true,
                        deletedAt: new Date(),
                        deletedBy: userId,
                        deletionReason: reason
                    }
                }
            );

            // Store in deletion log
            await db.collection("deletionLog").insertOne(deleteRecord);

            return NextResponse.json({
                success: true,
                message: "Item deleted successfully"
            });
        } else {
            // Manager needs approval for deletion
            await db.collection("deletionRequests").insertOne(deleteRecord);

            return NextResponse.json({
                success: true,
                message: "Deletion request submitted for admin approval"
            });
        }
    } catch (error: any) {
        console.error("POST /api/delete:", error);
        return NextResponse.json(
            { error: error.message || "Failed to process deletion request" },
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
                error: "Only administrators can view deletion records"
            }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const type = searchParams.get('type') || 'all'; // 'deleted', 'pending', 'all'

        const db = await connectToDatabase();

        let deletedItems: any[] = [];
        let pendingRequests: any[] = [];

        if (type === 'all' || type === 'deleted') {
            deletedItems = await db.collection("deletionLog")
                .find({ status: 'deleted' })
                .sort({ deletedAt: -1 })
                .toArray();
        }

        if (type === 'all' || type === 'pending') {
            pendingRequests = await db.collection("deletionRequests")
                .find({ status: 'pending_approval' })
                .sort({ deletedAt: -1 })
                .toArray();
        }

        return NextResponse.json({
            success: true,
            deletedItems: deletedItems.map(item => ({
                ...item,
                _id: item._id.toString()
            })),
            pendingRequests: pendingRequests.map(item => ({
                ...item,
                _id: item._id.toString()
            }))
        });
    } catch (error: any) {
        console.error("GET /api/delete:", error);
        return NextResponse.json(
            { error: error.message || "Failed to fetch deletion records" },
            { status: 500 }
        );
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userRole = await getUserRole(userId);
        if (userRole !== 'admin') {
            return NextResponse.json({
                error: "Only administrators can approve/reject deletion requests"
            }, { status: 403 });
        }

        const body = await request.json();
        const { requestId, action, reason, adminPassword } = body; // action: 'approve', 'reject', 'restore'

        if (!requestId || !action) {
            return NextResponse.json({
                error: "Missing required fields: requestId, action"
            }, { status: 400 });
        }

        // Admin password is required for all deletion management actions
        if (!adminPassword) {
            return NextResponse.json({
                error: "Admin password is required for deletion management actions"
            }, { status: 400 });
        }

        // Validate admin password
        const passwordValidation = await validateAdminPassword(adminPassword);
        if (!passwordValidation.isValid) {
            return NextResponse.json({
                error: "Invalid admin password"
            }, { status: 401 });
        }

        const db = await connectToDatabase();

        if (action === 'restore') {
            // Get request headers for logging
            const headersList = await headers();
            const ipAddress = headersList.get('x-forwarded-for') ||
                headersList.get('x-real-ip') ||
                'unknown';
            const userAgent = headersList.get('user-agent') || 'unknown';

            // Log password usage
            await logAdminPasswordUsage(
                passwordValidation.passwordId!,
                userId,
                ADMIN_PASSWORD_ACTIONS.RESTORE_ITEM,
                requestId,
                'deletion_record',
                { action, reason },
                ipAddress,
                userAgent
            );

            // Restore a deleted item
            const deletionRecord = await db.collection("deletionLog").findOne({ _id: new ObjectId(requestId) });
            if (!deletionRecord) {
                return NextResponse.json({ error: "Deletion record not found" }, { status: 404 });
            }

            const { originalId, itemType, originalData } = deletionRecord;
            let collection: string;

            switch (itemType) {
                case 'job':
                    collection = 'jobs';
                    break;
                case 'bill':
                    collection = 'bills';
                    break;
                case 'payment':
                    collection = 'creditPayments';
                    break;
                default:
                    return NextResponse.json({ error: "Invalid item type" }, { status: 400 });
            }

            // Restore the item
            await db.collection(collection).updateOne(
                { _id: new ObjectId(originalId) },
                {
                    $unset: {
                        deleted: "",
                        deletedAt: "",
                        deletedBy: "",
                        deletionReason: ""
                    },
                    $set: {
                        restoredAt: new Date(),
                        restoredBy: userId
                    }
                }
            );

            // Update deletion log
            await db.collection("deletionLog").updateOne(
                { _id: new ObjectId(requestId) },
                {
                    $set: {
                        status: 'restored',
                        restoredAt: new Date(),
                        restoredBy: userId,
                        restorationReason: reason
                    }
                }
            );

            return NextResponse.json({
                success: true,
                message: "Item restored successfully"
            });
        } else {
            // Approve or reject deletion request
            const request = await db.collection("deletionRequests").findOne({ _id: new ObjectId(requestId) });
            if (!request) {
                return NextResponse.json({ error: "Deletion request not found" }, { status: 404 });
            }

            if (action === 'approve') {
                const { originalId, itemType, originalData } = request;
                let collection: string;

                switch (itemType) {
                    case 'job':
                        collection = 'jobs';
                        break;
                    case 'bill':
                        collection = 'bills';
                        break;
                    case 'payment':
                        collection = 'creditPayments';
                        break;
                    default:
                        return NextResponse.json({ error: "Invalid item type" }, { status: 400 });
                }

                // Perform the deletion
                await db.collection(collection).updateOne(
                    { _id: new ObjectId(originalId) },
                    {
                        $set: {
                            deleted: true,
                            deletedAt: new Date(),
                            deletedBy: userId,
                            deletionReason: request.reason
                        }
                    }
                );

                // Move to deletion log
                await db.collection("deletionLog").insertOne({
                    ...request,
                    status: 'deleted',
                    approvedBy: userId,
                    approvedAt: new Date(),
                    approvalReason: reason
                });

                // Remove from pending requests
                await db.collection("deletionRequests").deleteOne({ _id: new ObjectId(requestId) });

                return NextResponse.json({
                    success: true,
                    message: "Deletion request approved and item deleted"
                });
            } else if (action === 'reject') {
                // Reject the deletion request
                await db.collection("deletionRequests").updateOne(
                    { _id: new ObjectId(requestId) },
                    {
                        $set: {
                            status: 'rejected',
                            rejectedBy: userId,
                            rejectedAt: new Date(),
                            rejectionReason: reason
                        }
                    }
                );

                return NextResponse.json({
                    success: true,
                    message: "Deletion request rejected"
                });
            } else {
                return NextResponse.json({
                    error: "Invalid action. Supported: approve, reject, restore"
                }, { status: 400 });
            }
        }
    } catch (error: any) {
        console.error("PATCH /api/delete:", error);
        return NextResponse.json(
            { error: error.message || "Failed to process request" },
            { status: 500 }
        );
    }
}
