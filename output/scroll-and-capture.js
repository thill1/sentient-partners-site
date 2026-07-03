import playwright from 'playwright';

(async () => {
  const browser = await playwright.chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1600, height: 1200 } });
  
  await page.goto('http://127.0.0.1:8790');
  await page.waitForTimeout(1000);
  
  // Scroll to blueprint section
  await page.evaluate(() => {
    const blueprintSection = document.querySelector('section:has(h2):has-text("blueprint")') || 
                             document.evaluate("//section[.//h2[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'blueprint')]]", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
    if (blueprintSection) {
      blueprintSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  });
  
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'output/blueprint-section.png' });
  
  await browser.close();
})();
