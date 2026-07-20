const { uploadFolder } = require("./db/upload.js");
const { deletefolders } = require("./utils/deleteFolders.js");
const { processPermitFiles } = require("./process.js");
const getDataByStatus = require("./db/getPreviousData.js");
const { comparePermitHashes } = require("./utils/hashes/hash.compare.js");

const statuses = ["Open", "Issued"];

async function processStatus(status) {
  const file = await getDataByStatus(status);

  await processPermitFiles(file);
  await comparePermitHashes(file, "permits", "DIFF_FOLDER");
  await uploadFolder("DIFF_FOLDER");

  // then delete data folder
  await deletefolders(["permits", "DIFF_FOLDER"]);
}

async function main() {
  for (const status of statuses) {
    console.log(`Processing status: ${status}`);
    await processStatus(status);
  }
}

main().catch(console.error);

// daily.js : Issued , done , hold
// update.js Issued
