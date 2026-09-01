const fs = require('fs');

const BENGALI_KEYWORDS = [
    'somoy', 'jamuna', 'independent', 'dbc', 'ekattor', 'atn', 'channel i', 
    'ntv', 'rtv', 'bangla', 'bd', 'deepto', 'nagorik', 'btv', 'maasranga', 'channel 24'
];

const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'okhttp/5.1.0'
];

function getRandomUserAgent() {
    return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

async function generatePlaylists() {
    console.log("Fetching channels and dynamic cookies for all network players...");

    const rawChannels = [];

    for (let id = 100; id <= 410; id++) {
        try {
            const apiUrl = `https://kong.akash-go.com/content-detail/pub/api/v6/channels/${id}`;
            
            const response = await fetch(apiUrl, {
                method: 'GET',
                headers: {
                    'User-Agent': getRandomUserAgent(),
                    'Accept': 'application/json, text/plain, */*',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Origin': 'https://akashgo.com',
                    'Referer': 'https://akashgo.com/',
                    'x-platform': 'web',
                    'x-app-version': '1.0.0',
                    'x-device-id': `web_${Math.random().toString(36).substring(2, 10)}`
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

                if (!dynamicCookie) {
                    if (channelMeta.cookie) {
                        dynamicCookie = channelMeta.cookie;
                    } else if (channelMeta.token) {
                        dynamicCookie = `Edge-Policy=${channelMeta.token}`;
                    } else if (channelMeta.edgeSignature) {
                        dynamicCookie = `Edge-Policy=${channelMeta.edgePolicy};Edge-Signature=${channelMeta.edgeSignature}`;
                    }
                }

                if (streamUrl) {
                    rawChannels.push({
                        name: channelName,
                        logo: logoUrl,
                        stream_url: streamUrl,
                        cookie: dynamicCookie || "Edge-Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly9vd3Jjb3ZjcnB5LmdwY2RuLm5ldC9icGstdHYvKiIsIkNvbmRpdGlvbiI6eyJEYXRlTGVzc1RoYW4iOnsiRWRnZVRpbWUiOjE3ODgyNTMyMzd9fX1dfQ;Edge-Signature=V3G6GBiA2N6wlM8aLqfdsv1kOW8Z1pxEZgL9GwEuiIs",
                        category: category
                    });
                }
            }
        } catch (err) {
            // স্কিপ
        }
    }

    if (rawChannels.length === 0) {
        console.error("No channels fetched! Skipping file write to prevent saving empty list.");
        return;
    }

    // ডুপ্লিকেট রিমুভ
    const uniqueChannels = [];
    const seenNames = new Set();

    for (const ch of rawChannels) {
        const lowerName = ch.name.toLowerCase();
        if (!seenNames.has(lowerName)) {
            seenNames.add(lowerName);
            uniqueChannels.push(ch);
        }
    }

    // বাংলা চ্যানেল সবার উপরে সর্ট
    uniqueChannels.sort((a, b) => {
        const aIsBengali = BENGALI_KEYWORDS.some(key => a.name.toLowerCase().includes(key)) || a.category.toLowerCase().includes('bangla');
        const bIsBengali = BENGALI_KEYWORDS.some(key => b.name.toLowerCase().includes(key)) || b.category.toLowerCase().includes('bangla');

        if (aIsBengali && !bIsBengali) return -1;
        if (!aIsBengali && bIsBengali) return 1;
        return a.name.localeCompare(b.name);
    });

    // ১. ইউনিভার্সাল M3U প্লেলিস্ট (সব ধরণের অ্যান্ড্রয়েড/স্মার্ট টিভি অ্যাপ সাপোর্ট করার জন্য)
    let m3uContent = '#EXTM3U\n\n';
    uniqueChannels.forEach(ch => {
        const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
        
        m3uContent += `#EXTINF:-1 tvg-logo="${ch.logo}" group-title="${ch.category}",${ch.name}\n`;
        // VLC / TiviMate / OTT Navigator স্ট্যান্ডার্ড হেডার
        m3uContent += `#EXTVLCOPT:http-user-agent=${ua}\n`;
        m3uContent += `#EXTVLCOPT:http-cookie=${ch.cookie}\n`;
        // সাধারণ অ্যাপগুলোর জন্য
        m3uContent += `#EXTHTTP:{"cookie":"${ch.cookie}", "User-Agent":"${ua}"}\n`;
        m3uContent += `${ch.stream_url}\n\n`;
    });
    fs.writeFileSync('playlist.m3u', m3uContent);

    // ২. JSON প্লেলিস্ট
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
            cookie: ch.cookie
        }))
    };

    fs.writeFileSync('playlist.json', JSON.stringify(jsonStructure, null, 2));
    console.log(`সফলভাবে ${uniqueChannels.length}টি চ্যানেল নেটওয়ার্ক প্লেয়ারের উপযোগী প্লেলিস্টে সেভ করা হয়েছে!`);
}

generatePlaylists();
