import React, { useCallback, useEffect, useRef, useState } from "react";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import PrintableQuotation from "./PrintableQuotation";
import { Quotation } from "@/app/types";

interface QuotationGeneratorProps {
  quotation: Quotation;
  onGenerated: (blob: Blob) => void;
}

const QuotationGenerator: React.FC<QuotationGeneratorProps> = ({
  quotation,
  onGenerated,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const hasGeneratedRef = useRef(false);

  const generate = useCallback(async () => {
    if (!ref.current || isGenerating || hasGeneratedRef.current) return;
    try {
      setIsGenerating(true);
      await new Promise((r) => setTimeout(r, 300));
      const canvas = await html2canvas(ref.current, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
        logging: false,
      });
      const cW = canvas.width || 1;
      const cH = canvas.height || 1;
      const img = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a5",
      });
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = pdf.internal.pageSize.getHeight();
      const ratio = Math.min(pdfW / cW, pdfH / cH);
      const x = Math.max(0, (pdfW - cW * ratio) / 2);
      const y = 10;
      pdf.addImage(img, "PNG", x, y, cW * ratio, cH * ratio);
      onGenerated(pdf.output("blob"));
      hasGeneratedRef.current = true;
    } finally {
      setIsGenerating(false);
    }
  }, [isGenerating, onGenerated]);

  useEffect(() => {
    generate();
  }, [generate]);

  return (
    <div
      style={{
        position: "absolute",
        left: -10000,
        top: 0,
        width: "148mm",
        minHeight: "210mm",
        pointerEvents: "none",
        background: "#ffffff",
      }}
    >
      <div ref={ref} className="p-6 bg-white w-[148mm] min-h-[210mm]">
        <PrintableQuotation quotation={quotation} />
      </div>
    </div>
  );
};

export default QuotationGenerator;
