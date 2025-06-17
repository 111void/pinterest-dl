const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Pinterest URL validation patterns
const PINTEREST_PATTERNS = [
    /^https?:\/\/(www\.)?pinterest\.(com|co\.uk|ca|de|fr|it|es|com\.au|com\.mx|co\.kr|jp|ph|cl|pt|ie|dk|no|se|nz|at|be|nl|ch|co\.za|in|ru|com\.br|pl|cz|sk|hu|ro|bg|hr|si|lt|lv|ee|fi|gr|tr|il|ae|eg|ma|ng|gh|ke|za|ug|tz|mw|zm|zw|bw|sz|ls|mu|sc|mg|km|dj|so|et|er|sd|ss|td|cf|cm|gq|ga|cg|cd|ao|na|bj|tg|bf|ml|ne|sn|gm|gw|cv|mr|dz|tn|ly|eh|eg|ma|sd|ss|td|cf|cm|gq|ga|cg|cd|ao|na|bj|tg|bf|ml|ne|sn|gm|gw|cv|mr|dz|tn|ly|eh)\/pin\/[\w-]+/,
    /^https?:\/\/(www\.)?pin\.it\/[\w-]+/,
    /pinterest\.com\/.*\/pins\/[\w-]+/,
    /pinterest\.com\/pin\/[\d]+/
];

// Function to validate Pinterest URL
function isValidPinterestUrl(url) {
    return PINTEREST_PATTERNS.some(pattern => pattern.test(url));
}

// Function to determine if media is video based on extension or URL
function isVideoMedia(url, extension) {
    const videoExtensions = ['mp4', 'mov', 'avi', 'webm', 'mkv'];
    if (extension && videoExtensions.includes(extension.toLowerCase())) {
        return true;
    }
    // Check URL for video indicators
    return /\.(mp4|mov|avi|webm|mkv)(\?|$)/i.test(url) || url.includes('/videos/');
}

// Function to get file extension from URL
function getFileExtension(url) {
    const match = url.match(/\.([a-zA-Z0-9]+)(\?|$)/);
    return match ? match[1] : null;
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
                message: 'Invalid Pinterest URL. Please provide a valid Pinterest pin URL.'
            });
        }

        console.log('Processing Pinterest URL:', url);

        // Call Pinterest API
        const response = await axios.get(`https://api.iherta.my.id/downloader/pinterest?url=${encodeURIComponent(url)}`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'application/json'
            },
            timeout: 20000
        });

        if (!response.data || !response.data.status) {
            return res.status(404).json({
                success: false,
                message: 'Pinterest pin not found or unable to process. Make sure the pin is public and accessible.'
            });
        }

        const data = response.data.result;
        const mediaUrl = data.media?.url;
        const extension = data.media?.extension || getFileExtension(mediaUrl);
        const isVideo = isVideoMedia(mediaUrl, extension);

        // Map response to match frontend format
        return res.json({
            success: true,
            data: {
                title: data.title || 'Pinterest Pin',
                description: data.description !== 'No description' ? data.description : null,
                author: null, // Not available in API response
                board: null,
                mediaUrl: mediaUrl,
                originalUrl: mediaUrl, 
                isVideo: isVideo,
                extension: extension,
                quality: data.media?.quality || (isVideo ? 'HD' : 'High Quality'),
                size: data.media?.size || null,
                formattedSize: data.media?.formattedSize || null,
                sourceUrl: data.source_url
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
                message: 'Pinterest pin not found. Please check if the URL is correct and the pin is publicly accessible.'
            });
        }

        if (error.response?.status === 403) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. The Pinterest pin might be private or restricted.'
            });
        }

        return res.status(500).json({
            success: false,
            message: 'Failed to process Pinterest pin. Please try again later.',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        service: 'Pinterest Downloader API',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'API endpoint not found'
    });
});

// 404 handler for other routes
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'Endpoint not found'
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
    console.log(`Health check: http://localhost:${PORT}/health`);
    console.log(`Download endpoint: http://localhost:${PORT}/api/download?url=<pinterest_url>`);
});

module.exports = app;