#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer';
import Prince from 'prince';
import { marked } from 'marked';

// Parse command line arguments
const args = process.argv.slice(2);
if (args.length < 1) {
  console.log('Usage: node md-to-pdf.js [--cover cover.md] <input.md> [input2.md...] [output.pdf]');
  console.log('');
  console.log('Examples:');
  console.log('  Single file:   node md-to-pdf.js document.md');
  console.log('  Multiple files: node md-to-pdf.js file1.md file2.md file3.md output.pdf');
  console.log('  With cover:    node md-to-pdf.js --cover cover.md *.md output.pdf');
  process.exit(1);
}

// Parse --cover flag
let coverFile = null;
let fileArgs = [...args];
const coverIndex = fileArgs.indexOf('--cover');
if (coverIndex !== -1 && coverIndex < fileArgs.length - 1) {
  coverFile = fileArgs[coverIndex + 1];
  fileArgs.splice(coverIndex, 2); // Remove --cover and its argument
}

// Determine output file (last arg if it ends with .pdf)
let outputFile;
let inputFiles;
if (fileArgs.length > 1 && fileArgs[fileArgs.length - 1].endsWith('.pdf')) {
  outputFile = fileArgs.pop();
  inputFiles = fileArgs;
} else if (fileArgs.length === 1) {
  inputFiles = fileArgs;
  outputFile = fileArgs[0].replace(/\.md$/, '.pdf');
} else {
  inputFiles = fileArgs;
  outputFile = 'output.pdf';
}

// Sort input files alphabetically (locale-aware for proper sorting of numbered files)
inputFiles.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

// Validate that all input files exist
for (const file of inputFiles) {
  if (!fs.existsSync(file)) {
    console.error(`❌ Error: File not found: ${file}`);
    process.exit(1);
  }
}

// Validate cover file if specified
if (coverFile && !fs.existsSync(coverFile)) {
  console.error(`❌ Error: Cover file not found: ${coverFile}`);
  process.exit(1);
}

console.log('🚀 Markdown to PDF Converter');
if (coverFile) {
  console.log(`📘 Cover: ${coverFile}`);
}
console.log(`📄 Input files (${inputFiles.length}):`);
inputFiles.forEach((file, i) => {
  console.log(`   ${i + 1}. ${file}`);
});
console.log(`📄 Output: ${outputFile}\n`);

// Read and merge markdown files
let markdown = '';
let coverContent = '';

// Add cover page first if specified
if (coverFile) {
  console.log('📘 Processing cover page...');
  coverContent = fs.readFileSync(coverFile, 'utf-8');
  // Mark cover content with special markers for later processing
  markdown += '%%COVER_START%%\n' + coverContent + '\n%%COVER_END%%';
  markdown += '\n\n<div class="page-break"></div>\n\n';
}

// Read and concatenate all input files with page breaks
console.log('📚 Merging markdown files...');
inputFiles.forEach((file, index) => {
  const content = fs.readFileSync(file, 'utf-8');
  markdown += content;
  
  // Add page break between files (but not after the last one)
  if (index < inputFiles.length - 1) {
    markdown += '\n\n<div class="page-break"></div>\n\n';
  }
});

console.log(`✓ Merged ${inputFiles.length} file(s)${coverFile ? ' + cover' : ''}\n`);

// Extract and track mermaid blocks
const mermaidBlocks = [];
markdown = markdown.replace(/```mermaid\n([\s\S]*?)```/g, (match, code) => {
  const index = mermaidBlocks.length;
  mermaidBlocks.push(code.trim());
  return `%%MERMAID_${index}%%`;
});

if (mermaidBlocks.length > 0) {
  console.log(`✓ Found ${mermaidBlocks.length} Mermaid diagram(s)\n`);
}

