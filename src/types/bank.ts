// Bank Account Types and Interface
export interface BankAccount {
  _id?: string;
  accountName: string;
  accountNumber: string;
  bankName: string;
  accountType: "Current" | "Savings" | "Business" | "Tax";
  entityLabel?: "SAS Air Conditioning" | "SAS Enterprise";
  currentBalance: number;
  totalBalance: number; // Credit limit or total available funds
  isActive: boolean;
  isTaxAccount?: boolean; // Flag to identify tax accounts - admin only
  createdAt?: Date;
  updatedAt?: Date;
  description?: string;
  // Transaction tracking
  transactionHistory?: Array<{
    date: Date;
    type: "debit" | "credit";
    amount: number;
    description: string;
    billId?: string;
    paymentId?: string;
    balance: number; // Balance after transaction
  }>;
}

export interface BankTransaction {
  _id?: string;
  accountId: string;
  type: "debit" | "credit";
  amount: number;
  description: string;
  billId?: string;
  paymentId?: string;
  balanceAfter: number;
  date: Date;
  createdAt?: Date;
  processedBy?: string;
}
