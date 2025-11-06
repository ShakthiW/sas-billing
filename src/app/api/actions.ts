"use server";

import { MongoClient, Db, ObjectId } from "mongodb";
import { v4 as uuidv4 } from "uuid";
// import { revalidatePath } from "next/cache";
import { Bill, CreditPayment, UserRole } from "@/app/types";
import {
  ApprovalRequest,
  ApprovalRequestResponse,
  getApprovalPermissions,
} from "@/types/approval";
import { BankAccount, BankTransaction } from "@/types/bank";

// Firebase Admin init removed from module scope to prevent build-time execution

// --- MongoDB Connection (lazy, runtime-only) ---
let cachedMongoClient: MongoClient | null = null;
let cachedDbName: string | null = null;

function buildMongoUriFromEnv(): { uri: string; dbName: string } {
  const username = process.env.MongoUsername;
  const password = process.env.MongoPassword;
  const cluster = process.env.cluster;
  const dbName = process.env.dbName;
  const authSource = process.env.authSource || "admin";
  const authMechanism = process.env.authMechanism || "SCRAM-SHA-1";
  const localuri = process.env.MONGODB_URI;

  if (localuri) {
    return { uri: localuri, dbName: dbName || "sas-billing-system" };
  }

  if (!username || !password || !cluster || !dbName) {
    throw new Error(
      "Missing MongoDB environment variables. Check your .env file."
    );
  }

  const uri = `mongodb+srv://${username}:${password}@${cluster}/${dbName}?retryWrites=true&w=majority&authSource=${authSource}&authMechanism=${authMechanism}`;
  return { uri, dbName };
}

export async function connectToDatabase(): Promise<Db> {
  if (!cachedMongoClient) {
    const { uri, dbName } = buildMongoUriFromEnv();
    cachedMongoClient = new MongoClient(uri);
    cachedDbName = dbName;
  }
  try {
    await cachedMongoClient.connect();
    return cachedMongoClient.db(cachedDbName || undefined);
  } catch (error) {
    console.error("Database connection error:", error);
    throw new Error("Failed to connect to database");
  }
}

async function getClient(): Promise<MongoClient> {
  if (!cachedMongoClient) {
    const { uri } = buildMongoUriFromEnv();
    cachedMongoClient = new MongoClient(uri);
  }
  try {
    await cachedMongoClient.connect();
    return cachedMongoClient;
  } catch (error) {
    console.error("Database client connection error:", error);
    throw new Error("Failed to connect to database client");
  }
}

