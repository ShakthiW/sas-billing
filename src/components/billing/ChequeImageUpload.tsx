"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Camera, Upload, X } from "lucide-react";
import Image from "@/components/RemoteImage";

interface ChequeImageUploadProps {
  onImageSelect: (file: File | null) => void;
  existingImageUrl?: string;
}

export default function ChequeImageUpload({ 
  onImageSelect, 
  existingImageUrl 
}: ChequeImageUploadProps) {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(existingImageUrl || null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Image size should be less than 5MB');
        return;
      }

      setSelectedImage(file);
      
      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
      
      onImageSelect(file);
    }
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    setPreviewUrl(null);
    onImageSelect(null);
  };

  const handleCameraCapture = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment'; // Use rear camera on mobile
    input.onchange = (e) => {
      const target = e.target as HTMLInputElement;
      if (target.files?.[0]) {
        handleImageSelect({ target } as React.ChangeEvent<HTMLInputElement>);
      }
    };
    input.click();
  };

  return (
    <div className="space-y-4">
      <Label>Cheque Image (Optional)</Label>
      
      {previewUrl ? (
        <div className="relative w-full max-w-md">
          <div className="relative aspect-[16/9] w-full overflow-hidden rounded-lg border border-gray-200">
            <Image
              src={previewUrl}
              alt="Cheque preview"
              fill
              className="object-contain"
            />
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2"
              onClick={handleRemoveImage}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Cheque image captured. You can remove and retake if needed.
          </p>
        </div>
      ) : (
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleCameraCapture}
            className="flex-1"
          >
            <Camera className="mr-2 h-4 w-4" />
            Take Photo
          </Button>
          
          <label className="flex-1">
            <input
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={(e) => {
                e.preventDefault();
                const input = e.currentTarget.parentElement?.querySelector('input');
                input?.click();
              }}
            >
              <Upload className="mr-2 h-4 w-4" />
              Upload Image
            </Button>
          </label>
        </div>
      )}
      
      <p className="text-xs text-muted-foreground">
        Upload or capture a photo of the cheque for record keeping.
      </p>
    </div>
  );
}