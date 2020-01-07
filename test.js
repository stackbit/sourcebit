const sourcebit = require("./index");

sourcebit.fetch({
  plugins: [
    {
      module: require("../sourcebit-source-mock"),
      name: "sourcebit-source-mock",
      options: {}
    }
  ]
});