// --- createJob Server Action ---
export async function createJob(formData: FormData) {
  console.log("createJob: Server action started");
  try {
    const vehicleNo = formData.get("vehicleNo")?.toString()?.trim() || "";
    const customerName = formData.get("customerName")?.toString()?.trim() || "";
    const customerPhone =
      formData.get("customerPhone")?.toString()?.trim() || "";
    const damageRemarks =
      formData.get("damageRemarks")?.toString()?.trim() || "";
    const isCompanyVehicleString =
      formData.get("isCompanyVehicle")?.toString() || "false";
    const companyName = formData.get("companyName")?.toString()?.trim() || "";
    const subTasksString = formData.get("subTasks")?.toString() || "[]";
    const status = formData.get("status")?.toString() || "todo";
    const imagesString = formData.get("images")?.toString() || "[]";
    const damagePhotosString = formData.get("damagePhotos")?.toString() || "[]";

    console.log("Raw subtasks string:", subTasksString);
    console.log("Raw damage photos string:", damagePhotosString);

    // Parse subtasks (now optional)
    let subTasks = [];
    if (subTasksString && subTasksString !== "[]") {
      try {
        subTasks = JSON.parse(subTasksString).map((task: any) => ({
          subtaskID: task.subtaskID || uuidv4(),
          ...task,
          isCompleted:
            task.isCompleted !== undefined ? task.isCompleted : false,
        }));
      } catch (parseError) {
        console.error("Detailed parse error:", parseError);
        throw new Error("Invalid subtasks data format");
      }
    }

    // Parse uploaded images (array) and damage photos
    let images: string[] = [];
    let damagePhotos = [];
    if (imagesString && imagesString !== "[]") {
      try {
        images = JSON.parse(imagesString);
      } catch (parseError) {
        console.error("Images parse error:", parseError);
        images = [];
      }
    }
    if (damagePhotosString && damagePhotosString !== "[]") {
      try {
        damagePhotos = JSON.parse(damagePhotosString);
      } catch (parseError) {
        console.error("Damage photos parse error:", parseError);
        damagePhotos = [];
      }
    }

    // Validate required fields - only vehicle number is mandatory at task initiation
    if (!vehicleNo) throw new Error("Vehicle number is required");
    if (vehicleNo.length < 3) throw new Error("Vehicle number too short");
    // Customer details are optional at task initiation, will be required at billing

    // Check for existing active jobs with the same vehicle number
    const db = await connectToDatabase();
    const existingActiveJob = await db.collection("jobs").findOne({
      vehicleNo: vehicleNo,
      status: { $ne: "delivered" },
      deleted: { $ne: true },
    });

    if (existingActiveJob) {
      throw new Error(
        `A job with vehicle number "${vehicleNo}" already exists and is not yet delivered. Please wait until the existing job is delivered before creating a new one.`
      );
    }

    // Validate subtasks structure if present
    if (Array.isArray(subTasks) && subTasks.length > 0) {
      for (const task of subTasks) {
        if (typeof task !== "object" || task === null) {
          throw new Error("Each subtask must be an object.");
        }

        if (
          !("taskType" in task) ||
          (task.taskType !== "parts" && task.taskType !== "service")
        ) {
          throw new Error(
            "Each subtask must have a valid taskType ('parts' or 'service')."
          );
        }
      }
    }

    const job = {
      vehicleNo,
      customerName,
      customerPhone,
      damageRemarks,
      subTasks,
      status,
      image: formData.get("image")?.toString()?.trim() || images[0] || "",
      damagePhotos,
      // New company fields
      isCompanyVehicle:
        isCompanyVehicleString === "true" ||
        isCompanyVehicleString === "1" ||
        isCompanyVehicleString === "on",
      companyName:
        (isCompanyVehicleString === "true" ||
          isCompanyVehicleString === "1" ||
          isCompanyVehicleString === "on") &&
          companyName
          ? companyName
          : "",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Reuse the database connection from earlier
    const result = await db.collection("jobs").insertOne(job);

    return {
      acknowledged: result.acknowledged,
      insertedId: result.insertedId.toString(),
      success: true,
    };
  } catch (error: any) {
    console.error("createJob failed:", error);
    throw new Error(error.message || "Failed to create job");
  }
}

//GetAllJob
export async function getAllJobs() {
  console.log("getAllJobs: Fetching all jobs");
  try {
    const db = await connectToDatabase();
    const jobs = await db
      .collection("jobs")
      .find({ deleted: { $ne: true } })
      .toArray();

    type JobData = {
      id: string;
      title: any;
      imageUrl: any;
      subTasksCompleted: number;
      totalSubTasks: any;
      subTasks?: any[]; // Add subtasks to JobData
      customerName?: string; // Add customer info for search
      customerPhone?: string; // Add customer phone for search
      damageRemarks?: string; // Add damage remarks for search
      damagePhotos?: string[]; // Add damage photos
      createdAt?: Date;
      updatedAt?: Date;
    };

    const categorizedJobs: {
      todo: JobData[];
      inProgress: JobData[];
      finished: JobData[];
      delivered: JobData[];
    } = {
      todo: [],
      inProgress: [],
      finished: [],
      delivered: [],
    };

    jobs.forEach((job) => {
      const totalSubTasks = job.subTasks.length;
      const subTasksCompleted = job.subTasks.filter(
        (task: any) => task.isCompleted
      ).length;

      const jobData = {
        id: job._id.toString(),
        title: job.vehicleNo,
        imageUrl: job.image,
        subTasksCompleted,
        totalSubTasks,
        subTasks: job.subTasks, // Include subtasks for frontend
        customerName: job.customerName, // Add customer info for search
        customerPhone: job.customerPhone, // Add customer phone for search
        damageRemarks: job.damageRemarks, // Add damage remarks for search
        damagePhotos: job.damagePhotos, // Add damage photos
        isCompanyVehicle: job.isCompanyVehicle,
        companyName: job.companyName,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
      };

      switch (job.status) {
        case "todo":
          categorizedJobs.todo.push(jobData);
          break;
        case "inProgress":
          categorizedJobs.inProgress.push(jobData);
          break;
        case "finished":
          categorizedJobs.finished.push(jobData);
          break;
        case "delivered":
          categorizedJobs.delivered.push(jobData);
          break;
        // Legacy statuses - migrate to todo
        case "pending":
        case "onHold":
        case "inspection":
        case "partsPending":
          console.warn(
            `Migrating legacy status ${job.status} to todo for job ${job._id}`
          );
          categorizedJobs.todo.push(jobData);
          break;
        default:
          console.warn(`Unknown job status: ${job.status}, defaulting to todo`);
          categorizedJobs.todo.push(jobData);
      }
    });

    console.log("getAllJobs: Jobs fetched and categorized", categorizedJobs);
    return categorizedJobs;
  } catch (error: any) {
    console.error("getAllJobs: Failed to fetch jobs", error);
    throw new Error(error.message || "Failed to fetch jobs");
  }
}

//update job status
export async function updateJobStatus(jobId: string, newStatus: string) {
  try {
    const db = await connectToDatabase();
    const result = await db.collection("jobs").updateOne(
      {
        _id: new ObjectId(jobId),
      },
      {
        $set: {
          status: newStatus,
          updatedAt: new Date(), // Add updatedAt timestamp to track when the status changed
        },
      }
    );

    if (result.matchedCount === 0) {
      throw new Error(`Job with ID ${jobId} not found`);
    }

    // revalidatePath("/dashboard");
    return {
      success: true,
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
    };
  } catch (error: any) {
    console.error("updateJobStatus: Failed to update job status", error);
    throw new Error(error.message || "Failed to update job status");
  }
}

// --- New: Update Subtask Completion ---
export async function updateSubtaskCompletion(
  jobId: string,
  subtaskId: string,
  isCompleted: boolean
) {
  try {
    const db = await connectToDatabase();
    const result = await db.collection("jobs").updateOne(
      {
        _id: new ObjectId(jobId),
        "subTasks.subtaskID": subtaskId,
      },
      { $set: { "subTasks.$.isCompleted": isCompleted } }
    );

    if (result.matchedCount === 0) {
      throw new Error(`Subtask with ID ${subtaskId} not found in job ${jobId}`);
    }

    // revalidatePath("/dashboard");
    return { success: true };
  } catch (error: any) {
    console.error("Subtask update failed:", error);
    throw new Error(error.message || "Failed to update subtask");
  }
}

//update vehicle number
export async function updateVehicleNumber(jobId: string, newVehicleNo: string) {
  try {
    const db = await connectToDatabase();
    const result = await db
      .collection("jobs")
      .updateOne(
        { _id: new ObjectId(jobId) },
        { $set: { vehicleNo: newVehicleNo } }
      );

    if (result.matchedCount === 0) {
      throw new Error(`Job with ID ${jobId} not found`);
    }

    // revalidatePath("/dashboard");
    return {
      success: true,
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
    };
  } catch (error: any) {
    console.error(
      "updateVehicleNumber: Failed to update job vehicle number",
      error
    );
    throw new Error(error.message || "Failed to update job vehicle number");
  }
}

//Update Image URL
export async function updateImageUrl(jobId: string, newImageUrl: string) {
  try {
    const db = await connectToDatabase();
    const result = await db
      .collection("jobs")
      .updateOne(
        { _id: new ObjectId(jobId) },
        { $set: { image: newImageUrl } }
      );

    if (result.matchedCount === 0) {
      throw new Error(`Job with ID ${jobId} not found`);
    }

    // revalidatePath("/dashboard");
    return {
      success: true,
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
    };
  } catch (error: any) {
    console.error("updateImageUrl: Failed to update job image URL", error);
    throw new Error(error.message || "Failed to update job image URL");
  }
}

// --- Update Customer Details ---
export async function updateCustomerDetails(
  jobId: string,
  details: {
    customerName?: string;
    customerPhone?: string;
    damageRemarks?: string;
    damagePhotos?: string[];
  }
) {
  try {
    const db = await connectToDatabase();
    const updateFields: any = {};

    if (details.customerName !== undefined) {
      updateFields.customerName = details.customerName;
    }
    if (details.customerPhone !== undefined) {
      updateFields.customerPhone = details.customerPhone;
    }
    if (details.damageRemarks !== undefined) {
      updateFields.damageRemarks = details.damageRemarks;
    }
    if (details.damagePhotos !== undefined) {
      updateFields.damagePhotos = details.damagePhotos;
    }

    const result = await db
      .collection("jobs")
      .updateOne({ _id: new ObjectId(jobId) }, { $set: updateFields });

    if (result.matchedCount === 0) {
      throw new Error(`Job with ID ${jobId} not found`);
    }

    return {
      success: true,
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
    };
  } catch (error: any) {
    console.error(
      "updateCustomerDetails: Failed to update customer details",
      error
    );
    throw new Error(error.message || "Failed to update customer details");
  }
}

// --- Append damage photos without overwriting ---
export async function appendDamagePhotos(jobId: string, photoUrls: string[]) {
  try {
    if (!Array.isArray(photoUrls) || photoUrls.length === 0) {
      return { success: true, matchedCount: 0, modifiedCount: 0 };
    }

    const db = await connectToDatabase();
    const result = await db
      .collection("jobs")
      .updateOne({ _id: new ObjectId(jobId) }, {
        $push: { damagePhotos: { $each: photoUrls } },
        $set: { updatedAt: new Date() },
      } as any);

    if (result.matchedCount === 0) {
      throw new Error(`Job with ID ${jobId} not found`);
    }

    return {
      success: true,
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
    };
  } catch (error: any) {
    console.error("appendDamagePhotos: Failed to append damage photos", error);
    throw new Error(error.message || "Failed to append damage photos");
  }
}

// --- Add New Subtasks to Existing Job ---
export async function addSubtasksToJob(jobId: string, newSubtasks: any[]) {
  try {
    const db = await connectToDatabase();
    const result = await db
      .collection("jobs")
      .updateOne({ _id: new ObjectId(jobId) }, {
        $push: { subTasks: { $each: newSubtasks } },
      } as any);

    if (result.matchedCount === 0) {
      throw new Error(`Job with ID ${jobId} not found`);
    }

    // revalidatePath("/dashboard");
    return {
      success: true,
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
    };
  } catch (error: any) {
    console.error("addSubtasksToJob: Failed to add subtasks to job", error);
    throw new Error(error.message || "Failed to add subtasks to job");
  }
}

// --- Remove Subtask from Job ---
export async function removeSubtaskFromJob(jobId: string, subtaskId: string) {
  try {
    const db = await connectToDatabase();
    const result = await db
      .collection("jobs")
      .updateOne({ _id: new ObjectId(jobId) }, {
        $pull: { subTasks: { subtaskID: subtaskId } },
      } as any);

    if (result.matchedCount === 0) {
      throw new Error(`Job with ID ${jobId} not found`);
    }

    // revalidatePath("/dashboard");
    return {
      success: true,
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
    };
  } catch (error: any) {
    console.error(
      "removeSubtaskFromJob: Failed to remove subtask from job",
      error
    );
    throw new Error(error.message || "Failed to remove subtask from job");
  }
}

//delete job
export async function deleteJob(jobId: string) {
  try {
    const db = await connectToDatabase();
    const result = await db.collection("jobs").deleteOne({
      _id: new ObjectId(jobId),
    });
    // revalidatePath("/dashboard");
    return result;
  } catch (error) {
    console.error("Failed to delete job:", error);
    throw error;
  }
}

// Bill management functions
export async function createBill(
  billData: Bill,
  additionalServices?: string[]
) {
  let session;

  try {
    const mongoClient = await getClient();
    const db = await connectToDatabase();

    session = mongoClient.startSession();
    await session.startTransaction();

    // Validate bill data
    const validation = await validateBillData(billData);
    if (!validation.isValid) {
      throw new Error(`Invalid bill data: ${validation.errors.join(", ")}`);
    }

    // Check if a bill already exists for this job
    const existingBill = await db
      .collection("bills")
      .findOne({ jobId: billData.jobId }, { session });

    if (existingBill) {
      await session.commitTransaction();
      console.log(
        `Bill already exists for job ${billData.jobId}, using existing bill ID: ${existingBill._id}`
      );
      return {
        success: true,
        billId: existingBill._id.toString(),
        isExisting: true,
      };
    }

    // If there are additional services, add them to the original job first
    if (additionalServices && additionalServices.length > 0) {
      const additionalSubtasks = additionalServices.map((service) => ({
        subtaskID: uuidv4(),
        taskType: "service",
        serviceType: service,
        isCompleted: true,
        isAdditional: true,
        addedAt: new Date(),
      }));

      await db.collection("jobs").updateOne(
        { _id: new ObjectId(billData.jobId) },
        {
          $push: {
            subTasks: { $each: additionalSubtasks },
          } as any,
          $set: { updatedAt: new Date() },
        },
        { session }
      );
    }

    // Calculate amounts with precision
    const calculatedAmounts = await calculateFinancialAmounts(
      billData.totalAmount,
      billData.commission || 0, // Handle optional commission
      billData.initialPayment
    );

    // Create finalized bill with enhanced data
    const finalizedBill = {
      ...billData,
      ...calculatedAmounts,
      _id: new ObjectId(),
      createdAt: new Date(),
      finalizedAt: new Date(),
      updatedAt: new Date(),
      version: 1,
      statusHistory: [
        {
          status: billData.status || "finalized",
          timestamp: new Date(),
          reason: "Bill created and finalized",
        },
      ],
    };

    const result = await db
      .collection("bills")
      .insertOne(finalizedBill, { session });

    // Update bank account balance for non-cash payments
    if (billData.paymentType !== "Cash" && billData.bankAccount) {
      try {
        const bankUpdateResult = await updateBankAccountBalance(
          billData.bankAccount,
          calculatedAmounts.finalAmount,
          "credit", // Bill creation means money coming in
          `Bill created for ${billData.vehicleNo} - ${billData.customerName}`,
          result.insertedId.toString(),
          undefined,
          "system"
        );

        if (!bankUpdateResult.success) {
          console.warn(
            "Failed to update bank account balance:",
            bankUpdateResult.error
          );
          // Log but don't fail bill creation - manual reconciliation may be needed
        }
      } catch (bankError) {
        console.warn("Failed to update bank account balance:", bankError);
        // Log but don't fail bill creation - manual reconciliation may be needed
      }
    }

    await session.commitTransaction();

    console.log(
      `Created new bill for job ${billData.jobId}, bill ID: ${result.insertedId}`
    );
    return {
      success: true,
      billId: result.insertedId.toString(),
      isExisting: false,
    };
  } catch (error: any) {
    if (session) {
      await session.abortTransaction();
    }
    console.error("createBill: Failed to create bill", error);
    throw new Error(error.message || "Failed to create bill");
  } finally {
    if (session) {
      await session.endSession();
    }
  }
}

export async function getBillById(billId: string): Promise<Bill | null> {
  try {
    console.log("getBillById called with billId:", billId);
    const db = await connectToDatabase();
    let bill;

    // Check if billId is a valid ObjectId (actual bill ID)
    if (ObjectId.isValid(billId) && billId.length === 24) {
      console.log("Searching by ObjectId:", billId);
      // First try to find by actual bill ID
      bill = await db
        .collection("bills")
        .findOne({ _id: new ObjectId(billId) });
      console.log("Bill found by ObjectId:", !!bill);
    }

    // If not found or invalid ObjectId, search by jobId and get the most recent bill
    if (!bill) {
      console.log("Searching by jobId:", billId);
      bill = await db
        .collection("bills")
        .find({ jobId: billId })
        .sort({ createdAt: -1 }) // Get most recent bill for this job
        .limit(1)
        .toArray()
        .then((bills) => {
          console.log("Bills found by jobId:", bills.length);
          return bills[0] || null;
        });
    }

    if (!bill) {
      console.log("No bill found for ID:", billId);
      return null;
    }

    console.log("Returning bill data for jobId:", bill.jobId);
    return {
      _id: bill._id.toString(),
      jobId: bill.jobId,
      vehicleNo: bill.vehicleNo,
      vehicleType: bill.vehicleType,
      customerName: bill.customerName,
      customerPhone: bill.customerPhone || "",
      driverName: bill.driverName,
      clientType: bill.clientType || "Customer",
      services: bill.services,
      totalAmount: bill.totalAmount,
      commission: bill.commission || 0, // Handle optional commission
      finalAmount: bill.finalAmount,
      bankAccount: bill.bankAccount,
      bankEntityLabel: bill.bankEntityLabel,
      paymentType: bill.paymentType || "Cash",
      status: bill.status || "finalized",
      initialPayment: bill.initialPayment,
      remainingBalance: bill.remainingBalance,
      chequeDetails: bill.chequeDetails,
      creditDetails: bill.creditDetails,
      remarks: bill.remarks, // Include the remarks field
      createdAt: bill.createdAt,
      finalizedAt: bill.finalizedAt,
      lastPaymentDate: bill.lastPaymentDate,
    };
  } catch (error: any) {
    console.error("getBillById: Failed to fetch bill", error);
    throw new Error(error.message || "Failed to fetch bill");
  }
}

// Draft Bill management functions (Legacy - use createDraftBillSafe instead)
export async function createDraftBill(
  billData: Omit<Bill, "status" | "_id">,
  additionalServices?: string[]
) {
  console.warn(
    "createDraftBill is deprecated. Use createDraftBillSafe instead."
  );
  return createDraftBillSafe(billData, additionalServices);
}

export async function finalizeBill(billId: string) {
  console.warn("finalizeBill is deprecated. Use finalizeBillSafe instead.");
  return finalizeBillSafe(billId);
}

export async function getAllDraftBills(): Promise<Bill[]> {
  try {
    const db = await connectToDatabase();

    const bills = await db
      .collection("bills")
      .find({ status: "draft" })
      .sort({ createdAt: -1 })
      .toArray();

    return bills.map((bill) => ({
      _id: bill._id.toString(),
      jobId: bill.jobId,
      vehicleNo: bill.vehicleNo,
      vehicleType: bill.vehicleType,
      customerName: bill.customerName,
      customerPhone: bill.customerPhone || "",
      driverName: bill.driverName,
      clientType: bill.clientType || "Customer",
      services: bill.services,
      totalAmount: bill.totalAmount,
      commission: bill.commission || 0, // Handle optional commission
      finalAmount: bill.finalAmount,
      bankAccount: bill.bankAccount,
      bankEntityLabel: bill.bankEntityLabel,
      paymentType: bill.paymentType || "Cash",
      status: bill.status,
      initialPayment: bill.initialPayment,
      remainingBalance: bill.remainingBalance,
      chequeDetails: bill.chequeDetails,
      creditDetails: bill.creditDetails,
      createdAt: bill.createdAt,
      finalizedAt: bill.finalizedAt,
      lastPaymentDate: bill.lastPaymentDate,
    }));
  } catch (error: any) {
    console.error("getAllDraftBills: Failed to fetch draft bills", error);
    throw new Error(error.message || "Failed to fetch draft bills");
  }
}

export async function getAllCreditBills(): Promise<Bill[]> {
  try {
    const db = await connectToDatabase();

    // Get all credit bills with remaining balance > 0
    const bills = await db
      .collection("bills")
      .find({
        paymentType: "Credit",
        status: { $in: ["finalized", "partially_paid"] },
        $expr: { $gt: ["$remainingBalance", 0] },
        // Exclude auto-generated updated bill snapshots from the working list
        billType: { $ne: "updated" },
      })
      .sort({ updatedAt: -1 }) // Sort by most recently updated
      .toArray();

    // Create a map to eliminate duplicates by jobId (keeping only the latest bill)
    const uniqueBillsMap = new Map();

    for (const bill of bills) {
      // If we already have this jobId but the current bill is newer, or we don't have this jobId yet
      if (
        !uniqueBillsMap.has(bill.jobId) ||
        bill.updatedAt > uniqueBillsMap.get(bill.jobId).updatedAt
      ) {
        uniqueBillsMap.set(bill.jobId, bill);
      }
    }

    // Convert the map values back to an array
    const uniqueBills = Array.from(uniqueBillsMap.values());

    return uniqueBills.map((bill) => ({
      _id: bill._id.toString(),
      jobId: bill.jobId,
      vehicleNo: bill.vehicleNo,
      vehicleType: bill.vehicleType,
      customerName: bill.customerName,
      customerPhone: bill.customerPhone || "",
      driverName: bill.driverName,
      clientType: bill.clientType || "Customer",
      services: bill.services,
      totalAmount: bill.totalAmount,
      commission: bill.commission || 0, // Handle optional commission
      finalAmount: bill.finalAmount,
      bankAccount: bill.bankAccount,
      bankEntityLabel: bill.bankEntityLabel,
      paymentType: bill.paymentType || "Cash",
      status: bill.status,
      initialPayment: bill.initialPayment,
      remainingBalance: bill.remainingBalance,
      chequeDetails: bill.chequeDetails,
      creditDetails: bill.creditDetails,
      createdAt: bill.createdAt,
      finalizedAt: bill.finalizedAt,
      lastPaymentDate:
        bill.lastPaymentDate ||
        (bill.initialPayment > 0 ? bill.createdAt : null),
    }));
  } catch (error: any) {
    console.error("getAllCreditBills: Failed to fetch credit bills", error);
    throw new Error(error.message || "Failed to fetch credit bills");
  }
}

export async function getAllBills(): Promise<Bill[]> {
  try {
    const db = await connectToDatabase();

    const bills = await db
      .collection("bills")
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    return bills.map((bill) => ({
      _id: bill._id.toString(),
      jobId: bill.jobId,
      vehicleNo: bill.vehicleNo,
      vehicleType: bill.vehicleType,
      customerName: bill.customerName,
      customerPhone: bill.customerPhone || "",
      driverName: bill.driverName,
      clientType: bill.clientType || "Customer",
      services: bill.services,
      totalAmount: bill.totalAmount,
      commission: bill.commission || 0,
      finalAmount: bill.finalAmount,
      bankAccount: bill.bankAccount,
      paymentType: bill.paymentType || "Cash",
      status: bill.status,
      initialPayment: bill.initialPayment,
      remainingBalance: bill.remainingBalance,
      chequeDetails: bill.chequeDetails,
      creditDetails: bill.creditDetails,
      createdAt: bill.createdAt,
      finalizedAt: bill.finalizedAt,
      lastPaymentDate: bill.lastPaymentDate,
    }));
  } catch (error: any) {
    console.error("getAllBills: Failed to fetch bills", error);
    throw new Error(error.message || "Failed to fetch bills");
  }
}

// Credit Payment management functions
export async function recordCreditPayment(
  paymentData: Omit<CreditPayment, "_id" | "createdAt">
) {
  let session;

  try {
    const mongoClient = await getClient();
    const db = await connectToDatabase();

    // Start session for transaction
    session = mongoClient.startSession();
    await session.startTransaction();

    // First, get the current bill to calculate new remaining balance
    const bill = await db
      .collection("bills")
      .findOne({ _id: new ObjectId(paymentData.billId) }, { session });
    if (!bill) {
      throw new Error("Bill not found");
    }

    // Enhanced validation checks
    if (bill.paymentType !== "Credit") {
      throw new Error("Can only record payments for credit bills");
    }

    if (!["finalized", "partially_paid"].includes(bill.status)) {
      throw new Error(
        "Can only record payments for finalized or partially paid bills"
      );
    }

    // Get current remaining balance with precision handling (do not treat 0 as falsy)
    const currentRemaining =
      Math.round(
        ((bill.remainingBalance ?? bill.finalAmount) as number) * 100
      ) / 100;

    // Validate payment amount using the new validation function
    const paymentValidation = await validatePaymentAmount(
      paymentData.paymentAmount,
      currentRemaining
    );
    if (!paymentValidation.isValid) {
      throw new Error(paymentValidation.error);
    }

    // Use precision-safe amount
    const paymentAmount = Math.round(paymentData.paymentAmount * 100) / 100;

    // Calculate new remaining balance with precision handling
    const newRemainingBalance =
      Math.round((currentRemaining - paymentAmount) * 100) / 100;

    // Ensure we never have -0.00 as remaining balance (could happen with floating point)
    const finalRemainingBalance =
      newRemainingBalance <= 0 ? 0 : newRemainingBalance;
    const newStatus = finalRemainingBalance === 0 ? "paid" : "partially_paid";

    // Record the payment with enhanced data
    const payment = {
      ...paymentData,
      paymentAmount: paymentAmount, // Use rounded amount
      _id: new ObjectId(),
      createdAt: new Date(),
      previousBalance: currentRemaining,
      newBalance: finalRemainingBalance,
    };

    await db.collection("creditPayments").insertOne(payment, { session });

    // Update the bill's remaining balance and status
    const updateResult = await db.collection("bills").updateOne(
      { _id: new ObjectId(paymentData.billId) },
      {
        $set: {
          remainingBalance: finalRemainingBalance,
          status: newStatus,
          lastPaymentDate: new Date(),
          updatedAt: new Date(),
          // Add a boolean flag to make filtering easier
          isPaidInFull: finalRemainingBalance === 0,
        },
      },
      { session }
    );

    if (updateResult.matchedCount === 0) {
      throw new Error("Failed to update bill - bill may have been modified");
    }

    // Commit transaction
    await session.commitTransaction();

    // Update bank account balance if payment method involves bank account (outside transaction)
    if (paymentData.paymentMethod !== "Cash" && bill.bankAccount) {
      try {
        const bankUpdateResult = await updateBankAccountBalance(
          bill.bankAccount,
          paymentAmount,
          "credit", // Payment received is a credit to the bank account
          `Payment received for bill ${paymentData.billId} - ${bill.vehicleNo}`,
          paymentData.billId,
          payment._id?.toString(),
          paymentData.processedBy
        );

        if (!bankUpdateResult.success) {
          console.warn(
            "Failed to update bank account balance:",
            bankUpdateResult.error
          );
          // Log but don't fail payment - manual reconciliation may be needed
        }
      } catch (bankError) {
        console.warn("Failed to update bank account balance:", bankError);
        // Log but don't fail payment - manual reconciliation may be needed
      }
    }

    // Generate updated bill after payment (outside transaction)
    let updatedBillResult = null;
    try {
      updatedBillResult = await generateUpdatedBillAfterPayment(
        paymentData.billId,
        paymentAmount
      );
    } catch (updateError) {
      console.warn(
        "Failed to generate updated bill, but payment was recorded:",
        updateError
      );
      // Don't fail the payment if updated bill generation fails
    }

    console.log(
      `Recorded payment of ${paymentAmount} for bill ${paymentData.billId}. New balance: ${finalRemainingBalance}`
    );
    return {
      success: true,
      newRemainingBalance: finalRemainingBalance,
      isPaidInFull: finalRemainingBalance === 0,
      paymentAmount: paymentAmount,
      updatedBill: updatedBillResult,
    };
  } catch (error: any) {
    // Rollback transaction on error
    if (session) {
      await session.abortTransaction();
    }
    console.error("recordCreditPayment: Failed to record payment", error);
    throw new Error(error.message || "Failed to record payment");
  } finally {
    if (session) {
      await session.endSession();
    }
  }
}

export async function getCreditPaymentHistory(
  billId: string
): Promise<CreditPayment[]> {
  try {
    const db = await connectToDatabase();

    const payments = await db
      .collection("creditPayments")
      .find({ billId })
      .sort({ createdAt: -1 })
      .toArray();

    return payments.map((payment) => ({
      _id: payment._id.toString(),
      billId: payment.billId,
      jobId: payment.jobId,
      customerName: payment.customerName,
      vehicleNo: payment.vehicleNo,
      paymentAmount: payment.paymentAmount,
      paymentDate: payment.paymentDate,
      paymentMethod: payment.paymentMethod,
      notes: payment.notes,
      chequeDetails: payment.chequeDetails,
      createdAt: payment.createdAt,
    }));
  } catch (error: any) {
    console.error(
      "getCreditPaymentHistory: Failed to fetch payment history",
      error
    );
    throw new Error(error.message || "Failed to fetch payment history");
  }
}

export async function updateBillStatus(billId: string, status: Bill["status"]) {
  try {
    const db = await connectToDatabase();

    const result = await db
      .collection("bills")
      .updateOne({ _id: new ObjectId(billId) }, { $set: { status } });

    if (result.matchedCount === 0) {
      throw new Error("Bill not found");
    }

    console.log(`Updated bill ${billId} status to ${status}`);
    return { success: true };
  } catch (error: any) {
    console.error("updateBillStatus: Failed to update bill status", error);
    throw new Error(error.message || "Failed to update bill status");
  }
}

// Enhanced Bill Status Management with Validation
export async function updateBillStatusWithValidation(
  billId: string,
  newStatus: Bill["status"],
  reason?: string
) {
  let session;

  try {
    const mongoClient = await getClient();
    const db = await connectToDatabase();

    session = mongoClient.startSession();
    await session.startTransaction();

    // Get current bill with version for optimistic locking
    const currentBill = await db
      .collection("bills")
      .findOne({ _id: new ObjectId(billId) }, { session });

    if (!currentBill) {
      throw new Error("Bill not found");
    }

    // Validate status transition
    const isValidTransition = validateStatusTransition(
      currentBill.status,
      newStatus
    );
    if (!isValidTransition) {
      throw new Error(
        `Invalid status transition from ${currentBill.status} to ${newStatus}`
      );
    }

    // Prepare status history entry
    const statusHistoryEntry = {
      status: newStatus,
      timestamp: new Date(),
      reason:
        reason || `Status changed from ${currentBill.status} to ${newStatus}`,
    };

    // Update bill with status history and version increment
    const updateResult = await db.collection("bills").updateOne(
      { _id: new ObjectId(billId), version: currentBill.version || 0 },
      {
        $set: {
          status: newStatus,
          updatedAt: new Date(),
          ...(newStatus === "finalized" && { finalizedAt: new Date() }),
          statusHistory: [
            ...(currentBill.statusHistory || []),
            statusHistoryEntry,
          ],
        },
        $inc: {
          version: 1,
        },
      },
      { session }
    );

    if (updateResult.matchedCount === 0) {
      throw new Error(
        "Bill was modified by another process. Please refresh and try again."
      );
    }

    await session.commitTransaction();

    console.log(
      `Updated bill ${billId} status from ${currentBill.status} to ${newStatus}`
    );
    return { success: true, previousStatus: currentBill.status, newStatus };
  } catch (error: any) {
    if (session) {
      await session.abortTransaction();
    }
    console.error(
      "updateBillStatusWithValidation: Failed to update bill status",
      error
    );
    throw new Error(error.message || "Failed to update bill status");
  } finally {
    if (session) {
      await session.endSession();
    }
  }
}

// Bill Status Transition Validation
function validateStatusTransition(
  currentStatus: string,
  newStatus: string
): boolean {
  const validTransitions: Record<string, string[]> = {
    draft: ["finalized", "draft"], // Can stay draft or be finalized
    finalized: ["paid", "partially_paid", "finalized"], // Can receive payments or stay finalized
    partially_paid: ["paid", "partially_paid"], // Can receive more payments
    paid: ["paid"], // Final state, can only stay paid
  };

  return validTransitions[currentStatus]?.includes(newStatus) || false;
}

// Financial Calculation Utilities with Precision Handling
export async function calculateFinancialAmounts(
  totalAmount: number,
  commission: number = 0,
  initialPayment: number = 0
): Promise<{
  totalAmount: number;
  commission: number;
  finalAmount: number;
  initialPayment: number;
  remainingBalance: number;
}> {
  // Use cents for precise calculations
  const totalCents = Math.round(totalAmount * 100);
  const commissionCents = Math.round((commission || 0) * 100); // Handle undefined commission
  const initialPaymentCents = Math.round(initialPayment * 100);

  const finalAmountCents = totalCents + commissionCents;
  const remainingBalanceCents = finalAmountCents - initialPaymentCents;

  return {
    totalAmount: totalCents / 100,
    commission: commissionCents / 100,
    finalAmount: finalAmountCents / 100,
    initialPayment: initialPaymentCents / 100,
    remainingBalance: Math.max(0, remainingBalanceCents / 100),
  };
}

// Enhanced Draft Bill Creation with Duplicate Prevention
export async function createDraftBillSafe(
  billData: Omit<Bill, "status" | "_id">,
  additionalServices?: string[]
) {
  let session;

  try {
    const mongoClient = await getClient();
    const db = await connectToDatabase();

    session = mongoClient.startSession();
    await session.startTransaction();

    // Check for existing bills for this job (including both draft and finalized)
    const existingBill = await db
      .collection("bills")
      .findOne({ jobId: billData.jobId }, { session });

    if (existingBill) {
      // If draft exists, return existing draft ID
      if (existingBill.status === "draft") {
        await session.commitTransaction();
        return {
          success: true,
          billId: existingBill._id.toString(),
          isExisting: true,
          status: "draft",
        };
      }
      // If finalized bill exists, prevent creating draft
      else {
        throw new Error(
          `A ${existingBill.status} bill already exists for this job`
        );
      }
    }

    // If there are additional services, add them to the original job first
    if (additionalServices && additionalServices.length > 0) {
      const additionalSubtasks = additionalServices.map((service) => ({
        subtaskID: uuidv4(),
        taskType: "service",
        serviceType: service,
        isCompleted: true,
        isAdditional: true,
        addedAt: new Date(),
      }));

      await db.collection("jobs").updateOne(
        { _id: new ObjectId(billData.jobId) },
        {
          $push: {
            subTasks: { $each: additionalSubtasks },
          } as any,
          $set: { updatedAt: new Date() },
        },
        { session }
      );
    }

    // Calculate amounts with precision
    const calculatedAmounts = await calculateFinancialAmounts(
      billData.totalAmount,
      billData.commission || 0, // Handle optional commission
      billData.initialPayment
    );

    // Create new draft bill with enhanced data
    const draftBill = {
      ...billData,
      ...calculatedAmounts,
      status: "draft" as const,
      _id: new ObjectId(),
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1,
      statusHistory: [
        {
          status: "draft",
          timestamp: new Date(),
          reason: "Bill created as draft",
        },
      ],
    };

    const result = await db
      .collection("bills")
      .insertOne(draftBill, { session });
    await session.commitTransaction();

    console.log(
      `Created draft bill for job ${billData.jobId}, bill ID: ${result.insertedId}`
    );
    return {
      success: true,
      billId: result.insertedId.toString(),
      isExisting: false,
      status: "draft",
    };
  } catch (error: any) {
    if (session) {
      await session.abortTransaction();
    }
    console.error("createDraftBillSafe: Failed to create draft bill", error);
    throw new Error(error.message || "Failed to create draft bill");
  } finally {
    if (session) {
      await session.endSession();
    }
  }
}

// Enhanced Bill Finalization with Validation
export async function finalizeBillSafe(billId: string) {
  try {
    // Use the enhanced status update function
    const result = await updateBillStatusWithValidation(
      billId,
      "finalized",
      "Bill finalized from draft status"
    );

    if (result.success) {
      console.log(`Successfully finalized bill ${billId}`);
      return { success: true };
    }

    throw new Error("Failed to finalize bill");
  } catch (error: any) {
    console.error("finalizeBillSafe: Failed to finalize bill", error);
    throw new Error(error.message || "Failed to finalize bill");
  }
}

// Approval Management Functions
export async function createApprovalRequest(
  type: "part" | "service" | "payment" | "status_change" | "credit_payment",
  jobId: string,
  requestedBy: string,
  requestData: any,
  metadata?: any
): Promise<{ success: boolean; requestId?: string; error?: string }> {
  try {
    const db = await connectToDatabase();

    const approvalRequest = {
      type,
      jobId,
      requestedBy,
      requestData,
      status: "pending" as const,
      createdAt: new Date(),
      metadata,
    };

    const result = await db
      .collection("approvalRequests")
      .insertOne(approvalRequest);

    return {
      success: true,
      requestId: result.insertedId.toString(),
    };
  } catch (error: any) {
    console.error(
      "createApprovalRequest: Failed to create approval request",
      error
    );
    return {
      success: false,
      error: error.message || "Failed to create approval request",
    };
  }
}

export async function getApprovalRequests(
  status?: "pending" | "approved" | "rejected",
  type?: "part" | "service" | "payment" | "status_change" | "credit_payment"
): Promise<ApprovalRequestResponse[]> {
  try {
    const db = await connectToDatabase();

    const filter: any = {};
    if (status) filter.status = status;
    if (type) filter.type = type;

    const requests = await db
      .collection("approvalRequests")
      .find(filter)
      .sort({ createdAt: -1 })
      .toArray();

    return requests.map((request) => ({
      _id: request._id.toString(),
      type: request.type,
      jobId: request.jobId,
      requestedBy: request.requestedBy,
      requestData: request.requestData,
      status: request.status,
      approvedBy: request.approvedBy,
      approvedAt: request.approvedAt,
      rejectionReason: request.rejectionReason,
      createdAt: request.createdAt,
      metadata: request.metadata,
    }));
  } catch (error: any) {
    console.error(
      "getApprovalRequests: Failed to fetch approval requests",
      error
    );
    throw new Error(error.message || "Failed to fetch approval requests");
  }
}

export async function approveRequest(
  requestId: string,
  approvedBy: string,
  action: "approve" | "reject",
  rejectionReason?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = await connectToDatabase();

    // Get the approval request
    const request = await db
      .collection("approvalRequests")
      .findOne({ _id: new ObjectId(requestId) });

    if (!request) {
      throw new Error("Approval request not found");
    }

    if (request.status !== "pending") {
      throw new Error("Request has already been processed");
    }

    // Update the approval request
    await db.collection("approvalRequests").updateOne(
      { _id: new ObjectId(requestId) },
      {
        $set: {
          status: action === "approve" ? "approved" : "rejected",
          approvedBy,
          approvedAt: new Date(),
          ...(rejectionReason && { rejectionReason }),
        },
      }
    );

    // If approved, execute the requested action
    if (action === "approve") {
      const approvalRequest: ApprovalRequest = {
        _id: request._id,
        type: request.type,
        jobId: request.jobId,
        requestedBy: request.requestedBy,
        requestData: request.requestData,
        status: request.status,
        approvedBy: request.approvedBy,
        approvedAt: request.approvedAt,
        rejectionReason: request.rejectionReason,
        createdAt: request.createdAt,
        metadata: request.metadata,
      };
      await executeApprovedRequest(approvalRequest);
    }

    return { success: true };
  } catch (error: any) {
    console.error("approveRequest: Failed to process approval", error);
    return {
      success: false,
      error: error.message || "Failed to process approval",
    };
  }
}

