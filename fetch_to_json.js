const fs = require('fs');

const BENGALI_KEYWORDS = [
    'somoy', 'jamuna', 'independent', 'dbc', 'ekattor', 'atn', 'channel i', 
    'ntv', 'rtv', 'bangla', 'bd', 'deepto', 'nagorik', 'btv', 'maasranga', 'channel 24'
];

async function generatePlaylists() {
    console.log("Fetching channels and updating play-headers...");

    const rawChannels = [];

    for (let id = 100; id <= 410; id++) {
        try {
            const apiUrl = `https://kong.akash-go.com/content-detail/pub/api/v6/channels/${id}`;
            
            const response = await fetch(apiUrl, {
                method: 'GET',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'application/json, text/plain, */*',
                    'Origin': 'https://akashgo.com',
                    'Referer': 'https://akashgo.com/',
                    'x-platform': 'web'
                }
            });

            if (!response.ok) continue;

            const resData = await response.json();
            const channelMeta = resData?.data?.channelMeta;

            if (channelMeta && (channelMeta.channelName || channelMeta.name)) {
                const channelName = (channelMeta.channelName || channelMeta.name).trim();
                const logoUrl = channelMeta.logo || "";
                const streamUrl = channelMeta.nonProtectedHlsConsumerUrl || channelMeta.protectedHlsConsumerUrl || "";
                const category = channelMeta.category || "News";

                let dynamicCookie = "";
                const setCookieHeader = response.headers.get('set-cookie');
                if (setCookieHeader) {
                    dynamicCookie = setCookieHeader.split(';')[0];
                }

                if (!dynamicCookie && channelMeta.cookie) {
                    dynamicCookie = channelMeta.cookie;
                }

                if (streamUrl && dynamicCookie) {
                    rawChannels.push({
                        name: channelName,
                        logo: logoUrl,
                        stream_url: streamUrl,
                        cookie: dynamicCookie,
                        category: category
                    });
                }
            }
        } catch (err) {
            // স্কিপ
        }
    }

    if (rawChannels.length === 0) {
        console.error("No channels fetched!");
        return;
    }

    // ডুপ্লিকেট বাদ দেওয়া
    const uniqueChannels = [];
    const seenNames = new Set();

    for (const ch of rawChannels) {
        const lowerName = ch.name.toLowerCase();
        if (!seenNames.has(lowerName)) {
            seenNames.add(lowerName);
            uniqueChannels.push(ch);
        }
    }

    // বাংলা চ্যানেল উপরে রাখা
    uniqueChannels.sort((a, b) => {
        const aIsBengali = BENGALI_KEYWORDS.some(key => a.name.toLowerCase().includes(key));
        const bIsBengali = BENGALI_KEYWORDS.some(key => b.name.toLowerCase().includes(key));
        if (aIsBengali && !bIsBengali) return -1;
        if (!aIsBengali && bIsBengali) return 1;
        return a.name.localeCompare(b.name);
    });

    // M3U প্লেলিস্ট (Headers সহ)
    let m3uContent = '#EXTM3U\n\n';
    const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36';
    const ref = 'https://akashgo.com/';

    uniqueChannels.forEach(ch => {
        m3uContent += `#EXTINF:-1 tvg-logo="${ch.logo}" group-title="${ch.category}",${ch.name}\n`;
        // VLC / TiviMate / OTT Navigator সাপোর্টেড হেডার
        m3uContent += `#EXTVLCOPT:http-user-agent=${ua}\n`;
        m3uContent += `#EXTVLCOPT:http-referrer=${ref}\n`;
        m3uContent += `#EXTVLCOPT:http-cookie=${ch.cookie}\n`;
        // স্ট্রিমিং ইউআরএল-এর সাথে সরাসরি ক্যোয়ারি প্যারামিটার হেডার বাইন্ডিং
        m3uContent += `${ch.stream_url}|User-Agent=${encodeURIComponent(ua)}&Referer=${encodeURIComponent(ref)}&Cookie=${encodeURIComponent(ch.cookie)}\n\n`;
    });

    fs.writeFileSync('playlist.m3u', m3uContent);

    // JSON প্লেলিস্ট
    const today = new Date().toISOString().split('T')[0];
    const jsonStructure = {
        status: "success",
        name: "Live Channels",
        owner: "Ahammad Ali",
        channels_amount: uniqueChannels.length,
        last_update: today,
        response: uniqueChannels.map((ch, index) => ({
            id: index + 1,
            name: ch.name,
            logo: ch.logo,
            stream_url: ch.stream_url,
            cookie: ch.cookie,
            headers: {
                "User-Agent": ua,
                "Referer": ref,
                "Cookie": ch.cookie
            }
        }))
    };

    fs.writeFileSync('playlist.json', JSON.stringify(jsonStructure, null, 2));
    console.log(`সফলভাবে ${uniqueChannels.length}টি চ্যানেলের স্ট্রিমিং হেডার আপডেট করা হয়েছে।`);
}

generatePlaylists();
