// Image compression utilities
export interface ImageCompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  maxSizeMB?: number;
}

const DEFAULT_OPTIONS: ImageCompressionOptions = {
  maxWidth: 1920,
  maxHeight: 1080,
  quality: 0.8,
  maxSizeMB: 1,
};

export async function compressImage(
  file: File,
  options: ImageCompressionOptions = {}
): Promise<File> {
  const {
    maxWidth = DEFAULT_OPTIONS.maxWidth!,
    maxHeight = DEFAULT_OPTIONS.maxHeight!,
    quality = DEFAULT_OPTIONS.quality!,
    maxSizeMB = DEFAULT_OPTIONS.maxSizeMB!,
  } = options;

  // Check if compression is needed
  const fileSizeMB = file.size / (1024 * 1024);
  if (fileSizeMB <= maxSizeMB) {
    // Check if image dimensions need resizing
    const needsResize = await checkIfNeedsResize(file, maxWidth, maxHeight);
    if (!needsResize) {
      return file; // No compression needed
    }
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d")!;

        // Calculate new dimensions
        let { width, height } = calculateDimensions(
          img.width,
          img.height,
          maxWidth,
          maxHeight
        );

        canvas.width = width;
        canvas.height = height;

        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);

        // Decide safe output type (canvas may not support HEIC/HEIF)
        const supportedTypes = [
          "image/jpeg",
          "image/png",
          "image/webp",
        ] as const;
        const outputType = (supportedTypes as readonly string[]).includes(
          file.type
        )
          ? file.type
          : "image/jpeg";

        // Convert to blob with quality setting
        canvas.toBlob(
          (blob) => {
            if (blob) {
              // Create new file (normalize extension for converted types)
              const newName =
                outputType === file.type
                  ? file.name
                  : file.name.replace(/\.(heic|heif)$/i, ".jpg");

              const compressedFile = new File([blob], newName, {
                type: outputType,
                lastModified: Date.now(),
              });

              // Check if we achieved target size
              const newSizeMB = compressedFile.size / (1024 * 1024);
              if (newSizeMB > maxSizeMB && quality > 0.1) {
                // Recursively compress with lower quality
                compressImage(file, {
                  ...options,
                  quality: quality - 0.1,
                })
                  .then(resolve)
                  .catch(() => resolve(file)); // Fallback to original on error
              } else {
                resolve(compressedFile);
              }
            } else {
              // Fallback path: try dataURL conversion; if that fails, return original file
              try {
                const dataUrl = canvas.toDataURL(outputType, quality);
                fetch(dataUrl)
                  .then((r) => r.blob())
                  .then((fallbackBlob) => {
                    const newName =
                      outputType === file.type
                        ? file.name
                        : file.name.replace(/\.(heic|heif)$/i, ".jpg");
                    const fallbackFile = new File([fallbackBlob], newName, {
                      type: outputType,
                      lastModified: Date.now(),
                    });
                    resolve(fallbackFile);
                  })
                  .catch(() => resolve(file));
              } catch {
                resolve(file);
              }
            }
          },
          outputType,
          quality
        );
      };
      img.onerror = () => reject(new Error("Failed to load image"));
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
  });
}

function calculateDimensions(
  originalWidth: number,
  originalHeight: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  // Calculate aspect ratio
  const aspectRatio = originalWidth / originalHeight;

  let width = originalWidth;
  let height = originalHeight;

  // Resize if needed
  if (width > maxWidth) {
    width = maxWidth;
    height = width / aspectRatio;
  }

  if (height > maxHeight) {
    height = maxHeight;
    width = height * aspectRatio;
  }

  return { width: Math.round(width), height: Math.round(height) };
}

async function checkIfNeedsResize(
  file: File,
  maxWidth: number,
  maxHeight: number
): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img.width > maxWidth || img.height > maxHeight);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(false); // Assume no resize needed if we can't check
    };

    img.src = url;
  });
}

// Batch compression for multiple images
export async function compressImages(
  files: File[],
  options: ImageCompressionOptions = {},
  onProgress?: (completed: number, total: number) => void
): Promise<File[]> {
  const compressed: File[] = [];

  for (let i = 0; i < files.length; i++) {
    try {
      const compressedFile = await compressImage(files[i], options);
      compressed.push(compressedFile);

      if (onProgress) {
        onProgress(i + 1, files.length);
      }
    } catch (error) {
      console.error(`Failed to compress ${files[i].name}:`, error);
      // Keep original file if compression fails
      compressed.push(files[i]);
    }
  }

  return compressed;
}

// Convert HEIC/HEIF to JPEG (for iOS compatibility)
export async function convertHeicToJpeg(file: File): Promise<File> {
  // This is a placeholder - in production, you'd use a library like heic2any
  // For now, we'll just return the original file
  console.warn("HEIC conversion not implemented. Returning original file.");
  return file;
}

// Utility to get image dimensions
export async function getImageDimensions(
  file: File
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.width, height: img.height });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };

    img.src = url;
  });
}
