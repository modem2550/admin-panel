
async function testUserFetch() {
    try {
        const url = 'https://user.bnk48.io/user/839278/theater-playback/archive?skip=0&take=20';
        console.log(`Fetching ${url}...`);
        const res = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });
        console.log(`Status: ${res.status} ${res.statusText}`);
        const text = await res.text();
        try {
            const data = JSON.parse(text);
            console.log(JSON.stringify(data, null, 2));
        } catch (e) {
            console.log("Response text:", text.substring(0, 500));
        }
    } catch (e) {
        console.error("Fetch error:", e);
    }
}
testUserFetch();
