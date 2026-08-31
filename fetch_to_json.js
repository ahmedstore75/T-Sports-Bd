const fs = require('fs');

// অল-লাইভ চ্যানেল লিস্টের API লিঙ্ক
const allChannelsApi = 'https://kong.akash-go.com/search-connector/pub/freemium/search/livedata?limit=100';

const requestHeaders = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': 'https://akashgo.com/',
    'Origin': 'https://akashgo.com',
    'Accept': 'application/json, text/plain, */*'
};

async function generatePlaylists() {
    try {
        const response = await fetch(allChannelsApi, { headers: requestHeaders });
        const resData = await response.json();

        // API এর অ্যারে বা অবজেক্ট স্ট্রাকচার ফিল্টার
        const channelsList = resData?.data?.items || resData?.data || resData?.items || [];

        if (!Array.isArray(channelsList) || channelsList.length === 0) {
            console.log("No channels found or API format changed.");
            return;
        }

        const jsonList = [];
        let m3uContent = '#EXTM3U\n\n';

        channelsList.forEach((ch) => {
            const id = ch.id || ch.contentId || "";
            const name = ch.title || ch.name || "Unknown Channel";
            
            // লোগো ইউআরএল এক্সট্র্যাক্ট করা
            const logo = ch.boxArt || ch.logo || ch.image || ch.poster || "https://akashgo.com/Json_images/favicon.ico";
            
            // স্ট্রিম প্লেলিঙ্ক এক্সট্র্যাক্ট
            const streamUrl = ch.streamUrl || ch.playUrl || ch.targetUrl || ch.url || "";
            const category = ch.genre || ch.category || "Live TV";

            // JSON আইটেম তৈরি
            jsonList.push({
                id: String(id),
                name: name,
                logo: logo,
                stream_url: streamUrl,
                headers: {
                    "User-Agent": requestHeaders['User-Agent'],
                    "Referer": requestHeaders['Referer']
                },
                category: category
            });

            // M3U ফরম্যাট তৈরি
            m3uContent += `#EXTINF:-1 tvg-id="${id}" tvg-name="${name}" tvg-logo="${logo}" group-title="${category}", ${name}\n`;
            m3uContent += `#EXTVLCOPT:http-user-agent=${requestHeaders['User-Agent']}\n`;
            m3uContent += `#EXTVLCOPT:http-referrer=${requestHeaders['Referer']}\n`;
            m3uContent += `#KODIPROP:inputstream.adaptive.manifest_headers=User-Agent=${encodeURIComponent(requestHeaders['User-Agent'])}&Referer=${encodeURIComponent(requestHeaders['Referer'])}\n`;
            m3uContent += `${streamUrl}\n\n`;
        });

        // ফাইল রাইট
        fs.writeFileSync('playlist.json', JSON.stringify(jsonList, null, 2));
        fs.writeFileSync('playlist.m3u', m3uContent);

        console.log(`সফলভাবে ${jsonList.length} টি চ্যানেলের প্লেলিস্ট তৈরি হয়েছে!`);

    } catch (error) {
        console.error('Error fetching playlist:', error);
        process.exit(1);
    }
}

generatePlaylists();
