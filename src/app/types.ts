export type ColumnKey = "todo" | "inProgress" | "finished" | "delivered";

// User role management
export type UserRole = "admin" | "manager" | "staff" | "tax";

export interface UserPermissions {
  canDeleteJobs: boolean;
  canAddServices: boolean;
  canAddParts: boolean;
  canApprovePayments: boolean;
  canAccessHistory: boolean;
  canManageUsers: boolean;
  canAccessTaxAccount: boolean;
  canPermanentDelete: boolean;
  canViewAllReports: boolean;
  canManageWarranty: boolean;
}

export interface TasksData {
  todo: Task[];
  inProgress: Task[];
  finished: Task[];
  delivered: Task[];
}

export interface Task {
  id: string;
  title: string;
  imageUrl?: string;
  subTasksCompleted: number;
  totalSubTasks: number;
  column: string;
  subTasks?: SubTask[];
  // Enhanced fields
  customerName?: string;
  customerPhone?: string;
  damageRemarks?: string; // Damage notes and remarks
  damagePhotos?: string[]; // URLs for damage documentation
  createdBy?: string; // User ID who created the task
  updatedBy?: string; // User ID who last updated
  createdAt?: Date; // Job creation time
  updatedAt?: Date; // Last job update time
}

export interface SubTask {
  subtaskID: string;
  taskType: "parts" | "service";
  partsType?: string;
  serviceType?: string;
  partsBrand?: string;
  isCompleted: boolean;
  // Enhanced fields for warranty tracking
  warrantyPeriod?: number; // in months
  warrantyStartDate?: Date;
  warrantyEndDate?: Date;
  warrantyTerms?: string;
  approvalStatus?: "pending" | "approved" | "rejected";
  approvedBy?: string; // User ID who approved
  approvedAt?: Date;
}

export interface Bill {
  _id?: string; // MongoDB ObjectId
  jobId: string;
  vehicleNo: string;
  vehicleType: string;
  customerName: string;
  customerPhone: string;
  driverName?: string;
  clientType: "Customer" | "Company";
  services: Array<{
    description: string;
    isAdditional?: boolean;
  }>;
  totalAmount: number;
  commission?: number; // Made optional as it's being phased out
  finalAmount: number;
  bankAccount: string;
  bankEntityLabel?: "SAS Air Conditioning" | "SAS Enterprise";
  paymentType: "Cash" | "Credit" | "Cheque" | "Unspecified";
  status: "draft" | "finalized" | "paid" | "partially_paid"; // Bill status
  initialPayment?: number;
  remainingBalance?: number; // For credit payments
  totalPayments?: number; // Sum of all payments made (for audit)
  remarks?: string; // Optional remarks entered during billing
  chequeDetails?: {
    chequeNumber?: string;
    chequeDate?: string;
    bankName?: string;
    chequeImageUrl?: string; // URL for uploaded cheque image
  };
  creditDetails?: {
    dueDate?: string;
    creditTerms?: string;
  };
  // Enhanced audit fields
  createdAt?: Date;
  finalizedAt?: Date; // When bill was finalized
  lastPaymentDate?: Date; // Last payment received
  updatedAt?: Date; // Last modification timestamp
  statusHistory?: Array<{
    status: string;
    timestamp: Date;
    reason?: string;
  }>; // Track status changes
  version?: number; // Version control for optimistic locking

  // Enhanced fields for updated bills
  paymentSummary?: {
    totalAmount: number;
    totalPayments: number;
    remainingBalance: number;
    paymentHistory: Array<{
      date: Date;
      amount: number;
      method: string;
      notes?: string;
    }>;
    lastPayment?: {
      amount: number;
      date: Date;
      newBalance: number;
    };
  };
  billType?: "original" | "updated"; // Type of bill
  originalBillId?: string; // Reference to original bill for updated bills
  generatedAt?: Date; // When updated bill was generated
}

export interface CreditPayment {
  _id?: string;
  billId: string;
  jobId: string;
  customerName: string;
  vehicleNo: string;
  paymentAmount: number;
  paymentDate: Date;
  paymentMethod: "Cash" | "Cheque" | "Bank Transfer";
  notes?: string;
  chequeDetails?: {
    chequeNumber?: string;
    chequeDate?: string;
    bankName?: string;
    chequeImageUrl?: string; // URL for uploaded cheque image
  };
  // Enhanced audit fields
  createdAt?: Date;
  previousBalance?: number; // Balance before this payment
  newBalance?: number; // Balance after this payment
  receiptNumber?: string; // Receipt/reference number
  processedBy?: string; // User who processed the payment
  validationStatus?: "pending" | "verified" | "disputed"; // Payment validation status
}
