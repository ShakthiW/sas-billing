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

  // Pagination for Services Performed table (A5-friendly)
  const SERVICES_PER_PAGE = 8; // visually matches provided mock (approx 7-8 rows)
  const services = billData.services || [];
  const pages: Array<typeof services> = [];
  for (let i = 0; i < services.length; i += SERVICES_PER_PAGE) {
    pages.push(services.slice(i, i + SERVICES_PER_PAGE));
  }
  if (pages.length === 0) pages.push([]); // ensure at least one page exists

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
    <div className="p-6 bg-white max-w-2xl mx-auto my-6 shadow-lg print:shadow-none receipt-container">
      <style jsx global>{`
        .receipt-container {
          font-size: 12px;
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
        .receipt-table th,
        .receipt-table td {
          padding: 6px;
        }
        .address {
          line-height: 1.2;
        }
        /* Markup for explicit page containers when capturing via html2canvas */
        .a5-page {
          width: 148mm;
          min-height: 210mm;
          background: #ffffff;
          padding: 6mm; /* inner padding for visual breathing room */
          box-sizing: border-box;
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
          .section-title {
            font-size: 11px;
            margin-bottom: 4px;
            padding-bottom: 4px;
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

      {pages.map((servicesForPage, pageIndex) => {
        const isFirst = pageIndex === 0;
        const isLast = pageIndex === pages.length - 1;
        const fillerRows = Math.max(
          0,
          SERVICES_PER_PAGE - servicesForPage.length
        );
        return (
          <div
            key={pageIndex}
            className={`a5-page ${isLast ? "" : "page-break"}`}
          >
            {/* Header */}
            <div className="grid grid-cols-2 gap-4 items-start mb-6">
              <div className="flex items-start">
                <img src={logoSrc} alt={entityName} className="h-14 w-auto" />
              </div>
              <div className="text-right text-xs address">
                <div>No. 82/6 S.</div>
                <div>De S. Jayasinghe Mawatha,</div>
                <div>Kohuwala, Nugegoda</div>
                <div>Email: sasautoac@gmail.com</div>
                <div>Tel: 0111-234-5678</div>
                <div>Fax: 011-2769893</div>
                <div className="mt-2">
                  Receipt Date:{" "}
                  {format(billData.createdAt || new Date(), "dd/MM/yyyy")}
                </div>
                <div>Invoice #: INV-{billData.jobId.slice(-6)}</div>
              </div>
            </div>

            {/* Top details only on first page */}
            {isFirst && (
              <div className="grid grid-cols-2 gap-6 mb-4">
                <div>
                  <h2 className="font-bold border-b pb-1 section-title">
                    Customer Details
                  </h2>
                  <p className="tight">
                    <span className="font-semibold">Name:</span>{" "}
                    {billData.customerName}
                  </p>
                  <p className="tight">
                    <span className="font-semibold">Type:</span>{" "}
                    {billData.clientType}
                  </p>
                </div>
                <div>
                  <h2 className="font-bold border-b pb-1 section-title">
                    Vehicle Details
                  </h2>
                  <p className="tight">
                    <span className="font-semibold">Vehicle Number:</span>{" "}
                    {billData.vehicleNo}
                  </p>
                </div>
              </div>
            )}

            {/* Services Performed table */}
            <h2 className="font-bold border-b pb-1 section-title">
              Services Performed
            </h2>
            <table className="w-full border-collapse receipt-table">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border p-2 text-left">Description</th>
                  <th className="border p-2 text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {servicesForPage.map((s, i) => (
                  <tr key={i}>
                    <td className="border p-2 align-top">{s.description}</td>
                    <td className="border p-2 text-center text-green-700">
                      Completed
                    </td>
                  </tr>
                ))}
                {Array.from({ length: fillerRows }).map((_, i) => (
                  <tr key={`filler-${i}`}>
                    <td className="border p-4">&nbsp;</td>
                    <td className="border p-4">&nbsp;</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Total amount at the end of the first page table */}
            {isFirst && (
              <div className="mt-6 border-t pt-3 flex items-center justify-between">
                <span className="font-semibold">TOTAL AMOUNT:</span>
                <span className="font-bold">
                  Rs. {billData.finalAmount.toFixed(2)}
                </span>
              </div>
            )}

            {/* Payment details, Remarks and Signatures on the last page */}
            {isLast && (
              <div className="mt-6 no-break">
                <h2 className="font-bold border-b pb-1 section-title">
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
                    <tr className="border-t border-gray-300">
                      <td className="p-2 font-bold">TOTAL AMOUNT:</td>
                      <td className="p-2 text-right font-bold">
                        Rs. {billData.finalAmount.toFixed(2)}
                      </td>
                    </tr>
                    {billData.paymentType === "Credit" &&
                      billData.initialPayment && (
                        <>
                          <tr>
                            <td className="p-2 font-semibold">
                              Initial Payment:
                            </td>
                            <td className="p-2 text-right">
                              Rs. {billData.initialPayment.toFixed(2)}
                            </td>
                          </tr>
                          {(billData as any).paymentSummary && (
                            <tr>
                              <td className="p-2 font-semibold text-green-600">
                                Total Payments Made:
                              </td>
                              <td className="p-2 text-right text-green-600">
                                Rs.{" "}
                                {(
                                  (billData as any).paymentSummary
                                    .totalPayments || 0
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

                {billData.paymentType === "Credit" &&
                  billData.creditDetails && (
                    <div className="mt-3 p-2 bg-blue-50 rounded">
                      <h3 className="font-semibold text-blue-800 mb-2">
                        Credit Terms
                      </h3>
                      {billData.creditDetails.dueDate && (
                        <p>
                          <span className="font-semibold">Due Date:</span>{" "}
                          {new Date(
                            billData.creditDetails.dueDate
                          ).toLocaleDateString()}
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

                {billData.paymentType === "Cheque" &&
                  billData.chequeDetails && (
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

                {billData.remarks && (
                  <div className="mt-4">
                    <h2 className="font-semibold mb-2">Remarks</h2>
                    <div className="p-3 bg-gray-200 rounded text-gray-800">
                      {billData.remarks}
                    </div>
                  </div>
                )}

                <div className="mt-12 grid grid-cols-2 gap-8">
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
                  www.sasonline.lk
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default PrintableReceipt;
