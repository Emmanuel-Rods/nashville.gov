// Note: Node.js v18+ has native fetch. If using an older version, you'll need: const fetch = require('node-fetch');

async function searchPermits(payload, cf_cookie) {
  if (!cf_cookie) {
    throw new Error(
      "cf-turnstile-response cookie not present , without this cookie the response will be empty regardless",
    );
  }
  const url =
    "https://epermits.nashville.gov/api/permit/1.0/search/advanced/?%24inlinecount=allpages&%24skip=0&%24top=20&%24orderby=%20fullAddress%20ASC%2CpermitNumber%20ASC";

  const headers = {
    accept: "application/json, text/plain, */*",
    "accept-language": "en-US,en;q=0.9",
    "content-type": "application/json;charset=UTF-8",
    origin: "https://epermits.nashville.gov",
    priority: "u=1, i",
    referer: "https://epermits.nashville.gov/?",
    "sec-ch-ua":
      '"Google Chrome";v="149", "Chromium";v="149", "Not)A;Brand";v="24"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"Windows"',
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-origin",
    "user-agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36",
    Cookie: cf_cookie,
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    // --- CHECK IF RESPONSE IS EMPTY ---
    // Checks if odata.count is "0" OR if the value array is completely empty

    if (data.value == null) {
      throw new Error(
        "cf-turnstile-response is a one time use cookie or is expired",
      );
    }
    if (
      data["odata.count"] === "0" ||
      (Array.isArray(data.value) && data.value.length === 0)
    ) {
      console.log(data);
      require("fs").writeFileSync(
        "response.json",
        JSON.stringify(data),
        console.log("No results found. The response is empty."),
      );
      return null;
    }
    require("fs").writeFileSync("response.json", JSON.stringify(data));
    console.log(`Success! Found ${data["odata.count"]} results.`);
    return data;
  } catch (error) {
    console.error("Error making the request:", error);
    return null;
  }
}

module.exports = { searchPermits };

// searchPermits(payload, cookies[0].cookieString);
