const debug = require("debug");
const fs = require("fs");
const mkdirp = require("mkdirp");
const ora = require("ora");
const path = require("path");
const {
  writeFrontmatterMarkdown,
  writeJSON,
  writeYAML
} = require("./file-writers");

const FILE_WRITERS = {
  "frontmatter-md": writeFrontmatterMarkdown,
  json: writeJSON,
  yml: writeYAML
};

class Sourcebit {
  constructor({
    cacheFile = path.join(process.cwd(), ".sourcebit-cache.json"),
    runtimeParameters = {}
  } = {}) {
    this.cacheFilePath = cacheFile;
    this.context = {};
    this.fileWriterCache = [];
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
        debug: this.getDebugMethodForPlugin(pluginName),
        getPluginContext: this.getContextForNamespace.bind(this, pluginName),
        log: this.logFromPlugin.bind(this, pluginName),
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

  getDebugMethodForPlugin(pluginName) {
    return debug(`plugin:${pluginName}`);
  }

  getNameOfPluginAtIndex(index) {
    return this.pluginModules[index].name || `plugin-${index}`;
  }

  loadContextFromCache() {
    if (this.runtimeParameters.cache === false) return;

    try {
      this.context = require(this.cacheFilePath);
    } catch (error) {
      this.context = {};
    }
  }

  loadPlugins(plugins) {
    this.pluginBlocks = plugins;

    plugins.forEach((plugin, index) => {
      this.pluginModules[index] =
        typeof plugin === "function" ? { transform: plugin } : plugin.module;
    });
  }

  log(message, messageType = "info") {
    if (this.runtimeParameters.quiet) {
      return;
    }

    const oraMethod = ["succeed", "fail", "warn", "info"].includes(messageType)
      ? messageType
      : "info";

    return ora(message)[oraMethod]();
  }

  logFromPlugin(pluginName, message, messageType) {
    this.log(`${message}`, messageType);
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
    if (this.runtimeParameters.cache === false) return;

    const serializedCache = JSON.stringify(this.context);

    try {
      fs.writeFileSync(this.cacheFilePath, serializedCache);
    } catch (error) {
      console.log(error);
    }
  }

  setContextForNamespace(namespace, data) {
    this.context[namespace] = { ...this.context[namespace], ...data };
  }

  setOptionsForPluginAtIndex(index, options) {
    this.pluginBlocks[index].options = options;
  }

  writeFiles(files) {
    const filesByPath = files.reduce((result, file) => {
      const fullPath = path.resolve(process.cwd(), file.path);

      // If `append: true`, we'll append the content of the new writer to any
      // existing content at this path. If not, we'll overwrite it.
      if (result[fullPath] && file.append) {
        // Ensuring the existing content for this path is an array.
        result[fullPath].content = Array.isArray(result[fullPath].content)
          ? result[fullPath].content
          : [result[fullPath].content];
        result[fullPath].content.push(file.content);
      } else {
        result[fullPath] = file;
      }

      return result;
    }, {});

    // We start by deleting any files that were previously created by this plugin
    // but that are not part of the site after the update.
    this.fileWriterCache.forEach(filePath => {
      if (!filesByPath[filePath]) {
        try {
          fs.unlinkSync(filePath);

          this.log(`Deleted ${filePath}`, "info");
        } catch (_) {
          this.log(`Could not delete ${filePath}`, "fail");
        }
      }
    });

    this.fileWriterCache = Object.keys(filesByPath);

    // Now we write all the files that need to be created.
    const queue = Object.keys(filesByPath).map(async filePath => {
      const file = filesByPath[filePath];
      const writerFunction = FILE_WRITERS[file.format];

      if (typeof writerFunction !== "function") {
        this.log(
          `Could not create ${filePath}. "${file.format}" is not a supported format.`,
          "fail"
        );

        return;
      }

      // Ensuring the directory exists.
      mkdirp.sync(path.dirname(filePath));

      try {
        await writerFunction(filePath, file.content);

        this.log(`Created ${filePath}`, "succeed");

        return true;
      } catch (_) {
        this.log(`Could not create ${filePath}`, "fail");

        return false;
      }
    });

    return Promise.all(queue);
  }
}

module.exports = Sourcebit;
