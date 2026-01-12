const chromium = require("@sparticuz/chromium");
const puppeteer = require("puppeteer-core");

exports.handler = async (event, context) => {
  const targetUrl = event.queryStringParameters.url;
  
  if (!targetUrl) return { statusCode: 400, body: "Error: Missing URL parameter." };

  let browser = null;
  
  try {
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
      ignoreHTTPSErrors: true,
    });

    const page = await browser.newPage();
    
    // 🚀 OPTIMIZATION 1: RESOURCE BLOCKING (Hemat Bandwidth & Waktu)
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      if(['image', 'stylesheet', 'font', 'media'].includes(req.resourceType())){
        req.abort();
      } else {
        req.continue();
      }
    });

    // User-Agent Palsu
    await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36");
    
    // 🚀 OPTIMIZATION 2: RELAXED WAIT & TIMEOUT
    // Ganti 'networkidle2' ke 'domcontentloaded' supaya tidak menunggu tracking scripts
    await page.goto(targetUrl, { 
       waitUntil: "domcontentloaded",
       timeout: 20000 // 20 Detik (Aman untuk Netlify 26s Limit)
    });
    
    // Tambahan waktu sedikit untuk render JS framework (React/Vue hydration)
    await new Promise(r => setTimeout(r, 5000)); // Wajib tunggu 5 detik agar konten muncul

    const content = await page.evaluate(() => document.body.innerText);

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
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
