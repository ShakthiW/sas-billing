"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "react-hot-toast";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, Loader2 } from "lucide-react";

export default function MigrationPage() {
    const [isRunning, setIsRunning] = useState(false);
    const [result, setResult] = useState<{ success: boolean; updated: number; message?: string } | null>(null);

    const runMigration = async () => {
        setIsRunning(true);
        setResult(null);

        try {
            const response = await fetch('/api/migrate-statuses', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();

            if (data.success) {
                setResult({
                    success: true,
                    updated: data.updated,
                    message: data.message
                });
                toast.success(`Migration completed! Updated ${data.updated} jobs.`);
            } else {
                throw new Error(data.error || 'Migration failed');
            }

        } catch (error: any) {
            console.error('Migration error:', error);
            setResult({
                success: false,
                updated: 0,
                message: error.message
            });
            toast.error(`Migration failed: ${error.message}`);
        } finally {
            setIsRunning(false);
        }
    };

    return (
        <div className="p-6 max-w-2xl mx-auto">
            <div className="mb-6">
                <h1 className="text-2xl font-bold mb-2">Status Migration Tool</h1>
                <p className="text-gray-600">
                    Migrate jobs with legacy statuses (Pending Review, On Hold, Quality Check, Parts Pending) to the new status system.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-orange-500" />
                        Legacy Status Migration
                    </CardTitle>
                    <CardDescription>
                        This will update all jobs with old statuses to use the new simplified status system.
                        Legacy statuses will be migrated to "To Do".
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <h3 className="font-medium text-yellow-800 mb-2">Status Changes:</h3>
                        <div className="space-y-1 text-sm text-yellow-700">
                            <div>• Pending Review → To Do</div>
                            <div>• On Hold → To Do</div>
                            <div>• Quality Check → To Do</div>
                            <div>• Parts Pending → To Do</div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <h3 className="font-medium">Retained Statuses:</h3>
                        <div className="flex gap-2 flex-wrap">
                            <Badge variant="secondary">To Do</Badge>
                            <Badge variant="secondary">In Progress</Badge>
                            <Badge variant="secondary">Finished</Badge>
                            <Badge variant="secondary">Delivered</Badge>
                        </div>
                    </div>

                    {result && (
                        <div className={`p-4 rounded-lg border ${result.success
                                ? 'bg-green-50 border-green-200'
                                : 'bg-red-50 border-red-200'
                            }`}>
                            <div className="flex items-center gap-2 mb-2">
                                {result.success ? (
                                    <CheckCircle className="h-5 w-5 text-green-600" />
                                ) : (
                                    <AlertTriangle className="h-5 w-5 text-red-600" />
                                )}
                                <span className={`font-medium ${result.success ? 'text-green-800' : 'text-red-800'
                                    }`}>
                                    {result.success ? 'Migration Completed' : 'Migration Failed'}
                                </span>
                            </div>
                            <p className={`text-sm ${result.success ? 'text-green-700' : 'text-red-700'
                                }`}>
                                {result.message || `${result.updated} jobs updated`}
                            </p>
                        </div>
                    )}

                    <Button
                        onClick={runMigration}
                        disabled={isRunning}
                        className="w-full"
                    >
                        {isRunning ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Running Migration...
                            </>
                        ) : (
                            'Run Migration'
                        )}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
