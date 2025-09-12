# Weekly Admin Password System

## Overview

The admin password system has been simplified to use **weekly generation** instead of daily resets. This approach provides better usability while maintaining security.

## How It Works

1. **First Use**: When an admin action requiring a password is performed for the first time each week, a password is automatically generated and stored in MongoDB.

2. **Subsequent Uses**: For the rest of the week (Monday to Sunday), the same password is reused.

3. **Weekly Reset**: Passwords expire at the end of each Sunday (11:59:59 PM) and new ones are generated the next week when needed.

## Key Features

- ✅ **No Cron Jobs Required**: System generates passwords automatically when needed
- ✅ **7-Day Validity**: Passwords are valid for a full week (Monday to Sunday)
- ✅ **Simple Setup**: Just run the setup script once
- ✅ **Automatic Expiration**: Passwords expire weekly without any scheduled tasks
- ✅ **Audit Logging**: Complete trail of all password usage
- ✅ **Manual Generation**: Admins can manually generate new passwords if needed

## Setup

1. Run the setup script:

   ```bash
   node scripts/setup-admin-password.js
   ```

2. Test the system (optional):

   ```bash
   node scripts/test-admin-password.js
   ```

3. Start using! No additional configuration needed.

## Usage

### For Admins

- Navigate to **Admin Tools → Password Management**
- View current password (hidden by default for security)
- Copy password to clipboard
- Generate new password manually if needed

### For Critical Actions

When performing actions like deleting jobs, payments, or bills, you'll be prompted for the admin password. Simply:

1. Enter the current week's password
2. Click "Confirm"
3. Action will be executed and logged

## API Endpoints

- `GET /api/admin/password?action=current` - Get current password
- `GET /api/admin/password?action=ensure` - Ensure password exists (generates if needed)
- `POST /api/admin/password` - Validate password and log usage
- `PUT /api/admin/password` - Generate new password

## Security

- Passwords are 8 characters (4 numbers + 4 letters)
- SHA-256 hashed before storage
- Complete audit trail of all usage
- Weekly expiration (Sunday night)
- Admin-only access

## Advantages Over Daily Reset

1. **Better Usability**: Don't need to check password every day
2. **Reduced Friction**: Same password works for a week
3. **Still Secure**: Weekly rotation provides good security balance
4. **Less Admin Overhead**: Fewer password lookups needed
5. **Easier Planning**: Admins can plan weekly activities with same password

## Migration from Cron Version

If you had the previous cron-based version:

1. Remove any cron jobs that call `/api/cron/daily-password`
2. Remove `CRON_SECRET_TOKEN` from environment variables
3. The system will automatically start using on-demand generation

---

This new approach provides the same security benefits with much simpler implementation and maintenance.
