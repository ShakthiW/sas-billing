import React, { useRef, useState, useEffect, useCallback } from "react";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { format } from "date-fns";
import { Task, Bill } from "@/app/types";

interface ReceiptGeneratorProps {
  billData: Bill;
  task: Task | null;
  onReceiptGenerated: (pdfBlob: Blob) => void;
}

const ReceiptGenerator: React.FC<ReceiptGeneratorProps> = ({
  billData,
  task,
  onReceiptGenerated,
}) => {
  const receiptRef = useRef<HTMLDivElement>(null);
  const [generationAttempts, setGenerationAttempts] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const maxAttempts = 3;

  const receiptTitle = (() => {
    if (billData.paymentType === "Unspecified") return "SAS Enterprises";
    if (billData.paymentType === "Cash") return "SAS Air Conditioning";
    if (
      billData.paymentType === "Credit" ||
      billData.paymentType === "Cheque"
    ) {
      if (!billData.bankAccount) return "SAS Air Conditioning";
      if (billData.bankEntityLabel) return billData.bankEntityLabel;
      return "SAS Enterprises";
    }
    return "SAS Enterprises";
  })();

  const createFallbackPdf = useCallback(() => {
    try {
      const pdf = new jsPDF();
      pdf.setFontSize(16);
      pdf.text("Receipt Generation Error", 20, 20);
      pdf.setFontSize(12);
      pdf.text("There was an error generating the complete receipt.", 20, 30);
      pdf.text(`Vehicle: ${billData.vehicleNo}`, 20, 45);
      pdf.text(`Customer: ${billData.customerName}`, 20, 55);
      pdf.text(`Total Amount: Rs. ${billData.finalAmount.toFixed(2)}`, 20, 65);
      pdf.text("Please contact support for assistance.", 20, 85);
      const pdfBlob = pdf.output("blob");
      onReceiptGenerated(pdfBlob);
    } catch (error) {
      console.error("Even fallback PDF creation failed:", error);
    }
  }, [
    billData.vehicleNo,
    billData.customerName,
    billData.finalAmount,
    onReceiptGenerated,
  ]);

  const generateReceipt = useCallback(async () => {
    if (!receiptRef.current) {
      console.error("Receipt reference not available");
      return;
    }

    if (isGenerating) {
      console.log(
        "Receipt generation already in progress, skipping duplicate call"
      );
      return;
    }

    try {
      setIsGenerating(true);

      // Wait for any rendering to complete
      await new Promise((resolve) => setTimeout(resolve, 500));

      const canvas = await html2canvas(receiptRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        allowTaint: true,
        backgroundColor: "#ffffff",
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a5",
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      const imgY = 10;

      pdf.addImage(
        imgData,
        "PNG",
        imgX,
        imgY,
        imgWidth * ratio,
        imgHeight * ratio
      );

      const pdfBlob = pdf.output("blob");
      onReceiptGenerated(pdfBlob);
    } catch (error) {
      console.error("Failed to generate receipt:", error);

      // Retry logic
      if (generationAttempts < maxAttempts) {
        console.log(
          `Retrying receipt generation, attempt ${
            generationAttempts + 1
          } of ${maxAttempts}`
        );
        setGenerationAttempts((prev) => prev + 1);
        setTimeout(() => {
          setIsGenerating(false);
          generateReceipt();
        }, 1000); // Wait 1 second before retrying
      } else {
        console.error("Max receipt generation attempts reached");
        // Still call the callback with a fallback PDF containing error information
        createFallbackPdf();
      }
    } finally {
      if (generationAttempts >= maxAttempts) {
        setIsGenerating(false);
      }
    }
  }, [
    isGenerating,
    generationAttempts,
    maxAttempts,
    onReceiptGenerated,
    createFallbackPdf,
  ]);

  // Immediately generate receipt when component mounts
  useEffect(() => {
    generateReceipt();
  }, [generateReceipt]);

  return (
    <div className="hidden">
      <div
        ref={receiptRef}
        className="p-10 bg-white w-[148mm] min-h-[210mm]" // A5 size
        style={{ fontFamily: "Arial, sans-serif" }}
      >
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">{receiptTitle}</h1>
          <p className="text-lg font-semibold">OFFICIAL RECEIPT</p>
          <p className="text-sm text-gray-500">
            Receipt Date: {format(new Date(), "dd/MM/yyyy")}
          </p>
          <p className="text-sm text-gray-500">
            Invoice #: INV-{billData.jobId.slice(-6)}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-6 mb-8">
          <div>
            <h2 className="font-bold text-lg mb-2 border-b pb-1">
              Customer Details
            </h2>
            <p>
              <span className="font-semibold">Name:</span>{" "}
              {billData.customerName}
            </p>
            <p>
              <span className="font-semibold">Type:</span> {billData.clientType}
            </p>
            {billData.driverName && (
              <p>
                <span className="font-semibold">Driver:</span>{" "}
                {billData.driverName}
              </p>
            )}
          </div>
          <div>
            <h2 className="font-bold text-lg mb-2 border-b pb-1">
              Vehicle Details
            </h2>
            <p>
              <span className="font-semibold">Vehicle Number:</span>{" "}
              {billData.vehicleNo}
            </p>
            {billData.vehicleType && (
              <p>
                <span className="font-semibold">Vehicle Type:</span>{" "}
                {billData.vehicleType}
              </p>
            )}
          </div>
        </div>

        <div className="mb-8">
          <h2 className="font-bold text-lg mb-2 border-b pb-1">
            Services Performed
          </h2>
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="border p-2 text-left">No</th>
                <th className="border p-2 text-left">Description</th>
                <th className="border p-2 text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {billData.services.map((service, index) => (
                <tr key={`service-${index}`}>
                  <td className="border p-2">{index + 1}</td>
                  <td className="border p-2">{service.description}</td>
                  <td className="border p-2 text-right text-green-600">
                    Completed
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mb-8">
          <h2 className="font-bold text-lg mb-2 border-b pb-1">
            Payment Details
          </h2>
          <table className="w-full">
            <tbody>
              <tr>
                <td className="p-2 font-semibold">Payment Type:</td>
                <td className="p-2 text-right">{billData.paymentType}</td>
              </tr>
              <tr>
                <td className="p-2 font-semibold">Service Total:</td>
                <td className="p-2 text-right">
                  Rs. {billData.totalAmount.toFixed(2)}
                </td>
              </tr>
              {/* Commission/Additional hidden in print/PDF view */}
              <tr className="border-t border-gray-300">
                <td className="p-2 font-bold text-lg">TOTAL AMOUNT:</td>
                <td className="p-2 text-right font-bold text-lg">
                  Rs. {billData.finalAmount.toFixed(2)}
                </td>
              </tr>

              {billData.paymentType === "Credit" && billData.creditDetails && (
                <>
                  <tr className="border-t border-gray-200">
                    <td className="p-2 font-semibold text-blue-600">
                      Initial Payment:
                    </td>
                    <td className="p-2 text-right text-blue-600">
                      Rs. {(billData.initialPayment || 0).toFixed(2)}
                    </td>
                  </tr>

                  {/* Show payment summary if this is an updated bill */}
                  {(billData as any).paymentSummary && (
                    <>
                      <tr>
                        <td className="p-2 font-semibold text-green-600">
                          Total Payments Made:
                        </td>
                        <td className="p-2 text-right text-green-600">
                          Rs.{" "}
                          {(
                            (billData as any).paymentSummary.totalPayments || 0
                          ).toFixed(2)}
                        </td>
                      </tr>
                    </>
                  )}

                  <tr>
                    <td className="p-2 font-semibold text-red-600">
                      Current Balance:
                    </td>
                    <td className="p-2 text-right text-red-600">
                      Rs.{" "}
                      {(
                        billData.remainingBalance ||
                        billData.finalAmount - (billData.initialPayment || 0)
                      ).toFixed(2)}
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2 font-semibold">Due Date:</td>
                    <td className="p-2 text-right">
                      {billData.creditDetails.dueDate}
                    </td>
                  </tr>
                  {billData.creditDetails.creditTerms && (
                    <tr>
                      <td className="p-2 font-semibold">Credit Terms:</td>
                      <td className="p-2 text-right">
                        {billData.creditDetails.creditTerms}
                      </td>
                    </tr>
                  )}
                </>
              )}

              {billData.paymentType === "Cheque" && billData.chequeDetails && (
                <>
                  {billData.chequeDetails.chequeNumber && (
                    <tr className="border-t border-gray-200">
                      <td className="p-2 font-semibold">Cheque Number:</td>
                      <td className="p-2 text-right">
                        {billData.chequeDetails.chequeNumber}
                      </td>
                    </tr>
                  )}
                  {billData.chequeDetails.chequeDate && (
                    <tr>
                      <td className="p-2 font-semibold">Cheque Date:</td>
                      <td className="p-2 text-right">
                        {billData.chequeDetails.chequeDate}
                      </td>
                    </tr>
                  )}
                  {billData.chequeDetails.bankName && (
                    <tr>
                      <td className="p-2 font-semibold">Bank Name:</td>
                      <td className="p-2 text-right">
                        {billData.chequeDetails.bankName}
                      </td>
                    </tr>
                  )}
                </>
              )}
            </tbody>
          </table>
        </div>

        {/* Payment History Section for Updated Bills */}
        {(billData as any).paymentSummary?.paymentHistory &&
          (billData as any).paymentSummary.paymentHistory.length > 0 && (
            <div className="mb-8 border-t pt-6">
              <h2 className="font-bold text-lg mb-4 border-b pb-2">
                Payment History
              </h2>
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border p-2 text-left">Date</th>
                    <th className="border p-2 text-left">Method</th>
                    <th className="border p-2 text-right">Amount</th>
                    <th className="border p-2 text-left">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {(billData as any).paymentSummary.paymentHistory.map(
                    (payment: any, index: number) => (
                      <tr key={index}>
                        <td className="border p-2">
                          {new Date(payment.date).toLocaleDateString()}
                        </td>
                        <td className="border p-2">{payment.method}</td>
                        <td className="border p-2 text-right">
                          Rs. {payment.amount.toFixed(2)}
                        </td>
                        <td className="border p-2">{payment.notes || "-"}</td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>

              {(billData as any).billType === "updated" && (
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded">
                  <p className="text-sm text-blue-800">
                    <strong>Note:</strong> This is an updated bill generated
                    after payment(s). Original Bill ID:{" "}
                    {(billData as any).originalBillId}
                  </p>
                  <p className="text-sm text-blue-600 mt-1">
                    Generated on:{" "}
                    {new Date((billData as any).generatedAt).toLocaleString()}
                  </p>
                </div>
              )}
            </div>
          )}

        <div className="mt-16 grid grid-cols-2 gap-8">
          <div className="text-center">
            <div className="border-t border-gray-400 pt-2">
              <p className="font-semibold">Customer Signature</p>
            </div>
          </div>
          <div className="text-center">
            <div className="border-t border-gray-400 pt-2">
              <p className="font-semibold">Authorized Signature</p>
            </div>
          </div>
        </div>

        <div className="mt-16 text-center text-sm text-gray-500">
          <p>Thank you for your business!</p>
          <p>Contact: 0111-234-5678 | Email: support@sasbilling.com</p>
        </div>
      </div>
    </div>
  );
};

export default ReceiptGenerator;
