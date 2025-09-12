// User role management types
export type UserRole = 'admin' | 'manager' | 'staff' | 'tax';

export interface UserPermissions {
    canCreateJobs: boolean;
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
    // New approval permissions
    canApproveParts: boolean;
    canApproveServices: boolean;
}

export interface UserProfile {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    permissions: UserPermissions;
    createdAt: Date;
    lastLogin?: Date;
    isActive: boolean;
}

export const rolePermissions: Record<UserRole, UserPermissions> = {
    admin: {
        canCreateJobs: true,
        canDeleteJobs: true,
        canAddServices: true,
        canAddParts: true,
        canApprovePayments: true,
        canAccessHistory: true,
        canManageUsers: true,
        canAccessTaxAccount: true,
        canPermanentDelete: true,
        canViewAllReports: true,
        canManageWarranty: true,
        canApproveParts: true,
        canApproveServices: true,
    },
    tax: {
        canCreateJobs: false,
        canDeleteJobs: false,
        canAddServices: false,
        canAddParts: false,
        canApprovePayments: false,
        canAccessHistory: true,
        canManageUsers: false,
        canAccessTaxAccount: true,
        canPermanentDelete: false,
        canViewAllReports: true,
        canManageWarranty: false,
        canApproveParts: false,
        canApproveServices: false,
    },
    manager: {
        canCreateJobs: true,
        canDeleteJobs: true, // Allow managers to delete jobs
        canAddServices: true,
        canAddParts: true,
        canApprovePayments: true,
        canAccessHistory: false,
        canManageUsers: false,
        canAccessTaxAccount: false,
        canPermanentDelete: false,
        canViewAllReports: true,
        canManageWarranty: true,
        canApproveParts: true,
        canApproveServices: true,
    },
    staff: {
        canCreateJobs: true,
        canDeleteJobs: false, // Restrict deletion to managers and above
        canAddServices: false,
        canAddParts: false,
        canApprovePayments: false,
        canAccessHistory: false,
        canManageUsers: false,
        canAccessTaxAccount: false,
        canPermanentDelete: false,
        canViewAllReports: false,
        canManageWarranty: false,
        canApproveParts: false,
        canApproveServices: false,
    },
};

export const getUserPermissions = (role: UserRole): UserPermissions => {
    return rolePermissions[role];
};
