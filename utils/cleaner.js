const fs = require("fs").promises; // Use the Promise-based fs API
const path = require("path");

// --- 1. The STRICT NASHVILLE SCHEMA ---
const NASHVILLE_SCHEMA = {
  caseID: null,
  permitNumber: null,
  contacts: null,
  contractors: null,
  inspections: null,
  parcel: null,
  permit: null,
  quantityGroup: null,
};

// Made the function async so it returns a Promise
async function cleanFolder(inputFolder, outputFolder) {
  try {
    // 1. Ensure output directory exists
    // (recursive: true automatically prevents errors if the folder already exists)
    await fs.mkdir(outputFolder, { recursive: true });

    // 2. Read all files in the directory asynchronously
    const allFiles = await fs.readdir(inputFolder);
    const jsonFiles = allFiles.filter((file) =>
      file.toLowerCase().endsWith(".json"),
    );

    console.log(
      `Starting Nashville cleanup for ${jsonFiles.length} files...\n`,
    );

    let processedCount = 0;
    const errorLog = [];

    // --- 2. Loop through the Input Folder ---
    // Using for...of with await ensures we don't open 10,000 files at once
    // and crash the system (EMFILE error).
    for (const filename of jsonFiles) {
      const filepath = path.join(inputFolder, filename);

      try {
        // Read file asynchronously
        const rawDataRaw = await fs.readFile(filepath, "utf-8");
        const rawData = JSON.parse(rawDataRaw);

        // Clone the strict schema template for this specific file
        const cleanedData = { ...NASHVILLE_SCHEMA };

        // --- STEP 1: Top Level Keys ---
        cleanedData.caseID = rawData.caseID ?? null;
        cleanedData.permitNumber = rawData.permitNumber ?? null;

        // --- STEP 2: Dig into permitDetails ---
        const permitDetails = rawData.permitDetails || {};

        cleanedData.contacts = permitDetails.contacts?.value ?? null;
        cleanedData.contractors = permitDetails.contractors?.value ?? null;
        cleanedData.parcel = permitDetails.parcel?.value ?? null;
        cleanedData.permit = permitDetails.permit?.value ?? null;

        // --- STEP 3: The Smart Inspection Filter ---
        const inspectionsData = permitDetails.inspection || {};
        if (inspectionsData.value && Array.isArray(inspectionsData.value)) {
          const filteredInspections = inspectionsData.value.filter(
            (insp) => insp.taskType === "INSPECTION",
          );

          if (filteredInspections.length > 0) {
            cleanedData.inspections = filteredInspections;
          }
        }

        // --- STEP 4: The CABVALRES Quantity Filter ---
        const quantityData = permitDetails.quantityGroup || {};
        if (quantityData.value && Array.isArray(quantityData.value)) {
          const filteredQuantity = quantityData.value.filter(
            (q) => q.groupCode === "CABVALRES" || q.groupCode === "CABVALCOM",
          );

          if (filteredQuantity.length > 0) {
            cleanedData.quantityGroup = filteredQuantity;
          }
        }

        // --- STEP 5: Save the properly formatted file asynchronously ---
        const outputFilepath = path.join(outputFolder, filename);
        await fs.writeFile(
          outputFilepath,
          JSON.stringify(cleanedData, null, 2),
          "utf-8",
        );

        processedCount++;
      } catch (e) {
        errorLog.push(`[${filename}] Failed to process: ${e.message}`);
      }
    }

    // --- Terminal Summary ---
    console.log("-".repeat(40));
    console.log(
      `CLEANUP COMPLETE: Processed ${processedCount} out of ${jsonFiles.length} files.`,
    );

    if (errorLog.length > 0) {
      console.log("\n[WARNING] The following files encountered errors:");
      for (const error of errorLog) {
        console.log(`  -> ${error}`);
      }
    }

    // Return an object containing the results if the caller needs it
    return { success: true, processedCount, errors: errorLog };
  } catch (err) {
    console.error("Critical error reading directories:", err);
    throw err; // Re-throw so whatever called this Promise knows it failed
  }
}

function cleanJSON(rawJSON) {
  const rawData = rawJSON;

  // Clone the strict schema template for this specific file
  const cleanedData = { ...NASHVILLE_SCHEMA };

  // --- STEP 1: Top Level Keys ---
  cleanedData.caseID = rawData.caseID ?? null;
  cleanedData.permitNumber = rawData.permitNumber ?? null;

  // --- STEP 2: Dig into permitDetails ---
  const permitDetails = rawData.permitDetails || {};

  cleanedData.contacts = permitDetails.contacts?.value ?? null;
  cleanedData.contractors = permitDetails.contractors?.value ?? null;
  cleanedData.parcel = permitDetails.parcel?.value ?? null;
  cleanedData.permit = permitDetails.permit?.value ?? null;

  // --- STEP 3: The Smart Inspection Filter ---
  const inspectionsData = permitDetails.inspection || {};
  if (inspectionsData.value && Array.isArray(inspectionsData.value)) {
    const filteredInspections = inspectionsData.value.filter(
      (insp) => insp.taskType === "INSPECTION",
    );

    // remove dyamically generated recommendedDate value
    inspectionsData.value.forEach((inspection) => {
      delete inspection.recommendedDate;
    });

    if (filteredInspections.length > 0) {
      cleanedData.inspections = filteredInspections;
    }
  }

  // --- STEP 4: The CABVALRES Quantity Filter ---
  const quantityData = permitDetails.quantityGroup || {};
  if (quantityData.value && Array.isArray(quantityData.value)) {
    const filteredQuantity = quantityData.value.filter(
      (q) => q.groupCode === "CABVALRES" || q.groupCode === "CABVALCOM",
    );

    if (filteredQuantity.length > 0) {
      cleanedData.quantityGroup = filteredQuantity;
    }
  }

  return cleanedData;
}
module.exports = { cleanFolder, cleanJSON };
