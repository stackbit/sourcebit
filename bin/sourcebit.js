#!/usr/bin/env node
require("dotenv").config();
const mri = require("mri");
const sourcebit = require("../index");
const path = require("path");

const { _: method, ...parameters } = mri(process.argv.slice(2));
const configPath = path.resolve(
  process.cwd(),
  parameters.config || "sourcebit.js"
);
const config = require(configPath);

if (typeof sourcebit[method] !== "function") {
  console.log("Usage: sourcebit fetch <parameters>");

  process.exit(1);
}

sourcebit[method](config, parameters);
