const fs = require('fs');

// Akash Go-এর মূল রিকোয়েস্ট হেডার্স
// আপনার কাছে আসল অ্যাকাউন্ট বা সেশনের Cookie থাকলে নিচে 'Cookie' ফিল্ডে বসিয়ে দিতে পারেন
const requestHeaders = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': 'https://akashgo.com/',
    'Origin': 'https://akashgo.com',
    'Accept': 'application/json, text/plain, */*',
    'Cookie': 'session_id=akash_go_user_session; auth_token=sample_token' // এখানে প্রয়োজন অনুযায়ী আপনার কুকি বসান
};

async function generateAllPlaylists() {
    const jsonList = [];
    let m3uContent = '#EXTM3U\n\n';
    
    // ডুপ্লিকেট চ্যানেল ফিল্টার করার জন্য Set
    const processedChannelNames = new Set();

    console.log("Fetching channels and removing duplicates...");

    for (let id = 100; id <= 410; id++) {
        try {
            const apiUrl = `https://kong.akash-go.com/content-detail/pub/api/v6/channels/${id}`;
            const response = await fetch(apiUrl, { headers: requestHeaders });
            
            if (!response.ok) continue;

            const resData = await response.json();
            const channelMeta = resData?.data?.channelMeta;

            if (channelMeta && channelMeta.channelName) {
                const channelName = channelMeta.channelName.trim();
                
                // যদি এই নামের চ্যানেল আগে থেকেই থেকে থাকে, তবে স্কিপ করবে (ডাবল হবে না)
                if (processedChannelNames.has(channelName.toLowerCase())) {
                    continue;
                }

                const logoUrl = channelMeta.logo || "";
                const streamUrl = channelMeta.nonProtectedHlsConsumerUrl || channelMeta.protectedHlsConsumerUrl || "";
                const category = channelMeta.category || "Live TV";

                if (streamUrl) {
                    // চ্যানেলের নাম সেভ করে রাখা হচ্ছে যাতে ডাবল না আসে
                    processedChannelNames.add(channelName.toLowerCase());

                    // ১. JSON অবজেক্টে কুকিসহ হেডার যুক্তকরণ
                    jsonList.push({
                        id: String(id),
                        name: channelName,
                        logo: logoUrl,
                        stream_url: streamUrl,
                        headers: {
                            "User-Agent": requestHeaders['User-Agent'],
                            "Referer": requestHeaders['Referer'],
                            "Origin": requestHeaders['Origin'],
                            "Cookie": requestHeaders['Cookie']
                        },
                        category: category
                    });

                    // ২. M3U প্লেলিস্টে হেডার্স ও কুকি যুক্তকরণ
                    m3uContent += `#EXTINF:-1 tvg-id="${id}" tvg-name="${channelName}" tvg-logo="${logoUrl}" group-title="${category}", ${channelName}\n`;
                    m3uContent += `#EXTVLCOPT:http-user-agent=${requestHeaders['User-Agent']}\n`;
                    m3uContent += `#EXTVLCOPT:http-referrer=${requestHeaders['Referer']}\n`;
                    if (requestHeaders['Cookie']) {
                        m3uContent += `#EXTVLCOPT:http-cookie=${requestHeaders['Cookie']}\n`;
                    }
                    m3uContent += `#KODIPROP:inputstream.adaptive.manifest_headers=User-Agent=${encodeURIComponent(requestHeaders['User-Agent'])}&Referer=${encodeURIComponent(requestHeaders['Referer'])}&Cookie=${encodeURIComponent(requestHeaders['Cookie'])}\n`;
                    m3uContent += `${streamUrl}\n\n`;
                }
            }
        } catch (err) {
            // চ্যানেল না পেলে স্কিপ করবে
        }
    }

    fs.writeFileSync('playlist.json', JSON.stringify(jsonList, null, 2));
    fs.writeFileSync('playlist.m3u', m3uContent);
    console.log(`ডুপ্লিকেট ছাড়া মোট ${jsonList.length} টি অনন্য চ্যানেল সফলভাবে তৈরি হয়েছে!`);
}

generateAllPlaylists();
