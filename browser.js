const fs = require("fs").promises;
const { connect } = require("puppeteer-real-browser");

const TARGET_COOKIE_NAME = "cf-turnstile-response";

async function getCloudflareCookies(baselink) {
  const { browser, page } = await connect({
    defaultViewport: null,
    headless: false,
    args: [],
    customConfig: {},
    turnstile: true,
    connectOption: {
      defaultViewport: null,
    },
    disableXvfb: false,
    ignoreAllFlags: false,
  });

  const REFRESH_COUNT = 1;
  const collectedPasscodes = [];
  //time out increase
  await page.setDefaultTimeout(60000);
  await page.setDefaultNavigationTimeout(60000);

  for (let i = 0; i < REFRESH_COUNT; i++) {
    console.log(`Starting attempt ${i + 1} of ${REFRESH_COUNT}...`);

    if (i === 0) {
      // First visit
      await page.goto(baselink, { waitUntil: "domcontentloaded" });
    } else {
      // Very Important: If you don't clear the cookies before refreshing,
      // the site might just reuse the old cookie instead of giving you a new one!
      const currentCookies = await page.cookies();
      if (currentCookies.length > 0) {
        await page.deleteCookie(...currentCookies);
      }
      // Refresh the page
      await page.reload({ waitUntil: "domcontentloaded" });
    }

    // Wait for the page to fully load and the Turnstile/anti-bot to solve.
    // 5 seconds is usually enough, adjust if your target site is slower.
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Grab all cookies from the page
    const cookies = await page.cookies();

    // Find the specific one-time passcode cookie
    const targetCookie = cookies.find((c) => c.name === TARGET_COOKIE_NAME);

    if (targetCookie) {
      console.log(
        `✅ Got passcode ${i + 1}: ${targetCookie.value.substring(0, 15)}...`,
      );

      // Save it to our array. This is how we differentiate them!
      collectedPasscodes.push({
        id: `passcode_${i + 1}`,
        timestamp: new Date().toISOString(),
        cookieString: `${targetCookie.name}=${targetCookie.value}`,
        rawName: targetCookie.name,
        rawValue: targetCookie.value,
      });
    } else {
      console.log(`❌ Failed to find the cookie on attempt ${i + 1}.`);
    }
  }

  // Once the loop is done, write the array to a JSON file
  if (collectedPasscodes.length > 0) {
    await fs.writeFile(
      "one_time_cookies.json",
      JSON.stringify(collectedPasscodes, null, 2),
    );
    console.log(
      `\n🎉 Successfully saved ${collectedPasscodes.length} passcodes to 'one_time_cookies.json'!`,
    );
  } else {
    console.log("\n⚠️ No cookies were collected.");
  }

  await browser.close();
  return collectedPasscodes[0]; //temp return function !remove later maybe
}

module.exports = { getCloudflareCookies };
