require('dotenv').config();
const Sourcebit = require('./lib/sourcebit');

module.exports.fetch = (config, runtimeParameters, transformCallback) => {
    if (!config) {
        throw new Error('ERROR: Could not find a valid `sourcebit.js` configuration file.');
    }

    if (typeof runtimeParameters === 'function') {
        transformCallback = runtimeParameters;
        runtimeParameters = {};
    }

    const instance = new Sourcebit({ runtimeParameters, transformCallback });
    const { plugins = [] } = config;

    instance.loadPlugins(plugins);

    const transformData = instance.bootstrapAll().then(() => instance.transform());

    if (typeof transformCallback !== 'function') {
        return transformData;
    }
};

module.exports.Sourcebit = Sourcebit;
