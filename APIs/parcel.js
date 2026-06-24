async function getParcel(caseID) {
  const url = `https://epermits.nashville.gov/api/permit/1.0/CaseAddress?$filter=caseID%20eq%20${caseID}`;

  // Headers extracted exactly from your cURL command
  const headers = {
    accept: "application/json, text/plain, */*",
    "accept-language": "en-US,en;q=0.9",
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
  };

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: headers,
    });

    // Check if the response status is 200 OK
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Parse and return the JSON data
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching the permit case:", error.message);
    throw error;
  }
}

module.exports = { getParcel };
