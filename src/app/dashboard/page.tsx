"use client";

import { useHotkeys } from "react-hotkeys-hook";
import { useState, useTransition, useRef, useEffect } from "react";
import { SignedIn, SignedOut, UserButton, SignInButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { PlusIcon } from "lucide-react";
import { ColumnKey, SubTask, Task, Bill } from "@/app/types";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  jobFormSchema,
  validateAndSanitize,
  sanitizeVehicleNumber,
  sanitizeInput,
  sanitizePhoneNumber,
} from "@/utils/validation";
import KanbanBoard from "@/components/KanbanBoard";
import { VehicleNo } from "@/components/jobform/VehicleNo";
import SubTasks from "@/components/jobform/AddSubTasks";
import ImageUpload from "@/components/jobform/ImageUpload";
import DamageImageUpload from "@/components/jobform/DamageImageUpload";
import {
  createJob,
  getAllJobs,
  getAllBills,
  appendDamagePhotos,
  updateImageUrl,
  updateCustomerDetails,
} from "@/app/api/actions";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import CreateApprovalRequest from "@/components/CreateApprovalRequest";
import { Toaster, toast } from "react-hot-toast";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebaseClient";
import { AppSidebar } from "@/components/app-sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
// uuidv4 import removed as it's no longer needed here
import BankDetails from "@/components/secret/BankDetails";
import { useQueryClient } from "@tanstack/react-query";
import { jobsQueryKey } from "@/hooks/useJobs";

// Firebase app and storage are initialized in src/lib/firebaseClient

// SubTasksProps interface removed as it's not used

