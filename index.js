const Sourcebit = require("./lib/sourcebit");

module.exports.fetch = async (config, runtimeParameters) => {
  if (!config) {
    throw new Error(
      "ERROR: Could not find a valid `sourcebit.js` configuration file."
    );
  }

  const instance = new Sourcebit({ runtimeParameters });
  const { plugins = [] } = config;

  instance.loadContextFromCache();
  instance.loadPlugins(plugins);

  await instance.bootstrapAll();

  return instance.transform();
};

module.exports.Sourcebit = Sourcebit;
