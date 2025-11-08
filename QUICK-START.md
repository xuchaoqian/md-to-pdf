# Quick Start Guide

## 1. Install Dependencies

```bash
cd md-to-pdf

# Install PrinceXML (if not already installed)
brew install prince

# Install Node.js packages
npm install
```

## 2. Convert a Markdown File

```bash
# Basic usage
node md-to-pdf.js example.md

# This creates: example.pdf
```

## 3. Verify the Output

Open `example.pdf` and check:

- ✅ Click on any bookmark in the left panel → jumps to that section
- ✅ Mermaid diagram is fully rendered with visible text
- ✅ All formatting looks clean and professional

## Advanced Usage

### Convert with custom output name:

```bash
node md-to-pdf.js input.md my-output.pdf
```

### Convert multiple files into one PDF:

```bash
# Merge multiple files (automatically sorted)
node md-to-pdf.js chapter1.md chapter2.md chapter3.md book.pdf

# All markdown files in current directory
node md-to-pdf.js *.md complete-document.pdf
```

### Convert with cover page:

```bash
# Cover page + content files
node md-to-pdf.js --cover cover.md 01-intro.md 02-main.md output.pdf

# Cover page + all numbered files
node md-to-pdf.js --cover cover.md 0*.md complete.pdf
```

### Convert the VCB security framework:

```bash
# Single file
node md-to-pdf.js ../vcb-security-framework/00-introduction-and-roadmap.md

# Complete framework with cover (all in one PDF)
cd ../vcb-security-framework
node ../md-to-pdf/md-to-pdf.js --cover cover.md 0*.md vcb-complete.pdf
```

### Batch conversion (separate PDFs):

```bash
for file in ../vcb-security-framework/*.md; do
  node md-to-pdf.js "$file"
done
```

## Troubleshooting

### No bookmarks in PDF?

- PrinceXML creates bookmarks from H1-H6 headings
- Make sure your markdown has proper heading syntax (`#`, `##`, etc.)

### Mermaid diagrams blank?

- Check the syntax is valid (use Mermaid Live Editor: https://mermaid.live)
- Increase timeout in md-to-pdf.js if diagrams are very complex

### Chinese characters broken?

- The tool uses "PingFang SC" font (macOS default)
- For other OS, install Chinese fonts and update font-family in CSS

## Features

✨ **Perfect Bookmarks** - Click any bookmark to jump to exact section  
🎨 **Mermaid Support** - Diagrams rendered as crisp PNG images  
📖 **GitHub Style** - Beautiful, professional formatting  
🌏 **Unicode** - Full Chinese, emoji, and special character support  
📚 **Multi-File Merge** - Combine multiple markdown files into one PDF  
📘 **Cover Pages** - Add professional cover pages with --cover flag  
⚙️ **CLI Ready** - Easy automation and CI/CD integration

## Multi-File Features

When merging multiple files:
- ✅ Files are automatically sorted alphabetically
- ✅ Page breaks inserted between files
- ✅ All headings appear in unified bookmark tree
- ✅ Mermaid diagrams numbered sequentially across all files
- ✅ Cover page appears first (when specified)

Enjoy your beautiful PDFs! 📄
