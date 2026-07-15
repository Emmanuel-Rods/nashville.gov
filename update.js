const { uploadFolder } = require("./db/upload.js");
const { deletefolders } = require("./utils/deleteFolders.js");
const { processPermitFiles } = require("./process.js");
const getDataByStatus = require("./db/getPreviousData.js");
const { comparePermitHashes } = require("./utils/hashes/hash.compare.js");

const file = "total.json"; // temp file for processing

async function main() {
  //const file = await getDataByStatus(status);
  await processPermitFiles(file);
  await comparePermitHashes(file, "permits", "DIFF_FOLDER");
  await uploadFolder("permits");
  // then delete data folder
  //await deletefolders(["permits"]);
}

main();

// daily.js : Issued , done , hold
// update.js Issued
