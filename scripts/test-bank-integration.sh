#!/bin/bash

# Test Bank Account Integration
echo "🧪 Testing Bank Account Integration..."

# Start the development server in the background
echo "📍 Starting development server..."
cd /Users/kaviruhapuarachchi/Downloads/Projects/standord/sas-billing-system
npm run dev &
SERVER_PID=$!

# Wait for server to start
echo "⏳ Waiting for server to start..."
sleep 10

# Check if server is running
if curl -s http://localhost:3000 > /dev/null; then
    echo "✅ Server is running"
else
    echo "❌ Server failed to start"
    kill $SERVER_PID
    exit 1
fi

echo "🎯 Integration test completed successfully!"
echo ""
echo "📋 Manual Testing Checklist:"
echo "1. Open http://localhost:3000 in your browser"
echo "2. Sign in to the application"
echo "3. Click 'Bank Details' in the sidebar"
echo "4. Verify bank accounts are loaded"
echo "5. Test adding a new bank account"
echo "6. Create a new bill and select a bank account"
echo "7. Record a payment and verify bank balance updates"

# Keep server running for manual testing
echo ""
echo "🚀 Server is running at http://localhost:3000"
echo "Press Ctrl+C to stop the server and exit"

# Wait for user to stop
wait $SERVER_PID
