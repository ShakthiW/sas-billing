"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Eye, EyeOff, Shield } from "lucide-react";
import { AdminPasswordAction } from "@/lib/services/admin-password";

interface AdminPasswordPromptProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: AdminPasswordAction;
  actionDescription: string;
  targetId?: string;
  targetType?: string;
  metadata?: any;
  onSuccess: () => void;
  onError?: (error: string) => void;
  onConfirmWithPassword?: (password: string) => Promise<void> | void;
}

export function AdminPasswordPrompt({
  open,
  onOpenChange,
  action,
  actionDescription,
  targetId,
  targetType,
  metadata,
  onSuccess,
  onError,
  onConfirmWithPassword,
}: AdminPasswordPromptProps) {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password.trim()) {
      setError("Please enter the admin password");
      return;
    }

    setIsValidating(true);
    setError(null);

    try {
      if (onConfirmWithPassword) {
        // First close the dialog to prevent UI freeze
        setPassword("");
        onOpenChange(false);

        // Then perform the action
        await onConfirmWithPassword(password.trim());
        onSuccess();
      } else {
        const response = await fetch("/api/admin/password", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            password: password.trim(),
            action,
            targetId,
            targetType,
            metadata,
          }),
        });

        const result = await response.json();

        if (response.ok && result.success) {
          setPassword("");
          onOpenChange(false);
          onSuccess();
        } else {
          const errorMessage = result.error || "Invalid admin password";
          setError(errorMessage);
          onError?.(errorMessage);
        }
      }
    } catch (error: any) {
      const errorMessage =
        error?.message || "Failed to validate admin password";
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsValidating(false);
    }
  };

  const handleClose = () => {
    setPassword("");
    setError(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-red-500" />
            Admin Password Required
          </DialogTitle>
          <DialogDescription>
            This action requires admin authentication:{" "}
            <strong>{actionDescription}</strong>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="admin-password" className="text-sm font-medium">
              Enter this week's admin password:
            </label>
            <div className="relative">
              <Input
                id="admin-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter 6-digit Code"
                className="pr-10"
                maxLength={6}
                disabled={isValidating}
                autoComplete="off"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isValidating}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex items-center justify-between pt-4">
            <div className="text-sm text-muted-foreground">
              Password resets weekly (every Monday)
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isValidating}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isValidating || !password.trim()}>
                {isValidating ? "Validating..." : "Confirm"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Hook for using admin password prompt
export function useAdminPasswordPrompt() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentAction, setCurrentAction] = useState<{
    action: AdminPasswordAction;
    actionDescription: string;
    targetId?: string;
    targetType?: string;
    metadata?: any;
    onSuccess: () => void;
    onError?: (error: string) => void;
    onConfirmWithPassword?: (password: string) => Promise<void> | void;
  } | null>(null);

  const promptForPassword = (
    action: AdminPasswordAction,
    actionDescription: string,
    onSuccess: () => void,
    options?: {
      targetId?: string;
      targetType?: string;
      metadata?: any;
      onError?: (error: string) => void;
      onConfirmWithPassword?: (password: string) => Promise<void> | void;
    }
  ) => {
    setCurrentAction({
      action,
      actionDescription,
      targetId: options?.targetId,
      targetType: options?.targetType,
      metadata: options?.metadata,
      onSuccess,
      onError: options?.onError,
      onConfirmWithPassword: options?.onConfirmWithPassword,
    });
    setIsOpen(true);
  };

  const AdminPasswordPromptComponent = () => {
    if (!currentAction) return null;

    return (
      <AdminPasswordPrompt
        open={isOpen}
        onOpenChange={setIsOpen}
        action={currentAction.action}
        actionDescription={currentAction.actionDescription}
        targetId={currentAction.targetId}
        targetType={currentAction.targetType}
        metadata={currentAction.metadata}
        onSuccess={currentAction.onSuccess}
        onError={currentAction.onError}
        onConfirmWithPassword={currentAction.onConfirmWithPassword}
      />
    );
  };

  return {
    promptForPassword,
    AdminPasswordPromptComponent,
  };
}
