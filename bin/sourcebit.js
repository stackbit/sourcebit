#!/usr/bin/env node
const commander = require('commander');
const sourcebit = require('../index');
const path = require('path');
const pkg = require('../package.json');

commander
    .version(pkg.version)
    .command('fetch')
    .option('-c, --configPath', 'specify the location of the configuration file')
    .option('-C, --cache', 'force Sourcebit to use a filesystem cache, even when `watch` is disabled')
    .option('-w, --watch', 'run continuously in watch mode')
    .option('-q, --quiet', 'disable logging messages to the console')
    .action(({ cache, configPath: customConfigPath, quiet, watch }) => {
        const configPath = path.resolve(process.cwd(), customConfigPath || 'sourcebit.js');
        const config = require(configPath);
        const runtimeParameters = {
            cache,
            quiet,
            watch
        };

        sourcebit.fetch(config, runtimeParameters);
    });

commander.on('command:*', () => {
    console.error('Invalid command: %s\nSee --help for a list of available commands.', commander.args.join(' '));

    process.exit(1);
});

commander.parse(process.argv);
