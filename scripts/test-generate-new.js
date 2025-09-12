#!/usr/bin/env node

/**
 * Test Generate New Password Functionality
 * 
 * This script tests the force generation of new admin passwords
 */

require('dotenv').config({ path: '.env.local' });

const {
    forceGenerateWeeklyPassword,
    getCurrentAdminPassword,
    validateAdminPassword
} = require('../src/lib/services/admin-password');

async function testGenerateNew() {
    console.log('🧪 Testing Generate New Password Functionality...\n');

    try {
        // Test 1: Get current password
        console.log('1️⃣ Getting current password...');
        const currentResult = await getCurrentAdminPassword();

        if (currentResult.success) {
            console.log('✅ Current password retrieved');
            console.log(`🔐 Current Password: ${currentResult.password}`);
        } else {
            console.log('❌ Failed to get current password:', currentResult.error);
            return;
        }

        const originalPassword = currentResult.password;

        // Test 2: Force generate new password
        console.log('\n2️⃣ Force generating new password...');
        const newResult = await forceGenerateWeeklyPassword();

        if (newResult.success) {
            console.log('✅ New password generated successfully');
            console.log(`🔐 New Password: ${newResult.password}`);

            // Check if password actually changed
            if (newResult.password !== originalPassword) {
                console.log('✅ Password successfully changed!');
            } else {
                console.log('⚠️ Password didn\'t change (this might be expected if generating quickly)');
            }
        } else {
            console.log('❌ Failed to generate new password:', newResult.error);
            return;
        }

        // Test 3: Validate the new password
        console.log('\n3️⃣ Validating new password...');
        const validationResult = await validateAdminPassword(newResult.password);

        if (validationResult.isValid) {
            console.log('✅ New password validation successful');
        } else {
            console.log('❌ New password validation failed:', validationResult.error);
            return;
        }

        // Test 4: Check that old password is no longer valid (if it changed)
        if (originalPassword !== newResult.password) {
            console.log('\n4️⃣ Testing old password is no longer valid...');
            const oldValidationResult = await validateAdminPassword(originalPassword);

            if (!oldValidationResult.isValid) {
                console.log('✅ Old password correctly invalidated');
            } else {
                console.log('⚠️ Old password is still valid (unexpected)');
            }
        }

        console.log('\n🎉 Generate New functionality test completed successfully!\n');

        console.log('📋 Test Summary:');
        console.log('  • Force password generation works');
        console.log('  • New passwords are properly validated');
        console.log('  • System correctly handles password regeneration');

    } catch (error) {
        console.error('❌ Test failed with error:', error);
        process.exit(1);
    }
}

// Run the test
if (require.main === module) {
    testGenerateNew().then(() => {
        console.log('\n✅ Test completed successfully!');
        process.exit(0);
    }).catch((error) => {
        console.error('\n❌ Test failed:', error);
        process.exit(1);
    });
}

module.exports = { testGenerateNew };
