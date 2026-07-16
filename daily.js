const { getCloudflareCookies } = require("./browser.js");
const { searchPermits } = require("./advanced.search.js");
const { fetchPermits } = require("./fetch_permits.js");
const { processEntireFolder } = require("./process.js");

const { uploadFolder } = require("./db/upload.js");
const { cleanFolder } = require("./utils/cleaner.js");

const { deletefolders } = require("./utils/deleteFolders.js");

const fs = require("fs");

const FROM = "2025-01-01T18:30:00.000Z";
const TO = "2026-01-01T18:30:00.000Z";
const permitType = "CACA";

const payload = JSON.parse(fs.readFileSync("search.payload.json", "utf-8"));

payload.advanced.case.issuedDateFrom = FROM;
payload.case.issuedDateFrom = FROM;
payload.advanced.case.issuedDateTo = TO;
payload.case.issuedDateTo = TO;
payload.advanced.case.permitType = permitType;
payload.case.permitType = permitType;

async function main() {
  const cloudflare = await getCloudflareCookies(
    "https://epermits.nashville.gov/?#/search?orderBy=fullAddress%20ASC,permitNumber%20ASC&page=1&searchCode=PRMT&searchType=permit ",
  );

  const search = await searchPermits(payload, cloudflare.cookieString);
  await fetchPermits(search.searchKey);
  await processEntireFolder("data");
  //cleaning permits
  await uploadFolder("permits");
  //then delete data folder
  await deletefolders(["data", "permits"]);
}

main();

//done , hold , issued
