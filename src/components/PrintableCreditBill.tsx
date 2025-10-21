"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Printer, Download, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Bill } from "@/app/types";
import PrintableReceipt from "./PrintableReceipt";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

interface PrintableCreditBillProps {
  bill: Bill;
  onPrint?: () => void;
}

export default function PrintableCreditBill({
  bill,
  onPrint,
}: PrintableCreditBillProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  const contentRef = useRef<HTMLDivElement>(null);

  const handlePrint = async () => {
    const node = document.getElementById("print-area");
    if (!node) return;

    try {
      // Render the receipt area to canvas at high resolution
      const canvas = await html2canvas(node, {
        scale: 3,
        useCORS: true,
        backgroundColor: "#ffffff",
        scrollY: -window.scrollY,
      });

      // Create A5 PDF (portrait)
      const pdf = new jsPDF({
        unit: "mm",
        format: "a5",
        orientation: "portrait",
      });
      const pageWidthMM = pdf.internal.pageSize.getWidth();
      const pageHeightMM = pdf.internal.pageSize.getHeight();
      const marginMM = 4;

      // Map full canvas width to A5 width, maintain aspect ratio
      const imgWidthMM = pageWidthMM - marginMM * 2;
      const imgHeightMM = (canvas.height * imgWidthMM) / canvas.width;

      if (imgHeightMM <= pageHeightMM) {
        const imgData = canvas.toDataURL("image/png");
        pdf.addImage(
          imgData,
          "PNG",
          marginMM,
          marginMM,
          imgWidthMM,
          imgHeightMM,
          undefined,
          "FAST"
        );
      } else {
        // Slice the tall canvas into A5-height slices
        const pxPerMM = canvas.width / imgWidthMM;
        const pageHeightPx = Math.floor(pageHeightMM * pxPerMM);
        let renderedHeight = 0;
        while (renderedHeight < canvas.height) {
          const sliceHeight = Math.min(
            pageHeightPx,
            canvas.height - renderedHeight
          );
          const pageCanvas = document.createElement("canvas");
          pageCanvas.width = canvas.width;
          pageCanvas.height = sliceHeight;
          const ctx = pageCanvas.getContext("2d");
          if (!ctx) break;
          ctx.drawImage(
            canvas,
            0,
            renderedHeight,
            canvas.width,
            sliceHeight,
            0,
            0,
            canvas.width,
            sliceHeight
          );
          const pageImg = pageCanvas.toDataURL("image/png");
          const sliceHeightMM = sliceHeight / pxPerMM;
          pdf.addImage(
            pageImg,
            "PNG",
            marginMM,
            marginMM,
            imgWidthMM,
            sliceHeightMM,
            undefined,
            "FAST"
          );
          renderedHeight += sliceHeight;
          if (renderedHeight < canvas.height) pdf.addPage("a5", "portrait");
        }
      }

      // Open print dialog for the PDF
      pdf.autoPrint();
      window.open(pdf.output('bloburl'), '_blank');

      onPrint?.();
      toast({
        title: "Success",
        description: "Credit bill sent to printer",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to print credit bill",
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

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "paid":
        return "status-paid";
      case "partially_paid":
        return "status-partially-paid";
      case "finalized":
        return "status-finalized";
      default:
        return "status-finalized";
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsDialogOpen(true)}
        className="flex items-center gap-2"
      >
        <Eye className="w-4 h-4" />
        Preview & Print
      </Button>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Credit Bill Preview</DialogTitle>
            <DialogDescription>
              Preview and print the credit bill for {bill.vehicleNo}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex gap-2 no-print">
              <Button onClick={handlePrint} className="flex items-center gap-2">
                <Printer className="w-4 h-4" />
                Print Bill
              </Button>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Close
              </Button>
            </div>

            <div ref={contentRef} id="print-area" className="w-[148mm] min-h-[210mm] mx-auto bg-white text-black p-6">
              <PrintableReceipt billData={bill} task={null} />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
