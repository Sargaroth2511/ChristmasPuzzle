#!/bin/bash
# Documentation Cleanup Script
# Removes obsolete @angular/localize documentation files

cd "$(dirname "$0")"

echo "🧹 Cleaning up obsolete i18n documentation files..."
echo ""

# Files to remove (not yet tracked in git)
FILES_TO_REMOVE=(
    "I18N_IMPLEMENTATION.md"
    "I18N_QUICK_START.md"
    "TESTING_LANGUAGE_SUPPORT.md"
    "LANGUAGE_ROUTING_SOLUTION.md"
    "LANGUAGE_SUPPORT_SUMMARY.md"
)

for file in "${FILES_TO_REMOVE[@]}"; do
    if [ -f "$file" ]; then
        echo "  ❌ Removing: $file"
        rm "$file"
    else
        echo "  ⚠️  Not found: $file"
    fi
done

echo ""
echo "✅ Cleanup complete!"
echo ""
echo "📝 Current documentation:"
echo "  ✓ RUNTIME_LANGUAGE_SWITCHING.md  (primary guide)"
echo "  ✓ TRANSLATION_FIXES.md           (bug fixes)"
echo "  ✓ LANGUAGE_SWITCHER_FIXES.md     (UI improvements)"
echo "  ✓ VERSION_CONTROL_AUDIT.md       (security audit)"
echo ""
echo "All obsolete @angular/localize docs have been removed."
