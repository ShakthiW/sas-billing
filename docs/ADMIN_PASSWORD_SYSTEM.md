# Admin Password System

This document describes the weekly admin password system for administrative actions in the SAS Billing System.

## Overview

The admin password system provides an additional layer of security for critical administrative actions. A new password is automatically generated when needed for each week (Monday to Sunday), ensuring that sensitive operations require fresh authentication.

## Features

- **Weekly Generation**: Automatic password generation when needed for each week
- **7-Day Validity**: Passwords are valid from Monday to Sunday
- **Secure Storage**: Passwords are hashed using SHA-256 before storage
- **Usage Tracking**: Complete audit trail of all password usage
- **Admin Interface**: Web-based management interface for administrators
- **Multiple Authentication Points**: Password required for critical actions
- **Automatic Expiration**: Passwords expire at the end of each Sunday

## Actions Requiring Admin Password

The following actions require admin password authentication:

- **Job Management**:

  - Delete jobs
  - Restore deleted jobs

- **Bill Management**:

  - Delete bills
  - Finalize bills
  - Restore deleted bills

- **Payment Management**:

  - Complete credit payments
  - Approve payments
  - Delete payment records

- **System Management**:
  - Modify bank accounts
  - Override approval workflows
  - Modify user roles

## Setup Instructions

### 1. Initial Setup

Run the setup script to initialize the admin password system:

```bash
node scripts/setup-admin-password.js
```

This script will:

- Create necessary database collections
- Set up performance indexes
- Generate the first admin password
- Display setup instructions

### 2. Automatic Password Generation

The system automatically generates passwords on-demand for each week:

- **First Time**: When the first admin action requiring a password is performed each week
- **On-Demand**: Passwords are created automatically when needed for the week
- **Weekly Cycle**: Passwords are valid from Monday to Sunday
- **Manual Generation**: Administrators can manually generate new passwords via the admin interface

#### Manual Generation

Administrators can manually generate new passwords via the admin interface:

- Navigate to `/dashboard/admin/password`
- Click "Generate New" button

### 3. Environment Variables

The system uses your existing MongoDB connection:

```env
# MongoDB connection (already configured)
MONGODB_URI=your-mongodb-connection-string
```

## Usage

### For Administrators

1. **Viewing Current Password**:

   - Go to Admin Tools → Password Management
   - Current password is displayed (can be hidden/shown)
   - Copy password to clipboard with one click

2. **Performing Admin Actions**:

   - When deleting, approving, or modifying critical data
   - Admin password prompt will appear
   - Enter the current day's password
   - Action will be logged for audit purposes

3. **Monitoring Usage**:
   - View usage statistics in the admin interface
   - See breakdown by action type
   - Track daily usage patterns
   - Monitor user activity

### For Developers

#### Adding Admin Password to New Actions

1. **API Route Protection**:

```typescript
import {
  validateAdminPassword,
  logAdminPasswordUsage,
  ADMIN_PASSWORD_ACTIONS,
} from "@/lib/services/admin-password";

// In your API route
const { adminPassword } = await request.json();

// Validate password
const validation = await validateAdminPassword(adminPassword);
if (!validation.isValid) {
  return NextResponse.json(
    { error: "Invalid admin password" },
    { status: 401 }
  );
}

// Log usage
await logAdminPasswordUsage(
  validation.passwordId!,
  userId,
  ADMIN_PASSWORD_ACTIONS.YOUR_ACTION,
  targetId,
  targetType,
  metadata
);
```

2. **Frontend Integration**:

```typescript
import { useAdminPasswordPrompt } from "@/components/admin-password-prompt";
import { ADMIN_PASSWORD_ACTIONS } from "@/lib/services/admin-password";

const { promptForPassword, AdminPasswordPromptComponent } =
  useAdminPasswordPrompt();

// Trigger password prompt
promptForPassword(
  ADMIN_PASSWORD_ACTIONS.YOUR_ACTION,
  "Action description",
  () => {
    // Success callback - perform the action
  },
  {
    targetId: "optional-target-id",
    targetType: "optional-target-type",
    metadata: {
      /* optional metadata */
    },
    onError: (error) => console.error(error),
  }
);

// Add component to your render
<AdminPasswordPromptComponent />;
```

