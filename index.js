const Sourcebit = require("./lib/sourcebit");
const instance = new Sourcebit();

module.exports.fetch = config => {
  const { plugins = [] } = config;

  return instance.runBootstrap(plugins);
};
