import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { storage } from "./firebaseClient";

export interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

/**
 * Uploads a PDF file to Firebase Storage
 * @param file - The PDF file as Blob or File
 * @param fileName - The name for the file in storage
 * @param folder - The folder path in storage (default: 'receipts')
 * @returns Promise with upload result containing URL or error
 */
export async function uploadPDFToFirebase(
  file: Blob | File,
  fileName: string,
  folder: string = "receipts"
): Promise<UploadResult> {
  try {
    // Create a reference to the file location
    const storageRef = ref(storage, `${folder}/${fileName}`);

    // Upload the file
    const snapshot = await uploadBytes(storageRef, file);

    // Get the download URL
    const downloadURL = await getDownloadURL(snapshot.ref);

    return {
      success: true,
      url: downloadURL,
    };
  } catch (error) {
    console.error("Error uploading PDF to Firebase:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Deletes a PDF file from Firebase Storage
 * @param filePath - The full path to the file in storage
 * @returns Promise with deletion result
 */
export async function deletePDFFromFirebase(
  filePath: string
): Promise<UploadResult> {
  try {
    const fileRef = ref(storage, filePath);
    await deleteObject(fileRef);

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error deleting PDF from Firebase:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Generates a unique filename for the PDF
 * @param jobId - The job ID
 * @param timestamp - Optional timestamp (defaults to current time)
 * @returns Formatted filename
 */
export function generatePDFFileName(jobId: string, timestamp?: number): string {
  const ts = timestamp || Date.now();
  const date = new Date(ts).toISOString().split("T")[0]; // YYYY-MM-DD format
  return `receipt-${jobId}-${date}.pdf`;
}
