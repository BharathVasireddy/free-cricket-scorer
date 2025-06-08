#!/bin/bash

echo "🚀 Deploying Firestore optimizations..."

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI not found. Please install it first:"
    echo "npm install -g firebase-tools"
    exit 1
fi

# Check if logged in to Firebase
if ! firebase projects:list &> /dev/null; then
    echo "❌ Please login to Firebase first:"
    echo "firebase login"
    exit 1
fi

echo "📋 Deploying Firestore security rules..."
firebase deploy --only firestore:rules

echo "📊 Deploying Firestore indexes..."
firebase deploy --only firestore:indexes

echo "✅ Firestore optimizations deployed successfully!"
echo ""
echo "⚡ Performance improvements:"
echo "  • Added composite indexes for faster queries"
echo "  • Optimized security rules to prevent 400 errors"
echo "  • Enabled proper caching in client code"
echo ""
echo "🔍 Monitor your Firebase console for index build progress:"
echo "https://console.firebase.google.com/project/free-cricket-scorer/firestore/indexes" 