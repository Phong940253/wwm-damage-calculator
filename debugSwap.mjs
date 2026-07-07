import { chromium } from "playwright";

const logs = [];
let resolved = false;

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Collect console output
  page.on("console", (msg) => {
    const text = msg.text();
    if (text.includes("[swapDebug]")) {
      logs.push("[BROWSER] " + text);
    }
  });

  page.on("pageerror", (err) => {
    logs.push("[PAGE_ERROR] " + err.message);
  });

  await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
  console.log("Page loaded");

  // Check localStorage for gear with addition
  const gearInfo = await page.evaluate(() => {
    try {
      const raw = localStorage.getItem("wwm_custom_gear");
      if (!raw) return { found: false, reason: "no wwm_custom_gear key" };
      const gears = JSON.parse(raw);
      const withAdd = gears.filter((g) => g.addition);
      return {
        found: true,
        total: gears.length,
        withAddition: withAdd.length,
        samples: withAdd.slice(0, 3).map((g) => ({
          name: g.name,
          id: g.id,
          slot: g.slot,
          addition: g.addition,
          tunedSubIndex: g.tunedSubIndex,
        })),
      };
    } catch (e) {
      return { found: false, reason: e.message };
    }
  });
  console.log("Gear info:", JSON.stringify(gearInfo, null, 2));

  // Navigate to the optimizer - try clicking "Optimize" button or similar
  // First let's try to find the optimize button
  const pageContent = await page.content();
  console.log("Page title:", await page.title());

  // Try clicking gear tab and optimizer
  // Look for text that says "Optimize" or similar
  const optimizeBtn = page.locator('button:has-text("Optimize"), button:has-text("optimize"), button:has-text("Gear Optimize")').first();
  const exists = await optimizeBtn.count();
  console.log(`Optimize button found: ${exists}`);

  if (exists > 0) {
    await optimizeBtn.click();
    await page.waitForTimeout(1000);

    // Check "Consider Tune" checkbox
    const tuneCheckbox = page.locator('input[type="checkbox"]').locator('..').filter({ hasText: /consider.*tune/i }).locator('input[type="checkbox"]').first();
    const tuneCheckboxExists = await tuneCheckbox.count();
    console.log(`Consider Tune checkbox found: ${tuneCheckboxExists}`);

    if (tuneCheckboxExists > 0) {
      await tuneCheckbox.check();
      console.log("Checked Consider Tune");
    }

    // Click Recalculate
    const recalcBtn = page.locator('button:has-text("Recalculate"), button:has-text("recalculate"), button:has-text("Calculate")').first();
    const recalcExists = await recalcBtn.count();
    console.log(`Recalculate button found: ${recalcExists}`);

    if (recalcExists > 0) {
      await recalcBtn.click();
      console.log("Clicked Recalculate");

      // Wait for results
      await page.waitForTimeout(5000);
    }
  }

  // Try alternative: navigate to URL with ?root=gear or similar
  console.log("Trying URL navigation...");
  await page.goto("http://localhost:3000?root=gear", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);

  // Check for optimizer dialog
  const optimizeBtn2 = page.locator('button:has-text("Optimize")').first();
  const exists2 = await optimizeBtn2.count();
  console.log(`Optimize button (2nd attempt): ${exists2}`);

  if (exists2 > 0) {
    await optimizeBtn2.click();
    await page.waitForTimeout(1000);
  }

  // Try standard dialog buttons
  const allButtons = await page.locator("button").allTextContents();
  console.log("All buttons on page:", allButtons);

  resolved = true;
})()
  .catch((err) => {
    console.error("Error:", err.message);
    logs.push("[ERROR] " + err.message);
  })
  .finally(() => {
    setTimeout(() => {
      console.log("\n=== SWAP DEBUG LOGS ===");
      for (const line of logs) {
        console.log(line);
      }
      if (logs.length === 0) {
        console.log("(no [swapDebug] logs captured)");
      }
      process.exit(0);
    }, 10000);
  });

// Timeout after 30s
setTimeout(() => {
  if (!resolved) {
    console.log("\n=== TIMEOUT REACHED ===");
    console.log("\n=== SWAP DEBUG LOGS ===");
    for (const line of logs) {
      console.log(line);
    }
    if (logs.length === 0) {
      console.log("(no [swapDebug] logs captured)");
    }
    process.exit(0);
  }
}, 30000);
