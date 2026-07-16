const fs = require("fs").promises;
const path = require("path");

const { getContacts } = require("./APIs/contacts.js");
const { getContractors } = require("./APIs/contractors.js");
const { getInspection } = require("./APIs/inspection.js");
const { getParcel } = require("./APIs/parcel.js");
const { getPermit } = require("./APIs/permit.js");
const { getQuantityGroup } = require("./APIs/quantity_group.js");

//utils
const { cleanJSON } = require("./utils/cleaner.js");
const { hash } = require("./utils/hashes/create.hash.js");
const { canonicalize } = require("./utils/canonicalize.js");

// Configuration
const DELAY_MS = 1500; // 1.5 seconds delay between each case
const OUTPUT_DIR = "./permits"; // Folder to save the individual JSON files

/**
 * Helper function to create a delay (pause execution)
 * @param {number} ms - Milliseconds to delay
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Helper function to clean the permit number so it's safe to use as a file name
 */
const sanitizeFilename = (name) => {
  // Replace invalid OS file characters with dashes
  return name.replace(/[\/\\?%*:|"<>]/g, "-").trim();
};

async function processPermitFiles(filepath) {
  try {
    // 1. Ensure the output directory exists
    await fs.mkdir(OUTPUT_DIR, { recursive: true });

    // 2. Read and parse the JSON file
    console.log("Reading cases.json...");
    const rawData = await fs.readFile(filepath, "utf8");
    const jsonData = JSON.parse(rawData);

    // Extract the array of cases
    const cases = jsonData.value ?? jsonData;

    // 3. Loop through each case sequentially
    for (let i = 0; i < cases.length; i++) {
      const caseItem = cases[i];
      const caseID = caseItem.caseID ?? caseItem.case_id;

      // Fallback to caseID if permitNumber is empty/missing
      const rawFileName =
        caseItem.permitNumber || caseItem.permit_number || String(caseID); //changed order
      const safeFileName = sanitizeFilename(rawFileName);
      const filePath = path.join(OUTPUT_DIR, `${safeFileName}.json`);

      console.log(
        `\n[${i + 1}/${cases.length}] Fetching data for caseID: ${caseID} (Permit: ${rawFileName})...`,
      );

      try {
        // 4. Fire all 5 API requests for THIS caseID concurrently
        const [
          contacts,
          contractors,
          inspection,
          parcel,
          permit,
          quantityGroup,
        ] = await Promise.all([
          getContacts(caseID),
          getContractors(caseID),
          getInspection(caseID),
          getParcel(caseID),
          getPermit(caseID),
          getQuantityGroup(caseID),
        ]);

        // short hack
        if (caseItem.permit_number) {
          // this means we are fetching from our database using update.js
          caseItem.permit_number = `${permit?.value[0]?.caseType} ${caseItem.permit_number}`; // covert into db format
        }

        // 5. Combine the original case data with the newly fetched data
        const combinedData = {
          caseID: caseID,
          permitNumber: caseItem.permitNumber || caseItem.permit_number,
          permitDetails: {
            contacts,
            contractors,
            inspection,
            parcel,
            permit,
            quantityGroup,
          },
        };
        // await fs.writeFile(filePath, JSON.stringify(combinedData, null, 2));
        // cleaning
        const cleanedData = cleanJSON(canonicalize(combinedData));
        // hashing
        const permit_hash = hash(cleanedData);

        //merge
        const final = { permit_data: cleanedData, permit_hash: permit_hash };
        // 6. Save directly to its own JSON file
        await fs.writeFile(filePath, JSON.stringify(final, null, 2));
        console.log(`✅ Successfully saved to: ${filePath}`);
      } catch (apiError) {
        console.error(
          `❌ Error processing caseID ${caseID}:`,
          apiError.message,
        );

        // Optionally save an error log for this specific permit so you know it failed
        const errorData = { caseID, error: apiError.message, time: new Date() };
        await fs.writeFile(
          path.join(OUTPUT_DIR, `${safeFileName}_ERROR.json`),
          JSON.stringify(errorData, null, 2),
        );
      }

      // 7. Add a delay before moving to the next case (unless it's the very last one)
      if (i < cases.length - 1) {
        console.log(
          `⏳ Waiting for ${DELAY_MS / 1000} seconds before the next request...`,
        );
        await sleep(DELAY_MS);
      }
    }

    console.log("\n🎉 All cases processed successfully!");
  } catch (error) {
    console.error("Critical Error reading file or parsing JSON:", error);
  }
}

async function processEntireFolder(folderPath) {
  try {
    // 1. Read all items in the directory
    const files = await fs.readdir(folderPath);

    console.log(
      `Found ${files.length} items in folder. Starting processing...`,
    );

    // 2. Loop through each item
    for (const file of files) {
      const fullPath = path.join(folderPath, file);

      // 3. Check if it's actually a file (and not a sub-folder)
      const stat = await fs.stat(fullPath);

      if (stat.isFile()) {
        // Optional: Only process specific file types (e.g., .json, .pdf)
        // if (path.extname(file) !== '.json') continue;

        console.log(`Processing: ${file}`);

        try {
          // 4. Await your function
          await processPermitFiles(fullPath);
          console.log(`✅ Successfully processed: ${file}`);
        } catch (err) {
          // Catch errors for individual files so the whole script doesn't crash
          console.error(`❌ Error processing ${file}:`, err.message);
        }
      }
    }

    console.log("🎉 All files processed successfully!");
  } catch (err) {
    console.error("Failed to read the directory:", err);
  }
}

module.exports = { processEntireFolder, processPermitFiles };
