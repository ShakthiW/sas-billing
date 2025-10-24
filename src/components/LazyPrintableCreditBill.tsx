"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Printer, Download, Eye, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Bill } from "@/app/types";
import { getBillById } from "@/app/api/actions";
import PrintableReceipt from "./PrintableReceipt";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

interface LazyPrintableCreditBillProps {
    jobId: string;
    onPrint?: () => void;
}

export default function LazyPrintableCreditBill({
    jobId,
    onPrint,
}: LazyPrintableCreditBillProps) {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [billData, setBillData] = useState<Bill | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const { toast } = useToast();

    const handlePreviewClick = async () => {
        if (billData) {
            // If we already have the bill data, just open the dialog
            setIsDialogOpen(true);
            return;
        }

        // If we don't have bill data, load it first
        try {
            setLoading(true);
            setError(null);
            const bill = await getBillById(jobId);
            if (bill) {
                setBillData(bill);
                setIsDialogOpen(true); // Auto-open dialog once loaded
            } else {
                setError("Bill data not found for this job");
                toast({
                    title: "Error",
                    description: "No bill found for this job",
                    variant: "destructive",
                });
            }
        } catch (err) {
            console.error("Failed to fetch bill data:", err);
            setError("Failed to load bill data");
            toast({
                title: "Error",
                description: "Failed to load bill data",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = async () => {
        if (!contentRef.current) return;

        try {
            const canvas = await html2canvas(contentRef.current, {
                scale: 2,
                useCORS: true,
                backgroundColor: "#ffffff",
            });

            const imgData = canvas.toDataURL("image/png");
            const pdf = new jsPDF({
                unit: "mm",
                format: "a5",
                orientation: "portrait",
            });

            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            const imgWidth = pageWidth - 20; // 10mm margin on each side
            const imgHeight = (canvas.height * imgWidth) / canvas.width;

            if (imgHeight > pageHeight - 20) {
                // If image is too tall, scale it down
                const scaledHeight = pageHeight - 20;
                const scaledWidth = (canvas.width * scaledHeight) / canvas.height;
                pdf.addImage(imgData, "PNG", 10, 10, scaledWidth, scaledHeight);
            } else {
                pdf.addImage(imgData, "PNG", 10, 10, imgWidth, imgHeight);
            }

            pdf.save(`credit-bill-${billData?.vehicleNo}-${new Date().toISOString().split('T')[0]}.pdf`);

            toast({
                title: "Success",
                description: "Credit bill downloaded successfully",
            });

            if (onPrint) {
                onPrint();
            }
        } catch (error) {
            console.error("Print error:", error);
            toast({
                title: "Error",
                description: "Failed to generate PDF",
                variant: "destructive",
            });
        }
    };

    const formatCurrency = (amount: number) => {
        return `Rs. ${amount.toFixed(2)}`;
    };

    const formatDate = (date: Date | undefined) => {
        if (!date) return "N/A";
        return new Date(date).toLocaleDateString();
    };

    return (
        <>
            <Button
                variant="outline"
                size="sm"
                onClick={handlePreviewClick}
                disabled={loading}
                className="flex items-center gap-2"
            >
                {loading ? (
                    <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Loading...
                    </>
                ) : (
                    <>
                        <Eye className="w-4 h-4" />
                        Preview & Print
                    </>
                )}
            </Button>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Credit Bill Preview</DialogTitle>
                        <DialogDescription>
                            Preview and print the credit bill
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="flex gap-2 no-print">
                            <Button
                                onClick={handlePrint}
                                className="flex items-center gap-2"
                                disabled={!billData}
                            >
                                <Printer className="w-4 h-4" />
                                Print Bill
                            </Button>
                            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                                Close
                            </Button>
                        </div>

                        {error && (
                            <div className="text-center py-8">
                                <div className="text-lg text-red-600">Error: {error}</div>
                                <Button
                                    variant="outline"
                                    onClick={handlePreviewClick}
                                    className="mt-2"
                                >
                                    Retry
                                </Button>
                            </div>
                        )}

                        {billData && (
                            <div ref={contentRef} id="print-area" className="w-[148mm] min-h-[210mm] mx-auto bg-white text-black p-6">
                                <PrintableReceipt billData={billData} task={null} />
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
