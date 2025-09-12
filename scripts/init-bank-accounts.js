const { MongoClient, ObjectId } = require('mongodb');

async function initializeBankAccounts() {
    // Use environment variables directly (make sure they're set when running)
    const localuri = process.env.MONGODB_URI;
    const dbName = process.env.dbName || 'sas-billing-system';

    if (!localuri) {
        console.error('❌ MONGODB_URI environment variable is required');
        process.exit(1);
    }

    const client = new MongoClient(localuri);

    try {
        await client.connect();
        console.log('Connected to MongoDB');

        const db = client.db(dbName);
        const bankAccountsCollection = db.collection('bankAccounts');

        // Check if bank accounts already exist
        const existingAccounts = await bankAccountsCollection.countDocuments();
        if (existingAccounts > 0) {
            console.log('Bank accounts already exist, skipping initialization');
            return;
        }

        // Sample bank accounts
        const bankAccounts = [
            {
                accountName: "Primary Business Account",
                accountNumber: "1234567890",
                bankName: "Commercial Bank of Ceylon",
                accountType: "Business",
                currentBalance: 250000,
                totalBalance: 500000,
                isActive: true,
                description: "Main business account for daily transactions",
                createdAt: new Date(),
                updatedAt: new Date(),
                transactionHistory: []
            },
            {
                accountName: "Secondary Operations Account",
                accountNumber: "0987654321",
                bankName: "Sampath Bank",
                accountType: "Current",
                currentBalance: 150000,
                totalBalance: 300000,
                isActive: true,
                description: "Secondary account for operational expenses",
                createdAt: new Date(),
                updatedAt: new Date(),
                transactionHistory: []
            },
            {
                accountName: "Petty Cash Account",
                accountNumber: "1122334455",
                bankName: "Hatton National Bank",
                accountType: "Savings",
                currentBalance: 50000,
                totalBalance: 100000,
                isActive: true,
                description: "Account for small day-to-day expenses",
                createdAt: new Date(),
                updatedAt: new Date(),
                transactionHistory: []
            }
        ];

        // Insert bank accounts
        const result = await bankAccountsCollection.insertMany(bankAccounts);
        console.log(`✅ Successfully created ${result.insertedCount} bank accounts`);

        // Display created accounts
        console.log('\n📋 Created Bank Accounts:');
        bankAccounts.forEach((account, index) => {
            console.log(`${index + 1}. ${account.accountName}`);
            console.log(`   Bank: ${account.bankName}`);
            console.log(`   Account: ${account.accountNumber}`);
            console.log(`   Balance: LKR ${account.currentBalance.toLocaleString()}`);
            console.log(`   Type: ${account.accountType}`);
            console.log('');
        });

    } catch (error) {
        console.error('❌ Error initializing bank accounts:', error);
    } finally {
        await client.close();
        console.log('Disconnected from MongoDB');
    }
}

// Run the initialization
initializeBankAccounts();
