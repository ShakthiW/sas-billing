"use client";

import { useState, useEffect, useMemo } from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "react-hot-toast";
import { PartBrand } from "@/types/services-parts";

interface BrandComboboxProps {
    value?: string;
    onValueChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    disabled?: boolean;
}

export function BrandCombobox({
    value,
    onValueChange,
    placeholder = "Select condition...",
    className,
    disabled = false,
}: BrandComboboxProps) {
    const [open, setOpen] = useState(false);
    const [brands, setBrands] = useState<PartBrand[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchValue, setSearchValue] = useState("");
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [newBrandName, setNewBrandName] = useState("");
    const [newBrandDescription, setNewBrandDescription] = useState("");

    // Fetch brands from API
    const fetchBrands = async () => {
        try {
            setLoading(true);
            const response = await fetch("/api/parts/brands");
            if (response.ok) {
                const data = await response.json();
                setBrands(data);
            } else {
                toast.error("Failed to load brands");
            }
        } catch (error) {
            console.error("Failed to fetch brands:", error);
            toast.error("Failed to load brands");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBrands();
    }, []);

    // Filter brands based on search
    const filteredBrands = useMemo(() => {
        if (!searchValue) return brands;
        return brands.filter(
            (brand) =>
                brand.name.toLowerCase().includes(searchValue.toLowerCase()) ||
                brand.description?.toLowerCase().includes(searchValue.toLowerCase())
        );
    }, [brands, searchValue]);

    // Handle creating new brand
    const handleCreateBrand = async () => {
        if (!newBrandName.trim()) {
            toast.error("Condition name is required");
            return;
        }

        try {
            setLoading(true);
            const response = await fetch("/api/parts/brands", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: newBrandName.trim(),
                    description: newBrandDescription.trim(),
                }),
            });

            if (response.ok) {
                const newBrand = await response.json();
                setBrands([...brands, newBrand]);
                onValueChange(newBrand.name);
                setShowCreateDialog(false);
                setNewBrandName("");
                setNewBrandDescription("");
                toast.success("Condition created successfully");
            } else {
                const error = await response.json();
                toast.error(error.error || "Failed to create condition");
            }
        } catch (error) {
            console.error("Failed to create condition:", error);
            toast.error("Failed to create condition");
        } finally {
            setLoading(false);
        }
    };

    const selectedBrand = brands.find((brand) => brand.name === value);

    return (
        <>
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        className={cn("w-full justify-between", className)}
                        disabled={disabled}
                    >
                        {selectedBrand ? selectedBrand.name : placeholder}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                    <Command>
                        <CommandInput
                            placeholder="Search conditions..."
                            value={searchValue}
                            onValueChange={setSearchValue}
                        />
                        <CommandList>
                            <CommandEmpty>
                                <div className="py-6 text-center text-sm">
                                    <p className="mb-2">No conditions found.</p>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setShowCreateDialog(true)}
                                        className="h-8"
                                    >
                                        <Plus className="mr-2 h-4 w-4" />
                                        Create new condition
                                    </Button>
                                </div>
                            </CommandEmpty>
                            <CommandGroup>
                                {filteredBrands.map((brand) => (
                                    <CommandItem
                                        key={brand.brandId}
                                        value={brand.name}
                                        onSelect={(currentValue) => {
                                            onValueChange(currentValue === value ? "" : currentValue);
                                            setOpen(false);
                                        }}
                                    >
                                        <Check
                                            className={cn(
                                                "mr-2 h-4 w-4",
                                                value === brand.name ? "opacity-100" : "opacity-0"
                                            )}
                                        />
                                        <div className="flex flex-col">
                                            <span>{brand.name}</span>
                                            {brand.description && (
                                                <span className="text-xs text-muted-foreground">
                                                    {brand.description}
                                                </span>
                                            )}
                                        </div>
                                    </CommandItem>
                                ))}
                                <CommandItem
                                    onSelect={() => setShowCreateDialog(true)}
                                    className="text-primary"
                                >
                                    <Plus className="mr-2 h-4 w-4" />
                                    Create new condition
                                </CommandItem>
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>

            {/* Create Brand Dialog */}
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create New Condition</DialogTitle>
                        <DialogDescription>
                            Add a new condition to the system. This condition will be available for all parts.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="brand-name">Condition Name *</Label>
                            <Input
                                id="brand-name"
                                value={newBrandName}
                                onChange={(e) => setNewBrandName(e.target.value)}
                                placeholder="e.g., New, Used, Refurbished"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="brand-description">Description</Label>
                            <Textarea
                                id="brand-description"
                                value={newBrandDescription}
                                onChange={(e) => setNewBrandDescription(e.target.value)}
                                placeholder="Optional description of the condition"
                                rows={3}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setShowCreateDialog(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleCreateBrand}
                            disabled={loading || !newBrandName.trim()}
                        >
                            {loading ? "Creating..." : "Create Condition"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
