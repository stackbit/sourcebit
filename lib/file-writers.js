const yaml = require('yaml');

module.exports.writeFrontmatterMarkdown = ({ body = '', frontmatter = {} }) => {
    const lines = ['---', yaml.stringify(frontmatter).trim(), '---', body ? body.toString().trim() : '', ''];
    const content = lines.join('\n');

    return content;
};

module.exports.writeJSON = data => {
    const content = JSON.stringify(data, null, 2);

    return content;
};

module.exports.writeYAML = function(data) {
    const content = yaml.stringify(data);

    return content;
};
