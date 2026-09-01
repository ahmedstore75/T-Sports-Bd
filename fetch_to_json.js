const fs = require('fs');

// বাংলা চ্যানেল অগ্রাধিকার তালিকায়
const BENGALI_KEYWORDS = [
    'somoy', 'jamuna', 'independent', 'dbc', 'ekattor', 'atn', 'channel i', 
    'ntv', 'rtv', 'bangla', 'bd', 'deepto', 'nagorik', 'btv', 'maasranga', 'channel 24'
];

async function generatePlaylists() {
    console.log("Fetching channels & individual dynamic cookies...");

    const rawChannels = [];

    for (let id = 100; id <= 410; id++) {
        try {
            const apiUrl = `https://kong.akash-go.com/content-detail/pub/api/v6/channels/${id}`;
            
            const response = await fetch(apiUrl, {
                method: 'GET',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Referer': 'https://akashgo.com/',
                    'Origin': 'https://akashgo.com',
                    'Accept': 'application/json, text/plain, */*',
                    'x-platform': 'web',
                    'x-device-id': 'browser_guest_device'
                }
            });

            if (!response.ok) continue;

            // ১. HTTP Header থেকে সরাসরি Dynamic Cookie সংগ্রহ
            let dynamicCookie = "";
            const setCookieHeader = response.headers.get('set-cookie');
            if (setCookieHeader) {
                dynamicCookie = setCookieHeader.split(';')[0];
            }

            const resData = await response.json();
            const channelMeta = resData?.data?.channelMeta;

            if (channelMeta && channelMeta.channelName) {
                const channelName = channelMeta.channelName.trim();
                const logoUrl = channelMeta.logo || "";
                const streamUrl = channelMeta.nonProtectedHlsConsumerUrl || channelMeta.protectedHlsConsumerUrl || "";
                const category = channelMeta.category || "News";

                // ২. API Body থেকে কুকি বা টোকেন ব্যাকআপ হিসেবে নেওয়া
                if (!dynamicCookie) {
                    if (channelMeta.cookie) {
                        dynamicCookie = channelMeta.cookie;
                    } else if (channelMeta.token) {
                        dynamicCookie = `Edge-Policy=${channelMeta.token}`;
                    } else if (channelMeta.edgeSignature) {
                        dynamicCookie = `Edge-Policy=${channelMeta.edgePolicy};Edge-Signature=${channelMeta.edgeSignature}`;
                    }
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
            // আইডি স্কিপ
        }
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

    // বাংলা চ্যানেল উপরে সর্ট করা
    uniqueChannels.sort((a, b) => {
        const aIsBengali = BENGALI_KEYWORDS.some(key => a.name.toLowerCase().includes(key)) || a.category.toLowerCase().includes('bangla');
        const bIsBengali = BENGALI_KEYWORDS.some(key => b.name.toLowerCase().includes(key)) || b.category.toLowerCase().includes('bangla');

        if (aIsBengali && !bIsBengali) return -1;
        if (!aIsBengali && bIsBengali) return 1;
        return a.name.localeCompare(b.name);
    });

    // M3U প্লেলিস্ট জেনারেট
    let m3uContent = '#EXTM3U\n\n';
    uniqueChannels.forEach(ch => {
        m3uContent += `#EXTINF:-1 tvg-logo="${ch.logo}" group-title="${ch.category}",${ch.name}\n`;
        m3uContent += `#EXTHTTP:{"cookie":"${ch.cookie}"}\n`;
        m3uContent += `${ch.stream_url}\n\n`;
    });
    fs.writeFileSync('playlist.m3u', m3uContent);

    // JSON প্লেলিস্ট জেনারেট (ঠিক আপনার স্ক্রিনশটের স্ট্রাকচার)
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
    console.log(`সফলভাবে ${uniqueChannels.length}টি চ্যানেলের ইউনিক কুকিসহ JSON এবং M3U সেভ করা হয়েছে!`);
}

generatePlaylists();
