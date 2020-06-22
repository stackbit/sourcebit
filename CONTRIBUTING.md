# Contributing guidelines

## Linting and code formatting

This repository uses [Prettier](https://prettier.io/) to standardize code formatting. To validate the format, run `npm run format`.

## Running locally

1. Clone the repository and install the project's dependencies

    ```
    git clone https://github.com/stackbithq/sourcebit.git /Users/foobar/sourcebit
    cd /Users/foobar/sourcebit
    npm install
    ```

2. Navigate to a directory where there's a [`sourcebit.js` configuration file](https://github.com/stackbithq/sourcebit#manual-configuration) and run the Sourcebit binary

    ```
    cd /Users/foobar/my-project
    node /Users/foobar/sourcebit/bin/sourcebit.js fetch
    ```

## Creating a plugin

If you want to create your own plugin, be sure to check our [sample plugin](https://github.com/stackbithq/sourcebit-sample-plugin) and the [documentation wiki](https://github.com/stackbithq/sourcebit/wiki).
