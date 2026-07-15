const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

require("dotenv").config();

// --- Configuration ---
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const TABLE_NAME = process.env.TABLE;

const ERROR_LOG_FILE = "./upload_errors_scraper_05.log";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function logError(message) {
  const timestamp = new Date().toISOString();
  fs.appendFileSync(ERROR_LOG_FILE, `[${timestamp}] ${message}\n`);
}

function chunkArray(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

async function uploadFolder(JSON_FOLDER) {
  if (!fs.existsSync(JSON_FOLDER)) {
    console.error(`Folder not found: ${JSON_FOLDER}`);
    return;
  }

  fs.writeFileSync(
    ERROR_LOG_FILE,
    `--- New Upload Run: ${new Date().toISOString()} ---\n`,
  );

  const files = fs
    .readdirSync(JSON_FOLDER)
    .filter((file) => file.endsWith(".json"));
  console.log(
    `Found ${files.length} JSON files. Validating and preparing payloads...`,
  );

  const validPayloads = [];

  // 1. Read and validate
  for (const file of files) {
    const filePath = path.join(JSON_FOLDER, file);

    try {
      const fileContent = fs.readFileSync(filePath, "utf8");
      const permitData = JSON.parse(fileContent);

      // Extract values directly from Nashville's schema root
      const caseId = permitData.caseID;
      const permitNumber = permitData.permitNumber;

      // Safely fetch status from inner object
      let status = null;
      if (permitData.originalCaseInfo && permitData.originalCaseInfo.status) {
        status = permitData.originalCaseInfo.status;
      }

      if (!caseId) {
        const msg = `Skipped ${file}: Missing 'caseID'`;
        console.warn(` [Warn] ${msg}`);
        logError(msg);
        continue;
      }

      // Map perfectly to the 4 database columns
      validPayloads.push({
        case_id: caseId,
        permit_number: permitNumber,
        status: status,
        permit_data: permitData,
      });
    } catch (err) {
      const msg = `Parse Error on ${file}: ${err.message}`;
      console.error(` [Error] ${msg}`);
      logError(msg);
    }
  }

  // 2. Batch payloads (100 per API request)
  const BATCH_SIZE = 100;
  const batches = chunkArray(validPayloads, BATCH_SIZE);

  console.log(
    `\nCreated ${batches.length} batches. Starting Supabase upload to ${TABLE_NAME}...`,
  );

  let successCount = 0;
  let failCount = 0;

  // 3. Upload batches
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    console.log(` -> Uploading Batch ${i + 1} of ${batches.length}...`);

    try {
      const { error } = await supabase.from(TABLE_NAME).upsert(batch);

      if (error) throw error;

      successCount += batch.length;
      console.log(`    [Success] Batch ${i + 1} committed.`);
    } catch (err) {
      failCount += batch.length;
      const msg = `DB Error on Batch ${i + 1}: ${err.message}`;
      console.error(`    [Failed] ${msg}`);
      logError(msg);

      const failedIds = batch.map((b) => b.case_id).join(", ");
      logError(`Failed Case IDs in Batch ${i + 1}: ${failedIds}`);
    }
  }

  // 4. Final summary output
  console.log(`\n--- Upload Summary ---`);
  console.log(`Total Attempted: ${validPayloads.length}`);
  console.log(`Successfully Uploaded: ${successCount}`);
  console.log(`Failed: ${failCount}`);

  if (failCount > 0 || validPayloads.length < files.length) {
    console.log(
      `⚠️ Check ${ERROR_LOG_FILE} for details on skipped or failed records.`,
    );
  }
}

module.exports = { uploadFolder };
