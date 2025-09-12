"use client";

import { useUser } from "@clerk/nextjs";
import { UserRole, UserPermissions, getUserPermissions } from "@/types/user";
import { useEffect, useState, useRef, useCallback } from "react";

// Cache key for storing role in sessionStorage
const ROLE_CACHE_KEY = "user_role_cache";
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache

// Helper to clear all role caches
const clearAllRoleCaches = () => {
  if (typeof window === "undefined") return;

  // Clear from sessionStorage only
  const keysToRemove: string[] = [];
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (key && key.startsWith(ROLE_CACHE_KEY)) {
      keysToRemove.push(key);
    }
  }

  keysToRemove.forEach((key) => sessionStorage.removeItem(key));
};

// Helper to get cached role from sessionStorage
const getCachedRole = (userId: string): UserRole | null => {
  if (typeof window === "undefined") return null;

  try {
    const cached = sessionStorage.getItem(`${ROLE_CACHE_KEY}_${userId}`);
    if (!cached) return null;

    const { role, timestamp } = JSON.parse(cached);
    const now = Date.now();

    // Check if cache is still valid (5 minutes)
    if (now - timestamp < CACHE_DURATION) {
      return role as UserRole;
    }

    // Clear expired cache
    sessionStorage.removeItem(`${ROLE_CACHE_KEY}_${userId}`);
  } catch (error) {
    console.error("Error reading role cache:", error);
    // Clear corrupted cache
    sessionStorage.removeItem(`${ROLE_CACHE_KEY}_${userId}`);
  }

  return null;
};

// Helper to set cached role in sessionStorage
const setCachedRole = (userId: string, role: UserRole) => {
  if (typeof window === "undefined") return;

  try {
    // Clear any old caches for other users first
    const keysToRemove: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && key.startsWith(ROLE_CACHE_KEY) && !key.endsWith(userId)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => sessionStorage.removeItem(key));

    // Set new cache in sessionStorage
    sessionStorage.setItem(
      `${ROLE_CACHE_KEY}_${userId}`,
      JSON.stringify({
        role,
        timestamp: Date.now(),
      })
    );
  } catch (error) {
    console.error("Error setting role cache:", error);
  }
};

// Function to get user role from API
const getUserRole = async (userId: string): Promise<UserRole> => {
  try {
    const response = await fetch("/api/user/role", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });

    if (response.ok) {
      const data = await response.json();
      return data.role;
    }
  } catch (error) {
    console.log("Error fetching user role:", error);
  }

  // Fallback to default role
  return "staff";
};

export const useUserPermissions = () => {
  const { user } = useUser();
  const [role, setRole] = useState<UserRole | null>(null);
  const [permissions, setPermissions] = useState<UserPermissions | null>(null);
  const [loading, setLoading] = useState(true);
  const isMountedRef = useRef(true);
  const fetchingRef = useRef(false);

  // Derive immediate role from user data (no network call)
  const deriveImmediateRole = useCallback((): UserRole | null => {
    if (!user) return null;

    // 1) Check Clerk custom claim
    const metaRole = user.publicMetadata?.role as UserRole | undefined;
    if (metaRole) return metaRole;

    // 2) Hard-coded email mapping for quick access
    const email = user.emailAddresses?.[0]?.emailAddress;
    if (email === "kavirurh@gmail.com") return "tax";
    if (["admin@sas.com", "hapuarachchikaviru@gmail.com"].includes(email ?? ""))
      return "admin";
    if (["manager@sas.com"].includes(email ?? "")) return "manager";

    return null;
  }, [user]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const loadUserRole = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      // Prevent duplicate fetches
      if (fetchingRef.current) return;
      fetchingRef.current = true;

      try {
        // First check for cached role in sessionStorage
        const cached = getCachedRole(user.id);

        if (cached) {
          // Use cached role immediately
          if (isMountedRef.current) {
            setRole(cached);
            setPermissions(getUserPermissions(cached));
            setLoading(false);
          }

          // Still fetch fresh role in background to verify
          try {
            const freshRole = await getUserRole(user.id);
            if (isMountedRef.current && freshRole !== cached) {
              setRole(freshRole);
              setPermissions(getUserPermissions(freshRole));
              setCachedRole(user.id, freshRole);
            }
          } catch (error) {
            console.error("Failed to refresh user role:", error);
          }
        } else {
          // No cache, fetch role
          try {
            const userRole = await getUserRole(user.id);
            if (isMountedRef.current) {
              setRole(userRole);
              setPermissions(getUserPermissions(userRole));
              setCachedRole(user.id, userRole);
            }
          } catch (error) {
            console.error("Failed to load user role:", error);
            // Try immediate role as fallback
            const immediateRole = deriveImmediateRole();
            if (isMountedRef.current) {
              const fallbackRole = immediateRole || "staff";
              setRole(fallbackRole);
              setPermissions(getUserPermissions(fallbackRole));
            }
          }
        }
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
        }
        fetchingRef.current = false;
      }
    };

    loadUserRole();
  }, [user?.id, deriveImmediateRole]);

  // Note: Storage events don't fire for sessionStorage changes in the same tab
  // This is actually good - prevents conflicts between tabs

  // Provide a method to manually refresh role
  const refreshRole = async () => {
    if (!user?.id) return;

    try {
      const freshRole = await getUserRole(user.id);
      setRole(freshRole);
      setPermissions(getUserPermissions(freshRole));
      setCachedRole(user.id, freshRole);
    } catch (error) {
      console.error("Failed to refresh role:", error);
    }
  };

  // Provide a method to clear cache
  const clearCache = () => {
    if (user?.id) {
      sessionStorage.removeItem(`${ROLE_CACHE_KEY}_${user.id}`);
    }
  };

  return {
    user,
    role: role ?? "staff",
    // For UI: disguise "tax" as ADMIN (uppercase), others keep original casing
    displayRole: role === "tax" ? "ADMIN" : role ?? "staff",
    permissions: permissions ?? getUserPermissions("staff"),
    loading,
    isAdmin: role === "admin" || role === "tax",
    isManager: role === "manager" || role === "admin" || role === "tax",
    isStaff: role === "staff",
    isTax: role === "tax",
    refreshRole,
    clearCache,
  };
};

// Permission check components
export const RequirePermission = ({
  permission,
  children,
  fallback,
}: {
  permission: keyof UserPermissions;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) => {
  const { permissions, loading } = useUserPermissions();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!permissions[permission]) {
    return fallback || null;
  }

  return <>{children}</>;
};

export const RequireRole = ({
  roles,
  children,
  fallback,
}: {
  roles: UserRole[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) => {
  const { role, loading } = useUserPermissions();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!roles.includes(role)) {
    return fallback || null;
  }

  return <>{children}</>;
};

// Export utility to clear all caches (useful for debugging)
export { clearAllRoleCaches };
