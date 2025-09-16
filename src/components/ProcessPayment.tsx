"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { useToast } from "@/hooks/use-toast";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { useUser } from "@clerk/nextjs";
import { Upload, CreditCard, CheckCircle, AlertCircle } from "lucide-react";
import Image from "@/components/RemoteImage";

interface ProcessPaymentProps {
  billId: string;
  billData: {
    vehicleNo: string;
    customerName: string;
    finalAmount: number;
    remainingBalance: number;
  };
  onPaymentProcessed: () => void;
}

export default function ProcessPayment({
  billId,
  billData,
  onPaymentProcessed,
}: ProcessPaymentProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<
    "Cash" | "Cheque" | "Bank Transfer"
  >("Cash");
  const [notes, setNotes] = useState("");
  const [chequeNumber, setChequeNumber] = useState("");
  const [chequeDate, setChequeDate] = useState("");
  const [bankName, setBankName] = useState("");
  const [chequeImage, setChequeImage] = useState<File | null>(null);
  const [chequeImagePreview, setChequeImagePreview] = useState<string | null>(
    null
  );
  const [isUploading, setIsUploading] = useState(false);
  const [loading, setLoading] = useState(false);

  const { toast } = useToast();
  const { permissions, role } = useUserPermissions();
  const { user } = useUser();

  const requiresApproval =
    role === "staff" || (paymentMethod === "Cheque" && role === "manager");

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const isHeif =
        file.type === "image/heif" ||
        file.type === "image/heic" ||
        file.name.endsWith(".heic") ||
        file.name.endsWith(".heif");
      if (isHeif) {
        try {
          const previewUrl = URL.createObjectURL(file);
          setChequeImagePreview(previewUrl);
        } catch {
          setChequeImagePreview(null);
          toast({
            title: "Notice",
            description:
              "HEIF/HEIC preview not supported in this browser. Image will still upload.",
            variant: "default",
          });
        }
      } else {
        if (file.size > 5 * 1024 * 1024) {
          // 5MB limit
          toast({
            title: "Error",
            description: "Image size must be less than 5MB",
            variant: "destructive",
          });
          return;
        }

        setChequeImage(file);
        const previewUrl = URL.createObjectURL(file);
        setChequeImagePreview(previewUrl);
      }
    }
  };

  const uploadImageToFirebase = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", "cheque-image");

    const response = await fetch("/api/upload-receipt", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error("Failed to upload image");
    }

    const data = await response.json();
    return data.url;
  };

  const handleSubmit = async () => {
    if (!user?.id) {
      toast({
        title: "Error",
        description: "User not authenticated",
        variant: "destructive",
      });
      return;
    }

    // Validation
    const amount = parseFloat(paymentAmount);
    if (!amount || amount <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid payment amount",
        variant: "destructive",
      });
      return;
    }

    if (amount > billData.remainingBalance) {
      toast({
        title: "Error",
        description: "Payment amount cannot exceed remaining balance",
        variant: "destructive",
      });
      return;
    }

    if (paymentMethod === "Cheque") {
      if (!chequeNumber.trim()) {
        toast({
          title: "Error",
          description: "Cheque number is required",
          variant: "destructive",
        });
        return;
      }
      if (!chequeDate) {
        toast({
          title: "Error",
          description: "Cheque date is required",
          variant: "destructive",
        });
        return;
      }
    }

    try {
      setLoading(true);
      setIsUploading(true);

      let chequeImageUrl = "";
      if (chequeImage) {
        chequeImageUrl = await uploadImageToFirebase(chequeImage);
      }

      const paymentData = {
        paymentAmount: amount,
        paymentMethod,
        notes,
        ...(paymentMethod === "Cheque" && {
          chequeDetails: {
            chequeNumber,
            chequeDate,
            bankName,
            chequeImageUrl,
          },
        }),
      };

      if (requiresApproval) {
        // Submit for approval
        const response = await fetch("/api/approvals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "create",
            type: "payment",
            jobId: billData.vehicleNo, // Using vehicle number as identifier
            requestData: {
              billId,
              paymentData,
            },
            metadata: {
              paymentAmount: amount,
              paymentMethod,
              billId,
            },
          }),
        });

        const data = await response.json();

        if (data.success) {
          toast({
            title: "Success",
            description: "Payment submitted for admin approval",
          });
          setIsDialogOpen(false);
          resetForm();
        } else {
          throw new Error(data.error);
        }
      } else {
        // Process payment directly
        const response = await fetch("/api/credit-payments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            billId,
            ...paymentData,
          }),
        });

        const data = await response.json();

        if (data.success) {
          toast({
            title: "Success",
            description: "Payment processed successfully",
          });
          setIsDialogOpen(false);
          resetForm();
          onPaymentProcessed();
        } else {
          throw new Error(data.error);
        }
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to process payment",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setIsUploading(false);
    }
  };

  const resetForm = () => {
    setPaymentAmount("");
    setPaymentMethod("Cash");
    setNotes("");
    setChequeNumber("");
    setChequeDate("");
    setBankName("");
    setChequeImage(null);
    setChequeImagePreview(null);
  };

  return (
    <>
      <Button
        onClick={() => setIsDialogOpen(true)}
        disabled={!permissions.canApprovePayments && role === "staff"}
        className="flex items-center gap-2"
      >
        <CreditCard className="w-4 h-4" />
        Process Payment
      </Button>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Process Payment</DialogTitle>
            <DialogDescription>
              {requiresApproval
                ? "This payment will be submitted for admin approval"
                : "Process a credit payment for this bill"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Bill Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Bill Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span>Vehicle:</span>
                  <span className="font-medium">{billData.vehicleNo}</span>
                </div>
                <div className="flex justify-between">
                  <span>Customer:</span>
                  <span className="font-medium">{billData.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Amount:</span>
                  <span className="font-medium">
                    Rs. {billData.finalAmount.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Remaining Balance:</span>
                  <span className="font-medium text-red-600">
                    Rs. {billData.remainingBalance.toFixed(2)}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Payment Details */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="paymentAmount">Payment Amount</Label>
                <Input
                  id="paymentAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  max={billData.remainingBalance}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="Enter payment amount"
                />
              </div>

              <div>
                <Label htmlFor="paymentMethod">Payment Method</Label>
                <Select
                  value={paymentMethod}
                  onValueChange={(value: any) => setPaymentMethod(value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cash">Cash</SelectItem>
                    <SelectItem value="Cheque">Cheque</SelectItem>
                    <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Cheque Details */}
              {paymentMethod === "Cheque" && (
                <div className="space-y-4 p-4 border rounded-lg bg-blue-50">
                  <h4 className="font-medium">Cheque Details</h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="chequeNumber">Cheque Number</Label>
                      <Input
                        id="chequeNumber"
                        value={chequeNumber}
                        onChange={(e) => setChequeNumber(e.target.value)}
                        placeholder="Enter cheque number"
                      />
                    </div>
                    <div>
                      <Label htmlFor="chequeDate">Cheque Date</Label>
                      <Input
                        id="chequeDate"
                        type="date"
                        value={chequeDate}
                        onChange={(e) => setChequeDate(e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="bankName">Bank Name</Label>
                    <Input
                      id="bankName"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      placeholder="Enter bank name (optional)"
                    />
                  </div>

                  {/* Cheque Image Upload */}
                  <div>
                    <Label htmlFor="chequeImage">Cheque Image</Label>
                    <div className="mt-2 space-y-4">
                      <Input
                        id="chequeImage"
                        type="file"
                        accept="image/*,.heic,.heif"
                        onChange={handleImageChange}
                        className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      />

                      {chequeImagePreview && (
                        <div className="relative w-full max-w-md">
                          <Image
                            src={chequeImagePreview}
                            alt="Cheque preview"
                            width={300}
                            height={200}
                            className="rounded-lg border object-cover"
                          />
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => {
                              setChequeImage(null);
                              setChequeImagePreview(null);
                            }}
                            className="absolute top-2 right-2"
                          >
                            Remove
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div>
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any additional notes about this payment..."
                  rows={3}
                />
              </div>

              {/* Approval Notice */}
              {requiresApproval && (
                <Card className="border-orange-200 bg-orange-50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-orange-600" />
                      <div>
                        <p className="font-medium text-orange-800">
                          Approval Required
                        </p>
                        <p className="text-sm text-orange-700">
                          This payment will be submitted for admin approval
                          before processing.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={loading || isUploading}>
              {loading
                ? "Processing..."
                : requiresApproval
                ? "Submit for Approval"
                : "Process Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
