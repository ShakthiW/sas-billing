import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { connectToDatabase } from "@/app/api/actions";
import { getUserRole } from "@/lib/services/user-role";

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ year: string; month: string }> }
) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userRole = await getUserRole(userId);
        if (!userRole || !['admin', 'manager'].includes(userRole)) {
            return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
        }

        const params = await context.params;
        const { year, month } = params;

        if (!year || !month) {
            return NextResponse.json({ error: "Year and month are required" }, { status: 400 });
        }

        const db = await connectToDatabase();

        // Generate the monthly report data
        const reportData = await generateMonthlyReportData(db, parseInt(year), parseInt(month));

        if (!reportData) {
            return NextResponse.json({ error: "Report not found" }, { status: 404 });
        }

        // Generate HTML content for the report
        const htmlContent = generateReportHTML(reportData);

        // Return HTML for download
        const reportFileName = `monthly-report-${year}-${month.padStart(2, '0')}.html`;

        return new NextResponse(htmlContent, {
            headers: {
                'Content-Type': 'text/html',
                'Content-Disposition': `attachment; filename="${reportFileName}"`
            }
        });

    } catch (error: any) {
        console.error("GET /api/reports/monthly/[year]/[month]/download:", error);
        return NextResponse.json(
            { error: error.message || "Failed to download report" },
            { status: 500 }
        );
    }
}

async function generateMonthlyReportData(db: any, year: number, month: number) {
    try {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0);

        // Get jobs and bills for the month
        const [jobs, bills, creditPayments] = await Promise.all([
            db.collection("jobs").find({
                createdAt: { $gte: startDate, $lte: endDate }
            }).toArray(),
            db.collection("bills").find({
                createdAt: { $gte: startDate, $lte: endDate }
            }).toArray(),
            db.collection("creditPayments").find({
                paymentDate: { $gte: startDate, $lte: endDate }
            }).toArray()
        ]);

        const completedJobs = jobs.filter((job: any) => job.column === 'delivered').length;
        const paidBills = bills.filter((bill: any) => ['paid', 'finalized'].includes(bill.status));
        const totalRevenue = paidBills.reduce((sum: number, bill: any) => sum + (bill.finalAmount || 0), 0);

        const paymentBreakdown = {
            cash: paidBills.filter((bill: any) => bill.paymentType === 'Cash').reduce((sum: number, bill: any) => sum + (bill.finalAmount || 0), 0),
            credit: paidBills.filter((bill: any) => bill.paymentType === 'Credit').reduce((sum: number, bill: any) => sum + (bill.finalAmount || 0), 0),
            cheque: paidBills.filter((bill: any) => bill.paymentType === 'Cheque').reduce((sum: number, bill: any) => sum + (bill.finalAmount || 0), 0)
        };

        const outstandingBalance = bills
            .filter((bill: any) => bill.paymentType === 'Credit' && bill.status !== 'paid')
            .reduce((sum: number, bill: any) => sum + (bill.remainingBalance || bill.finalAmount || 0), 0);

        // Service analysis
        const serviceStats: { [key: string]: { count: number; revenue: number } } = {};
        paidBills.forEach((bill: any) => {
            bill.services?.forEach((service: any) => {
                const serviceName = service.description;
                if (!serviceStats[serviceName]) {
                    serviceStats[serviceName] = { count: 0, revenue: 0 };
                }
                serviceStats[serviceName].count++;
                serviceStats[serviceName].revenue += bill.finalAmount / bill.services.length;
            });
        });

        const topServices = Object.entries(serviceStats)
            .map(([service, stats]) => ({ service, ...stats }))
            .sort((a, b) => b.revenue - a.revenue);

        return {
            period: `${getMonthName(month)} ${year}`,
            year,
            month,
            summary: {
                totalJobs: jobs.length,
                completedJobs,
                completionRate: jobs.length > 0 ? (completedJobs / jobs.length * 100).toFixed(1) : '0',
                totalRevenue,
                averageJobValue: completedJobs > 0 ? totalRevenue / completedJobs : 0,
                outstandingBalance,
                collectionRate: totalRevenue > 0 ? (((totalRevenue - outstandingBalance) / totalRevenue) * 100).toFixed(1) : '0'
            },
            paymentBreakdown,
            topServices,
            customerBreakdown: {
                customer: bills.filter((bill: any) => bill.clientType === 'Customer').length,
                company: bills.filter((bill: any) => bill.clientType === 'Company').length
            },
            creditPayments: creditPayments.length,
            totalCreditPaymentsAmount: creditPayments.reduce((sum: number, payment: any) => sum + payment.paymentAmount, 0)
        };
    } catch (error) {
        console.error(`Error generating report data for ${year}-${month}:`, error);
        return null;
    }
}

