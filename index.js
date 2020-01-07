const chalk = require("chalk");
const fs = require("fs");
const path = require("path");
const Sourcebit = require("./lib/sourcebit");
const util = require("util");
const Wizard = require("./lib/wizard");

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

module.exports.init = async () => {
  const wizard = new Wizard();
  const plugins = await wizard.start();
  const configPath = path.join(process.cwd(), "sourcebit.js");
  const moduleExports = util.inspect(
    {
      plugins
    },
    { compact: false, depth: null }
  );
  const config = `module.exports = ${moduleExports}\n`;

  try {
    fs.writeFileSync(configPath, config);

    console.log(`\nConfiguration saved to ${chalk.bold(configPath)}.`);
  } catch (error) {
    console.log("ERROR: Could not create configuration file.");

    process.exit(1);
  }
};
