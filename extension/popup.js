
document.getElementById('downloadBtn').addEventListener('click', async () => {
    // Get active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (tab && tab.url) {
        // Current MediaTools URL - CHANGE THIS WHEN DEPLOYED
        const BASE_URL = 'http://localhost:4321';

        // Construct URL
        const targetUrl = `${BASE_URL}?url=${encodeURIComponent(tab.url)}`;

        // Open in new tab
        chrome.tabs.create({ url: targetUrl });
    }
});
