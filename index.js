const path = require('path');
require('dotenv').config();
const Sourcebit = require('./lib/sourcebit');

module.exports.fetch = (config, runtimeParameters, transformCallback) => {
    if (typeof runtimeParameters === 'function') {
        transformCallback = runtimeParameters;
        runtimeParameters = {};
    }

    const transformDataPromise = fetch(config, runtimeParameters, transformCallback)

    if (typeof transformCallback !== 'function') {
        return transformDataPromise;
    }
};

module.exports.sourcebitNext = ({ config, runtimeParameters, transformCallback } = {}) => {
    return function withSourcebit(nextConfig) {
        return {
            ...nextConfig,
            // Since Next.js doesn't provide some kind of real "plugin system"
            // we're (ab)using the `redirects` option here in order to hook into
            // and block the `next build` and initial `next dev` run.
            redirects: async () => {
                await fetch(config, runtimeParameters, transformCallback);
                return nextConfig.redirects ? nextConfig.redirects() : [];
            }
        }
    }
};

async function fetch(config, runtimeParameters, transformCallback) {
    if (!config) {
        try {
            const configPath = path.resolve(process.cwd(), 'sourcebit.js');
            config = require(configPath);
        } catch (error) {
            if (error.code === 'MODULE_NOT_FOUND') {
                throw new Error('Could not find sourcebit.js configuration file');
            }
            throw error;
        }
    }
    const instance = new Sourcebit({ runtimeParameters, transformCallback });
    const { plugins = [] } = config;

    instance.loadPlugins(plugins);

    return instance.bootstrapAll().then(() => instance.transform());
}

module.exports.Sourcebit = Sourcebit;
