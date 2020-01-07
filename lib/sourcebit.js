const fs = require("fs");
const path = require("path");

class Sourcebit {
  constructor({
    cacheFile = path.join(process.cwd(), ".sourcebit-cache.json")
  } = {}) {
    this.cacheFilePath = cacheFile;
    this.context = {};
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
            getContext: this.getPluginContext.bind(this, name),
            options,
            refresh: this.runTransform.bind(this, plugins),
            setContext: this.setContext.bind(this, name)
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
            getContext: this.getPluginContext.bind(this, name),
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
}

module.exports = Sourcebit;
