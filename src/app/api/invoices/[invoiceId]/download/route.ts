import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { connectToDatabase } from "@/app/api/actions";
import { ObjectId } from "mongodb";
import { getUserRole } from "@/lib/services/user-role";

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ invoiceId: string }> }
) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userRole = await getUserRole(userId);
        if (!userRole || !['admin', 'manager', 'staff'].includes(userRole)) {
            return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
        }

        const params = await context.params;
        const { invoiceId } = params;

        if (!invoiceId) {
            return NextResponse.json({ error: "Invoice ID is required" }, { status: 400 });
        }

        const db = await connectToDatabase();

        // Get the bill data for the invoice
        const bill = await db.collection("bills").findOne({ _id: new ObjectId(invoiceId) });

        if (!bill) {
            return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
        }

        if (!['finalized', 'paid', 'partially_paid'].includes(bill.status)) {
            return NextResponse.json({
                error: "Invoice can only be generated for finalized bills"
            }, { status: 400 });
        }

        // Generate invoice number
        const invoiceNumber = generateInvoiceNumber(bill._id.toString(), bill.finalizedAt || bill.createdAt);
        const invoiceDate = bill.finalizedAt || bill.createdAt;

        // Create HTML content for the invoice
        const htmlContent = generateInvoiceHTML({
            ...bill,
            invoiceNumber,
            invoiceDate
        });

        // For now, return HTML content directly
        // In a real application, you would use a PDF generation library like puppeteer or jsPDF
        return new NextResponse(htmlContent, {
            headers: {
                'Content-Type': 'text/html',
                'Content-Disposition': `attachment; filename="invoice-${invoiceNumber}.html"`
            }
        });

    } catch (error: any) {
        console.error("GET /api/invoices/[invoiceId]/download:", error);
        return NextResponse.json(
            { error: error.message || "Failed to download invoice" },
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

function generateInvoiceHTML(invoice: any): string {
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-LK', {
            style: 'currency',
            currency: 'LKR'
        }).format(amount);
    };

    const formatDate = (date: Date | string) => {
        return new Date(date).toLocaleDateString('en-LK');
    };

    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Invoice ${invoice.invoiceNumber}</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                margin: 0;
                padding: 20px;
                background-color: #f8f9fa;
            }
            .invoice-container {
                max-width: 800px;
                margin: 0 auto;
                background: white;
                padding: 30px;
                border-radius: 8px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .header {
                text-align: center;
                margin-bottom: 30px;
                border-bottom: 2px solid #007bff;
                padding-bottom: 20px;
            }
            .company-name {
                font-size: 24px;
                font-weight: bold;
                color: #007bff;
                margin-bottom: 5px;
            }
            .invoice-title {
                font-size: 20px;
                font-weight: bold;
                margin-bottom: 10px;
            }
            .invoice-number {
                font-size: 16px;
                color: #666;
            }
            .details-section {
                display: flex;
                justify-content: space-between;
                margin-bottom: 30px;
            }
            .details-column {
                flex: 1;
                margin-right: 20px;
            }
            .details-column:last-child {
                margin-right: 0;
            }
            .detail-group {
                margin-bottom: 15px;
            }
            .detail-label {
                font-weight: bold;
                color: #333;
                margin-bottom: 5px;
            }
            .detail-value {
                color: #666;
            }
            .services-section {
                margin-bottom: 30px;
            }
            .section-title {
                font-size: 18px;
                font-weight: bold;
                margin-bottom: 15px;
                color: #333;
                border-bottom: 1px solid #eee;
                padding-bottom: 5px;
            }
            .services-list {
                list-style: none;
                padding: 0;
            }
            .service-item {
                padding: 8px 0;
                border-bottom: 1px solid #f0f0f0;
            }
            .service-item:last-child {
                border-bottom: none;
            }
            .financial-summary {
                background-color: #f8f9fa;
                padding: 20px;
                border-radius: 5px;
                border-left: 4px solid #007bff;
            }
            .amount-row {
                display: flex;
                justify-content: space-between;
                margin-bottom: 10px;
            }
            .amount-row.total {
                font-weight: bold;
                font-size: 18px;
                border-top: 2px solid #007bff;
                padding-top: 10px;
                margin-top: 15px;
            }
            .status-badge {
                display: inline-block;
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 12px;
                font-weight: bold;
                text-transform: uppercase;
            }
            .status-paid {
                background-color: #d4edda;
                color: #155724;
            }
            .status-credit {
                background-color: #f8d7da;
                color: #721c24;
            }
            .status-finalized {
                background-color: #d1ecf1;
                color: #0c5460;
            }
            .footer {
                margin-top: 40px;
                text-align: center;
                color: #666;
                font-size: 12px;
                border-top: 1px solid #eee;
                padding-top: 20px;
            }
            @media print {
                body {
                    background-color: white;
                    padding: 0;
                }
                .invoice-container {
                    box-shadow: none;
                    padding: 0;
                }
            }
        </style>
    </head>
    <body>
        <div class="invoice-container">
            <div class="header">
                <div class="company-name">SAS Auto Billing System</div>
                <div class="invoice-title">INVOICE</div>
                <div class="invoice-number">${invoice.invoiceNumber}</div>
            </div>

            <div class="details-section">
                <div class="details-column">
                    <div class="detail-group">
                        <div class="detail-label">Bill To:</div>
                        <div class="detail-value">
                            <strong>${invoice.customerName}</strong><br>
                            ${invoice.clientType}<br>
                            ${invoice.driverName ? `Driver: ${invoice.driverName}` : ''}
                        </div>
                    </div>
                    
                    <div class="detail-group">
                        <div class="detail-label">Vehicle Information:</div>
                        <div class="detail-value">
                            ${invoice.vehicleNo} (${invoice.vehicleType})
                        </div>
                    </div>
                </div>

                <div class="details-column">
                    <div class="detail-group">
                        <div class="detail-label">Invoice Date:</div>
                        <div class="detail-value">${formatDate(invoice.invoiceDate)}</div>
                    </div>
                    
                    <div class="detail-group">
                        <div class="detail-label">Job ID:</div>
                        <div class="detail-value">${invoice.jobId}</div>
                    </div>

                    <div class="detail-group">
                        <div class="detail-label">Payment Type:</div>
                        <div class="detail-value">
                            <span class="status-badge ${invoice.paymentType === 'Credit' ? 'status-credit' : 'status-finalized'}">
                                ${invoice.paymentType}
                            </span>
                        </div>
                    </div>

                    <div class="detail-group">
                        <div class="detail-label">Status:</div>
                        <div class="detail-value">
                            <span class="status-badge ${invoice.status === 'paid' ? 'status-paid' : invoice.status === 'partially_paid' ? 'status-credit' : 'status-finalized'}">
                                ${invoice.status.replace('_', ' ').toUpperCase()}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div class="services-section">
                <div class="section-title">Services Provided</div>
                <ul class="services-list">
                    ${invoice.services.map((service: any) => `
                        <li class="service-item">
                            ${service.description}
                            ${service.isAdditional ? ' (Additional)' : ''}
                        </li>
                    `).join('')}
                </ul>
            </div>

            ${invoice.chequeDetails && (invoice.chequeDetails.chequeNumber || invoice.chequeDetails.bankName) ? `
            <div class="services-section">
                <div class="section-title">Payment Details</div>
                <div class="detail-group">
                    ${invoice.chequeDetails.chequeNumber ? `<div><strong>Cheque Number:</strong> ${invoice.chequeDetails.chequeNumber}</div>` : ''}
                    ${invoice.chequeDetails.chequeDate ? `<div><strong>Cheque Date:</strong> ${formatDate(invoice.chequeDetails.chequeDate)}</div>` : ''}
                    ${invoice.chequeDetails.bankName ? `<div><strong>Bank:</strong> ${invoice.chequeDetails.bankName}</div>` : ''}
                </div>
            </div>
            ` : ''}

            <div class="financial-summary">
                <div class="amount-row">
                    <span>Subtotal:</span>
                    <span>${formatCurrency(invoice.totalAmount)}</span>
                </div>
                
                ${invoice.initialPayment ? `
                <div class="amount-row">
                    <span>Initial Payment:</span>
                    <span>${formatCurrency(invoice.initialPayment)}</span>
                </div>
                ` : ''}

                <div class="amount-row total">
                    <span>Total Amount:</span>
                    <span>${formatCurrency(invoice.finalAmount)}</span>
                </div>

                ${invoice.remainingBalance && invoice.remainingBalance > 0 ? `
                <div class="amount-row" style="color: #dc3545; font-weight: bold;">
                    <span>Remaining Balance:</span>
                    <span>${formatCurrency(invoice.remainingBalance)}</span>
                </div>
                ` : ''}
            </div>

            <div class="footer">
                <p>Thank you for choosing SAS Auto Services!</p>
                <p>Generated on ${formatDate(new Date())}</p>
            </div>
        </div>
    </body>
    </html>
    `;
}
