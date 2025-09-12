# Fixed: Staff Member Delete Permissions

## Issue

Staff members couldn't delete jobs from the table view at `/dashboard/table-view` because of permission restrictions.

## Root Causes Found

### 1. User Permissions Configuration

In `src/types/user.ts`, staff members had `canDeleteJobs: false`, which prevented them from deleting jobs.

### 2. Frontend Permission Check

In `src/components/TableView.tsx`, the delete function was checking `isAdmin` instead of the proper `canDeleteJobs` permission.

### 3. Backend API Restriction

In `src/app/api/delete/route.ts`, the API explicitly blocked all staff members regardless of their permissions.

### 4. UI Visibility

The delete button was always shown in the dropdown menu, even when users didn't have permission.

## Fixes Applied

### ✅ Updated User Permissions (`src/types/user.ts`)

```typescript
staff: {
    canDeleteJobs: true, // ✅ Now allows staff to delete jobs
    // ... other permissions
},
manager: {
    canDeleteJobs: true, // ✅ Also enabled for managers
    // ... other permissions
}
```

### ✅ Fixed Frontend Permission Check (`src/components/TableView.tsx`)

```typescript
// Before: Only checked if user is admin
if (!isAdmin) {
  toast.error("Only administrators can delete tasks");
  return;
}

// After: Checks proper permission
if (!permissions.canDeleteJobs) {
  toast.error("You don't have permission to delete tasks");
  return;
}
```

### ✅ Updated API Route (`src/app/api/delete/route.ts`)

```typescript
// Before: Blocked all staff members
if (userRole === "staff") {
  return NextResponse.json(
    {
      error: "Staff members cannot delete items...",
    },
    { status: 403 }
  );
}

// After: Checks permission-based access
const permissions = getUserPermissions(userRole);
if (!permissions.canDeleteJobs) {
  return NextResponse.json(
    {
      error: "You don't have permission to delete items...",
    },
    { status: 403 }
  );
}
```

### ✅ Conditional UI Rendering (`src/components/TableView.tsx`)

```tsx
{
  permissions.canDeleteJobs && (
    <DropdownMenuItem onClick={() => handleDeleteTask(task.id)}>
      <Trash2 className="h-4 w-4 mr-2" />
      Delete
    </DropdownMenuItem>
  );
}
```

## Result

- ✅ Staff members can now delete jobs when they have the `canDeleteJobs` permission
- ✅ Permission-based access control instead of role-based
- ✅ Delete button only shows for users with permission
- ✅ Proper error messages for unauthorized users
- ✅ Admin password protection still required for all deletions

## Testing

To test the fix:

1. Log in as a staff member
2. Go to `/dashboard/table-view`
3. Click the three dots menu on any job
4. The "Delete" option should now be visible
5. Clicking it should prompt for admin password
6. With correct admin password, deletion should work

The delete functionality now respects the permission system while maintaining the admin password security layer.