function getMonthName(month: number): string {
    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[month - 1] || 'Unknown';
}

function generateReportHTML(data: any): string {
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-LK', {
            style: 'currency',
            currency: 'LKR'
        }).format(amount);
    };

    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Monthly Report - ${data.period}</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                margin: 0;
                padding: 20px;
                background-color: #f8f9fa;
                color: #333;
            }
            .report-container {
                max-width: 1000px;
                margin: 0 auto;
                background: white;
                padding: 40px;
                border-radius: 8px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .header {
                text-align: center;
                margin-bottom: 40px;
                border-bottom: 3px solid #007bff;
                padding-bottom: 20px;
            }
            .company-name {
                font-size: 28px;
                font-weight: bold;
                color: #007bff;
                margin-bottom: 5px;
            }
            .report-title {
                font-size: 24px;
                font-weight: bold;
                margin-bottom: 10px;
                color: #333;
            }
            .report-period {
                font-size: 18px;
                color: #666;
            }
            .summary-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 20px;
                margin-bottom: 40px;
            }
            .summary-card {
                background: #f8f9fa;
                padding: 20px;
                border-radius: 8px;
                border-left: 4px solid #007bff;
                text-align: center;
            }
            .summary-value {
                font-size: 24px;
                font-weight: bold;
                color: #007bff;
                margin-bottom: 5px;
            }
            .summary-label {
                font-size: 14px;
                color: #666;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            .section {
                margin-bottom: 40px;
            }
            .section-title {
                font-size: 20px;
                font-weight: bold;
                margin-bottom: 20px;
                color: #333;
                border-bottom: 2px solid #eee;
                padding-bottom: 10px;
            }
            .payment-breakdown {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                gap: 15px;
                margin-bottom: 30px;
            }
            .payment-item {
                background: #fff;
                padding: 15px;
                border: 2px solid #eee;
                border-radius: 8px;
                text-align: center;
            }
            .payment-type {
                font-weight: bold;
                margin-bottom: 5px;
                color: #333;
            }
            .payment-amount {
                font-size: 18px;
                color: #007bff;
                font-weight: bold;
            }
            .services-table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 30px;
            }
            .services-table th,
            .services-table td {
                padding: 12px;
                text-align: left;
                border-bottom: 1px solid #eee;
            }
            .services-table th {
                background-color: #f8f9fa;
                font-weight: bold;
                color: #333;
            }
            .services-table tr:hover {
                background-color: #f8f9fa;
            }
            .status-positive {
                color: #28a745;
                font-weight: bold;
            }
            .status-warning {
                color: #ffc107;
                font-weight: bold;
            }
            .status-danger {
                color: #dc3545;
                font-weight: bold;
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
                body { background-color: white; padding: 0; }
                .report-container { box-shadow: none; padding: 20px; }
            }
        </style>
    </head>
    <body>
        <div class="report-container">
            <div class="header">
                <div class="company-name">SAS Auto Billing System</div>
                <div class="report-title">Monthly Business Report</div>
                <div class="report-period">${data.period}</div>
            </div>

            <div class="summary-grid">
                <div class="summary-card">
                    <div class="summary-value">${data.summary.totalJobs}</div>
                    <div class="summary-label">Total Jobs</div>
                </div>
                <div class="summary-card">
                    <div class="summary-value">${data.summary.completedJobs}</div>
                    <div class="summary-label">Completed Jobs</div>
                </div>
                <div class="summary-card">
                    <div class="summary-value">${data.summary.completionRate}%</div>
                    <div class="summary-label">Completion Rate</div>
                </div>
                <div class="summary-card">
                    <div class="summary-value">${formatCurrency(data.summary.totalRevenue)}</div>
                    <div class="summary-label">Total Revenue</div>
                </div>
                <div class="summary-card">
                    <div class="summary-value">${formatCurrency(data.summary.averageJobValue)}</div>
                    <div class="summary-label">Avg Job Value</div>
                </div>
                <div class="summary-card">
                    <div class="summary-value ${data.summary.outstandingBalance > 0 ? 'status-danger' : 'status-positive'}">${formatCurrency(data.summary.outstandingBalance)}</div>
                    <div class="summary-label">Outstanding Balance</div>
                </div>
            </div>

            <div class="section">
                <div class="section-title">Payment Breakdown</div>
                <div class="payment-breakdown">
                    <div class="payment-item">
                        <div class="payment-type">Cash Payments</div>
                        <div class="payment-amount">${formatCurrency(data.paymentBreakdown.cash)}</div>
                    </div>
                    <div class="payment-item">
                        <div class="payment-type">Credit Payments</div>
                        <div class="payment-amount">${formatCurrency(data.paymentBreakdown.credit)}</div>
                    </div>
                    <div class="payment-item">
                        <div class="payment-type">Cheque Payments</div>
                        <div class="payment-amount">${formatCurrency(data.paymentBreakdown.cheque)}</div>
                    </div>
                </div>
            </div>

            <div class="section">
                <div class="section-title">Top Services</div>
                <table class="services-table">
                    <thead>
                        <tr>
                            <th>Service</th>
                            <th>Jobs Count</th>
                            <th>Revenue</th>
                            <th>% of Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.topServices.slice(0, 10).map((service: any, index: number) => `
                            <tr>
                                <td>${service.service}</td>
                                <td>${service.count}</td>
                                <td>${formatCurrency(service.revenue)}</td>
                                <td>${((service.revenue / data.summary.totalRevenue) * 100).toFixed(1)}%</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>

            <div class="section">
                <div class="section-title">Customer Analysis</div>
                <div class="payment-breakdown">
                    <div class="payment-item">
                        <div class="payment-type">Individual Customers</div>
                        <div class="payment-amount">${data.customerBreakdown.customer}</div>
                    </div>
                    <div class="payment-item">
                        <div class="payment-type">Company Customers</div>
                        <div class="payment-amount">${data.customerBreakdown.company}</div>
                    </div>
                </div>
            </div>

            <div class="section">
                <div class="section-title">Credit Payment Analysis</div>
                <div class="payment-breakdown">
                    <div class="payment-item">
                        <div class="payment-type">Credit Payments Received</div>
                        <div class="payment-amount">${data.creditPayments}</div>
                    </div>
                    <div class="payment-item">
                        <div class="payment-type">Total Credit Amount</div>
                        <div class="payment-amount">${formatCurrency(data.totalCreditPaymentsAmount)}</div>
                    </div>
                    <div class="payment-item">
                        <div class="payment-type">Collection Rate</div>
                        <div class="payment-amount ${parseFloat(data.summary.collectionRate) > 90 ? 'status-positive' : parseFloat(data.summary.collectionRate) > 70 ? 'status-warning' : 'status-danger'}">${data.summary.collectionRate}%</div>
                    </div>
                </div>
            </div>

            <div class="footer">
                <p><strong>SAS Auto Services</strong> - Monthly Business Report</p>
                <p>Generated on ${new Date().toLocaleDateString('en-LK')} at ${new Date().toLocaleTimeString('en-LK')}</p>
                <p>This report contains confidential business information</p>
            </div>
        </div>
    </body>
    </html>
    `;
}
