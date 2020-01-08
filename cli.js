const mri = require("mri");
const sourcebit = require("./index");
const { _: method, ...parameters } = mri(process.argv.slice(2));

sourcebit.setParameters(parameters);
sourcebit[method]();
