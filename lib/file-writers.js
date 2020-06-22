const fs = require('fs');
const util = require('util');
const yaml = require('yaml');

const writeFile = util.promisify(fs.writeFile);

module.exports.writeFrontmatterMarkdown = (filePath, { body = '', frontmatter = {} }) => {
    const lines = ['---', yaml.stringify(frontmatter).trim(), '---', body ? body.toString().trim() : '', ''];
    const content = lines.join('\n');

    return writeFile(filePath, content);
};

module.exports.writeJSON = (filePath, data) => {
    const content = JSON.stringify(data, null, 2);

    return writeFile(filePath, content);
};

module.exports.writeYAML = function(filePath, data) {
    const content = yaml.stringify(data);

    return writeFile(filePath, content);
};
