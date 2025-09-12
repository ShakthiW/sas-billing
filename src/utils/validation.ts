// Input validation utilities for forms
import { z } from "zod";

// Common validation schemas
export const phoneNumberSchema = z
  .string()
  .min(10, "Phone number must be at least 10 digits")
  .max(15, "Phone number must not exceed 15 digits")
  .regex(
    /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/,
    "Invalid phone number format"
  );

export const vehicleNumberSchema = z
  .string()
  .min(2, "Vehicle number is too short")
  .max(20, "Vehicle number is too long")
  .regex(
    /^[A-Z0-9\s-]+$/i,
    "Vehicle number can only contain letters, numbers, spaces, and hyphens"
  );

export const customerNameSchema = z
  .string()
  .min(2, "Customer name must be at least 2 characters")
  .max(100, "Customer name is too long")
  .regex(
    /^[a-zA-Z\s.'-]+$/,
    "Name can only contain letters, spaces, dots, apostrophes, and hyphens"
  );

export const amountSchema = z
  .string()
  .regex(/^\d+(\.\d{0,2})?$/, "Invalid amount format")
  .refine((val) => parseFloat(val) > 0, "Amount must be greater than 0");

// Job creation validation schema - customer details are optional at initiation
export const jobFormSchema = z.object({
  vehicleNo: vehicleNumberSchema,
  customerName: customerNameSchema.optional().or(z.literal("")),
  customerPhone: phoneNumberSchema.optional().or(z.literal("")),
  damageRemarks: z.string().max(500, "Remarks too long").optional(),
  status: z.enum(["todo", "inProgress", "finished", "delivered"]),
  subTasks: z
    .array(
      z.object({
        subtaskID: z.string(),
        taskType: z.enum(["parts", "service"]),
        serviceType: z.string().optional(),
        partsType: z.string().optional(),
        partsBrand: z.string().optional(),
        isCompleted: z.boolean(),
      })
    )
    .optional(),
});

// Billing form validation schema
export const billingFormSchema = z
  .object({
    vehicleType: z
      .string()
      .min(2, "Vehicle type must be at least 2 characters")
      .optional()
      .or(z.literal("")),
    customerName: customerNameSchema,
    driverName: z.string().optional(),
    clientType: z.enum(["Customer", "Company"]),
    totalAmount: amountSchema,
    commission: z
      .string()
      .regex(/^\d+(\.\d{0,2})?$/, "Invalid commission format")
      .optional(),
    bankAccount: z.string().min(1, "Bank account is required"),
    paymentType: z.enum(["Cash", "Credit", "Cheque"]),

    // Credit payment fields
    initialPayment: z
      .string()
      .regex(/^\d+(\.\d{0,2})?$/, "Invalid payment format")
      .optional(),
    dueDate: z.string().optional(),
    creditTerms: z.string().max(200, "Credit terms too long").optional(),

    // Cheque payment fields
    chequeNumber: z.string().optional(),
    chequeDate: z.string().optional(),
    bankName: z.string().optional(),
  })
  .refine(
    (data) => {
      // Additional validation for payment types
      if (data.paymentType === "Cheque") {
        return data.chequeNumber && data.chequeDate && data.bankName;
      }
      return true;
    },
    {
      message: "Cheque details are required for cheque payments",
      path: ["chequeNumber"],
    }
  )
  .refine(
    (data) => {
      // Validate initial payment doesn't exceed total
      if (data.paymentType === "Credit" && data.initialPayment) {
        const total = parseFloat(data.totalAmount);
        const initial = parseFloat(data.initialPayment);
        const commission = data.commission ? parseFloat(data.commission) : 0;
        return initial <= total + commission;
      }
      return true;
    },
    {
      message: "Initial payment cannot exceed total amount",
      path: ["initialPayment"],
    }
  );

// Credit payment validation schema
export const creditPaymentSchema = z
  .object({
    amount: amountSchema,
    method: z.enum(["Cash", "Cheque", "Bank Transfer"]),
    notes: z.string().max(500, "Notes too long").optional(),
    chequeNumber: z.string().optional(),
    chequeDate: z.string().optional(),
    bankName: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.method === "Cheque") {
        return data.chequeNumber && data.chequeDate && data.bankName;
      }
      return true;
    },
    {
      message: "Cheque details are required for cheque payments",
      path: ["chequeNumber"],
    }
  );

// Sanitization functions
export function sanitizeInput(input: string): string {
  // Remove any potential XSS attempts
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<[^>]+>/g, "") // Remove HTML tags
    .replace(/[<>'"]/g, "") // Remove special characters that could be used for injection
    .trim();
}

export function sanitizeVehicleNumber(input: string): string {
  // Sri Lankan vehicle numbers typically follow patterns like "WP GA-1234" or "CAR-1234"
  return input
    .toUpperCase()
    .replace(/[^A-Z0-9\s-]/g, "")
    .trim();
}

export function sanitizePhoneNumber(input: string): string {
  // Keep only digits and common phone number characters
  return input.replace(/[^\d+\s()-]/g, "").trim();
}

export function sanitizeAmount(input: string): string {
  // Keep only digits and decimal point
  return input.replace(/[^\d.]/g, "").trim();
}

// Validation error formatter
export function formatValidationErrors(
  errors: z.ZodError
): Record<string, string> {
  const formattedErrors: Record<string, string> = {};

  errors.issues.forEach((error) => {
    const path = error.path.join(".");
    formattedErrors[path] = error.message;
  });

  return formattedErrors;
}

// Validate and sanitize form data
export async function validateAndSanitize<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  sanitizers?: Record<string, (value: string) => string>
): Promise<
  | { success: true; data: T }
  | { success: false; errors: Record<string, string> }
> {
  try {
    // Apply sanitizers if provided
    if (sanitizers && typeof data === "object" && data !== null) {
      const sanitizedData = { ...data };

      Object.entries(sanitizers).forEach(([field, sanitizer]) => {
        if (
          field in sanitizedData &&
          typeof (sanitizedData as any)[field] === "string"
        ) {
          (sanitizedData as any)[field] = sanitizer(
            (sanitizedData as any)[field]
          );
        }
      });

      data = sanitizedData;
    }

    const validatedData = await schema.parseAsync(data);
    return { success: true, data: validatedData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, errors: formatValidationErrors(error) };
    }
    throw error;
  }
}
