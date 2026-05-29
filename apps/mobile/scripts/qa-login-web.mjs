import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage();
const logs = [];
page.on('console', (msg) => logs.push(`[${msg.type()}] ${msg.text()}`));
await page.goto('http://127.0.0.1:8081/login', { waitUntil: 'domcontentloaded', timeout: 90000 });
await page.waitForTimeout(5000);
const styles = await page.evaluate(() => {
  const find = (text) => [...document.querySelectorAll('*')].find((el) => el.childNodes.length <= 3 && el.textContent?.trim() === text);
  const cs = (el) => (el ? getComputedStyle(el) : null);
  const heading = find('Hi-Hired');
  const btn = find('Continue with Email');
  return {
    heading: heading ? { color: cs(heading).color, fontWeight: cs(heading).fontWeight, className: heading.className } : null,
    button: btn ? { color: cs(btn).color, bg: cs(btn).backgroundColor, borderRadius: cs(btn).borderRadius, className: btn.className } : null,
  };
});
await page.fill('input[placeholder="your@email.com"]', 'qa-test@hi-hired.test');
await page.getByText('Continue with Email', { exact: true }).click();
await page.waitForTimeout(3000);
const bodyText = await page.evaluate(() => document.body.innerText);
console.log(JSON.stringify({ styles, bodyHasCheckEmail: bodyText.includes('Check your email'), logs: logs.filter(l => /supabase|error|Check your email/i.test(l)).slice(0,10) }, null, 2));
await page.screenshot({ path: '/home/admin/swipe-job-search/web-ui-post-clear.png', fullPage: true });
await browser.close();
