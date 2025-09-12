# Bank Account Management Integration

## Overview

The SAS Billing System now includes comprehensive bank account management that integrates with all payment-related operations. This feature allows you to:

- Manage multiple bank accounts
- Track real-time balances
- Automatically update balances when payments are processed
- View transaction history
- Select appropriate bank accounts during bill creation

## Key Features

### 1. Bank Account Management

- **Add/Edit Bank Accounts**: Create and manage multiple bank accounts with different types (Current, Savings, Business)
- **Real-time Balance Tracking**: Monitor current balance vs. total available balance
- **Account Status**: Active/Inactive account management
- **Bank Information**: Store bank name, account number, and description

### 2. Payment Integration

- **Automatic Balance Updates**: When payments are received, bank account balances are automatically updated
- **Payment Method Handling**: Different handling for Cash vs. Bank Transfer/Cheque payments
- **Transaction History**: Complete audit trail of all bank account transactions

### 3. Bill Creation Integration

- **Bank Account Selection**: Choose which bank account to associate with each bill
- **Balance Validation**: Real-time display of available balance and impact of new transactions
- **Visual Indicators**: Color-coded balance usage indicators

## Database Schema

### Bank Accounts Collection (`bankAccounts`)

```javascript
{
  _id: ObjectId,
  accountName: String,        // Display name for the account
  accountNumber: String,      // Bank account number
  bankName: String,          // Name of the bank
  accountType: String,       // "Current" | "Savings" | "Business"
  currentBalance: Number,    // Current available balance
  totalBalance: Number,      // Total credit limit or available funds
  isActive: Boolean,         // Whether account is active
  description: String,       // Optional description
  createdAt: Date,
  updatedAt: Date
}
```

### Bank Transactions Collection (`bankTransactions`)

```javascript
{
  _id: ObjectId,
  accountId: String,         // Reference to bank account
  type: String,             // "debit" | "credit"
  amount: Number,           // Transaction amount
  description: String,      // Transaction description
  billId: String,          // Optional: Related bill ID
  paymentId: String,       // Optional: Related payment ID
  balanceAfter: Number,    // Account balance after transaction
  date: Date,              // Transaction date
  processedBy: String,     // User who processed the transaction
  createdAt: Date
}
```

## API Functions

### Bank Account Management

- `createBankAccount(accountData)` - Create a new bank account
- `getAllBankAccounts()` - Get all active bank accounts
- `getBankAccountById(accountId)` - Get specific bank account
- `updateBankAccountBalance(accountId, amount, type, description, ...)` - Update account balance

### Transaction Management

- `getBankTransactionHistory(accountId, limit, offset)` - Get transaction history
- `getBankTransactionById(transactionId)` - Get specific transaction

## Usage Examples

### 1. Accessing Bank Details

Click on "Bank Details" in the sidebar to:

- View all bank accounts with current balances
- Add new bank accounts
- View transaction history for each account
- Toggle balance visibility for security

### 2. Creating Bills with Bank Integration

When creating a bill:

1. Select the appropriate bank account from the dropdown
2. View real-time balance and availability
3. See the projected balance after the transaction
4. The system automatically updates the bank balance when the bill is finalized

### 3. Processing Payments

When recording credit payments:

1. The system automatically credits the associated bank account
2. Creates a transaction record for audit purposes
3. Updates the bank balance in real-time
4. Generates transaction history entries

## Setup Instructions

### 1. Initialize Bank Accounts

Run the initialization script to create sample bank accounts:

```bash
cd /path/to/sas-billing-system
MONGODB_URI="your_mongodb_uri" dbName="your_db_name" node scripts/init-bank-accounts.js
```

### 2. Configure Environment Variables

Ensure your `.env.local` file includes:

```
MONGODB_URI=your_mongodb_connection_string
dbName=your_database_name
```

### 3. Access Bank Management

1. Open the application
2. Navigate to the dashboard
3. Click "Bank Details" in the sidebar
4. Add your real bank accounts

## Security Features

### 1. Balance Visibility

- Toggle to show/hide sensitive balance information
- Secure access through authentication

### 2. Transaction Auditing

- Complete audit trail of all bank transactions
- User tracking for all balance updates
- Timestamp tracking for all operations

### 3. Data Validation

- Prevents overdrafts and invalid transactions
- Validates account existence before operations
- Ensures data consistency across operations

## Integration Points

### 1. Bill Creation (`/dashboard/billing/[taskId]`)

- Bank account selection during bill creation
- Real-time balance validation
- Visual balance usage indicators

### 2. Payment Processing (`/dashboard/credit-bills`)

- Automatic bank account updates when payments are recorded
- Transaction history generation
- Balance reconciliation

### 3. Sidebar Navigation

- Quick access to bank account management
- Real-time balance overview
- Transaction history access

## Troubleshooting

### Common Issues

1. **Bank accounts not loading**

   - Ensure MongoDB connection is working
   - Check if bank accounts exist in the database
   - Verify environment variables are set correctly

2. **Balance not updating**

   - Check payment method (Cash payments don't update bank accounts)
   - Verify bank account is properly associated with the bill
   - Check console for error messages

3. **Transaction history empty**
   - Ensure transactions are being recorded properly
   - Check if the account ID is correct
   - Verify MongoDB collection permissions

### Debug Mode

Enable debug logging by checking browser console for detailed error messages and transaction logs.

## Best Practices

1. **Regular Reconciliation**: Periodically verify bank balances match actual bank statements
2. **Account Management**: Keep bank account information up to date
3. **Security**: Use the balance visibility toggle when presenting to external users
4. **Backup**: Ensure bank transaction data is included in regular backups

## Future Enhancements

Planned improvements include:

- Bank statement import/export
- Automated reconciliation
- Multi-currency support
- Bank account reporting and analytics
- Integration with external banking APIs
