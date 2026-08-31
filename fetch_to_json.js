const fs = require('fs');

// Akash Go API Endpoint
const channelApiUrl = 'https://kong.akash-go.com/content-detail/pub/api/v6/channels/318';

// প্রয়োজনীয় Request Headers (কুকি ও ইউজার এজেন্টসহ)
const requestHeaders = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': 'https://akashgo.com/',
    'Origin': 'https://akashgo.com',
    'Accept': 'application/json, text/plain, */*'
    // প্রয়োজন হলে এখানে আপনার বিশেষ Cookie যুক্ত করতে পারেন:
    // 'Cookie': 'your_session_cookie_here'
};

async function generatePlaylists() {
    try {
        const response = await fetch(channelApiUrl, { headers: requestHeaders });
        const data = await response.json();

        // API থেকে তথ্য সংগ্রহ
        const channel = data?.data || data;
        
        const channelId = channel.id || "318";
        const channelName = channel.title || channel.name || "Akash Go Channel 318";
        
        // লোগো URL বের করা (একাধিক ফিল্ড চেক করা হচ্ছে)
        const logoUrl = channel.boxArt || channel.logo || channel.poster || "https://akashgo.com/Json_images/favicon.ico";
        
        // স্ট্রিম বা প্লেলিঙ্ক
        const streamUrl = channel.streamUrl || channel.playUrl || channel.targetUrl || "";

        // ১. JSON প্লেলিস্ট গঠন (Header & Cookie Details সহ)
        const playlistJson = [
            {
                id: channelId,
                name: channelName,
                logo: logoUrl,
                stream_url: streamUrl,
                headers: {
                    "User-Agent": requestHeaders['User-Agent'],
                    "Referer": requestHeaders['Referer'],
                    "Cookie": requestHeaders['Cookie'] || ""
                },
                category: "Live TV"
            }
        ];

        fs.writeFileSync('playlist.json', JSON.stringify(playlistJson, null, 2));
        console.log('playlist.json তৈরি সফল হয়েছে।');

        // ২. M3U প্লেলিস্ট গঠন (Player-friendly KODI/IPTV Headers সহ)
        let m3uContent = '#EXTM3U\n\n';
        m3uContent += `#EXTINF:-1 tvg-id="${channelId}" tvg-name="${channelName}" tvg-logo="${logoUrl}" group-title="Live TV", ${channelName}\n`;
        
        // M3U-তে প্লেয়ারের জন্য Headers ও Cookie ট্যাগ যুক্তকরণ
        m3uContent += `#EXTVLCOPT:http-user-agent=${requestHeaders['User-Agent']}\n`;
        m3uContent += `#EXTVLCOPT:http-referrer=${requestHeaders['Referer']}\n`;
        if (requestHeaders['Cookie']) {
            m3uContent += `#EXTVLCOPT:http-cookie=${requestHeaders['Cookie']}\n`;
        }
        
        // KODI / TiviMate প্লেয়ার সমর্থিত Header ফরম্যাট (#KODIPROP)
        m3uContent += `#KODIPROP:inputstream.adaptive.manifest_headers=User-Agent=${encodeURIComponent(requestHeaders['User-Agent'])}&Referer=${encodeURIComponent(requestHeaders['Referer'])}\n`;
        
        m3uContent += `${streamUrl}\n`;

        fs.writeFileSync('playlist.m3u', m3uContent);
        console.log('playlist.m3u তৈরি সফল হয়েছে।');

    } catch (error) {
        console.error('Error occurred:', error);
        process.exit(1);
    }
}

generatePlaylists();
