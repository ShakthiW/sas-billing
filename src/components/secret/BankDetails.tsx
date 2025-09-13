"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Eye,
  EyeOff,
  Plus,
  RefreshCw,
  CreditCard,
  TrendingUp,
  TrendingDown,
  Edit,
  Save,
  X,
} from "lucide-react";
import {
  getAllBankAccounts,
  createBankAccount,
  getBankTransactionHistory,
  updateBankAccount,
} from "@/app/api/actions";
import { BankAccount, BankTransaction } from "@/types/bank";
import { useToast } from "@/hooks/use-toast";

interface BankDetailsProps {
  isOpen: boolean;
  handleClose: () => void;
}

const BankDetails: React.FC<BankDetailsProps> = ({ isOpen, handleClose }) => {
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [showBalances, setShowBalances] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<BankAccount | null>(
    null
  );
  const [transactionHistory, setTransactionHistory] = useState<
    BankTransaction[]
  >([]);
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [showTransactions, setShowTransactions] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(
    null
  );
  const [editForm, setEditForm] = useState({
    accountName: "",
    accountNumber: "",
    bankName: "",
    accountType: "Current" as "Current" | "Savings" | "Business" | "Tax",
    entityLabel: "SAS Air Conditioning" as
      | "SAS Air Conditioning"
      | "SAS Enterprises",
    currentBalance: 0,
    totalBalance: 0,
    description: "",
    isActive: true,
  });
  const [balanceReason, setBalanceReason] = useState("");
  const { toast } = useToast();

  // New account form state
  const [newAccount, setNewAccount] = useState({
    accountName: "",
    accountNumber: "",
    bankName: "",
    accountType: "Current" as "Current" | "Savings" | "Business" | "Tax",
    entityLabel: "SAS Air Conditioning" as
      | "SAS Air Conditioning"
      | "SAS Enterprises",
    currentBalance: 0,
    totalBalance: 0,
    description: "",
  });

  const fetchBankAccounts = useCallback(async () => {
    try {
      setLoading(true);
      const accounts = await getAllBankAccounts();
      setBankAccounts(accounts);
    } catch (error) {
      console.error("Failed to fetch bank accounts:", error);
      toast({
        title: "Error",
        description: "Failed to load bank accounts",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (isOpen) {
      fetchBankAccounts();
    }
  }, [isOpen, fetchBankAccounts]);

  const handleAddAccount = async () => {
    try {
      if (
        !newAccount.accountName ||
        !newAccount.accountNumber ||
        !newAccount.bankName ||
        !newAccount.entityLabel
      ) {
        toast({
          title: "Error",
          description: "Please fill in all required fields",
          variant: "destructive",
        });
        return;
      }

      const result = await createBankAccount({
        ...newAccount,
        isActive: true,
      });

      if (result.success) {
        toast({
          title: "Success",
          description: "Bank account added successfully",
        });
        setNewAccount({
          accountName: "",
          accountNumber: "",
          bankName: "",
          accountType: "Current",
          entityLabel: "SAS Air Conditioning",
          currentBalance: 0,
          totalBalance: 0,
          description: "",
        });
        setShowAddAccount(false);
        await fetchBankAccounts();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to add bank account",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Failed to add bank account:", error);
      toast({
        title: "Error",
        description: "Failed to add bank account",
        variant: "destructive",
      });
    }
  };

  const handleViewTransactions = async (account: BankAccount) => {
    try {
      setSelectedAccount(account);
      const transactions = await getBankTransactionHistory(account._id!, 20);
      setTransactionHistory(transactions);
      setShowTransactions(true);
    } catch (error) {
      console.error("Failed to fetch transactions:", error);
      toast({
        title: "Error",
        description: "Failed to load transaction history",
        variant: "destructive",
      });
    }
  };

  const handleEditAccount = (account: BankAccount) => {
    setEditingAccount(account);
    setEditForm({
      accountName: account.accountName,
      accountNumber: account.accountNumber,
      bankName: account.bankName,
      accountType: account.accountType,
      entityLabel: account.entityLabel || "SAS Air Conditioning",
      currentBalance: account.currentBalance || 0,
      totalBalance: account.totalBalance || 0,
      description: account.description || "",
      isActive: account.isActive,
    });
    setBalanceReason("");
  };

  const handleSaveEdit = async () => {
    try {
      if (!editingAccount?._id) return;

      const originalBalance = editingAccount.currentBalance || 0;
      const newBalance = editForm.currentBalance;
      const balanceChanged = originalBalance !== newBalance;

      if (balanceChanged && !balanceReason.trim()) {
        toast({
          title: "Reason Required",
          description: "Please provide a reason for the balance change",
          variant: "destructive",
        });
        return;
      }

      const result = await updateBankAccount(
        editingAccount._id,
        editForm,
        "current-user", // You might want to get the actual user ID
        balanceReason || undefined
      );

      if (result.success) {
        toast({
          title: "Success",
          description: "Bank account updated successfully",
        });
        setEditingAccount(null);
        setEditForm({
          accountName: "",
          accountNumber: "",
          bankName: "",
          accountType: "Current",
          entityLabel: "SAS Air Conditioning",
          currentBalance: 0,
          totalBalance: 0,
          description: "",
          isActive: true,
        });
        setBalanceReason("");
        await fetchBankAccounts();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to update bank account",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Failed to update bank account:", error);
      toast({
        title: "Error",
        description: "Failed to update bank account",
        variant: "destructive",
      });
    }
  };

  const handleCancelEdit = () => {
    setEditingAccount(null);
    setEditForm({
      accountName: "",
      accountNumber: "",
      bankName: "",
      accountType: "Current",
      entityLabel: "SAS Air Conditioning",
      currentBalance: 0,
      totalBalance: 0,
      description: "",
      isActive: true,
    });
    setBalanceReason("");
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-LK", {
      style: "currency",
      currency: "LKR",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const getBalancePercentage = (current: number, total: number) => {
    return total > 0 ? ((total - current) / total) * 100 : 0;
  };

  const getBalanceColor = (percentage: number) => {
    if (percentage < 30) return "text-green-600";
    if (percentage < 70) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Bank Account Management</span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowBalances(!showBalances)}
                >
                  {showBalances ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                  {showBalances ? "Hide" : "Show"} Balances
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchBankAccounts}
                  disabled={loading}
                >
                  <RefreshCw className="w-4 h-4" />
                </Button>
                <Button size="sm" onClick={() => setShowAddAccount(true)}>
                  <Plus className="w-4 h-4 mr-1" />
                  Add Account
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-8">Loading bank accounts...</div>
            ) : bankAccounts.length === 0 ? (
              <div className="text-center py-8">
                <CreditCard className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Bank Accounts</h3>
                <p className="text-muted-foreground mb-4">
                  Add a bank account to start managing your finances.
                </p>
                <Button onClick={() => setShowAddAccount(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Account
                </Button>
              </div>
            ) : (
              <div className="grid gap-4">
                {bankAccounts.map((account) => {
                  const usagePercentage = getBalancePercentage(
                    account.currentBalance,
                    account.totalBalance
                  );
                  const balanceColor = getBalanceColor(usagePercentage);

                  return (
                    <Card
                      key={account._id}
                      className="transition-shadow hover:shadow-md"
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-lg">
                              {account.accountName}
                            </CardTitle>
                            <p className="text-sm text-muted-foreground">
                              {account.bankName} • {account.accountNumber} •{" "}
                              {account.accountType}
                            </p>
                            {account.entityLabel && (
                              <p className="text-xs mt-1">
                                Receipt Label:{" "}
                                <span className="font-medium">
                                  {account.entityLabel}
                                </span>
                              </p>
                            )}
                          </div>
                          <Badge
                            variant={account.isActive ? "default" : "secondary"}
                          >
                            {account.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {showBalances && (
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-sm text-muted-foreground">
                                  Current Balance
                                </p>
                                <p className="text-lg font-semibold">
                                  {formatCurrency(account.currentBalance)}
                                </p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">
                                  Total Limit
                                </p>
                                <p className="text-lg font-semibold">
                                  {formatCurrency(account.totalBalance)}
                                </p>
                              </div>
                            </div>
                          )}

                          {showBalances && (
                            <div>
                              <div className="flex justify-between items-center mb-2">
                                <span className="text-sm text-muted-foreground">
                                  Available
                                </span>
                                <span
                                  className={`text-sm font-medium ${balanceColor}`}
                                >
                                  {(100 - usagePercentage).toFixed(1)}%
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full ${
                                    usagePercentage < 30
                                      ? "bg-green-500"
                                      : usagePercentage < 70
                                      ? "bg-yellow-500"
                                      : "bg-red-500"
                                  }`}
                                  style={{ width: `${100 - usagePercentage}%` }}
                                ></div>
                              </div>
                            </div>
                          )}

                          {account.description && (
                            <p className="text-sm text-muted-foreground">
                              {account.description}
                            </p>
                          )}

                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditAccount(account)}
                            >
                              <Edit className="w-4 h-4 mr-1" />
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewTransactions(account)}
                            >
                              View Transactions
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Account Dialog */}
      <Dialog open={showAddAccount} onOpenChange={setShowAddAccount}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Bank Account</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="accountName">Account Name *</Label>
              <Input
                id="accountName"
                value={newAccount.accountName}
                onChange={(e) =>
                  setNewAccount({ ...newAccount, accountName: e.target.value })
                }
                placeholder="e.g., Primary Business Account"
              />
            </div>

            <div>
              <Label htmlFor="entityLabel">Receipt Label *</Label>
              <Select
                value={newAccount.entityLabel}
                onValueChange={(value: any) =>
                  setNewAccount({ ...newAccount, entityLabel: value })
                }
              >
                <SelectTrigger id="entityLabel">
                  <SelectValue placeholder="Select receipt label" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SAS Air Conditioning">
                    SAS Air Conditioning
                  </SelectItem>
                  <SelectItem value="SAS Enterprises">
                    SAS Enterprises
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="bankName">Bank Name *</Label>
              <Input
                id="bankName"
                value={newAccount.bankName}
                onChange={(e) =>
                  setNewAccount({ ...newAccount, bankName: e.target.value })
                }
                placeholder="e.g., Commercial Bank"
              />
            </div>

            <div>
              <Label htmlFor="accountNumber">Account Number *</Label>
              <Input
                id="accountNumber"
                value={newAccount.accountNumber}
                onChange={(e) =>
                  setNewAccount({
                    ...newAccount,
                    accountNumber: e.target.value,
                  })
                }
                placeholder="Account number"
              />
            </div>

            <div>
              <Label htmlFor="accountType">Account Type</Label>
              <Select
                value={newAccount.accountType}
                onValueChange={(value: "Current" | "Savings" | "Business") =>
                  setNewAccount({ ...newAccount, accountType: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Current">Current</SelectItem>
                  <SelectItem value="Savings">Savings</SelectItem>
                  <SelectItem value="Business">Business</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="currentBalance">Current Balance</Label>
                <Input
                  id="currentBalance"
                  type="number"
                  value={newAccount.currentBalance}
                  onChange={(e) =>
                    setNewAccount({
                      ...newAccount,
                      currentBalance: parseFloat(e.target.value) || 0,
                    })
                  }
                  placeholder="0"
                />
              </div>
              <div>
                <Label htmlFor="totalBalance">Total Limit</Label>
                <Input
                  id="totalBalance"
                  type="number"
                  value={newAccount.totalBalance}
                  onChange={(e) =>
                    setNewAccount({
                      ...newAccount,
                      totalBalance: parseFloat(e.target.value) || 0,
                    })
                  }
                  placeholder="0"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="description">Description (Optional)</Label>
              <Input
                id="description"
                value={newAccount.description}
                onChange={(e) =>
                  setNewAccount({ ...newAccount, description: e.target.value })
                }
                placeholder="Additional notes"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowAddAccount(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleAddAccount}>Add Account</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Transaction History Dialog */}
      <Dialog open={showTransactions} onOpenChange={setShowTransactions}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Transaction History - {selectedAccount?.accountName}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {transactionHistory.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No transactions found</p>
              </div>
            ) : (
              <div className="space-y-2">
                {transactionHistory.map((transaction) => (
                  <div
                    key={transaction._id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2 rounded-full ${
                          transaction.type === "credit"
                            ? "bg-green-100"
                            : "bg-red-100"
                        }`}
                      >
                        {transaction.type === "credit" ? (
                          <TrendingUp className="w-4 h-4 text-green-600" />
                        ) : (
                          <TrendingDown className="w-4 h-4 text-red-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{transaction.description}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(transaction.date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p
                        className={`font-semibold ${
                          transaction.type === "credit"
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {transaction.type === "credit" ? "+" : "-"}
                        {formatCurrency(transaction.amount)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Balance: {formatCurrency(transaction.balanceAfter)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Account Dialog */}
      <Dialog
        open={!!editingAccount}
        onOpenChange={(open) => !open && handleCancelEdit()}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Bank Account</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="editAccountName">Account Name *</Label>
              <Input
                id="editAccountName"
                value={editForm.accountName}
                onChange={(e) =>
                  setEditForm({ ...editForm, accountName: e.target.value })
                }
                placeholder="e.g., Primary Business Account"
              />
            </div>

            <div>
              <Label htmlFor="editEntityLabel">Receipt Label *</Label>
              <Select
                value={editForm.entityLabel}
                onValueChange={(value: any) =>
                  setEditForm({ ...editForm, entityLabel: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SAS Air Conditioning">
                    SAS Air Conditioning
                  </SelectItem>
                  <SelectItem value="SAS Enterprises">
                    SAS Enterprises
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="editBankName">Bank Name *</Label>
              <Input
                id="editBankName"
                value={editForm.bankName}
                onChange={(e) =>
                  setEditForm({ ...editForm, bankName: e.target.value })
                }
                placeholder="e.g., Commercial Bank"
              />
            </div>

            <div>
              <Label htmlFor="editAccountNumber">Account Number *</Label>
              <Input
                id="editAccountNumber"
                value={editForm.accountNumber}
                onChange={(e) =>
                  setEditForm({ ...editForm, accountNumber: e.target.value })
                }
                placeholder="Account number"
              />
            </div>

            <div>
              <Label htmlFor="editAccountType">Account Type</Label>
              <Select
                value={editForm.accountType}
                onValueChange={(value: "Current" | "Savings" | "Business") =>
                  setEditForm({ ...editForm, accountType: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Current">Current</SelectItem>
                  <SelectItem value="Savings">Savings</SelectItem>
                  <SelectItem value="Business">Business</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="editCurrentBalance">Current Balance *</Label>
                <Input
                  id="editCurrentBalance"
                  type="number"
                  step="0.01"
                  value={editForm.currentBalance}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      currentBalance: parseFloat(e.target.value) || 0,
                    })
                  }
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor="editTotalBalance">Total Limit *</Label>
                <Input
                  id="editTotalBalance"
                  type="number"
                  step="0.01"
                  value={editForm.totalBalance}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      totalBalance: parseFloat(e.target.value) || 0,
                    })
                  }
                  placeholder="0.00"
                />
              </div>
            </div>

            {editingAccount &&
              editForm.currentBalance !==
                (editingAccount.currentBalance || 0) && (
                <div>
                  <Label htmlFor="balanceReason">
                    Reason for Balance Change *
                  </Label>
                  <Input
                    id="balanceReason"
                    value={balanceReason}
                    onChange={(e) => setBalanceReason(e.target.value)}
                    placeholder="e.g., Manual adjustment, Bank transfer correction"
                  />
                </div>
              )}

            <div>
              <Label htmlFor="editDescription">Description</Label>
              <Input
                id="editDescription"
                value={editForm.description}
                onChange={(e) =>
                  setEditForm({ ...editForm, description: e.target.value })
                }
                placeholder="Additional notes"
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="editIsActive"
                checked={editForm.isActive}
                onChange={(e) =>
                  setEditForm({ ...editForm, isActive: e.target.checked })
                }
                className="rounded"
              />
              <Label htmlFor="editIsActive">Account is active</Label>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleCancelEdit}>
                <X className="w-4 h-4 mr-1" />
                Cancel
              </Button>
              <Button onClick={handleSaveEdit}>
                <Save className="w-4 h-4 mr-1" />
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default BankDetails;
