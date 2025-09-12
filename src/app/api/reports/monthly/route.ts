import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { connectToDatabase } from "@/app/api/actions";
import { ObjectId } from "mongodb";
import { getUserRole } from "@/lib/services/user-role";

interface MonthlyReportData {
    month: string;
    year: number;
    totalJobs: number;
    completedJobs: number;
    totalRevenue: number;
    cashPayments: number;
    creditPayments: number;
    chequePayments: number;
    outstandingBalance: number;
    averageJobValue: number;
    topServices: Array<{
        service: string;
        count: number;
        revenue: number;
    }>;
    customerTypes: {
        Customer: number;
        Company: number;
    };
    paymentTrends: Array<{
        date: string;
        amount: number;
        type: string;
    }>;
    jobStatusBreakdown: {
        completed: number;
        inProgress: number;
        pending: number;
        finished: number;
    };
}

export async function GET(request: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userRole = await getUserRole(userId);
        if (!userRole || !['admin', 'manager'].includes(userRole)) {
            return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
        const month = searchParams.get('month');

        const db = await connectToDatabase();

        // Build date filters
        const startDate = new Date(year, month ? parseInt(month) - 1 : 0, 1);
        const endDate = month
            ? new Date(year, parseInt(month), 0) // Last day of specific month
            : new Date(year + 1, 0, 0); // Last day of year

        // Get monthly reports
        const monthlyReports: MonthlyReportData[] = [];

        if (month) {
            // Get specific month data
            const monthData = await generateMonthlyReport(db, year, parseInt(month));
            if (monthData) {
                monthlyReports.push(monthData);
            }
        } else {
            // Get all months for the year
            for (let m = 1; m <= 12; m++) {
                const monthData = await generateMonthlyReport(db, year, m);
                if (monthData && monthData.totalJobs > 0) {
                    monthlyReports.push(monthData);
                }
            }
        }

        // Generate summary for current and previous month
        const currentDate = new Date();
        const currentMonthData = await generateMonthlyReport(db, currentDate.getFullYear(), currentDate.getMonth() + 1);

        const previousMonth = currentDate.getMonth() === 0 ? 12 : currentDate.getMonth();
        const previousYear = currentDate.getMonth() === 0 ? currentDate.getFullYear() - 1 : currentDate.getFullYear();
        const previousMonthData = await generateMonthlyReport(db, previousYear, previousMonth);

        // Calculate year-to-date metrics
        const ytdReports = monthlyReports.filter(report => report.year === currentDate.getFullYear());
        const yearToDate = {
            totalRevenue: ytdReports.reduce((sum, report) => sum + report.totalRevenue, 0),
            totalJobs: ytdReports.reduce((sum, report) => sum + report.totalJobs, 0),
            averageMonthlyRevenue: ytdReports.length > 0
                ? ytdReports.reduce((sum, report) => sum + report.totalRevenue, 0) / ytdReports.length
                : 0
        };

        const summary = {
            currentMonth: currentMonthData,
            previousMonth: previousMonthData,
            yearToDate
        };

        // Log the report access
        try {
            await fetch('/api/audit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'view_monthly_reports',
                    resource: 'report',
                    resourceId: `${year}-${month || 'all'}`,
                    metadata: {
                        year,
                        month,
                        totalReports: monthlyReports.length
                    }
                })
            });
        } catch (auditError) {
            console.error('Failed to log audit entry:', auditError);
        }

        return NextResponse.json({
            success: true,
            monthlyReports: monthlyReports.sort((a, b) => {
                if (a.year !== b.year) return b.year - a.year;
                return parseInt(b.month) - parseInt(a.month);
            }),
            summary
        });
    } catch (error: any) {
        console.error("GET /api/reports/monthly:", error);
        return NextResponse.json(
            { error: error.message || "Failed to fetch monthly reports" },
            { status: 500 }
        );
    }
}

