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
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "react-hot-toast";
import { deleteJob } from "@/app/api/actions";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import Link from "next/link";

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

const AllJobsList = () => {
  const [allJobs, setAllJobs] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchAllJobs = async () => {
      try {
        const jobs = await getAllJobs();
        // Combine all jobs from different statuses into a single array
        const combinedJobs = [
          ...jobs.todo.map((job) => ({ ...job, column: "todo" })),
          ...jobs.inProgress.map((job) => ({ ...job, column: "inProgress" })),
          ...jobs.finished.map((job) => ({ ...job, column: "finished" })),
          ...jobs.delivered.map((job) => ({ ...job, column: "delivered" })),
        ] as Task[];
        setAllJobs(combinedJobs);
      } catch (error) {
        console.error("Failed to fetch jobs:", error);
        toast.error("Failed to fetch jobs");
      } finally {
        setLoading(false);
      }
    };

    fetchAllJobs();
  }, []);

  const handleDelete = async (taskId: string) => {
    try {
      const result = await deleteJob(taskId);
      if (result?.acknowledged) {
        setAllJobs(allJobs.filter((task) => task.id !== taskId));
        toast.success("Task deleted successfully");
      } else {
        toast.error("Failed to delete task");
      }
    } catch (error) {
      console.error("Failed to delete task:", error);
      toast.error("Failed to delete task");
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
      <DashboardLayout title="All Jobs" breadcrumbs={[{ label: "All Jobs" }]}>
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
                      <Button
                        variant="outline"
                        size="icon"
                        className="mx-auto border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground transition-all duration-200 hover:scale-110"
                        onClick={() => handleDelete(job.id)}
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
                    colSpan={5}
                    className="text-center text-muted-foreground"
                  >
                    {searchQuery ? "No matching jobs found" : "No jobs found"}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </DashboardLayout>
    </ClientOnly>
  );
};

export default AllJobsList;
