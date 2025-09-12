# Authentication & Role Management Setup Guide

This guide will help you set up authentication and user roles for the SAS Billing System.

## Prerequisites

1. **Clerk Account**: Sign up at [clerk.com](https://clerk.com)
2. **MongoDB Database**: Either local MongoDB or MongoDB Atlas
3. **Firebase Project**: For file uploads (optional, but recommended)

## Step 1: Environment Setup

1. Copy the example environment file:

   ```bash
   cp .env.example .env.local
   ```

2. Fill in your environment variables in `.env.local`:

### Clerk Configuration

- Get your keys from [Clerk Dashboard](https://dashboard.clerk.com)
- Set `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY`

### MongoDB Configuration

- For local MongoDB: `mongodb://localhost:27017/sas-billing-system`
- For MongoDB Atlas: Get connection string from your Atlas dashboard

### Firebase Configuration (Optional)

- Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
- Enable Storage for file uploads
- Get your config from Project Settings

## Step 2: Install Dependencies

```bash
pnpm install
```

## Step 3: Start the Development Server

```bash
pnpm dev
```

## Step 4: Create Your First Admin User

1. **Sign up through the application**:

   - Go to http://localhost:3000
   - Click "Sign In Now"
   - Click "Sign up" and create your account

2. **Get your Clerk User ID**:

   ```bash
   # Option 1: Use the provided script (while logged in)
   node scripts/get-user-id.js

   # Option 2: Find it in Clerk Dashboard
   # Go to dashboard.clerk.com → Users → copy the User ID
   ```

3. **Set up admin role**:
   ```bash
   node scripts/setup-admin.js <your-clerk-user-id>
   ```

## Step 5: Verify Setup

1. **Refresh your browser** or sign out and sign back in
2. **Check the dashboard** - you should see:
   - Your role displayed in the header ("Role: admin")
   - Admin Tools section in the sidebar:
     - User Management
     - Recycle Bin
     - Audit Logs
   - "Add New Job" button (if you have create permissions)

## User Roles & Permissions

### Staff (Default)

- ✅ Can create jobs
- ❌ Cannot delete jobs
- ❌ Cannot add services/parts
- ❌ Cannot approve payments
- ❌ No admin access

### Manager

- ✅ Can create jobs
- ❌ Cannot delete jobs
- ✅ Can add services/parts
- ✅ Can approve payments
- ✅ Can view all reports
- ✅ Can manage warranty
- ✅ Can approve parts/services
- ❌ No admin tools access

### Admin

- ✅ All manager permissions
- ✅ Can delete jobs
- ✅ Can access history
- ✅ Can manage users
- ✅ Can access tax account
- ✅ Can permanently delete
- ✅ Full admin tools access

## Managing User Roles

### Promote a User to Manager/Admin

1. **Find the user's Clerk ID**:

   - Go to Admin Tools → User Management in your dashboard
   - OR check Clerk Dashboard

2. **Update their role**:

   ```bash
   node scripts/user-role-setup.js <clerk-user-id> <new-role>
   ```

   Example:

   ```bash
   node scripts/user-role-setup.js user_abc123 manager
   node scripts/user-role-setup.js user_xyz789 admin
   ```

## Troubleshooting

### "Role: staff" not updating after promotion

- Sign out and sign back in
- The role is cached in the browser session

### "Loading permissions..." stuck

- Check if MONGODB_URI is correctly set
- Verify MongoDB is running (for local setup)
- Check browser console for errors

### User not found in database

- Users are automatically created with 'staff' role on first login
- If issues persist, check MongoDB connection

### Clerk authentication not working

- Verify Clerk keys in `.env.local`
- Check if URLs match in Clerk Dashboard:
  - Sign-in URL: `/sign-in`
  - Sign-up URL: `/sign-up`
  - After sign-in: `/dashboard`

## Advanced Usage

### Adding Custom Permissions

1. Edit `src/types/user.ts`:

   ```typescript
   export interface UserPermissions {
     // Add your new permission
     canCustomAction: boolean;
     // ... existing permissions
   }
   ```

2. Update role definitions in the same file

3. Use in components:

   ```tsx
   import { useUserPermissions } from "@/hooks/useUserPermissions";

   const { permissions } = useUserPermissions();

   if (permissions.canCustomAction) {
     // Show UI element
   }
   ```

### Protected Routes

Use the `RequirePermission` or `RequireRole` components:

```tsx
import { RequirePermission, RequireRole } from '@/hooks/useUserPermissions';

// Require specific permission
<RequirePermission permission="canManageUsers" fallback={<div>Access denied</div>}>
  <AdminOnlyComponent />
</RequirePermission>

// Require specific role(s)
<RequireRole roles={['admin', 'manager']} fallback={<div>Admin/Manager only</div>}>
  <ManagerComponent />
</RequireRole>
```

## Security Notes

- Never expose admin scripts in production
- Regularly audit user roles through the Admin Tools
- Monitor the Audit Logs for suspicious activity
- Use environment variables for all sensitive configuration

## Support

If you encounter any issues:

1. Check the browser console for errors
2. Verify all environment variables are set correctly
3. Ensure MongoDB and all services are running
4. Check the audit logs for any permission-related issues
