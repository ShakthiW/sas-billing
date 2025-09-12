"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { Bill } from "@/app/types";
import { Eye, Download, Search, Receipt, Filter } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";

interface InvoiceData extends Bill {
  invoiceNumber: string;
  invoiceDate: Date;
  dueDate?: Date;
  issueDate: Date;
}

export default function InvoicesPage() {
  const router = useRouter();
  const { permissions, role } = useUserPermissions();
  const [invoices, setInvoices] = useState<InvoiceData[]>([]);
  const [filteredInvoices, setFilteredInvoices] = useState<InvoiceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceData | null>(
    null
  );
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);

  // Filter states
  const [filters, setFilters] = useState({
    search: "",
    status: "all",
    paymentType: "all",
    dateFrom: "",
    dateTo: "",
    customerName: "",
    vehicleNo: "",
  });

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/invoices");

      if (!response.ok) {
        throw new Error("Failed to fetch invoices");
      }

      const data = await response.json();
      setInvoices(data.invoices || []);
    } catch (error) {
      console.error("Failed to fetch invoices:", error);
      toast({
        title: "Error",
        description: "Failed to load invoices",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = useCallback(() => {
    let filtered = [...invoices];

    // Search filter
    if (filters.search) {
      filtered = filtered.filter(
        (invoice) =>
          invoice.customerName
            .toLowerCase()
            .includes(filters.search.toLowerCase()) ||
          invoice.vehicleNo
            .toLowerCase()
            .includes(filters.search.toLowerCase()) ||
          invoice.invoiceNumber
            .toLowerCase()
            .includes(filters.search.toLowerCase()) ||
          invoice.jobId.toLowerCase().includes(filters.search.toLowerCase())
      );
    }

    // Status filter
    if (filters.status !== "all") {
      filtered = filtered.filter(
        (invoice) => invoice.status === filters.status
      );
    }

    // Payment type filter
    if (filters.paymentType !== "all") {
      filtered = filtered.filter(
        (invoice) => invoice.paymentType === filters.paymentType
      );
    }

    // Customer name filter
    if (filters.customerName) {
      filtered = filtered.filter((invoice) =>
        invoice.customerName
          .toLowerCase()
          .includes(filters.customerName.toLowerCase())
      );
    }

    // Vehicle number filter
    if (filters.vehicleNo) {
      filtered = filtered.filter((invoice) =>
        invoice.vehicleNo
          .toLowerCase()
          .includes(filters.vehicleNo.toLowerCase())
      );
    }

    // Date range filter
    if (filters.dateFrom || filters.dateTo) {
      filtered = filtered.filter((invoice) => {
        const invoiceDate = new Date(invoice.invoiceDate);
        const fromDate = filters.dateFrom ? new Date(filters.dateFrom) : null;
        const toDate = filters.dateTo ? new Date(filters.dateTo) : null;

        if (fromDate && invoiceDate < fromDate) return false;
        if (toDate && invoiceDate > toDate) return false;
        return true;
      });
    }

    setFilteredInvoices(filtered);
  }, [invoices, filters]);

  useEffect(() => {
    applyFilters();
  }, [invoices, filters, applyFilters]);

  const handleFilterChange = (key: keyof typeof filters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      search: "",
      status: "all",
      paymentType: "all",
      dateFrom: "",
      dateTo: "",
      customerName: "",
      vehicleNo: "",
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { label: "Draft", variant: "secondary" as const },
      finalized: { label: "Finalized", variant: "default" as const },
      paid: { label: "Paid", variant: "default" as const },
      partially_paid: {
        label: "Partially Paid",
        variant: "destructive" as const,
      },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || {
      label: status,
      variant: "secondary" as const,
    };

    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getPaymentTypeBadge = (paymentType: string) => {
    const typeConfig = {
      Cash: { label: "Cash", variant: "default" as const },
      Credit: { label: "Credit", variant: "destructive" as const },
      Cheque: { label: "Cheque", variant: "secondary" as const },
    };

    const config = typeConfig[paymentType as keyof typeof typeConfig] || {
      label: paymentType,
      variant: "secondary" as const,
    };

    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const handleViewDetails = (invoice: InvoiceData) => {
    setSelectedInvoice(invoice);
    setShowDetailsDialog(true);
  };

  const handleDownloadInvoice = async (invoiceId: string) => {
    try {
      const response = await fetch(`/api/invoices/${invoiceId}/download`);

      if (!response.ok) {
        throw new Error("Failed to download invoice");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = `invoice-${invoiceId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Success",
        description: "Invoice downloaded successfully",
      });
    } catch (error) {
      console.error("Failed to download invoice:", error);
      toast({
        title: "Error",
        description: "Failed to download invoice",
        variant: "destructive",
      });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-LK", {
      style: "currency",
      currency: "LKR",
    }).format(amount);
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString("en-LK");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2">Loading invoices...</p>
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout title="Invoices" breadcrumbs={[{ label: "Invoices" }]}>
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="min-h-[100vh] flex-1 rounded-xl bg-muted/50 md:min-h-min p-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Receipt className="h-5 w-5" />
                    Invoice Management
                  </CardTitle>
                  <CardDescription>
                    View and manage all invoices generated from finalized bills
                  </CardDescription>
                </div>
              </div>

              {/* Filters Section */}
              <div className="space-y-4 border-t pt-4">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  <span className="font-medium">Filters</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearFilters}
                    className="ml-auto"
                  >
                    Clear All
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Search</label>
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search invoices..."
                        value={filters.search}
                        onChange={(e) =>
                          handleFilterChange("search", e.target.value)
                        }
                        className="pl-8"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Status</label>
                    <Select
                      value={filters.status}
                      onValueChange={(value) =>
                        handleFilterChange("status", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All statuses" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="finalized">Finalized</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="partially_paid">
                          Partially Paid
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Payment Type</label>
                    <Select
                      value={filters.paymentType}
                      onValueChange={(value) =>
                        handleFilterChange("paymentType", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="Cash">Cash</SelectItem>
                        <SelectItem value="Credit">Credit</SelectItem>
                        <SelectItem value="Cheque">Cheque</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Customer Name</label>
                    <Input
                      placeholder="Filter by customer..."
                      value={filters.customerName}
                      onChange={(e) =>
                        handleFilterChange("customerName", e.target.value)
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Vehicle No</label>
                    <Input
                      placeholder="Filter by vehicle..."
                      value={filters.vehicleNo}
                      onChange={(e) =>
                        handleFilterChange("vehicleNo", e.target.value)
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">From Date</label>
                    <Input
                      type="date"
                      value={filters.dateFrom}
                      onChange={(e) =>
                        handleFilterChange("dateFrom", e.target.value)
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">To Date</label>
                    <Input
                      type="date"
                      value={filters.dateTo}
                      onChange={(e) =>
                        handleFilterChange("dateTo", e.target.value)
                      }
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredInvoices.length === 0 ? (
                <div className="text-center py-8">
                  <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-lg font-medium">No invoices found</p>
                  <p className="text-muted-foreground">
                    {invoices.length === 0
                      ? "No invoices have been generated yet."
                      : "No invoices match your current filters."}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      Showing {filteredInvoices.length} of {invoices.length}{" "}
                      invoices
                    </p>
                  </div>

                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Invoice #</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead>Vehicle</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Payment Type</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredInvoices.map((invoice) => (
                          <TableRow key={invoice._id}>
                            <TableCell className="font-medium">
                              {invoice.invoiceNumber}
                            </TableCell>
                            <TableCell>
                              {formatDate(invoice.invoiceDate)}
                            </TableCell>
                            <TableCell>{invoice.customerName}</TableCell>
                            <TableCell>{invoice.vehicleNo}</TableCell>
                            <TableCell>
                              {formatCurrency(invoice.finalAmount)}
                            </TableCell>
                            <TableCell>
                              {getPaymentTypeBadge(invoice.paymentType)}
                            </TableCell>
                            <TableCell>
                              {getStatusBadge(invoice.status)}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleViewDetails(invoice)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    handleDownloadInvoice(invoice._id!)
                                  }
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
      </div>

      {/* Invoice Details Dialog */}
      {selectedInvoice && (
        <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Invoice Details - {selectedInvoice.invoiceNumber}
              </DialogTitle>
              <DialogDescription>
                Complete invoice information and payment details
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Customer Information</h3>
                  <div className="space-y-2 text-sm">
                    <p>
                      <strong>Name:</strong> {selectedInvoice.customerName}
                    </p>
                    <p>
                      <strong>Vehicle:</strong> {selectedInvoice.vehicleNo} (
                      {selectedInvoice.vehicleType})
                    </p>
                    {selectedInvoice.driverName && (
                      <p>
                        <strong>Driver:</strong> {selectedInvoice.driverName}
                      </p>
                    )}
                    <p>
                      <strong>Client Type:</strong> {selectedInvoice.clientType}
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Invoice Information</h3>
                  <div className="space-y-2 text-sm">
                    <p>
                      <strong>Invoice #:</strong>{" "}
                      {selectedInvoice.invoiceNumber}
                    </p>
                    <p>
                      <strong>Job ID:</strong> {selectedInvoice.jobId}
                    </p>
                    <p>
                      <strong>Issue Date:</strong>{" "}
                      {formatDate(selectedInvoice.issueDate)}
                    </p>
                    <p>
                      <strong>Status:</strong>{" "}
                      {getStatusBadge(selectedInvoice.status)}
                    </p>
                    <p>
                      <strong>Payment Type:</strong>{" "}
                      {getPaymentTypeBadge(selectedInvoice.paymentType)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Financial Details</h3>
                  <div className="space-y-2 text-sm">
                    <p>
                      <strong>Total Amount:</strong>{" "}
                      {formatCurrency(selectedInvoice.totalAmount)}
                    </p>
                    {/* Commission visible only to admin users */}
                    {role === "admin" && (
                      <p>
                        <strong>Commission/Additional:</strong>{" "}
                        {formatCurrency(selectedInvoice.commission || 0)}
                      </p>
                    )}
                    <p>
                      <strong>Final Amount:</strong>{" "}
                      {formatCurrency(selectedInvoice.finalAmount)}
                    </p>
                    {selectedInvoice.initialPayment && (
                      <p>
                        <strong>Initial Payment:</strong>{" "}
                        {formatCurrency(selectedInvoice.initialPayment)}
                      </p>
                    )}
                    {selectedInvoice.remainingBalance && (
                      <p>
                        <strong>Remaining Balance:</strong>{" "}
                        {formatCurrency(selectedInvoice.remainingBalance)}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Services</h3>
                  <div className="space-y-1 text-sm">
                    {selectedInvoice.services.map((service, index) => (
                      <p key={index}>• {service.description}</p>
                    ))}
                  </div>
                </div>

                {selectedInvoice.chequeDetails && (
                  <div>
                    <h3 className="font-semibold mb-2">Cheque Details</h3>
                    <div className="space-y-2 text-sm">
                      {selectedInvoice.chequeDetails.chequeNumber && (
                        <p>
                          <strong>Cheque #:</strong>{" "}
                          {selectedInvoice.chequeDetails.chequeNumber}
                        </p>
                      )}
                      {selectedInvoice.chequeDetails.chequeDate && (
                        <p>
                          <strong>Cheque Date:</strong>{" "}
                          {formatDate(selectedInvoice.chequeDetails.chequeDate)}
                        </p>
                      )}
                      {selectedInvoice.chequeDetails.bankName && (
                        <p>
                          <strong>Bank:</strong>{" "}
                          {selectedInvoice.chequeDetails.bankName}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setShowDetailsDialog(false)}
              >
                Close
              </Button>
              <Button
                onClick={() => handleDownloadInvoice(selectedInvoice._id!)}
              >
                <Download className="h-4 w-4 mr-2" />
                Download Invoice
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </DashboardLayout>
  );
}
