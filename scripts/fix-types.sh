#!/bin/bash

# Type Safety Fix Script
# Fixes common type errors in analysis components

echo "🔧 Starting type fixes..."

# 1. Fix framer-motion spring type
echo "📝 Fixing framer-motion types..."
find src/app/analysis/components -name "*.tsx" -type f -exec sed -i '' 's/type: "spring"/type: "spring" as const/g' {} \;

# 2. Fix optional chaining for common patterns
echo "📝 Adding optional chaining..."

# doc.filename -> doc?.filename
find src/app/analysis/components -name "*.tsx" -type f -exec sed -i '' 's/doc\.filename/doc?.filename/g' {} \;

# table.id -> table_id (correct property name)
# This is more complex, need to do it file by file

echo "✅ Basic fixes applied!"
echo "⚠️  Manual fixes still needed for:"
echo "   - Property name mismatches (id vs table_id)"
echo "   - Type definitions updates"
echo "   - Complex optional chaining"

chmod +x "$0"


