"use client";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { useToast } from "@/hooks/use-toast";
import { DashboardLayout } from "@/components/DashboardLayout";
import {
  Shield,
  Key,
  Clock,
  Activity,
  RefreshCw,
  Eye,
  EyeOff,
  Copy,
  CheckCircle,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface AdminPasswordInfo {
  password: string;
  expiresAt: string;
}

interface AdminPasswordStats {
  totalUsage: number;
  actionBreakdown: { action: string; count: number }[];
  userBreakdown: { userId: string; count: number }[];
  dailyUsage: { date: string; count: number }[];
}

export default function AdminPasswordPage() {
  const [currentPassword, setCurrentPassword] =
    useState<AdminPasswordInfo | null>(null);
  const [stats, setStats] = useState<AdminPasswordStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const { isAdmin } = useUserPermissions();
  const { toast } = useToast();

  const fetchCurrentPassword = async () => {
    try {
      const response = await fetch("/api/admin/password?action=current");
      const result = await response.json();

      if (result.success) {
        setCurrentPassword({
          password: result.password,
          expiresAt: result.expiresAt,
        });
      } else {
        setCurrentPassword(null);
      }
    } catch (error) {
      console.error("Failed to fetch current password:", error);
      setCurrentPassword(null);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch("/api/admin/password?action=stats&days=30");
      const result = await response.json();

      if (result.success) {
        setStats(result.stats);
      }
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    }
  };

  const generateNewPassword = async () => {
    setGenerating(true);
    try {
      const response = await fetch("/api/admin/password?action=generate");
      const result = await response.json();

      if (result.success) {
        toast({
          title: "Success",
          description: "New admin password generated successfully",
        });
        await fetchCurrentPassword();
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: result.error || "Failed to generate password",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to generate password",
      });
    } finally {
      setGenerating(false);
    }
  };

  const copyPassword = async () => {
    if (!currentPassword) return;

    try {
      await navigator.clipboard.writeText(currentPassword.password);
      setCopied(true);
      toast({
        title: "Copied",
        description: "Password copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to copy password",
      });
    }
  };

  useEffect(() => {
    if (isAdmin) {
      const fetchData = async () => {
        await Promise.all([fetchCurrentPassword(), fetchStats()]);
        setLoading(false);
      };
      fetchData();
    } else {
      setLoading(false);
    }
  }, [isAdmin]);

  if (!isAdmin) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <Shield className="h-12 w-12 mx-auto text-muted-foreground" />
              <CardTitle>Access Denied</CardTitle>
              <CardDescription>
                Only administrators can access the admin password management
                system.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">
              Loading admin password information...
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const formatExpiresAt = (expiresAt: string) => {
    const date = new Date(expiresAt);
    const now = new Date();
    const diffHours = Math.ceil(
      (date.getTime() - now.getTime()) / (1000 * 60 * 60)
    );

    if (diffHours < 0) {
      return "Expired";
    } else if (diffHours < 24) {
      return `Expires in ${diffHours} hour${diffHours !== 1 ? "s" : ""}`;
    } else {
      return `Expires at ${date.toLocaleString()}`;
    }
  };

  const getActionDisplayName = (action: string) => {
    const actionMap: Record<string, string> = {
      delete_job: "Delete Job",
      delete_bill: "Delete Bill",
      delete_payment: "Delete Payment",
      approve_payment: "Approve Payment",
      complete_payment: "Complete Payment",
      finalize_bill: "Finalize Bill",
      restore_item: "Restore Item",
      modify_bank_account: "Modify Bank Account",
      override_approval: "Override Approval",
      modify_user_role: "Modify User Role",
    };
    return actionMap[action] || action;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Admin Password Management</h1>
          </div>
          <Badge variant="secondary" className="flex items-center gap-1">
            <Key className="h-3 w-3" />
            Auto-Generated System
          </Badge>
        </div>

        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            Admin passwords are automatically generated on-demand when needed
            for the week. This password is required for critical actions like
            deletions, payment approvals, and system modifications. Passwords
            reset every Monday and are valid for 7 days.
          </AlertDescription>
        </Alert>

        {/* Current Password Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Current Admin Password
            </CardTitle>
            <CardDescription>
              This week's 6-digit PIN for administrative actions
            </CardDescription>
          </CardHeader>
          <CardContent>
            {currentPassword ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={currentPassword.password}
                      readOnly
                      className="font-mono text-lg"
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={copyPassword}
                    disabled={copied}
                  >
                    {copied ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    {formatExpiresAt(currentPassword.expiresAt)}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={generateNewPassword}
                    disabled={generating}
                  >
                    {generating ? (
                      <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    Generate New
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Key className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">
                  No active admin password
                </p>
                <Button onClick={generateNewPassword} disabled={generating}>
                  {generating ? (
                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Key className="h-4 w-4 mr-2" />
                  )}
                  Generate Password
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Usage Statistics */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Usage Statistics (30 days)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Total Usage
                    </span>
                    <Badge variant="secondary">{stats.totalUsage}</Badge>
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Most Used Actions</h4>
                    {stats.actionBreakdown.slice(0, 5).map((action, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between text-sm"
                      >
                        <span>{getActionDisplayName(action.action)}</span>
                        <Badge variant="outline">{action.count}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Daily Usage</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {stats.dailyUsage.slice(-7).map((day, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between text-sm"
                    >
                      <span>{new Date(day.date).toLocaleDateString()}</span>
                      <Badge variant="outline">{day.count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Action Breakdown Table */}
        {stats && stats.actionBreakdown.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Action Breakdown</CardTitle>
              <CardDescription>
                Detailed breakdown of admin password usage by action type
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Action</TableHead>
                    <TableHead className="text-right">Count</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.actionBreakdown.map((action, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        {getActionDisplayName(action.action)}
                      </TableCell>
                      <TableCell className="text-right">
                        {action.count}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
