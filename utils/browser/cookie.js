const fs = require("fs/promises"); // Use the promise-based fs module
const path = require("path"); // Built-in Node module for handling file paths

async function readCookieFromJson(filepath) {
  try {
    const absolutePath = path.resolve(filepath);

    const rawJSON = await fs.readFile(absolutePath, "utf-8");
    const browserCookies = JSON.parse(rawJSON);
    if (!Array.isArray(browserCookies) || browserCookies.length === 0) {
      throw new Error(
        "The file is empty or does not contain a valid array of cookies.",
      );
    }
    const formattedCookie = convertCookieToString(browserCookies[0]);

    console.log(formattedCookie);
    return formattedCookie;
  } catch (error) {
    // Catch and log specific errors (e.g., file not found, bad JSON)
    if (error.code === "ENOENT") {
      console.error(`Error: The file at "${filepath}" does not exist.`);
    } else if (error instanceof SyntaxError) {
      console.error(`Error: The file at "${filepath}" contains invalid JSON.`);
    } else {
      console.error(`Unexpected error:`, error.message);
    }

    return null; // Return null gracefully instead of crashing the app
  }
}

function convertCookieToString(cookieObj) {
  if (!cookieObj || !cookieObj.name || !cookieObj.value) {
    throw new Error(
      "Invalid cookie object. Must contain 'name' and 'value' properties.",
    );
  }

  return `${cookieObj.name}=${cookieObj.value}`;
}

module.exports = { readCookieFromJson };
