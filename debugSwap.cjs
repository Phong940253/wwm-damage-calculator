const { chromium } = require("./node_modules/.pnpm/playwright@1.61.0/node_modules/playwright");

const logs = [];
let resolved = false;

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

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
        samples: withAdd.slice(0, 5).map((g) => ({
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

  // Get all buttons on page
  const allButtons = await page.locator("button").allTextContents();
  console.log("All buttons:", allButtons);

  // Try navigating to gear tab first
  const gearTab = page.locator('button:has-text("Gear"), [role="tab"]:has-text("Gear")').first();
  if (await gearTab.count() > 0) {
    await gearTab.click();
    await page.waitForTimeout(500);
    console.log("Clicked Gear tab");
  }

  // Look for Optimize button
  const optimizeBtn = page.locator('button:has-text("Optimize")').first();
  if (await optimizeBtn.count() > 0) {
    await optimizeBtn.click();
    await page.waitForTimeout(500);
    console.log("Clicked Optimize");
  }

  // Check for Consider Tune checkbox
  const tuneCheckbox = page.locator('label:has-text("Consider Tune") input[type="checkbox"], label:has-text("consider") input[type="checkbox"]').first();
  if (await tuneCheckbox.count() > 0) {
    await tuneCheckbox.check();
    console.log("Checked Consider Tune");
  } else {
    console.log("Consider Tune checkbox NOT found");
    // Try finding any checkbox
    const allCheckboxes = await page.locator('input[type="checkbox"]').all();
    console.log(`Found ${allCheckboxes.length} checkboxes`);
  }

  // Click Recalculate
  const recalcBtn = page.locator('button:has-text("Recalculate"), button:has-text("Calculate")').first();
  if (await recalcBtn.count() > 0) {
    await recalcBtn.click();
    console.log("Clicked Recalculate");
    await page.waitForTimeout(5000);
  }

  // Also try URL approach
  console.log("Trying URL navigation...");
  await page.goto("http://localhost:3000?root=gear", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);

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
    }, 15000);
  });

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
}, 45000);
