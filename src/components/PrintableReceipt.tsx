import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { Bill } from "@/app/types";
import { Task } from "@/app/types";

interface PrintableReceiptProps {
  billData: Omit<Bill, "createdAt"> & { createdAt?: Date };
  task: Task | null;
}

// This component will only be used in a printer-friendly context
const PrintableReceipt: React.FC<PrintableReceiptProps> = ({
  billData,
  task,
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Validate that we have the necessary data
    if (!billData) {
      setError("Bill data is not available");
      return;
    }

    // Mark as loaded
    setIsLoaded(true);
  }, [billData]);

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

  if (error) {
    return (
      <div className="p-8 bg-white max-w-2xl mx-auto my-8 shadow-lg print:shadow-none">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">{receiptTitle}</h1>
          <p className="text-lg font-semibold text-red-600 mb-4">
            Receipt Error
          </p>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="p-8 bg-white max-w-2xl mx-auto my-8 shadow-lg print:shadow-none">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">{receiptTitle}</h1>
          <p>Loading receipt data...</p>
        </div>
      </div>
    );
  }

  // Simple paginator for services to improve A5 print layout
  const paginate = <T,>(items: T[], perPage: number): T[][] => {
    const pages: T[][] = [];
    for (let i = 0; i < items.length; i += perPage)
      pages.push(items.slice(i, i + perPage));
    return pages;
  };

  // With tighter print layout we can fit roughly ~16-20 rows on A5.
  // Pick a conservative default and allow it to be adjusted later if needed.
  const SERVICES_PER_PAGE = 18;
  const servicePages = paginate(billData.services || [], SERVICES_PER_PAGE);

  return (
    <div className="p-6 bg-white max-w-2xl mx-auto my-6 shadow-lg print:shadow-none receipt-container">
      <style jsx global>{`
        /* Compact defaults for on-screen preview */
        .receipt-container {
          font-size: 12px;
        }
        .receipt-title {
          font-size: 18px;
          margin-bottom: 6px;
        }
        .receipt-subtitle {
          font-size: 13px;
        }
        .section-title {
          font-size: 13px;
          margin-bottom: 6px;
          padding-bottom: 6px;
        }
        .tight {
          margin: 4px 0;
          padding: 0;
        }
        .tight-grid {
          gap: 8px;
          margin-bottom: 8px;
        }
        .receipt-table th,
        .receipt-table td {
          padding: 6px;
        }

        @media print {
          @page {
            size: A5;
            margin: 8mm;
          }
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .receipt-container {
            font-size: 10px;
          }
          .receipt-title {
            font-size: 14px;
            margin-bottom: 4px;
          }
          .receipt-subtitle {
            font-size: 11px;
          }
          .section-title {
            font-size: 11px;
            margin-bottom: 4px;
            padding-bottom: 4px;
          }
          .tight {
            margin: 4px 0;
            padding: 0;
          }
          .tight-grid {
            gap: 8px;
            margin-bottom: 8px;
          }
          .receipt-table {
            font-size: 10px;
          }
          .receipt-table th,
          .receipt-table td {
            padding: 4px;
          }
          .page-break {
            page-break-after: always;
          }
          .no-break {
            break-inside: avoid;
            page-break-inside: avoid;
          }
        }
      `}</style>

      <div className="text-center mb-4">
        <h1 className="receipt-title font-bold">{receiptTitle}</h1>
        <p className="receipt-subtitle font-semibold">OFFICIAL RECEIPT</p>
        <p className="text-xs text-gray-500">
          Receipt Date: {format(billData.createdAt || new Date(), "dd/MM/yyyy")}
        </p>
        <p className="text-xs text-gray-500">
          Invoice #: INV-{billData.jobId.slice(-6)}
        </p>
      </div>

      <div className="grid grid-cols-2 tight-grid mb-4">
        <div>
          <h2 className="section-title font-bold border-b pb-1">
            Customer Details
          </h2>
          <p className="tight">
            <span className="font-semibold">Name:</span> {billData.customerName}
          </p>
          <p className="tight">
            <span className="font-semibold">Type:</span> {billData.clientType}
          </p>
          {billData.driverName && (
            <p className="tight">
              <span className="font-semibold">Driver:</span>{" "}
              {billData.driverName}
            </p>
          )}
        </div>
        <div>
          <h2 className="section-title font-bold border-b pb-1">
            Vehicle Details
          </h2>
          <p className="tight">
            <span className="font-semibold">Vehicle Number:</span>{" "}
            {billData.vehicleNo}
          </p>
          {billData.vehicleType && (
            <p className="tight">
              <span className="font-semibold">Vehicle Type:</span>{" "}
              {billData.vehicleType}
            </p>
          )}
        </div>
      </div>

      {/* Services section with pagination for clean A5 printing */}
      {servicePages.map((page, pageIndex) => (
        <div
          key={pageIndex}
          className={`mb-4 ${
            pageIndex < servicePages.length - 1 ? "page-break" : ""
          }`}
        >
          <h2 className="section-title font-bold border-b pb-1">
            Services Performed{" "}
            {servicePages.length > 1
              ? `(Page ${pageIndex + 1}/${servicePages.length})`
              : ""}
          </h2>
          <table className="w-full border-collapse receipt-table">
            <thead>
              <tr className="bg-gray-100">
                <th className="border p-2 text-left">No</th>
                <th className="border p-2 text-left">Description</th>
                <th className="border p-2 text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {page.map((service, idx) => {
                const index = pageIndex * SERVICES_PER_PAGE + idx;
                return (
                  <tr key={index}>
                    <td className="border p-2">{index + 1}</td>
                    <td className="border p-2">{service.description}</td>
                    <td className="border p-2 text-right text-green-600">
                      Completed
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ))}

      <div className="mb-6 no-break">
        <h2 className="section-title font-bold border-b pb-1">
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
            {/* Commission/Additional hidden in print view */}
            <tr className="border-t border-gray-300">
              <td className="p-2 font-bold">TOTAL AMOUNT:</td>
              <td className="p-2 text-right font-bold">
                Rs. {billData.finalAmount.toFixed(2)}
              </td>
            </tr>
            {billData.paymentType === "Credit" && billData.initialPayment && (
              <>
                <tr>
                  <td className="p-2 font-semibold">Initial Payment:</td>
                  <td className="p-2 text-right">
                    Rs. {billData.initialPayment.toFixed(2)}
                  </td>
                </tr>

                {/* Show payment summary if this is an updated bill */}
                {(billData as any).paymentSummary && (
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
                )}

                <tr className="border-t border-gray-300">
                  <td className="p-2 font-bold text-red-600">
                    REMAINING BALANCE:
                  </td>
                  <td className="p-2 text-right font-bold text-red-600">
                    Rs.{" "}
                    {(
                      billData.remainingBalance ||
                      billData.finalAmount - billData.initialPayment
                    ).toFixed(2)}
                  </td>
                </tr>
              </>
            )}
          </tbody>
        </table>

        {/* Additional Payment Information */}
        {billData.paymentType === "Credit" && billData.creditDetails && (
          <div className="mt-3 p-2 bg-blue-50 rounded">
            <h3 className="font-semibold text-blue-800 mb-2">Credit Terms</h3>
            {billData.creditDetails.dueDate && (
              <p>
                <span className="font-semibold">Due Date:</span>{" "}
                {new Date(billData.creditDetails.dueDate).toLocaleDateString()}
              </p>
            )}
            {billData.creditDetails.creditTerms && (
              <p>
                <span className="font-semibold">Terms:</span>{" "}
                {billData.creditDetails.creditTerms}
              </p>
            )}
          </div>
        )}

        {billData.paymentType === "Cheque" && billData.chequeDetails && (
          <div className="mt-3 p-2 bg-green-50 rounded">
            <h3 className="font-semibold text-green-800 mb-2">
              Cheque Details
            </h3>
            {billData.chequeDetails.chequeNumber && (
              <p>
                <span className="font-semibold">Cheque Number:</span>{" "}
                {billData.chequeDetails.chequeNumber}
              </p>
            )}
            {billData.chequeDetails.chequeDate && (
              <p>
                <span className="font-semibold">Cheque Date:</span>{" "}
                {new Date(
                  billData.chequeDetails.chequeDate
                ).toLocaleDateString()}
              </p>
            )}
            {billData.chequeDetails.bankName && (
              <p>
                <span className="font-semibold">Bank:</span>{" "}
                {billData.chequeDetails.bankName}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Payment History Section for Updated Bills */}
      {(billData as any).paymentSummary?.paymentHistory &&
        (billData as any).paymentSummary.paymentHistory.length > 0 && (
          <div className="mb-6 border-t pt-4 no-break">
            <h2 className="section-title font-bold mb-2 border-b pb-1">
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
              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> This is an updated bill generated after
                  payment(s). Original Bill ID:{" "}
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

      {/* Remarks Section */}
      {billData.remarks && (
        <div className="mb-4 no-break">
          <h2 className="section-title font-bold mb-2 border-b pb-1">
            Remarks
          </h2>
          <p className="p-2 bg-gray-50 rounded border border-gray-200 italic text-red-600 font-medium">
            {billData.remarks}
          </p>
        </div>
      )}

      <div className="mt-12 grid grid-cols-2 gap-8 no-break">
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

      <div className="mt-10 text-center text-xs text-gray-500">
        <p>Thank you for your business!</p>
        <p>Contact: 0111-234-5678 | Email: support@sasbilling.com</p>
      </div>
    </div>
  );
};

export default PrintableReceipt;
