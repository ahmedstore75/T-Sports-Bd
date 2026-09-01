const fs = require('fs');

// বাংলাদেশি/বাংলা চ্যানেল চিহ্নিত করার কি-ওয়ার্ড
const BENGALI_KEYWORDS = ['somoy', 'jamuna', 'independent', 'dbc', 'ekattor', 'atn', 'channel i', 'ntv', 'rtv', 'bangla', 'bd', 'deepto', 'nagorik', 'somoy tv'];

const requestHeaders = {
    'User-Agent': 'okhttp/5.1.0',
    'Accept-Encoding': 'gzip'
};

async function generatePlaylists() {
    console.log("Fetching channel data...");

    const rawChannels = [];

    // ১০০ থেকে ৪১০ চ্যানেল আইডি পর্যন্ত তথ্য সংগ্রহ
    for (let id = 100; id <= 410; id++) {
        try {
            const apiUrl = `https://kong.akash-go.com/content-detail/pub/api/v6/channels/${id}`;
            const response = await fetch(apiUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Referer': 'https://akashgo.com/',
                    'Origin': 'https://akashgo.com'
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

                // API থেকে পাওয়া বা এক্সট্র্যাক্ট করা Edge-Policy কুকি (প্রয়োজন অনুযায়ী অ্যাডজাস্ট করুন)
                const dynamicCookie = channelMeta.cookie || "Edge-Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly9vd3Jjb3ZjcnB5LmdwY2RuLm5ldC9icGstdHYvKiIsIkNvbmRpdGlvbiI6eyJEYXRlTGVzc1RoYW4iOnsiRWRnZVRpbWUiOjE3ODgyNTMyMzd9fX1dfQ;Edge-Signature=V3G6GBiA2N6wlM8aLqfdsv1kOW8Z1pxEZgL9GwEuiIs";

                if (streamUrl) {
                    let hostName = "owrcovcrpy.gpcdn.net";
                    try {
                        hostName = new URL(streamUrl).hostname;
                    } catch (e) {}

                    rawChannels.push({
                        id: String(id),
                        name: channelName,
                        logo: logoUrl,
                        stream_url: streamUrl,
                        category: category,
                        cookie: dynamicCookie,
                        host: hostName
                    });
                }
            }
        } catch (err) {
            // স্কিপ আইডি
        }
    }

    // ডুপ্লিকেট চ্যানেল বাদ দেওয়া
    const uniqueChannels = [];
    const seenNames = new Set();

    for (const ch of rawChannels) {
        const lowerName = ch.name.toLowerCase();
        if (!seenNames.has(lowerName)) {
            seenNames.add(lowerName);
            uniqueChannels.push(ch);
        }
    }

    // বাংলা চ্যানেলগুলোকে সবার উপরে সর্ট করা
    uniqueChannels.sort((a, b) => {
        const aIsBengali = BENGALI_KEYWORDS.some(key => a.name.toLowerCase().includes(key)) || a.category.toLowerCase().includes('bangla');
        const bIsBengali = BENGALI_KEYWORDS.some(key => b.name.toLowerCase().includes(key)) || b.category.toLowerCase().includes('bangla');

        if (aIsBengali && !bIsBengali) return -1;
        if (!aIsBengali && bIsBengali) return 1;
        return a.name.localeCompare(b.name);
    });

    // ১. M3U প্লেলিস্ট জেনারেট করা
    let m3uContent = '#EXTM3U\n\n';
    uniqueChannels.forEach(ch => {
        m3uContent += `#EXTINF:-1 tvg-logo="${ch.logo}" group-title="${ch.category}",${ch.name}\n`;
        m3uContent += `#EXTHTTP:{"cookie":"${ch.cookie}"}\n`;
        m3uContent += `${ch.stream_url}\n\n`;
    });

    fs.writeFileSync('playlist.m3u', m3uContent);
    console.log('playlist.m3u সফলভাবে তৈরি হয়েছে!');

    // ২. জেসন প্লেলিস্ট জেনারেট করা (স্ক্রিনশটের ফরম্যাট অনুযায়ী)
    const today = new Date().toISOString().split('T')[0];
    const jsonStructure = {
        status: "success",
        name: "Akash Go Live Channels",
        owner: "Ahammad Ali",
        channels_amount: uniqueChannels.length,
        last_update: today,
        response: uniqueChannels.map(ch => ({
            category_name: ch.category,
            name: ch.name,
            link: ch.stream_url,
            headers: {
                Host: ch.host,
                cookie: ch.cookie,
                "user-agent": requestHeaders['User-Agent'],
                "client-api-header": "null",
                "accept-encoding": requestHeaders['Accept-Encoding']
            },
            logo: ch.logo
        }))
    };

    fs.writeFileSync('playlist.json', JSON.stringify(jsonStructure, null, 2));
    console.log('playlist.json সফলভাবে তৈরি হয়েছে!');
}

generatePlaylists();
