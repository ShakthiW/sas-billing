"use client";

import { useState, useEffect, useCallback } from "react";
import { Task, SubTask, ColumnKey } from "@/app/types";
import {
  updateImageUrl,
  updateVehicleNumber,
  updateJobStatus,
  addSubtasksToJob,
  updateSubtaskCompletion,
  updateCustomerDetails,
} from "@/app/api/actions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
import { toast } from "react-hot-toast";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebaseClient";
import Image from "@/components/RemoteImage";
import { v4 as uuidv4 } from "uuid";
import { useQueryClient } from "@tanstack/react-query";
import { jobsQueryKey } from "@/hooks/useJobs";
import { Loader2, Plus, Search } from "lucide-react";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { BrandCombobox } from "@/components/BrandCombobox";
import { PartBrand } from "@/types/services-parts";

// Firebase app and storage are initialized in src/lib/firebaseClient

// Updated status configuration with only the allowed statuses
const statusConfig = {
  todo: { label: "To Do", value: "todo" },
  inProgress: { label: "In Progress", value: "inProgress" },
  finished: { label: "Finished", value: "finished" },
  delivered: { label: "Delivered", value: "delivered" },
};

interface TaskUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task;
}

export default function TaskUpdateModal({
  isOpen,
  onClose,
  task,
}: TaskUpdateModalProps) {
  const queryClient = useQueryClient();
  const { role } = useUserPermissions();
  const [vehicleNo, setVehicleNo] = useState(task.title);
  const [status, setStatus] = useState(task.column);
  const [localSubtasks, setLocalSubtasks] = useState<SubTask[]>(
    task.subTasks || []
  );
  const [newSubtasks, setNewSubtasks] = useState<SubTask[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(
    task.imageUrl || null
  );
  const [localImageFile, setLocalImageFile] = useState<File | null>(null);
  const [remarks, setRemarks] = useState(task.damageRemarks || "");
  const [remarksImages, setRemarksImages] = useState<File[]>([]);
  const [remarksImagePreviews, setRemarksImagePreviews] = useState<string[]>(
    []
  );
  const [existingDamagePhotos, setExistingDamagePhotos] = useState<string[]>(
    task.damagePhotos || []
  );

  // Subtask dialog state
  const [showAddSubtaskDialog, setShowAddSubtaskDialog] = useState(false);
  const [subtaskMenuStep, setSubtaskMenuStep] = useState<
    "main" | "services" | "parts" | "brands" | "addService" | "addPart"
  >("main");
  const [selectedPartType, setSelectedPartType] = useState<string | null>(null);

  // Dynamic data from database
  const [services, setServices] = useState<any[]>([]);
  const [parts, setParts] = useState<any[]>([]);
  const [brands, setBrands] = useState<PartBrand[]>([]);
  const [loading, setLoading] = useState(false);

  // Search states
  const [serviceSearch, setServiceSearch] = useState("");
  const [partSearch, setPartSearch] = useState("");
  const [brandSearch, setBrandSearch] = useState("");

  // New service/part form states
  const [newServiceName, setNewServiceName] = useState("");
  const [newServiceCategory, setNewServiceCategory] = useState("");
  const [newServiceDescription, setNewServiceDescription] = useState("");
  const [newServiceDuration, setNewServiceDuration] = useState("");
  const [newServicePrice, setNewServicePrice] = useState("");

  const [newPartName, setNewPartName] = useState("");
  const [newPartBrand, setNewPartBrand] = useState("");
  const [newPartCategory, setNewPartCategory] = useState("");
  const [newPartNumber, setNewPartNumber] = useState("");
  const [newPartDescription, setNewPartDescription] = useState("");
  const [newPartPrice, setNewPartPrice] = useState("");
  const [newPartStock, setNewPartStock] = useState("");
  const [newPartMinStock, setNewPartMinStock] = useState("");

  // Fetch services from database
  const fetchServices = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/services");
      if (response.ok) {
        const data = await response.json();
        setServices(data);
      }
    } catch (error) {
      console.error("Failed to fetch services:", error);
      toast.error("Failed to load services");
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch parts from database
  const fetchParts = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/parts");
      if (response.ok) {
        const data = await response.json();
        setParts(data);
      }
    } catch (error) {
      console.error("Failed to fetch parts:", error);
      toast.error("Failed to load parts");
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch brands from database
  const fetchBrands = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/parts/brands");
      if (response.ok) {
        const data = await response.json();
        setBrands(data);
      }
    } catch (error) {
      console.error("Failed to fetch brands:", error);
      toast.error("Failed to load brands");
    } finally {
      setLoading(false);
    }
  }, []);

  // Load data when dialog opens
  useEffect(() => {
    if (showAddSubtaskDialog) {
      if (subtaskMenuStep === "services" && services.length === 0) {
        fetchServices();
      } else if (subtaskMenuStep === "parts" && parts.length === 0) {
        fetchParts();
      } else if (subtaskMenuStep === "brands" && brands.length === 0) {
        fetchBrands();
      }
    }
  }, [
    showAddSubtaskDialog,
    subtaskMenuStep,
    services.length,
    parts.length,
    brands.length,
    fetchServices,
    fetchParts,
    fetchBrands,
  ]);

  const handleImageSelect = (files: FileList | null) => {
    if (files && files[0]) {
      const file = files[0];
      setLocalImageFile(file);
      const preview = URL.createObjectURL(file);
      setImagePreview(preview);
    }
  };

  const handleRemarksImageSelect = (files: FileList | null) => {
    if (files) {
      const newFiles = Array.from(files);
      setRemarksImages((prev) => [...prev, ...newFiles]);
      const previews = newFiles.map((file) => URL.createObjectURL(file));
      setRemarksImagePreviews((prev) => [...prev, ...previews]);
    }
  };

  useEffect(() => {
    return () => {
      if (imagePreview && imagePreview !== task.imageUrl) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview, task.imageUrl]);

  // Keep local copy of existing damage photos in sync when task or dialog opens
  useEffect(() => {
    setExistingDamagePhotos(task.damagePhotos || []);
  }, [task.damagePhotos, isOpen]);

  const handleRemoveExistingDamagePhoto = (index: number) => {
    if (
      confirm(
        "Remove this damage photo from the job? This will delete the reference from the job record."
      )
    ) {
      setExistingDamagePhotos((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const handleRemoveNewDamagePhoto = (index: number) => {
    setRemarksImages((prev) => prev.filter((_, i) => i !== index));
    setRemarksImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubtaskToggle = useCallback(
    async (subtaskId: string, isCompleted: boolean) => {
      try {
        await updateSubtaskCompletion(task.id, subtaskId, isCompleted);
        setLocalSubtasks((prev) =>
          prev.map((subtask) =>
            subtask.subtaskID === subtaskId
              ? { ...subtask, isCompleted }
              : subtask
          )
        );
        toast.success("Subtask updated successfully");
      } catch (error: any) {
        console.error("Failed to update subtask:", error);
        toast.error("Failed to update subtask: " + error.message);
      }
    },
    [task.id]
  );

  // Add subtask functions
  const handleAddSubtaskClick = () => {
    setShowAddSubtaskDialog(true);
    setSubtaskMenuStep("main");
  };

  const handleSelectService = (service: any) => {
    const newSubtask: SubTask = {
      subtaskID: uuidv4(),
      taskType: "service",
      serviceType: service.name || service,
      isCompleted: false,
    };
    setNewSubtasks((prev) => [...prev, newSubtask]);
    setShowAddSubtaskDialog(false);
    setSubtaskMenuStep("main");
    setServiceSearch("");
  };

  const handleSelectPartType = (part: any) => {
    setSelectedPartType(part.name || part);
    setSubtaskMenuStep("brands");
    // Don't auto-select brand, let user choose from all available brands
    if (brands.length === 0) {
      fetchBrands();
    }
  };

  const handleSelectBrand = (brand: string) => {
    if (!selectedPartType) return;

    const newSubtask: SubTask = {
      subtaskID: uuidv4(),
      taskType: "parts",
      partsType: selectedPartType,
      partsBrand: brand,
      isCompleted: false,
    };
    setNewSubtasks((prev) => [...prev, newSubtask]);
    setShowAddSubtaskDialog(false);
    setSubtaskMenuStep("main");
    setSelectedPartType(null);
    setPartSearch("");
    setBrandSearch("");
  };

  const handleSubtaskMenuBack = () => {
    if (subtaskMenuStep === "brands") {
      setSubtaskMenuStep("parts");
    } else if (subtaskMenuStep === "parts" || subtaskMenuStep === "services") {
      setSubtaskMenuStep("main");
    } else if (
      subtaskMenuStep === "addService" ||
      subtaskMenuStep === "addPart"
    ) {
      setSubtaskMenuStep("main");
      // Reset form fields
      setNewServiceName("");
      setNewServiceCategory("");
      setNewServiceDescription("");
      setNewServiceDuration("");
      setNewServicePrice("");

      setNewPartName("");
      setNewPartBrand("");
      setNewPartCategory("");
      setNewPartNumber("");
      setNewPartDescription("");
      setNewPartPrice("");
      setNewPartStock("");
      setNewPartMinStock("");
    }
  };

  const handleRemoveNewSubtask = (index: number) => {
    setNewSubtasks((prev) => prev.filter((_, i) => i !== index));
  };

  // Create new service
  const handleCreateService = async () => {
    if (!newServiceName.trim()) {
      toast.error("Service name is required");
      return;
    }

    try {
      setLoading(true);
      const response = await fetch("/api/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newServiceName,
          category: newServiceCategory || undefined,
          description: newServiceDescription || undefined,
          estimatedDuration: newServiceDuration
            ? parseInt(newServiceDuration)
            : undefined,
          defaultPrice: newServicePrice
            ? parseFloat(newServicePrice)
            : undefined,
        }),
      });

      if (response.ok) {
        toast.success("Service created successfully");
        handleSelectService({ name: newServiceName });
        setNewServiceName("");
        setNewServiceCategory("");
        setNewServiceDescription("");
        setNewServiceDuration("");
        setNewServicePrice("");
        setSubtaskMenuStep("main");
        fetchServices();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to create service");
      }
    } catch (error) {
      console.error("Failed to create service:", error);
      toast.error("Failed to create service");
    } finally {
      setLoading(false);
    }
  };

  // Create new part
  const handleCreatePart = async () => {
    if (!newPartName.trim() || !newPartBrand.trim()) {
      toast.error("Part name and brand are required");
      return;
    }

    try {
      setLoading(true);
      const response = await fetch("/api/parts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newPartName,
          brand: newPartBrand,
          category: newPartCategory || undefined,
          partNumber: newPartNumber || undefined,
          description: newPartDescription || undefined,
          defaultPrice: newPartPrice ? parseFloat(newPartPrice) : undefined,
          stockQuantity: newPartStock ? parseInt(newPartStock) : undefined,
          minStockLevel: newPartMinStock
            ? parseInt(newPartMinStock)
            : undefined,
        }),
      });

      if (response.ok) {
        toast.success("Part created successfully");
        const newSubtask: SubTask = {
          subtaskID: uuidv4(),
          taskType: "parts",
          partsType: newPartName,
          partsBrand: newPartBrand,
          isCompleted: false,
        };
        setNewSubtasks((prev) => [...prev, newSubtask]);
        setNewPartName("");
        setNewPartBrand("");
        setNewPartCategory("");
        setNewPartNumber("");
        setNewPartDescription("");
        setNewPartPrice("");
        setNewPartStock("");
        setNewPartMinStock("");
        setShowAddSubtaskDialog(false);
        setSubtaskMenuStep("main");
        fetchParts();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to create part");
      }
    } catch (error) {
      console.error("Failed to create part:", error);
      toast.error("Failed to create part");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveUpdates = async () => {
    setIsUploading(true);

    try {
      let newImageUrl = task.imageUrl;
      let uploadedRemarksImageUrls: string[] = [];

      // Upload image if changed
      if (localImageFile) {
        const uniqueFileName = `tasks/${crypto.randomUUID()}-${localImageFile.name
          }`;
        const storageRef = ref(storage, uniqueFileName);
        const uploadTask = uploadBytesResumable(storageRef, localImageFile);

        await new Promise((resolve, reject) => {
          uploadTask.on("state_changed", null, reject, async () => {
            try {
              newImageUrl = await getDownloadURL(uploadTask.snapshot.ref);
              resolve(newImageUrl);
            } catch (error) {
              reject(error);
            }
          });
        });
      }

      // Update Image URL (if changed)
      if (newImageUrl !== task.imageUrl && newImageUrl) {
        await updateImageUrl(task.id, newImageUrl);
      }

      // Vehicle number is read-only in the update modal

      // Update Status (if changed)
      if (status !== task.column) {
        await updateJobStatus(task.id, status);
      }

      // Upload remarks images if any
      if (remarksImages.length > 0) {
        for (const file of remarksImages) {
          const uniqueFileName = `damage_photos/${crypto.randomUUID()}-${file.name
            }`;
          const storageRef = ref(storage, uniqueFileName);
          const uploadTaskSnapshot = await uploadBytesResumable(
            storageRef,
            file
          );
          const url = await getDownloadURL(uploadTaskSnapshot.ref);
          uploadedRemarksImageUrls.push(url);
        }
      }

      // Save remarks and damage photos (including deletions and newly uploaded)
      const photosChanged =
        JSON.stringify(existingDamagePhotos) !==
        JSON.stringify(task.damagePhotos || []);

      if (
        remarks !== (task.damageRemarks || "") ||
        photosChanged ||
        uploadedRemarksImageUrls.length > 0
      ) {
        const finalDamagePhotos = [
          ...existingDamagePhotos,
          ...uploadedRemarksImageUrls,
        ];

        await updateCustomerDetails(task.id, {
          damageRemarks: remarks,
          damagePhotos: finalDamagePhotos,
        });
      }

      // Add new subtasks if any
      if (newSubtasks.length > 0) {
        await addSubtasksToJob(task.id, newSubtasks);
        setLocalSubtasks((prev) => [...prev, ...newSubtasks]);
        setNewSubtasks([]);
      }

      toast.success("Task updated successfully!");
      onClose();

      // Reset local image file after successful upload
      setLocalImageFile(null);

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: jobsQueryKey });
    } catch (error: any) {
      console.error("Failed to save updates:", error.message);
      toast.error("Failed to save updates: " + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  // Filter services based on search
  const filteredServices = services.filter((service) =>
    service.name.toLowerCase().includes(serviceSearch.toLowerCase())
  );

  // Get unique parts (by name)
  const uniqueParts = Array.from(
    new Map(parts.map((part) => [part.name, part])).values()
  ).filter((part) =>
    part.name.toLowerCase().includes(partSearch.toLowerCase())
  );

  // Filter brands based on search
  const filteredBrands = brands.filter((brand) =>
    brand.name.toLowerCase().includes(brandSearch.toLowerCase())
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl ipad:max-w-4xl max-h-[85vh] ipad:max-h-[88vh] lg:max-h-[90vh] overflow-y-auto p-4 ipad:p-5 sm:p-6 md:p-8">
        <DialogHeader>
          <DialogTitle>Update Task</DialogTitle>
          <DialogDescription>
            Make changes to your task here. Click save when you're done.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
          {/* Left Column */}
          <div className="space-y-4">
            {/* Vehicle Number - now always read-only */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="vehicleNo">Vehicle Number</Label>
              <Input
                id="vehicleNo"
                value={vehicleNo}
                disabled
                className="bg-gray-100 cursor-not-allowed"
              />
            </div>

            {/* Status Select - Updated with all available statuses */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={status}
                onValueChange={(value: string) => setStatus(value as ColumnKey)}
              >
                <SelectTrigger id="status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(statusConfig).map(([key, config]) => (
                    <SelectItem key={key} value={config.value}>
                      {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Remarks Section */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="remarks">Damage/Remarks</Label>
              <textarea
                id="remarks"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Note any existing damage or special remarks"
                className="w-full p-2 border rounded-md resize-none"
                rows={3}
              />
            </div>

            {/* Remarks Images Upload */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="remarksImages">Damage Photos</Label>
              <input
                id="remarksImages"
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => handleRemarksImageSelect(e.target.files)}
                className="w-full"
              />

              {/* Existing damage photos from the job */}
              {Array.isArray(existingDamagePhotos) &&
                existingDamagePhotos.length > 0 && (
                  <div className="mt-2">
                    <div className="text-xs text-muted-foreground mb-1">
                      Existing ({existingDamagePhotos.length})
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {existingDamagePhotos.map((url, index) => (
                        <div key={`existing-${index}`} className="relative">
                          <Image
                            src={url}
                            alt={`Existing damage ${index + 1}`}
                            width={80}
                            height={80}
                            className="w-full h-20 object-cover rounded-md"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              handleRemoveExistingDamagePhoto(index)
                            }
                            className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-5 h-5 leading-none flex items-center justify-center text-xs"
                            aria-label="Remove photo"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              {/* Newly selected images (not yet saved) */}
              {remarksImagePreviews.length > 0 && (
                <div className="mt-3">
                  <div className="text-xs text-muted-foreground mb-1">
                    To upload ({remarksImagePreviews.length})
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {remarksImagePreviews.map((preview, index) => (
                      <div key={`new-${index}`} className="relative">
                        <Image
                          src={preview}
                          alt={`Damage ${index + 1}`}
                          width={80}
                          height={80}
                          className="w-full h-20 object-cover rounded-md"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveNewDamagePhoto(index)}
                          className="absolute -top-2 -right-2 bg-gray-800 text-white rounded-full w-5 h-5 leading-none flex items-center justify-center text-xs"
                          aria-label="Remove selected photo"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Image Upload Section */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="image">Vehicle Image</Label>
              <input
                id="image"
                type="file"
                accept="image/*"
                onChange={(e) => handleImageSelect(e.target.files)}
                className="w-full"
              />
              {imagePreview && (
                <div className="mt-2">
                  <Image
                    width={128}
                    height={96}
                    src={imagePreview}
                    alt="Task image"
                    className="rounded-md object-cover"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Subtasks */}
          <div className="space-y-4">
            <Label>Sub-Tasks</Label>

            {/* Display existing subtasks */}
            <div className="space-y-2 max-h-48 overflow-y-auto border rounded-md p-3">
              {localSubtasks.length === 0 ? (
                <p className="text-sm text-muted-foreground">No subtasks yet</p>
              ) : (
                localSubtasks.map((subtask) => (
                  <div
                    key={subtask.subtaskID}
                    className="flex items-center space-x-2"
                  >
                    <Checkbox
                      checked={subtask.isCompleted}
                      onCheckedChange={(checked) =>
                        handleSubtaskToggle(
                          subtask.subtaskID,
                          checked as boolean
                        )
                      }
                    />
                    <Label className="text-sm">
                      {subtask.taskType === "service"
                        ? `Service: ${subtask.serviceType}`
                        : `Parts: ${subtask.partsType} (${subtask.partsBrand})`}
                    </Label>
                  </div>
                ))
              )}
            </div>

            {/* Display new subtasks to be added */}
            {newSubtasks.length > 0 && (
              <div className="space-y-2 border-t pt-2">
                <Label className="text-sm text-muted-foreground">
                  New subtasks to add:
                </Label>
                {newSubtasks.map((subtask, index) => (
                  <div
                    key={subtask.subtaskID}
                    className="flex items-center justify-between space-x-2 bg-blue-50 p-2 rounded"
                  >
                    <span className="text-sm">
                      {subtask.taskType === "service"
                        ? `Service: ${subtask.serviceType}`
                        : `Parts: ${subtask.partsType} (${subtask.partsBrand})`}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveNewSubtask(index)}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Add Subtask Button */}
            <Button
              type="button"
              variant="outline"
              onClick={handleAddSubtaskClick}
              className="w-full mt-2"
            >
              Add Sub-Task
            </Button>
          </div>
        </div>

        {/* Add Subtask Dialog */}
        <Dialog
          open={showAddSubtaskDialog}
          onOpenChange={setShowAddSubtaskDialog}
        >
          <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {subtaskMenuStep === "main"
                  ? "Select Task Type"
                  : subtaskMenuStep === "services"
                    ? "Select Service"
                    : subtaskMenuStep === "parts"
                      ? "Select Part"
                      : subtaskMenuStep === "brands"
                        ? "Select Condition"
                        : subtaskMenuStep === "addService"
                          ? "Add New Service"
                          : subtaskMenuStep === "addPart"
                            ? "Add New Part"
                            : ""}
              </DialogTitle>
            </DialogHeader>

            {/* Main Menu */}
            {subtaskMenuStep === "main" && (
              <div className="flex flex-col gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className="h-14"
                  onClick={() => {
                    setSubtaskMenuStep("services");
                    if (services.length === 0) fetchServices();
                  }}
                >
                  Service
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className="h-14"
                  onClick={() => {
                    setSubtaskMenuStep("parts");
                    if (parts.length === 0) fetchParts();
                  }}
                >
                  Add Part
                </Button>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      Or create new
                    </span>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setSubtaskMenuStep("addService")}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create New Service
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setSubtaskMenuStep("addPart")}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create New Part
                </Button>
              </div>
            )}

            {/* Services Menu */}
            {subtaskMenuStep === "services" && (
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search services..."
                    value={serviceSearch}
                    onChange={(e) => setServiceSearch(e.target.value)}
                    className="pl-8"
                  />
                </div>
                {loading ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                      {filteredServices.map((service) => (
                        <Button
                          key={service.serviceId || service.name}
                          type="button"
                          variant="outline"
                          onClick={() => handleSelectService(service)}
                        >
                          {service.name}
                        </Button>
                      ))}
                    </div>
                    {filteredServices.length === 0 && (
                      <div className="text-center text-muted-foreground py-4">
                        No services found. Create a new one?
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Parts Menu */}
            {subtaskMenuStep === "parts" && (
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search parts..."
                    value={partSearch}
                    onChange={(e) => setPartSearch(e.target.value)}
                    className="pl-8"
                  />
                </div>
                {loading ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                      {uniqueParts.map((part) => (
                        <Button
                          key={part.partId || part.name}
                          type="button"
                          variant="outline"
                          onClick={() => handleSelectPartType(part)}
                        >
                          {part.name}
                        </Button>
                      ))}
                    </div>
                    {uniqueParts.length === 0 && (
                      <div className="text-center text-muted-foreground py-4">
                        No parts found. Create a new one?
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Brands Menu */}
            {subtaskMenuStep === "brands" && (
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search Conditions..."
                    value={brandSearch}
                    onChange={(e) => setBrandSearch(e.target.value)}
                    className="pl-8"
                  />
                </div>
                {loading ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                      {filteredBrands.map((brand) => (
                        <Button
                          key={brand.brandId}
                          type="button"
                          variant="outline"
                          onClick={() => handleSelectBrand(brand.name)}
                        >
                          {brand.name}
                        </Button>
                      ))}
                    </div>
                    {filteredBrands.length === 0 && (
                      <div className="text-center text-muted-foreground py-4">
                        No brands found
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Add New Service Form */}
            {subtaskMenuStep === "addService" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="serviceName">Service Name *</Label>
                  <Input
                    id="serviceName"
                    placeholder="e.g., Oil Change, AC Service"
                    value={newServiceName}
                    onChange={(e) => setNewServiceName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="serviceCategory">Category (Optional)</Label>
                  <Input
                    id="serviceCategory"
                    placeholder="e.g., Maintenance, Repair"
                    value={newServiceCategory}
                    onChange={(e) => setNewServiceCategory(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="serviceDescription">Description</Label>
                  <Input
                    id="serviceDescription"
                    placeholder="Brief description of the service"
                    value={newServiceDescription}
                    onChange={(e) => setNewServiceDescription(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="serviceDuration">Duration (minutes)</Label>
                    <Input
                      id="serviceDuration"
                      type="number"
                      placeholder="e.g., 30"
                      value={newServiceDuration}
                      onChange={(e) => setNewServiceDuration(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="servicePrice">Default Price (Rs.)</Label>
                    <Input
                      id="servicePrice"
                      type="number"
                      step="0.01"
                      placeholder="e.g., 1500"
                      value={newServicePrice}
                      onChange={(e) => setNewServicePrice(e.target.value)}
                    />
                  </div>
                </div>
                <Button
                  type="button"
                  onClick={handleCreateService}
                  disabled={loading || !newServiceName.trim()}
                  className="w-full"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Service"
                  )}
                </Button>
              </div>
            )}

            {/* Add New Part Form */}
            {subtaskMenuStep === "addPart" && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="partName">Part Name *</Label>
                    <Input
                      id="partName"
                      placeholder="e.g., Battery, Air Filter"
                      value={newPartName}
                      onChange={(e) => setNewPartName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="partBrand">Condition *</Label>
                    <BrandCombobox
                      value={newPartBrand}
                      onValueChange={setNewPartBrand}
                      placeholder="Select or create condition..."
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="partCategory">Category</Label>
                    <Input
                      id="partCategory"
                      placeholder="e.g., Electrical, Engine"
                      value={newPartCategory}
                      onChange={(e) => setNewPartCategory(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="partNumber">Part Number</Label>
                    <Input
                      id="partNumber"
                      placeholder="e.g., BOS-12V-65AH"
                      value={newPartNumber}
                      onChange={(e) => setNewPartNumber(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="partDescription">Description</Label>
                  <Input
                    id="partDescription"
                    placeholder="Brief description of the part"
                    value={newPartDescription}
                    onChange={(e) => setNewPartDescription(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="partPrice">Default Price (Rs.)</Label>
                    <Input
                      id="partPrice"
                      type="number"
                      step="0.01"
                      placeholder="e.g., 5000"
                      value={newPartPrice}
                      onChange={(e) => setNewPartPrice(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="partStock">Stock Quantity</Label>
                    <Input
                      id="partStock"
                      type="number"
                      placeholder="e.g., 10"
                      value={newPartStock}
                      onChange={(e) => setNewPartStock(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="partMinStock">Min Stock Level</Label>
                    <Input
                      id="partMinStock"
                      type="number"
                      placeholder="e.g., 2"
                      value={newPartMinStock}
                      onChange={(e) => setNewPartMinStock(e.target.value)}
                    />
                  </div>
                </div>
                <Button
                  type="button"
                  onClick={handleCreatePart}
                  disabled={
                    loading || !newPartName.trim() || !newPartBrand.trim()
                  }
                  className="w-full"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Part"
                  )}
                </Button>
              </div>
            )}

            {/* Back Button */}
            {subtaskMenuStep !== "main" && (
              <div className="mt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSubtaskMenuBack}
                >
                  ← Back
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isUploading}>
            Cancel
          </Button>
          <Button
            onClick={handleSaveUpdates}
            disabled={isUploading}
            className="bg-blue-800 hover:bg-blue-900"
          >
            {isUploading ? "Saving..." : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
