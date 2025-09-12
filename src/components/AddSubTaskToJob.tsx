"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { useUser } from "@clerk/nextjs";

const partTypes = [
  "Battery",
  "Brake Pads",
  "Engine Oil",
  "Filters",
  "Tires",
  "Wipers",
  "Spark Plugs",
  "Air Filter",
  "Transmission Fluid",
].sort();

const serviceTypes = [
  "Oil Change",
  "Tire Rotation",
  "Brake Inspection",
  "Battery Check",
  "Alignment",
  "Engine Tune-up",
  "AC Service",
  "Diagnostic Scan",
].sort();

interface AddSubTaskToJobProps {
  jobId: string;
  onSubTaskAdded?: (requiresApproval: boolean, id?: string) => void;
}

export default function AddSubTaskToJob({
  jobId,
  onSubTaskAdded,
}: AddSubTaskToJobProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [taskType, setTaskType] = useState<"parts" | "service">("parts");
  const [partType, setPartType] = useState("");
  const [serviceType, setServiceType] = useState("");
  const [brand, setBrand] = useState("");
  const [warrantyPeriod, setWarrantyPeriod] = useState<number>(12);
  const [warrantyTerms, setWarrantyTerms] = useState("");
  const [loading, setLoading] = useState(false);

  const { toast } = useToast();
  const { permissions, role } = useUserPermissions();
  const { user } = useUser();

  const canAddDirectly = role === "admin" || role === "manager";
  const requiresApproval = role === "staff";

  const handleSubmit = async () => {
    if (!user?.id) {
      toast({
        title: "Error",
        description: "User not authenticated",
        variant: "destructive",
      });
      return;
    }

    // Validate required fields
    if (taskType === "parts" && !partType) {
      toast({
        title: "Error",
        description: "Please select a part type",
        variant: "destructive",
      });
      return;
    }

    if (taskType === "service" && !serviceType) {
      toast({
        title: "Error",
        description: "Please select a service type",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      const subtaskData = {
        taskType,
        ...(taskType === "parts"
          ? {
              partsType: partType,
              partsBrand: brand || undefined,
              warrantyPeriod,
              warrantyTerms: warrantyTerms || undefined,
            }
          : {
              serviceType,
            }),
        isCompleted: false,
      };

      const response = await fetch("/api/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add_subtask",
          jobId,
          subtaskData,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Success",
          description: data.requiresApproval
            ? "Subtask submitted for approval"
            : "Subtask added successfully",
        });

        onSubTaskAdded?.(
          data.requiresApproval,
          data.subtaskId || data.requestId
        );
        setIsDialogOpen(false);
        resetForm();
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add subtask",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTaskType("parts");
    setPartType("");
    setServiceType("");
    setBrand("");
    setWarrantyPeriod(12);
    setWarrantyTerms("");
  };

  return (
    <>
      <Button
        onClick={() => setIsDialogOpen(true)}
        disabled={!permissions.canAddParts && !permissions.canAddServices}
      >
        Add Part/Service
      </Button>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Part or Service</DialogTitle>
            <DialogDescription>
              {requiresApproval
                ? "This will be submitted for approval by admin/manager"
                : "This will be added directly to the job"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="taskType">Type</Label>
              <Select
                value={taskType}
                onValueChange={(value: "parts" | "service") =>
                  setTaskType(value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {permissions.canAddParts && (
                    <SelectItem value="parts">Parts</SelectItem>
                  )}
                  {permissions.canAddServices && (
                    <SelectItem value="service">Service</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            {taskType === "parts" && (
              <>
                <div>
                  <Label htmlFor="partType">Part Type</Label>
                  <Select value={partType} onValueChange={setPartType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select part type" />
                    </SelectTrigger>
                    <SelectContent>
                      {partTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="brand">Brand (Optional)</Label>
                  <Input
                    id="brand"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    placeholder="Enter brand name"
                  />
                </div>

                <div>
                  <Label htmlFor="warranty">Warranty Period (months)</Label>
                  <Input
                    id="warranty"
                    type="number"
                    min="0"
                    max="120"
                    value={warrantyPeriod}
                    onChange={(e) =>
                      setWarrantyPeriod(parseInt(e.target.value) || 0)
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="warrantyTerms">
                    Warranty Terms (Optional)
                  </Label>
                  <Textarea
                    id="warrantyTerms"
                    value={warrantyTerms}
                    onChange={(e) => setWarrantyTerms(e.target.value)}
                    placeholder="Enter warranty terms and conditions"
                    rows={3}
                  />
                </div>
              </>
            )}

            {taskType === "service" && (
              <div>
                <Label htmlFor="serviceType">Service Type</Label>
                <Select value={serviceType} onValueChange={setServiceType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select service type" />
                  </SelectTrigger>
                  <SelectContent>
                    {serviceTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {requiresApproval && (
              <Card className="border-orange-200 bg-orange-50">
                <CardContent className="p-4">
                  <p className="text-sm text-orange-800">
                    <strong>Note:</strong> This request will be sent to
                    admin/manager for approval.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading
                ? "Processing..."
                : requiresApproval
                ? "Submit for Approval"
                : "Add to Job"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
