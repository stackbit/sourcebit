const path = require("path");
const Sourcebit = require("./lib/sourcebit");

const instance = new Sourcebit();

module.exports.fetch = config => {
  // If `config` isn't present, we'll look for a `sourcebit.js` file.
  if (!config) {
    const filePath = path.join(process.cwd(), "sourcebit.js");

    try {
      config = require(filePath);
    } catch (error) {
      console.log(
        "ERROR: Could not find a valid `sourcebit.js` configuration file."
      );

      process.exit(1);
    }
  }

  const { plugins = [] } = config;

  return instance.runBootstrap(plugins);
};

module.exports.setParameters = parameters => instance.setParameters(parameters);
