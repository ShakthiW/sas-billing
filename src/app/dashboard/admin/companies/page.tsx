"use client";

import { useEffect, useState } from "react";
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
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Company = { _id: string; name: string };

export default function ManageCompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [newCompany, setNewCompany] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadCompanies = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/companies");
      if (res.ok) {
        const data = await res.json();
        setCompanies(data);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCompanies();
  }, []);

  const addCompany = async () => {
    if (!newCompany.trim()) return;
    try {
      setSaving(true);
      const res = await fetch("/api/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCompany.trim() }),
      });
      if (res.ok) {
        setNewCompany("");
        await loadCompanies();
      } else {
        const err = await res.json();
        alert(err?.error || "Failed to add company");
      }
    } finally {
      setSaving(false);
    }
  };

  const deleteCompany = async (id: string) => {
    if (!confirm("Delete this company?")) return;
    const res = await fetch(`/api/companies?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      await loadCompanies();
    } else {
      const err = await res.json();
      alert(err?.error || "Failed to delete company");
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
            <h1 className="text-xl font-bold mr-4">Manage Companies</h1>
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
                  <BreadcrumbPage>Companies</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div className="container mx-auto py-10 px-5">
          <Card>
            <CardHeader>
              <CardTitle>Companies</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="flex gap-2 items-end">
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="companyName">Add Company</Label>
                    <Input
                      id="companyName"
                      value={newCompany}
                      onChange={(e) => setNewCompany(e.target.value)}
                      placeholder="Enter company name"
                    />
                  </div>
                  <Button
                    onClick={addCompany}
                    disabled={!newCompany.trim() || saving}
                  >
                    {saving ? "Adding..." : "Add"}
                  </Button>
                </div>

                <div className="border-t pt-4">
                  {loading ? (
                    <div>Loading...</div>
                  ) : companies.length === 0 ? (
                    <div className="text-gray-500">No companies added yet.</div>
                  ) : (
                    <div className="space-y-2">
                      {companies.map((c) => (
                        <div
                          key={c._id}
                          className="flex items-center justify-between border rounded px-3 py-2"
                        >
                          <span className="font-medium">{c.name}</span>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => deleteCompany(c._id)}
                          >
                            Delete
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
