import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { connectToDatabase } from "@/app/api/actions";
import { ObjectId } from "mongodb";
import { getUserRole } from "@/lib/services/user-role";

interface InvoiceData {
    _id?: string;
    jobId: string;
    invoiceNumber: string;
    invoiceDate: Date;
    issueDate: Date;
    dueDate?: Date;
    vehicleNo: string;
    vehicleType: string;
    customerName: string;
    driverName?: string;
    clientType: "Customer" | "Company";
    services: Array<{
        description: string;
        isAdditional?: boolean;
    }>;
    totalAmount: number;
    finalAmount: number;
    bankAccount: string;
    paymentType: "Cash" | "Credit" | "Cheque";
    status: "draft" | "finalized" | "paid" | "partially_paid";
    initialPayment?: number;
    remainingBalance?: number;
    chequeDetails?: {
        chequeNumber?: string;
        chequeDate?: string;
        bankName?: string;
        chequeImageUrl?: string;
    };
    creditDetails?: {
        dueDate?: string;
        creditTerms?: string;
    };
    createdAt?: Date;
    finalizedAt?: Date;
    lastPaymentDate?: Date;
    updatedAt?: Date;
}

export async function GET(request: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userRole = await getUserRole(userId);
        if (!userRole || !['admin', 'manager', 'staff'].includes(userRole)) {
            return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '50');
        const status = searchParams.get('status');
        const paymentType = searchParams.get('paymentType');
        const customerName = searchParams.get('customerName');
        const vehicleNo = searchParams.get('vehicleNo');
        const dateFrom = searchParams.get('dateFrom');
        const dateTo = searchParams.get('dateTo');

        const db = await connectToDatabase();

        // Build filter query for finalized bills (which become invoices)
        const filter: any = {
            status: { $in: ['finalized', 'paid', 'partially_paid'] }
        };

        if (status && status !== 'all') {
            filter.status = status;
        }

        if (paymentType && paymentType !== 'all') {
            filter.paymentType = paymentType;
        }

        if (customerName) {
            filter.customerName = { $regex: customerName, $options: 'i' };
        }

        if (vehicleNo) {
            filter.vehicleNo = { $regex: vehicleNo, $options: 'i' };
        }

        if (dateFrom || dateTo) {
            filter.finalizedAt = {};
            if (dateFrom) {
                filter.finalizedAt.$gte = new Date(dateFrom);
            }
            if (dateTo) {
                filter.finalizedAt.$lte = new Date(dateTo);
            }
        }

        const skip = (page - 1) * limit;

        // Get total count
        const total = await db.collection("bills").countDocuments(filter);

        // Get bills and transform them to invoices
        const bills = await db.collection("bills")
            .find(filter)
            .sort({ finalizedAt: -1, createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .toArray();

        // Transform bills to invoice format
        const invoices: InvoiceData[] = bills.map(bill => {
            const invoice: InvoiceData = {
                _id: bill._id.toString(),
                jobId: bill.jobId,
                invoiceNumber: generateInvoiceNumber(bill._id.toString(), bill.finalizedAt || bill.createdAt),
                invoiceDate: bill.finalizedAt || bill.createdAt,
                issueDate: bill.finalizedAt || bill.createdAt,
                dueDate: bill.creditDetails?.dueDate ? new Date(bill.creditDetails.dueDate) : undefined,
                vehicleNo: bill.vehicleNo,
                vehicleType: bill.vehicleType,
                customerName: bill.customerName,
                driverName: bill.driverName,
                clientType: bill.clientType,
                services: bill.services,
                totalAmount: bill.totalAmount,
                finalAmount: bill.finalAmount,
                bankAccount: bill.bankAccount,
                paymentType: bill.paymentType,
                status: bill.status,
                initialPayment: bill.initialPayment,
                remainingBalance: bill.remainingBalance,
                chequeDetails: bill.chequeDetails,
                creditDetails: bill.creditDetails,
                createdAt: bill.createdAt,
                finalizedAt: bill.finalizedAt,
                lastPaymentDate: bill.lastPaymentDate,
                updatedAt: bill.updatedAt
            };
            return invoice;
        });

        // Log the invoice access
        try {
            await fetch('/api/audit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'view_invoices',
                    resource: 'invoice',
                    resourceId: 'all',
                    metadata: {
                        filters: {
                            status,
                            paymentType,
                            customerName,
                            vehicleNo,
                            dateFrom,
                            dateTo
                        },
                        totalResults: total
                    }
                })
            });
        } catch (auditError) {
            console.error('Failed to log audit entry:', auditError);
        }

        return NextResponse.json({
            success: true,
            invoices,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error: any) {
        console.error("GET /api/invoices:", error);
        return NextResponse.json(
            { error: error.message || "Failed to fetch invoices" },
            { status: 500 }
        );
    }
}

function generateInvoiceNumber(billId: string, date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const shortId = billId.slice(-6).toUpperCase();
    return `INV-${year}${month}-${shortId}`;
}

export async function POST(request: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userRole = await getUserRole(userId);
        if (!userRole || !['admin', 'manager'].includes(userRole)) {
            return NextResponse.json({ error: "Insufficient permissions to create invoices" }, { status: 403 });
        }

        const body = await request.json();
        const { billId } = body;

        if (!billId) {
            return NextResponse.json({
                error: "Bill ID is required"
            }, { status: 400 });
        }

        const db = await connectToDatabase();

        // Get the bill to create invoice from
        const bill = await db.collection("bills").findOne({ _id: new ObjectId(billId) });

        if (!bill) {
            return NextResponse.json({ error: "Bill not found" }, { status: 404 });
        }

        if (bill.status !== 'finalized') {
            return NextResponse.json({
                error: "Only finalized bills can be converted to invoices"
            }, { status: 400 });
        }

        // Update bill status to mark it as having an invoice generated
        await db.collection("bills").updateOne(
            { _id: new ObjectId(billId) },
            {
                $set: {
                    updatedAt: new Date(),
                    invoiceGenerated: true,
                    invoiceGeneratedAt: new Date(),
                    invoiceGeneratedBy: userId
                }
            }
        );

        const invoiceData: InvoiceData = {
            _id: bill._id.toString(),
            jobId: bill.jobId,
            invoiceNumber: generateInvoiceNumber(bill._id.toString(), bill.finalizedAt || bill.createdAt),
            invoiceDate: bill.finalizedAt || bill.createdAt,
            issueDate: new Date(),
            dueDate: bill.creditDetails?.dueDate ? new Date(bill.creditDetails.dueDate) : undefined,
            vehicleNo: bill.vehicleNo,
            vehicleType: bill.vehicleType,
            customerName: bill.customerName,
            driverName: bill.driverName,
            clientType: bill.clientType,
            services: bill.services,
            totalAmount: bill.totalAmount,
            finalAmount: bill.finalAmount,
            bankAccount: bill.bankAccount,
            paymentType: bill.paymentType,
            status: bill.status,
            initialPayment: bill.initialPayment,
            remainingBalance: bill.remainingBalance,
            chequeDetails: bill.chequeDetails,
            creditDetails: bill.creditDetails,
            createdAt: bill.createdAt,
            finalizedAt: bill.finalizedAt,
            lastPaymentDate: bill.lastPaymentDate,
            updatedAt: bill.updatedAt
        };

        return NextResponse.json({
            success: true,
            message: "Invoice created successfully",
            invoice: invoiceData
        });
    } catch (error: any) {
        console.error("POST /api/invoices:", error);
        return NextResponse.json(
            { error: error.message || "Failed to create invoice" },
            { status: 500 }
        );
    }
}