async function executeApprovedRequest(request: ApprovalRequest) {
  const db = await connectToDatabase();

  switch (request.type) {
    case "part":
    case "service":
      // Add the approved part/service to the job
      await db.collection("jobs").updateOne(
        { _id: new ObjectId(request.jobId) },
        {
          $push: {
            subTasks: {
              ...request.requestData,
              approvalStatus: "approved",
              approvedBy: request.approvedBy,
              approvedAt: request.approvedAt,
            },
          },
          $set: { updatedAt: new Date() },
        }
      );
      break;

    case "payment":
      // Process the approved payment
      const { billId, paymentData } = request.requestData;

      // Create credit payment record
      const creditPayment = {
        ...paymentData,
        _id: new ObjectId(),
        billId,
        jobId: request.jobId,
        createdAt: new Date(),
        processedBy: request.approvedBy,
        validationStatus: "verified",
      };

      await db.collection("creditPayments").insertOne(creditPayment);

      // Update bill status and balance
      const bill = await db
        .collection("bills")
        .findOne({ _id: new ObjectId(billId) });

      if (!bill) {
        throw new Error("Bill not found");
      }

      const newBalance =
        (bill.remainingBalance || bill.finalAmount) - paymentData.paymentAmount;
      const newStatus = newBalance <= 0 ? "paid" : "partially_paid";

      await db.collection("bills").updateOne(
        { _id: new ObjectId(billId) },
        {
          $set: {
            remainingBalance: Math.max(0, newBalance),
            status: newStatus,
            lastPaymentDate: new Date(),
            updatedAt: new Date(),
          },
        }
      );
      break;

    case "status_change":
      // Update job status
      const { newStatus: requestedStatus } = request.requestData;
      await db.collection("jobs").updateOne(
        { _id: new ObjectId(request.jobId) },
        {
          $set: {
            status: requestedStatus,
            updatedAt: new Date(),
            lastStatusChangeBy: request.approvedBy,
            lastStatusChangeAt: new Date(),
          },
        }
      );
      break;

    case "credit_payment":
      // Process the approved credit payment
      const { billId: creditBillId, paymentData: creditPaymentData } =
        request.requestData;

      // Create credit payment record
      const approvedCreditPayment = {
        ...creditPaymentData,
        _id: new ObjectId(),
        billId: creditBillId,
        jobId: request.jobId,
        createdAt: new Date(),
        processedBy: request.approvedBy,
        validationStatus: "verified",
      };

      await db.collection("creditPayments").insertOne(approvedCreditPayment);

      // Update bill status and balance
      const creditBill = await db
        .collection("bills")
        .findOne({ _id: new ObjectId(creditBillId) });

      if (!creditBill) {
        throw new Error("Bill not found");
      }

      const updatedBalance =
        (creditBill.remainingBalance || creditBill.finalAmount) -
        creditPaymentData.paymentAmount;
      const updatedStatus = updatedBalance <= 0 ? "paid" : "partially_paid";

      await db.collection("bills").updateOne(
        { _id: new ObjectId(creditBillId) },
        {
          $set: {
            remainingBalance: Math.max(0, updatedBalance),
            status: updatedStatus,
            lastPaymentDate: new Date(),
            updatedAt: new Date(),
          },
        }
      );
      break;
  }
}

