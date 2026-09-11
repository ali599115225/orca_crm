const loginEmail = process.env.UNLIGHTHOUSE_LOGIN_EMAIL;
const loginPassword = process.env.UNLIGHTHOUSE_LOGIN_PASSWORD;

module.exports = {
  site: 'https://orca.az-ez.pro',
  hooks: {
    async 'puppeteer:before-goto'(page) {
      if (!loginEmail || !loginPassword) {
        console.warn('[unlighthouse:hook] Login credentials are not configured; continuing with public pages.');
        return;
      }

      try {
        const currentUrl = page.url();
        if (!currentUrl.includes('/login')) {
          await page.goto('https://orca.az-ez.pro/login', { waitUntil: 'domcontentloaded', timeout: 30000 });
        }
        await page.waitForSelector('input', { timeout: 15000 });

        await page.evaluate((email) => {
          const emailInput = document.querySelector('input[type="email"]') || document.querySelector('input[name="email"]') || document.querySelector('input');
          if (emailInput) { emailInput.value = email; emailInput.dispatchEvent(new Event('input', { bubbles: true })); }
        }, loginEmail);

        await page.evaluate((password) => {
          const passwordInput = document.querySelector('input[type="password"]') || document.querySelector('input[name="password"]') || document.querySelectorAll('input')[1];
          if (passwordInput) { passwordInput.value = password; passwordInput.dispatchEvent(new Event('input', { bubbles: true })); }
        }, loginPassword);

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
