"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { UserRole } from "@/types/user";
import { useToast } from "@/hooks/use-toast";
import { DashboardLayout } from "@/components/DashboardLayout";

interface UserRoleData {
    _id: string;
    clerkUserId: string;
    role: UserRole;
    createdAt: string;
    updatedAt?: string;
    isActive: boolean;
}

export default function AdminUsersPage() {
    const [users, setUsers] = useState<UserRoleData[]>([]);
    const [loading, setLoading] = useState(true);
    const [newUserClerkId, setNewUserClerkId] = useState("");
    const [newUserRole, setNewUserRole] = useState<UserRole>("staff");
    const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
    const [cleaningUp, setCleaningUp] = useState(false);
    const { permissions, isAdmin } = useUserPermissions();
    const { toast } = useToast();

    const fetchUsers = useCallback(async () => {
        try {
            const response = await fetch("/api/admin/users");
            if (response.ok) {
                const data = await response.json();
                setUsers(data.users);
            } else {
                const error = await response.json();
                toast({
                    variant: "destructive",
                    title: "Error",
                    description: error.error || "Failed to fetch users",
                });
            }
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to fetch users",
            });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        if (isAdmin) {
            fetchUsers();
        } else {
            setLoading(false);
        }
    }, [isAdmin, fetchUsers]);

    const updateUserRole = async (clerkUserId: string, newRole: UserRole) => {
        setUpdatingUserId(clerkUserId);
        try {
            const response = await fetch("/api/admin/users", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ clerkUserId, role: newRole }),
            });

            if (response.ok) {
                toast({
                    title: "Success",
                    description: `User role updated to ${newRole}`,
                });
                fetchUsers();
            } else {
                const error = await response.json();
                toast({
                    variant: "destructive",
                    title: "Error",
                    description: error.error || "Failed to update user role",
                });
            }
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to update user role",
            });
        } finally {
            setUpdatingUserId(null);
        }
    };

    const createUser = async () => {
        if (!newUserClerkId.trim()) {
            toast({
                variant: "destructive",
                title: "Error",
                description: "Please enter a Clerk User ID",
            });
            return;
        }

        await updateUserRole(newUserClerkId, newUserRole);
        setNewUserClerkId("");
        setNewUserRole("staff");
    };

    const deleteUser = async (clerkUserId: string) => {
        if (!confirm("Are you sure you want to delete this user role?")) {
            return;
        }

        try {
            const response = await fetch(`/api/admin/users?clerkUserId=${clerkUserId}`, {
                method: "DELETE",
            });

            if (response.ok) {
                toast({
                    title: "Success",
                    description: "User role deleted successfully",
                });
                fetchUsers();
            } else {
                const error = await response.json();
                toast({
                    variant: "destructive",
                    title: "Error",
                    description: error.error || "Failed to delete user role",
                });
            }
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to delete user role",
            });
        }
    };

    const cleanupDuplicates = async () => {
        setCleaningUp(true);
        try {
            const response = await fetch("/api/admin/users/cleanup", {
                method: "POST",
            });

            if (response.ok) {
                const result = await response.json();
                toast({
                    title: "Cleanup Successful",
                    description: result.message,
                });
                fetchUsers();
            } else {
                const error = await response.json();
                toast({
                    variant: "destructive",
                    title: "Cleanup Failed",
                    description: error.error || "Failed to cleanup duplicate users",
                });
            }
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to cleanup duplicate users",
            });
        } finally {
            setCleaningUp(false);
        }
    };

    const getRoleBadgeVariant = (role: UserRole) => {
        switch (role) {
            case "admin":
                return "destructive";
            case "manager":
                return "default";
            case "staff":
                return "secondary";
            default:
                return "outline";
        }
    };

    if (!isAdmin) {
        return (
            <div className="p-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Access Denied</CardTitle>
                        <CardDescription>
                            You don't have permission to access user management.
                        </CardDescription>
                    </CardHeader>
                </Card>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="p-6">
                <Card>
                    <CardContent className="p-6">
                        <div className="text-center">Loading...</div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <DashboardLayout
            title="User Management"
            breadcrumbs={[
                { label: "Admin Tools", href: "/dashboard/admin" },
                { label: "User Management" }
            ]}
        >
            <Card>
                <CardHeader>
                    <CardTitle>User Role Management</CardTitle>
                    <CardDescription>
                        Manage user roles and permissions for the SAS Billing System
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className="flex gap-4 items-end">
                            <div className="flex-1">
                                <label className="text-sm font-medium">Clerk User ID</label>
                                <Input
                                    value={newUserClerkId}
                                    onChange={(e) => setNewUserClerkId(e.target.value)}
                                    placeholder="Enter Clerk User ID (e.g., user_xxx)"
                                />
                            </div>
                            <div className="w-32">
                                <label className="text-sm font-medium">Role</label>
                                <Select value={newUserRole} onValueChange={(value: UserRole) => setNewUserRole(value)}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="staff">Staff</SelectItem>
                                        <SelectItem value="manager">Manager</SelectItem>
                                        <SelectItem value="admin">Admin</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <Button onClick={createUser}>Add/Update User</Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Current Users ({users.length})</CardTitle>
                    <Button 
                        onClick={cleanupDuplicates}
                        disabled={cleaningUp}
                        variant="outline"
                        size="sm"
                    >
                        {cleaningUp ? "Cleaning..." : "Clean Duplicates"}
                    </Button>
                </CardHeader>
                <CardContent>
                    {users.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            No users found. Add users using the form above.
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Clerk User ID</TableHead>
                                    <TableHead>Role</TableHead>
                                    <TableHead>Created</TableHead>
                                    <TableHead>Last Updated</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {users.map((user) => (
                                    <TableRow key={user._id}>
                                        <TableCell className="font-mono text-sm">
                                            {user.clerkUserId}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={getRoleBadgeVariant(user.role)}>
                                                {user.role.toUpperCase()}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {new Date(user.createdAt).toLocaleDateString()}
                                        </TableCell>
                                        <TableCell>
                                            {user.updatedAt
                                                ? new Date(user.updatedAt).toLocaleDateString()
                                                : "-"
                                            }
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={user.isActive ? "default" : "secondary"}>
                                                {user.isActive ? "Active" : "Inactive"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex gap-2">
                                                <Select
                                                    disabled={updatingUserId === user.clerkUserId}
                                                    value={user.role}
                                                    onValueChange={(newRole: UserRole) =>
                                                        updateUserRole(user.clerkUserId, newRole)
                                                    }
                                                >
                                                    <SelectTrigger className="w-24">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="staff">Staff</SelectItem>
                                                        <SelectItem value="manager">Manager</SelectItem>
                                                        <SelectItem value="admin">Admin</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <Button
                                                    variant="destructive"
                                                    size="sm"
                                                    onClick={() => deleteUser(user.clerkUserId)}
                                                >
                                                    Delete
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

            <Card>
                <CardHeader>
                    <CardTitle>How to Find Clerk User IDs</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="font-medium mb-2">Method 1: Clerk Dashboard</h4>
                        <ol className="list-decimal list-inside space-y-1 text-sm">
                            <li>Go to your Clerk Dashboard</li>
                            <li>Navigate to Users section</li>
                            <li>Find the user and copy their User ID (starts with "user_")</li>
                        </ol>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="font-medium mb-2">Method 2: Browser Console</h4>
                        <ol className="list-decimal list-inside space-y-1 text-sm">
                            <li>Have the user log into the system</li>
                            <li>Open browser developer tools (F12)</li>
                            <li>Go to Console tab</li>
                            <li>Type: <code className="bg-gray-200 px-1 rounded">window.Clerk.user?.id</code></li>
                            <li>Copy the returned User ID</li>
                        </ol>
                    </div>

                    <div className="bg-blue-50 p-4 rounded-lg">
                        <h4 className="font-medium mb-2">Role Permissions</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            <div>
                                <strong>Admin:</strong>
                                <ul className="list-disc list-inside mt-1">
                                    <li>Full system access</li>
                                    <li>User management</li>
                                    <li>Delete jobs permanently</li>
                                    <li>Access tax accounts</li>
                                    <li>Approve all payments</li>
                                </ul>
                            </div>
                            <div>
                                <strong>Manager:</strong>
                                <ul className="list-disc list-inside mt-1">
                                    <li>Add services & parts</li>
                                    <li>Approve payments</li>
                                    <li>View all reports</li>
                                    <li>Manage warranties</li>
                                    <li>Approve parts/services</li>
                                </ul>
                            </div>
                            <div>
                                <strong>Staff:</strong>
                                <ul className="list-disc list-inside mt-1">
                                    <li>Basic access only</li>
                                    <li>Create and view jobs</li>
                                    <li>No approval rights</li>
                                    <li>Limited reports</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </DashboardLayout>
    );
}
