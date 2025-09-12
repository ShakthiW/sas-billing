"use client";

import { useState } from "react";
import { Task, TasksData, ColumnKey } from "@/app/types";
import { useJobs, useUpdateJobStatus } from "@/hooks/useJobs";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Search, Filter, RefreshCw } from "lucide-react";
import TaskUpdateModal from "./TaskUpdateModal";
import { toast } from "react-hot-toast";
import Image from "@/components/RemoteImage";
import { useUserPermissions } from "@/hooks/useUserPermissions";

const statusConfig = {
  todo: {
    label: "To Do",
    color: "bg-gray-100 text-gray-800 border-gray-200",
    dotColor: "bg-gray-400",
    hoverColor: "hover:bg-gray-200",
  },
  inProgress: {
    label: "In Progress",
    color: "bg-blue-50 text-blue-800 border-blue-200",
    dotColor: "bg-blue-500",
    hoverColor: "hover:bg-blue-100",
  },
  finished: {
    label: "Finished",
    color: "bg-green-50 text-green-800 border-green-200",
    dotColor: "bg-green-500",
    hoverColor: "hover:bg-green-100",
  },
  delivered: {
    label: "Delivered",
    color: "bg-emerald-50 text-emerald-800 border-emerald-200",
    dotColor: "bg-emerald-500",
    hoverColor: "hover:bg-emerald-100",
  },
};