// Configure marked with proper heading IDs
const renderer = new marked.Renderer();
renderer.heading = function({text, depth}) {
  const cleanText = text.replace(/<[^>]*>/g, '').trim();
  const id = cleanText
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\u4e00-\u9fa5-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return `<h${depth} id="${id}">${text}</h${depth}>`;
};

const originalCode = renderer.code.bind(renderer);
renderer.code = function(code, language, isEscaped) {
  const codeText = typeof code === 'string' ? code : code.text || '';
  if (codeText.includes('%%MERMAID_')) {
    return `<p>${codeText}</p>`;
  }
  return originalCode(code, language, isEscaped);
};

marked.setOptions({ renderer, breaks: true, gfm: true });

// Parse markdown content
let bodyContent = '';

// Handle cover section separately if present
if (markdown.includes('%%COVER_START%%')) {
  // Extract cover and main content
  const coverMatch = markdown.match(/%%COVER_START%%\n([\s\S]*?)\n%%COVER_END%%/);
  if (coverMatch) {
    const coverMarkdown = coverMatch[1];
    const mainMarkdown = markdown.replace(/%%COVER_START%%\n[\s\S]*?\n%%COVER_END%%/, '');
    
    // Parse cover content WITHOUT automatic line breaks
    marked.setOptions({ renderer, breaks: false, gfm: true });
    const coverHtml = marked.parse(coverMarkdown);
    
    // Remove bookmark levels from cover headings
    const coverWithoutBookmarks = coverHtml.replace(
      /<h([1-6])/g, 
      '<h$1 class="no-bookmark"'
    );
    
    // Wrap cover in a section with a single "Cover" bookmark
    const coverSection = `<section class="cover-section"><h1 id="cover">Cover</h1><div class="cover-content">${coverWithoutBookmarks}</div></section>`;
    
    // Restore breaks: true for main content
    marked.setOptions({ renderer, breaks: true, gfm: true });
    const mainHtml = marked.parse(mainMarkdown);
    
    // Combine: cover (with single bookmark) + main content (with bookmarks)
    bodyContent = coverSection + mainHtml;
  } else {
    bodyContent = marked.parse(markdown);
  }
} else {
  bodyContent = marked.parse(markdown);
}

// Generate unique temp directory for this conversion
const tempDir = `temp-${Date.now()}`;
fs.mkdirSync(tempDir, { recursive: true });