## Database Collections

The system uses three MongoDB collections:

### `adminPasswords`

Stores daily passwords and their metadata:

```javascript
{
    _id: ObjectId,
    date: "2025-07-06",           // YYYY-MM-DD format
    password: "1234ABCD",         // Plain text password (8 chars)
    hashedPassword: "sha256...",  // SHA-256 hash
    createdAt: Date,
    expiresAt: Date,              // End of day
    isActive: Boolean,
    usageCount: Number,
    lastUsedAt: Date
}
```

### `adminPasswordUsage`

Logs all password usage for audit purposes:

```javascript
{
    _id: ObjectId,
    passwordId: ObjectId,         // Reference to adminPasswords
    userId: "clerk-user-id",
    action: "delete_job",
    targetId: "job-id",          // Optional
    targetType: "job",           // Optional
    metadata: {},                // Optional additional data
    timestamp: Date,
    ipAddress: "192.168.1.1",
    userAgent: "Mozilla/5.0..."
}
```

### `adminPasswordLogs`

System logs for password generation and management:

```javascript
{
    _id: ObjectId,
    action: "password_generated",
    date: "2025-07-06",
    password: "1234ABCD",
    generatedAt: Date,
    method: "automated_script"
}
```

## Security Considerations

1. **Password Complexity**: 8-character passwords with 4 numbers + 4 letters
2. **Hashing**: All passwords are SHA-256 hashed before storage
3. **Expiration**: Passwords automatically expire at end of day
4. **Audit Trail**: Complete logging of all password usage
5. **Access Control**: Only administrators can view/use passwords
6. **Rate Limiting**: Consider implementing rate limiting for password attempts

## Monitoring and Maintenance

### Daily Monitoring

- Check that new passwords are generated when needed
- Monitor usage statistics for unusual patterns
- Review audit logs for unauthorized access attempts

### Backup and Recovery

- Ensure admin password collections are included in backups
- Test password generation in staging environment
- Have manual password generation process as backup

### Troubleshooting

#### Password Not Generating

1. Check MongoDB connection
2. Verify database permissions
3. Check API logs for errors
4. Manually generate via admin interface

#### Invalid Password Errors

1. Verify password hasn't expired
2. Check for typos in password entry
3. Ensure password is current day's password
4. Check system clock synchronization

#### Missing Admin Interface

1. Verify user has admin role
2. Check route exists: `/dashboard/admin/password`
3. Verify admin password page component is properly imported

## API Reference

### Get Current Password

```
GET /api/admin/password?action=current
```

### Validate Password

```
POST /api/admin/password
Body: { password, action, targetId?, targetType?, metadata? }
```

### Generate New Password

```
PUT /api/admin/password
```

### Get Usage Statistics

```
GET /api/admin/password?action=stats&days=30
```

### Ensure Daily Password (Internal)

```
GET /api/admin/password?action=ensure
```

## Best Practices

1. **On-Demand Generation**: System automatically generates passwords when needed
2. **Secure Storage**: Never log plain text passwords in application logs
3. **Access Logging**: Always log password usage for audit purposes
4. **Error Handling**: Provide clear error messages for invalid passwords
5. **User Training**: Train administrators on password usage procedures
6. **Backup Access**: Maintain alternative admin access methods
7. **Monitoring**: Set up alerts for failed password attempts

## Future Enhancements

- Two-factor authentication integration
- Password strength requirements configuration
- Custom expiration times
- Email notifications for password changes
- API rate limiting
- Advanced audit reporting
- Integration with external security systems

---

For support or questions about the admin password system, please refer to the main project documentation or contact the development team.
