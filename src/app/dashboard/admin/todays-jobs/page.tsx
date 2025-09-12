"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CalendarDays,
  DollarSign,
  CheckCircle2,
  Clock,
  AlertCircle,
} from "lucide-react";

interface JobData {
  _id: string;
  jobId?: string;
  vehicleNo: string;
  customerName: string;
  customerPhone: string;
  status: string;
  total?: number;
  isPaid?: boolean;
  description?: string;
  createdAt: string;
  updatedAt?: string;
}

export default function TodaysJobsPage() {
  const [jobs, setJobs] = useState<{
    completed: JobData[];
    updated: JobData[];
    created: JobData[];
  }>({
    completed: [],
    updated: [],
    created: [],
  });
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalJobs: 0,
    completedJobs: {
      count: 0,
      revenue: 0,
      received: 0,
      pending: 0,
    },
    updatedJobs: {
      count: 0,
    },
    createdJobs: {
      count: 0,
    },
  });
  const [activeTab, setActiveTab] = useState<
    "completed" | "updated" | "created"
  >("completed");
  const { isAdmin } = useUserPermissions();

  useEffect(() => {
    const fetchTodaysJobs = async () => {
      if (!isAdmin) {
        setLoading(false);
        return;
      }

      try {
        // Fetch jobs directly from API
        const response = await fetch("/api/jobs/today");
        if (!response.ok) {
          // If the endpoint doesn't exist, use fallback logic
          const allJobsResponse = await fetch("/api/jobs");
          if (allJobsResponse.ok) {
            const allJobs = await allJobsResponse.json();

            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            // 1. Filter for completed jobs (moved to "finished" status today)
            const completedJobsList = allJobs.filter((job: JobData) => {
              if (job.status !== "finished") return false;
              const jobDate = new Date(job.updatedAt || job.createdAt);
              return jobDate >= today && jobDate < tomorrow;
            });

            // 2. Filter for updated jobs (not finished, updated today but not created today)
            const updatedJobsList = allJobs.filter((job: JobData) => {
              if (job.status === "finished") return false;
              const updatedDate = new Date(job.updatedAt || job.createdAt);
              const createdDate = new Date(job.createdAt);
              return (
                updatedDate >= today &&
                updatedDate < tomorrow &&
                createdDate < today
              );
            });

            // 3. Filter for created jobs (created today)
            const createdJobsList = allJobs.filter((job: JobData) => {
              const createdDate = new Date(job.createdAt);
              return createdDate >= today && createdDate < tomorrow;
            });

            // Sort all lists by most recent first
            const sortByDate = (a: JobData, b: JobData) => {
              const dateA = new Date(a.updatedAt || a.createdAt);
              const dateB = new Date(b.updatedAt || b.createdAt);
              return dateB.getTime() - dateA.getTime();
            };

            completedJobsList.sort(sortByDate);
            updatedJobsList.sort(sortByDate);
            createdJobsList.sort(sortByDate);

            setJobs({
              completed: completedJobsList,
              updated: updatedJobsList,
              created: createdJobsList,
            });

            // Calculate statistics
            const totalRev = completedJobsList.reduce(
              (sum: number, job: JobData) => sum + (job.total || 0),
              0
            );
            const receivedRev = completedJobsList
              .filter((job: JobData) => job.isPaid)
              .reduce((sum: number, job: JobData) => sum + (job.total || 0), 0);
            const pendingRev = totalRev - receivedRev;

            setStats({
              totalJobs:
                completedJobsList.length +
                updatedJobsList.length +
                createdJobsList.length,
              completedJobs: {
                count: completedJobsList.length,
                revenue: totalRev,
                received: receivedRev,
                pending: pendingRev,
              },
              updatedJobs: {
                count: updatedJobsList.length,
              },
              createdJobs: {
                count: createdJobsList.length,
              },
            });
          }
        } else {
          // Use the new API response format
          const data = await response.json();

          if (data.jobs) {
            setJobs({
              completed: data.jobs.completed || [],
              updated: data.jobs.updated || [],
              created: data.jobs.created || [],
            });
          }

          if (data.stats) {
            setStats(data.stats);
          }
        }
      } catch (error) {
        console.error("Failed to fetch today's jobs:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTodaysJobs();
  }, [isAdmin]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "todo":
        return (
          <Badge variant="outline" className="bg-yellow-50">
            Todo
          </Badge>
        );
      case "inProgress":
        return (
          <Badge variant="outline" className="bg-blue-50">
            In Progress
          </Badge>
        );
      case "finished":
        return <Badge className="bg-green-600">Finished</Badge>;
      case "delivered":
        return <Badge className="bg-purple-600">Delivered</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getPaymentBadge = (isPaid: boolean) => {
    return isPaid ? (
      <Badge className="bg-green-600">Paid</Badge>
    ) : (
      <Badge variant="outline" className="bg-yellow-50">
        Pending
      </Badge>
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-LK", {
      style: "currency",
      currency: "LKR",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!isAdmin) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              You don't have permission to view today's jobs.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <DashboardLayout
        title="Today's Jobs"
        breadcrumbs={[
          { label: "Admin Tools", href: "/dashboard/admin" },
          { label: "Today's Jobs" },
        ]}
      >
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader className="pb-3">
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-32" />
                </CardContent>
              </Card>
            ))}
          </div>
          <Card>
            <CardContent className="p-6">
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Today's Jobs"
      breadcrumbs={[
        { label: "Admin Tools", href: "/dashboard/admin" },
        { label: "Today's Jobs" },
      ]}
    >
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Total Jobs Card */}
          <Card className="bg-blue-50/50 border-blue-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Activity Today
              </CardTitle>
              <CalendarDays className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalJobs}</div>
              <div className="space-y-1 mt-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-green-600">Completed:</span>
                  <span className="text-sm font-medium">
                    {stats.completedJobs.count}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-blue-600">Updated:</span>
                  <span className="text-sm font-medium">
                    {stats.updatedJobs.count}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-purple-600">Created:</span>
                  <span className="text-sm font-medium">
                    {stats.createdJobs.count}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Completed Jobs Card */}
          <Card className="bg-green-50/50 border-green-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Completed Jobs Today
              </CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.completedJobs.count}
              </div>
              <div className="space-y-1 mt-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Revenue:</span>
                  <span className="text-sm font-medium">
                    {formatCurrency(stats.completedJobs.revenue)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-green-600">Received:</span>
                  <span className="text-sm font-medium">
                    {formatCurrency(stats.completedJobs.received)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-yellow-600">Pending:</span>
                  <span className="text-sm font-medium">
                    {formatCurrency(stats.completedJobs.pending)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Other Activity Card */}
          <Card className="bg-gray-50/50 border-gray-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Other Activity Today
              </CardTitle>
              <AlertCircle className="h-4 w-4 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <div className="text-blue-600 font-medium">Updated Jobs</div>
                  <div className="text-xl font-bold">
                    {stats.updatedJobs.count}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Jobs modified today (excluding newly completed)
                  </div>
                </div>
                <div>
                  <div className="text-purple-600 font-medium">
                    Created Jobs
                  </div>
                  <div className="text-xl font-bold">
                    {stats.createdJobs.count}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    New jobs created today
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for different job categories */}
        <Card>
          <CardHeader>
            <CardTitle>Today's Job Details</CardTitle>
            <CardDescription>
              {new Date().toLocaleDateString()} - Filter by category
            </CardDescription>
            <div className="flex mt-4 border-b">
              <button
                className={`px-4 py-2 font-medium text-sm ${
                  activeTab === "completed"
                    ? "text-green-600 border-b-2 border-green-600"
                    : "text-gray-500 hover:text-gray-700"
                }`}
                onClick={() => setActiveTab("completed")}
              >
                Completed Jobs ({stats.completedJobs.count})
              </button>
              <button
                className={`px-4 py-2 font-medium text-sm ${
                  activeTab === "updated"
                    ? "text-blue-600 border-b-2 border-blue-600"
                    : "text-gray-500 hover:text-gray-700"
                }`}
                onClick={() => setActiveTab("updated")}
              >
                Updated Jobs ({stats.updatedJobs.count})
              </button>
              <button
                className={`px-4 py-2 font-medium text-sm ${
                  activeTab === "created"
                    ? "text-purple-600 border-b-2 border-purple-600"
                    : "text-gray-500 hover:text-gray-700"
                }`}
                onClick={() => setActiveTab("created")}
              >
                Created Jobs ({stats.createdJobs.count})
              </button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Completed Jobs Table */}
            {activeTab === "completed" && (
              <>
                {jobs.completed.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No completed jobs found for today.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <div className="bg-green-50 p-3 mb-3 rounded-md text-sm text-green-800">
                      <strong>Completed Jobs:</strong> Jobs that were moved to
                      "finished" status today.
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Time</TableHead>
                          <TableHead>Job ID</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead>Vehicle</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Total</TableHead>
                          <TableHead>Payment</TableHead>
                          <TableHead>Notes</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {jobs.completed.map((job) => (
                          <TableRow key={job._id}>
                            <TableCell className="text-sm text-muted-foreground">
                              {formatTime(job.updatedAt || job.createdAt)}
                            </TableCell>
                            <TableCell className="font-mono text-sm">
                              {job.jobId || job._id.slice(-6)}
                            </TableCell>
                            <TableCell>{job.customerName}</TableCell>
                            <TableCell>{job.vehicleNo || "-"}</TableCell>
                            <TableCell>{getStatusBadge(job.status)}</TableCell>
                            <TableCell className="font-medium">
                              {job.total ? formatCurrency(job.total) : "-"}
                            </TableCell>
                            <TableCell>
                              {job.status === "finished" ||
                              job.status === "delivered"
                                ? getPaymentBadge(job.isPaid || false)
                                : "-"}
                            </TableCell>
                            <TableCell className="max-w-xs truncate">
                              {job.description || "-"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </>
            )}

            {/* Updated Jobs Table */}
            {activeTab === "updated" && (
              <>
                {jobs.updated.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No updated jobs found for today.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <div className="bg-blue-50 p-3 mb-3 rounded-md text-sm text-blue-800">
                      <strong>Updated Jobs:</strong> Jobs that were modified
                      today but not newly created or completed.
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Time</TableHead>
                          <TableHead>Job ID</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead>Vehicle</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead>Notes</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {jobs.updated.map((job) => (
                          <TableRow key={job._id}>
                            <TableCell className="text-sm text-muted-foreground">
                              {formatTime(job.updatedAt || job.createdAt)}
                            </TableCell>
                            <TableCell className="font-mono text-sm">
                              {job.jobId || job._id.slice(-6)}
                            </TableCell>
                            <TableCell>{job.customerName}</TableCell>
                            <TableCell>{job.vehicleNo || "-"}</TableCell>
                            <TableCell>{getStatusBadge(job.status)}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {new Date(job.createdAt).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="max-w-xs truncate">
                              {job.description || "-"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </>
            )}

            {/* Created Jobs Table */}
            {activeTab === "created" && (
              <>
                {jobs.created.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No new jobs created today.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <div className="bg-purple-50 p-3 mb-3 rounded-md text-sm text-purple-800">
                      <strong>Created Jobs:</strong> New jobs that were created
                      today.
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Time</TableHead>
                          <TableHead>Job ID</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead>Vehicle</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Notes</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {jobs.created.map((job) => (
                          <TableRow key={job._id}>
                            <TableCell className="text-sm text-muted-foreground">
                              {formatTime(job.createdAt)}
                            </TableCell>
                            <TableCell className="font-mono text-sm">
                              {job.jobId || job._id.slice(-6)}
                            </TableCell>
                            <TableCell>{job.customerName}</TableCell>
                            <TableCell>{job.vehicleNo || "-"}</TableCell>
                            <TableCell>{getStatusBadge(job.status)}</TableCell>
                            <TableCell className="max-w-xs truncate">
                              {job.description || "-"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Reconciliation Summary */}
        {stats.completedJobs.count > 0 && (
          <Card className="border-blue-200 bg-blue-50/50">
            <CardHeader>
              <CardTitle className="text-lg">
                Daily Reconciliation Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Completed Jobs
                  </p>
                  <p className="text-2xl font-bold">
                    {stats.completedJobs.count}
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Expected Revenue
                  </p>
                  <p className="text-2xl font-bold text-blue-600">
                    {formatCurrency(stats.completedJobs.revenue)}
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Cash Received</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(stats.completedJobs.received)}
                  </p>
                </div>
              </div>
              {stats.completedJobs.pending > 0 && (
                <div className="mt-4 p-3 bg-yellow-100 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    ⚠️ Outstanding payments:{" "}
                    {formatCurrency(stats.completedJobs.pending)} from{" "}
                    {
                      jobs.completed.filter(
                        (job) =>
                          (job.status === "finished" ||
                            job.status === "delivered") &&
                          !job.isPaid
                      ).length
                    }{" "}
                    job(s)
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
