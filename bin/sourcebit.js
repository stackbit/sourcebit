#!/usr/bin/env node
require("dotenv").config();
const commander = require("commander");
const mri = require("mri");
const sourcebit = require("../index");
const path = require("path");
const pkg = require("../package.json");

commander
  .version(pkg.version)
  .command("fetch")
  .option("-c, --configPath", "specify the location of the configuration file")
  .option("-w, --watch", "run continuously in watch mode")
  .action(({ configPath: customConfigPath, watch }) => {
    const configPath = path.resolve(
      process.cwd(),
      customConfigPath || "sourcebit.js"
    );
    const config = require(configPath);
    const runtimeParameters = {
      watch
    };

    sourcebit.fetch(config, runtimeParameters);
  });

commander.parse(process.argv);
