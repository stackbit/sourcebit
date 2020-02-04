const fs = require("fs");
const yaml = require("yaml");

module.exports.writeFrontmatterMarkdown = (
  filePath,
  { body = "", frontmatter }
) => {
  const lines = [
    "---",
    yaml.stringify(frontmatter).trim(),
    "---",
    body.length > 0 ? body.trim() : "",
    ""
  ];
  const content = lines.join("\n");

  return fs.writeFileSync(filePath, content);
};

module.exports.writeJSON = (filePath, data) => {
  const content = JSON.stringify(data, null, 2);

  return fs.writeFileSync(filePath, content);
};

module.exports.writeYAML = function(filePath, data) {
  const content = yaml.stringify(data);

  return fs.writeFileSync(filePath, content);
};
