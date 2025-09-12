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
import { SidebarProvider } from "@/components/ui/sidebar";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "react-hot-toast";
import { deleteJob } from "@/app/api/actions";
import { useAdminPasswordPrompt } from "@/components/admin-password-prompt";
import { ADMIN_PASSWORD_ACTIONS } from "@/lib/services/admin-password";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
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

const FinishedJobsList = () => {
  const [allJobs, setAllJobs] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [jobPendingDelete, setJobPendingDelete] = useState<Task | null>(null);

  useEffect(() => {
    const fetchFinishedJobs = async () => {
      try {
        const jobs = await getAllJobs();
        // Only get finished jobs
        const finishedJobs = jobs.finished.map((job) => ({
          ...job,
          column: "finished",
        })) as Task[];
        console.log("Finished jobs:", finishedJobs); // Debug log
        setAllJobs(finishedJobs);
      } catch (error) {
        console.error("Failed to fetch jobs:", error);
        toast.error("Failed to fetch jobs");
      } finally {
        setLoading(false);
      }
    };

    fetchFinishedJobs();
  }, []);

  const { promptForPassword, AdminPasswordPromptComponent } =
    useAdminPasswordPrompt();
  const handleDelete = async (taskId: string, title: string) => {
    promptForPassword(
      ADMIN_PASSWORD_ACTIONS.DELETE_JOB,
      `Delete job "${title}"`,
      () => {
        // Success callback - runs after password dialog closes
        setDeleteDialogOpen(false); // Ensure alert dialog is closed too
      },
      {
        targetId: taskId,
        targetType: "job",
        metadata: { taskTitle: title },
        onConfirmWithPassword: async (adminPassword: string) => {
          try {
            // This runs after the dialog is closed to prevent UI freeze
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

  const handleMoveToDelivered = async (taskId: string) => {
    try {
      // Here you would add the API call to update the job status to delivered
      // For now, we'll just navigate to the billing page
      router.push(`/dashboard/billing/${taskId}`);
    } catch (error) {
      console.error("Failed to move task to delivered:", error);
      toast.error("Failed to move task to delivered");
    }
  };

  const filteredJobs = allJobs.filter((job) =>
    job.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case "todo":
        return "bg-yellow-100 text-yellow-800";
      case "inProgress":
        return "bg-blue-100 text-blue-800";
      case "finished":
        return "bg-green-100 text-green-800";
      case "delivered":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <ClientOnly>
      <SidebarProvider>
        <DashboardLayout
          title="Finished Jobs"
          breadcrumbs={[{ label: "Finished Jobs" }]}
        >
          <div className="container mx-auto py-10">
            <div className="mb-6 flex items-center gap-2 max-w-sm">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search by vehicle number..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Image</TableHead>
                  <TableHead>Vehicle No</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
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
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusBadgeStyle(
                            job.column
                          )}`}
                        >
                          {job.column.charAt(0).toUpperCase() +
                            job.column.slice(1)}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground transition-all duration-200 hover:scale-110"
                            onClick={() => {
                              setJobPendingDelete(job);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4 transition-transform duration-200 hover:scale-110" />
                            <span className="sr-only">Delete job</span>
                          </Button>
                          <Button
                            variant="outline"
                            className="flex items-center gap-2 border-green-600 text-green-600 hover:bg-green-600 hover:text-white"
                            onClick={() => handleMoveToDelivered(job.id)}
                          >
                            <span>Bill & Deliver</span>
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={5}
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
                    onClick={() => {
                      if (jobPendingDelete) {
                        // Don't await, just trigger the process
                        handleDelete(
                          jobPendingDelete.id,
                          jobPendingDelete.title
                        );
                        setJobPendingDelete(null);
                        // Dialog will be closed by the onSuccess callback in handleDelete
                      }
                    }}
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <AdminPasswordPromptComponent />
          </div>
        </DashboardLayout>
      </SidebarProvider>
    </ClientOnly>
  );
};

export default FinishedJobsList;
