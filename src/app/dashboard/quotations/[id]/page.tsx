"use client";

import { useEffect, useState } from "react";
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

export default function QuotationDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [loading, setLoading] = useState(true);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);

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
                        )}&brand=${encodeURIComponent(
                          subtask.partsBrand || ""
                        )}`
                      );
                      if (partResponse.ok) {
                        const parts = await partResponse.json();
                        const matchingPart = parts.find(
                          (p: any) =>
                            p.name?.toLowerCase() ===
                              subtask.partsType?.toLowerCase() &&
                            (!subtask.partsBrand ||
                              p.brand?.toLowerCase() ===
                                subtask.partsBrand?.toLowerCase())
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
                  onClick={() => window.print()}
                  disabled={!quotation}
                >
                  Preview
                </Button>
                <Button onClick={download} disabled={!pdfBlob}>
                  Download PDF
                </Button>
              </div>
              <div>
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
