import fs from 'fs';
import path from 'path';

function generateSVGManifest() {
    const manifest = {};
    
    // Get all interval directories
    const dirs = fs.readdirSync('.').filter(dir => 
        dir.startsWith('intervals_') && fs.statSync(dir).isDirectory()
    );
    
    for (const dir of dirs) {
        const intervalName = dir.replace('intervals_', '');
        const svgFiles = fs.readdirSync(dir).filter(file => file.endsWith('.svg'));
        manifest[intervalName] = svgFiles;
        console.log(`${intervalName}: ${svgFiles.length} files`);
    }
    
    // Write manifest as JavaScript file
    const jsContent = `// Auto-generated SVG file manifest
const SVG_MANIFEST = ${JSON.stringify(manifest, null, 2)};

// Export for use in HTML
if (typeof window !== 'undefined') {
    window.SVG_MANIFEST = SVG_MANIFEST;
}`;
    
    fs.writeFileSync('svg_manifest.js', jsContent);
    console.log('\nManifest written to svg_manifest.js');
    
    return manifest;
}

if (import.meta.url === `file://${process.argv[1]}`) {
    generateSVGManifest();
}