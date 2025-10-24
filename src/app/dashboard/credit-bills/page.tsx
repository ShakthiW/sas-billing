"use client";

import { useEffect, useState, useMemo } from "react";
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
import Image from "@/components/RemoteImage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Bill, CreditPayment } from "@/app/types";
import {
  getAllCreditBills,
  recordCreditPayment,
  getCreditPaymentHistory,
} from "@/app/api/actions";
import {
  CreditCard,
  DollarSign,
  History,
  Search,
  Filter,
  SortAsc,
  SortDesc,
  X,
} from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import PrintableCreditBill from "@/components/PrintableCreditBill";

export default function CreditBillsPage() {
  const [creditBills, setCreditBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [paymentHistory, setPaymentHistory] = useState<CreditPayment[]>([]);
  const [recordingPayment, setRecordingPayment] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [showPaymentDetailDialog, setShowPaymentDetailDialog] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<CreditPayment | null>(
    null
  );

  // Payment form state
  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    notes: "",
  });

  // Filter and search state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchCreditBills();
  }, []);

  // Filter and sort credit bills
  const filteredAndSortedBills = useMemo(() => {
    let filtered = creditBills;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (bill) =>
          bill.vehicleNo.toLowerCase().includes(query) ||
          bill.customerName.toLowerCase().includes(query) ||
          bill.customerPhone.toLowerCase().includes(query) ||
          bill.jobId.toLowerCase().includes(query)
      );
    }

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((bill) => bill.status === statusFilter);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortBy) {
        case "vehicleNo":
          aValue = a.vehicleNo;
          bValue = b.vehicleNo;
          break;
        case "customerName":
          aValue = a.customerName;
          bValue = b.customerName;
          break;
        case "finalAmount":
          aValue = a.finalAmount;
          bValue = b.finalAmount;
          break;
        case "remainingBalance":
          aValue = a.remainingBalance || 0;
          bValue = b.remainingBalance || 0;
          break;
        case "lastPaymentDate":
          aValue = a.lastPaymentDate || new Date(0);
          bValue = b.lastPaymentDate || new Date(0);
          break;
        case "createdAt":
        default:
          aValue = a.createdAt || new Date(0);
          bValue = b.createdAt || new Date(0);
          break;
      }

      if (aValue < bValue) return sortOrder === "asc" ? -1 : 1;
      if (aValue > bValue) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [creditBills, searchQuery, statusFilter, sortBy, sortOrder]);

  const fetchCreditBills = async () => {
    try {
      setLoading(true);
      const bills = await getAllCreditBills();
      setCreditBills(bills);
    } catch (error) {
      console.error("Failed to fetch credit bills:", error);
      toast({
        title: "Error",
        description: "Failed to load credit bills",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRecordPayment = async () => {
    if (!selectedBill || !paymentForm.amount) return;

    const paymentAmount = parseFloat(paymentForm.amount);

    // Enhanced validation
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid payment amount",
        variant: "destructive",
      });
      return;
    }

    // Use precision-safe comparison
    const remainingBalance = selectedBill.remainingBalance || 0;
    const paymentCents = Math.round(paymentAmount * 100);
    const remainingCents = Math.round(remainingBalance * 100);

    if (paymentCents > remainingCents) {
      toast({
        title: "Error",
        description: `Payment amount (${paymentAmount.toFixed(
          2
        )}) cannot exceed remaining balance (${remainingBalance.toFixed(2)})`,
        variant: "destructive",
      });
      return;
    }

    try {
      setRecordingPayment(true);

      const paymentData = {
        billId: selectedBill._id!,
        jobId: selectedBill.jobId,
        customerName: selectedBill.customerName,
        vehicleNo: selectedBill.vehicleNo,
        paymentAmount: paymentAmount,
        paymentDate: new Date(),
        paymentMethod: "Cash" as const, // Default to Cash payment method
        notes: paymentForm.notes || undefined,
        chequeDetails: undefined, // No cheque details since we removed that option
      };

      const result = await recordCreditPayment(paymentData);

      let successMessage = `Payment of ${formatCurrency(
        paymentAmount
      )} recorded successfully`;

      // Calculate new remaining balance
      const newRemainingBalance = result.newRemainingBalance;
      const isPaidInFull = result.isPaidInFull;

      // Check if an updated bill was generated
      if (result.updatedBill?.success) {
        successMessage += `. Updated bill generated with ID: ${result.updatedBill.updatedBillId}`;
      }

      toast({
        title: "Success",
        description: successMessage,
      });

      // Reset form and close dialog
      setPaymentForm({
        amount: "",
        notes: "",
      });
      setShowPaymentDialog(false);

      // If the bill is fully paid, show a special success message
      if (isPaidInFull) {
        toast({
          title: "Bill Fully Paid",
          description: `The bill for ${selectedBill.vehicleNo} has been fully paid and will be removed from the credit bills list.`,
        });
      }

      // Refresh the bills list
      await fetchCreditBills();

      // Show payment history after recording a payment only if still not fully paid
      if (selectedBill && !isPaidInFull) {
        // Small delay to ensure the payment is recorded before fetching history
        setTimeout(() => {
          handleShowHistory(selectedBill);
        }, 500);
      }
    } catch (error) {
      console.error("Failed to record payment:", error);
      toast({
        title: "Error",
        description: "Failed to record payment",
        variant: "destructive",
      });
    } finally {
      setRecordingPayment(false);
    }
  };

  const handleShowHistory = async (bill: Bill) => {
    try {
      setSelectedBill(bill);
      const history = await getCreditPaymentHistory(bill._id!);

      // Add initial payment to history if it exists
      if (bill.initialPayment && bill.initialPayment > 0) {
        const initialPaymentRecord = {
          _id: "initial-payment",
          billId: bill._id!,
          jobId: bill.jobId,
          customerName: bill.customerName,
          vehicleNo: bill.vehicleNo,
          paymentAmount: bill.initialPayment,
          paymentDate: bill.createdAt || new Date(),
          paymentMethod: (bill.paymentType === "Credit"
            ? "Cash"
            : bill.paymentType) as "Cash" | "Cheque" | "Bank Transfer",
          notes: "Initial payment at billing",
          createdAt: bill.createdAt || new Date(),
        };

        // Add to beginning of payment history
        setPaymentHistory([initialPaymentRecord, ...history]);
      } else {
        setPaymentHistory(history);
      }

      setShowHistoryDialog(true);
    } catch (error) {
      console.error("Failed to fetch payment history:", error);
      toast({
        title: "Error",
        description: "Failed to load payment history",
        variant: "destructive",
      });
    }
  };

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

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("asc");
    }
  };

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setSortBy("createdAt");
    setSortOrder("desc");
  };

  const getSortIcon = (column: string) => {
    if (sortBy !== column) return null;
    return sortOrder === "asc" ? (
      <SortAsc className="w-4 h-4" />
    ) : (
      <SortDesc className="w-4 h-4" />
    );
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg">Loading credit bills...</div>
      </div>
    );
  }

  return (
    <DashboardLayout
      title="Credit Bills"
      breadcrumbs={[{ label: "Credit Bills" }]}
    >
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Credit Bills</h1>
            <p className="text-muted-foreground">
              Manage credit bills and record payments
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="secondary" className="text-sm">
              {filteredAndSortedBills.length} of {creditBills.length} Credit
              Bills
            </Badge>
            <Badge variant="destructive" className="text-sm">
              Total Outstanding:{" "}
              {formatCurrency(
                filteredAndSortedBills.reduce(
                  (sum, bill) => sum + (bill.remainingBalance || 0),
                  0
                )
              )}
            </Badge>
          </div>
        </div>

        {/* Search and Filter Controls */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col space-y-4">
              {/* Search Bar */}
              <div className="flex items-center space-x-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Search by vehicle number, customer name, phone, or job ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button
                  variant="outline"
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center space-x-2"
                >
                  <Filter className="w-4 h-4" />
                  <span>Filters</span>
                </Button>
                {(searchQuery || statusFilter !== "all") && (
                  <Button
                    variant="ghost"
                    onClick={clearFilters}
                    className="flex items-center space-x-2"
                  >
                    <X className="w-4 h-4" />
                    <span>Clear</span>
                  </Button>
                )}
              </div>

              {/* Filter Options */}
              {showFilters && (
                <div className="flex flex-wrap items-center gap-4 p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Label htmlFor="status-filter">Status:</Label>
                    <Select
                      value={statusFilter}
                      onValueChange={setStatusFilter}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="partially_paid">
                          Partially Paid
                        </SelectItem>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="finalized">Finalized</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Label htmlFor="sort-by">Sort by:</Label>
                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="createdAt">Date Created</SelectItem>
                        <SelectItem value="vehicleNo">
                          Vehicle Number
                        </SelectItem>
                        <SelectItem value="customerName">
                          Customer Name
                        </SelectItem>
                        <SelectItem value="finalAmount">
                          Total Amount
                        </SelectItem>
                        <SelectItem value="remainingBalance">
                          Remaining Balance
                        </SelectItem>
                        <SelectItem value="lastPaymentDate">
                          Last Payment
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
                    }
                    className="flex items-center space-x-1"
                  >
                    {sortOrder === "asc" ? (
                      <SortAsc className="w-4 h-4" />
                    ) : (
                      <SortDesc className="w-4 h-4" />
                    )}
                    <span>
                      {sortOrder === "asc" ? "Ascending" : "Descending"}
                    </span>
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {creditBills.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <CreditCard className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Credit Bills</h3>
              <p className="text-muted-foreground text-center">
                No credit bills are currently pending payment.
              </p>
            </CardContent>
          </Card>
        ) : filteredAndSortedBills.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Search className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Results Found</h3>
              <p className="text-muted-foreground text-center">
                No credit bills match your current search and filter criteria.
              </p>
              <Button variant="outline" onClick={clearFilters} className="mt-4">
                Clear Filters
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Credit Bills List</CardTitle>
              <CardDescription>
                Bills with outstanding credit payments
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="w-full overflow-x-auto">
                <Table className="min-w-[1000px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSort("vehicleNo")}
                      >
                        <div className="flex items-center space-x-1">
                          <span>Vehicle No</span>
                          {getSortIcon("vehicleNo")}
                        </div>
                      </TableHead>
                      <TableHead
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSort("customerName")}
                      >
                        <div className="flex items-center space-x-1">
                          <span>Customer</span>
                          {getSortIcon("customerName")}
                        </div>
                      </TableHead>
                      <TableHead
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSort("finalAmount")}
                      >
                        <div className="flex items-center space-x-1">
                          <span>Total Amount</span>
                          {getSortIcon("finalAmount")}
                        </div>
                      </TableHead>
                      <TableHead
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSort("remainingBalance")}
                      >
                        <div className="flex items-center space-x-1">
                          <span>Remaining</span>
                          {getSortIcon("remainingBalance")}
                        </div>
                      </TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSort("lastPaymentDate")}
                      >
                        <div className="flex items-center space-x-1">
                          <span>Last Payment</span>
                          {getSortIcon("lastPaymentDate")}
                        </div>
                      </TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAndSortedBills.map((bill) => (
                      <TableRow key={bill._id}>
                        <TableCell className="font-medium">
                          {bill.vehicleNo}
                        </TableCell>
                        <TableCell>{bill.customerName}</TableCell>
                        <TableCell>
                          {formatCurrency(bill.finalAmount)}
                        </TableCell>
                        <TableCell>
                          <span className="font-semibold text-red-600">
                            {formatCurrency(bill.remainingBalance || 0)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              bill.status === "partially_paid"
                                ? "destructive"
                                : "secondary"
                            }
                          >
                            {bill.status === "partially_paid"
                              ? "Partial"
                              : bill.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {formatDate(bill.lastPaymentDate)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <PrintableCreditBill bill={bill} />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleShowHistory(bill)}
                            >
                              <History className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedBill(bill);
                                setShowPaymentDialog(true);
                              }}
                            >
                              <DollarSign className="w-4 h-4 mr-1" />
                              Record Payment
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Payment Recording Dialog */}
        <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Record Payment</DialogTitle>
              <DialogDescription>
                Record a payment for {selectedBill?.vehicleNo} -{" "}
                {selectedBill?.customerName}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="remaining-balance">Remaining Balance</Label>
                <div className="text-lg font-semibold text-red-600">
                  {formatCurrency(selectedBill?.remainingBalance || 0)}
                </div>
              </div>

              <div>
                <Label htmlFor="payment-amount">Payment Amount *</Label>
                <Input
                  id="payment-amount"
                  type="number"
                  placeholder="Enter payment amount"
                  value={paymentForm.amount}
                  onChange={(e) =>
                    setPaymentForm({ ...paymentForm, amount: e.target.value })
                  }
                  max={selectedBill?.remainingBalance || 0}
                />
              </div>

              <div>
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Add any notes about this payment"
                  value={paymentForm.notes}
                  onChange={(e) =>
                    setPaymentForm({ ...paymentForm, notes: e.target.value })
                  }
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setShowPaymentDialog(false)}
                  disabled={recordingPayment}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleRecordPayment}
                  disabled={recordingPayment || !paymentForm.amount}
                >
                  {recordingPayment ? "Recording..." : "Record Payment"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Payment History Dialog */}
        <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Payment History</DialogTitle>
              <DialogDescription>
                Payment history for {selectedBill?.vehicleNo} -{" "}
                {selectedBill?.customerName}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold">Bill Summary</h4>
                  <p>
                    Total Amount:{" "}
                    {formatCurrency(selectedBill?.finalAmount || 0)}
                  </p>
                  <p>
                    Initial Payment:{" "}
                    {formatCurrency(selectedBill?.initialPayment || 0)}
                  </p>
                  <p>
                    Remaining Balance:{" "}
                    {formatCurrency(selectedBill?.remainingBalance || 0)}
                  </p>
                </div>
              </div>

              {paymentHistory.length > 0 ? (
                <div>
                  <h4 className="font-semibold mb-2">Payment Records</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paymentHistory.map((payment) => (
                        <TableRow
                          key={payment._id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => {
                            setSelectedPayment(payment);
                            setShowPaymentDetailDialog(true);
                          }}
                        >
                          <TableCell>
                            {formatDate(payment.paymentDate)}
                          </TableCell>
                          <TableCell>
                            {formatCurrency(payment.paymentAmount)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {payment.paymentMethod}
                            </Badge>
                          </TableCell>
                          <TableCell>{payment.notes || "-"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  No payment records found
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Payment Detail Dialog */}
        <Dialog
          open={showPaymentDetailDialog}
          onOpenChange={setShowPaymentDetailDialog}
        >
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Payment Details</DialogTitle>
              <DialogDescription>
                {selectedBill?.vehicleNo} - {selectedBill?.customerName}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground">Date</div>
                  <div className="font-medium">
                    {formatDate(selectedPayment?.paymentDate)}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Amount</div>
                  <div className="font-medium">
                    {selectedPayment
                      ? formatCurrency(selectedPayment.paymentAmount)
                      : "-"}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Method</div>
                  <div className="font-medium">
                    {selectedPayment?.paymentMethod}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Notes</div>
                  <div className="font-medium break-words">
                    {selectedPayment?.notes || "-"}
                  </div>
                </div>
              </div>

              {selectedPayment?.paymentMethod === "Cheque" && (
                <div className="space-y-2">
                  <div className="font-semibold">Cheque Details</div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-muted-foreground">Cheque Number</div>
                      <div className="font-medium">
                        {selectedPayment?.chequeDetails?.chequeNumber || "-"}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Cheque Date</div>
                      <div className="font-medium">
                        {selectedPayment?.chequeDetails?.chequeDate || "-"}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Bank</div>
                      <div className="font-medium">
                        {selectedPayment?.chequeDetails?.bankName || "-"}
                      </div>
                    </div>
                  </div>

                  <div className="mt-2">
                    <div className="text-sm text-muted-foreground mb-2">
                      Cheque Image
                    </div>
                    {selectedPayment?.chequeDetails?.chequeImageUrl ? (
                      <div className="relative w-full max-w-md">
                        <div className="relative aspect-[16/9] w-full overflow-hidden rounded-lg border">
                          <Image
                            src={selectedPayment.chequeDetails.chequeImageUrl}
                            alt="Cheque image"
                            className="h-full w-full object-contain"
                          />
                        </div>
                        <a
                          href={selectedPayment.chequeDetails.chequeImageUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 underline mt-2 inline-block"
                        >
                          Open original
                        </a>
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">
                        No image attached
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
