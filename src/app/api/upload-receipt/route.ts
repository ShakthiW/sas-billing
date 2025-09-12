import { NextRequest, NextResponse } from "next/server";
import admin from "firebase-admin";

// Maximum file size (5MB)
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB in bytes

export async function POST(request: NextRequest) {
  try {
    // Lazy init Firebase Admin at request time to avoid build-time failures
    const serviceAccount = {
      type: process.env.FIREBASE_TYPE,
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
      private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      client_id: process.env.FIREBASE_CLIENT_ID,
      auth_uri: process.env.FIREBASE_AUTH_URI,
      token_uri: process.env.FIREBASE_TOKEN_URI,
      auth_provider_x509_cert_url:
        process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
      client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL,
    } as admin.ServiceAccount;

    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
      });
    }
    const bucket = admin.storage().bucket();

    // Parse the multipart form data
    const formData = await request.formData();
    const file = formData.get("file") as File;

    // Validate file exists
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    if (file.type !== "application/pdf") {
      return NextResponse.json(
        { error: "Only PDF files are supported" },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: `File size exceeds the maximum limit of ${
            MAX_FILE_SIZE / (1024 * 1024)
          }MB`,
        },
        { status: 400 }
      );
    }

    // Convert file to Buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Generate a unique filename to avoid collisions
    const timestamp = Date.now();
    const uniqueFileName = `receipt_${timestamp}_${file.name.replace(
      /[^a-zA-Z0-9.-]/g,
      "_"
    )}`;
    const fileType = file.type;

    // Create a reference in Firebase Storage
    const fileRef = bucket.file(`receipts/${uniqueFileName}`);

    // Upload the file with retry logic
    let uploadAttempt = 0;
    const maxAttempts = 3;

    while (uploadAttempt < maxAttempts) {
      try {
        // Upload with metadata
        await fileRef.save(buffer, {
          metadata: {
            contentType: fileType,
            cacheControl: "public, max-age=31536000",
          },
        });
        break; // Break the loop if upload succeeds
      } catch (uploadError) {
        uploadAttempt++;
        console.error(`Upload attempt ${uploadAttempt} failed:`, uploadError);

        if (uploadAttempt >= maxAttempts) {
          throw new Error(`Failed to upload after ${maxAttempts} attempts`);
        }

        // Wait before retrying
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    // Make the file public and get its URL
    await fileRef.makePublic();
    const fileUrl = `https://storage.googleapis.com/${bucket.name}/${fileRef.name}`;

    // Add cache headers to response
    return NextResponse.json(
      { fileUrl },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("Receipt upload failed:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to upload receipt";

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
