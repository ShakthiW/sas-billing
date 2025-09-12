"use client";

import { useState } from "react";
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

  const handlePrint = () => {
    window.print();
    onPrint?.();
    toast({
      title: "Success",
      description: "Credit bill sent to printer",
    });
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

            <div id="printable-credit-bill" className="p-6 bg-white text-black">
              <div className="print-content">
                <PrintableReceipt billData={bill} task={null} />
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
