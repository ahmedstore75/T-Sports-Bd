const fs = require('fs');

const requestHeaders = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': 'https://akashgo.com/',
    'Origin': 'https://akashgo.com'
    // যদি আপনার সেশন কুকি থাকে, তবে নিচে যোগ করুন:
    // 'Cookie': 'YOUR_SESSION_COOKIE_HERE'
};

async function generateAllPlaylists() {
    const jsonList = [];
    let m3uContent = '#EXTM3U\n\n';

    console.log("Fetching channels...");

    // ১০০ থেকে ৪১০ আইডি পর্যন্ত স্ক্যান করা হচ্ছে
    for (let id = 100; id <= 410; id++) {
        try {
            const apiUrl = `https://kong.akash-go.com/content-detail/pub/api/v6/channels/${id}`;
            const response = await fetch(apiUrl, { headers: requestHeaders });
            
            if (!response.ok) continue;

            const resData = await response.json();
            const channelMeta = resData?.data?.channelMeta;

            if (channelMeta && channelMeta.channelName) {
                const channelName = channelMeta.channelName;
                const logoUrl = channelMeta.logo || "";
                
                // M3U8 URL (nonProtected অথবা protected)
                const streamUrl = channelMeta.nonProtectedHlsConsumerUrl || channelMeta.protectedHlsConsumerUrl || "";
                const category = channelMeta.category || "Live TV";

                if (streamUrl) {
                    jsonList.push({
                        id: String(id),
                        name: channelName,
                        logo: logoUrl,
                        stream_url: streamUrl,
                        category: category
                    });

                    m3uContent += `#EXTINF:-1 tvg-id="${id}" tvg-name="${channelName}" tvg-logo="${logoUrl}" group-title="${category}", ${channelName}\n`;
                    m3uContent += `#EXTVLCOPT:http-user-agent=${requestHeaders['User-Agent']}\n`;
                    m3uContent += `#EXTVLCOPT:http-referrer=${requestHeaders['Referer']}\n`;
                    m3uContent += `${streamUrl}\n\n`;
                }
            }
        } catch (err) {
            // চ্যানেল না পেলে স্কিপ করবে
        }
    }

    fs.writeFileSync('playlist.json', JSON.stringify(jsonList, null, 2));
    fs.writeFileSync('playlist.m3u', m3uContent);
    console.log(`মোট ${jsonList.length} টি চ্যানেলের প্লেলিস্ট তৈরি সম্পন্ন!`);
}

generateAllPlaylists();
