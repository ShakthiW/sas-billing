"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Bill } from "@/app/types";
import { getAllDraftBills, finalizeBill } from "@/app/api/actions";
import { FileText, Eye, CheckCircle, Calendar, DollarSign } from "lucide-react";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";

export default function DraftBillsPage() {
    const [draftBills, setDraftBills] = useState<Bill[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
    const [finalizing, setFinalizing] = useState<string | null>(null);

    useEffect(() => {
        fetchDraftBills();
    }, []);

    const fetchDraftBills = async () => {
        try {
            setLoading(true);
            const bills = await getAllDraftBills();
            setDraftBills(bills);
        } catch (error) {
            console.error("Failed to fetch draft bills:", error);
            toast({
                title: "Error",
                description: "Failed to load draft bills",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleFinalizeBill = async (billId: string) => {
        if (!billId) return;

        try {
            setFinalizing(billId);
            await finalizeBill(billId);

            toast({
                title: "Success",
                description: "Bill has been finalized successfully",
            });

            // Refresh the list
            await fetchDraftBills();
        } catch (error) {
            console.error("Failed to finalize bill:", error);
            toast({
                title: "Error",
                description: "Failed to finalize bill",
                variant: "destructive",
            });
        } finally {
            setFinalizing(null);
        }
    };

    const formatDate = (date: Date | undefined) => {
        if (!date) return "N/A";
        return new Date(date).toLocaleDateString();
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'LKR',
            minimumFractionDigits: 2,
        }).format(amount);
    };

    if (loading) {
        return (
            <SidebarProvider>
                <AppSidebar />
                <SidebarInset>
                    <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
                        <SidebarTrigger />
                        <Separator orientation="vertical" className="mr-2 h-4" />
                        <Breadcrumb>
                            <BreadcrumbList>
                                <BreadcrumbItem className="hidden md:block">
                                    <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
                                </BreadcrumbItem>
                                <BreadcrumbSeparator className="hidden md:block" />
                                <BreadcrumbItem>
                                    <BreadcrumbPage>Draft Bills</BreadcrumbPage>
                                </BreadcrumbItem>
                            </BreadcrumbList>
                        </Breadcrumb>
                    </header>
                    <div className="flex flex-1 flex-col gap-4 p-4">
                        <div className="container mx-auto p-6">
                            <div className="flex items-center justify-center h-64">
                                <div className="text-lg">Loading draft bills...</div>
                            </div>
                        </div>
                    </div>
                </SidebarInset>
            </SidebarProvider>
        );
    }

    return (
        <SidebarProvider>
            <AppSidebar />
            <SidebarInset>
                <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
                    <SidebarTrigger />
                    <Separator orientation="vertical" className="mr-2 h-4" />
                    <Breadcrumb>
                        <BreadcrumbList>
                            <BreadcrumbItem className="hidden md:block">
                                <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
                            </BreadcrumbItem>
                            <BreadcrumbSeparator className="hidden md:block" />
                            <BreadcrumbItem>
                                <BreadcrumbPage>Draft Bills</BreadcrumbPage>
                            </BreadcrumbItem>
                        </BreadcrumbList>
                    </Breadcrumb>
                </header>
                <div className="flex flex-1 flex-col gap-4 p-4">
                    <div className="container mx-auto p-6 space-y-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-3xl font-bold tracking-tight">Draft Bills</h1>
                                <p className="text-muted-foreground">
                                    Manage and finalize draft bills before processing payments
                                </p>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Badge variant="secondary" className="text-sm">
                                    {draftBills.length} Draft Bills
                                </Badge>
                            </div>
                        </div>

                        {draftBills.length === 0 ? (
                            <Card>
                                <CardContent className="flex flex-col items-center justify-center py-12">
                                    <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                                    <h3 className="text-lg font-semibold mb-2">No Draft Bills</h3>
                                    <p className="text-muted-foreground text-center">
                                        All bills have been finalized or no bills have been created yet.
                                    </p>
                                </CardContent>
                            </Card>
                        ) : (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Draft Bills List</CardTitle>
                                    <CardDescription>
                                        Review and finalize pending bills
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Vehicle No</TableHead>
                                                <TableHead>Customer</TableHead>
                                                <TableHead>Amount</TableHead>
                                                <TableHead>Payment Type</TableHead>
                                                <TableHead>Created</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead className="text-right">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {draftBills.map((bill) => (
                                                <TableRow key={bill._id}>
                                                    <TableCell className="font-medium">{bill.vehicleNo}</TableCell>
                                                    <TableCell>{bill.customerName}</TableCell>
                                                    <TableCell>{formatCurrency(bill.finalAmount)}</TableCell>
                                                    <TableCell>
                                                        <Badge variant={bill.paymentType === 'Credit' ? 'destructive' : 'default'}>
                                                            {bill.paymentType}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>{formatDate(bill.createdAt)}</TableCell>
                                                    <TableCell>
                                                        <Badge variant="secondary">{bill.status}</Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex items-center justify-end space-x-2">
                                                            <Dialog>
                                                                <DialogTrigger asChild>
                                                                    <Button
                                                                        variant="outline"
                                                                        size="sm"
                                                                        onClick={() => setSelectedBill(bill)}
                                                                    >
                                                                        <Eye className="w-4 h-4" />
                                                                    </Button>
                                                                </DialogTrigger>
                                                                <DialogContent className="max-w-2xl">
                                                                    <DialogHeader>
                                                                        <DialogTitle>Bill Details</DialogTitle>
                                                                        <DialogDescription>
                                                                            Review bill information before finalizing
                                                                        </DialogDescription>
                                                                    </DialogHeader>
                                                                    {selectedBill && (
                                                                        <div className="space-y-4">
                                                                            <div className="grid grid-cols-1 ipad:grid-cols-2 gap-4">
                                                                                <div>
                                                                                    <h4 className="font-semibold">Vehicle Information</h4>
                                                                                    <p>Vehicle No: {selectedBill.vehicleNo}</p>
                                                                                    <p>Type: {selectedBill.vehicleType}</p>
                                                                                </div>
                                                                                <div>
                                                                                    <h4 className="font-semibold">Customer Information</h4>
                                                                                    <p>Name: {selectedBill.customerName}</p>
                                                                                    <p>Type: {selectedBill.clientType}</p>
                                                                                    {selectedBill.driverName && (
                                                                                        <p>Driver: {selectedBill.driverName}</p>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                            <div>
                                                                                <h4 className="font-semibold">Services</h4>
                                                                                <ul className="list-disc list-inside">
                                                                                    {selectedBill.services.map((service, index) => (
                                                                                        <li key={index}>{service.description}</li>
                                                                                    ))}
                                                                                </ul>
                                                                            </div>
                                                                            <div className="grid grid-cols-1 ipad:grid-cols-2 gap-4">
                                                                                <div>
                                                                                    <h4 className="font-semibold">Financial Details</h4>
                                                                                    <p>Total: {formatCurrency(selectedBill.totalAmount)}</p>
                                                                                    <p>Commission: {formatCurrency(selectedBill.commission || 0)}</p>
                                                                                    <p>Final Amount: {formatCurrency(selectedBill.finalAmount)}</p>
                                                                                </div>
                                                                                <div>
                                                                                    <h4 className="font-semibold">Payment Details</h4>
                                                                                    <p>Type: {selectedBill.paymentType}</p>
                                                                                    <p>Bank: {selectedBill.bankAccount}</p>
                                                                                    {selectedBill.paymentType === 'Credit' && selectedBill.initialPayment && (
                                                                                        <>
                                                                                            <p>Initial Payment: {formatCurrency(selectedBill.initialPayment)}</p>
                                                                                            <p>Remaining: {formatCurrency(selectedBill.remainingBalance || 0)}</p>
                                                                                        </>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </DialogContent>
                                                            </Dialog>
                                                            <Button
                                                                size="sm"
                                                                onClick={() => handleFinalizeBill(bill._id!)}
                                                                disabled={finalizing === bill._id}
                                                            >
                                                                {finalizing === bill._id ? (
                                                                    "Finalizing..."
                                                                ) : (
                                                                    <>
                                                                        <CheckCircle className="w-4 h-4 mr-1" />
                                                                        Finalize
                                                                    </>
                                                                )}
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>
            </SidebarInset>
        </SidebarProvider>
    );
}
