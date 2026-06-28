const fs = require("fs").promises;

async function deletefolders(foldersToDelete) {
  // Delete all folders at the same time for better speed
  await Promise.all(
    foldersToDelete.map((folder) =>
      fs.rm(folder, { recursive: true, force: true }),
    ),
  );

  console.log(`Successfully deleted ${foldersToDelete}`);
}

module.exports = { deletefolders };
