import Image, { ImageProps } from "next/image";

/**
 * A drop-in replacement for `next/image` that gracefully skips optimisation
 * for formats NextJS cannot process (e.g. HEIC / HEIF).
 *
 * Usage: simply use the same props you would pass to `next/image`.
 */
export default function RemoteImage(props: ImageProps) {
  // If the src ends with an unsupported extension, disable optimisation.
  const unsupported = /\.(heic|heif|tiff)$/i;
  const srcStr = typeof props.src === "string" ? props.src : undefined;
  const isUnsupported = srcStr ? unsupported.test(srcStr) : false;

  // Ensure alt prop is always present
  const altText = props.alt || "Image";

  return (
    <Image
      {...props}
      alt={altText}
      unoptimized={isUnsupported || props.unoptimized}
    />
  );
}
