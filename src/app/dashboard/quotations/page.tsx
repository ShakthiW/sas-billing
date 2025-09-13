"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Quotation } from "@/app/types";

export default function QuotationsPage() {
  const [quotes, setQuotes] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/quotations");
        if (res.ok) {
          const data = await res.json();
          setQuotes(data);
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const previewQuotation = (q: Quotation) => {
    window.open(`/dashboard/quotations/${encodeURIComponent(q._id || "")}`);
  };

  const downloadPdf = (q: Quotation) => {
    window.open(
      `/dashboard/quotations/${encodeURIComponent(q._id || "")}?download=1`
    );
  };

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b sticky top-0 bg-white z-50">
          <div className="flex items-center gap-2 px-3 flex-1">
            <SidebarTrigger />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <h1 className="text-xl font-bold mr-4">Quotations</h1>
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
                  <BreadcrumbPage>Quotations</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <div className="ml-auto">
              <Link href="/dashboard/quotations/new">
                <Button>Create Quotation</Button>
              </Link>
            </div>
          </div>
        </header>

        <div className="container mx-auto py-10 px-5">
          <Card>
            <CardHeader>
              <CardTitle>Given Quotations</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div>Loading...</div>
              ) : quotes.length === 0 ? (
                <div className="text-gray-500">No quotations yet.</div>
              ) : (
                <div className="space-y-2">
                  {quotes.map((q) => (
                    <div
                      key={q._id}
                      className="flex items-center justify-between border rounded px-3 py-2"
                    >
                      <div className="flex flex-col">
                        <span className="font-medium">{q.vehicleNo}</span>
                        <span className="text-sm text-gray-600">
                          {q.customerName || q.companyName || "Unknown"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm">
                          Rs. {q.totalAmount?.toLocaleString()}
                        </span>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => previewQuotation(q)}
                        >
                          Preview
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => downloadPdf(q)}
                        >
                          Download PDF
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
