"use client";

import { useEffect, useRef, useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { VehicleNo } from "@/components/jobform/VehicleNo";
import SubTasks from "@/components/jobform/AddSubTasks";
import { SubTask } from "@/app/types";

export default function NewQuotationPage() {
  // Step 1: reuse job fields
  const [vehicleNo, setVehicleNo] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [isCompanyVehicle, setIsCompanyVehicle] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [companies, setCompanies] = useState<{ _id: string; name: string }[]>(
    []
  );
  const subTasksRef = useRef<SubTask[]>([]);

  // Step 2: quotation amounts
  const [quotedAmount, setQuotedAmount] = useState<string>("");
  const [additionalCharges, setAdditionalCharges] = useState<string>("0");
  const [notes, setNotes] = useState("");
  const [step, setStep] = useState<1 | 2>(1);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadCompanies = async () => {
      try {
        const res = await fetch("/api/companies");
        if (res.ok) setCompanies(await res.json());
      } catch {}
    };
    loadCompanies();
  }, []);

  const totalAmount = (() => {
    const q = parseFloat(quotedAmount || "0") || 0;
    const a = parseFloat(additionalCharges || "0") || 0;
    return (q + a).toFixed(2);
  })();

  const handleCreate = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const res = await fetch("/api/quotations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicleNo,
          customerName,
          customerPhone,
          isCompanyVehicle,
          companyName: isCompanyVehicle ? companyName : "",
          subTasks: subTasksRef.current,
          notes,
          quotedAmount: parseFloat(quotedAmount || "0") || 0,
          additionalCharges: parseFloat(additionalCharges || "0") || 0,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        // Navigate back to quotations list (or implement PDF view after create)
        window.location.href = "/dashboard/quotations";
      } else {
        alert(data?.error || "Failed to create quotation");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b sticky top-0 bg-white z-50">
          <div className="flex items-center gap-2 px-3 flex-1">
            <SidebarTrigger />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <h1 className="text-xl font-bold mr-4">Create Quotation</h1>
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
                  <BreadcrumbPage>New Quotation</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div className="container mx-auto py-10 px-5">
          <Card>
            <CardHeader>
              <CardTitle>Step {step} of 2</CardTitle>
            </CardHeader>
            <CardContent>
              {step === 1 ? (
                <div className="grid grid-cols-1 ipad:grid-cols-2 gap-4 ipad:gap-6">
                  {/* Left column: Vehicle & Customer details */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <VehicleNo value={vehicleNo} onChange={setVehicleNo} />
                    </div>
                    <div className="space-y-2">
                      <Label>Customer Name</Label>
                      <Input
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Customer Phone</Label>
                      <Input
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="isCompanyVehicle"
                          checked={isCompanyVehicle}
                          onCheckedChange={(checked) => {
                            const v = Boolean(checked);
                            setIsCompanyVehicle(v);
                            if (!v) setCompanyName("");
                          }}
                        />
                        <Label htmlFor="isCompanyVehicle">
                          Company Vehicle
                        </Label>
                      </div>
                      {isCompanyVehicle && (
                        <div className="space-y-2">
                          <Label>Company</Label>
                          <Select
                            value={companyName}
                            onValueChange={setCompanyName}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select company" />
                            </SelectTrigger>
                            <SelectContent>
                              {companies.length > 0 ? (
                                companies.map((c) => (
                                  <SelectItem key={c._id} value={c.name}>
                                    {c.name}
                                  </SelectItem>
                                ))
                              ) : (
                                <SelectItem value="SAS Enterprises">
                                  SAS Enterprises
                                </SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right column: Subtasks */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Services/Parts (Optional)</Label>
                      <div className="max-h-64 overflow-y-auto">
                        <SubTasks
                          setSubTasks={(s) => (subTasksRef.current = s)}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Actions row */}
                  <div className="col-span-1 ipad:col-span-2 flex justify-end">
                    <Button
                      onClick={() => setStep(2)}
                      disabled={!vehicleNo.trim()}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 ipad:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Quoted Amount (Rs.)</Label>
                    <Input
                      inputMode="decimal"
                      value={quotedAmount}
                      onChange={(e) => setQuotedAmount(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Additional Charges (Rs.)</Label>
                    <Input
                      inputMode="decimal"
                      value={additionalCharges}
                      onChange={(e) => setAdditionalCharges(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2 ipad:col-span-2">
                    <Label>Notes</Label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full min-h-[100px] rounded border px-3 py-2"
                      placeholder="Any notes for this quotation"
                    />
                  </div>
                  <div className="ipad:col-span-2 bg-gray-50 p-3 rounded border">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Total</span>
                      <span className="font-semibold">Rs. {totalAmount}</span>
                    </div>
                  </div>
                  <div className="col-span-1 ipad:col-span-2 flex justify-between">
                    <Button variant="outline" onClick={() => setStep(1)}>
                      Back
                    </Button>
                    <Button
                      onClick={handleCreate}
                      disabled={saving || !vehicleNo.trim()}
                    >
                      {saving ? "Creating..." : "Create Quotation"}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
