const fs = require("fs");
const path = require("path");

// Configuration
const DATA_DIR = path.join(__dirname, "data");
const TOP = 20; // Based on your new URL
let skip = 480; // Based on your new URL
const DELAY_MINUTES = 2.5; // 2.5 minutes delay
const DELAY_MS = DELAY_MINUTES * 60 * 1000;

// The specific Cache ID from your URL
const CACHE_KEY = "614a76e7ffd04623afb8a40a2275d40d";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function checkExpiration() {
  // Ensure the 'data' directory exists
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  console.log(`\n=== Starting Expiration Test ===`);
  console.log(`Delay set to: ${DELAY_MINUTES} minutes between requests.`);

  // Record the exact time we started
  const startTime = Date.now();
  let keepFetching = true;
  let requestCount = 1;

  while (keepFetching) {
    const now = new Date();
    const elapsedMinutes = ((Date.now() - startTime) / 1000 / 60).toFixed(2);
    const filePath = path.join(DATA_DIR, `permits_skip_${skip}.json`);

    const url = `https://epermits.nashville.gov/api/permit/1.0/search/advanced//${CACHE_KEY}?%24inlinecount=allpages&%24skip=${skip}&%24top=${TOP}&%24orderby=%20fullAddress%20ASC%2CpermitNumber%20ASC`;

    console.log(
      `\n[${now.toLocaleTimeString()}] Request #${requestCount} | Elapsed time: ${elapsedMinutes} mins | Skip: ${skip}`,
    );

    try {
      const response = await fetch(url, {
        headers: { Accept: "application/json" },
      });

      // We parse the JSON *before* checking response.ok because
      // the server likely returns a 500 Status Code along with that JSON error payload.
      const text = await response.text();
      let data;

      try {
        data = JSON.parse(text);
      } catch (e) {
        console.log(
          "Server returned non-JSON response:",
          text.substring(0, 100),
        );
        keepFetching = false;
        break;
      }

      // === CHECK FOR EXPIRATION ERROR ===
      // We look specifically for the exceptionType you provided
      if (
        data &&
        data.value &&
        data.value.exceptionType === "System.NullReferenceException"
      ) {
        console.log(`\n❌ LINK EXPIRED!`);
        console.log(`The server threw the expected NullReferenceException.`);
        console.log(`⏱️ Total Time Alive: ${elapsedMinutes} minutes.`);
        console.log(`Failed at skip: ${skip}`);
        keepFetching = false;
        break;
      }

      // If it's a different error, log it
      if (!response.ok) {
        console.log(`\n⚠️ Unexpected HTTP Error: ${response.status}`);
        console.log(data);
        keepFetching = false;
        break;
      }

      // === SAVE SUCCESSFUL DATA ===
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
      console.log(`   ✅ Success! Saved to ${filePath}`);

      // Increment skip for the next round
      skip += TOP;
      requestCount++;

      // Wait 2.5 minutes before hitting it again
      console.log(`   Waiting ${DELAY_MINUTES} minutes...`);
      await delay(DELAY_MS);
    } catch (error) {
      console.error(`\n🚨 Network or fetch error:`, error.message);
      keepFetching = false;
    }
  }

  console.log("\n=== Expiration Test Complete ===");
}

// Run the script
checkExpiration();
