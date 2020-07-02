const debug = require('debug');
const fs = require('fs');
const mkdirp = require('mkdirp');
const ora = require('ora');
const path = require('path');
const { cloneDeep } = require('lodash');
const { writeFrontmatterMarkdown, writeJSON, writeYAML } = require('./file-writers');

const FILE_WRITERS = {
    'frontmatter-md': writeFrontmatterMarkdown,
    json: writeJSON,
    yml: writeYAML
};

class Sourcebit {
    constructor({ cacheFile = path.join(process.cwd(), '.sourcebit-cache.json'), runtimeParameters = {}, transformCallback } = {}) {
        this.cacheFilePath = cacheFile;
        this.context = {};
        this.fileWriterCache = [];
        this.onTransform = transformCallback;
        this.pluginBlocks = [];
        this.pluginModules = {};
        this.runtimeParameters = runtimeParameters;

        this.isCacheEnabled = Boolean(runtimeParameters.cache === undefined ? runtimeParameters.watch : runtimeParameters.cache);
    }

    async bootstrapAll() {
        this.isBootstrapping = true;

        let queue = Promise.resolve();

        this.context = this.loadContextFromCache() || {};

        this.pluginBlocks.forEach((_, pluginIndex) => {
            queue = queue.then(() => this.bootstrapPluginAtIndex(pluginIndex));
        });

        await queue;

        this.isBootstrapping = false;

        this.saveContextToCache();
    }

    async bootstrapPluginAtIndex(index) {
        const pluginBlock = this.pluginBlocks[index];
        const { options } = pluginBlock;
        const plugin = this.pluginModules[index];
        const pluginName = this.getNameOfPluginAtIndex(index);

        if (typeof plugin.bootstrap === 'function') {
            await plugin.bootstrap({
                debug: this.getDebugMethodForPlugin(pluginName),
                getPluginContext: this.getContextForNamespace.bind(this, pluginName),
                log: this.logFromPlugin.bind(this),
                options: this.parsePluginOptions(plugin, options),
                refresh: this.transform.bind(this),
                setPluginContext: this.setContextForNamespace.bind(this, pluginName)
            });
        }

        pluginBlock._isBootstrapped = true;
    }

    debug(...parameters) {
        return this.getDebugMethodForCore().call(this, parameters);
    }

    getContext() {
        return cloneDeep(this.context);
    }

    getContextForNamespace(namespace) {
        return this.context[namespace] ? cloneDeep(this.context[namespace]) : {};
    }

    getDebugMethodForCore() {
        return debug('core');
    }

    getDebugMethodForPlugin(pluginName) {
        return debug(`plugin:${pluginName}`);
    }

    getNameOfPluginAtIndex(index) {
        return this.pluginModules[index].name || `plugin-${index}`;
    }

    loadContextFromCache() {
        if (!this.isCacheEnabled) return;

        try {
            const data = fs.readFileSync(this.cacheFilePath, 'utf8');

            return JSON.parse(data);
        } catch (error) {
            this.debug(error);
        }
    }

    loadPlugins(plugins) {
        this.pluginBlocks = plugins;
        this.pluginModules = plugins.map(plugin => {
            if (typeof plugin === 'function') {
                return { transform: plugin };
            }

            return plugin.module;
        });
    }

    log(message, messageType = 'info') {
        if (this.runtimeParameters.quiet) {
            return;
        }

        const oraMethod = ['succeed', 'fail', 'warn', 'info'].includes(messageType) ? messageType : 'info';

        return ora(message)[oraMethod]();
    }

    logFromPlugin(message, messageType) {
        this.log(`${message}`, messageType);
    }

    parsePluginOptions(plugin, optionsFromConfig) {
        const { options: optionsSchema = {} } = plugin;

        const defaults = {};
        const overrides = {};

        Object.keys(optionsSchema).forEach(key => {
            if (optionsSchema[key].default !== undefined) {
                defaults[key] = optionsSchema[key].default;
            }

            if (
                typeof optionsSchema[key].runtimeParameter === 'string' &&
                this.runtimeParameters[optionsSchema[key].runtimeParameter] !== undefined
            ) {
                overrides[key] = this.runtimeParameters[optionsSchema[key].runtimeParameter];
            }
        });

        return Object.assign({}, defaults, optionsFromConfig, overrides);
    }

    saveContextToCache() {
        if (!this.isCacheEnabled) return;

        const serializedCache = JSON.stringify(this.context);

        try {
            fs.writeFileSync(this.cacheFilePath, serializedCache);
        } catch (error) {
            this.debug(error);
        }
    }

    setContextForNamespace(namespace, data) {
        this.context[namespace] = { ...this.context[namespace], ...data };
    }