const Dashboard = () => {
  const { permissions, role, displayRole, loading } = useUserPermissions();
  const [todayJobs, setTodayJobs] = useState<Task[]>([]);
  const [todayIncome, setTodayIncome] = useState<number>(0);
  const [todayJobsLoading, setTodayJobsLoading] = useState(false);
  const [status, setStatus] = useState<ColumnKey>("todo");
  const [isPending, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [localVehicleNo, setLocalVehicleNo] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [damageRemarks, setDamageRemarks] = useState("");
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [localImageFile, setLocalImageFile] = useState<File[]>([]);
  const [damageImageFiles, setDamageImageFiles] = useState<File[]>([]);
  const [uploadTask, setUploadTask] = useState<any>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isCompanyVehicle, setIsCompanyVehicle] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [companies, setCompanies] = useState<{ _id: string; name: string }[]>(
    []
  );
  const queryClient = useQueryClient();

  useHotkeys("shift+l", () => setIsOpen(true));

  const subTasksRef = useRef<SubTask[]>([]); // Start with empty subtasks - not mandatory
  const [subtasks, setSubtasks] = useState<SubTask[]>([]); // Start with empty subtasks

  // Load companies for the company dropdown
  useEffect(() => {
    const loadCompanies = async () => {
      try {
        const res = await fetch("/api/companies");
        if (res.ok) {
          const data = await res.json();
          setCompanies(data);
        }
      } catch (err) {
        console.error("Failed to load companies", err);
      }
    };
    loadCompanies();
  }, []);

  // Fetch today's completed jobs count and income for admin users
  useEffect(() => {
    const fetchTodayData = async () => {
      if (!permissions.canViewAllReports) return; // Only for admin users

      setTodayJobsLoading(true);
      try {
        // Get today's date range
        const today = new Date();
        const todayStart = new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate()
        );
        const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

        // First try to fetch from the jobs/today endpoint for count
        try {
          const response = await fetch("/api/jobs/today");
          if (response.ok) {
            const data = await response.json();
            // Use the count from the endpoint directly
            setTodayJobs(new Array(data.stats.completedJobs).fill({})); // Just need the count
          }
        } catch (error) {
          console.error(
            "Could not fetch from today endpoint, falling back to count calculation"
          );
        }

        // Still get the bills for income calculation
        const bills = await getAllBills();

        // Calculate today's income from bills
        const todayBills = bills.filter((bill) => {
          if (!bill.createdAt) return false;
          const billDate = new Date(bill.createdAt);
          return billDate >= todayStart && billDate < todayEnd;
        });

        const totalIncome = todayBills.reduce(
          (sum, bill) => sum + bill.finalAmount,
          0
        );
        setTodayIncome(totalIncome);
      } catch (error) {
        console.error("Failed to fetch today's data:", error);
      } finally {
        setTodayJobsLoading(false);
      }
    };

    fetchTodayData();
  }, [permissions.canViewAllReports]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log("handleSubmit: Form submission started");

    // Clear previous errors
    setFormErrors({});

    // Validate form data - customer details are optional at task initiation
    const formData = {
      vehicleNo: localVehicleNo,
      customerName: customerName || "",
      customerPhone: customerPhone || "",
      damageRemarks: damageRemarks,
      status: status,
      isCompanyVehicle,
      companyName: isCompanyVehicle ? companyName : "",
      subTasks:
        subTasksRef.current.length > 0 ? subTasksRef.current : undefined,
    };

    const validation = await validateAndSanitize(jobFormSchema, formData, {
      vehicleNo: sanitizeVehicleNumber,
      customerName: sanitizeInput,
      customerPhone: sanitizePhoneNumber,
      damageRemarks: sanitizeInput,
    });

    if (!validation.success) {
      setFormErrors(validation.errors);
      toast.error("Please fix the form errors");
      return;
    }

    // Update form fields with sanitized values
    const sanitizedData = validation.data;
    setLocalVehicleNo(sanitizedData.vehicleNo);
    setCustomerName(sanitizedData.customerName || "");
    setCustomerPhone(sanitizedData.customerPhone || "");
    setDamageRemarks(sanitizedData.damageRemarks || "");
    setIsCompanyVehicle(Boolean((sanitizedData as any).isCompanyVehicle));
    setCompanyName((sanitizedData as any).companyName || "");

    const formElement = e.currentTarget;
    // We'll create the job immediately, then upload in background
    let imageUrls: string[] = [];
    let damagePhotoUrls: string[] = [];

    const toastId = toast.loading("Saving job...");

    // NOTE: We no longer block on uploads here. We'll upload after job creation.

    // --- Create FormData with enhanced data ---
    const submitFormData = new FormData();
    submitFormData.set("vehicleNo", sanitizedData.vehicleNo);
    submitFormData.set("customerName", sanitizedData.customerName || "");
    submitFormData.set("customerPhone", sanitizedData.customerPhone || "");
    submitFormData.set("damageRemarks", sanitizedData.damageRemarks || "");
    submitFormData.set(
      "subTasks",
      JSON.stringify(sanitizedData.subTasks || [])
    );
    submitFormData.set("status", sanitizedData.status);
    submitFormData.set(
      "isCompanyVehicle",
      String((sanitizedData as any).isCompanyVehicle || false)
    );
    submitFormData.set(
      "companyName",
      ((sanitizedData as any).isCompanyVehicle &&
        (sanitizedData as any).companyName) ||
        ""
    );
    // Create job immediately without waiting for uploads

    console.log(
      "handleSubmit: FormData created:",
      Object.fromEntries(submitFormData.entries())
    );

    startTransition(async () => {
      console.log("handleSubmit: startTransition block starting...");
      try {
        const result = await createJob(submitFormData);
        console.log("handleSubmit: createJob action returned:", result);

        if (result?.acknowledged || result?.success) {
          toast.success("Job created! Uploading images in background...", {
            id: toastId,
          });
          setDialogOpen(false);
          setLocalVehicleNo("");
          setCustomerName("");
          setCustomerPhone("");
          setDamageRemarks("");
          setIsCompanyVehicle(false);
          setCompanyName("");
          setLocalImageFile([]);
          setDamageImageFiles([]);
          setUploadTask(null);
          // Reset Subtasks
          subTasksRef.current = [];
          if (formElement) {
            formElement.reset();
          }
          // Immediately refresh Kanban
          queryClient.invalidateQueries({ queryKey: jobsQueryKey });

          // Helper to upload a single file and return its URL
          const uploadAndGetUrl = async (file: File, folder: string) => {
            const uniqueFileName = `${folder}/${crypto.randomUUID()}-${
              file.name
            }`;
            const storageRef = ref(storage, uniqueFileName);
            const task = uploadBytesResumable(storageRef, file);
            await new Promise<void>((resolve, reject) => {
              task.on("state_changed", undefined, reject, () => resolve());
            });
            return await getDownloadURL(task.snapshot.ref);
          };

          // Background uploads: fire-and-forget
          const createdJobId = result.insertedId as string;
          // Vehicle images
          if (localImageFile.length > 0) {
            (async () => {
              try {
                const urlResults: string[] = await Promise.all(
                  localImageFile.map((f) => uploadAndGetUrl(f, "jobs"))
                );
                if (urlResults.length > 0) {
                  await updateImageUrl(createdJobId, urlResults[0]);
                }
                toast.success("Vehicle images uploaded");
                queryClient.invalidateQueries({ queryKey: jobsQueryKey });
              } catch (err: any) {
                console.error("Background vehicle image upload failed", err);
                toast.error(
                  "Vehicle image upload failed: " + (err?.message || "")
                );
              }
            })();
          }
          // Damage photos
          if (damageImageFiles.length > 0) {
            (async () => {
              try {
                const urlResults: string[] = await Promise.all(
                  damageImageFiles.map((f) =>
                    uploadAndGetUrl(f, "damage_photos")
                  )
                );
                if (urlResults.length > 0) {
                  await appendDamagePhotos(createdJobId, urlResults);
                }
                toast.success("Damage photos uploaded");
              } catch (err: any) {
                console.error("Background damage photo upload failed", err);
                toast.error(
                  "Damage photo upload failed: " + (err?.message || "")
                );
              }
            })();
          }
        } else {
          toast.error("Failed to save job", { id: toastId });
        }
      } catch (error: any) {
        toast.error(error.message || "An unknown error occurred.", {
          id: toastId,
        });
        console.error("handleSubmit: Error in startTransition block:", error);
      }
    });
  };

  // Removed unused subtask manipulation functions
  // These are now handled within the SubTasks component

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 ipad:h-16 lg:h-16 shrink-0 items-center gap-2 border-b sticky top-0 bg-white z-50">
          <div className="flex items-center gap-2 px-2 ipad:px-4 lg:px-3 flex-1">
            <SidebarTrigger className="ipad:size-default lg:size-default" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <h1 className="text-base ipad:text-lg lg:text-xl font-bold mr-2 ipad:mr-3 lg:mr-4">
              SAS Job Board
            </h1>
            <Separator
              orientation="vertical"
              className="mr-2 h-4 hidden ipad:block"
            />
            <Breadcrumb className="hidden ipad:block">
              <BreadcrumbList>
                <BreadcrumbItem className="hidden ipad:block">
                  <BreadcrumbLink href="#">
                    SAS Auto Air-conditioning Service
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden ipad:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Job Dashboard</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <div className="ml-auto flex items-center gap-2 ipad:gap-3 lg:gap-4">
              <SignedIn>
                {loading ? (
                  <div className="text-xs ipad:text-sm lg:text-sm text-gray-500">
                    Loading permissions...
                  </div>
                ) : (
                  <>
                    <span className="text-xs ipad:text-sm lg:text-sm text-gray-600 hidden ipad:inline">
                      Role: <span className="font-medium">{displayRole}</span>
                    </span>
                    <CreateApprovalRequest />
                    {permissions.canCreateJobs && (
                      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                        <DialogTrigger asChild>
                          <Button
                            variant="default"
                            size="sm"
                            className="ipad:size-default lg:size-default"
                          >
                            <PlusIcon className="mr-1 ipad:mr-2 lg:mr-2 h-3 w-3 ipad:h-4 ipad:w-4 lg:h-4 lg:w-4" />
                            <span className="hidden ipad:inline">
                              Add New Job
                            </span>
                            <span className="ipad:hidden">Add</span>
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl ipad:max-w-3xl lg:max-w-4xl max-h-[85vh] ipad:max-h-[88vh] lg:max-h-[90vh] overflow-y-auto">
                          <form onSubmit={handleSubmit} className="w-full">
                            <DialogHeader>
                              <DialogTitle>Add New Job</DialogTitle>
                            </DialogHeader>

                            <div className="grid grid-cols-1 ipad:grid-cols-2 gap-4 ipad:gap-6 py-4">
                              {/* Left Column */}
                              <div className="space-y-4">
                                <div className="space-y-2">
                                  <VehicleNo
                                    value={localVehicleNo}
                                    onChange={setLocalVehicleNo}
                                  />
                                  {formErrors.vehicleNo && (
                                    <p className="text-sm text-red-500">
                                      {formErrors.vehicleNo}
                                    </p>
                                  )}
                                </div>

                                {/* Customer Information */}
                                <div className="space-y-4">
                                  <div className="flex items-center space-x-2">
                                    <Checkbox
                                      id="isCompanyVehicle"
                                      checked={isCompanyVehicle}
                                      onCheckedChange={(checked) => {
                                        const value = Boolean(checked);
                                        setIsCompanyVehicle(value);
                                        if (!value) setCompanyName("");
                                      }}
                                    />
                                    <Label htmlFor="isCompanyVehicle">
                                      Company Vehicle
                                    </Label>
                                  </div>
                                  {isCompanyVehicle && (
                                    <div className="space-y-2">
                                      <Label htmlFor="companyName">
                                        Company
                                      </Label>
                                      <Select
                                        value={companyName}
                                        onValueChange={setCompanyName}
                                      >
                                        <SelectTrigger>
                                          <SelectValue placeholder="Select a company" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {companies && companies.length > 0 ? (
                                            companies.map((c) => (
                                              <SelectItem
                                                key={c._id}
                                                value={c.name}
                                              >
                                                {c.name}
                                              </SelectItem>
                                            ))
                                          ) : (
                                            <SelectItem value="SAS Enterprise">
                                              SAS Enterprise
                                            </SelectItem>
                                          )}
                                        </SelectContent>
                                      </Select>
                                      {formErrors.companyName && (
                                        <p className="text-sm text-red-500">
                                          {formErrors.companyName}
                                        </p>
                                      )}
                                    </div>
                                  )}
                                  <div className="space-y-2">
                                    <Label htmlFor="customerName">
                                      Customer Name{" "}
                                      <span className="text-sm text-gray-500">
                                        (Optional - Required at billing)
                                      </span>
                                    </Label>
                                    <Input
                                      id="customerName"
                                      value={customerName}
                                      onChange={(
                                        e: React.ChangeEvent<HTMLInputElement>
                                      ) => setCustomerName(e.target.value)}
                                      placeholder="Enter customer name (can be added later)"
                                      className={
                                        formErrors.customerName
                                          ? "border-red-500"
                                          : ""
                                      }
                                    />
                                    {formErrors.customerName && (
                                      <p className="text-sm text-red-500">
                                        {formErrors.customerName}
                                      </p>
                                    )}
                                  </div>
                                  <div className="space-y-2">
                                    <Label htmlFor="customerPhone">
                                      Customer Phone{" "}
                                      <span className="text-sm text-gray-500">
                                        (Optional - Required at billing)
                                      </span>
                                    </Label>
                                    <Input
                                      id="customerPhone"
                                      type="tel"
                                      value={customerPhone}
                                      onChange={(
                                        e: React.ChangeEvent<HTMLInputElement>
                                      ) => setCustomerPhone(e.target.value)}
                                      placeholder="Enter customer phone (can be added later)"
                                      className={
                                        formErrors.customerPhone
                                          ? "border-red-500"
                                          : ""
                                      }
                                    />
                                    {formErrors.customerPhone && (
                                      <p className="text-sm text-red-500">
                                        {formErrors.customerPhone}
                                      </p>
                                    )}
                                  </div>
                                </div>

                                <ImageUpload
                                  onImageSelect={setLocalImageFile}
                                  uploadTask={uploadTask}
                                  selectedImages={localImageFile}
                                />

                                {/* Damage Documentation */}
                                <div className="space-y-4">
                                  <div className="space-y-2">
                                    <Label htmlFor="damageRemarks">
                                      Damage/Remarks
                                    </Label>
                                    <textarea
                                      id="damageRemarks"
                                      value={damageRemarks}
                                      onChange={(
                                        e: React.ChangeEvent<HTMLTextAreaElement>
                                      ) => setDamageRemarks(e.target.value)}
                                      placeholder="Note any existing damage or special remarks"
                                      className={`w-full p-2 border rounded-md resize-none ${
                                        formErrors.damageRemarks
                                          ? "border-red-500"
                                          : ""
                                      }`}
                                      rows={3}
                                    />
                                    {formErrors.damageRemarks && (
                                      <p className="text-sm text-red-500">
                                        {formErrors.damageRemarks}
                                      </p>
                                    )}
                                  </div>

                                  {/* Damage Photos with Enhanced UI */}
                                  <DamageImageUpload
                                    onImagesSelect={setDamageImageFiles}
                                    damageImages={damageImageFiles}
                                  />
                                </div>

                                <div>
                                  <Label>Current Status:</Label>
                                  <Select
                                    onValueChange={(value) =>
                                      setStatus(value as ColumnKey)
                                    }
                                    defaultValue={status}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="todo">Todo</SelectItem>
                                      <SelectItem value="inProgress">
                                        In Progress
                                      </SelectItem>
                                      <SelectItem value="finished">
                                        Finished
                                      </SelectItem>
                                      {/* Delivered option removed from Kanban view but status is kept for other functionality */}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>

                              {/* Right Column */}
                              <div className="space-y-4">
                                {/* Integrated SubTasks Component - Now Optional */}
                                <div className="space-y-4">
                                  <div className="space-y-2">
                                    <Label>Sub-Tasks (Optional)</Label>
                                    <p className="text-sm text-muted-foreground">
                                      Add services or parts to be completed for
                                      this job. You can also add them later.
                                    </p>
                                  </div>
                                  <div className="max-h-64 overflow-y-auto">
                                    <SubTasks
                                      setSubTasks={(newSubtasks) => {
                                        subTasksRef.current = newSubtasks;
                                        setSubtasks(newSubtasks); // Update state as well
                                      }}
                                    />
                                  </div>
                                  {subtasks.length === 0 && (
                                    <p className="text-sm text-muted-foreground italic">
                                      No sub-tasks added yet. Click "Add
                                      Sub-Task" to get started.
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>

                            <DialogFooter>
                              <Button
                                variant="default"
                                type="submit"
                                className="w-full"
                                disabled={isPending || isUploading}
                              >
                                {isPending
                                  ? "Saving..."
                                  : isUploading
                                  ? "Uploading..."
                                  : "Save Job"}
                              </Button>
                            </DialogFooter>
                          </form>
                        </DialogContent>
                      </Dialog>
                    )}
                    <div className="w-10 h-10 relative">
                      <UserButton
                        appearance={{
                          elements: {
                            avatarBox: "w-full h-full border-4 border-blue-100",
                          },
                        }}
                      />
                    </div>
                  </>
                )}
              </SignedIn>
              <SignedOut>
                <SignInButton mode="redirect">
                  <Button variant="default">Sign In</Button>
                </SignInButton>
              </SignedOut>
            </div>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-2 ipad:gap-3 lg:gap-4 p-2 ipad:p-4 lg:p-4">
          <SignedIn>
            <div className="w-full max-w-screen-2xl mx-auto flex flex-col">
              <Toaster
                position="top-right"
                toastOptions={{
                  className: "font-sans",
                  success: {
                    iconTheme: { primary: "#4CAF50", secondary: "white" },
                  },
                  error: {
                    iconTheme: { primary: "#f44336", secondary: "white" },
                  },
                }}
              />

              {/* Today's Jobs & Income Section - Admin Only */}
              {permissions.canViewAllReports && (
                <div className="mb-6 ipad:mb-8">
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 ipad:p-6 border border-blue-100">
                    <div className="flex flex-col ipad:flex-row ipad:items-center ipad:justify-between mb-4 ipad:mb-6">
                      <div>
                        <h2 className="text-xl ipad:text-2xl font-bold text-gray-900 mb-2">
                          📊 Today's Summary
                        </h2>
                        <p className="text-sm ipad:text-base text-gray-600">
                          {new Date().toLocaleDateString("en-US", {
                            weekday: "long",
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </p>
                      </div>
                      <div className="flex flex-col ipad:flex-row gap-4 ipad:gap-6 mt-4 ipad:mt-0">
                        <div className="bg-white rounded-lg p-4 ipad:p-5 border border-blue-200 shadow-sm">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 ipad:w-12 ipad:h-12 bg-green-100 rounded-full flex items-center justify-center">
                              <span className="text-green-600 text-lg ipad:text-xl">
                                ✓
                              </span>
                            </div>
                            <div>
                              <p className="text-sm ipad:text-base text-gray-600">
                                Jobs Completed
                              </p>
                              <p className="text-2xl ipad:text-3xl font-bold text-gray-900">
                                {todayJobsLoading ? (
                                  <div className="animate-pulse bg-gray-200 h-8 ipad:h-10 w-16 ipad:w-20 rounded"></div>
                                ) : (
                                  todayJobs.length
                                )}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="bg-white rounded-lg p-4 ipad:p-5 border border-blue-200 shadow-sm">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 ipad:w-12 ipad:h-12 bg-blue-100 rounded-full flex items-center justify-center">
                              <span className="text-blue-600 text-lg ipad:text-xl">
                                💰
                              </span>
                            </div>
                            <div>
                              <p className="text-sm ipad:text-base text-gray-600">
                                Income Today
                              </p>
                              <p className="text-2xl ipad:text-3xl font-bold text-gray-900">
                                {todayJobsLoading ? (
                                  <div className="animate-pulse bg-gray-200 h-8 ipad:h-10 w-24 ipad:w-32 rounded"></div>
                                ) : (
                                  `Rs. ${todayIncome.toLocaleString()}`
                                )}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Admin link to see detailed jobs */}
                    <div className="bg-white rounded-lg border border-blue-200 shadow-sm p-4 ipad:p-6 text-center">
                      <p className="text-gray-600 text-sm ipad:text-base mb-3">
                        View detailed job completion data in the admin section
                      </p>
                      <Button
                        variant="outline"
                        onClick={() =>
                          (window.location.href =
                            "/dashboard/admin/todays-jobs")
                        }
                      >
                        View Today's Completed Jobs
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              <KanbanBoard />
              <BankDetails
                isOpen={isOpen}
                handleClose={() => setIsOpen(false)}
              />
            </div>
          </SignedIn>
          <SignedOut>
            <div className="flex flex-col items-center justify-center flex-1">
              <div className="text-center space-y-4">
                <div className="text-6xl">🔒</div>
                <h1 className="text-3xl font-bold text-gray-800">
                  Authentication Required
                </h1>
                <p className="text-gray-600">Please sign in to continue</p>
              </div>
            </div>
          </SignedOut>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default Dashboard;
