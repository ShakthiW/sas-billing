"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { useAdminPasswordPrompt } from "@/components/admin-password-prompt";
import { ADMIN_PASSWORD_ACTIONS } from "@/lib/services/admin-password";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import {
  Trash2,
  RotateCcw,
  CheckCircle,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";

interface DeletionRecord {
  _id: string;
  originalId: string;
  itemType: string;
  originalData: any;
  deletedBy: string;
  deletedAt: Date;
  reason: string;
  status: string;
  restorable: boolean;
  approvedBy?: string;
  approvedAt?: Date;
  restoredBy?: string;
  restoredAt?: Date;
}

export default function RecycleBinPage() {
  const [deletedItems, setDeletedItems] = useState<DeletionRecord[]>([]);
  const [pendingRequests, setPendingRequests] = useState<DeletionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<DeletionRecord | null>(null);
  const [actionDialog, setActionDialog] = useState<{
    open: boolean;
    action: "restore" | "approve" | "reject";
    item: DeletionRecord | null;
  }>({
    open: false,
    action: "restore",
    item: null,
  });
  const [actionReason, setActionReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const { permissions, role } = useUserPermissions();

  useEffect(() => {
    if (role === "admin") {
      fetchDeletionRecords();
    }
  }, [role]);

  const fetchDeletionRecords = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/delete");
      const data = await response.json();

      if (data.success) {
        setDeletedItems(data.deletedItems || []);
        setPendingRequests(data.pendingRequests || []);
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      console.error("Failed to fetch deletion records:", error);
      toast({
        title: "Error",
        description: "Failed to load deletion records",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const { promptForPassword, AdminPasswordPromptComponent } =
    useAdminPasswordPrompt();
  const handleAction = async () => {
    if (!actionDialog.item) return;

    promptForPassword(
      actionDialog.action === "restore"
        ? ADMIN_PASSWORD_ACTIONS.RESTORE_ITEM
        : ADMIN_PASSWORD_ACTIONS.DELETE_JOB,
      actionDialog.action === "restore"
        ? "Restore deleted item"
        : actionDialog.action === "approve"
        ? "Approve deletion"
        : "Reject deletion",
      async () => {
        // no-op, we use onConfirmWithPassword below
      },
      {
        targetId: actionDialog.item._id,
        targetType: "deletion_record",
        onConfirmWithPassword: async (adminPassword: string) => {
          try {
            setActionLoading(true);
            const response = await fetch("/api/delete", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                requestId: actionDialog.item!._id,
                action: actionDialog.action,
                reason: actionReason,
                adminPassword,
              }),
            });

            const data = await response.json();

            if (response.ok && data.success) {
              toast({ title: "Success", description: data.message });
              setActionDialog({ open: false, action: "restore", item: null });
              setActionReason("");
              fetchDeletionRecords();
            } else {
              throw new Error(data.error || "Failed to process action");
            }
          } finally {
            setActionLoading(false);
          }
        },
      }
    );
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleString();
  };

  const getItemTypeIcon = (type: string) => {
    switch (type) {
      case "job":
        return "🔧";
      case "bill":
        return "📄";
      case "payment":
        return "💳";
      default:
        return "📁";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "deleted":
        return <Badge variant="destructive">Deleted</Badge>;
      case "pending_approval":
        return <Badge variant="outline">Pending Approval</Badge>;
      case "restored":
        return <Badge variant="secondary">Restored</Badge>;
      case "rejected":
        return <Badge variant="outline">Rejected</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (role !== "admin") {
    return (
      <DashboardLayout title="Recycle Bin">
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Access Denied</h3>
              <p className="text-muted-foreground text-center">
                Only administrators can access the recycle bin.
              </p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Recycle Bin">
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="grid auto-rows-min gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Deleted Items
              </CardTitle>
              <Trash2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{deletedItems.length}</div>
              <p className="text-xs text-muted-foreground">
                Items in recycle bin
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Pending Requests
              </CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingRequests.length}</div>
              <p className="text-xs text-muted-foreground">Awaiting approval</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Restorable Items
              </CardTitle>
              <RotateCcw className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {deletedItems.filter((item) => item.restorable).length}
              </div>
              <p className="text-xs text-muted-foreground">Can be restored</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="deleted" className="space-y-4">
          <TabsList>
            <TabsTrigger value="deleted">
              Deleted Items ({deletedItems.length})
            </TabsTrigger>
            <TabsTrigger value="pending">
              Pending Requests ({pendingRequests.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="deleted" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Deleted Items</CardTitle>
                <CardDescription>
                  Items that have been deleted and can be restored
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">Loading...</div>
                ) : deletedItems.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No deleted items found
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Item ID</TableHead>
                        <TableHead>Deleted By</TableHead>
                        <TableHead>Deleted At</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {deletedItems.map((item) => (
                        <TableRow key={item._id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span>{getItemTypeIcon(item.itemType)}</span>
                              <span className="capitalize">
                                {item.itemType}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {item.originalId}
                          </TableCell>
                          <TableCell>{item.deletedBy}</TableCell>
                          <TableCell>{formatDate(item.deletedAt)}</TableCell>
                          <TableCell
                            className="max-w-xs truncate"
                            title={item.reason}
                          >
                            {item.reason}
                          </TableCell>
                          <TableCell>{getStatusBadge(item.status)}</TableCell>
                          <TableCell>
                            {item.restorable && item.status === "deleted" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  setActionDialog({
                                    open: true,
                                    action: "restore",
                                    item,
                                  })
                                }
                                className="flex items-center gap-1"
                              >
                                <RotateCcw className="w-3 h-3" />
                                Restore
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pending" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Pending Deletion Requests</CardTitle>
                <CardDescription>
                  Deletion requests that require admin approval
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">Loading...</div>
                ) : pendingRequests.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No pending requests found
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Item ID</TableHead>
                        <TableHead>Requested By</TableHead>
                        <TableHead>Requested At</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingRequests.map((request) => (
                        <TableRow key={request._id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span>{getItemTypeIcon(request.itemType)}</span>
                              <span className="capitalize">
                                {request.itemType}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {request.originalId}
                          </TableCell>
                          <TableCell>{request.deletedBy}</TableCell>
                          <TableCell>{formatDate(request.deletedAt)}</TableCell>
                          <TableCell
                            className="max-w-xs truncate"
                            title={request.reason}
                          >
                            {request.reason}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() =>
                                  setActionDialog({
                                    open: true,
                                    action: "approve",
                                    item: request,
                                  })
                                }
                                className="flex items-center gap-1"
                              >
                                <CheckCircle className="w-3 h-3" />
                                Approve
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  setActionDialog({
                                    open: true,
                                    action: "reject",
                                    item: request,
                                  })
                                }
                                className="flex items-center gap-1"
                              >
                                <XCircle className="w-3 h-3" />
                                Reject
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Action Dialog */}
      <Dialog
        open={actionDialog.open}
        onOpenChange={(open) => setActionDialog((prev) => ({ ...prev, open }))}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionDialog.action === "restore"
                ? "Restore Item"
                : actionDialog.action === "approve"
                ? "Approve Deletion"
                : "Reject Deletion"}
            </DialogTitle>
            <DialogDescription>
              {actionDialog.action === "restore"
                ? "This will restore the item to its original state."
                : actionDialog.action === "approve"
                ? "This will permanently delete the item."
                : "This will reject the deletion request."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="reason">Reason (Optional)</Label>
              <Textarea
                id="reason"
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                placeholder={`Enter reason for ${actionDialog.action}...`}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setActionDialog({ open: false, action: "restore", item: null })
              }
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAction}
              disabled={actionLoading}
              variant={
                actionDialog.action === "approve" ? "destructive" : "default"
              }
            >
              {actionLoading
                ? "Processing..."
                : actionDialog.action === "restore"
                ? "Restore"
                : actionDialog.action === "approve"
                ? "Approve Deletion"
                : "Reject Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AdminPasswordPromptComponent />
    </DashboardLayout>
  );
}
