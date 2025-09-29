import React, { useEffect, useState } from "react";
import { format } from "date-fns";
import { Bill, Task } from "@/app/types";

interface PrintableReceiptProps {
  billData: Omit<Bill, "createdAt"> & { createdAt?: Date };
  task: Task | null;
}

// A5 bill layout with optional second page.
// Page 1: Header, Customer/Vehicle, Services, Total.
// Page 2 (only if needed or when content flows): Payment details, Remarks, Signatures.
const PrintableReceipt: React.FC<PrintableReceiptProps> = ({
  billData,
  task,
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!billData) {
      setError("Bill data is not available");
      return;
    }
    setIsLoaded(true);
  }, [billData]);

  // Business entity and logo selection
  const entityName = (() => {
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
  const logoSrc = entityName.includes("Air")
    ? "/sas-airconditioning.png"
    : "/sas-enterprices.png";

  // Single page layout - no pagination
  const services = billData.services || [];

  if (error) {
    return (
      <div className="p-8 bg-white max-w-2xl mx-auto my-8 shadow-lg print:shadow-none">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">{entityName}</h1>
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
          <h1 className="text-3xl font-bold mb-2">{entityName}</h1>
          <p>Loading receipt data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-white max-w-2xl mx-auto shadow-lg print:shadow-none receipt-container">
      <style jsx global>{`
        .receipt-container {
          font-size: 11px;
          width: 148mm;
          max-height: 210mm;
          box-sizing: border-box;
          overflow: hidden;
        }
        .section-title {
          font-size: 12px;
          margin-bottom: 3px;
          padding-bottom: 2px;
        }
        .tight {
          margin: 2px 0;
          padding: 0;
          font-size: 10px;
        }
        .receipt-table {
          font-size: 10px;
        }
        .receipt-table th,
        .receipt-table td {
          padding: 2px 4px;
        }
        .address {
          line-height: 1.1;
          font-size: 10px;
        }
        .small-text {
          font-size: 9px;
        }
        .signatures {
          margin-top: 6px;
        }
        @media print {
          @page {
            size: A5;
            margin: 5mm;
          }
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .receipt-container {
            font-size: 9px;
            page-break-inside: avoid;
          }
          .section-title {
            font-size: 10px;
            margin-bottom: 2px;
            padding-bottom: 1px;
          }
          .receipt-table {
            font-size: 8px;
          }
          .receipt-table th,
          .receipt-table td {
            padding: 1px 2px;
            line-height: 1.2;
          }
          .tight {
            font-size: 8px;
            margin: 1px 0;
          }
          .address {
            font-size: 8px;
            line-height: 1.1;
          }
          .no-break {
            break-inside: avoid;
            page-break-inside: avoid;
          }
        }
      `}</style>

      <div className="single-page no-break">
        {/* Header */}
        <div className="grid grid-cols-2 gap-2 items-start mb-3">
          <div className="flex items-start">
            <img src={logoSrc} alt={entityName} className="h-12 w-auto" />
          </div>
          <div className="text-right address">
            <div>No. 82/6 S.</div>
            <div>De S. Jayasinghe Mawatha,</div>
            <div>Kohuwala, Nugegoda</div>
            <div>Email: sasautoac@gmail.com</div>
            <div>Tel: 0111-234-5678</div>
            <div>Fax: 011-2769893</div>
            <div className="mt-1">
              Receipt Date: {format(billData.createdAt || new Date(), "dd/MM/yyyy")}
            </div>
            <div>Invoice #: INV-{billData.jobId.slice(-6)}</div>
          </div>
        </div>

        {/* Customer and Vehicle Details */}
        <div className="grid grid-cols-2 gap-4 mb-3">
          <div>
            <h2 className="font-bold border-b section-title">
              Customer Details
            </h2>
            <p className="tight">
              <span className="font-semibold">Name:</span> {billData.customerName}
            </p>
            <p className="tight">
              <span className="font-semibold">Type:</span> {billData.clientType}
            </p>
          </div>
          <div>
            <h2 className="font-bold border-b section-title">
              Vehicle Details
            </h2>
            <p className="tight">
              <span className="font-semibold">Vehicle Number:</span> {billData.vehicleNo}
            </p>
          </div>
        </div>

        {/* Services Performed table */}
        <h2 className="font-bold border-b section-title">
          Services Performed
        </h2>
        <table className="w-full border-collapse receipt-table mb-2">
          <thead>
            <tr className="bg-gray-100">
              <th className="border text-left">Description</th>
              <th className="border text-center w-20">Status</th>
            </tr>
          </thead>
          <tbody>
            {services.slice(0, 10).map((s, i) => (
              <tr key={i}>
                <td className="border align-top">{s.description}</td>
                <td className="border text-center text-green-700 small-text">
                  Completed
                </td>
              </tr>
            ))}
            {services.length > 10 && (
              <tr>
                <td className="border align-top small-text" colSpan={2}>
                  ... and {services.length - 10} more services
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Total amount */}
        <div className="border-t pt-2 flex items-center justify-between mb-3">
          <span className="font-semibold">TOTAL AMOUNT:</span>
          <span className="font-bold">
            Rs. {billData.finalAmount.toFixed(2)}
          </span>
        </div>

        {/* Payment Details Section */}
        <div className="no-break">
          <h2 className="font-bold border-b section-title">
            Payment Details
          </h2>
          <table className="w-full small-text">
            <tbody>
              <tr>
                <td className="p-1 font-semibold">Payment Type:</td>
                <td className="p-1 text-right">{billData.paymentType}</td>
              </tr>
              <tr>
                <td className="p-1 font-semibold">Service Total:</td>
                <td className="p-1 text-right">
                  Rs. {billData.totalAmount.toFixed(2)}
                </td>
              </tr>
              {billData.paymentType === "Credit" && billData.initialPayment && (
                <>
                  <tr>
                    <td className="p-1 font-semibold">Initial Payment:</td>
                    <td className="p-1 text-right">
                      Rs. {billData.initialPayment.toFixed(2)}
                    </td>
                  </tr>
                  <tr className="border-t border-gray-300">
                    <td className="p-1 font-bold text-red-600">REMAINING:</td>
                    <td className="p-1 text-right font-bold text-red-600">
                      Rs. {(billData.remainingBalance || billData.finalAmount - billData.initialPayment).toFixed(2)}
                    </td>
                  </tr>
                </>
              )}
            </tbody>
          </table>

          {billData.paymentType === "Credit" && billData.creditDetails && (
            <div className="mt-2 p-1 bg-blue-50 rounded small-text">
              <span className="font-semibold">Credit Terms:</span>
              {billData.creditDetails.dueDate && (
                <span> Due: {new Date(billData.creditDetails.dueDate).toLocaleDateString()}</span>
              )}
              {billData.creditDetails.creditTerms && (
                <span> | {billData.creditDetails.creditTerms}</span>
              )}
            </div>
          )}

          {billData.paymentType === "Cheque" && billData.chequeDetails && (
            <div className="mt-2 p-1 bg-green-50 rounded small-text">
              <span className="font-semibold">Cheque:</span>
              {billData.chequeDetails.chequeNumber && (
                <span> #{billData.chequeDetails.chequeNumber}</span>
              )}
              {billData.chequeDetails.chequeDate && (
                <span> | Date: {new Date(billData.chequeDetails.chequeDate).toLocaleDateString()}</span>
              )}
              {billData.chequeDetails.bankName && (
                <span> | Bank: {billData.chequeDetails.bankName}</span>
              )}
            </div>
          )}

          {billData.remarks && (
            <div className="mt-2">
              <h2 className="font-semibold small-text">Remarks</h2>
              <div className="p-1 bg-gray-100 rounded text-gray-800 small-text">
                {billData.remarks}
              </div>
            </div>
          )}

          <div className="signatures grid grid-cols-2 gap-4 mt-4">
            <div className="text-center">
              <div className="border-t border-gray-400 pt-1">
                <p className="small-text">Customer Signature</p>
              </div>
            </div>
            <div className="text-center">
              <div className="border-t border-gray-400 pt-1">
                <p className="small-text">Authorized Signature</p>
              </div>
            </div>
          </div>

          <div className="mt-3 text-center small-text text-gray-500">
            www.sasonline.lk
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrintableReceipt;
