const fs = require('fs');

const BENGALI_KEYWORDS = [
    'somoy', 'jamuna', 'independent', 'dbc', 'ekattor', 'atn', 'channel i', 
    'ntv', 'rtv', 'bangla', 'bd', 'deepto', 'nagorik', 'btv', 'maasranga', 'channel 24'
];

async function generatePlaylists() {
    console.log("Fetching individual channel signatures & cookies...");

    const rawChannels = [];

    for (let id = 100; id <= 410; id++) {
        try {
            const apiUrl = `https://kong.akash-go.com/content-detail/pub/api/v6/channels/${id}`;
            
            const response = await fetch(apiUrl, {
                method: 'GET',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0 Safari/537.36',
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
                const category = channelMeta.category || "General";

                // --- প্রতিটি চ্যানেলের জন্য পৃথক Edge Signature ও Policy বের করার লজিক ---
                let channelCookie = "";

                // ১. চেক: API Response-এর Set-Cookie হেডার
                const setCookieHeader = response.headers.get('set-cookie');
                if (setCookieHeader && setCookieHeader.includes('Edge-Signature')) {
                    channelCookie = setCookieHeader.split(';')[0];
                }

                // ২. চেক: মেটাডেটার ভেতরের edgePolicy এবং edgeSignature
                if (!channelCookie && channelMeta.edgePolicy && channelMeta.edgeSignature) {
                    channelCookie = `Edge-Policy=${channelMeta.edgePolicy};Edge-Signature=${channelMeta.edgeSignature}`;
                }

                // ৩. চেক: মেটাডেটার সরাসরি 'cookie' ফিল্ড
                if (!channelCookie && channelMeta.cookie) {
                    channelCookie = channelMeta.cookie;
                }

                // ৪. চেক: 'token' ফিল্ডে সম্পূর্ণ Edge-Policy আছে কিনা
                if (!channelCookie && channelMeta.token) {
                    if (channelMeta.token.startsWith('Edge-Policy=')) {
                        channelCookie = channelMeta.token;
                    } else {
                        channelCookie = `Edge-Policy=${channelMeta.token}`;
                    }
                }

                // যদি নির্দিষ্ট চ্যানেলের ইউনিক কুকি পাওয়া যায় তবেই কেবল যুক্ত করা হবে
                if (streamUrl && channelCookie) {
                    rawChannels.push({
                        name: channelName,
                        logo: logoUrl,
                        stream_url: streamUrl,
                        cookie: channelCookie,
                        category: category
                    });
                }
            }
        } catch (err) {
            // স্কিপ আইডি
        }
    }

    if (rawChannels.length === 0) {
        console.error("No valid channels with signatures found!");
        return;
    }

    // ডুপ্লিকেট ফিল্টার
    const uniqueChannels = [];
    const seenNames = new Set();

    for (const ch of rawChannels) {
        const lowerName = ch.name.toLowerCase();
        if (!seenNames.has(lowerName)) {
            seenNames.add(lowerName);
            uniqueChannels.push(ch);
        }
    }

    // বাংলা চ্যানেল উপরে সর্ট
    uniqueChannels.sort((a, b) => {
        const aIsBengali = BENGALI_KEYWORDS.some(key => a.name.toLowerCase().includes(key));
        const bIsBengali = BENGALI_KEYWORDS.some(key => b.name.toLowerCase().includes(key));
        if (aIsBengali && !bIsBengali) return -1;
        if (!aIsBengali && bIsBengali) return 1;
        return a.name.localeCompare(b.name);
    });

    // M3U ফাইল তৈরি (প্রত্যেক চ্যানেলের নির্দিষ্ট কুকি ও সিগনেচারসহ)
    let m3uContent = '#EXTM3U\n\n';
    const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0 Safari/537.36';

    uniqueChannels.forEach(ch => {
        m3uContent += `#EXTINF:-1 tvg-logo="${ch.logo}" group-title="${ch.category}",${ch.name}\n`;
        m3uContent += `#EXTVLCOPT:http-user-agent=${ua}\n`;
        m3uContent += `#EXTVLCOPT:http-cookie=${ch.cookie}\n`;
        m3uContent += `#EXTHTTP:{"cookie":"${ch.cookie}"}\n`;
        m3uContent += `${ch.stream_url}\n\n`;
    });

    fs.writeFileSync('playlist.m3u', m3uContent);

    // JSON ফাইল তৈরি
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
    console.log(`সফলভাবে ${uniqueChannels.length}টি চ্যানেলের নিজস্ব Edge Signature ও Cookie সহ প্লেলিস্ট সেভ হয়েছে!`);
}

generatePlaylists();
