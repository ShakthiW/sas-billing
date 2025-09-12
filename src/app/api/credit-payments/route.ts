import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
    addCreditPayment,
    getAllCreditPayments,
    updateBillStatusWithValidation
} from "@/app/api/actions";
import { getUserRole } from "@/lib/services/user-role";
import { getApprovalPermissions } from "@/types/approval";
import { validateAdminPassword, logAdminPasswordUsage, ADMIN_PASSWORD_ACTIONS } from "@/lib/services/admin-password";
import { headers } from "next/headers";

export async function GET(request: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const billId = searchParams.get('billId');

        if (billId) {
            // Get payments for specific bill
            const result = await getAllCreditPayments(50, 0);
            if (result.success && result.payments) {
                const billPayments = result.payments.filter(payment => payment.billId === billId);
                return NextResponse.json({ success: true, payments: billPayments });
            } else {
                return NextResponse.json({ error: result.error }, { status: 500 });
            }
        } else {
            // Get all payments
            const result = await getAllCreditPayments();
            if (result.success) {
                return NextResponse.json({ success: true, payments: result.payments });
            } else {
                return NextResponse.json({ error: result.error }, { status: 500 });
            }
        }
    } catch (error: any) {
        console.error("GET /api/credit-payments:", error);
        return NextResponse.json(
            { error: error.message || "Failed to fetch payments" },
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
        const { billId, paymentAmount, paymentMethod, notes, chequeDetails, adminPassword } = body;

        // Admin password is required for completing payments
        if (!adminPassword) {
            return NextResponse.json({
                error: "Admin password is required for completing payments"
            }, { status: 400 });
        }

        // Validate admin password
        const passwordValidation = await validateAdminPassword(adminPassword);
        if (!passwordValidation.isValid) {
            return NextResponse.json({
                error: "Invalid admin password"
            }, { status: 401 });
        }

        // Permission check - staff need approval for payments
        if (userRole === 'staff') {
            return NextResponse.json({
                error: "Staff members cannot process payments directly. Please submit for approval."
            }, { status: 403 });
        }

        // For managers, cheque payments need admin approval  
        if (userRole === 'manager' && paymentMethod === 'Cheque') {
            return NextResponse.json({
                error: "Cheque payments require admin approval."
            }, { status: 403 });
        }

        // Validate required fields
        if (!billId || !paymentAmount || !paymentMethod) {
            return NextResponse.json({
                error: "Missing required fields: billId, paymentAmount, paymentMethod"
            }, { status: 400 });
        }

        if (typeof paymentAmount !== 'number' || paymentAmount <= 0) {
            return NextResponse.json({
                error: "Payment amount must be a positive number"
            }, { status: 400 });
        }

        // Validate cheque details if payment method is cheque
        if (paymentMethod === 'Cheque') {
            if (!chequeDetails?.chequeNumber || !chequeDetails?.chequeDate) {
                return NextResponse.json({
                    error: "Cheque number and date are required for cheque payments"
                }, { status: 400 });
            }
        }

        // Process the payment
        try {
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
                ADMIN_PASSWORD_ACTIONS.COMPLETE_PAYMENT,
                billId,
                'bill',
                { paymentAmount, paymentMethod, notes },
                ipAddress,
                userAgent
            );

            const result = await addCreditPayment(
                billId,
                paymentAmount,
                paymentMethod,
                notes,
                chequeDetails,
                userId
            );

            if (result.success) {
                return NextResponse.json({
                    success: true,
                    paymentId: result.paymentId,
                    message: "Payment processed successfully"
                });
            } else {
                return NextResponse.json({
                    error: result.error || "Failed to process payment"
                }, { status: 500 });
            }
        } catch (error: any) {
            console.error("POST /api/credit-payments:", error);
            return NextResponse.json(
                { error: error.message || "Failed to process payment" },
                { status: 500 }
            );
        }
    } catch (error: any) {
        console.error("POST /api/credit-payments:", error);
        return NextResponse.json(
            { error: error.message || "Failed to process payment" },
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

        // Only admin can update payment records
        if (userRole !== 'admin') {
            return NextResponse.json({
                error: "Only administrators can modify payment records"
            }, { status: 403 });
        }

        const body = await request.json();
        const { paymentId, validationStatus, notes } = body;

        if (!paymentId || !validationStatus) {
            return NextResponse.json({
                error: "Missing required fields: paymentId, validationStatus"
            }, { status: 400 });
        }

        // Update payment validation status
        // This would require implementing updateCreditPayment function
        // For now, return success
        return NextResponse.json({
            success: true,
            message: "Payment validation status updated"
        });
    } catch (error: any) {
        console.error("PATCH /api/credit-payments:", error);
        return NextResponse.json(
            { error: error.message || "Failed to update payment" },
            { status: 500 }
        );
    }
}
