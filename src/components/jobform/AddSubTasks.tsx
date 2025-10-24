"use client";

import { useState, useEffect, useCallback } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SubTask } from "@/app/types";
import { v4 as uuidv4 } from "uuid";
import { Loader2, Plus, Search } from "lucide-react";
import { toast } from "react-hot-toast";
import { BrandCombobox } from "@/components/BrandCombobox";
import { PartBrand } from "@/types/services-parts";

interface SubTasksProps {
  setSubTasks: (subtasks: SubTask[]) => void;
}

export default function SubTasks({ setSubTasks }: SubTasksProps) {
  const [menuStep, setMenuStep] = useState<
    "main" | "services" | "parts" | "brands" | "addService" | "addPart"
  >("main");
  const [selectedPartType, setSelectedPartType] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmedSubTasks, setConfirmedSubTasks] = useState<SubTask[]>([]);
  const [checkedTasks, setCheckedTasks] = useState<{ [key: string]: boolean }>(
    {}
  );

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

  // Use useCallback to memoize setSubTasks for performance
  const memoizedSetSubTasks = useCallback(
    (newSubtasks: SubTask[]) => {
      setSubTasks(newSubtasks);
    },
    [setSubTasks]
  );

  useEffect(() => {
    console.log(
      "SubTasks: useEffect - confirmedSubTasks changed:",
      confirmedSubTasks
    );
    memoizedSetSubTasks(confirmedSubTasks);
  }, [confirmedSubTasks, memoizedSetSubTasks]);

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
    if (dialogOpen) {
      if (menuStep === "services" && services.length === 0) {
        fetchServices();
      } else if (menuStep === "parts" && parts.length === 0) {
        fetchParts();
      } else if (menuStep === "brands" && brands.length === 0) {
        fetchBrands();
      }
    }
  }, [
    dialogOpen,
    menuStep,
    services.length,
    parts.length,
    brands.length,
    fetchServices,
    fetchParts,
    fetchBrands,
  ]);

  const handleAddSubTaskClick = () => {
    console.log("SubTasks: handleAddSubTaskClick - Dialog opened");
    setDialogOpen(true);
  };

  const handleSelectService = (service: any) => {
    console.log("SubTasks: handleSelectService - Service selected:", service);
    setConfirmedSubTasks([
      ...confirmedSubTasks,
      {
        subtaskID: uuidv4(),
        taskType: "service",
        serviceType: service.name || service,
        isCompleted: false,
      },
    ]);
    setMenuStep("main");
    setServiceSearch("");
  };

  const handleSelectPartType = (part: any) => {
    console.log("SubTasks: handleSelectPartType - Part selected:", part);
    setSelectedPartType(part.name || part);
    setMenuStep("brands");
    // Don't auto-select brand, let user choose from all available brands
    if (brands.length === 0) {
      fetchBrands();
    }
  };

  const handleSelectBrand = (brand: string) => {
    console.log(
      "SubTasks: handleSelectBrand - Brand selected:",
      brand,
      "for item:",
      selectedPartType
    );
    if (selectedPartType) {
      setConfirmedSubTasks([
        ...confirmedSubTasks,
        {
          subtaskID: uuidv4(),
          taskType: "parts",
          partsType: selectedPartType,
          partsBrand: brand,
          isCompleted: false,
        },
      ]);
    }
    setMenuStep("main");
    setSelectedPartType(null);
    setPartSearch("");
    setBrandSearch("");
  };

  const handleRemoveConfirmedSubTask = (indexToRemove: number) => {
    console.log(
      "SubTasks: handleRemoveConfirmedSubTask - Removing index:",
      indexToRemove
    );
    setConfirmedSubTasks(
      confirmedSubTasks.filter((_, index) => index !== indexToRemove)
    );
    setCheckedTasks((prev) => {
      const newCheckedTasks = { ...prev };
      delete newCheckedTasks[confirmedSubTasks[indexToRemove].subtaskID];
      return newCheckedTasks;
    });
  };

  const handleBack = () => {
    console.log("SubTasks: handleBack - Current menu step:", menuStep);
    if (menuStep === "brands") {
      setMenuStep("parts");
    } else if (menuStep === "parts" || menuStep === "services") {
      setMenuStep("main");
    } else if (menuStep === "addService" || menuStep === "addPart") {
      setMenuStep("main");
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

  const handleCheckChange = (index: number, checked: boolean) => {
    const subtaskID = confirmedSubTasks[index].subtaskID;

    // First, update checkedTasks
    setCheckedTasks((prev) => ({
      ...prev,
      [subtaskID]: checked,
    }));

    // Then, update the isCompleted status in confirmedSubTasks
    setConfirmedSubTasks((prevTasks) => {
      return prevTasks.map((task, i) => {
        if (i === index) {
          return { ...task, isCompleted: checked };
        }
        return task;
      });
    });
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
        // Add to subtasks
        handleSelectService(newServiceName);
        // Reset form
        setNewServiceName("");
        setNewServiceCategory("");
        setNewServiceDescription("");
        setNewServiceDuration("");
        setNewServicePrice("");
        setMenuStep("main");
        // Refresh services list
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
        // Add to subtasks
        setConfirmedSubTasks([
          ...confirmedSubTasks,
          {
            subtaskID: uuidv4(),
            taskType: "parts",
            partsType: newPartName,
            partsBrand: newPartBrand,
            isCompleted: false,
          },
        ]);
        // Reset form
        setNewPartName("");
        setNewPartBrand("");
        setNewPartCategory("");
        setNewPartNumber("");
        setNewPartDescription("");
        setNewPartPrice("");
        setNewPartStock("");
        setNewPartMinStock("");
        setMenuStep("main");
        // Refresh parts list
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
    <div>
      <div className="flex flex-col space-y-4">
        <Label>Sub-Tasks:</Label>
        {/* Display confirmed subtasks with scrolling */}
        <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
          {confirmedSubTasks.map((task, index) => (
            <div key={task.subtaskID} className="flex items-center space-x-2">
              <Checkbox
                id={`confirmed-subtask-${task.subtaskID}`}
                checked={task.isCompleted}
                onCheckedChange={(checked) =>
                  handleCheckChange(index, checked as boolean)
                }
              />
              <Label
                htmlFor={`confirmed-subtask-${task.subtaskID}`}
                className={`text-sm flex-grow ${task.isCompleted ? "line-through text-gray-500" : ""
                  }`}
              >
                {task.taskType === "service"
                  ? `Service: ${task.serviceType}`
                  : `Parts: ${task.partsType} (${task.partsBrand})`}
              </Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => handleRemoveConfirmedSubTask(index)}
              >
                ✕
              </Button>
            </div>
          ))}
        </div>

        <div className="flex items-center mt-2 space-x-2">
          <Button
            type="button"
            onClick={handleAddSubTaskClick}
            className="w-full"
          >
            Add Sub-Task
          </Button>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-7xl w-[90vw] h-[50vh] md:h-[75vh] max-h-[50vh] md:max-h-[75vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {menuStep === "main"
                ? "Select Task Type"
                : menuStep === "services"
                  ? "Select Service"
                  : menuStep === "parts"
                    ? "Select Part"
                    : menuStep === "brands"
                      ? "Select Condition"
                      : menuStep === "addService"
                        ? "Add New Service"
                        : menuStep === "addPart"
                          ? "Add New Part"
                          : ""}
            </DialogTitle>
          </DialogHeader>

          {/* Main Menu */}
          {menuStep === "main" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="h-24"
                onClick={() => {
                  setMenuStep("services");
                  if (services.length === 0) fetchServices();
                }}
              >
                <div className="flex flex-col items-center">
                  <span className="text-3xl mb-2">🔧</span>
                  <span className="text-lg font-medium">Service</span>
                </div>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="h-24"
                onClick={() => {
                  setMenuStep("parts");
                  if (parts.length === 0) fetchParts();
                }}
              >
                <div className="flex flex-col items-center">
                  <span className="text-3xl mb-2">⚙️</span>
                  <span className="text-lg font-medium">Add Part</span>
                </div>
              </Button>
              <div className="col-span-2 relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-sm uppercase">
                  <span className="bg-background px-4 text-muted-foreground">
                    Or create new
                  </span>
                </div>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="lg"
                className="h-20"
                onClick={() => setMenuStep("addService")}
              >
                <Plus className="mr-3 h-5 w-5" />
                <span className="text-base font-medium">
                  Create New Service
                </span>
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="lg"
                className="h-20"
                onClick={() => setMenuStep("addPart")}
              >
                <Plus className="mr-3 h-5 w-5" />
                <span className="text-base font-medium">Create New Part</span>
              </Button>
            </div>
          )}

          {/* Services Menu */}
          {menuStep === "services" && (
            <div className="space-y-6 p-6">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search services..."
                  value={serviceSearch}
                  onChange={(e) => setServiceSearch(e.target.value)}
                  className="pl-8 h-12"
                />
              </div>
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-h-96 overflow-y-auto">
                    {filteredServices.map((service) => (
                      <Button
                        key={service.serviceId || service.name}
                        type="button"
                        variant="outline"
                        size="lg"
                        className="h-16 p-4"
                        onClick={() => handleSelectService(service)}
                      >
                        <div className="flex flex-col items-center text-center">
                          <span className="text-lg mb-1">🔧</span>
                          <span className="truncate w-full">
                            {service.name}
                          </span>
                        </div>
                      </Button>
                    ))}
                  </div>
                  {filteredServices.length === 0 && (
                    <div className="text-center text-muted-foreground py-8">
                      <div className="text-4xl mb-2">🔍</div>
                      <p className="text-lg">
                        No services found. Create a new one?
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Parts Menu */}
          {menuStep === "parts" && (
            <div className="space-y-6 p-6">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search parts..."
                  value={partSearch}
                  onChange={(e) => setPartSearch(e.target.value)}
                  className="pl-8 h-12"
                />
              </div>
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-h-96 overflow-y-auto">
                    {uniqueParts.map((part) => (
                      <Button
                        key={part.partId || part.name}
                        type="button"
                        variant="outline"
                        size="lg"
                        className="h-16 p-4"
                        onClick={() => handleSelectPartType(part)}
                      >
                        <div className="flex flex-col items-center text-center">
                          <span className="text-lg mb-1">⚙️</span>
                          <span className="truncate w-full">{part.name}</span>
                        </div>
                      </Button>
                    ))}
                  </div>
                  {uniqueParts.length === 0 && (
                    <div className="text-center text-muted-foreground py-8">
                      <div className="text-4xl mb-2">🔍</div>
                      <p className="text-lg">
                        No parts found. Create a new one?
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Brands Menu */}
          {menuStep === "brands" && (
            <div className="space-y-6 p-6">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search Conditions..."
                  value={brandSearch}
                  onChange={(e) => setBrandSearch(e.target.value)}
                  className="pl-8 h-12"
                />
              </div>
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-h-96 overflow-y-auto">
                    {filteredBrands.map((brand) => (
                      <Button
                        key={brand.brandId}
                        type="button"
                        variant="outline"
                        size="lg"
                        className="h-16 p-4"
                        onClick={() => handleSelectBrand(brand.name)}
                      >
                        <div className="flex flex-col items-center text-center">
                          <span className="text-lg mb-1">🏷️</span>
                          <span className="truncate w-full">{brand.name}</span>
                        </div>
                      </Button>
                    ))}
                  </div>
                  {filteredBrands.length === 0 && (
                    <div className="text-center text-muted-foreground py-8">
                      <div className="text-4xl mb-2">🔍</div>
                      <p className="text-lg">No brands found</p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Add New Service Form */}
          {menuStep === "addService" && (
            <div className="space-y-6 p-6">
              <div className="space-y-3">
                <Label htmlFor="serviceName">Service Name *</Label>
                <Input
                  id="serviceName"
                  placeholder="e.g., Oil Change, AC Service"
                  value={newServiceName}
                  onChange={(e) => setNewServiceName(e.target.value)}
                  className="h-12"
                />
              </div>
              <div className="space-y-3">
                <Label htmlFor="serviceCategory" className="">
                  Category (Optional)
                </Label>
                <Input
                  id="serviceCategory"
                  placeholder="e.g., Maintenance, Repair"
                  value={newServiceCategory}
                  onChange={(e) => setNewServiceCategory(e.target.value)}
                  className="h-12"
                />
              </div>
              <div className="space-y-3">
                <Label htmlFor="serviceDescription" className="">
                  Description
                </Label>
                <Input
                  id="serviceDescription"
                  placeholder="Brief description of the service"
                  value={newServiceDescription}
                  onChange={(e) => setNewServiceDescription(e.target.value)}
                  className="h-12"
                />
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label htmlFor="serviceDuration" className="">
                    Duration (minutes)
                  </Label>
                  <Input
                    id="serviceDuration"
                    type="number"
                    placeholder="e.g., 30"
                    value={newServiceDuration}
                    onChange={(e) => setNewServiceDuration(e.target.value)}
                    className="h-12"
                  />
                </div>
                <div className="space-y-3">
                  <Label htmlFor="servicePrice" className="">
                    Default Price (Rs.)
                  </Label>
                  <Input
                    id="servicePrice"
                    type="number"
                    step="0.01"
                    placeholder="e.g., 1500"
                    value={newServicePrice}
                    onChange={(e) => setNewServicePrice(e.target.value)}
                    className="h-12"
                  />
                </div>
              </div>
              <Button
                type="button"
                onClick={handleCreateService}
                disabled={loading || !newServiceName.trim()}
                className="w-full h-14"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Service"
                )}
              </Button>
            </div>
          )}

          {/* Add New Part Form */}
          {menuStep === "addPart" && (
            <div className="space-y-6 p-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label htmlFor="partName" className="">
                    Part Name *
                  </Label>
                  <Input
                    id="partName"
                    placeholder="e.g., Battery, Air Filter"
                    value={newPartName}
                    onChange={(e) => setNewPartName(e.target.value)}
                    className="h-12"
                  />
                </div>
                <div className="space-y-3">
                  <Label htmlFor="partBrand" className="">
                    Condition *
                  </Label>
                  <BrandCombobox
                    value={newPartBrand}
                    onValueChange={setNewPartBrand}
                    placeholder="Select or create condition..."
                    className="h-12"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label htmlFor="partCategory" className="">
                    Category
                  </Label>
                  <Input
                    id="partCategory"
                    placeholder="e.g., Electrical, Engine"
                    value={newPartCategory}
                    onChange={(e) => setNewPartCategory(e.target.value)}
                    className="h-12"
                  />
                </div>
                <div className="space-y-3">
                  <Label htmlFor="partNumber" className="">
                    Part Number
                  </Label>
                  <Input
                    id="partNumber"
                    placeholder="e.g., BOS-12V-65AH"
                    value={newPartNumber}
                    onChange={(e) => setNewPartNumber(e.target.value)}
                    className="h-12"
                  />
                </div>
              </div>
              <div className="space-y-3">
                <Label htmlFor="partDescription" className="">
                  Description
                </Label>
                <Input
                  id="partDescription"
                  placeholder="Brief description of the part"
                  value={newPartDescription}
                  onChange={(e) => setNewPartDescription(e.target.value)}
                  className="h-12"
                />
              </div>
              <div className="grid grid-cols-3 gap-6">
                <div className="space-y-3">
                  <Label htmlFor="partPrice" className="">
                    Default Price (Rs.)
                  </Label>
                  <Input
                    id="partPrice"
                    type="number"
                    step="0.01"
                    placeholder="e.g., 5000"
                    value={newPartPrice}
                    onChange={(e) => setNewPartPrice(e.target.value)}
                    className="h-12"
                  />
                </div>
                <div className="space-y-3">
                  <Label htmlFor="partStock" className="">
                    Stock Quantity
                  </Label>
                  <Input
                    id="partStock"
                    type="number"
                    placeholder="e.g., 10"
                    value={newPartStock}
                    onChange={(e) => setNewPartStock(e.target.value)}
                    className="h-12"
                  />
                </div>
                <div className="space-y-3">
                  <Label htmlFor="partMinStock" className="">
                    Min Stock Level
                  </Label>
                  <Input
                    id="partMinStock"
                    type="number"
                    placeholder="e.g., 2"
                    value={newPartMinStock}
                    onChange={(e) => setNewPartMinStock(e.target.value)}
                    className="h-12"
                  />
                </div>
              </div>
              <Button
                type="button"
                onClick={handleCreatePart}
                disabled={
                  loading || !newPartName.trim() || !newPartBrand.trim()
                }
                className="w-full h-14"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Part"
                )}
              </Button>
            </div>
          )}

          {/* Back Button */}
          {menuStep !== "main" && (
            <div className="mt-6 px-6 pb-6">
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="h-12"
                onClick={handleBack}
              >
                ← Back
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
