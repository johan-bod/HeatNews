#!/bin/bash
# Breaking Dependency Updates - Test Carefully!
# Run this script in a separate branch and test thoroughly

set -e  # Exit on error

echo "⚠️  WARNING: This script updates dependencies with breaking changes!"
echo "   Make sure you're in a separate branch before proceeding."
echo ""
read -p "Continue? (y/N) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cancelled."
    exit 1
fi

# 1. Update React 18 → 19
echo "⬆️  Updating React 18 → 19..."
npm install react@latest react-dom@latest
npm install --save-dev @types/react@latest @types/react-dom@latest
echo "✓ React updated to v19"
echo ""

# 2. Update Vite 5 → 6
echo "⬆️  Updating Vite 5 → 6..."
npm install vite@latest
echo "✓ Vite updated to v6"
echo ""

# 3. Update React Router 6 → 7
echo "⬆️  Updating React Router 6 → 7..."
npm install react-router-dom@latest
echo "✓ React Router updated to v7"
echo ""

# 4. Update other major versions
echo "⬆️  Updating other dependencies with major changes..."
npm install next-themes@latest
npm install sonner@latest
npm install tailwind-merge@latest
npm install vaul@latest
npm install recharts@latest
npm install react-day-picker@latest
npm install react-resizable-panels@latest
npm install date-fns@latest  # If you decide to keep it
echo "✓ Other packages updated"
echo ""

# 5. Install all dependencies
echo "📦 Installing dependencies..."
npm install
echo "✓ Dependencies installed"
echo ""

# 6. Run build
echo "🏗️  Testing build..."
npm run build
echo "✓ Build successful"
echo ""

echo "✨ Breaking updates complete!"
echo ""
echo "⚠️  IMPORTANT: Test thoroughly before merging!"
echo ""
echo "Testing checklist:"
echo "  [ ] Run dev server: npm run dev"
echo "  [ ] Test all routes and navigation"
echo "  [ ] Test all UI components"
echo "  [ ] Check browser console for errors"
echo "  [ ] Test production build: npm run preview"
echo "  [ ] Review React 19 migration guide: https://react.dev/blog/2024/04/25/react-19"
echo "  [ ] Review React Router 7 migration: https://reactrouter.com/upgrading/v6"
echo "  [ ] Review Vite 6 changelog: https://vitejs.dev/guide/migration"
echo ""
echo "After testing, commit with: git add package*.json && git commit -m 'chore: update to React 19, Vite 6, and other major versions'"
