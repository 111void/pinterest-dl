const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Function to validate Pinterest URL
function isValidPinterestUrl(url) {
    const patterns = [
        /^https?:\/\/(www\.)?pinterest\./,
        /^https?:\/\/(www\.)?pin\.it\//
    ];
    return patterns.some(pattern => pattern.test(url));
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
                message: 'Invalid Pinterest URL'
            });
        }

        console.log('Processing Pinterest URL:', url);

        const response = await axios.get(`https://api.iherta.my.id/downloader/pinterest?url=${encodeURIComponent(url)}`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'application/json'
            },
            timeout: 15000
        });

        if (!response.data || !response.data.status) {
            return res.status(404).json({
                success: false,
                message: 'Pinterest pin not found'
            });
        }

        const data = response.data.result;
        const isVideo = data.media?.url?.includes('.mp4') || data.media?.extension === 'mp4';

        return res.json({
            success: true,
            data: {
                title: data.title || 'Pinterest Pin',
                description: data.description !== 'No description' ? data.description : null,
                mediaUrl: data.media?.url,
                isVideo: isVideo,
                extension: data.media?.extension,
                formattedSize: data.media?.formattedSize,
                quality: data.media?.quality
            }
        });

    } catch (error) {
        console.error('Error:', error.message);
        
        return res.status(500).json({
            success: false,
            message: 'Failed to process Pinterest pin. Please try again.'
        });
    }
});

// Serve static files
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`Pinterest Downloader running on http://localhost:${PORT}`);
});

module.exports = app;