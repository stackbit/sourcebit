class Sourcebit {
  constructor() {
    this.context = {};
  }

  runBootstrap(plugins) {
    let queue = Promise.resolve();

    plugins.forEach(({ name, module, options }) => {
      queue = queue.then(() => {
        // (!) This is temporary. Eventually, `plugin` will be a `require()` call
        // using the name of the plugin.
        const plugin = module;

        if (typeof plugin.bootstrap === "function") {
          return plugin.bootstrap({
            context: this.context,
            options: Object.assign({}, options, { name }),
            refresh: this.runTransform.bind(this, plugins),
            setContext: this.setContext.bind(this, name)
          });
        }
      });
    });

    return queue.then(() => this.context);
  }

  runTransform(plugins) {
    const objects = [];

    let queue = Promise.resolve(objects);

    plugins.forEach(({ name, module, options }) => {
      queue = queue.then(objects => {
        // (!) This is temporary. Eventually, `plugin` will be a `require()` call
        // using the name of the plugin.
        const plugin = module;

        if (typeof plugin.transform === "function") {
          return plugin.transform({
            context: this.context,
            objects,
            options: Object.assign({}, options, { name })
          });
        }

        return objects;
      });
    });

    return queue;
  }

  setContext(namespace, data) {
    this.context[namespace] = data;
  }
}

module.exports = Sourcebit;
