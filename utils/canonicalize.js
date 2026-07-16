function canonicalize(value) {
  if (Array.isArray(value)) {
    return value
      .map(canonicalize)
      .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  }

  if (value && typeof value === "object") {
    return Object.keys(value)
      .sort()
      .reduce((obj, key) => {
        obj[key] = canonicalize(value[key]);
        return obj;
      }, {});
  }

  return value;
}

module.exports = { canonicalize };
