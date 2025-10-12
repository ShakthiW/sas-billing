"use client";
import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { notFound } from "next/navigation";
import PrintableReceipt from "@/components/PrintableReceipt";
import { getBillById, getAllJobs } from "@/app/api/actions";
import { Bill, Task } from "@/app/types";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer, FileDown } from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { useReactToPrint } from "react-to-print";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import Link from "next/link";

export default function ReceiptPage() {
  const params = useParams();
  const router = useRouter();
  const billId = params.billId as string;
  const [bill, setBill] = useState<Bill | null>(null);
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef,
    documentTitle: `Receipt-${bill?.jobId || billId}`,
    pageStyle: `
      @media print {
        html, body {
          height: auto !important;
          overflow: visible !important;
          margin: 0;
          padding: 0;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
      }
    `,
  });

  const handleDownloadPDF = async () => {
    const node = document.getElementById("print-area");
    if (!node) return;

    // Render the receipt area to canvas at high resolution for crisp text
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
    const marginMM = 4; // small outer margin in PDF

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
      // Slice the tall canvas into A5-height slices without scaling distortion
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

    pdf.save(`receipt-${bill?.jobId || billId}.pdf`);
  };

  const handleGoBack = () => {
    router.push("/dashboard");
  };

  useEffect(() => {
    const fetchBillAndTask = async () => {
      try {
        console.log("Fetching bill for ID:", billId);

        // Get bill data
        const fetchedBill: Bill | null = await getBillById(billId);

        console.log("Fetched bill data:", fetchedBill);

        if (fetchedBill) {
          // Ensure the bill object conforms to the Bill interface
          setBill(fetchedBill as Bill);

          // Also fetch the associated task data
          try {
            const jobs = await getAllJobs();
            const relatedJob = jobs.delivered.find(
              (job) => job.id === fetchedBill.jobId
            );
            console.log("Found related job:", relatedJob);
            if (relatedJob) {
              setTask({ ...relatedJob, column: "delivered" });
            }
          } catch (jobError) {
            console.error("Failed to fetch associated task:", jobError);
            // Continue with just bill data if task fetch fails
          }
        } else {
          console.error("No bill found for ID:", billId);
          setError("Bill not found");
        }
      } catch (err) {
        console.error("Failed to fetch bill:", err);
        setError("Failed to fetch bill data");
      } finally {
        setLoading(false);
      }
    };

    fetchBillAndTask();
  }, [billId]);

  if (loading) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-lg">Loading receipt...</div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  if (error || !bill) {
    return notFound();
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b sticky top-0 bg-white z-50 print:hidden">
          <div className="flex items-center gap-2 px-3 flex-1">
            <SidebarTrigger />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <h1 className="text-xl font-bold mr-4">Receipt</h1>
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link href="/dashboard">Dashboard</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link href="/dashboard/delivered-jobs">Delivered Jobs</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>Receipt</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <div className="flex items-center gap-2 px-3">
            <Button variant="outline" onClick={handleGoBack} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
            <Button onClick={handlePrint} className="gap-2">
              <Printer className="h-4 w-4" />
              Print Receipt
            </Button>
            <Button
              onClick={handleDownloadPDF}
              className="gap-2"
              variant="secondary"
            >
              <FileDown className="h-4 w-4" />
              Download PDF
            </Button>
          </div>
        </header>

        <div className="py-8">
          <div ref={contentRef} id="print-area" className="w-[148mm] min-h-[210mm] mx-auto bg-white">
            <PrintableReceipt billData={bill} task={task} />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