// Main conversion process
(async () => {
  try {
    // Step 1: Convert Mermaid diagrams to PNG
    if (mermaidBlocks.length > 0) {
      console.log('🎨 Converting Mermaid diagrams to PNG...\n');
      
      const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
      
      for (let i = 0; i < mermaidBlocks.length; i++) {
        const page = await browser.newPage();
        await page.setViewport({ width: 1400, height: 1000 });
        
        const mermaidHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <script src="https://cdn.jsdelivr.net/npm/mermaid@10.6.1/dist/mermaid.min.js"></script>
  <style>
    body { margin: 0; padding: 20px; background: white; }
    .mermaid { text-align: center; }
  </style>
</head>
<body>
  <div class="mermaid">${mermaidBlocks[i]}</div>
  <script>
    mermaid.initialize({ 
      startOnLoad: true, 
      theme: 'default',
      fontFamily: 'Arial, sans-serif',
      flowchart: { useMaxWidth: false, htmlLabels: true }
    });
  </script>
</body>
</html>`;
        
        await page.setContent(mermaidHtml, { waitUntil: 'networkidle0' });
        await page.waitForSelector('.mermaid svg', { timeout: 10000 });
        await new Promise(r => setTimeout(r, 1000));
        
        const svgElement = await page.$('.mermaid svg');
        if (svgElement) {
          const pngFile = path.join(tempDir, `mermaid-${i}.png`);
          await svgElement.screenshot({ path: pngFile, omitBackground: false });
          console.log(`  ✓ Diagram ${i + 1} → ${path.basename(pngFile)}`);
        }
        
        await page.close();
      }
      
      await browser.close();
      console.log('\n✅ Mermaid diagrams converted\n');
    }
    
    // Replace mermaid placeholders with PNG images
    // Use relative path from the HTML file location
    mermaidBlocks.forEach((code, i) => {
      const imgPath = `mermaid-${i}.png`;  // Relative to HTML file in tempDir
      bodyContent = bodyContent.replace(
        `%%MERMAID_${i}%%`,
        `<div class="mermaid-diagram"><img src="${imgPath}" alt="Mermaid Diagram ${i + 1}" /></div>`
      );
    });
    
    // Create final HTML with Prince-specific styles
    const finalHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Document</title>
  <style>
    @page { size: A4; margin: 18mm; }
    
    /* Prince bookmark levels */
    h1 { prince-bookmark-level: 1; }
    h2 { prince-bookmark-level: 2; }
    h3 { prince-bookmark-level: 3; }
    h4 { prince-bookmark-level: 4; }
    
    /* Suppress bookmarks for cover page headings */
    h1.no-bookmark, h2.no-bookmark, h3.no-bookmark, h4.no-bookmark,
    h5.no-bookmark, h6.no-bookmark {
      prince-bookmark-level: none;
    }
    
    /* Cover section styling */
    .cover-section h1#cover {
      /* Hidden heading for bookmark only */
      position: absolute;
      left: -9999px;
      prince-bookmark-level: 1;
    }
    
    .cover-content {
      /* Cover content styling - no extra margins */
    }
    
    .cover-content h1,
    .cover-content h2 {
      /* Remove border-bottom from headings in cover page */
      border-bottom: none;
      padding-bottom: 0;
    }
    
    .cover-content hr {
      /* Lighter, more subtle horizontal rules for cover page */
      border: none;
      border-top: 1px solid #e0e0e0;
      margin: 15px 0;
      opacity: 0.5;
    }
    
    /* New Cover Page Styles */
    .cover-page {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      text-align: center;
      height: 95vh;
      font-family: "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
    }
    .cover-header h1 {
      font-size: 2.8em;
      color: #2c3e50;
      border-bottom: none;
      margin-bottom: 10px;
    }
    .cover-header .subtitle {
      font-size: 1.5em;
      color: #7f8c8d;
      margin-top: 0;
      margin-bottom: 40px;
    }
    .cover-methodology {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 12px;
      padding: 25px 35px;
      margin-bottom: 40px;
      width: 85%;
      box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
    }
    .methodology-text {
      font-size: 1.15em;
      color: #ffffff;
      line-height: 1.8;
      margin: 0;
      text-align: left;
    }
    .methodology-text strong {
      color: #ffd700;
      font-weight: 700;
    }
    .nist-phases {
      display: flex;
      justify-content: center;
      align-items: center;
      margin-bottom: 40px;
      width: 90%;
      gap: 8px;
    }
    .phase-card {
      background: #f8f9fa;
      border: 1px solid #dee2e6;
      border-radius: 6px;
      padding: 10px 16px;
      font-size: 0.95em;
      color: #495057;
      font-weight: 500;
      box-shadow: 0 2px 4px rgba(0,0,0,0.05);
      white-space: nowrap;
      flex-shrink: 0;
    }
    .phase-arrow {
      font-size: 1.4em;
      color: #adb5bd;
      font-weight: normal;
      flex-shrink: 0;
    }
    .cover-details {
      background: #f8f9fa;
      border: 1px solid #dee2e6;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 40px;
      width: 80%;
    }
    .detail-item {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #e9ecef;
    }
    .detail-item:last-child {
      border-bottom: none;
    }
    .detail-item strong {
      color: #495057;
    }
    .detail-item span {
      color: #212529;
    }
    .security-domains-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 15px;
      width: 90%;
      margin-bottom: 50px;
    }
    .domain-card {
      background: #ffffff;
      border: 1px solid #dee2e6;
      border-radius: 8px;
      padding: 20px;
      font-size: 1.1em;
      color: #34495e;
      box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    }
    .cover-footer {
      position: absolute;
      bottom: 60px;
      font-size: 0.9em;
      color: #95a5a6;
    }
    .confidential-warning {
      position: absolute;
      bottom: 20px;
      font-size: 1em;
      color: #c0392b;
      font-weight: bold;
    }
    /* End New Cover Page Styles */
    
    /* Page break support for multi-file PDFs */
    .page-break { page-break-before: always; }
    
    body {
      font-family: "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", Arial, sans-serif;
      color: #333;
      font-size: 12pt;
      line-height: 1.6;
    }
    
    h1, h2, h3, h4 {
      font-weight: 600;
      margin: 24px 0 16px 0;
      page-break-after: avoid;
    }
    h1 { font-size: 2em; border-bottom: 2px solid #3498db; padding-bottom: 10px; }
    h2 { font-size: 1.5em; border-bottom: 1px solid #ddd; padding-bottom: 8px; }
    h3 { font-size: 1.25em; }
    h4 { font-size: 1.1em; }
    
    p { margin: 10px 0; }
    ul, ol { margin: 10px 0; padding-left: 2em; }
    li { margin: 4px 0; }
    
    code { background: #f5f5f5; padding: 2px 6px; border-radius: 3px; font-size: 0.9em; }
    pre { background: #f6f8fa; padding: 16px; border-radius: 6px; margin: 16px 0; page-break-inside: avoid; }
    pre code { background: transparent; padding: 0; }
    
    .mermaid-diagram {
      margin: 20px 0;
      padding: 20px;
      background: #fff;
      border: 1px solid #ddd;
      border-radius: 6px;
      text-align: center;
      page-break-inside: avoid;
    }
    
    .mermaid-diagram img {
      max-width: 100%;
      height: auto;
    }
    
    blockquote { border-left: 4px solid #3498db; padding-left: 16px; margin: 16px 0; color: #666; }
    hr { border: none; border-top: 2px solid #ddd; margin: 20px 0; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; page-break-inside: avoid; }
    th, td { border: 1px solid #ddd; padding: 8px; }
    th { background: #f5f5f5; font-weight: 600; }
    tr:nth-child(even) { background: #fafafa; }
    a { color: #3498db; text-decoration: none; }
    strong { font-weight: 600; }
  </style>
</head>
<body>${bodyContent}</body>
</html>`;
    
    const htmlFile = path.join(tempDir, 'output.html');
    fs.writeFileSync(htmlFile, finalHtml);
    console.log(`✅ HTML created: ${htmlFile}\n`);
    
    // Step 2: Convert to PDF with PrinceXML
    console.log('📄 Converting to PDF with PrinceXML...\n');
    
    Prince()
      .inputs(htmlFile)
      .output(outputFile)
      .execute()
      .then(() => {
        // Cleanup temp directory
        fs.rmSync(tempDir, { recursive: true, force: true });
        
        console.log('\n🎉 SUCCESS!\n');
        console.log(`✅ PDF created: ${outputFile}`);
        console.log('   ✨ Perfect clickable bookmarks');
        console.log('   🎨 Rendered Mermaid diagrams (PNG)');
        console.log('   📖 Beautiful GitHub-style formatting');
        console.log('   🌏 Full Unicode support (Chinese, emojis, special characters)\n');
      })
      .catch((error) => {
        console.error('❌ PrinceXML Error:', error.message);
        console.log('\n💡 Make sure PrinceXML is installed:');
        console.log('   brew install prince');
        console.log('   Or download from: https://www.princexml.com/\n');
        
        // Keep temp files for debugging
        console.log(`🔍 Debug files kept in: ${tempDir}/\n`);
        process.exit(1);
      });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    
    // Cleanup on error
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    process.exit(1);
  }
})();