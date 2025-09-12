"use client";

import { useState, useEffect, Dispatch, SetStateAction } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Image from "@/components/RemoteImage";
import { X, Plus, Camera, Upload, Loader2 } from "lucide-react";
import { compressImages } from "@/utils/imageCompression";
import { toast } from "react-hot-toast";

interface DamageImageUploadProps {
    onImagesSelect: Dispatch<SetStateAction<File[]>>;
    damageImages: File[];
}

export default function DamageImageUpload({
    onImagesSelect,
    damageImages,
}: DamageImageUploadProps) {
    const [previews, setPreviews] = useState<string[]>([]);
    const [isCompressing, setIsCompressing] = useState(false);
    const [compressionProgress, setCompressionProgress] = useState(0);

    useEffect(() => {
        // Generate previews for selected images
        const newPreviews = damageImages.map(file => URL.createObjectURL(file));
        setPreviews(newPreviews);

        // Cleanup function to revoke URLs
        return () => {
            newPreviews.forEach(url => URL.revokeObjectURL(url));
        };
    }, [damageImages]);

    const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>, useCamera: boolean = false) => {
        const files = Array.from(event.target.files || []);
        if (files.length > 0) {
            setIsCompressing(true);
            setCompressionProgress(0);
            
            try {
                // Compress images with progress tracking
                const compressedFiles = await compressImages(
                    files,
                    {
                        maxWidth: 1920,
                        maxHeight: 1080,
                        quality: 0.8,
                        maxSizeMB: 1,
                    },
                    (completed, total) => {
                        setCompressionProgress((completed / total) * 100);
                    }
                );
                
                // Calculate size reduction
                const originalSize = files.reduce((sum, file) => sum + file.size, 0);
                const compressedSize = compressedFiles.reduce((sum, file) => sum + file.size, 0);
                const reduction = ((originalSize - compressedSize) / originalSize * 100).toFixed(1);
                
                if (originalSize > compressedSize) {
                    toast.success(`Damage photos compressed! Size reduced by ${reduction}%`);
                }
                
                const newImages = [...damageImages, ...compressedFiles];
                onImagesSelect(newImages);
            } catch (error) {
                console.error("Image compression failed:", error);
                toast.error("Failed to compress images. Using original files.");
                // Fall back to original files
                const newImages = [...damageImages, ...files];
                onImagesSelect(newImages);
            } finally {
                setIsCompressing(false);
                setCompressionProgress(0);
            }
        }
        // Reset input value to allow selecting the same file again
        event.target.value = "";
    };

    const handleRemoveImage = (index: number) => {
        const newImages = damageImages.filter((_, i) => i !== index);
        onImagesSelect(newImages);
    };

    const handleRemoveAll = () => {
        onImagesSelect([]);
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <Label htmlFor="damageImages" className="text-sm font-medium">
                    Damage Photos (Optional)
                </Label>
                {damageImages.length > 0 && (
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleRemoveAll}
                        className="text-red-600 hover:text-red-700"
                    >
                        <X className="h-4 w-4 mr-1" />
                        Remove All
                    </Button>
                )}
            </div>

            {/* Upload Options */}
            <div className="flex flex-col sm:flex-row gap-2">
                {/* Gallery Upload */}
                <div className="flex-1">
                    <Input
                        id="damageGallery"
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e, false)}
                        className="hidden"
                    />
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => document.getElementById("damageGallery")?.click()}
                        className="w-full flex items-center justify-center gap-2"
                    >
                        <Upload className="h-4 w-4" />
                        Upload from Gallery
                    </Button>
                </div>

                {/* Camera Capture */}
                <div className="flex-1">
                    <Input
                        id="damageCamera"
                        type="file"
                        multiple
                        accept="image/*"
                        capture="environment"
                        onChange={(e) => handleImageUpload(e, true)}
                        className="hidden"
                    />
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => document.getElementById("damageCamera")?.click()}
                        className="w-full flex items-center justify-center gap-2"
                    >
                        <Camera className="h-4 w-4" />
                        Take Photo
                    </Button>
                </div>
            </div>

            {/* Selected Images Count */}
            {damageImages.length > 0 && (
                <div className="text-sm text-muted-foreground">
                    {damageImages.length} image(s) selected
                </div>
            )}

            {/* Compression Progress */}
            {isCompressing && (
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm">Compressing damage photos...</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                            className="bg-green-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${compressionProgress}%` }}
                        ></div>
                    </div>
                </div>
            )}

            {/* Image Previews */}
            {previews.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {previews.map((preview, index) => (
                        <div key={index} className="relative group">
                            <div className="relative w-full h-32 border rounded-md overflow-hidden bg-gray-100">
                                <Image
                                    src={preview}
                                    alt={`Damage photo ${index + 1}`}
                                    fill
                                    className="object-cover"
                                />
                                <Button
                                    type="button"
                                    variant="destructive"
                                    size="icon"
                                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6"
                                    onClick={() => handleRemoveImage(index)}
                                >
                                    <X className="h-3 w-3" />
                                </Button>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1 truncate">
                                {damageImages[index]?.name}
                            </p>
                        </div>
                    ))}
                </div>
            )}

            {/* Upload Instructions */}
            <div className="text-xs text-muted-foreground border rounded-md p-3 bg-gray-50">
                <div className="flex items-center gap-2 mb-2">
                    <Camera className="h-4 w-4" />
                    <span className="font-medium">Photo Guidelines:</span>
                </div>
                <ul className="space-y-1 ml-6 list-disc">
                    <li>Take clear, well-lit photos of any existing damage</li>
                    <li>Include multiple angles for each damage area</li>
                    <li>Photos help document vehicle condition before service</li>
                    <li>Accepted formats: JPG, PNG, WebP</li>
                </ul>
            </div>
        </div>
    );
}
