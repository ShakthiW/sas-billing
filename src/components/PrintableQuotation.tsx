import React from "react";
import { Quotation } from "@/app/types";

interface PrintableQuotationProps {
  quotation: Quotation;
}

const PrintableQuotation: React.FC<PrintableQuotationProps> = ({
  quotation,
}) => {
  return (
    <div className="p-6 bg-white max-w-2xl mx-auto my-6 shadow-lg quotation-container">
      <style jsx global>{`
        .quotation-container {
          font-size: 12px;
        }
        .quotation-title {
          font-size: 18px;
          margin-bottom: 6px;
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
          .quotation-container {
            font-size: 10px;
          }
          .quotation-title {
            font-size: 14px;
            margin-bottom: 4px;
          }
        }
      `}</style>
      <div className="text-center mb-4">
        <h1 className="text-2xl font-extrabold tracking-wide quotation-title">
          SAS Enterprises
        </h1>
        <p className="font-semibold">QUOTATION</p>
        <p className="text-xs text-gray-500">
          Date:{" "}
          {new Date(quotation.createdAt || new Date()).toLocaleDateString()}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <h2 className="font-semibold border-b pb-1">Customer</h2>
          <p className="text-sm">
            {quotation.customerName || quotation.companyName || "-"}
          </p>
          <p className="text-sm">{quotation.customerPhone || "-"}</p>
          {quotation.isCompanyVehicle && quotation.companyName && (
            <p className="text-sm">Company: {quotation.companyName}</p>
          )}
        </div>
        <div>
          <h2 className="font-semibold border-b pb-1">Vehicle</h2>
          <p className="text-sm">{quotation.vehicleNo}</p>
        </div>
      </div>
      {quotation.subTasks && quotation.subTasks.length > 0 && (
        <div className="mb-4">
          <h2 className="font-semibold border-b pb-1">Services/Parts</h2>
          <ul className="list-disc pl-5 text-sm">
            {quotation.subTasks.map((s, idx) => (
              <li key={idx}>
                {s.taskType === "service"
                  ? s.serviceDescription
                    ? s.serviceDescription
                    : `Service: ${s.serviceType}`
                  : s.partsDescription
                  ? s.partsDescription
                  : `Parts: ${s.partsType}${
                      s.partsBrand ? ` (${s.partsBrand})` : ""
                    }`}
              </li>
            ))}
          </ul>
        </div>
      )}
      {quotation.notes && (
        <div className="mb-4">
          <h2 className="font-semibold border-b pb-1">Notes</h2>
          <p className="text-sm">{quotation.notes}</p>
        </div>
      )}
      <div className="border-t pt-3">
        <div className="flex items-center justify-between text-sm">
          <span>Quoted Amount</span>
          <span>Rs. {(quotation.quotedAmount || 0).toFixed(2)}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span>Additional Charges</span>
          <span>Rs. {(quotation.additionalCharges || 0).toFixed(2)}</span>
        </div>
        <div className="flex items-center justify-between font-semibold mt-2">
          <span>Total</span>
          <span>Rs. {(quotation.totalAmount || 0).toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
};

export default PrintableQuotation;