async function generateMonthlyReport(db: any, year: number, month: number): Promise<MonthlyReportData | null> {
    try {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0);

        // Get jobs for the month
        const jobs = await db.collection("jobs").find({
            createdAt: {
                $gte: startDate,
                $lte: endDate
            }
        }).toArray();

        // Get bills for the month
        const bills = await db.collection("bills").find({
            createdAt: {
                $gte: startDate,
                $lte: endDate
            }
        }).toArray();

        const completedJobs = jobs.filter((job: any) => job.column === 'delivered').length;

        // Calculate revenue metrics
        const paidBills = bills.filter((bill: any) => ['paid', 'finalized'].includes(bill.status));
        const totalRevenue = paidBills.reduce((sum: number, bill: any) => sum + (bill.finalAmount || 0), 0);

        const cashPayments = paidBills
            .filter((bill: any) => bill.paymentType === 'Cash')
            .reduce((sum: number, bill: any) => sum + (bill.finalAmount || 0), 0);

        const creditPayments = paidBills
            .filter((bill: any) => bill.paymentType === 'Credit')
            .reduce((sum: number, bill: any) => sum + (bill.finalAmount || 0), 0);

        const chequePayments = paidBills
            .filter((bill: any) => bill.paymentType === 'Cheque')
            .reduce((sum: number, bill: any) => sum + (bill.finalAmount || 0), 0);

        // Calculate outstanding balance
        const creditBills = bills.filter((bill: any) => bill.paymentType === 'Credit' && bill.status !== 'paid');
        const outstandingBalance = creditBills.reduce((sum: number, bill: any) => sum + (bill.remainingBalance || bill.finalAmount || 0), 0);

        const averageJobValue = completedJobs > 0 ? totalRevenue / completedJobs : 0;

        // Get top services
        const serviceStats: { [key: string]: { count: number; revenue: number } } = {};

        paidBills.forEach((bill: any) => {
            bill.services?.forEach((service: any) => {
                const serviceName = service.description;
                if (!serviceStats[serviceName]) {
                    serviceStats[serviceName] = { count: 0, revenue: 0 };
                }
                serviceStats[serviceName].count++;
                serviceStats[serviceName].revenue += bill.finalAmount / bill.services.length; // Distribute evenly
            });
        });

        const topServices = Object.entries(serviceStats)
            .map(([service, stats]) => ({ service, ...stats }))
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 10);

        // Customer type breakdown
        const customerTypes = {
            Customer: bills.filter((bill: any) => bill.clientType === 'Customer').length,
            Company: bills.filter((bill: any) => bill.clientType === 'Company').length
        };

        // Payment trends (daily payments for the month)
        const paymentTrends = [];
        for (let day = 1; day <= endDate.getDate(); day++) {
            const dayStart = new Date(year, month - 1, day);
            const dayEnd = new Date(year, month - 1, day + 1);

            const dayBills = bills.filter((bill: any) => {
                const billDate = new Date(bill.createdAt);
                return billDate >= dayStart && billDate < dayEnd;
            });

            const dayAmount = dayBills.reduce((sum: number, bill: any) => sum + (bill.finalAmount || 0), 0);

            if (dayAmount > 0) {
                paymentTrends.push({
                    date: dayStart.toISOString().split('T')[0],
                    amount: dayAmount,
                    type: 'payment'
                });
            }
        }

        // Job status breakdown
        const jobStatusBreakdown = {
            completed: jobs.filter((job: any) => job.column === 'delivered').length,
            inProgress: jobs.filter((job: any) => job.column === 'inProgress').length,
            pending: jobs.filter((job: any) => job.column === 'todo').length,
            finished: jobs.filter((job: any) => job.column === 'finished').length
        };

        return {
            month: month.toString().padStart(2, '0'),
            year,
            totalJobs: jobs.length,
            completedJobs,
            totalRevenue,
            cashPayments,
            creditPayments,
            chequePayments,
            outstandingBalance,
            averageJobValue,
            topServices,
            customerTypes,
            paymentTrends,
            jobStatusBreakdown
        };
    } catch (error) {
        console.error(`Error generating report for ${year}-${month}:`, error);
        return null;
    }
}
