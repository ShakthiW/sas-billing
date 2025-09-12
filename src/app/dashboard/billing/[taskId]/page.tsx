"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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
import {
  updateJobStatus,
  getAllJobs,
  createBill,
  createDraftBill,
} from "@/app/api/actions";
import { Task, Bill } from "@/app/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GrAdd } from "react-icons/gr";
import { getAllBankAccounts } from "@/app/api/actions";
import { BankAccount } from "@/types/bank";
import ChequeImageUpload from "@/components/billing/ChequeImageUpload";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebaseClient";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import BillPreview from "@/components/BillPreview";

// Firebase app and storage are initialized in src/lib/firebaseClient

export default function BillingPage() {
  const params = useParams();
  const router = useRouter();
  const taskId = params.taskId as string;
  const [task, setTask] = useState<Task | null>(null);
  const [totalAmount, setTotalAmount] = useState<string>("");
  const [commission, setCommission] = useState<string>("0");
  const [showCommission, setShowCommission] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [additionalServices, setAdditionalServices] = useState<string[]>([]);
  const [newService, setNewService] = useState<string>("");
  const [selectedBank, setSelectedBank] = useState<string>("");
  const [vehicleType, setVehicleType] = useState<string>("");
  const [customerName, setCustomerName] = useState<string>("");
  const [customerPhone, setCustomerPhone] = useState<string>("");
  const [driverName, setDriverName] = useState<string>("");
  const [clientType, setClientType] = useState<"Customer" | "Company">(
    "Customer"
  );
  const [paymentType, setPaymentType] = useState<
    "Cash" | "Credit" | "Cheque" | "Unspecified"
  >("Unspecified");
  const [initialPayment, setInitialPayment] = useState<string>("");
  const [chequeNumber, setChequeNumber] = useState<string>("");
  const [chequeDate, setChequeDate] = useState<string>("");
  const [bankName, setBankName] = useState<string>("");
  const [dueDate, setDueDate] = useState<string>("");
  const [creditTerms, setCreditTerms] = useState<string>("");
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [loadingBanks, setLoadingBanks] = useState(false);
  const [chequeImageFile, setChequeImageFile] = useState<File | null>(null);
  const [remarks, setRemarks] = useState<string>("");
  const [isGeneratingBill, setIsGeneratingBill] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewBillData, setPreviewBillData] = useState<Bill | null>(null);
  const [formIsValid, setFormIsValid] = useState(false);
  const { permissions, role } = useUserPermissions();

  useEffect(() => {
    const fetchTaskDetails = async () => {
      try {
        setLoadingBanks(true);

        // Fetch task details
        const jobs = await getAllJobs();
        let finishedTask = jobs.finished.find((job) => job.id === taskId);

        if (finishedTask) {
          // If the task has subtasks, try to fetch detailed service/part descriptions
          if (finishedTask.subTasks && finishedTask.subTasks.length > 0) {
            // Enhanced task with enriched subtask information including descriptions
            const enrichedSubtasks = await Promise.all(
              finishedTask.subTasks.map(async (subtask: any) => {
                try {
                  if (subtask.taskType === "service" && subtask.serviceType) {
                    // Fetch service details to get description
                    const serviceResponse = await fetch(
                      `/api/services?search=${encodeURIComponent(
                        subtask.serviceType
                      )}`
                    );
                    if (serviceResponse.ok) {
                      const services = await serviceResponse.json();
                      const matchingService = services.find(
                        (s: any) =>
                          s.name.toLowerCase() ===
                          subtask.serviceType.toLowerCase()
                      );

                      if (matchingService && matchingService.description) {
                        return {
                          ...subtask,
                          serviceDescription: matchingService.description,
                        };
                      }
                    }
                  } else if (
                    subtask.taskType === "parts" &&
                    subtask.partsType
                  ) {
                    // Fetch part details to get description
                    const partResponse = await fetch(
                      `/api/parts?search=${encodeURIComponent(
                        subtask.partsType
                      )}&brand=${encodeURIComponent(subtask.partsBrand || "")}`
                    );
                    if (partResponse.ok) {
                      const parts = await partResponse.json();
                      const matchingPart = parts.find(
                        (p: any) =>
                          p.name.toLowerCase() ===
                            subtask.partsType.toLowerCase() &&
                          (!subtask.partsBrand ||
                            p.brand.toLowerCase() ===
                              subtask.partsBrand.toLowerCase())
                      );

                      if (matchingPart && matchingPart.description) {
                        return {
                          ...subtask,
                          partsDescription: matchingPart.description,
                        };
                      }
                    }
                  }
                } catch (err) {
                  console.error(
                    `Failed to fetch details for ${subtask.taskType}:`,
                    err
                  );
                }

                // Return the original subtask if we couldn't enhance it
                return subtask;
              })
            );

            // Update the task with enriched subtasks
            finishedTask = {
              ...finishedTask,
              subTasks: enrichedSubtasks,
            };
          }

          setTask({ ...finishedTask, column: "finished" });

          // Pre-populate customer details if available from the task
          if (finishedTask.customerName) {
            setCustomerName(finishedTask.customerName);
          }
          if (finishedTask.customerPhone) {
            setCustomerPhone(finishedTask.customerPhone);
          }
        }

        // Fetch bank accounts
        const allAccounts = await getAllBankAccounts();

        // Filter tax accounts based on user role
        const filteredAccounts = allAccounts.filter((account) => {
          // If it's a tax account, only show to admins
          if (account.isTaxAccount || account.accountType === "Tax") {
            return role === "admin";
          }
          return true;
        });

        setBankAccounts(filteredAccounts);
      } catch (error) {
        console.error("Failed to fetch task details:", error);
      } finally {
        setLoading(false);
        setLoadingBanks(false);
      }
    };

    fetchTaskDetails();
  }, [taskId, role]);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Only allow numbers and decimals
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      setTotalAmount(value);
    }
  };

  const handleCommissionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      setCommission(value);
    }
  };

  const calculateFinalTotal = () => {
    const baseAmount = totalAmount ? parseFloat(totalAmount) : 0;
    const commissionAmount = commission ? parseFloat(commission) : 0;
    // Use precision-safe calculation (same as backend)
    const totalCents = Math.round(baseAmount * 100);
    const commissionCents = Math.round(commissionAmount * 100);
    const finalAmountCents = totalCents + commissionCents;
    return (finalAmountCents / 100).toFixed(2);
  };

  const validateBillForm = () => {
    const errors: string[] = [];

    if (
      !totalAmount ||
      isNaN(Number(totalAmount)) ||
      Number(totalAmount) <= 0
    ) {
      errors.push("Please enter a valid total amount.");
    }
    if (!commission || isNaN(Number(commission)) || Number(commission) < 0) {
      errors.push("Please enter a valid commission (0 or more).");
    }
    if (!vehicleType.trim()) {
      // Vehicle type is optional
    }
    if (!customerName.trim()) {
      errors.push(
        "Customer name is required for billing. Please enter the customer name."
      );
    }
    if (!customerPhone.trim()) {
      errors.push(
        "Customer phone is required for billing. Please enter the customer phone."
      );
    }
    // Bank account selection is optional for Credit and Cheque

    // Payment-specific validations
    if (paymentType === "Credit") {
      if (
        initialPayment &&
        (isNaN(Number(initialPayment)) || Number(initialPayment) < 0)
      ) {
        errors.push("Please enter a valid initial payment amount.");
      }
      if (
        initialPayment &&
        Number(initialPayment) > Number(calculateFinalTotal())
      ) {
        errors.push("Initial payment cannot be greater than the total amount.");
      }
    }

    if (paymentType === "Cheque") {
      if (!chequeNumber.trim()) {
        errors.push("Please enter the cheque number.");
      }
      if (!chequeDate) {
        errors.push("Please select the cheque date.");
      }
      if (!bankName.trim()) {
        errors.push("Please enter the bank name.");
      }
    }

    return errors;
  };

  // Check form validity whenever inputs change
  useEffect(() => {
    const isFormValid = () => {
      // Check basic required fields
      if (
        !totalAmount ||
        isNaN(Number(totalAmount)) ||
        Number(totalAmount) <= 0
      )
        return false;
      if (!commission || isNaN(Number(commission)) || Number(commission) < 0)
        return false;
      if (!customerName.trim()) return false;
      if (!customerPhone.trim()) return false;

      // Check payment type specific fields
      // Bank account selection is optional for Credit and Cheque

      if (paymentType === "Cheque") {
        if (!chequeNumber.trim()) return false;
        if (!chequeDate) return false;
        if (!bankName.trim()) return false;
      }

      return true;
    };

    setFormIsValid(isFormValid());
  }, [
    totalAmount,
    commission,
    customerName,
    customerPhone,
    paymentType,
    selectedBank,
    chequeNumber,
    chequeDate,
    bankName,
  ]);

  const handleAddService = () => {
    if (newService.trim()) {
      setAdditionalServices([...additionalServices, newService.trim()]);
      setNewService("");
    }
  };

  // Handler for showing bill preview before generating
  const handleShowBillPreview = () => {
    if (!task) {
      alert("No task loaded. Please try again.");
      return;
    }

    // Use the validation function
    const validationErrors = validateBillForm();
    if (validationErrors.length > 0) {
      alert(validationErrors.join("\n"));
      return;
    }

    // Prepare bill data for preview
    const billData: Bill = buildBillData(task);

    // Set the preview data and show the preview modal
    setPreviewBillData(billData);
    setShowPreview(true);
  };

  // Helper function to build bill data consistently
  const buildBillData = (taskData: Task): Bill => {
    // Upload cheque image will be handled in the final submission
    const selectedBankEntity = bankAccounts.find(
      (a) => a._id === selectedBank
    )?.entityLabel;
    return {
      jobId: taskData.id,
      vehicleNo: taskData.title,
      vehicleType: vehicleType.trim(),
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      driverName: driverName.trim() || undefined,
      clientType,
      services: [
        ...(taskData.subTasks?.map((subtask: any) => {
          // For both services and parts, we want to use their descriptions if available
          // If not, fall back to the previous format
          let description = "";
          if (subtask.taskType === "service") {
            // Use the full service description if available, otherwise use the service name
            if (subtask.serviceDescription) {
              description = subtask.serviceDescription;
            } else {
              description = `Service: ${subtask.serviceType}`;
            }
          } else {
            // Use the full part description if available, otherwise use the part name and brand
            if (subtask.partsDescription) {
              description = subtask.partsDescription;
            } else {
              description = `Parts: ${subtask.partsType}${
                subtask.partsBrand ? ` (${subtask.partsBrand})` : ""
              }`;
            }
          }
          return { description };
        }) || []),
        ...additionalServices.map((desc: string) => ({
          description: desc,
          isAdditional: true,
        })),
      ],
      totalAmount: parseFloat(totalAmount),
      commission: parseFloat(commission) || 0,
      finalAmount: parseFloat(calculateFinalTotal()),
      bankAccount: selectedBank,
      bankEntityLabel: selectedBankEntity,
      paymentType,
      status: "finalized",
      remarks: remarks.trim() || undefined,
      initialPayment:
        paymentType === "Credit" && initialPayment
          ? parseFloat(initialPayment)
          : undefined,
      remainingBalance:
        paymentType === "Credit"
          ? parseFloat(calculateFinalTotal()) -
            (initialPayment ? parseFloat(initialPayment) : 0)
          : 0,
      chequeDetails:
        paymentType === "Cheque"
          ? {
              chequeNumber: chequeNumber.trim() || undefined,
              chequeDate: chequeDate || undefined,
              bankName: bankName.trim() || undefined,
              chequeImageUrl: undefined, // Will be uploaded later
            }
          : undefined,
      creditDetails:
        paymentType === "Credit"
          ? {
              dueDate: dueDate || undefined,
              creditTerms: creditTerms.trim() || undefined,
            }
          : undefined,
      createdAt: new Date(),
    };
  };

  // Handler for generating bill and marking as delivered
  const handleGenerateBillAndDeliver = async () => {
    if (isGeneratingBill) {
      return; // Prevent multiple clicks
    }

    if (!task) {
      alert("No task loaded. Please try again.");
      return;
    }

    setIsGeneratingBill(true);
    setShowPreview(false); // Close the preview modal

    // Upload cheque image if provided
    let chequeImageUrl: string | undefined;
    if (paymentType === "Cheque" && chequeImageFile) {
      try {
        const uniqueFileName = `cheques/${crypto.randomUUID()}-${
          chequeImageFile.name
        }`;
        const storageRef = ref(storage, uniqueFileName);
        const uploadTaskSnapshot = await uploadBytesResumable(
          storageRef,
          chequeImageFile
        );
        chequeImageUrl = await getDownloadURL(uploadTaskSnapshot.ref);
      } catch (error: any) {
        console.error("Cheque image upload failed:", error);
        alert(
          "Failed to upload cheque image. Do you want to continue without it?"
        );
        // You could add a confirmation dialog here
      }
    }

    // Build bill data
    const billData: Bill = buildBillData(task);

    // Add cheque image URL if uploaded
    if (paymentType === "Cheque" && chequeImageFile && billData.chequeDetails) {
      billData.chequeDetails.chequeImageUrl = chequeImageUrl || undefined;
    }

    try {
      // Save bill to database first, passing additional services
      const billResult = await createBill(billData, additionalServices);

      if (billResult.success) {
        // Update job status to delivered
        await updateJobStatus(task.id, "delivered");

        // Redirect to receipt page using the bill ID
        router.push(`/dashboard/receipt/${billResult.billId}`);
      } else {
        alert("Failed to create bill. Please try again.");
      }
    } catch (err) {
      console.error("Error in bill generation:", err);
      alert("Failed to generate bill and mark as delivered. Please try again.");
    } finally {
      setIsGeneratingBill(false);
    }
  };

  // Handler for saving as draft bill
  const handleSaveAsDraft = async () => {
    if (!task) {
      alert("No task loaded. Please try again.");
      return;
    }

    // Basic validations for draft bill (less strict than finalized)
    if (
      !totalAmount ||
      isNaN(Number(totalAmount)) ||
      Number(totalAmount) <= 0
    ) {
      alert("Please enter a valid total amount.");
      return;
    }
    if (!commission || isNaN(Number(commission)) || Number(commission) < 0) {
      alert("Please enter a valid commission (0 or more).");
      return;
    }
    // Vehicle type is optional for draft bills
    if (!customerName.trim()) {
      alert("Please enter the customer name.");
      return;
    }
    if (paymentType !== "Cash" && !selectedBank) {
      alert("Please select a bank account.");
      return;
    }

    // Upload cheque image if provided (for draft bills too)
    let chequeImageUrl: string | undefined;
    if (paymentType === "Cheque" && chequeImageFile) {
      try {
        const uniqueFileName = `cheques/${crypto.randomUUID()}-${
          chequeImageFile.name
        }`;
        const storageRef = ref(storage, uniqueFileName);
        const uploadTaskSnapshot = await uploadBytesResumable(
          storageRef,
          chequeImageFile
        );
        chequeImageUrl = await getDownloadURL(uploadTaskSnapshot.ref);
      } catch (error: any) {
        console.error("Cheque image upload failed:", error);
        // For drafts, we can continue without the image
      }
    }

    // Build draft bill data (without status since createDraftBill handles it)
    const draftBillData = {
      jobId: task.id,
      vehicleNo: task.title,
      vehicleType: vehicleType.trim(),
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      driverName: driverName.trim() || undefined,
      clientType,
      services: [
        ...(task.subTasks?.map((subtask: any) => {
          // For both services and parts, we want to use their descriptions if available
          // If not, fall back to the previous format
          let description = "";
          if (subtask.taskType === "service") {
            // Use the full service description if available, otherwise use the service name
            if (subtask.serviceDescription) {
              description = subtask.serviceDescription;
            } else {
              description = `Service: ${subtask.serviceType}`;
            }
          } else {
            // Use the full part description if available, otherwise use the part name and brand
            if (subtask.partsDescription) {
              description = subtask.partsDescription;
            } else {
              description = `Parts: ${subtask.partsType}${
                subtask.partsBrand ? ` (${subtask.partsBrand})` : ""
              }`;
            }
          }
          return { description };
        }) || []),
        ...additionalServices.map((desc: string) => ({
          description: desc,
          isAdditional: true,
        })),
      ],
      totalAmount: parseFloat(totalAmount),
      commission: parseFloat(commission) || 0,
      finalAmount: parseFloat(calculateFinalTotal()),
      bankAccount: selectedBank,
      bankEntityLabel: bankAccounts.find((a) => a._id === selectedBank)
        ?.entityLabel,
      paymentType,
      remarks: remarks.trim() || undefined,
      initialPayment:
        paymentType === "Credit" && initialPayment
          ? parseFloat(initialPayment)
          : undefined,
      remainingBalance:
        paymentType === "Credit"
          ? parseFloat(calculateFinalTotal()) -
            (initialPayment ? parseFloat(initialPayment) : 0)
          : 0,
      chequeDetails:
        paymentType === "Cheque"
          ? {
              chequeNumber: chequeNumber.trim() || undefined,
              chequeDate: chequeDate || undefined,
              bankName: bankName.trim() || undefined,
              chequeImageUrl: chequeImageUrl || undefined,
            }
          : undefined,
      creditDetails:
        paymentType === "Credit"
          ? {
              dueDate: dueDate || undefined,
              creditTerms: creditTerms.trim() || undefined,
            }
          : undefined,
      createdAt: new Date(),
    };

    try {
      const billResult = await createDraftBill(
        draftBillData,
        additionalServices
      );

      if (billResult.success) {
        alert(
          "Draft bill saved successfully! You can finalize it later from the Draft Bills page."
        );
        router.push("/dashboard/draft-bills");
      } else {
        alert("Failed to save draft bill. Please try again.");
      }
    } catch (err) {
      console.error("Error saving draft bill:", err);
      alert("Failed to save draft bill. Please try again.");
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b sticky top-0 bg-white z-50">
          <div className="flex items-center gap-2 px-3 flex-1">
            <SidebarTrigger />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <h1 className="text-xl font-bold mr-4">Billing</h1>
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
                    <Link href="/dashboard/finished-jobs">Finished Jobs</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>Billing</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div className="container mx-auto py-10 px-5">
          <Card>
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <span>Invoice for {task?.title}</span>
                <span className="text-sm text-muted-foreground">
                  Date: {new Date().toLocaleDateString()}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Customer Details */}
                <div className="border-b pb-4">
                  <h3 className="font-semibold mb-4">Vehicle Details</h3>
                  <div className="grid grid-cols-1 gap-4">
                    <div className="grid grid-cols-1 ipad:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="vehicleNumber">Vehicle Number</Label>
                        <Input
                          id="vehicleNumber"
                          value={task?.title || ""}
                          disabled
                          className="bg-muted"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="vehicleType">Vehicle Type</Label>
                        <Input
                          id="vehicleType"
                          value={vehicleType}
                          onChange={(e) => setVehicleType(e.target.value)}
                          placeholder="Enter vehicle type"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 ipad:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="customerName">
                          Customer Name <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="customerName"
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          placeholder="Enter customer name (required for billing)"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="customerPhone">
                          Customer Phone <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="customerPhone"
                          type="tel"
                          value={customerPhone}
                          onChange={(e) => setCustomerPhone(e.target.value)}
                          placeholder="Enter customer phone (required for billing)"
                          required
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 ipad:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="clientType">Client Type</Label>
                        <Select
                          value={clientType}
                          onValueChange={(value: "Customer" | "Company") =>
                            setClientType(value)
                          }
                        >
                          <SelectTrigger id="clientType">
                            <SelectValue placeholder="Select client type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Customer">Customer</SelectItem>
                            <SelectItem value="Company">Company</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 ipad:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="driverName">
                          Driver Name{" "}
                          <span className="text-sm text-muted-foreground">
                            (Optional)
                          </span>
                        </Label>
                        <Input
                          id="driverName"
                          value={driverName}
                          onChange={(e) => setDriverName(e.target.value)}
                          placeholder="Enter driver name"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Services List */}
                <div className="border-b pb-4">
                  <h3 className="font-semibold mb-4">Services Performed</h3>
                  <div className="space-y-2">
                    {task?.subTasks?.map((subtask: any, index: number) => (
                      <div
                        key={index}
                        className="flex items-center justify-between py-2 border-b last:border-0"
                      >
                        <span className="text-sm">
                          {subtask.taskType === "service"
                            ? `Service: ${
                                subtask.serviceDescription ||
                                subtask.serviceType
                              }`
                            : `Parts: ${
                                subtask.partsDescription ||
                                `${subtask.partsType} (${subtask.partsBrand})`
                              }`}
                        </span>
                        <span className="text-sm text-muted-foreground">✓</span>
                      </div>
                    ))}

                    {/* Additional Services */}
                    {additionalServices.map(
                      (service: string, index: number) => (
                        <div
                          key={`additional-${index}`}
                          className="flex items-center justify-between py-2 border-b last:border-0"
                        >
                          <span className="text-sm">{service}</span>
                          <span className="text-sm text-muted-foreground">
                            ✓
                          </span>
                        </div>
                      )
                    )}

                    {/* Add Service Input */}
                    <div className="flex gap-2 mt-4">
                      <Input
                        value={newService}
                        onChange={(e) => setNewService(e.target.value)}
                        placeholder="Enter additional service"
                        className="flex-1"
                      />
                      <Button
                        onClick={handleAddService}
                        disabled={!newService.trim()}
                        type="button"
                      >
                        Add Service
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Pricing Section */}
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="totalAmount">
                        Base Amount (Rs.){" "}
                        <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="totalAmount"
                        type="number"
                        inputMode="decimal"
                        step="100.00"
                        min="0"
                        value={totalAmount}
                        onChange={handleAmountChange}
                        placeholder="Enter base amount"
                        className="max-w-[200px]"
                      />
                    </div>

                    {/* Commission field - hidden by default */}
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowCommission(!showCommission)}
                          className="h-auto p-1"
                        >
                          <GrAdd className="h-4 w-4" />
                        </Button>
                        {showCommission && (
                          <Label htmlFor="commission">
                            Tax/Commission (Rs.){" "}
                            <span className="text-red-500">*</span>
                          </Label>
                        )}
                      </div>
                      {showCommission && (
                        <Input
                          id="commission"
                          type="number"
                          inputMode="decimal"
                          step="0.01"
                          min="0"
                          value={commission}
                          onChange={handleCommissionChange}
                          placeholder="Enter tax/commission"
                          className="max-w-[200px]"
                        />
                      )}
                    </div>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span>Base Amount:</span>
                        <span>Rs. {totalAmount || "0"}</span>
                      </div>
                      {(showCommission || Number(commission) > 0) && (
                        <div className="flex items-center justify-between">
                          <span>Tax/Commission:</span>
                          <span>Rs. {commission || "0"}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between pt-2 border-t font-semibold">
                        <span>Total Amount:</span>
                        <span>Rs. {calculateFinalTotal()}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Payment Options Section */}
                <div className="space-y-4 pt-4 border-t">
                  <Label htmlFor="paymentType">
                    Payment Type <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={paymentType}
                    onValueChange={(value: any) => setPaymentType(value)}
                  >
                    <SelectTrigger id="paymentType" className="w-[300px]">
                      <SelectValue placeholder="Please select an option" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Unspecified">
                        Please select an option
                      </SelectItem>
                      <SelectItem value="Cash">Cash Payment</SelectItem>
                      <SelectItem value="Credit">Credit Payment</SelectItem>
                      <SelectItem value="Cheque">Cheque Payment</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Bank Account Selection - Only show if payment type is not Cash */}
                  {(paymentType === "Credit" || paymentType === "Cheque") && (
                    <div className="space-y-4 mt-4">
                      <Label htmlFor="bankAccount">
                        Select Bank Account (optional)
                      </Label>
                      <Select
                        value={selectedBank || "__none__"}
                        onValueChange={(val) =>
                          setSelectedBank(val === "__none__" ? "" : val)
                        }
                      >
                        <SelectTrigger id="bankAccount" className="w-[300px]">
                          <SelectValue placeholder="Select a bank account" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">
                            Select a bank account
                          </SelectItem>
                          {bankAccounts.map((account) => {
                            const balancePercentage =
                              ((account.totalBalance - account.currentBalance) /
                                account.totalBalance) *
                              100;
                            const percentageColor =
                              balancePercentage < 50
                                ? "text-green-600"
                                : balancePercentage < 75
                                ? "text-yellow-600"
                                : "text-red-600";

                            return (
                              <SelectItem
                                key={account._id}
                                value={account._id || ""}
                              >
                                <div className="flex justify-between items-center gap-4">
                                  <div className="flex items-center gap-2">
                                    <div>
                                      <span className="font-medium">
                                        {account.accountName}
                                      </span>
                                      <span className="text-sm text-muted-foreground ml-2">
                                        ({account.accountNumber})
                                      </span>
                                      {account.entityLabel && (
                                        <span className="text-xs text-gray-600 ml-2">
                                          • {account.entityLabel}
                                        </span>
                                      )}
                                    </div>
                                    {(account.isTaxAccount ||
                                      account.accountType === "Tax") && (
                                      <span className="px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded-full font-medium">
                                        TAX
                                      </span>
                                    )}
                                  </div>
                                  <div className={`text-sm ${percentageColor}`}>
                                    {(100 - balancePercentage).toFixed(1)}%
                                    remaining
                                  </div>
                                </div>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>

                      {selectedBank && (
                        <div className="text-sm text-muted-foreground space-y-2">
                          {(() => {
                            const account = bankAccounts.find(
                              (a) => a._id === selectedBank
                            );
                            if (account) {
                              const newBalance =
                                account.currentBalance -
                                parseFloat(calculateFinalTotal());
                              const remainingPercentage =
                                ((account.totalBalance - newBalance) /
                                  account.totalBalance) *
                                100;
                              const percentageColor =
                                remainingPercentage < 50
                                  ? "text-green-600"
                                  : remainingPercentage < 75
                                  ? "text-yellow-600"
                                  : "text-red-600";

                              return (
                                <>
                                  <div className="flex gap-4">
                                    <span>
                                      Current Balance: Rs.{" "}
                                      {account.currentBalance.toLocaleString()}
                                    </span>
                                    <span>•</span>
                                    <span>
                                      Total Balance: Rs.{" "}
                                      {account.totalBalance.toLocaleString()}
                                    </span>
                                  </div>
                                  <div
                                    className={`flex gap-4 ${percentageColor}`}
                                  >
                                    <span>
                                      Balance after payment: Rs.{" "}
                                      {newBalance.toLocaleString()}
                                    </span>
                                    <span>•</span>
                                    <span>
                                      {(100 - remainingPercentage).toFixed(1)}%
                                      remaining
                                    </span>
                                  </div>
                                </>
                              );
                            }
                            return null;
                          })()}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Credit Payment Details */}
                  {paymentType === "Credit" && (
                    <div className="space-y-4 p-4 border rounded-lg bg-blue-50">
                      <h4 className="font-semibold text-blue-800">
                        Credit Payment Details
                      </h4>
                      <div className="grid grid-cols-1 ipad:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="initialPayment">
                            Initial Payment (Rs.)
                          </Label>
                          <Input
                            id="initialPayment"
                            type="number"
                            inputMode="decimal"
                            step="0.01"
                            min="0"
                            value={initialPayment}
                            onChange={(e) => {
                              const value = e.target.value;
                              if (value === "" || /^\d*\.?\d*$/.test(value)) {
                                setInitialPayment(value);
                              }
                            }}
                            placeholder="Enter initial payment amount"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="dueDate">Due Date</Label>
                          <Input
                            id="dueDate"
                            type="date"
                            value={dueDate}
                            onChange={(e) => setDueDate(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="creditTerms">Credit Terms</Label>
                        <Input
                          id="creditTerms"
                          type="text"
                          value={creditTerms}
                          onChange={(e) => setCreditTerms(e.target.value)}
                          placeholder="Enter credit terms (e.g., Net 30 days)"
                        />
                      </div>
                      {initialPayment && (
                        <div className="text-sm text-blue-700 font-medium">
                          Remaining Balance: Rs.{" "}
                          {(
                            parseFloat(calculateFinalTotal()) -
                            (parseFloat(initialPayment) || 0)
                          ).toFixed(2)}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Cheque Payment Details */}
                  {paymentType === "Cheque" && (
                    <div className="space-y-4 p-4 border rounded-lg bg-green-50">
                      <h4 className="font-semibold text-green-800">
                        Cheque Payment Details
                      </h4>
                      <div className="grid grid-cols-1 ipad:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="chequeNumber">
                            Cheque Number{" "}
                            <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            id="chequeNumber"
                            type="text"
                            value={chequeNumber}
                            onChange={(e) => setChequeNumber(e.target.value)}
                            placeholder="Enter cheque number"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="chequeDate">
                            Cheque Date <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            id="chequeDate"
                            type="date"
                            value={chequeDate}
                            onChange={(e) => setChequeDate(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="bankName">
                          Bank Name <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="bankName"
                          type="text"
                          value={bankName}
                          onChange={(e) => setBankName(e.target.value)}
                          placeholder="Enter bank name"
                        />
                      </div>
                      <ChequeImageUpload onImageSelect={setChequeImageFile} />
                    </div>
                  )}
                </div>

                {/* Remarks Section (Optional) with 100 character limit */}
                <div className="space-y-2 pt-4 border-t">
                  <div className="flex justify-between">
                    <Label htmlFor="remarks">Remarks (Optional)</Label>
                    <span
                      className={`text-xs ${
                        remarks.length > 100
                          ? "text-red-500 font-semibold"
                          : "text-gray-500"
                      }`}
                    >
                      {remarks.length}/100 characters
                    </span>
                  </div>
                  <textarea
                    id="remarks"
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value.slice(0, 100))}
                    placeholder="Enter any remarks for this bill (max 100 characters)"
                    className={`w-full min-h-[100px] rounded-md border ${
                      remarks.length > 100 ? "border-red-500" : "border-input"
                    } bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50`}
                    maxLength={100}
                  />
                </div>

                <div className="flex justify-end gap-4 mt-6">
                  <Button variant="outline" onClick={handleSaveAsDraft}>
                    Save as Draft
                  </Button>
                  <Button
                    onClick={handleShowBillPreview}
                    disabled={isGeneratingBill || !formIsValid}
                  >
                    {isGeneratingBill ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Generating Bill...
                      </>
                    ) : formIsValid ? (
                      "Preview Bill & Mark as Delivered"
                    ) : (
                      "Please Complete Required Fields (*)"
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bill Preview Modal */}
        {previewBillData && (
          <BillPreview
            isOpen={showPreview}
            onClose={() => setShowPreview(false)}
            onConfirm={handleGenerateBillAndDeliver}
            billData={
              previewBillData as Omit<Bill, "createdAt"> & { createdAt?: Date }
            }
            task={task}
          />
        )}
      </SidebarInset>
    </SidebarProvider>
  );
}
