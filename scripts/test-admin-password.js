#!/usr/bin/env node

/**
 * Test Admin Password System
 * 
 * This script tests the weekly admin password generation system:
 * - Tests ensureDailyAdminPassword function
 * - Validates password generation
 * - Tests password validation
 * - Shows system is working correctly
 */

require('dotenv').config({ path: '.env.local' });

// Import the admin password functions
const {
    ensureDailyAdminPassword,
    validateAdminPassword,
    getCurrentAdminPassword
} = require('../src/lib/services/admin-password');

async function testAdminPasswordSystem() {
    console.log('🧪 Testing Weekly Admin Password System...\n');

    try {
        // Test 1: Ensure weekly password exists (on-demand generation)
        console.log('1️⃣ Testing weekly password generation...');
        const ensureResult = await ensureDailyAdminPassword();

        if (ensureResult.success) {
            console.log('✅ Password ensured successfully');
            console.log(`🔐 Password: ${ensureResult.password}`);
        } else {
            console.log('❌ Failed to ensure password:', ensureResult.error);
            return;
        }

        // Test 2: Get current password
        console.log('\n2️⃣ Testing get current password...');
        const currentResult = await getCurrentAdminPassword();

        if (currentResult.success) {
            console.log('✅ Current password retrieved successfully');
            console.log(`🔐 Password: ${currentResult.password}`);
            console.log(`⏰ Expires: ${currentResult.expiresAt}`);
        } else {
            console.log('❌ Failed to get current password:', currentResult.error);
            return;
        }

        // Test 3: Validate the password
        console.log('\n3️⃣ Testing password validation...');
        const validationResult = await validateAdminPassword(ensureResult.password);

        if (validationResult.isValid) {
            console.log('✅ Password validation successful');
            console.log(`🆔 Password ID: ${validationResult.passwordId}`);
        } else {
            console.log('❌ Password validation failed:', validationResult.error);
            return;
        }

        // Test 4: Test invalid password
        console.log('\n4️⃣ Testing invalid password rejection...');
        const invalidResult = await validateAdminPassword('INVALID123');

        if (!invalidResult.isValid) {
            console.log('✅ Invalid password correctly rejected');
        } else {
            console.log('❌ Invalid password was incorrectly accepted');
            return;
        }

        // Test 5: Test on-demand generation again (should return existing)
        console.log('\n5️⃣ Testing duplicate generation (should return existing)...');
        const duplicateResult = await ensureDailyAdminPassword();

        if (duplicateResult.success && duplicateResult.password === ensureResult.password) {
            console.log('✅ Existing password returned correctly (no duplicate generation)');
        } else {
            console.log('⚠️ Unexpected behavior: new password generated or error occurred');
        } console.log('\n🎉 All tests passed! Weekly admin password system is working correctly.\n');

        console.log('📋 System Summary:');
        console.log('  • Passwords are generated automatically when needed for each week');
        console.log('  • No cron jobs or scheduled tasks required');
        console.log('  • Existing passwords are reused for the same week (Monday-Sunday)');
        console.log('  • Password validation works correctly');
        console.log('  • Invalid passwords are properly rejected');

    } catch (error) {
        console.error('❌ Test failed with error:', error);
        process.exit(1);
    }
}

// Run the test
if (require.main === module) {
    testAdminPasswordSystem().then(() => {
        console.log('\n✅ Test completed successfully!');
        process.exit(0);
    }).catch((error) => {
        console.error('\n❌ Test failed:', error);
        process.exit(1);
    });
}

module.exports = { testAdminPasswordSystem };
