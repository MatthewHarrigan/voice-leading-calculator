import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 8002;

const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.svg': 'image/svg+xml',
    '.css': 'text/css'
};

const server = http.createServer((req, res) => {
    let filePath = path.join(__dirname, req.url === '/' ? 'minimal_chord_library.html' : req.url);
    
    // Security check
    if (!filePath.startsWith(__dirname)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }
    
    const ext = path.extname(filePath);
    const mimeType = mimeTypes[ext] || 'application/octet-stream';
    
    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(404);
            res.end('File not found');
            console.log(`404: ${req.url}`);
            return;
        }
        
        res.writeHead(200, { 'Content-Type': mimeType });
        res.end(data);
        console.log(`Served: ${req.url}`);
    });
});

server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log('Open http://localhost:${PORT} to view the intervals');
});

// Handle Ctrl+C
process.on('SIGINT', () => {
    console.log('\nShutting down server...');
    server.close(() => {
        process.exit(0);
    });
});