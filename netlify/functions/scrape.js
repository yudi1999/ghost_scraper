const chromium = require("@sparticuz/chromium");
const puppeteer = require("puppeteer-core");

exports.handler = async (event, context) => {
  // 1. Ambil URL target dari parameter
  const targetUrl = event.queryStringParameters.url;
  
  if (!targetUrl) return { statusCode: 400, body: "Error: Missing URL parameter." };

  let browser = null;
  
  try {
    // 2. Luncurkan Browser Hantu (Headless Chrome)
    // Setup khusus untuk AWS Lambda / Netlify
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
      ignoreHTTPSErrors: true,
    });

    const page = await browser.newPage();
    
    // User-Agent Palsu (Biar dikira manusia biasa)
    await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36");
    
    // Tunggu sampai network idle (JS selesai loading)
    // Timeout 10 detik biar gak kelamaan (Netlify limit 10s di free tier)
    await page.goto(targetUrl, { 
       waitUntil: ["networkidle2"],
       timeout: 9000 
    });

    // 3. Maling Data (Ambil semua teks body)
    const content = await page.evaluate(() => document.body.innerText);

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ 
        status: "success", 
        url: targetUrl,
        length: content.length,
        data: content 
      })
    };

  } catch (error) {
    return { 
      statusCode: 500, 
      body: JSON.stringify({ 
        status: "error", 
        message: error.message 
      }) 
    };
  } finally {
    if (browser) await browser.close();
  }
};
