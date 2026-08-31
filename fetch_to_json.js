const fs = require('fs');

// আপনার প্রয়োজন মতো চ্যানেলের ID গুলো এই অ্যারেতে দিতে পারেন
const channelIds = [318, 319, 320, 321, 322, 323, 324, 325]; 

const requestHeaders = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': 'https://akashgo.com/',
    'Origin': 'https://akashgo.com',
    'Accept': 'application/json, text/plain, */*'
};

async function generateAllPlaylists() {
    const jsonList = [];
    let m3uContent = '#EXTM3U\n\n';

    for (const id of channelIds) {
        try {
            const apiUrl = `https://kong.akash-go.com/content-detail/pub/api/v6/channels/${id}`;
            const response = await fetch(apiUrl, { headers: requestHeaders });
            const resData = await response.json();

            const channelMeta = resData?.data?.channelMeta;

            if (channelMeta) {
                const channelName = channelMeta.channelName || channelMeta.name || `Channel ${id}`;
                const logoUrl = channelMeta.logo || "";
                const streamUrl = channelMeta.nonProtectedHlsConsumerUrl || channelMeta.protectedHlsConsumerUrl || "";
                const category = channelMeta.category || "Live TV";

                if (streamUrl) {
                    jsonList.push({
                        id: String(id),
                        name: channelName,
                        logo: logoUrl,
                        stream_url: streamUrl,
                        headers: {
                            "User-Agent": requestHeaders['User-Agent'],
                            "Referer": requestHeaders['Referer']
                        },
                        category: category
                    });

                    m3uContent += `#EXTINF:-1 tvg-id="${id}" tvg-name="${channelName}" tvg-logo="${logoUrl}" group-title="${category}", ${channelName}\n`;
                    m3uContent += `#EXTVLCOPT:http-user-agent=${requestHeaders['User-Agent']}\n`;
                    m3uContent += `#EXTVLCOPT:http-referrer=${requestHeaders['Referer']}\n`;
                    m3uContent += `${streamUrl}\n\n`;
                }
            }
        } catch (err) {
            console.log(`Failed to fetch channel ${id}`);
        }
    }

    fs.writeFileSync('playlist.json', JSON.stringify(jsonList, null, 2));
    fs.writeFileSync('playlist.m3u', m3uContent);
    console.log(`Successfully generated playlist for ${jsonList.length} channels.`);
}

generateAllPlaylists();
