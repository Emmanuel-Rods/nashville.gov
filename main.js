const { getCloudflareCookies } = require("./browser.js");
const fs = require("fs");
const fspromise = require("fs/promises");
const { searchPermits } = require("./advanced.search.js");
const { fetchPermits } = require("./index.js");
const { processEntireFolder } = require("./daily.js");

const payload = JSON.parse(fs.readFileSync("search.payload.json", "utf-8"));
payload.advanced.case.permitType = "CARA";
payload.advanced.case.issuedDateFrom = "2025-12-31T18:30:00.000Z";
payload.case.permitType = "CARA";
payload.case.issuedDateFrom = "2025-12-31T18:30:00.000Z";

async function main() {
  const cloudflare = await getCloudflareCookies(
    "https://epermits.nashville.gov/?#/search?orderBy=fullAddress%20ASC,permitNumber%20ASC&page=1&searchCode=PRMT&searchType=permit ",
  );

  const search = await searchPermits(payload, cloudflare.cookieString);
  await fspromise.writeFile("response.json", JSON.stringify(search, null, 2));
  await fetchPermits(search.searchKey);
  await processEntireFolder("data");
  //then delete data folder
}

main();
