const fs = require("fs");
const path = require("path");

class Sourcebit {
  constructor({
    cacheFile = path.join(process.cwd(), ".sourcebit-cache.json")
  } = {}) {
    this.cacheFilePath = cacheFile;
    this.context = {};
    this.parameters = {};
    this.plugins;
  }

  getPluginContext(namespace) {
    return this.context[namespace] || {};
  }

  loadCache() {
    try {
      const cache = require(this.cacheFilePath);

      console.log("Found cache file");

      return cache;
    } catch (error) {
      console.log("Cache file not found");

      return {};
    }
  }

  loadPlugins(pluginsBlock) {
    const plugins = {};

    pluginsBlock.forEach(plugin => {
      try {
        plugins[plugin.name] = require(plugin.name);
      } catch (error) {
        console.log(`ERROR: Could not load plugin ${plugin.name}`);

        process.exit(1);
      }
    });

    return plugins;
  }

  log(namespace, message) {
    console.log(`[${namespace}] ${message}`);
  }

  async runBootstrap(plugins) {
    const pluginModules = this.loadPlugins(plugins);

    // Attempt to load context from cache.
    this.context = this.loadCache();

    let queue = Promise.resolve();

    plugins.forEach(({ name, options }) => {
      queue = queue.then(() => {
        const plugin = pluginModules[name];

        if (typeof plugin.bootstrap === "function") {
          return plugin.bootstrap({
            context: this.context,
            getPluginContext: this.getPluginContext.bind(this, name),
            log: this.log.bind(this, name),
            options,
            refresh: this.runTransform.bind(this, plugins),
            setPluginContext: this.setContext.bind(this, name)
          });
        }
      });
    });

    await queue;

    this.saveContextToCache();

    return this.context;
  }

  runTransform(plugins) {
    const pluginModules = this.loadPlugins(plugins);
    const objects = [];

    let queue = Promise.resolve(objects);

    plugins.forEach(({ name, options }) => {
      queue = queue.then(objects => {
        const plugin = pluginModules[name];

        if (typeof plugin.transform === "function") {
          return plugin.transform({
            context: this.context,
            getPluginContext: this.getPluginContext.bind(this, name),
            log: this.log.bind(this, name),
            objects,
            options
          });
        }

        return objects;
      });
    });

    return queue;
  }

  saveContextToCache() {
    const serializedCache = JSON.stringify(this.context);

    try {
      fs.writeFileSync(this.cacheFilePath, serializedCache);
    } catch (error) {
      console.log(error);
    }
  }

  setContext(namespace, data) {
    this.context[namespace] = data;
  }

  setParameters(parameters) {
    this.parameters = parameters;
  }
}

module.exports = Sourcebit;