const TableView = () => {
  // Use React Query for data fetching
  const { data: categorizedJobs, isLoading, error, refetch } = useJobs();
  const updateJobMutation = useUpdateJobStatus();
  const { isAdmin, permissions } = useUserPermissions();
  // Admin password prompt removed with Actions column

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("title");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Modal states removed with Actions column

  // Transform the data into TasksData format
  const tasks: TasksData | null = categorizedJobs
    ? {
        todo: categorizedJobs.todo.map((job: any) => ({
          ...job,
          column: "todo",
        })),
        inProgress: categorizedJobs.inProgress.map((job: any) => ({
          ...job,
          column: "inProgress",
        })),
        finished: categorizedJobs.finished.map((job: any) => ({
          ...job,
          column: "finished",
        })),
        delivered: categorizedJobs.delivered.map((job: any) => ({
          ...job,
          column: "delivered",
        })),
      }
    : null;

  const getAllowedTransitions = (current: ColumnKey): ColumnKey[] => {
    switch (current) {
      case "todo":
        return ["inProgress"];
      case "inProgress":
        return ["finished"];
      default:
        return [];
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: ColumnKey) => {
    try {
      const currentTask = getAllTasks().find((t) => t.id === taskId);
      if (!currentTask) return;

      const allowed = getAllowedTransitions(currentTask.column as ColumnKey);
      if (!allowed.includes(newStatus)) {
        toast.error(
          "Invalid status change. Follow: To Do → In Progress → Finished."
        );
        return;
      }

      await updateJobMutation.mutateAsync({
        jobId: taskId,
        newStatus: newStatus,
      });
      console.log(`Job ${taskId} moved to ${newStatus}`);
    } catch (error) {
      console.error("Failed to update job status:", error);
    }
  };

  // Flatten all tasks for table display
  const getAllTasks = (): Task[] => {
    if (!tasks) return [];
    return Object.values(tasks).flat();
  };

  // Filter and sort tasks
  const getFilteredAndSortedTasks = (): Task[] => {
    let allTasks = getAllTasks();

    // Apply search filter
    if (searchTerm) {
      allTasks = allTasks.filter(
        (task) =>
          task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          task.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          task.id.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply status filter
    if (statusFilter !== "all") {
      allTasks = allTasks.filter((task) => task.column === statusFilter);
    }

    // Apply sorting
    allTasks.sort((a, b) => {
      let aValue: string | number = "";
      let bValue: string | number = "";

      switch (sortBy) {
        case "title":
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case "customer":
          aValue = (a.customerName || "").toLowerCase();
          bValue = (b.customerName || "").toLowerCase();
          break;
        case "progress":
          aValue =
            a.totalSubTasks > 0 ? a.subTasksCompleted / a.totalSubTasks : 0;
          bValue =
            b.totalSubTasks > 0 ? b.subTasksCompleted / b.totalSubTasks : 0;
          break;
        case "status":
          aValue = a.column;
          bValue = b.column;
          break;
        default:
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
      }

      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortOrder === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      } else {
        return sortOrder === "asc"
          ? Number(aValue) - Number(bValue)
          : Number(bValue) - Number(aValue);
      }
    });

    return allTasks;
  };

  const getProgressPercentage = (completed: number, total: number): number => {
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  };

  const getProgressColor = (percentage: number): string => {
    if (percentage === 100) return "bg-green-500";
    if (percentage >= 75) return "bg-blue-500";
    if (percentage >= 50) return "bg-yellow-500";
    if (percentage >= 25) return "bg-orange-500";
    return "bg-red-500";
  };

  // Action handlers
  // Action handlers removed

  // Modal helpers removed

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="flex justify-between items-center mb-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-9 w-24" />
        </div>
        <div className="space-y-4">
          <div className="flex gap-4">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-10 w-40" />
            <Skeleton className="h-10 w-40" />
          </div>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  {[...Array(6)].map((_, i) => (
                    <TableHead key={i}>
                      <Skeleton className="h-4 w-20" />
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...Array(10)].map((_, i) => (
                  <TableRow key={i}>
                    {[...Array(6)].map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-16" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    );
  }

  const filteredTasks = getFilteredAndSortedTasks();

  return (
    <div className="p-2 ipad:p-3 lg:p-4 max-w-screen-2xl mx-auto">
      {/* Header */}
      <div className="flex flex-col ipad:flex-row justify-between items-start ipad:items-center gap-2 mb-4 ipad:mb-5 lg:mb-6">
        <div className="flex flex-col ipad:flex-row ipad:items-center gap-2 ipad:gap-4">
          <h2 className="text-base ipad:text-lg font-semibold">All Jobs</h2>
          <div className="text-xs ipad:text-sm text-gray-600">
            Showing {filteredTasks.length} of {getAllTasks().length} jobs
          </div>
        </div>
        <Button
          onClick={() => refetch()}
          disabled={isLoading}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col ipad:flex-row gap-3 mb-4 ipad:mb-5 lg:mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search by job title, customer name, or job ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full ipad:w-48 lg:w-48">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {Object.entries(statusConfig).map(([key, config]) => (
              <SelectItem key={key} value={key}>
                {config.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={`${sortBy}-${sortOrder}`}
          onValueChange={(value) => {
            const [field, order] = value.split("-");
            setSortBy(field);
            setSortOrder(order as "asc" | "desc");
          }}
        >
          <SelectTrigger className="w-full ipad:w-48 lg:w-48">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="title-asc">Title A-Z</SelectItem>
            <SelectItem value="title-desc">Title Z-A</SelectItem>
            <SelectItem value="customer-asc">Customer A-Z</SelectItem>
            <SelectItem value="customer-desc">Customer Z-A</SelectItem>
            <SelectItem value="progress-desc">Progress High-Low</SelectItem>
            <SelectItem value="progress-asc">Progress Low-High</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-white shadow-sm overflow-x-auto">
        <Table className="min-w-[700px] ipad:min-w-[800px]">
          <TableHeader>
            <TableRow className="bg-gray-50/50 border-b">
              <TableHead className="w-10 ipad:w-12 lg:w-12 font-semibold text-gray-700 text-xs ipad:text-sm lg:text-sm">
                #
              </TableHead>
              <TableHead className="font-semibold text-gray-700 text-xs ipad:text-sm lg:text-sm min-w-[180px] ipad:min-w-[200px]">
                Job Details
              </TableHead>
              <TableHead className="font-semibold text-gray-700 text-xs ipad:text-sm lg:text-sm min-w-[130px] ipad:min-w-[150px]">
                Customer
              </TableHead>
              <TableHead className="font-semibold text-gray-700 text-xs ipad:text-sm lg:text-sm min-w-[100px] ipad:min-w-[120px]">
                Status
              </TableHead>
              <TableHead className="font-semibold text-gray-700 text-xs ipad:text-sm lg:text-sm min-w-[120px] ipad:min-w-[140px]">
                Progress
              </TableHead>
              <TableHead className="font-semibold text-gray-700 text-xs ipad:text-sm lg:text-sm min-w-[70px] ipad:min-w-[80px]">
                Tasks
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTasks.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center py-12 text-gray-500"
                >
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                      <Search className="w-5 h-5 text-gray-400" />
                    </div>
                    <p className="font-medium">No jobs found</p>
                    <p className="text-sm">
                      Try adjusting your search or filter criteria
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredTasks.map((task, index) => {
                const progressPercentage = getProgressPercentage(
                  task.subTasksCompleted,
                  task.totalSubTasks
                );
                const statusInfo = statusConfig[task.column as ColumnKey];

                return (
                  <TableRow
                    key={task.id}
                    className="hover:bg-gray-50/50 transition-colors border-b-0"
                  >
                    <TableCell className="font-mono text-xs text-gray-500 font-medium py-2 lg:py-3">
                      {index + 1}
                    </TableCell>

                    <TableCell className="py-2 lg:py-3">
                      <div className="flex items-center gap-2 lg:gap-3">
                        {task.imageUrl && (
                          <div className="relative w-10 h-10 lg:w-12 lg:h-12 flex-shrink-0">
                            <Image
                              src={task.imageUrl}
                              alt={task.title}
                              fill
                              className="rounded-lg object-cover border"
                              sizes="48px"
                            />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-sm lg:text-base text-gray-900 truncate">
                            {task.title}
                          </div>
                          <div className="text-xs text-gray-500 font-mono">
                            ID: {task.id}
                          </div>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="py-2 lg:py-3">
                      <div className="min-w-0">
                        <div className="font-medium text-sm lg:text-base text-gray-900 truncate">
                          {task.customerName || "N/A"}
                        </div>
                        {task.customerPhone && (
                          <div className="text-xs text-gray-500">
                            {task.customerPhone}
                          </div>
                        )}
                      </div>
                    </TableCell>

                    <TableCell className="py-2 lg:py-3">
                      <Select
                        value={task.column}
                        onValueChange={(value) =>
                          handleStatusChange(task.id, value as ColumnKey)
                        }
                        disabled={
                          task.column === "finished" ||
                          task.column === "delivered"
                        }
                      >
                        <SelectTrigger className="w-auto border-none p-0 h-auto shadow-none focus:ring-0">
                          <div
                            className={`inline-flex items-center px-2 lg:px-2.5 py-1 lg:py-1.5 rounded-full text-xs font-medium border ${
                              task.column === "finished" ||
                              task.column === "delivered"
                                ? "cursor-default"
                                : "cursor-pointer"
                            } transition-colors ${statusInfo.color} ${
                              statusInfo.hoverColor
                            }`}
                          >
                            <div
                              className={`w-2 h-2 rounded-full ${statusInfo.dotColor} mr-2`}
                            />
                            {statusInfo.label}
                          </div>
                        </SelectTrigger>
                        <SelectContent>
                          {getAllowedTransitions(task.column as ColumnKey).map(
                            (key) => (
                              <SelectItem key={key} value={key}>
                                <div className="flex items-center gap-2">
                                  <div
                                    className={`w-2 h-2 rounded-full ${
                                      statusConfig[key as ColumnKey].dotColor
                                    }`}
                                  />
                                  {statusConfig[key as ColumnKey].label}
                                </div>
                              </SelectItem>
                            )
                          )}
                        </SelectContent>
                      </Select>
                    </TableCell>

                    <TableCell className="py-2 lg:py-3">
                      <div className="flex items-center gap-2 lg:gap-3">
                        <div className="w-16 lg:w-24 bg-gray-200 rounded-full h-1.5 lg:h-2 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ease-out ${getProgressColor(
                              progressPercentage
                            )}`}
                            style={{ width: `${progressPercentage}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-gray-700 min-w-[3rem] tabular-nums">
                          {progressPercentage}%
                        </span>
                      </div>
                    </TableCell>

                    <TableCell className="py-2 lg:py-3">
                      <div className="text-xs lg:text-sm tabular-nums">
                        <span className="font-medium text-gray-900">
                          {task.subTasksCompleted}
                        </span>
                        <span className="text-gray-500">
                          /{task.totalSubTasks}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default TableView;
