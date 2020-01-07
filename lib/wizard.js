const chalk = require("chalk");
const inquirer = require("inquirer");

class Wizard {
  loadPlugins(pluginNames) {
    const plugins = {};

    pluginNames.forEach(pluginName => {
      const plugin = require(pluginName);

      // The wizard is only interested in plugins that export both a
      // `getSetup` and `getOptionsFromSetup` methods.
      if (
        typeof plugin.getSetup === "function" &&
        typeof plugin.getOptionsFromSetup === "function"
      ) {
        plugins[pluginName] = plugin;
      }
    });

    return plugins;
  }

  async start() {
    // (!) Temporary. Needs to do a lookup on a plugin registry.
    const availablePlugins = [
      {
        name: "../../sourcebit-source-mock",
        description: "A mock source plugin for Sourcebit"
      },
      {
        name: "../../sourcebit-source-contentful",
        description: "A Contentful source plugin for Sourcebit"
      }
    ];
    const questions = [
      {
        type: "checkbox",
        name: "plugins",
        message: "Select one or more plugins to add and configure",
        choices: availablePlugins.map(plugin => ({
          name: `${plugin.name} (${plugin.description})`,
          value: plugin.name
        }))
      }
    ];

    const answers = await inquirer.prompt(questions);
    const pluginModules = this.loadPlugins(answers.plugins);

    let config = Promise.resolve([]);

    answers.plugins.forEach((pluginName, pluginIndex, plugins) => {
      config = config.then(async config => {
        console.log(
          `\nConfiguring plugin ${pluginIndex + 1} of ${
            plugins.length
          }: ${chalk.bold(pluginName)}\n`
        );

        const pluginModule = pluginModules[pluginName];
        const pluginQuestions = pluginModule.getSetup();
        const answers = await inquirer.prompt(pluginQuestions);
        const pluginOptions = pluginModule.getOptionsFromSetup(answers);

        return config.concat({
          name: pluginName,
          options: pluginOptions
        });
      });
    });

    return config;
  }
}

module.exports = Wizard;
