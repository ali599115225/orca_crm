module.exports = {
  site: 'https://orca.az-ez.pro',
  hooks: {
    async 'puppeteer:before-goto'(page) {
      try {
        const currentUrl = page.url();
        if (!currentUrl.includes('/login')) {
          await page.goto('https://orca.az-ez.pro/login', { waitUntil: 'domcontentloaded', timeout: 30000 });
        }
        await page.waitForSelector('input', { timeout: 15000 });

        await page.evaluate(() => {
          const emailInput = document.querySelector('input[type="email"]') || document.querySelector('input[name="email"]') || document.querySelector('input');
          if (emailInput) { emailInput.value = 'admin@dar-al-amar.com'; emailInput.dispatchEvent(new Event('input', { bubbles: true })); }
        });

        await page.evaluate(() => {
          const passwordInput = document.querySelector('input[type="password"]') || document.querySelector('input[name="password"]') || document.querySelectorAll('input')[1];
          if (passwordInput) { passwordInput.value = 'Orca@Secure2026!'; passwordInput.dispatchEvent(new Event('input', { bubbles: true })); }
        });

        const submitButton = await page.$('button[type="submit"]') || await page.$('button');
        if (submitButton) await submitButton.click();

        await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 15000 }).catch(() => {});
        await new Promise(r => setTimeout(r, 3000));
      } catch (e) {
        console.error('[unlighthouse:hook] Login attempt failed, continuing with public pages:', e.message);
      }
    }
  }
}
