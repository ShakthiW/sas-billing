"use client";

import { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getAllJobs } from "@/app/api/actions";
import { Task } from "@/app/types";
import Image from "@/components/RemoteImage";
import { Skeleton } from "@/components/ui/skeleton";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import LazyPrintableCreditBill from "@/components/LazyPrintableCreditBill";
import { toast } from "react-hot-toast";
import { deleteJob } from "@/app/api/actions";
import { useAdminPasswordPrompt } from "@/components/admin-password-prompt";
import { ADMIN_PASSWORD_ACTIONS } from "@/lib/services/admin-password";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Create a client-side only wrapper component
const ClientOnly = ({ children }: { children: React.ReactNode }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return <>{children}</>;
};

const DeliveredJobsList = () => {
  const [allJobs, setAllJobs] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"updated" | "created">("updated");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [jobPendingDelete, setJobPendingDelete] = useState<Task | null>(null);

  useEffect(() => {
    const fetchDeliveredJobs = async () => {
      try {
        const jobs = await getAllJobs();
        // Make sure we're only getting delivered jobs
        const deliveredJobs = jobs.delivered.map((job) => ({
          ...job,
          column: "delivered",
        })) as Task[];
        console.log("Delivered jobs:", deliveredJobs); // Add this to debug
        setAllJobs(deliveredJobs);
      } catch (error) {
        console.error("Failed to fetch jobs:", error);
        toast.error("Failed to fetch jobs");
      } finally {
        setLoading(false);
      }
    };

    fetchDeliveredJobs();
  }, []);

  const { promptForPassword, AdminPasswordPromptComponent } =
    useAdminPasswordPrompt();

  const handleDelete = async (taskId: string, title: string) => {
    promptForPassword(
      ADMIN_PASSWORD_ACTIONS.DELETE_JOB,
      `Delete job "${title}"`,
      () => {},
      {
        targetId: taskId,
        targetType: "job",
        metadata: { taskTitle: title },
        onConfirmWithPassword: async (adminPassword: string) => {
          try {
            const response = await fetch("/api/delete", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                itemType: "job",
                itemId: taskId,
                reason: `Deleted task: ${title}`,
                adminPassword,
              }),
            });
            const result = await response.json();
            if (response.ok && result.success) {
              setAllJobs((prev) => prev.filter((task) => task.id !== taskId));
              toast.success("Task moved to recycle bin");
            } else {
              toast.error(result.error || "Failed to delete task");
            }
          } catch (error) {
            console.error("Failed to delete task:", error);
            toast.error("Failed to delete task");
          }
        },
      }
    );
  };

  const matchesSearch = (job: Task, query: string) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;

    const fields: string[] = [];
    // Vehicle number (title)
    if (job.title) fields.push(job.title);
    // Owner / customer details
    if (job.customerName) fields.push(job.customerName);
    if (job.customerPhone) fields.push(job.customerPhone);
    // Company details
    if ((job as any).companyName) fields.push((job as any).companyName);
    // Remarks / description
    if ((job as any).damageRemarks) fields.push((job as any).damageRemarks);
    // Status/column label
    if (job.column) fields.push(job.column);
    // Subtasks content (services/parts/brand/descriptions)
    if (job.subTasks && Array.isArray(job.subTasks)) {
      for (const st of job.subTasks) {
        if (st.serviceType) fields.push(st.serviceType);
        if (st.partsType) fields.push(st.partsType);
        if (st.partsBrand) fields.push(st.partsBrand);
        if (st.serviceDescription) fields.push(st.serviceDescription);
        if (st.partsDescription) fields.push(st.partsDescription);
      }
    }

    return fields.some((f) => f && f.toLowerCase().includes(q));
  };

  const filteredJobs = allJobs
    .filter((job) => matchesSearch(job, searchQuery))
    .sort((a, b) => {
      const aTime = (sortBy === "updated" ? a.updatedAt : a.createdAt)
        ? new Date(
            (sortBy === "updated"
              ? (a as any).updatedAt
              : (a as any).createdAt) as any
          ).getTime()
        : 0;
      const bTime = (sortBy === "updated" ? b.updatedAt : b.createdAt)
        ? new Date(
            (sortBy === "updated"
              ? (b as any).updatedAt
              : (b as any).createdAt) as any
          ).getTime()
        : 0;
      return sortOrder === "desc" ? bTime - aTime : aTime - bTime;
    });

  // Helper to format delivered timestamp
  const formatDeliveredAt = (job: Task) => {
    const ts = (job as any).updatedAt || (job as any).createdAt;
    if (!ts) return "-";
    try {
      return new Date(ts as any).toLocaleString();
    } catch {
      return "-";
    }
  };

  return (
    <DashboardLayout
      title="Delivered Jobs"
      breadcrumbs={[{ label: "Delivered Jobs" }]}
    >
      <ClientOnly>
        <div className="container mx-auto py-10">
          <div className="mb-6 flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search vehicle no, owner, company, services..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Sort by</span>
              <Select
                value={`${sortBy}-${sortOrder}`}
                onValueChange={(value) => {
                  const [by, order] = value.split("-") as [
                    "updated" | "created",
                    "asc" | "desc"
                  ];
                  setSortBy(by);
                  setSortOrder(order);
                }}
              >
                <SelectTrigger className="w-56">
                  <SelectValue placeholder="Select sort" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="updated-desc">
                    Last updated (newest)
                  </SelectItem>
                  <SelectItem value="updated-asc">
                    Last updated (oldest)
                  </SelectItem>
                  <SelectItem value="created-desc">Created (newest)</SelectItem>
                  <SelectItem value="created-asc">Created (oldest)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Image</TableHead>
                <TableHead>Vehicle No</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead className="text-right">Delivered At</TableHead>
                <TableHead className="w-[120px] text-center">Receipt</TableHead>
                <TableHead className="w-[100px] text-center">Delete</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                // Loading skeleton
                [...Array(5)].map((_, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Skeleton className="h-12 w-12" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-[200px]" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-[100px]" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-[80px] ml-auto" />
                    </TableCell>
                    <TableCell className="text-center">
                      <Skeleton className="h-8 w-8 mx-auto" />
                    </TableCell>
                    <TableCell className="text-center">
                      <Skeleton className="h-8 w-8 mx-auto" />
                    </TableCell>
                  </TableRow>
                ))
              ) : filteredJobs.length > 0 ? (
                filteredJobs.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell>
                      {job.imageUrl ? (
                        <div className="relative h-12 w-12 rounded-md overflow-hidden">
                          <Image
                            src={job.imageUrl}
                            alt={job.title}
                            fill
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <div className="h-12 w-12 bg-gray-100 rounded-md flex items-center justify-center">
                          <span className="text-gray-400">No image</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{job.title}</TableCell>
                    <TableCell>
                      {job.subTasksCompleted} of {job.totalSubTasks} tasks
                    </TableCell>
                    <TableCell className="text-right">
                      {formatDeliveredAt(job)}
                    </TableCell>
                    <TableCell className="text-center">
                      <LazyPrintableCreditBill jobId={job.id} />
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="outline"
                        size="icon"
                        className="mx-auto border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground transition-all duration-200 hover:scale-110"
                        onClick={() => {
                          setJobPendingDelete(job);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4 transition-transform duration-200 hover:scale-110" />
                        <span className="sr-only">Delete job</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center text-muted-foreground"
                  >
                    {searchQuery ? "No matching jobs found" : "No jobs found"}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          <AlertDialog
            open={deleteDialogOpen}
            onOpenChange={setDeleteDialogOpen}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete job?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. The job
                  {jobPendingDelete?.title
                    ? ` "${jobPendingDelete.title}"`
                    : ""}{" "}
                  will be permanently deleted.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={async () => {
                    if (jobPendingDelete) {
                      await handleDelete(
                        jobPendingDelete.id,
                        jobPendingDelete.title
                      );
                      setJobPendingDelete(null);
                    }
                    setDeleteDialogOpen(false);
                  }}
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <AdminPasswordPromptComponent />
        </div>
      </ClientOnly>
    </DashboardLayout>
  );
};

export default DeliveredJobsList;