// Bill Data Validation Functions
export async function validateBillData(
  billData: any
): Promise<{ isValid: boolean; errors: string[] }> {
  const errors: string[] = [];

  if (!billData.jobId?.trim()) {
    errors.push("Job ID is required");
  }

  if (!billData.vehicleNo?.trim()) {
    errors.push("Vehicle number is required");
  }

  if (!billData.customerName?.trim()) {
    errors.push("Customer name is required");
  }

  if (!billData.customerPhone?.trim()) {
    errors.push("Customer phone is required for billing");
  }

  if (typeof billData.totalAmount !== "number" || billData.totalAmount <= 0) {
    errors.push("Total amount must be a positive number");
  }

  // Commission is now optional and defaults to 0
  if (
    billData.commission !== undefined &&
    (typeof billData.commission !== "number" || billData.commission < 0)
  ) {
    errors.push("Commission must be a non-negative number");
  }

  if (billData.paymentType === "Credit") {
    if (
      billData.initialPayment &&
      typeof billData.initialPayment !== "number"
    ) {
      errors.push("Initial payment must be a number");
    }

    if (
      billData.initialPayment &&
      billData.finalAmount &&
      billData.initialPayment > billData.finalAmount
    ) {
      errors.push("Initial payment cannot exceed final amount");
    }
  }

  if (billData.paymentType === "Cheque") {
    if (!billData.chequeDetails?.chequeNumber?.trim()) {
      errors.push("Cheque number is required for cheque payments");
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// Payment Amount Validation
export async function validatePaymentAmount(
  paymentAmount: number,
  currentBalance: number
): Promise<{ isValid: boolean; error?: string }> {
  if (typeof paymentAmount !== "number" || paymentAmount <= 0) {
    return {
      isValid: false,
      error: "Payment amount must be a positive number",
    };
  }

  if (paymentAmount > currentBalance) {
    return {
      isValid: false,
      error: `Payment amount (${paymentAmount}) cannot exceed remaining balance (${currentBalance})`,
    };
  }

  return { isValid: true };
}

// Updated Bill Generation after Payment
export async function generateUpdatedBillAfterPayment(
  billId: string,
  paymentAmount: number
): Promise<{ success: boolean; updatedBillId?: string; error?: string }> {
  try {
    const db = await connectToDatabase();

    // Get the original bill
    const originalBill = await db
      .collection("bills")
      .findOne({ _id: new ObjectId(billId) });

    if (!originalBill) {
      return {
        success: false,
        error: "Original bill not found",
      };
    }

    // Calculate new balance (do not treat 0 as falsy)
    const priorBalance = (originalBill.remainingBalance ??
      originalBill.finalAmount) as number;
    const newBalance = priorBalance - paymentAmount;

    // Create updated bill
    const updatedBill = {
      ...originalBill,
      _id: new ObjectId(),
      billType: "updated",
      originalBillId: billId,
      generatedAt: new Date(),
      remainingBalance: Math.max(0, newBalance),
      status: newBalance <= 0 ? "paid" : "partially_paid",
      paymentSummary: {
        totalAmount: originalBill.finalAmount,
        totalPayments: originalBill.finalAmount - priorBalance + paymentAmount,
        remainingBalance: Math.max(0, newBalance),
        paymentHistory: [], // This would be populated from creditPayments collection
        lastPayment: {
          amount: paymentAmount,
          date: new Date(),
          newBalance: Math.max(0, newBalance),
        },
      },
    };

    const result = await db.collection("bills").insertOne(updatedBill);

    return {
      success: true,
      updatedBillId: result.insertedId.toString(),
    };
  } catch (error: any) {
    console.error(
      "generateUpdatedBillAfterPayment: Failed to generate updated bill",
      error
    );
    return {
      success: false,
      error: error.message || "Failed to generate updated bill",
    };
  }
}

// Enhanced SubTask creation with approval workflow
export async function addSubTaskWithApproval(
  jobId: string,
  subtaskData: any,
  requestedBy: string,
  userRole: UserRole
): Promise<{
  success: boolean;
  requiresApproval?: boolean;
  subtaskId?: string;
  requestId?: string;
  error?: string;
}> {
  try {
    const db = await connectToDatabase();

    // Check if approval is required based on user role
    const requiresApproval = userRole === "staff";

    if (requiresApproval) {
      // Create approval request
      const result = await createApprovalRequest(
        subtaskData.taskType,
        jobId,
        requestedBy,
        subtaskData,
        {
          partType: subtaskData.partsType,
          serviceName: subtaskData.serviceType,
          warrantyPeriod: subtaskData.warrantyPeriod,
        }
      );

      return {
        success: true,
        requiresApproval: true,
        requestId: result.requestId,
      };
    } else {
      // Direct addition for admin/manager
      const subtaskId = uuidv4();
      const enhancedSubtask = {
        ...subtaskData,
        subtaskID: subtaskId,
        isCompleted: false,
        approvalStatus: "approved",
        approvedBy: requestedBy,
        approvedAt: new Date(),
      };

      await db.collection("jobs").updateOne(
        { _id: new ObjectId(jobId) },
        {
          $push: { subTasks: enhancedSubtask },
          $set: { updatedAt: new Date() },
        }
      );

      return {
        success: true,
        requiresApproval: false,
        subtaskId,
      };
    }
  } catch (error: any) {
    console.error("addSubTaskWithApproval: Failed to add subtask", error);
    return {
      success: false,
      error: error.message || "Failed to add subtask",
    };
  }
}

// Add Credit Payment function
export async function addCreditPayment(
  billId: string,
  paymentAmount: number,
  paymentMethod: "Cash" | "Cheque" | "Bank Transfer",
  notes?: string,
  chequeDetails?: {
    chequeNumber: string;
    chequeDate: string;
    bankName?: string;
    chequeImageUrl?: string;
  },
  processedBy?: string
): Promise<{ success: boolean; paymentId?: string; error?: string }> {
  try {
    const db = await connectToDatabase();

    // Verify bill exists and get current details
    const bill = await db
      .collection("bills")
      .findOne({ _id: new ObjectId(billId) });
    if (!bill) {
      return {
        success: false,
        error: "Bill not found",
      };
    }

    // Calculate remaining balance
    const currentBalance = bill.remainingBalance || bill.finalAmount;
    if (paymentAmount > currentBalance) {
      return {
        success: false,
        error: "Payment amount exceeds remaining balance",
      };
    }

    // Create credit payment record
    const creditPayment: CreditPayment = {
      billId: billId,
      jobId: bill.jobId,
      vehicleNo: bill.vehicleNo,
      customerName: bill.customerName,
      paymentAmount,
      paymentMethod,
      paymentDate: new Date(),
      notes,
      chequeDetails,
      processedBy,
      createdAt: new Date(),
      previousBalance: currentBalance,
      newBalance: currentBalance - paymentAmount,
      validationStatus: paymentMethod === "Cheque" ? "pending" : "verified",
    };

    // Insert payment record
    const paymentResult = await db
      .collection("creditPayments")
      .insertOne(creditPayment as any);

    // Update bill with new balance and status
    const newBalance = currentBalance - paymentAmount;
    const newStatus = newBalance <= 0 ? "paid" : "partially_paid";

    await db.collection("bills").updateOne(
      { _id: new ObjectId(billId) },
      {
        $set: {
          remainingBalance: newBalance,
          status: newStatus,
          updatedAt: new Date(),
          ...(newBalance <= 0 && { paidAt: new Date() }),
        },
      }
    );

    // Update bank account balance if payment method involves bank account
    if (paymentMethod !== "Cash" && bill.bankAccount) {
      try {
        const bankUpdateResult = await updateBankAccountBalance(
          bill.bankAccount,
          paymentAmount,
          "credit", // Payment received is a credit to the bank account
          `Payment received for bill ${billId} - ${bill.vehicleNo}`,
          billId,
          paymentResult.insertedId.toString(),
          processedBy
        );

        if (!bankUpdateResult.success) {
          console.warn(
            "Failed to update bank account balance:",
            bankUpdateResult.error
          );
          // Log but don't fail payment - manual reconciliation may be needed
        }
      } catch (bankError) {
        console.warn("Failed to update bank account balance:", bankError);
        // Log but don't fail payment - manual reconciliation may be needed
      }
    }

    // Generate updated bill for record keeping
    await generateUpdatedBillAfterPayment(billId, paymentAmount);

    // Log audit trail if processedBy is provided
    if (processedBy) {
      try {
        await db.collection("auditLog").insertOne({
          userId: processedBy,
          userRole: "unknown", // Would need to fetch user role
          action: "create_payment",
          resource: "creditPayment",
          resourceId: paymentResult.insertedId.toString(),
          newData: {
            billId,
            paymentAmount,
            paymentMethod,
            newBalance,
          },
          timestamp: new Date(),
          success: true,
          metadata: {
            billVehicleNo: bill.vehicleNo,
            customerName: bill.customerName,
          },
        } as any);
      } catch (auditError) {
        console.error("Failed to log audit trail:", auditError);
        // Don't fail the payment if audit logging fails
      }
    }

    return {
      success: true,
      paymentId: paymentResult.insertedId.toString(),
    };
  } catch (error: any) {
    console.error("addCreditPayment: Failed to add credit payment", error);
    return {
      success: false,
      error: error.message || "Failed to process credit payment",
    };
  }
}

// Get All Credit Payments function
export async function getAllCreditPayments(
  limit: number = 50,
  offset: number = 0,
  filterOptions?: {
    vehicleNo?: string;
    customerName?: string;
    paymentMethod?: string;
    status?: string;
    dateFrom?: Date;
    dateTo?: Date;
  }
): Promise<{
  success: boolean;
  payments?: CreditPayment[];
  total?: number;
  error?: string;
}> {
  try {
    const db = await connectToDatabase();

    // Build filter query
    const filter: any = {};

    if (filterOptions?.vehicleNo) {
      filter.vehicleNo = { $regex: filterOptions.vehicleNo, $options: "i" };
    }

    if (filterOptions?.customerName) {
      filter.customerName = {
        $regex: filterOptions.customerName,
        $options: "i",
      };
    }

    if (filterOptions?.paymentMethod) {
      filter.paymentMethod = filterOptions.paymentMethod;
    }

    if (filterOptions?.status) {
      filter.status = filterOptions.status;
    }

    if (filterOptions?.dateFrom || filterOptions?.dateTo) {
      filter.paymentDate = {};
      if (filterOptions.dateFrom) {
        filter.paymentDate.$gte = filterOptions.dateFrom;
      }
      if (filterOptions.dateTo) {
        filter.paymentDate.$lte = filterOptions.dateTo;
      }
    }

    // Get total count
    const total = await db.collection("creditPayments").countDocuments(filter);

    // Get payments with pagination
    const payments = await db
      .collection("creditPayments")
      .find(filter)
      .sort({ paymentDate: -1 })
      .skip(offset)
      .limit(limit)
      .toArray();

    const formattedPayments: CreditPayment[] = payments.map(
      (payment) =>
      ({
        ...payment,
        _id: payment._id.toString(),
      } as CreditPayment)
    );

    return {
      success: true,
      payments: formattedPayments,
      total,
    };
  } catch (error: any) {
    console.error("getAllCreditPayments: Failed to get credit payments", error);
    return {
      success: false,
      error: error.message || "Failed to retrieve credit payments",
    };
  }
}

// Update Credit Payment Status (for cheque clearance, etc.)
export async function updateCreditPaymentStatus(
  paymentId: string,
  status: "pending" | "completed" | "failed",
  updatedBy?: string,
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = await connectToDatabase();

    const updateData: any = {
      status,
      updatedAt: new Date(),
    };

    if (updatedBy) {
      updateData.updatedBy = updatedBy;
    }

    if (notes) {
      updateData.statusNotes = notes;
    }

    await db
      .collection("creditPayments")
      .updateOne({ paymentId }, { $set: updateData });

    return { success: true };
  } catch (error: any) {
    console.error(
      "updateCreditPaymentStatus: Failed to update payment status",
      error
    );
    return {
      success: false,
      error: error.message || "Failed to update payment status",
    };
  }
}

// === Bank Account Management Functions ===

// Create a new bank account
export async function createBankAccount(
  accountData: Omit<BankAccount, "_id" | "createdAt" | "updatedAt">
): Promise<{ success: boolean; accountId?: string; error?: string }> {
  try {
    const db = await connectToDatabase();

    // Check if account with same account number already exists
    const existingAccount = await db.collection("bankAccounts").findOne({
      accountNumber: accountData.accountNumber,
    });

    if (existingAccount) {
      return {
        success: false,
        error: "Account with this account number already exists",
      };
    }

    const result = await db.collection("bankAccounts").insertOne({
      ...accountData,
      createdAt: new Date(),
      updatedAt: new Date(),
      transactionHistory: [],
    } as any);

    return {
      success: true,
      accountId: result.insertedId.toString(),
    };
  } catch (error: any) {
    console.error("createBankAccount: Failed to create bank account", error);
    return {
      success: false,
      error: error.message || "Failed to create bank account",
    };
  }
}

// Get all bank accounts
export async function getAllBankAccounts(): Promise<BankAccount[]> {
  try {
    const db = await connectToDatabase();

    const accounts = await db
      .collection("bankAccounts")
      .find({ isActive: true })
      .sort({ accountName: 1 })
      .toArray();

    return accounts.map(
      (account) =>
      ({
        ...account,
        _id: account._id.toString(),
      } as BankAccount)
    );
  } catch (error: any) {
    console.error("getAllBankAccounts: Failed to fetch bank accounts", error);
    throw new Error(error.message || "Failed to fetch bank accounts");
  }
}

// Get bank account by ID
export async function getBankAccountById(
  accountId: string
): Promise<BankAccount | null> {
  try {
    const db = await connectToDatabase();

    const account = await db.collection("bankAccounts").findOne({
      _id: new ObjectId(accountId),
    });

    return account
      ? ({
        ...account,
        _id: account._id.toString(),
      } as BankAccount)
      : null;
  } catch (error: any) {
    console.error("getBankAccountById: Failed to fetch bank account", error);
    throw new Error(error.message || "Failed to fetch bank account");
  }
}

// Update bank account balance (used when processing payments)
export async function updateBankAccountBalance(
  accountId: string,
  amount: number,
  type: "debit" | "credit",
  description: string,
  billId?: string,
  paymentId?: string,
  processedBy?: string
): Promise<{ success: boolean; newBalance?: number; error?: string }> {
  try {
    const db = await connectToDatabase();

    // Get current account details
    const account = await db
      .collection("bankAccounts")
      .findOne({ _id: new ObjectId(accountId) });

    if (!account) {
      throw new Error("Bank account not found");
    }

    if (!account.isActive) {
      throw new Error("Bank account is inactive");
    }

    // Calculate new balance
    const currentBalance = account.currentBalance || 0;
    const newBalance =
      type === "credit" ? currentBalance + amount : currentBalance - amount;

    // Check if debit would exceed available balance
    if (type === "debit" && newBalance < 0) {
      throw new Error("Insufficient funds in bank account");
    }

    // Check if debit would exceed total balance/credit limit
    if (type === "debit" && newBalance > account.totalBalance) {
      throw new Error("Transaction would exceed account limit");
    }

    // Update account balance
    await db.collection("bankAccounts").updateOne(
      { _id: new ObjectId(accountId) },
      {
        $set: {
          currentBalance: newBalance,
          updatedAt: new Date(),
        },
      }
    );

    // Record transaction
    const transactionData: Omit<BankTransaction, "_id" | "createdAt"> = {
      accountId,
      type,
      amount,
      description,
      billId,
      paymentId,
      balanceAfter: newBalance,
      date: new Date(),
      processedBy,
    };

    await db.collection("bankTransactions").insertOne({
      ...transactionData,
      createdAt: new Date(),
    } as any);

    return {
      success: true,
      newBalance,
    };
  } catch (error: any) {
    console.error(
      "updateBankAccountBalance: Failed to update bank balance",
      error
    );
    return {
      success: false,
      error: error.message || "Failed to update bank account balance",
    };
  }
}

// Get bank transaction history
export async function getBankTransactionHistory(
  accountId: string,
  limit: number = 50,
  offset: number = 0
): Promise<BankTransaction[]> {
  try {
    const db = await connectToDatabase();

    const transactions = await db
      .collection("bankTransactions")
      .find({ accountId })
      .sort({ date: -1 })
      .skip(offset)
      .limit(limit)
      .toArray();

    return transactions.map(
      (transaction) =>
      ({
        ...transaction,
        _id: transaction._id.toString(),
      } as BankTransaction)
    );
  } catch (error: any) {
    console.error(
      "getBankTransactionHistory: Failed to fetch transaction history",
      error
    );
    throw new Error(error.message || "Failed to fetch transaction history");
  }
}

// Get bank transaction by ID
export async function getBankTransactionById(
  transactionId: string
): Promise<BankTransaction | null> {
  try {
    const db = await connectToDatabase();

    const transaction = await db.collection("bankTransactions").findOne({
      _id: new ObjectId(transactionId),
    });

    return transaction
      ? ({
        ...transaction,
        _id: transaction._id.toString(),
      } as BankTransaction)
      : null;
  } catch (error: any) {
    console.error("getBankTransactionById: Failed to fetch transaction", error);
    throw new Error(error.message || "Failed to fetch transaction");
  }
}

// Update bank account details (for admin edits)
export async function updateBankAccount(
  accountId: string,
  updates: {
    accountName?: string;
    accountNumber?: string;
    bankName?: string;
    accountType?: "Current" | "Savings" | "Business" | "Tax";
    entityLabel?: "SAS Air Conditioning" | "SAS Enterprises";
    currentBalance?: number;
    totalBalance?: number;
    description?: string;
    isActive?: boolean;
  },
  adminUserId: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = await connectToDatabase();

    // Get current account details for audit
    const currentAccount = await db
      .collection("bankAccounts")
      .findOne({ _id: new ObjectId(accountId) });

    if (!currentAccount) {
      throw new Error("Bank account not found");
    }

    // Prepare update data
    const updateData: any = {
      ...updates,
      updatedAt: new Date(),
    };

    // Update the account
    await db
      .collection("bankAccounts")
      .updateOne({ _id: new ObjectId(accountId) }, { $set: updateData });

    // If balance was manually adjusted, record it as a transaction
    if (
      updates.currentBalance !== undefined &&
      updates.currentBalance !== currentAccount.currentBalance
    ) {
      const balanceDifference =
        updates.currentBalance - (currentAccount.currentBalance || 0);
      const transactionType = balanceDifference > 0 ? "credit" : "debit";
      const transactionAmount = Math.abs(balanceDifference);

      const transactionData: Omit<BankTransaction, "_id" | "createdAt"> = {
        accountId,
        type: transactionType,
        amount: transactionAmount,
        description: reason || `Manual balance adjustment by admin`,
        balanceAfter: updates.currentBalance,
        date: new Date(),
        processedBy: adminUserId,
      };

      await db.collection("bankTransactions").insertOne({
        ...transactionData,
        createdAt: new Date(),
      } as any);
    }

    // Log audit trail
    await db.collection("auditLogs").insertOne({
      action: "BANK_ACCOUNT_UPDATED",
      userId: adminUserId,
      targetId: accountId,
      targetType: "bank_account",
      changes: updates,
      previousState: {
        accountName: currentAccount.accountName,
        accountNumber: currentAccount.accountNumber,
        bankName: currentAccount.bankName,
        accountType: currentAccount.accountType,
        currentBalance: currentAccount.currentBalance,
        totalBalance: currentAccount.totalBalance,
        description: currentAccount.description,
        isActive: currentAccount.isActive,
      },
      timestamp: new Date(),
      ipAddress: "system", // You might want to pass this as a parameter
      userAgent: "Bank Details Interface",
    });

    return { success: true };
  } catch (error: any) {
    console.error("updateBankAccount: Failed to update bank account", error);
    return {
      success: false,
      error: error.message || "Failed to update bank account",
    };
  }
}

// Migration function to update legacy job statuses
export async function migrateLegacyJobStatuses(): Promise<{
  success: boolean;
  updated: number;
  error?: string;
}> {
  try {
    const db = await connectToDatabase();

    const legacyStatuses = ["pending", "onHold", "inspection", "partsPending"];

    // Find all jobs with legacy statuses
    const jobsToUpdate = await db
      .collection("jobs")
      .find({
        status: { $in: legacyStatuses },
      })
      .toArray();

    if (jobsToUpdate.length === 0) {
      return { success: true, updated: 0 };
    }

    // Update all legacy statuses to 'todo'
    const updateResult = await db.collection("jobs").updateMany(
      { status: { $in: legacyStatuses } },
      {
        $set: {
          status: "todo",
          updatedAt: new Date(),
          migrationNote: "Status migrated from legacy status to 'todo'",
        },
      }
    );

    console.log(
      `Successfully migrated ${updateResult.modifiedCount} jobs from legacy statuses to 'todo'`
    );

    return {
      success: true,
      updated: updateResult.modifiedCount,
    };
  } catch (error: any) {
    console.error(
      "migrateLegacyJobStatuses: Failed to migrate legacy statuses",
      error
    );
    return {
      success: false,
      updated: 0,
      error: error.message || "Failed to migrate legacy job statuses",
    };
  }
}

// Helper functions for creating approval requests
export async function requestStatusChange(
  jobId: string,
  currentStatus: string,
  newStatus: string,
  requestedBy: string,
  vehicleNo?: string
): Promise<{ success: boolean; message: string; requestId?: string }> {
  try {
    const db = await connectToDatabase();

    const approvalRequest: ApprovalRequest = {
      type: "status_change",
      jobId,
      requestedBy,
      requestData: {
        currentStatus,
        newStatus,
        vehicleNo,
      },
      status: "pending",
      createdAt: new Date(),
      metadata: {
        currentStatus,
        newStatus,
        vehicleNo,
      },
    };

    const result = await db
      .collection("approvalRequests")
      .insertOne(approvalRequest);

    return {
      success: true,
      message: `Status change request submitted for approval (${currentStatus} → ${newStatus})`,
      requestId: result.insertedId.toString(),
    };
  } catch (error: any) {
    console.error("Failed to create status change request:", error);
    return {
      success: false,
      message: "Failed to submit status change request: " + error.message,
    };
  }
}

export async function requestCreditPayment(
  billId: string,
  jobId: string,
  paymentData: any,
  requestedBy: string
): Promise<{ success: boolean; message: string; requestId?: string }> {
  try {
    const db = await connectToDatabase();

    // Get bill details for context
    const bill = await db
      .collection("bills")
      .findOne({ _id: new ObjectId(billId) });
    if (!bill) {
      return {
        success: false,
        message: "Bill not found",
      };
    }

    const approvalRequest: ApprovalRequest = {
      type: "credit_payment",
      jobId,
      requestedBy,
      requestData: {
        billId,
        paymentData,
      },
      status: "pending",
      createdAt: new Date(),
      metadata: {
        customerName: bill.customerName,
        creditAmount: paymentData.paymentAmount,
        paymentMethod: paymentData.paymentMethod,
        remainingBalance: bill.remainingBalance || bill.finalAmount,
        billId,
      },
    };

    const result = await db
      .collection("approvalRequests")
      .insertOne(approvalRequest);

    return {
      success: true,
      message: `Credit payment request submitted for approval (${paymentData.paymentMethod}: $${paymentData.paymentAmount})`,
      requestId: result.insertedId.toString(),
    };
  } catch (error: any) {
    console.error("Failed to create credit payment request:", error);
    return {
      success: false,
      message: "Failed to submit credit payment request: " + error.message,
    };
  }
}

// Updated updateJobStatus function that checks permissions and creates approval requests
export async function updateJobStatusWithApproval(
  jobId: string,
  newStatus: string,
  userId: string,
  userRole: string
): Promise<{ success: boolean; message: string; requestId?: string }> {
  try {
    const db = await connectToDatabase();

    // Get current job status
    const job = await db
      .collection("jobs")
      .findOne({ _id: new ObjectId(jobId) });
    if (!job) {
      return {
        success: false,
        message: "Job not found",
      };
    }

    const permissions = getApprovalPermissions(userRole as any);

    // Check if user can directly update status or needs approval
    if (
      userRole === "admin" ||
      (userRole === "manager" && permissions.canApproveStatusChanges)
    ) {
      // Direct update for admin and managers
      await db.collection("jobs").updateOne(
        { _id: new ObjectId(jobId) },
        {
          $set: {
            status: newStatus,
            updatedAt: new Date(),
            lastStatusChangeBy: userId,
            lastStatusChangeAt: new Date(),
          },
        }
      );

      return {
        success: true,
        message: `Job status updated to ${newStatus}`,
      };
    } else if (userRole === "staff" && permissions.canRequestStatusChanges) {
      // Create approval request for staff
      return await requestStatusChange(
        jobId,
        job.status,
        newStatus,
        userId,
        job.vehicleNo
      );
    } else {
      return {
        success: false,
        message: "You do not have permission to change job status",
      };
    }
  } catch (error: any) {
    console.error("Failed to update job status:", error);
    return {
      success: false,
      message: "Failed to update job status: " + error.message,
    };
  }
}

// Updated credit payment function that checks permissions and creates approval requests
export async function processCreditPaymentWithApproval(
  billId: string,
  paymentData: any,
  userId: string,
  userRole: string
): Promise<{ success: boolean; message: string; requestId?: string }> {
  try {
    const db = await connectToDatabase();

    // Get bill details
    const bill = await db
      .collection("bills")
      .findOne({ _id: new ObjectId(billId) });
    if (!bill) {
      return {
        success: false,
        message: "Bill not found",
      };
    }

    const permissions = getApprovalPermissions(userRole as any);

    // Check if user can directly process payment or needs approval
    if (userRole === "admin" || permissions.canApproveCreditPayments) {
      // Direct processing for admin (and managers if they have permission)
      const mongoClient = await getClient();
      const session = mongoClient.startSession();

      try {
        await session.withTransaction(async () => {
          // Create credit payment record
          const creditPayment = {
            _id: new ObjectId(),
            billId,
            jobId: bill.jobId,
            ...paymentData,
            createdAt: new Date(),
            processedBy: userId,
            validationStatus: "verified",
          };

          await db
            .collection("creditPayments")
            .insertOne(creditPayment, { session });

          // Update bill status and balance
          const newBalance =
            (bill.remainingBalance || bill.finalAmount) -
            paymentData.paymentAmount;
          const newStatus = newBalance <= 0 ? "paid" : "partially_paid";

          await db.collection("bills").updateOne(
            { _id: new ObjectId(billId) },
            {
              $set: {
                remainingBalance: Math.max(0, newBalance),
                status: newStatus,
                lastPaymentDate: new Date(),
                updatedAt: new Date(),
              },
            },
            { session }
          );
        });
      } finally {
        await session.endSession();
      }

      return {
        success: true,
        message: `Credit payment processed successfully (${paymentData.paymentMethod}: $${paymentData.paymentAmount})`,
      };
    } else if (userRole === "staff" && permissions.canRequestCreditPayments) {
      // Create approval request for staff
      return await requestCreditPayment(
        billId,
        bill.jobId,
        paymentData,
        userId
      );
    } else {
      return {
        success: false,
        message: "You do not have permission to process credit payments",
      };
    }
  } catch (error: any) {
    console.error("Failed to process credit payment:", error);
    return {
      success: false,
      message: "Failed to process credit payment: " + error.message,
    };
  }
}
