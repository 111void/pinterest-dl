const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Function to validate Pinterest URL
function isValidPinterestUrl(url) {
    const pinterestRegex = /^https?:\/\/(www\.)?pinterest\.(com|co\.uk|ca|de|fr|it|es|com\.au|com\.mx|co\.kr|jp|ph|cl|pt|ie|dk|no|se|nz|at|be|nl|ch|co\.za|in|ru|com\.br|pl|cz|sk|hu|ro|bg|hr|si|lt|lv|ee|fi|gr|tr|il|ae|eg|ma|ng|gh|ke|za|ug|tz|mw|zm|zw|bw|sz|ls|mu|sc|mg|km|dj|so|et|er|sd|ss|td|cf|cm|gq|ga|cg|cd|ao|na|bj|tg|bf|ml|ne|sn|gm|gw|cv|mr|dz|tn|ly|eh)/;
    const pinItRegex = /^https?:\/\/(www\.)?pin\.it\/[\w-]+/;
    const patterns = [
        /pinterest\.com\/pin\/[\d]+/,
        /pinterest\.com\/.*\/pins\/[\w-]+/,
        /pin\.it\/[\w-]+/
    ];
    
    return pinterestRegex.test(url) || pinItRegex.test(url) || patterns.some(pattern => pattern.test(url));
}

// Function to format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Function to determine media type from URL
function getMediaType(url) {
    const videoExtensions = ['.mp4', '.mov', '.avi', '.mkv', '.webm'];
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    
    const urlLower = url.toLowerCase();
    
    if (videoExtensions.some(ext => urlLower.includes(ext))) {
        return 'video';
    } else if (imageExtensions.some(ext => urlLower.includes(ext))) {
        return 'image';
    } else if (urlLower.includes('videos/')) {
        return 'video';
    } else {
        return 'image'; // Default to image for Pinterest
    }
}

// Main download endpoint
app.get('/api/download', async (req, res) => {
    try {
        const { url } = req.query;

        if (!url) {
            return res.status(400).json({
                success: false,
                message: 'URL parameter is required'
            });
        }

        if (!isValidPinterestUrl(url)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid Pinterest URL. Please use pinterest.com/pin/... or pin.it/... format'
            });
        }

        console.log('Processing Pinterest URL:', url);

        // Call Pinterest API
        const response = await axios.get(`https://api.iherta.my.id/downloader/pinterest?url=${encodeURIComponent(url)}`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'application/json'
            },
            timeout: 15000
        });

        if (!response.data || !response.data.status) {
            return res.status(404).json({
                success: false,
                message: 'Pinterest pin not found or unable to process'
            });
        }

        const data = response.data.result;
        const mediaType = getMediaType(data.media?.url || '');

        // Map response to match frontend format
        return res.json({
            success: true,
            data: {
                title: data.title || 'Pinterest Pin',
                description: data.description !== 'No description' ? data.description : null,
                author: null, // Not available in API response
                board: null, // Not available in API response
                mediaUrl: data.media?.url,
                originalUrl: data.media?.url, // Same as mediaUrl for now
                isVideo: mediaType === 'video',
                mediaType: mediaType,
                quality: data.media?.quality || null,
                extension: data.media?.extension || null,
                fileSize: data.media?.size || null,
                formattedSize: data.media?.formattedSize || (data.media?.size ? formatFileSize(data.media.size) : null),
                sourceUrl: data.source_url || url
            }
        });

    } catch (error) {
        console.error('Pinterest API Error:', error.message);
        
        if (error.code === 'ECONNABORTED') {
            return res.status(408).json({
                success: false,
                message: 'Request timeout. Please try again.'
            });
        }

        if (error.response?.status === 404) {
            return res.status(404).json({
                success: false,
                message: 'Pinterest pin not found. Make sure the URL is correct and the pin is public.'
            });
        }

        return res.status(500).json({
            success: false,
            message: 'Failed to process Pinterest pin. Please try again later.',
            error: error.response?.data?.message || error.message
        });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        service: 'Pinterest Downloader API',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'Endpoint not found',
        availableEndpoints: ['/api/download', '/api/health']
    });
});

// Error handler
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).json({
        success: false,
        message: 'Internal server error'
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`Pinterest Downloader API running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
    console.log(`Download endpoint: http://localhost:${PORT}/api/download?url=<pinterest_url>`);
});

module.exports = app;