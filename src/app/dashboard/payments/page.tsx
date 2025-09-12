"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Bill, CreditPayment } from "@/app/types";
import { getAllCreditBills } from "@/app/api/actions";
import {
  DollarSign,
  TrendingUp,
  CreditCard,
  Calendar,
  Search,
} from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import PrintableCreditBill from "@/components/PrintableCreditBill";

export default function PaymentsPage() {
  const [creditBills, setCreditBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [vehicleSearch, setVehicleSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");

  useEffect(() => {
    fetchCreditBills();
  }, []);

  const fetchCreditBills = async () => {
    try {
      setLoading(true);
      const bills = await getAllCreditBills();
      setCreditBills(bills);
    } catch (error) {
      console.error("Failed to fetch credit bills:", error);
      toast({
        title: "Error",
        description: "Failed to load payment records",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Filter bills based on search and filters
  const filteredBills = creditBills.filter((bill) => {
    const matchesSearch =
      bill.vehicleNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bill.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bill.jobId.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesVehicleSearch =
      !vehicleSearch ||
      bill.vehicleNo.toLowerCase().includes(vehicleSearch.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || bill.status === statusFilter;

    // Date filter logic
    let matchesDate = true;
    if (dateFilter !== "all" && bill.lastPaymentDate) {
      const paymentDate = new Date(bill.lastPaymentDate);
      const now = new Date();
      const diffDays = Math.floor(
        (now.getTime() - paymentDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      switch (dateFilter) {
        case "7days":
          matchesDate = diffDays <= 7;
          break;
        case "30days":
          matchesDate = diffDays <= 30;
          break;
        case "90days":
          matchesDate = diffDays <= 90;
          break;
        default:
          matchesDate = true;
      }
    }

    return (
      matchesSearch && matchesVehicleSearch && matchesStatus && matchesDate
    );
  });

  // Calculate summary statistics
  const totalOutstanding = creditBills.reduce(
    (sum, bill) => sum + (bill.remainingBalance || 0),
    0
  );
  const totalBillAmount = creditBills.reduce(
    (sum, bill) => sum + bill.finalAmount,
    0
  );
  const totalPaid = totalBillAmount - totalOutstanding;
  const averageOutstanding =
    creditBills.length > 0 ? totalOutstanding / creditBills.length : 0;

  const formatDate = (date: Date | undefined) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "LKR",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-green-100 text-green-800";
      case "partially_paid":
        return "bg-yellow-100 text-yellow-800";
      case "finalized":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getDueDateStatus = (bill: Bill) => {
    if (!bill.creditDetails?.dueDate) return null;

    const dueDate = new Date(bill.creditDetails.dueDate);
    const now = new Date();
    const diffDays = Math.floor(
      (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays < 0)
      return { label: "Overdue", color: "bg-red-100 text-red-800" };
    if (diffDays <= 7)
      return { label: "Due Soon", color: "bg-orange-100 text-orange-800" };
    return { label: "On Time", color: "bg-green-100 text-green-800" };
  };

  if (loading) {
    return (
      <DashboardLayout title="Payments" breadcrumbs={[{ label: "Payments" }]}>
        <div className="flex items-center justify-center h-64">
          {/* Loading spinner or skeleton here */}
          <span>Loading...</span>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Payments" breadcrumbs={[{ label: "Payments" }]}>
      <div className="flex flex-1 flex-col gap-4 p-4">
        <div className="container mx-auto p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                Payment Records
              </h1>
              <p className="text-muted-foreground">
                Overview of all credit payments and outstanding balances
              </p>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Outstanding
                </CardTitle>
                <CreditCard className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {formatCurrency(totalOutstanding)}
                </div>
                <p className="text-xs text-muted-foreground">
                  From {creditBills.length} credit bills
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Paid
                </CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(totalPaid)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {((totalPaid / totalBillAmount) * 100).toFixed(1)}% of total
                  bills
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Average Outstanding
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(averageOutstanding)}
                </div>
                <p className="text-xs text-muted-foreground">Per credit bill</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Bills
                </CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{creditBills.length}</div>
                <p className="text-xs text-muted-foreground">
                  Credit bills in system
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle>Search & Filter Records</CardTitle>
              <CardDescription>
                Use the filters below to find specific payment records
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Quick Vehicle Search */}
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <label className="text-sm font-medium mb-1 block">
                      Vehicle Number Search
                    </label>
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Enter vehicle number (e.g., ABC-1234)..."
                        value={vehicleSearch}
                        onChange={(e) => setVehicleSearch(e.target.value)}
                        className="pl-8"
                      />
                    </div>
                  </div>
                  <div className="flex items-end">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setVehicleSearch("");
                        setSearchTerm("");
                      }}
                      className="shrink-0"
                    >
                      Clear
                    </Button>
                  </div>
                </div>

                {/* General Search and Filters */}
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <label className="text-sm font-medium mb-1 block">
                      General Search
                    </label>
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search by customer, job ID..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8"
                      />
                    </div>
                  </div>
                  <div className="w-full sm:w-48">
                    <label className="text-sm font-medium mb-1 block">
                      Status
                    </label>
                    <Select
                      value={statusFilter}
                      onValueChange={setStatusFilter}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Filter by status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="finalized">Finalized</SelectItem>
                        <SelectItem value="partially_paid">
                          Partially Paid
                        </SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-full sm:w-48">
                    <label className="text-sm font-medium mb-1 block">
                      Date Range
                    </label>
                    <Select value={dateFilter} onValueChange={setDateFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Filter by date" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Time</SelectItem>
                        <SelectItem value="7days">Last 7 Days</SelectItem>
                        <SelectItem value="30days">Last 30 Days</SelectItem>
                        <SelectItem value="90days">Last 90 Days</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bills Table */}
          {filteredBills.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <DollarSign className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  No Payment Records Found
                </h3>
                <p className="text-muted-foreground text-center">
                  {searchTerm || statusFilter !== "all" || dateFilter !== "all"
                    ? "No records match your current filters"
                    : "No credit bills are currently in the system"}
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Payment Records ({filteredBills.length})</CardTitle>
                <CardDescription>
                  Detailed view of all credit bills and payment status
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vehicle No</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Job ID</TableHead>
                      <TableHead>Total Amount</TableHead>
                      <TableHead>Paid Amount</TableHead>
                      <TableHead>Outstanding</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Due Status</TableHead>
                      <TableHead>Last Payment</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBills.map((bill) => {
                      const paidAmount =
                        bill.finalAmount - (bill.remainingBalance || 0);
                      const dueDateStatus = getDueDateStatus(bill);

                      return (
                        <TableRow key={bill._id}>
                          <TableCell className="font-medium">
                            {bill.vehicleNo}
                          </TableCell>
                          <TableCell>{bill.customerName}</TableCell>
                          <TableCell className="font-mono text-sm">
                            {bill.jobId}
                          </TableCell>
                          <TableCell>
                            {formatCurrency(bill.finalAmount)}
                          </TableCell>
                          <TableCell className="text-green-600 font-medium">
                            {formatCurrency(paidAmount)}
                          </TableCell>
                          <TableCell className="text-red-600 font-medium">
                            {formatCurrency(bill.remainingBalance || 0)}
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(bill.status!)}>
                              {bill.status === "partially_paid"
                                ? "Partial"
                                : bill.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {dueDateStatus ? (
                              <Badge className={dueDateStatus.color}>
                                {dueDateStatus.label}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {formatDate(bill.lastPaymentDate)}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <PrintableCreditBill bill={bill} />
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
