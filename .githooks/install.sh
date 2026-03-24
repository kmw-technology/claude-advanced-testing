#!/bin/bash
# =============================================================================
# Git Hooks Installation Script
# =============================================================================
# Führe dieses Script aus um die Git Hooks zu aktivieren:
#   chmod +x .githooks/install.sh
#   ./.githooks/install.sh
# =============================================================================

echo "Installing Git hooks..."

# Set hooks directory
git config core.hooksPath .githooks

# Make hooks executable
chmod +x .githooks/pre-commit

echo "✅ Git hooks installed!"
echo ""
echo "The following hooks are now active:"
echo "  - pre-commit: Security checks before each commit"
echo ""
echo "To bypass hooks in emergencies, use: git commit --no-verify"
echo "(Use with caution!)"
