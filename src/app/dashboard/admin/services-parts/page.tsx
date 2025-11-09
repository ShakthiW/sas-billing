"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "react-hot-toast";
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Loader2,
  Package,
  Wrench,
} from "lucide-react";
import { CustomService, CustomPart, PartBrand } from "@/types/services-parts";
import { BrandCombobox } from "@/components/BrandCombobox";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { AppSidebar } from "@/components/app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export default function ServicesPartsManagement() {
  const { permissions, role, loading: permissionsLoading } = useUserPermissions();

  // Services state
  const [services, setServices] = useState<CustomService[]>([]);
  const [serviceSearch, setServiceSearch] = useState("");
  const [selectedService, setSelectedService] = useState<CustomService | null>(null);
  const [serviceDialogOpen, setServiceDialogOpen] = useState(false);
  const [serviceFormData, setServiceFormData] = useState({
    name: "",
    description: "",
    category: "",
    estimatedDuration: "",
    defaultPrice: "",
  });

  // Parts state
  const [parts, setParts] = useState<CustomPart[]>([]);
  const [partSearch, setPartSearch] = useState("");
  const [selectedPart, setSelectedPart] = useState<CustomPart | null>(null);
  const [partDialogOpen, setPartDialogOpen] = useState(false);
  const [partFormData, setPartFormData] = useState({
    name: "",
    brand: "",
    category: "",
    partNumber: "",
    description: "",
    defaultPrice: "",
    stockQuantity: "",
    minStockLevel: "",
  });

  // Brands state
  const [brands, setBrands] = useState<PartBrand[]>([]);
  const [brandSearch, setBrandSearch] = useState("");
  const [selectedBrand, setSelectedBrand] = useState<PartBrand | null>(null);
  const [brandDialogOpen, setBrandDialogOpen] = useState(false);
  const [brandFormData, setBrandFormData] = useState({
    name: "",
    description: "",
  });

  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("services");

  // Check permissions
  useEffect(() => {
    if (!permissionsLoading && !permissions.canManageUsers) {
      window.location.href = "/dashboard";
    }
  }, [permissions, permissionsLoading]);

  // Fetch services
  const fetchServices = async () => {
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
  };

  // Fetch parts
  const fetchParts = async () => {
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
  };

  // Fetch brands
  const fetchBrands = async () => {
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
  };

  useEffect(() => {
    fetchServices();
    fetchParts();
    fetchBrands();
  }, []);

  // Handle service form submit
  const handleServiceSubmit = async () => {
    if (!serviceFormData.name.trim()) {
      toast.error("Service name is required");
      return;
    }

    try {
      setLoading(true);
      const method = selectedService ? "PUT" : "POST";
      const body = selectedService
        ? { serviceId: selectedService.serviceId, ...serviceFormData }
        : serviceFormData;

      const response = await fetch("/api/services", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...body,
          estimatedDuration: serviceFormData.estimatedDuration
            ? parseInt(serviceFormData.estimatedDuration)
            : undefined,
          defaultPrice: serviceFormData.defaultPrice
            ? parseFloat(serviceFormData.defaultPrice)
            : undefined,
        }),
      });

      if (response.ok) {
        toast.success(
          selectedService
            ? "Service updated successfully"
            : "Service created successfully"
        );
        setServiceDialogOpen(false);
        resetServiceForm();
        fetchServices();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to save service");
      }
    } catch (error) {
      console.error("Failed to save service:", error);
      toast.error("Failed to save service");
    } finally {
      setLoading(false);
    }
  };

  // Handle part form submit
  const handlePartSubmit = async () => {
    if (!partFormData.name.trim()) {
      toast.error("Part name is required");
      return;
    }

    try {
      setLoading(true);
      const method = selectedPart ? "PUT" : "POST";
      const body = selectedPart
        ? { partId: selectedPart.partId, ...partFormData }
        : partFormData;

      const response = await fetch("/api/parts", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...body,
          defaultPrice: partFormData.defaultPrice
            ? parseFloat(partFormData.defaultPrice)
            : undefined,
          stockQuantity: partFormData.stockQuantity
            ? parseInt(partFormData.stockQuantity)
            : undefined,
          minStockLevel: partFormData.minStockLevel
            ? parseInt(partFormData.minStockLevel)
            : undefined,
        }),
      });

      if (response.ok) {
        toast.success(
          selectedPart ? "Part updated successfully" : "Part created successfully"
        );
        setPartDialogOpen(false);
        resetPartForm();
        fetchParts();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to save part");
      }
    } catch (error) {
      console.error("Failed to save part:", error);
      toast.error("Failed to save part");
    } finally {
      setLoading(false);
    }
  };

  // Delete service
  const handleDeleteService = async (serviceId: string) => {
    if (!confirm("Are you sure you want to delete this service?")) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/services?serviceId=${serviceId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Service deleted successfully");
        fetchServices();
      } else {
        toast.error("Failed to delete service");
      }
    } catch (error) {
      console.error("Failed to delete service:", error);
      toast.error("Failed to delete service");
    } finally {
      setLoading(false);
    }
  };

  // Delete part
  const handleDeletePart = async (partId: string) => {
    if (!confirm("Are you sure you want to delete this part?")) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/parts?partId=${partId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Part deleted successfully");
        fetchParts();
      } else {
        toast.error("Failed to delete part");
      }
    } catch (error) {
      console.error("Failed to delete part:", error);
      toast.error("Failed to delete part");
    } finally {
      setLoading(false);
    }
  };

  // Edit service
  const handleEditService = (service: CustomService) => {
    setSelectedService(service);
    setServiceFormData({
      name: service.name,
      description: service.description || "",
      category: service.category || "",
      estimatedDuration: service.estimatedDuration?.toString() || "",
      defaultPrice: service.defaultPrice?.toString() || "",
    });
    setServiceDialogOpen(true);
  };

  // Edit part
  const handleEditPart = (part: CustomPart) => {
    setSelectedPart(part);
    setPartFormData({
      name: part.name,
      brand: part.brand,
      category: part.category || "",
      partNumber: part.partNumber || "",
      description: part.description || "",
      defaultPrice: part.defaultPrice?.toString() || "",
      stockQuantity: part.stockQuantity?.toString() || "",
      minStockLevel: part.minStockLevel?.toString() || "",
    });
    setPartDialogOpen(true);
  };

  // Handle brand form submit
  const handleBrandSubmit = async () => {
    if (!brandFormData.name.trim()) {
      toast.error("Condition name is required");
      return;
    }

    try {
      setLoading(true);
      const method = selectedBrand ? "PUT" : "POST";
      const body = selectedBrand
        ? { brandId: selectedBrand.brandId, ...brandFormData }
        : brandFormData;

      const response = await fetch("/api/parts/brands", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        toast.success(
          selectedBrand ? "Condition updated successfully" : "Condition created successfully"
        );
        setBrandDialogOpen(false);
        resetBrandForm();
        fetchBrands();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to save condition");
      }
    } catch (error) {
      console.error("Failed to save condition:", error);
      toast.error("Failed to save condition");
    } finally {
      setLoading(false);
    }
  };

  // Delete brand
  const handleDeleteBrand = async (brandId: string) => {
    if (!confirm("Are you sure you want to delete this condition?")) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/parts/brands?brandId=${brandId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Condition deleted successfully");
        fetchBrands();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to delete condition");
      }
    } catch (error) {
      console.error("Failed to delete condition:", error);
      toast.error("Failed to delete condition");
    } finally {
      setLoading(false);
    }
  };

  // Edit brand
  const handleEditBrand = (brand: PartBrand) => {
    setSelectedBrand(brand);
    setBrandFormData({
      name: brand.name,
      description: brand.description || "",
    });
    setBrandDialogOpen(true);
  };

  // Reset forms
  const resetServiceForm = () => {
    setSelectedService(null);
    setServiceFormData({
      name: "",
      description: "",
      category: "",
      estimatedDuration: "",
      defaultPrice: "",
    });
  };

  const resetPartForm = () => {
    setSelectedPart(null);
    setPartFormData({
      name: "",
      brand: "",
      category: "",
      partNumber: "",
      description: "",
      defaultPrice: "",
      stockQuantity: "",
      minStockLevel: "",
    });
  };

  const resetBrandForm = () => {
    setSelectedBrand(null);
    setBrandFormData({
      name: "",
      description: "",
    });
  };

  // Filter services
  const filteredServices = services.filter((service) =>
    service.name.toLowerCase().includes(serviceSearch.toLowerCase()) ||
    service.category?.toLowerCase().includes(serviceSearch.toLowerCase()) ||
    service.description?.toLowerCase().includes(serviceSearch.toLowerCase())
  );

  // Filter parts
  const filteredParts = parts.filter((part) =>
    part.name.toLowerCase().includes(partSearch.toLowerCase()) ||
    part.brand.toLowerCase().includes(partSearch.toLowerCase()) ||
    part.category?.toLowerCase().includes(partSearch.toLowerCase()) ||
    part.partNumber?.toLowerCase().includes(partSearch.toLowerCase())
  );

  // Filter brands
  const filteredBrands = brands.filter((brand) =>
    brand.name.toLowerCase().includes(brandSearch.toLowerCase()) ||
    brand.description?.toLowerCase().includes(brandSearch.toLowerCase())
  );

  if (permissionsLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b sticky top-0 bg-white z-50">
          <div className="flex items-center gap-2 px-3 flex-1">
            <SidebarTrigger />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink href="/dashboard/admin">Admin</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>Services & Parts</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4">
          <div className="mx-auto w-full max-w-7xl">
            <div className="mb-6">
              <h1 className="text-3xl font-bold">Services & Parts Management</h1>
              <p className="text-muted-foreground mt-2">
                Manage your service offerings and parts inventory
              </p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3 max-w-lg">
                <TabsTrigger value="services" className="flex items-center gap-2">
                  <Wrench className="h-4 w-4" />
                  Services
                </TabsTrigger>
                <TabsTrigger value="parts" className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Parts
                </TabsTrigger>
                <TabsTrigger value="brands" className="flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  Conditions
                </TabsTrigger>
              </TabsList>

              <TabsContent value="services" className="space-y-4">
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <div>
                        <CardTitle>Services</CardTitle>
                        <CardDescription>
                          Manage available services for jobs
                        </CardDescription>
                      </div>
                      <Button
                        onClick={() => {
                          resetServiceForm();
                          setServiceDialogOpen(true);
                        }}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Add Service
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-4">
                      <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search services..."
                          value={serviceSearch}
                          onChange={(e) => setServiceSearch(e.target.value)}
                          className="pl-8"
                        />
                      </div>
                    </div>

                    {loading && filteredServices.length === 0 ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin" />
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Duration (min)</TableHead>
                            <TableHead>Default Price</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredServices.map((service) => (
                            <TableRow key={service.serviceId}>
                              <TableCell className="font-medium">
                                {service.name}
                              </TableCell>
                              <TableCell>{service.category || "-"}</TableCell>
                              <TableCell className="max-w-xs truncate">
                                {service.description || "-"}
                              </TableCell>
                              <TableCell>
                                {service.estimatedDuration || "-"}
                              </TableCell>
                              <TableCell>
                                {service.defaultPrice
                                  ? `Rs. ${service.defaultPrice}`
                                  : "-"}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    service.isActive ? "default" : "secondary"
                                  }
                                >
                                  {service.isActive ? "Active" : "Inactive"}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleEditService(service)}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                      handleDeleteService(service.serviceId)
                                    }
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="parts" className="space-y-4">
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <div>
                        <CardTitle>Parts</CardTitle>
                        <CardDescription>
                          Manage parts inventory and details
                        </CardDescription>
                      </div>
                      <Button
                        onClick={() => {
                          resetPartForm();
                          setPartDialogOpen(true);
                        }}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Add Part
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-4">
                      <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search parts..."
                          value={partSearch}
                          onChange={(e) => setPartSearch(e.target.value)}
                          className="pl-8"
                        />
                      </div>
                    </div>

                    {loading && filteredParts.length === 0 ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin" />
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Brand</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Part Number</TableHead>
                            <TableHead>Stock</TableHead>
                            <TableHead>Default Price</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredParts.map((part) => (
                            <TableRow key={part.partId}>
                              <TableCell className="font-medium">
                                {part.name}
                              </TableCell>
                              <TableCell>{part.brand || "Not selected"}</TableCell>
                              <TableCell>{part.category || "-"}</TableCell>
                              <TableCell>{part.partNumber || "-"}</TableCell>
                              <TableCell>
                                {part.stockQuantity !== undefined ? (
                                  <Badge
                                    variant={
                                      part.stockQuantity <= (part.minStockLevel || 0)
                                        ? "destructive"
                                        : "default"
                                    }
                                  >
                                    {part.stockQuantity}
                                  </Badge>
                                ) : (
                                  "-"
                                )}
                              </TableCell>
                              <TableCell>
                                {part.defaultPrice
                                  ? `Rs. ${part.defaultPrice}`
                                  : "-"}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={part.isActive ? "default" : "secondary"}
                                >
                                  {part.isActive ? "Active" : "Inactive"}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleEditPart(part)}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                      handleDeletePart(part.partId)
                                    }
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="brands" className="space-y-4">
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <div>
                        <CardTitle>Conditions</CardTitle>
                        <CardDescription>
                          Manage part conditions and manufacturers
                        </CardDescription>
                      </div>
                      <Button
                        onClick={() => {
                          resetBrandForm();
                          setBrandDialogOpen(true);
                        }}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Add Condition
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-4">
                      <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search conditions..."
                          value={brandSearch}
                          onChange={(e) => setBrandSearch(e.target.value)}
                          className="pl-8"
                        />
                      </div>
                    </div>

                    {loading && filteredBrands.length === 0 ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin" />
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredBrands.map((brand) => (
                            <TableRow key={brand.brandId}>
                              <TableCell className="font-medium">
                                {brand.name}
                              </TableCell>
                              <TableCell className="max-w-xs truncate">
                                {brand.description || "-"}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={brand.isActive ? "default" : "secondary"}
                                >
                                  {brand.isActive ? "Active" : "Inactive"}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleEditBrand(brand)}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                      handleDeleteBrand(brand.brandId)
                                    }
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Service Dialog */}
        <Dialog open={serviceDialogOpen} onOpenChange={setServiceDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {selectedService ? "Edit Service" : "Add New Service"}
              </DialogTitle>
              <DialogDescription>
                {selectedService
                  ? "Update the service details below"
                  : "Enter the details for the new service"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="service-name">Name *</Label>
                <Input
                  id="service-name"
                  value={serviceFormData.name}
                  onChange={(e) =>
                    setServiceFormData({ ...serviceFormData, name: e.target.value })
                  }
                  placeholder="e.g., Oil Change"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="service-category">Category</Label>
                <Input
                  id="service-category"
                  value={serviceFormData.category}
                  onChange={(e) =>
                    setServiceFormData({
                      ...serviceFormData,
                      category: e.target.value,
                    })
                  }
                  placeholder="e.g., Maintenance"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="service-description">Description</Label>
                <Input
                  id="service-description"
                  value={serviceFormData.description}
                  onChange={(e) =>
                    setServiceFormData({
                      ...serviceFormData,
                      description: e.target.value,
                    })
                  }
                  placeholder="Brief description of the service"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="service-duration">Duration (minutes)</Label>
                  <Input
                    id="service-duration"
                    type="number"
                    value={serviceFormData.estimatedDuration}
                    onChange={(e) =>
                      setServiceFormData({
                        ...serviceFormData,
                        estimatedDuration: e.target.value,
                      })
                    }
                    placeholder="e.g., 30"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="service-price">Default Price (Rs.)</Label>
                  <Input
                    id="service-price"
                    type="number"
                    step="0.01"
                    value={serviceFormData.defaultPrice}
                    onChange={(e) =>
                      setServiceFormData({
                        ...serviceFormData,
                        defaultPrice: e.target.value,
                      })
                    }
                    placeholder="e.g., 1500"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setServiceDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleServiceSubmit} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : selectedService ? (
                  "Update Service"
                ) : (
                  "Add Service"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Part Dialog */}
        <Dialog open={partDialogOpen} onOpenChange={setPartDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {selectedPart ? "Edit Part" : "Add New Part"}
              </DialogTitle>
              <DialogDescription>
                {selectedPart
                  ? "Update the part details below"
                  : "Enter the details for the new part"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="part-name">Name *</Label>
                  <Input
                    id="part-name"
                    value={partFormData.name}
                    onChange={(e) =>
                      setPartFormData({ ...partFormData, name: e.target.value })
                    }
                    placeholder="e.g., Battery"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="part-brand">Condition</Label>
                  <BrandCombobox
                    value={partFormData.brand}
                    onValueChange={(value) =>
                      setPartFormData({ ...partFormData, brand: value })
                    }
                    placeholder="Select or create condition..."
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="part-category">Category</Label>
                  <Input
                    id="part-category"
                    value={partFormData.category}
                    onChange={(e) =>
                      setPartFormData({
                        ...partFormData,
                        category: e.target.value,
                      })
                    }
                    placeholder="e.g., Electrical"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="part-number">Part Number</Label>
                  <Input
                    id="part-number"
                    value={partFormData.partNumber}
                    onChange={(e) =>
                      setPartFormData({
                        ...partFormData,
                        partNumber: e.target.value,
                      })
                    }
                    placeholder="e.g., BOS-12V-65AH"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="part-description">Description</Label>
                <Input
                  id="part-description"
                  value={partFormData.description}
                  onChange={(e) =>
                    setPartFormData({
                      ...partFormData,
                      description: e.target.value,
                    })
                  }
                  placeholder="Brief description of the part"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="part-price">Default Price (Rs.)</Label>
                  <Input
                    id="part-price"
                    type="number"
                    step="0.01"
                    value={partFormData.defaultPrice}
                    onChange={(e) =>
                      setPartFormData({
                        ...partFormData,
                        defaultPrice: e.target.value,
                      })
                    }
                    placeholder="e.g., 5000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="part-stock">Stock Quantity</Label>
                  <Input
                    id="part-stock"
                    type="number"
                    value={partFormData.stockQuantity}
                    onChange={(e) =>
                      setPartFormData({
                        ...partFormData,
                        stockQuantity: e.target.value,
                      })
                    }
                    placeholder="e.g., 10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="part-min-stock">Min Stock Level</Label>
                  <Input
                    id="part-min-stock"
                    type="number"
                    value={partFormData.minStockLevel}
                    onChange={(e) =>
                      setPartFormData({
                        ...partFormData,
                        minStockLevel: e.target.value,
                      })
                    }
                    placeholder="e.g., 2"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPartDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handlePartSubmit} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : selectedPart ? (
                  "Update Part"
                ) : (
                  "Add Part"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Brand Dialog */}
        <Dialog open={brandDialogOpen} onOpenChange={setBrandDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {selectedBrand ? "Edit Condition" : "Add New Condition"}
              </DialogTitle>
              <DialogDescription>
                {selectedBrand
                  ? "Update the condition details below"
                  : "Enter the details for the new condition"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="brand-name">Name *</Label>
                <Input
                  id="brand-name"
                  value={brandFormData.name}
                  onChange={(e) =>
                    setBrandFormData({ ...brandFormData, name: e.target.value })
                  }
                  placeholder="e.g., New, Used, Refurbished"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="brand-description">Description</Label>
                <Input
                  id="brand-description"
                  value={brandFormData.description}
                  onChange={(e) =>
                    setBrandFormData({
                      ...brandFormData,
                      description: e.target.value,
                    })
                  }
                  placeholder="Brief description of the condition"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setBrandDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleBrandSubmit} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : selectedBrand ? (
                  "Update Condition"
                ) : (
                  "Add Condition"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SidebarInset>
    </SidebarProvider>
  );
}