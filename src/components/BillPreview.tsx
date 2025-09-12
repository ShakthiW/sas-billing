import React from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import PrintableReceipt from "./PrintableReceipt";
import { Bill } from "@/app/types";
import { Task } from "@/app/types";
import { Button } from "./ui/button";

interface BillPreviewProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  billData: Omit<Bill, "createdAt"> & { createdAt?: Date };
  task: Task | null;
}

const BillPreview: React.FC<BillPreviewProps> = ({
  isOpen,
  onClose,
  onConfirm,
  billData,
  task,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bill Preview</DialogTitle>
        </DialogHeader>

        <div className="py-4">
          <PrintableReceipt billData={billData} task={task} />
        </div>

        <DialogFooter className="flex justify-between border-t pt-4">
          <Button variant="outline" onClick={onClose}>
            Edit Bill Details
          </Button>
          <Button onClick={onConfirm}>Confirm & Generate Bill</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BillPreview;
