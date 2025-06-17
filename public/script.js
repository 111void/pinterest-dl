const form = document.getElementById('form');
const urlInput = document.getElementById('url');
const submitBtn = document.getElementById('submit');
const content = document.getElementById('content');

// Constants
const INSTRUCTIONS_HTML = `
    <ol>
        <li>Copy link of some Pinterest pin</li>
        <li>Paste link in text box</li>
        <li>Click the <b>DOWNLOAD</b> button</li>
        <li>Save the image or video in high quality</li>
    </ol>
`;

const PINTEREST_PATTERNS = [
    /^https?:\/\/(www\.)?pinterest\.(com|co\.uk|ca|de|fr|it|es|com\.au|com\.mx|co\.kr|jp|ph|cl|pt|ie|dk|no|se|nz|at|be|nl|ch|co\.za|in|ru|com\.br|pl|cz|sk|hu|ro|bg|hr|si|lt|lv|ee|fi|gr|tr|il|ae|eg|ma|ng|gh|ke|za|ug|tz|mw|zm|zw|bw|sz|ls|mu|sc|mg|km|dj|so|et|er|sd|ss|td|cf|cm|gq|ga|cg|cd|ao|na|bj|tg|bf|ml|ne|sn|gm|gw|cv|mr|dz|tn|ly|eh|eg|ma|sd|ss|td|cf|cm|gq|ga|cg|cd|ao|na|bj|tg|bf|ml|ne|sn|gm|gw|cv|mr|dz|tn|ly|eh)\/pin\/[\w-]+/,
    /^https?:\/\/(www\.)?pin\.it\/[\w-]+/,
    /pinterest\.com\/.*\/pins\/[\w-]+/,
    /pinterest\.com\/pin\/[\d]+/
];

// Utility functions
const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
};

const isValidPinterestUrl = (url) => {
    return PINTEREST_PATTERNS.some(pattern => pattern.test(url));
};

const showInstructions = () => {
    content.innerHTML = INSTRUCTIONS_HTML;
};

const showLoading = () => {
    content.innerHTML = `
        <div class="loading">
            <div class="spinner"></div>
            <p>Processing your Pinterest pin...</p>
        </div>
    `;
};

const showError = (message) => {
    content.innerHTML = `
        <div class="messageError">
            <i class='bx bx-error-circle'></i>
            <p>${message}</p>
        </div>
        ${INSTRUCTIONS_HTML}
    `;
};

const createDownloadButton = (url, filename, icon, text) => {
    return `<a href="${url}" class="btn" download="${filename}" target="_blank" rel="noopener">
        <i class='bx ${icon}'></i>${text}
    </a>`;
};

const buildImageResult = (data) => {
    const mediaInfo = `
        <div class="media-info">
            <h3>${data.title || 'Pinterest Pin'}</h3>
            ${data.description ? `<p><strong>Description:</strong> ${data.description}</p>` : ''}
            ${data.author ? `<p><strong>By:</strong> ${data.author}</p>` : ''}
            ${data.board ? `<p><strong>Board:</strong> ${data.board}</p>` : ''}
            ${data.formattedSize ? `<p><strong>Size:</strong> ${data.formattedSize}</p>` : ''}
            ${data.quality ? `<p><strong>Quality:</strong> ${data.quality}</p>` : ''}
        </div>
    `;

    const mediaDisplay = data.isVideo ? 
        `<video controls crossorigin="anonymous" preload="metadata">
            <source src="${data.mediaUrl}" type="video/mp4">
            Your browser does not support the video tag.
        </video>` :
        `<img src="${data.mediaUrl}" alt="Pinterest Image" crossorigin="anonymous">`;

    const downloadButtons = [];
    
    if (data.isVideo) {
        const videoFileName = `pinterest-video${data.extension ? '.' + data.extension : '.mp4'}`;
        downloadButtons.push(
            createDownloadButton(data.mediaUrl, videoFileName, "bx-video", "Download Video")
        );
    } else {
        const imageFileName = `pinterest-image${data.extension ? '.' + data.extension : '.jpg'}`;
        downloadButtons.push(
            createDownloadButton(data.mediaUrl, imageFileName, "bx-image", "Download Image")
        );
        
        if (data.originalUrl && data.originalUrl !== data.mediaUrl) {
            downloadButtons.push(
                createDownloadButton(data.originalUrl, `pinterest-original${data.extension ? '.' + data.extension : '.jpg'}`, "bx-image-alt", "Original Size")
            );
        }
    }

    const downloadSection = `
        <div class="download-section">
            <div class="download-options">
                ${downloadButtons.join('')}
            </div>
            <p style="font-size: 12px; color: var(--color-text-secondary); margin-top: 1rem; text-align: center;">
                <i class='bx bx-info-circle'></i> Right-click and "Save as" if direct download doesn't work
            </p>
        </div>
    `;

    return mediaInfo + mediaDisplay + downloadSection;
};

// Function to call backend API
const fetchPinterestData = async (url) => {
    const response = await fetch(`/api/download?url=${encodeURIComponent(url)}`);
    const result = await response.json();
    return result;
};

// Main download function
const downloadPinterestMedia = async (url) => {
    try {
        showLoading();
        submitBtn.disabled = true;

        console.log('Processing Pinterest URL:', url);

        // Replace this with actual API call
        const result = await fetchPinterestData(url);

        if (result.success && result.data) {
            content.innerHTML = buildImageResult(result.data);
        } else {
            showError(result.message || 'Unable to fetch Pinterest media. Please try again or check if the pin is public.');
        }

    } catch (error) {
        console.error('Error:', error);
        showError(`Failed to process Pinterest pin: ${error.message}. Please try again or check your internet connection.`);
    } finally {
        submitBtn.disabled = false;
    }
};

// Event listeners
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const url = urlInput.value.trim();
    
    if (!url) {
        showError('Please enter a Pinterest URL');
        return;
    }

    if (!isValidPinterestUrl(url)) {
        showError('Please enter a valid Pinterest URL (pinterest.com/pin/... or pin.it/...)');
        return;
    }

    await downloadPinterestMedia(url);
});

urlInput.addEventListener('focus', () => {
    if (content.querySelector('.messageError')) {
        showInstructions();
    }
});

urlInput.addEventListener('paste', (e) => {
    setTimeout(() => {
        const pastedUrl = e.target.value.trim();
        if (pastedUrl && isValidPinterestUrl(pastedUrl)) {
            setTimeout(() => form.dispatchEvent(new Event('submit')), 500);
        }
    }, 100);
});