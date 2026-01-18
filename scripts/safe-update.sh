#!/bin/bash
# Safe Dependency Updates - No Breaking Changes
# Run this script to fix security vulnerabilities and remove unused dependencies

set -e  # Exit on error

echo "🔍 Starting safe dependency updates..."
echo ""

# 1. Remove unused dependencies
echo "📦 Removing unused dependencies..."
npm uninstall @hookform/resolvers zod date-fns react-hook-form
echo "✓ Removed unused dependencies"
echo ""

# 2. Fix security vulnerabilities
echo "🔒 Fixing security vulnerabilities..."
npm update react-router-dom  # Fixes HIGH severity XSS
npm audit fix                # Auto-fix compatible issues
echo "✓ Security vulnerabilities addressed"
echo ""

# 3. Update minor/patch versions
echo "⬆️  Updating safe minor versions..."
npm update lucide-react
npm update @tanstack/react-query
npm update embla-carousel-react
npm update input-otp
npm update cmdk
npm update class-variance-authority
npm update clsx
npm update tailwind-merge
npm update sonner
npm update vaul
npm update next-themes
echo "✓ Minor versions updated"
echo ""

# 4. Verify installation
echo "✅ Verifying installation..."
npm install
echo "✓ Dependencies installed"
echo ""

# 5. Run audit
echo "🔍 Running security audit..."
npm audit || true
echo ""

# 6. Test build
echo "🏗️  Testing build..."
npm run build
echo "✓ Build successful"
echo ""

echo "✨ Safe updates complete!"
echo ""
echo "Next steps:"
echo "1. Test the application: npm run dev"
echo "2. Commit changes: git add package*.json && git commit -m 'chore: update dependencies and remove unused packages'"
echo "3. For breaking updates, see scripts/breaking-update.sh"
