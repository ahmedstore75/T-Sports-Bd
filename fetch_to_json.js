const fs = require('fs');

// বাংলা চ্যানেল অগ্রাধিকার দেওয়ার তালিকা
const BENGALI_KEYWORDS = [
    'somoy', 'jamuna', 'independent', 'dbc', 'ekattor', 'atn', 'channel i', 
    'ntv', 'rtv', 'bangla', 'bd', 'deepto', 'nagorik', 'btv', 'maasranga', 'channel 24'
];

// ডায়নামিক কুকি বের করার ফাংশন
function extractCookieFromResponse(response, channelMeta) {
    // ১. API মেটাডেটার ভেতরের কুকি
    if (channelMeta?.cookie) return channelMeta.cookie;
    if (channelMeta?.token) return `Edge-Policy=${channelMeta.token}`;

    // ২. HTTP Response Header এর Set-Cookie
    const setCookie = response.headers.get('set-cookie');
    if (setCookie) {
        return setCookie.split(';')[0];
    }

    // ৩. ডিফল্ট ফলব্যাক কুকি ফরম্যাট
    return "Edge-Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly9vd3Jjb3ZjcnB5LmdwY2RuLm5ldC9icGstdHYvKiIsIkNvbmRpdGlvbiI6eyJEYXRlTGVzc1RoYW4iOnsiRWRnZVRpbWUiOjE3ODgyNTMyMzd9fX1dfQ;Edge-Signature=V3G6GBiA2N6wlM8aLqfdsv1kOW8Z1pxEZgL9GwEuiIs";
}

async function generatePlaylists() {
    console.log("Fetching channels and generating playlists...");

    const rawChannels = [];

    // ১০০ থেকে ৪১০ চ্যানেল আইডি পর্যন্ত তথ্য সংগ্রহ
    for (let id = 100; id <= 410; id++) {
        try {
            const apiUrl = `https://kong.akash-go.com/content-detail/pub/api/v6/channels/${id}`;
            const response = await fetch(apiUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Referer': 'https://akashgo.com/',
                    'Origin': 'https://akashgo.com',
                    'Accept': 'application/json, text/plain, */*'
                }
            });

            if (!response.ok) continue;

            const resData = await response.json();
            const channelMeta = resData?.data?.channelMeta;

            if (channelMeta && channelMeta.channelName) {
                const channelName = channelMeta.channelName.trim();
                const logoUrl = channelMeta.logo || "";
                const streamUrl = channelMeta.nonProtectedHlsConsumerUrl || channelMeta.protectedHlsConsumerUrl || "";
                const category = channelMeta.category || "News";

                const dynamicCookie = extractCookieFromResponse(response, channelMeta);

                if (streamUrl) {
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

    // ডুপ্লিকেট চ্যানেল রিমুভ করা
    const uniqueChannels = [];
    const seenNames = new Set();

    for (const ch of rawChannels) {
        const lowerName = ch.name.toLowerCase();
        if (!seenNames.has(lowerName)) {
            seenNames.add(lowerName);
            uniqueChannels.push(ch);
        }
    }

    // বাংলা চ্যানেলগুলোকে তালিকায় সবার উপরে নিয়ে আসা
    uniqueChannels.sort((a, b) => {
        const aIsBengali = BENGALI_KEYWORDS.some(key => a.name.toLowerCase().includes(key)) || a.category.toLowerCase().includes('bangla');
        const bIsBengali = BENGALI_KEYWORDS.some(key => b.name.toLowerCase().includes(key)) || b.category.toLowerCase().includes('bangla');

        if (aIsBengali && !bIsBengali) return -1;
        if (!aIsBengali && bIsBengali) return 1;
        return a.name.localeCompare(b.name);
    });

    // ১. M3U প্লেলিস্ট সেভ করা
    let m3uContent = '#EXTM3U\n\n';
    uniqueChannels.forEach(ch => {
        m3uContent += `#EXTINF:-1 tvg-logo="${ch.logo}" group-title="${ch.category}",${ch.name}\n`;
        m3uContent += `#EXTHTTP:{"cookie":"${ch.cookie}"}\n`;
        m3uContent += `${ch.stream_url}\n\n`;
    });

    fs.writeFileSync('playlist.m3u', m3uContent);
    console.log('playlist.m3u তৈরি সফল হয়েছে!');

    // ২. JSON প্লেলিস্ট ঠিক স্ক্রিনশটের স্ট্রাকচারে সেভ করা
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
    console.log('playlist.json তৈরি সফল হয়েছে!');
}

generatePlaylists();
