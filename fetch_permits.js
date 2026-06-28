const fs = require("fs");
const path = require("path");

// Configuration
const DATA_DIR = path.join(__dirname, "data");
const TOP = 100;
const DELAY_MS = 500;

// Utility function to pause between requests
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// const SEARCH_KEY = "f7187e3361ec468bb031dae8da23f228";

// Utility function to figure out how many items are in the response
function getItemsCount(data) {
  if (Array.isArray(data)) return data.length;

  if (data && typeof data === "object") {
    const possibleArrays = [
      data.value,
      data.results,
      data.Items,
      data.items,
      data.data,
    ];
    const validArray = possibleArrays.find((arr) => Array.isArray(arr));
    if (validArray) return validArray.length;

    // Fallback: grab the first array we can find in the object
    const fallbackArray = Object.values(data).find((val) => Array.isArray(val));
    if (fallbackArray) return fallbackArray.length;
  }
  return 0;
}

async function fetchPermits(SEARCH_KEY) {
  let skip = 0;
  let keepFetching = true;

  // Ensure the 'data' directory exists
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    console.log(`Created directory: ${DATA_DIR}`);
  }

  console.log("Starting data fetch...");

  while (keepFetching) {
    // Define the specific file for this batch
    const filePath = path.join(DATA_DIR, `permits_skip_${skip}.json`);

    // === FAULT TOLERANCE / RESUME LOGIC ===
    // If the file already exists, we skip the network request entirely.
    if (fs.existsSync(filePath)) {
      console.log(`[CACHED] Skip: ${skip} already exists. Moving to next...`);

      // We need to read it just to know if this was the last page
      const existingData = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      const itemsCount = getItemsCount(existingData);

      if (itemsCount < TOP) {
        console.log(
          `End of data reached in cached files. (Items: ${itemsCount})`,
        );
        keepFetching = false;
      } else {
        skip += TOP;
      }
      continue; // Skip the rest of the loop and go to the next iteration
    }

    // Construct the URL
    const url = `https://epermits.nashville.gov/api/permit/1.0/search/advanced//${SEARCH_KEY}?%24inlinecount=allpages&%24skip=${skip}&%24top=${TOP}&%24orderby=%20fullAddress%20ASC%2CpermitNumber%20ASC`;

    console.log(`[FETCHING] Skip: ${skip}...`);

    try {
      const response = await fetch(url, {
        headers: { Accept: "application/json" },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // === SAVE IMMEDIATELY ===
      // Write this exact batch to its own file
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
      console.log(`   -> Saved to ${filePath}`);

      const itemsCount = getItemsCount(data);

      // If the items returned are less than our $top limit (100) or 0, we've hit the last page
      if (itemsCount < TOP) {
        console.log(
          `\nReached the end of the data! (Items on last page: ${itemsCount})`,
        );
        keepFetching = false;
      }

      // Increment skip for the next round
      skip += TOP;

      // Delay before next request
      if (keepFetching) {
        await delay(DELAY_MS);
      }
    } catch (error) {
      console.error(`\n❌ Error fetching data at skip ${skip}:`, error.message);
      console.log(
        "Stopping script safely. Run the script again later to resume from this exact spot.",
      );
      keepFetching = false;
    }
  }

  console.log("Script complete.");
}

// Run the script
module.exports = { fetchPermits };
