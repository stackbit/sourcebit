const fs = require("fs");
const path = require("path");

class Sourcebit {
  constructor({
    cacheFile = path.join(process.cwd(), ".sourcebit-cache.json"),
    runtimeParameters = {}
  } = {}) {
    this.cacheFilePath = cacheFile;
    this.context = {};
    this.pluginBlocks = [];
    this.pluginModules = {};
    this.runtimeParameters = runtimeParameters;
  }

  async bootstrapAll() {
    let queue = Promise.resolve();

    this.pluginBlocks.forEach((_, pluginIndex) => {
      queue = queue.then(() => this.bootstrapPluginAtIndex(pluginIndex));
    });

    await queue;

    this.saveContextToCache();

    return this.context;
  }

  async bootstrapPluginAtIndex(index) {
    const pluginBlock = this.pluginBlocks[index];
    const { options } = pluginBlock;
    const plugin = this.pluginModules[index];
    const pluginName = this.getNameOfPluginAtIndex(index);
    const { defaults, overrides } = this.parsePluginOptions(plugin);

    if (typeof plugin.bootstrap === "function") {
      await plugin.bootstrap({
        context: this.context,
        getPluginContext: this.getContextForNamespace.bind(this, pluginName),
        log: this.log.bind(this, pluginName),
        options: Object.assign({}, defaults, options, overrides),
        refresh: this.transform.bind(this),
        setPluginContext: this.setContextForNamespace.bind(this, pluginName)
      });
    }

    pluginBlock._isBootstrapped = true;
  }

  getContext() {
    return this.context;
  }

  getContextForNamespace(namespace) {
    return this.context[namespace] || {};
  }

  getNameOfPluginAtIndex(index) {
    return this.pluginModules[index].name || `plugin_${index}`;
  }

  loadContextFromCache() {
    try {
      this.context = require(this.cacheFilePath);
    } catch (error) {
      this.context = {};
    }
  }

  loadPlugins(plugins) {
    this.pluginBlocks = plugins;

    plugins.forEach((plugin, index) => {
      this.pluginModules[index] = plugin.module;
    });
  }

  log(namespace, message) {
    if (this.runtimeParameters.quiet) {
      return;
    }

    console.log(`[${namespace}]`, message);
  }

  parsePluginOptions(plugin) {
    const { options } = plugin;

    if (!options) return {};

    const defaults = {};
    const overrides = {};

    Object.keys(options).forEach(key => {
      if (options[key].default !== undefined) {
        defaults[key] = options[key].default;
      }

      if (
        typeof options[key].runtimeParameter === "string" &&
        this.runtimeParameters[options[key].runtimeParameter] !== undefined
      ) {
        overrides[key] = this.runtimeParameters[options[key].runtimeParameter];
      }
    });

    return { defaults, overrides };
  }

  saveContextToCache() {
    const serializedCache = JSON.stringify(this.context);

    try {
      fs.writeFileSync(this.cacheFilePath, serializedCache);
    } catch (error) {
      console.log(error);
    }
  }

  setContextForNamespace(namespace, data) {
    this.context[namespace] = data;
  }

  setOptionsForPluginAtIndex(index, options) {
    this.pluginBlocks[index].options = options;
  }

  transform() {
    const data = {
      models: [],
      objects: []
    };

    let queue = Promise.resolve(data);

    this.pluginBlocks.forEach(({ _isBootstrapped, options }, index) => {
      if (!_isBootstrapped) return data;

      queue = queue.then(data => {
        const plugin = this.pluginModules[index];
        const pluginName = this.getNameOfPluginAtIndex(index);
        const { defaults, overrides } = this.parsePluginOptions(plugin);

        if (typeof plugin.transform === "function") {
          return plugin.transform({
            data,
            getPluginContext: this.getContextForNamespace.bind(
              this,
              pluginName
            ),
            log: this.log.bind(this, pluginName),
            options: Object.assign({}, defaults, options, overrides)
          });
        }

        return data;
      });
    });

    return queue;
  }
}

module.exports = Sourcebit;
