# Markdown to PDF Converter

Convert Markdown files to beautiful PDFs with Features:

- ✨ **Perfect clickable bookmarks** (auto-generated from headings)
- 🎨 **Rendered Mermaid diagrams** (converted to PNG images)
- 📖 **GitHub-style formatting** (clean, professional appearance)
- 🌏 **Full Unicode support** (Chinese, emojis, special characters)
- **Command-line interface** - Easy automation for CI/CD pipelines
- **Smart page breaks** - Keeps tables, code blocks, and diagrams intact
- **Multi-file support** - Combine multiple markdown files into one PDF
- **Cover pages** - Add professional cover pages with --cover flag

## Requirements

### 1. Node.js (v16+)

```bash
# Check if installed
node --version
```

### 2. PrinceXML

```bash
# macOS
brew install prince

# Or download from:
# https://www.princexml.com/download/

```

### 3. Install dependencies

```bash
cd md-to-pdf
npm install
```

## Usage

### Basic Usage

```bash
# Single file
node md-to-pdf.js input.md
# Creates: input.pdf

# Multiple files (sorted alphabetically)
node md-to-pdf.js file1.md file2.md file3.md output.pdf

# With cover page
node md-to-pdf.js --cover cover.md file1.md file2.md output.pdf
```

### Examples

**Convert single file:**

```bash
node md-to-pdf.js ../vcb-security-framework/00-introduction-and-roadmap.md
```

**Convert multiple files into one PDF:**

```bash
node md-to-pdf.js 01-intro.md 02-chapter.md 03-conclusion.md book.pdf
```

**Convert all markdown files with cover page:**

```bash
node md-to-pdf.js --cover cover.md *.md complete-document.pdf
```

**Test the converter:**

```bash
npm test
```

## Multi-File Support

The converter now supports merging multiple markdown files into a single PDF:

- **Automatic Sorting** - Files are sorted alphabetically (01-intro.md, 02-chapter.md, etc.)
- **Page Breaks** - Automatic page breaks inserted between files
- **Cover Pages** - Optional cover page with `--cover` flag (appears as single "Cover" bookmark)
- **Unified Bookmarks** - All headings from content files appear in the PDF bookmark tree
- **Mermaid Across Files** - Diagrams from all files are rendered and numbered sequentially

## How It Works

1. **Parse Arguments** - Detects cover page flag and multiple input files
2. **Merge Markdown** - Concatenates files with page breaks between sections
3. **Extract Mermaid** - Finds Mermaid code blocks across all files
4. **Render Diagrams** - Uses Puppeteer to render each Mermaid diagram as PNG
5. **Generate HTML** - Creates styled HTML with PNG images embedded
6. **Create PDF** - PrinceXML converts HTML to PDF with automatic bookmarks

### The Magic: PrinceXML CSS

PrinceXML uses special CSS properties to create PDF bookmarks:

```css
h1 {
  prince-bookmark-level: 1;
} /* Top-level bookmark */
h2 {
  prince-bookmark-level: 2;
} /* Sub-bookmark */
h3 {
  prince-bookmark-level: 3;
} /* Sub-sub-bookmark */
```

This automatically creates a hierarchical bookmark structure in the PDF!

## Markdown Support

### Standard Markdown

- Headings (H1-H6)
- **Bold**, _italic_, ~~strikethrough~~
- Lists (ordered and unordered)
- Links and images
- Code blocks with syntax highlighting
- Tables
- Blockquotes
- Horizontal rules

### GitHub Flavored Markdown

- Task lists: `- [ ]` and `- [x]`
- Tables
- Strikethrough
- Autolinks

### Mermaid Diagrams

```markdown
\`\`\`mermaid
graph TD
A[Start] --> B[End]
\`\`\`
```

## Customization

Edit the CSS in [`md-to-pdf.js`](md-to-pdf.js:1) to customize:

- Page size and margins (line 153)
- Fonts and colors (lines 162-230)
- Heading styles (lines 178-188)
- Code block appearance (lines 195-209)

## Troubleshooting

### "PrinceXML not found"

Install PrinceXML:

```bash
brew install prince
```

### "Cannot find module 'marked'"

Install dependencies:

```bash
npm install
```

### Mermaid diagrams not rendering

- Check that the Mermaid syntax is valid
- Try opening the temporary HTML file to debug
- Increase timeout in the code if diagrams are complex

### Chinese characters not displaying

The converter uses "PingFang SC" font (built into macOS). For other systems, update the font-family in the CSS.

## Comparison with Other Tools

| Tool          | Bookmarks      | Mermaid | Chinese | Quality    |
| ------------- | -------------- | ------- | ------- | ---------- |
| **This tool** | ✅ Perfect     | ✅ PNG  | ✅ Yes  | ⭐⭐⭐⭐⭐ |
| pandoc        | ✅ Yes         | ❌ No   | ✅ Yes  | ⭐⭐⭐⭐   |
| Puppeteer     | ❌ Poor        | ✅ Yes  | ✅ Yes  | ⭐⭐⭐     |
| WeasyPrint    | ⚠️ Wrong pages | ✅ Yes  | ✅ Yes  | ⭐⭐       |
| VSCode MD PDF | ❌ No          | ✅ Yes  | ✅ Yes  | ⭐⭐⭐     |

## License

MIT

## Credits

- **PrinceXML** - Professional HTML to PDF conversion
- **Puppeteer** - Headless Chrome for Mermaid rendering
- **marked** - Fast markdown parser
- **Mermaid.js** - Diagram generation

---

**Inspired by:** VSCode Markdown Preview Enhanced and PrinceXML documentation
