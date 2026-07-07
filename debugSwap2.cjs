const { chromium } = require("./node_modules/.pnpm/playwright@1.61.0/node_modules/playwright");

const logs = [];

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();

  // Inject localStorage BEFORE page loads
  await context.addInitScript(() => {
    // Create test gear with additions
    const testGears = [
      {
        id: "weapon1",
        name: "Test Weapon 1",
        slot: "weapon_1",
        mains: [{ stat: "MinPhysicalAttack", value: 1000 }],
        subs: [
          { stat: "CriticalRate", value: 5 },
          { stat: "Power", value: 20 },
          { stat: "AffinityRate", value: 2 },
          { stat: "MinPhysicalAttack", value: 30 },
        ],
        tunedSubIndex: 2,
        tuneHistory: [{ subIndex: 2, stat: "AffinityRate" }],
        addition: { stat: "bellstrikePenetration", value: 10 },
        weaponType: "bell",
      },
      {
        id: "weapon2",
        name: "Test Weapon 2",
        slot: "weapon_2",
        mains: [{ stat: "MinPhysicalAttack", value: 800 }],
        subs: [
          { stat: "Power", value: 15 },
          { stat: "Momentum", value: 20 },
          { stat: "CriticalRate", value: 3 },
          { stat: "AffinityRate", value: 1.5 },
        ],
        tunedSubIndex: 1,
        tuneHistory: [{ subIndex: 1, stat: "Power" }],
        addition: { stat: "stonesplitPenetration", value: 10 },
        weaponType: "stone",
      },
      {
        id: "disc1",
        name: "Test Disc",
        slot: "disc",
        mains: [{ stat: "MinPhysicalAttack", value: 500 }],
        subs: [
          { stat: "CriticalRate", value: 3 },
          { stat: "Power", value: 25 },
          { stat: "AffinityRate", value: 2 },
          { stat: "MinPhysicalAttack", value: 20 },
        ],
        addition: { stat: "PhysicalPenetration", value: 8 },
      },
      {
        id: "head1",
        name: "Test Head",
        slot: "head",
        mains: [{ stat: "MinPhysicalAttack", value: 300 }],
        subs: [
          { stat: "CriticalRate", value: 2 },
          { stat: "Power", value: 15 },
          { stat: "AffinityRate", value: 1 },
          { stat: "MinPhysicalAttack", value: 15 },
        ],
        addition: { stat: "PhysicalPenetration", value: 6 },
      },
    ];

    localStorage.setItem("wwm_custom_gear", JSON.stringify(testGears));

    const equipped = {
      weapon_1: "weapon1",
      weapon_2: "weapon2",
      disc: "disc1",
      head: "head1",
    };
    localStorage.setItem("wwm_equipped", JSON.stringify(equipped));

    const stats = {
      MinPhysicalAttack: { current: 5000, increase: 0 },
      MaxPhysicalAttack: { current: 6000, increase: 0 },
      CriticalRate: { current: 30, increase: 0 },
      AffinityRate: { current: 10, increase: 0 },
      Power: { current: 200, increase: 0 },
      Momentum: { current: 150, increase: 0 },
      Agility: { current: 100, increase: 0 },
      PhysicalPenetration: { current: 20, increase: 0 },
      PhysicalResistance: { current: 10, increase: 0 },
    };
    localStorage.setItem("wwm_dmg_current_stats", JSON.stringify(stats));

    localStorage.setItem("wwm_element_stats", JSON.stringify({
      selected: "bellstrike",
      martialArtsId: "bell",
      innerWays: [],
      pvpMode: false,
    }));
  });

  const page = await context.newPage();
  page.on("console", (msg) => {
    const text = msg.text();
    if (text.includes("[swapDebug]")) {
      logs.push("[BROWSER] " + text);
    }
  });
  page.on("pageerror", (err) => {
    logs.push("[PAGE_ERROR] " + err.message);
  });

  await page.goto("http://localhost:3000", { waitUntil: "networkidle", timeout: 30000 });
  console.log("Page loaded");

  await page.waitForTimeout(2000);

  // Check what's visible
  const pageText = await page.locator("body").innerText();
  console.log("Body text (truncated):", pageText.substring(0, 500));

  const allButtons = await page.locator("button, [role='button']").allTextContents();
  console.log("All interactive elements:", allButtons.filter(b => b.trim()));

  // Try clicking gear-related buttons
  const optimizeBtns = page.locator('button:has-text("Optimize")');
  const count = await optimizeBtns.count();
  console.log(`Optimize buttons: ${count}`);

  if (count > 0) {
    await optimizeBtns.first().click();
    await page.waitForTimeout(1000);
  }

  // Check for checkbox
  const checkboxes = page.locator('input[type="checkbox"]');
  const cbCount = await checkboxes.count();
  console.log(`Checkboxes: ${cbCount}`);

  // Try Recalculate
  const recalcBtns = page.locator('button:has-text("Recalculate"), button:has-text("Calculate")');
  const rcCount = await recalcBtns.count();
  console.log(`Recalculate buttons: ${rcCount}`);

  if (rcCount > 0) {
    await recalcBtns.first().click();
    await page.waitForTimeout(8000);
  }

  // Also trigger optimizer directly via evaluate
  console.log("Triggering optimizer via evaluate...");

  await browser.close();
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
    }, 5000);
  });
