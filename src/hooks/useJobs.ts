import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getAllJobs,
  updateJobStatusWithApproval,
  processCreditPaymentWithApproval,
  updateJobStatus,
} from "@/app/api/actions";
import { useUser } from "@clerk/nextjs";
import { useUserPermissions } from "./useUserPermissions";
import { toast } from "react-hot-toast";

// Query Keys
export const jobsQueryKey = ["jobs"] as const;

// Custom hook for fetching jobs
export function useJobs() {
  return useQuery({
    queryKey: jobsQueryKey,
    queryFn: getAllJobs,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Custom hook for updating job status with approval workflow
export function useUpdateJobStatus() {
  const queryClient = useQueryClient();
  const { user } = useUser();
  const { role } = useUserPermissions();

  return useMutation({
    mutationFn: ({
      jobId,
      newStatus,
    }: {
      jobId: string;
      newStatus: string;
    }) => {
      if (!user?.id) {
        throw new Error("User not authenticated");
      }
      // Use direct status update to avoid approval flow timeouts in table quick actions
      // If you need approval flow, switch back to updateJobStatusWithApproval
      return updateJobStatus(jobId, newStatus);
    },
    onSuccess: (data) => {
      // Invalidate and refetch jobs data
      queryClient.invalidateQueries({ queryKey: jobsQueryKey });

      // Show appropriate toast message
      if (data.success) {
        toast.success("Job status updated successfully");
      } else {
        toast.error("Failed to update job status");
      }
    },
    onError: (error) => {
      console.error("Failed to update job status:", error);
      toast.error("Failed to update job status");
    },
  });
}

// Hook for optimistic updates (updated to use approval workflow)
export function useOptimisticJobUpdate() {
  const queryClient = useQueryClient();
  const { user } = useUser();
  const { role } = useUserPermissions();

  return useMutation({
    mutationFn: ({
      jobId,
      newStatus,
    }: {
      jobId: string;
      newStatus: string;
    }) => {
      if (!user?.id) {
        throw new Error("User not authenticated");
      }
      return updateJobStatusWithApproval(jobId, newStatus, user.id, role);
    },
    onMutate: async ({ jobId, newStatus }) => {
      // Only perform optimistic updates for admin/manager who can directly update
      if (role === "admin" || role === "manager") {
        // Cancel any outgoing refetches
        await queryClient.cancelQueries({ queryKey: jobsQueryKey });

        // Snapshot the previous value
        const previousJobs = queryClient.getQueryData(jobsQueryKey);

        // Optimistically update to the new value
        queryClient.setQueryData(jobsQueryKey, (old: any) => {
          if (!old) return old;

          // Find and update the job in the appropriate category
          const updatedJobs = { ...old };
          const fromColumns = [
            "todo",
            "inProgress",
            "finished",
            "delivered",
          ] as const;

          for (const column of fromColumns) {
            const jobIndex = updatedJobs[column]?.findIndex(
              (job: any) => job.id === jobId
            );
            if (jobIndex !== -1) {
              const job = updatedJobs[column][jobIndex];
              // Remove from current column
              updatedJobs[column] = updatedJobs[column].filter(
                (_: any, i: number) => i !== jobIndex
              );
              // Add to new column
              if (!updatedJobs[newStatus as keyof typeof updatedJobs]) {
                updatedJobs[newStatus as keyof typeof updatedJobs] = [];
              }
              updatedJobs[newStatus as keyof typeof updatedJobs].push({
                ...job,
                column: newStatus,
              });
              break;
            }
          }

          return updatedJobs;
        });

        return { previousJobs };
      }
    },
    onSuccess: (data) => {
      // Show appropriate toast message
      if (data.success) {
        toast.success(data.message);
      } else {
        toast.error(data.message);
      }
    },
    onError: (err, variables, context) => {
      // Rollback on error for optimistic updates
      if (context?.previousJobs) {
        queryClient.setQueryData(jobsQueryKey, context.previousJobs);
      }
      toast.error("Failed to update job status");
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: jobsQueryKey });
    },
  });
}

// Hook for processing credit payments with approval workflow
export function useCreditPayment() {
  const queryClient = useQueryClient();
  const { user } = useUser();
  const { role } = useUserPermissions();

  return useMutation({
    mutationFn: ({
      billId,
      paymentData,
    }: {
      billId: string;
      paymentData: any;
    }) => {
      if (!user?.id) {
        throw new Error("User not authenticated");
      }
      return processCreditPaymentWithApproval(
        billId,
        paymentData,
        user.id,
        role
      );
    },
    onSuccess: (data) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["bills"] });
      queryClient.invalidateQueries({ queryKey: ["creditPayments"] });

      // Show appropriate toast message
      if (data.success) {
        toast.success(data.message);
      } else {
        toast.error(data.message);
      }
    },
    onError: (error) => {
      console.error("Failed to process credit payment:", error);
      toast.error("Failed to process credit payment");
    },
  });
}
