const fs = require('fs');

// Akash Go-এর মূল চ্যানেল আইডিগুলোর তালিকা
const channelIds = [
    301, 302, 303, 304, 305, 306, 307, 308, 309, 310,
    311, 312, 313, 314, 315, 316, 317, 318, 319, 320,
    321, 322, 323, 324, 325, 326, 327, 328, 329, 330,
    331, 332, 333, 334, 335, 336, 337, 338, 339, 340
];

const requestHeaders = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': 'https://akashgo.com/',
    'Origin': 'https://akashgo.com'
};

async function generateAllPlaylists() {
    const jsonList = [];
    let m3uContent = '#EXTM3U\n\n';

    for (const id of channelIds) {
        try {
            const apiUrl = `https://kong.akash-go.com/content-detail/pub/api/v6/channels/${id}`;
            const response = await fetch(apiUrl, { headers: requestHeaders });
            
            if (!response.ok) continue;
            
            const resData = await response.json();
            const channelMeta = resData?.data?.channelMeta;

            if (channelMeta) {
                const channelName = channelMeta.channelName || channelMeta.name || `Channel ${id}`;
                const logoUrl = channelMeta.logo || "";
                
                // M3U8 স্ট্রিম লিঙ্ক (Non-Protected প্রথমে চেক করবে, না পেলে Protected নেবে)
                const streamUrl = channelMeta.nonProtectedHlsConsumerUrl || channelMeta.protectedHlsConsumerUrl || "";
                const category = channelMeta.category || "Live TV";

                if (streamUrl) {
                    jsonList.push({
                        id: String(id),
                        name: channelName,
                        logo: logoUrl,
                        stream_url: streamUrl,
                        headers: requestHeaders,
                        category: category
                    });

                    // IPTV Player & OTT Navigator এর জন্য সঠিক Format
                    m3uContent += `#EXTINF:-1 tvg-id="${id}" tvg-name="${channelName}" tvg-logo="${logoUrl}" group-title="${category}", ${channelName}\n`;
                    m3uContent += `#EXTVLCOPT:http-user-agent=${requestHeaders['User-Agent']}\n`;
                    m3uContent += `#EXTVLCOPT:http-referrer=${requestHeaders['Referer']}\n`;
                    m3uContent += `#KODIPROP:inputstream.adaptive.manifest_headers=User-Agent=${encodeURIComponent(requestHeaders['User-Agent'])}&Referer=${encodeURIComponent(requestHeaders['Referer'])}\n`;
                    m3uContent += `${streamUrl}\n\n`;
                }
            }
        } catch (err) {
            console.log(`Error fetching channel ID ${id}`);
        }
    }

    fs.writeFileSync('playlist.json', JSON.stringify(jsonList, null, 2));
    fs.writeFileSync('playlist.m3u', m3uContent);
    console.log(`মোট ${jsonList.length} টি চ্যানেলের প্লেলিস্ট সফলভাবে তৈরি হয়েছে।`);
}

generateAllPlaylists();
