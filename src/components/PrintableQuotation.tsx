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
          width: 148mm;
          box-sizing: border-box;
        }
        .quotation-title {
          font-size: 18px;
          margin-bottom: 6px;
        }
        @media print {
          .quotation-container {
            font-size: 10px;
          }
          .quotation-title {
            font-size: 14px;
            margin-bottom: 4px;
          }
        }
      `}</style>
      {/* Header with logo and company details */}
      <div className="grid grid-cols-2 gap-4 items-start mb-6">
        <div className="flex items-start">
          <img
            src="/sas-enterprices.png"
            alt="SAS Enterprises"
            className="h-14 w-auto"
          />
        </div>
        <div className="text-right text-xs leading-5">
          <div>No. 82/6 S.</div>
          <div>De S. Jayasinghe Mawatha,</div>
          <div>Kohuwala, Nugegoda</div>
          <div>Email: sasautoac@gmail.com</div>
          <div>Tel: 0111-234-5678</div>
          <div>Fax: 011-2769893</div>
          <div className="mt-2">
            Receipt Date:{" "}
            {new Date(quotation.createdAt || new Date()).toLocaleDateString()}
          </div>
          <div>
            Invoice #: INV-
            {(quotation as any)._id?.toString?.().slice?.(-6) || "000000"}
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="grid grid-cols-2 gap-6 mb-4 text-sm">
        <div>
          <h3 className="font-semibold mb-2">Customer Details</h3>
          <div className="mb-1">
            Name: {quotation.customerName || quotation.companyName || "-"}
          </div>
          <div>Type: {quotation.isCompanyVehicle ? "Company" : "Customer"}</div>
        </div>
        <div>
          <h3 className="font-semibold mb-2">Vehicle Details</h3>
          <div>Vehicle Number: {quotation.vehicleNo}</div>
        </div>
      </div>

      <p className="text-sm mb-4">
        After a careful inspection of the above mentioned vehicle, we are
        pleased to submit the following quotation for your consideration and
        approval.
      </p>
      <div className="mb-6">
        <table
          className="w-full text-sm border-collapse"
          style={{ tableLayout: "fixed" }}
        >
          <thead>
            <tr>
              <th className="border p-2 text-left w-[70%]">Job Description</th>
              <th className="border p-2 text-center w-[30%]">Amount</th>
            </tr>
          </thead>
          <tbody>
            {(quotation.subTasks || []).map((s, idx) => (
              <tr key={idx}>
                <td className="border p-2 align-top">
                  {s.taskType === "service"
                    ? s.serviceDescription || `Service: ${s.serviceType}`
                    : s.partsDescription
                    ? `Parts: ${s.partsType}${s.partsBrand ? ` (${s.partsBrand})` : ""} - ${s.partsDescription}`
                    : `Parts: ${s.partsType}${s.partsBrand ? ` (${s.partsBrand})` : ""}`}
                </td>
                <td className="border p-2 text-center align-top">&nbsp;</td>
              </tr>
            ))}
            {/* no filler rows – keep output compact */}
          </tbody>
        </table>
      </div>
      {quotation.notes && (
        <div className="mb-4">
          <h2 className="font-semibold border-b pb-1">Notes</h2>
          <p className="text-sm">{quotation.notes}</p>
        </div>
      )}
      <div className="border-t pt-4">
        <div className="flex items-center justify-between">
          <span className="font-semibold">TOTAL AMOUNT:</span>
          <span className="font-bold">
            Rs. {(quotation.totalAmount || 0).toFixed(2)}
          </span>
        </div>
      </div>

      <div className="mt-4 text-sm">
        <p>
          We guarantee you an excellent job at the lowest possible cost. If you
          are satisfied with our quotation, please send us a{" "}
          <span className="font-semibold">
            PHOTOCOPY OF THIS QUOTATION GIVING YOUR APPROVAL
          </span>
          , along with the vehicle. Please note that payments should be made
          BEFORE DELIVERY.
        </p>
        <p className="mt-4">Assuring our best service,</p>
        {/* Extra space for handwritten signature */}
        <div className="h-16" />
        <div className="mt-2">
          ----------------------------------------------
        </div>
        <div className="text-center text-xs mt-6">www.sasonline.lk</div>
      </div>
    </div>
  );
};

export default PrintableQuotation;
