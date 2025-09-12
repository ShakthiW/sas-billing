"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import {
    BarChart3,
    Calendar,
    DollarSign,
    TrendingUp,
    TrendingDown,
    FileText,
    Download,
    Eye,
    Filter,
    RefreshCw
} from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";

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

interface ReportSummary {
    currentMonth: MonthlyReportData;
    previousMonth: MonthlyReportData;
    yearToDate: {
        totalRevenue: number;
        totalJobs: number;
        averageMonthlyRevenue: number;
    };
}

export default function MonthlyReportsPage() {
    const { permissions, role } = useUserPermissions();
    const [reportData, setReportData] = useState<ReportSummary | null>(null);
    const [monthlyReports, setMonthlyReports] = useState<MonthlyReportData[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedReport, setSelectedReport] = useState<MonthlyReportData | null>(null);
    const [showDetailsDialog, setShowDetailsDialog] = useState(false);

    // Filter states
    const [filters, setFilters] = useState({
        year: new Date().getFullYear().toString(),
        month: 'all'
    });

    const fetchReports = useCallback(async () => {
        try {
            setLoading(true);
            const queryParams = new URLSearchParams();

            if (filters.year !== 'all') {
                queryParams.append('year', filters.year);
            }
            if (filters.month !== 'all') {
                queryParams.append('month', filters.month);
            }

            const response = await fetch(`/api/reports/monthly?${queryParams.toString()}`);

            if (!response.ok) {
                throw new Error('Failed to fetch monthly reports');
            }

            const data = await response.json();
            setReportData(data.summary);
            setMonthlyReports(data.monthlyReports || []);
        } catch (error) {
            console.error("Failed to fetch reports:", error);
            toast({
                title: "Error",
                description: "Failed to load monthly reports",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        if (permissions.canViewAllReports || role === 'admin' || role === 'manager') {
            fetchReports();
        }
    }, [permissions, role, filters, fetchReports]);

    const handleFilterChange = (key: keyof typeof filters, value: string) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const handleViewDetails = (report: MonthlyReportData) => {
        setSelectedReport(report);
        setShowDetailsDialog(true);
    };

    const handleDownloadReport = async (report: MonthlyReportData) => {
        try {
            const response = await fetch(`/api/reports/monthly/${report.year}/${report.month}/download`);

            if (!response.ok) {
                throw new Error('Failed to download report');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = `monthly-report-${report.year}-${report.month}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            toast({
                title: "Success",
                description: "Report downloaded successfully",
            });
        } catch (error) {
            console.error("Failed to download report:", error);
            toast({
                title: "Error",
                description: "Failed to download report",
                variant: "destructive",
            });
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-LK', {
            style: 'currency',
            currency: 'LKR'
        }).format(amount);
    };

    const formatPercentage = (current: number, previous: number) => {
        if (previous === 0) return { value: 0, isPositive: true };
        const change = ((current - previous) / previous) * 100;
        return { value: Math.abs(change), isPositive: change >= 0 };
    };

    const getMonthName = (monthNum: string) => {
        const months = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        return months[parseInt(monthNum) - 1] || monthNum;
    };

    if (!permissions.canViewAllReports && role !== 'admin' && role !== 'manager') {
        return (
            <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
                <div className="min-h-[100vh] flex-1 rounded-xl bg-muted/50 md:min-h-min p-4">
                    <div className="text-center py-8">
                        <h2 className="text-2xl font-bold mb-4">Access Denied</h2>
                        <p className="text-muted-foreground">
                            You don't have permission to view monthly reports.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
                <div className="min-h-[100vh] flex-1 rounded-xl bg-muted/50 md:min-h-min p-4">
                    <div className="flex items-center justify-center h-64">
                        <div className="text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                            <p className="mt-2">Loading reports...</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <DashboardLayout title="Monthly Reports" breadcrumbs={[{ label: "Monthly Reports" }]}>
            <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
                <div className="min-h-[100vh] flex-1 rounded-xl bg-muted/50 md:min-h-min p-4">

                    {/* Summary Cards */}
                    {reportData && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
                                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">
                                        {formatCurrency(reportData.currentMonth?.totalRevenue || 0)}
                                    </div>
                                    {reportData.previousMonth && (
                                        <p className="text-xs text-muted-foreground">
                                            {(() => {
                                                const change = formatPercentage(
                                                    reportData.currentMonth?.totalRevenue || 0,
                                                    reportData.previousMonth.totalRevenue
                                                );
                                                return (
                                                    <span className={change.isPositive ? "text-green-600" : "text-red-600"}>
                                                        {change.isPositive ? <TrendingUp className="inline h-3 w-3" /> : <TrendingDown className="inline h-3 w-3" />}
                                                        {change.value.toFixed(1)}% from last month
                                                    </span>
                                                );
                                            })()}
                                        </p>
                                    )}
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Completed Jobs</CardTitle>
                                    <FileText className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">
                                        {reportData.currentMonth?.completedJobs || 0}
                                    </div>
                                    {reportData.previousMonth && (
                                        <p className="text-xs text-muted-foreground">
                                            {(() => {
                                                const change = formatPercentage(
                                                    reportData.currentMonth?.completedJobs || 0,
                                                    reportData.previousMonth.completedJobs
                                                );
                                                return (
                                                    <span className={change.isPositive ? "text-green-600" : "text-red-600"}>
                                                        {change.isPositive ? <TrendingUp className="inline h-3 w-3" /> : <TrendingDown className="inline h-3 w-3" />}
                                                        {change.value.toFixed(1)}% from last month
                                                    </span>
                                                );
                                            })()}
                                        </p>
                                    )}
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Outstanding Balance</CardTitle>
                                    <Calendar className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">
                                        {formatCurrency(reportData.currentMonth?.outstandingBalance || 0)}
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Credit payments pending
                                    </p>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Average Job Value</CardTitle>
                                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">
                                        {formatCurrency(reportData.currentMonth?.averageJobValue || 0)}
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Per completed job
                                    </p>
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {/* Monthly Reports Table */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="flex items-center gap-2">
                                        <BarChart3 className="h-5 w-5" />
                                        Monthly Reports
                                    </CardTitle>
                                    <CardDescription>
                                        Detailed monthly business performance reports
                                    </CardDescription>
                                </div>
                                <Button onClick={fetchReports} variant="outline" size="sm">
                                    <RefreshCw className="h-4 w-4 mr-2" />
                                    Refresh
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {monthlyReports.length === 0 ? (
                                <div className="text-center py-8">
                                    <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                                    <p className="text-lg font-medium">No reports found</p>
                                    <p className="text-muted-foreground">
                                        No monthly reports match your current filters.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="rounded-md border">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Period</TableHead>
                                                    <TableHead>Jobs Completed</TableHead>
                                                    <TableHead>Total Revenue</TableHead>
                                                    <TableHead>Outstanding</TableHead>
                                                    <TableHead>Avg Job Value</TableHead>
                                                    <TableHead>Actions</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {monthlyReports.map((report) => (
                                                    <TableRow key={`${report.year}-${report.month}`}>
                                                        <TableCell className="font-medium">
                                                            {getMonthName(report.month)} {report.year}
                                                        </TableCell>
                                                        <TableCell>{report.completedJobs}</TableCell>
                                                        <TableCell>{formatCurrency(report.totalRevenue)}</TableCell>
                                                        <TableCell>
                                                            <span className={report.outstandingBalance > 0 ? "text-red-600" : "text-green-600"}>
                                                                {formatCurrency(report.outstandingBalance)}
                                                            </span>
                                                        </TableCell>
                                                        <TableCell>{formatCurrency(report.averageJobValue)}</TableCell>
                                                        <TableCell>
                                                            <div className="flex items-center gap-2">
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => handleViewDetails(report)}
                                                                >
                                                                    <Eye className="h-4 w-4" />
                                                                </Button>
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => handleDownloadReport(report)}
                                                                >
                                                                    <Download className="h-4 w-4" />
                                                                </Button>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Report Details Dialog */}
                {selectedReport && (
                    <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
                        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle>
                                    Monthly Report - {getMonthName(selectedReport.month)} {selectedReport.year}
                                </DialogTitle>
                                <DialogDescription>
                                    Detailed business performance metrics for the selected period
                                </DialogDescription>
                            </DialogHeader>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div>
                                        <h3 className="font-semibold mb-2">Job Statistics</h3>
                                        <div className="space-y-2 text-sm">
                                            <p><strong>Total Jobs:</strong> {selectedReport.totalJobs}</p>
                                            <p><strong>Completed Jobs:</strong> {selectedReport.completedJobs}</p>
                                            <p><strong>Completion Rate:</strong> {((selectedReport.completedJobs / selectedReport.totalJobs) * 100).toFixed(1)}%</p>
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="font-semibold mb-2">Revenue Breakdown</h3>
                                        <div className="space-y-2 text-sm">
                                            <p><strong>Total Revenue:</strong> {formatCurrency(selectedReport.totalRevenue)}</p>
                                            <p><strong>Cash Payments:</strong> {formatCurrency(selectedReport.cashPayments)}</p>
                                            <p><strong>Credit Payments:</strong> {formatCurrency(selectedReport.creditPayments)}</p>
                                            <p><strong>Cheque Payments:</strong> {formatCurrency(selectedReport.chequePayments)}</p>
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="font-semibold mb-2">Customer Types</h3>
                                        <div className="space-y-2 text-sm">
                                            <p><strong>Individual Customers:</strong> {selectedReport.customerTypes.Customer}</p>
                                            <p><strong>Company Customers:</strong> {selectedReport.customerTypes.Company}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <h3 className="font-semibold mb-2">Financial Summary</h3>
                                        <div className="space-y-2 text-sm">
                                            <p><strong>Average Job Value:</strong> {formatCurrency(selectedReport.averageJobValue)}</p>
                                            <p><strong>Outstanding Balance:</strong> {formatCurrency(selectedReport.outstandingBalance)}</p>
                                            <p><strong>Collection Rate:</strong> {(((selectedReport.totalRevenue - selectedReport.outstandingBalance) / selectedReport.totalRevenue) * 100).toFixed(1)}%</p>
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="font-semibold mb-2">Top Services</h3>
                                        <div className="space-y-1 text-sm">
                                            {selectedReport.topServices.slice(0, 5).map((service, index) => (
                                                <p key={index}>
                                                    <strong>{index + 1}.</strong> {service.service}
                                                    <span className="text-muted-foreground ml-2">
                                                        ({service.count} jobs, {formatCurrency(service.revenue)})
                                                    </span>
                                                </p>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-4 border-t">
                                <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>
                                    Close
                                </Button>
                                <Button onClick={() => handleDownloadReport(selectedReport)}>
                                    <Download className="h-4 w-4 mr-2" />
                                    Download Report
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                )}
            </div>
        </DashboardLayout>
    );
}
