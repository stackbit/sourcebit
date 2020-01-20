# Sourcebit

[![npm version](https://badge.fury.io/js/sourcebit.svg)](https://badge.fury.io/js/sourcebit)

> Sourcebit helps developers build data-driven JAMstack sites by pulling data from any third-party resource.

## Introduction

Sourcebit connects to multiple data sources using modular components called _source plugins_. These are responsible for fetching data, normalizing it to a standard format, and placing the resulting entries on sets of data called _data buckets_.

Subsequently, any combination of plugins may consume, transform and persist these data buckets in any way they like.

A specific group of plugins, called _target plugins_, is tasked with writing data into a format and location that other programs – such as static site generators – expect.

```
           +----------------+  +---------------+  +-----------------+
           |                |  |               |  |                 |
           |   Contentful   |  |    DatoCMS    |  |     Airtable    |
           |                |  |               |  |                 |
           +--------\-------+  +-------|-------+  +--------/--------+
                     \                 |                  /
                      \                |                 /
                       \               |                /
                        \              |               /
          +--------------|-------------|--------------|-------------+
          |              |             |              |             |
          |        +-----|-----+ +-----------+  +-----|-----+       |
        S |        | (Plugin)  | | (Plugin)  |  | (Plugin)  |       | S
        O |        |           | |           |  |           |       | O
        U |        +-----|-----+ +-----|-----+  +-----|-----+       | U
        R |              |             |              |             | R
        C |              |             |              |             | C
        E |        +-----|-----+ +-----|-----+  +-----|-----+       | E
        B |        | (Plugin)  | | (Plugin)  |  | (Plugin)  |       | B
        I |        |           | |           |  |           |       | I
        T |        +-----|-----+ +-----|-----+  +-----|-----+       | T
          |              |             |              |             |
          +--------------|-------------|--------------|-------------+
                        /              |               \
                       /               |                \
                      /                |                 \
                     /                 |                  \
                    /                  |                   \
          +--------/--------+ +--------|-------+   +----------------+
          |                 | |                |   |                |
          |     Next.js     | |     Jekyll     |   |      Hugo      |
          |                 | |                |   |                |
          +-----------------+ +----------------+   +----------------+

```

## Installation

Sourcebit is distributed as an [npm module](https://www.npmjs.com/package/sourcebit). To install it and add it as a dependency to your project, run:

```
npm install sourcebit --save
```

## Configuration

Everything about Sourcebit, including its plugins and their parameters, is configured in a JavaScript object that typically lives in a file called `sourcebit.js`.

It looks something like this:

```js
module.exports = {
  plugins: [
    {
      module: require("sourcebit-some-plugin-1"),
      options: {
        pluginOption1: "foo",
        pluginOptino2: "bar"
      }
    },
    {
      module: require("sourcebit-some-plugin-2"),
      options: {
        pluginFunction1: (a, b) => a + b
      }
    }
  ]
};
```

It's important to note that while every plugin block is defined with the `module` and `options` properties, the actual options passed to each options block varies widely and is defined (and should be documented) by each plugin.

### Interactive setup process

To ease the process of configuring Sourcebit, we've created a command-line tool that provides an interactive setup process. By asking you a series of questions defined by each plugin, this tool generates a `sourcebit.js` file so that you can get up and running in no time.

To start this process, run `npx create-sourcebit` or `npm init sourcebit` in your project directory.

## Usage

### As a CommonJS module

To use Sourcebit as a CommonJS module, include it in your project and call its `fetch` method.

```js
const sourcebit = require("sourcebit");
const sourcebitConfig = require("./sourcebit.js");

sourcebit.fetch(sourcebitConfig).then(data => {
  console.log(data);
});
```

### As a command-line tool

To use Sourcebit as a command-line tool, run the `sourcebit fetch` command in your project directory.

```
$ sourcebit fetch
```

## Plugins

### Source plugins

- [`sourcebit-source-contentful`](http://npmjs.com/package/sourcebit-source-contentful): A source plugin for the [Contentful](https://www.contentful.com/) headless CMS.

### Target plugins

- [`sourcebit-target-jekyll`](http://npmjs.com/package/sourcebit-target-jekyll): A target plugin for the [Jekyll](https://www.jekyllrb.com/) static site generator.

### Other plugins

- [`sourcebit-plugin-content-mapper`](http://npmjs.com/package/sourcebit-plugin-content-mapper): A plugin for creating different data buckets from content models.

> 🚀 If you're interested in creating your own plugin, you might want to check out our [sample plugin repository](https://github.com/stackbithq/sourcebit-sample-plugin), which contains a basic plugin with a fully-annotated source.
