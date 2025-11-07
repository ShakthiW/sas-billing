"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import QuotationGenerator from "@/components/QuotationGenerator";
import PrintableQuotation from "@/components/PrintableQuotation";
import { Quotation } from "@/app/types";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

export default function QuotationDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [loading, setLoading] = useState(true);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const handlePrint = async () => {
    const node = document.getElementById("print-area");
    if (!node) return;

    try {
      // Render the quotation area to canvas at high resolution
      const canvas = await html2canvas(node, {
        scale: 3,
        useCORS: true,
        backgroundColor: "#ffffff",
        scrollY: -window.scrollY,
      });

      // Create A5 PDF (portrait)
      const pdf = new jsPDF({
        unit: "mm",
        format: "a5",
        orientation: "portrait",
      });
      const pageWidthMM = pdf.internal.pageSize.getWidth();
      const pageHeightMM = pdf.internal.pageSize.getHeight();
      const marginMM = 4;

      // Map full canvas width to A5 width, maintain aspect ratio
      const imgWidthMM = pageWidthMM - marginMM * 2;
      const imgHeightMM = (canvas.height * imgWidthMM) / canvas.width;

      if (imgHeightMM <= pageHeightMM) {
        const imgData = canvas.toDataURL("image/png");
        pdf.addImage(
          imgData,
          "PNG",
          marginMM,
          marginMM,
          imgWidthMM,
          imgHeightMM,
          undefined,
          "FAST"
        );
      } else {
        // Slice the tall canvas into A5-height slices
        const pxPerMM = canvas.width / imgWidthMM;
        const pageHeightPx = Math.floor(pageHeightMM * pxPerMM);
        let renderedHeight = 0;
        while (renderedHeight < canvas.height) {
          const sliceHeight = Math.min(
            pageHeightPx,
            canvas.height - renderedHeight
          );
          const pageCanvas = document.createElement("canvas");
          pageCanvas.width = canvas.width;
          pageCanvas.height = sliceHeight;
          const ctx = pageCanvas.getContext("2d");
          if (!ctx) break;
          ctx.drawImage(
            canvas,
            0,
            renderedHeight,
            canvas.width,
            sliceHeight,
            0,
            0,
            canvas.width,
            sliceHeight
          );
          const pageImg = pageCanvas.toDataURL("image/png");
          const sliceHeightMM = sliceHeight / pxPerMM;
          pdf.addImage(
            pageImg,
            "PNG",
            marginMM,
            marginMM,
            imgWidthMM,
            sliceHeightMM,
            undefined,
            "FAST"
          );
          renderedHeight += sliceHeight;
          if (renderedHeight < canvas.height) pdf.addPage("a5", "portrait");
        }
      }

      // Open print dialog for the PDF
      pdf.autoPrint();
      window.open(pdf.output('bloburl'), '_blank');
    } catch (error) {
      console.error("Failed to print quotation:", error);
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/quotations/${id}`);
        if (res.ok) {
          const data = await res.json();

          // Enrich subTasks with descriptions similar to billing flow
          if (
            data?.subTasks &&
            Array.isArray(data.subTasks) &&
            data.subTasks.length > 0
          ) {
            try {
              const enrichedSubtasks = await Promise.all(
                data.subTasks.map(async (subtask: any) => {
                  try {
                    if (subtask.taskType === "service" && subtask.serviceType) {
                      const serviceResponse = await fetch(
                        `/api/services?search=${encodeURIComponent(
                          subtask.serviceType
                        )}`
                      );
                      if (serviceResponse.ok) {
                        const services = await serviceResponse.json();
                        const matchingService = services.find(
                          (s: any) =>
                            s.name?.toLowerCase() ===
                            subtask.serviceType?.toLowerCase()
                        );
                        if (matchingService?.description) {
                          return {
                            ...subtask,
                            serviceDescription: matchingService.description,
                          };
                        }
                      }
                    } else if (
                      subtask.taskType === "parts" &&
                      subtask.partsType
                    ) {
                      const partResponse = await fetch(
                        `/api/parts?search=${encodeURIComponent(
                          subtask.partsType
                        )}`
                      );
                      if (partResponse.ok) {
                        const parts = await partResponse.json();

                        // Normalize brand values for comparison
                        const subtaskBrand = (subtask.partsBrand || "").toLowerCase();
                        const isNoBrand = !subtaskBrand || subtaskBrand === "not selected";

                        const matchingPart = parts.find(
                          (p: any) => {
                            if (p.name?.toLowerCase() !== subtask.partsType?.toLowerCase()) {
                              return false;
                            }

                            const partBrand = (p.brand || "").toLowerCase();
                            const partHasNoBrand = !partBrand;

                            // Match if both have no brand, or brands match exactly
                            if (isNoBrand && partHasNoBrand) {
                              return true;
                            }

                            return partBrand === subtaskBrand;
                          }
                        );

                        if (matchingPart?.description) {
                          return {
                            ...subtask,
                            partsDescription: matchingPart.description,
                          };
                        }
                      }
                    }
                  } catch (e) {
                    console.warn("Failed to enrich subtask", e);
                  }
                  return subtask;
                })
              );
              setQuotation({ ...data, subTasks: enrichedSubtasks });
              return;
            } catch (e) {
              console.warn("Failed to enrich subtasks for quotation", e);
            }
          }

          setQuotation(data);
        }
      } finally {
        setLoading(false);
      }
    };
    if (id) load();
  }, [id]);

  const download = () => {
    if (!pdfBlob) return;
    const url = URL.createObjectURL(pdfBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Quotation-${id}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b sticky top-0 bg-white z-50">
          <div className="flex items-center gap-2 px-3 flex-1">
            <SidebarTrigger />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <h1 className="text-xl font-bold mr-4">Quotation</h1>
          </div>
        </header>

        <div className="container mx-auto py-10 px-5">
          {loading ? (
            <div>Loading...</div>
          ) : !quotation ? (
            <div className="text-gray-500">Quotation not found.</div>
          ) : (
            <div className="space-y-6">
              <div className="flex justify-end gap-2">
                <Button
                  variant="secondary"
                  onClick={handlePrint}
                  disabled={!quotation}
                >
                  Preview
                </Button>
                <Button onClick={download} disabled={!pdfBlob}>
                  Download PDF
                </Button>
              </div>
              <div ref={contentRef} id="print-area" className="w-[148mm] min-h-[210mm] mx-auto bg-white">
                <PrintableQuotation quotation={quotation} />
              </div>
              <QuotationGenerator
                quotation={quotation}
                onGenerated={setPdfBlob}
              />
            </div>
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
