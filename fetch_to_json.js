const fs = require('fs');

// Akash Go API Endpoint
const channelApiUrl = 'https://kong.akash-go.com/content-detail/pub/api/v6/channels/318';

const requestHeaders = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': 'https://akashgo.com/',
    'Origin': 'https://akashgo.com',
    'Accept': 'application/json, text/plain, */*'
};

async function generatePlaylists() {
    try {
        const response = await fetch(channelApiUrl, { headers: requestHeaders });
        const resData = await response.json();

        // API Response Structure অনুযায়ী ডাটা ধরা
        const channelMeta = resData?.data?.channelMeta;

        if (!channelMeta) {
            console.error("Channel metadata not found in API response.");
            process.exit(1);
        }

        const channelId = channelMeta.id || "318";
        const channelName = channelMeta.channelName || channelMeta.name || "Unknown Channel";
        const logoUrl = channelMeta.logo || "https://akashgo.com/Json_images/favicon.ico";
        const streamUrl = channelMeta.nonProtectedHlsConsumerUrl || channelMeta.protectedHlsConsumerUrl || "";
        const category = channelMeta.category || "News";

        // ১. JSON প্লেলিস্ট অবজেক্ট
        const playlistJson = [
            {
                id: String(channelId),
                name: channelName,
                logo: logoUrl,
                stream_url: streamUrl,
                headers: {
                    "User-Agent": requestHeaders['User-Agent'],
                    "Referer": requestHeaders['Referer']
                },
                category: category
            }
        ];

        fs.writeFileSync('playlist.json', JSON.stringify(playlistJson, null, 2));
        console.log('playlist.json তৈরি সফল হয়েছে।');

        // ২. M3U প্লেলিস্ট ফরম্যাট
        let m3uContent = '#EXTM3U\n\n';
        m3uContent += `#EXTINF:-1 tvg-id="${channelId}" tvg-name="${channelName}" tvg-logo="${logoUrl}" group-title="${category}", ${channelName}\n`;
        m3uContent += `#EXTVLCOPT:http-user-agent=${requestHeaders['User-Agent']}\n`;
        m3uContent += `#EXTVLCOPT:http-referrer=${requestHeaders['Referer']}\n`;
        m3uContent += `#KODIPROP:inputstream.adaptive.manifest_headers=User-Agent=${encodeURIComponent(requestHeaders['User-Agent'])}&Referer=${encodeURIComponent(requestHeaders['Referer'])}\n`;
        m3uContent += `${streamUrl}\n`;

        fs.writeFileSync('playlist.m3u', m3uContent);
        console.log('playlist.m3u তৈরি সফল হয়েছে।');

    } catch (error) {
        console.error('Error generating playlists:', error);
        process.exit(1);
    }
}

generatePlaylists();