    setOptionsForPluginAtIndex(index, options) {
        this.pluginBlocks[index].options = options;
    }

    async transform() {
        if (this.isBootstrapping || this.isTransforming) {
            if (this.isTransforming) {
                this.isTransformQueued = true;
            }

            return;
        }

        this.isTransforming = true;

        const initialData = {
            files: [],
            models: [],
            objects: []
        };
        const contextSnapshot = cloneDeep(this.context);

        this.pluginBlocks.forEach((pluginBlock, index) => {
            const plugin = this.pluginModules[index];
            const pluginName = this.getNameOfPluginAtIndex(index);

            if (typeof plugin.onTransformStart === 'function') {
                plugin.onTransformStart({
                    debug: this.getDebugMethodForPlugin(pluginName),
                    getPluginContext: () => contextSnapshot[pluginName] || {},
                    log: this.logFromPlugin.bind(this),
                    options: this.parsePluginOptions(plugin, pluginBlock.options)
                });
            }
        });

        const onTransformEndCallbacks = [];
        const queue = this.pluginBlocks.reduce((queue, pluginBlock, index) => {
            // If the plugin hasn't been bootstrapped, we don't want to run its
            // transform method just yet.
            if (!pluginBlock._isBootstrapped) {
                return queue;
            }

            return queue.then(data => {
                const plugin = this.pluginModules[index];
                const pluginName = this.getNameOfPluginAtIndex(index);

                if (typeof plugin.onTransformEnd === 'function') {
                    onTransformEndCallbacks.push({
                        args: {
                            debug: this.getDebugMethodForPlugin(pluginName),
                            getPluginContext: () => contextSnapshot[pluginName] || {},
                            log: this.logFromPlugin.bind(this),
                            options: this.parsePluginOptions(plugin, pluginBlock.options)
                        },
                        callback: plugin.onTransformEnd
                    });
                }

                if (typeof plugin.transform !== 'function') {
                    return data;
                }

                return plugin.transform({
                    data,
                    debug: this.getDebugMethodForPlugin(pluginName),
                    getPluginContext: () => contextSnapshot[pluginName] || {},
                    log: this.logFromPlugin.bind(this),
                    options: this.parsePluginOptions(plugin, pluginBlock.options)
                });
            });
        }, Promise.resolve(initialData));

        const finishTransform = () => {
            this.isTransforming = false;

            if (this.isTransformQueued) {
                this.isTransformQueued = false;

                this.transform();
            }
        };

        try {
            const data = await queue;

            finishTransform();

            if (Array.isArray(data.files)) {
                await this.writeFiles(data.files);
            }

            onTransformEndCallbacks.forEach(({ args, callback }) => {
                callback({ ...args, data });
            });

            if (typeof this.onTransform === 'function') {
                this.onTransform(null, data);
            }

            return data;
        } catch (error) {
            this.log(`An error occurred when processing the plugins: ${error.message}.`, 'fail');

            this.debug(error);

            finishTransform();

            if (typeof this.onTransform === 'function') {
                this.onTransform(error);
            }
        }
    }

    writeFiles(files) {
        const filesByPath = files.reduce((result, file) => {
            if (!file.path || typeof file.path !== 'string') {
                this.log(
                    'One of the plugins tried to write a file but failed to provide a valid file path. Please check your configuration.',
                    'warn'
                );

                return result;
            }

            const fullPath = path.resolve(process.cwd(), file.path);

            // If `append: true`, we'll append the content of the new writer to any
            // existing content at this path. If not, we'll overwrite it.
            if (result[fullPath] && file.append) {
                // Ensuring the existing content for this path is an array.
                result[fullPath].content = Array.isArray(result[fullPath].content) ? result[fullPath].content : [result[fullPath].content];
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

                    this.log(`Deleted ${filePath}`, 'info');
                } catch (error) {
                    this.debug(error);
                    this.log(`Could not delete ${filePath}`, 'fail');
                }
            }
        });

        this.fileWriterCache = Object.keys(filesByPath);

        // Now we write all the files that need to be created.
        const queue = Object.keys(filesByPath).map(async filePath => {
            const file = filesByPath[filePath];
            const writerFunction = FILE_WRITERS[file.format];

            if (typeof writerFunction !== 'function') {
                this.log(`Could not create ${filePath}. "${file.format}" is not a supported format.`, 'fail');

                return;
            }

            // Ensuring the directory exists.
            mkdirp.sync(path.dirname(filePath));

            try {
                await writerFunction(filePath, file.content);

                this.log(`Created ${filePath}`, 'succeed');

                return true;
            } catch (error) {
                this.debug(error);
                this.log(`Could not create ${filePath}`, 'fail');

                return false;
            }
        });

        return Promise.all(queue);
    }
}

module.exports = Sourcebit;
