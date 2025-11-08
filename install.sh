#!/bin/bash

echo "🚀 Installing Markdown to PDF Converter..."
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed!"
    echo "   Install from: https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js $(node --version) found"

# Check PrinceXML
if ! command -v prince &> /dev/null; then
    echo "❌ PrinceXML is not installed!"
    echo ""
    echo "Install PrinceXML:"
    echo "  macOS:   brew install prince"
    echo "  Linux:   Download from https://www.princexml.com/download/"
    echo "  Windows: Download from https://www.princexml.com/download/"
    echo ""
    exit 1
fi

echo "✅ PrinceXML found"

# Install npm dependencies
echo ""
echo "📦 Installing dependencies..."
npm install

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Installation complete!"
    echo ""
    echo "Usage:"
    echo "  node md-to-pdf.js <input.md> [output.pdf]"
    echo ""
    echo "Example:"
    echo "  node md-to-pdf.js ../vcb-security-framework/00-introduction-and-roadmap.md"
    echo ""
else
    echo ""
    echo "❌ Installation failed"
    exit 1
fi