"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useUserPermissions, clearAllRoleCaches } from "@/hooks/useUserPermissions";
import { useToast } from "@/hooks/use-toast";
import { Trash2, RefreshCw, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function CacheClearPage() {
    const { isAdmin, role, user, refreshRole, clearCache } = useUserPermissions();
    const { toast } = useToast();
    const [clearing, setClearing] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    const handleClearAllCaches = async () => {
        setClearing(true);
        try {
            // Clear all role caches
            clearAllRoleCaches();
            
            // Clear current user's cache
            clearCache();
            
            // Refresh the role
            await refreshRole();
            
            toast({
                title: "Success",
                description: "All caches have been cleared successfully",
            });
            
            // Reload the page after a short delay to ensure everything is refreshed
            setTimeout(() => {
                window.location.reload();
            }, 1500);
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to clear caches",
            });
        } finally {
            setClearing(false);
        }
    };

    const handleRefreshRole = async () => {
        setRefreshing(true);
        try {
            await refreshRole();
            toast({
                title: "Success",
                description: "User role has been refreshed",
            });
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to refresh role",
            });
        } finally {
            setRefreshing(false);
        }
    };

    const handleClearSessionData = () => {
        try {
            // Clear sessionStorage only
            sessionStorage.clear();
            
            toast({
                title: "Success",
                description: "Session storage has been cleared. Page will reload...",
            });
            
            // Reload after a short delay
            setTimeout(() => {
                window.location.reload();
            }, 1500);
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to clear session storage",
            });
        }
    };

    if (!isAdmin) {
        return (
            <div className="p-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Access Denied</CardTitle>
                        <CardDescription>
                            You don't have permission to access cache management.
                        </CardDescription>
                    </CardHeader>
                </Card>
            </div>
        );
    }

    return (
        <DashboardLayout
            title="Cache Management"
            breadcrumbs={[
                { label: "Admin Tools", href: "/dashboard/admin" },
                { label: "Cache Management" }
            ]}
        >
            <div className="space-y-6">
                {/* Current Status */}
                <Card>
                    <CardHeader>
                        <CardTitle>Current User Information</CardTitle>
                        <CardDescription>
                            Your current authentication and role status
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <span className="font-medium">User ID:</span>
                                <p className="text-muted-foreground font-mono">{user?.id || "Not loaded"}</p>
                            </div>
                            <div>
                                <span className="font-medium">Email:</span>
                                <p className="text-muted-foreground">{user?.emailAddresses?.[0]?.emailAddress || "Not loaded"}</p>
                            </div>
                            <div>
                                <span className="font-medium">Current Role:</span>
                                <p className="text-muted-foreground font-semibold">{role}</p>
                            </div>
                            <div>
                                <span className="font-medium">Cache Key:</span>
                                <p className="text-muted-foreground font-mono text-xs">
                                    user_role_cache_{user?.id?.slice(0, 10)}...
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Cache Actions */}
                <Card>
                    <CardHeader>
                        <CardTitle>Cache Actions</CardTitle>
                        <CardDescription>
                            Manage authentication and role caches
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Alert>
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                                Use these tools if you're experiencing authentication issues or role mismatches.
                                Clearing caches will force the system to fetch fresh data from the database.
                            </AlertDescription>
                        </Alert>

                        <div className="space-y-3">
                            <div className="border rounded-lg p-4">
                                <h4 className="font-medium mb-2">Refresh Current Role</h4>
                                <p className="text-sm text-muted-foreground mb-3">
                                    Fetch your latest role from the database without clearing cache
                                </p>
                                <Button
                                    onClick={handleRefreshRole}
                                    disabled={refreshing}
                                    variant="outline"
                                >
                                    <RefreshCw className="mr-2 h-4 w-4" />
                                    {refreshing ? "Refreshing..." : "Refresh Role"}
                                </Button>
                            </div>

                            <div className="border rounded-lg p-4">
                                <h4 className="font-medium mb-2">Clear Role Caches</h4>
                                <p className="text-sm text-muted-foreground mb-3">
                                    Clear all user role caches and reload with fresh data
                                </p>
                                <Button
                                    onClick={handleClearAllCaches}
                                    disabled={clearing}
                                    variant="default"
                                >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    {clearing ? "Clearing..." : "Clear Role Caches"}
                                </Button>
                            </div>

                            <div className="border border-red-200 rounded-lg p-4 bg-red-50">
                                <h4 className="font-medium mb-2 text-red-900">Clear Session Data</h4>
                                <p className="text-sm text-red-700 mb-3">
                                    ⚠️ This will clear ALL session storage data. 
                                    You will need to log in again and roles will be refreshed.
                                </p>
                                <Button
                                    onClick={handleClearSessionData}
                                    variant="destructive"
                                >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Clear Session Storage
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Storage Inspector */}
                <Card>
                    <CardHeader>
                        <CardTitle>Storage Inspector</CardTitle>
                        <CardDescription>
                            Current session storage related to authentication
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div>
                                <h4 className="font-medium mb-2">SessionStorage Keys (Primary Storage)</h4>
                                <div className="bg-gray-50 rounded p-3 max-h-40 overflow-auto">
                                    <pre className="text-xs">
                                        {typeof window !== 'undefined' 
                                            ? Object.keys(sessionStorage)
                                                .filter(key => key.includes('user') || key.includes('role') || key.includes('clerk'))
                                                .map(key => `${key}: ${sessionStorage.getItem(key)?.substring(0, 50)}...`)
                                                .join('\n') || 'No relevant keys found'
                                            : 'Loading...'}
                                    </pre>
                                </div>
                            </div>

                            <div>
                                <h4 className="font-medium mb-2">LocalStorage Keys (Should be empty)</h4>
                                <div className="bg-gray-50 rounded p-3 max-h-40 overflow-auto">
                                    <pre className="text-xs">
                                        {typeof window !== 'undefined' 
                                            ? Object.keys(localStorage)
                                                .filter(key => key.includes('user_role'))
                                                .map(key => {
                                                    // Clean up any leftover localStorage entries
                                                    localStorage.removeItem(key);
                                                    return `${key}: REMOVED (was using wrong storage)`;
                                                })
                                                .join('\n') || 'No role keys in localStorage (good!)'
                                            : 'Loading...'}
                                    </pre>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
}