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

If you want to create your own plugin, be sure to check our [sample plugin](https://github.com/stackbithq/sourcebit-sample-plugin), which includes a fully-annotated source to explain all the methods that you can implement, their arguments and the expected return values.

### Adding plugin to registry

If you'd like your plugin to appear as an option within the [interactive setup process](https://github.com/stackbithq/create-sourcebit), you'll need add your plugin to [`plugins.json`](https://github.com/stackbithq/create-sourcebit/blob/master/plugins.json) (including all the properties described [here](https://github.com/stackbithq/create-sourcebit#plugin-registry)) and submit a pull request.

### Conventions for source plugins

Source plugins are expected to add data to two specific data buckets.

#### `models`

Products like content management systems typically have the concept of models or content types. Source plugins are expected to add information about these models to the `models` data bucket, as objects with the following properties:

| Property             | Type   | Description                                                 | Example                       |
| -------------------- | ------ | ----------------------------------------------------------- | ----------------------------- |
| `source`             | String | The name of the source plugin as used in its `package.json` | `sourcebit-source-contentful` |
| `modelName`          | String | The ID or machine-friendly name of the model                | `blog`                        |
| `modelLabel`         | String | The human-friendly name of the model                        | `Blog Posts`                  |
| `projectId`          | String | The ID of the project within the source platform            | Contentful space ID           |
| `projectEnvironment` | String | The environment within the source platform                  | Contentful space environment  |

#### `objects`

The `objects` data bucket contains all entries coming from the various data sources. Source plugins must normalize all entries before adding them to the data bucket. This normalization consists of adding a property called `__metadata`, containing an object with the following properties:

| Property             | Type   | Description                                                 | Example                       |
| -------------------- | ------ | ----------------------------------------------------------- | ----------------------------- |
| `source`             | String | The name of the source plugin as used in its `package.json` | `sourcebit-source-contentful` |
| `modelName`          | String | The ID or machine-friendly name of the model                | `blog`                        |
| `modelLabel`         | String | The human-friendly name of the model                        | `Blog Posts`                  |
| `projectId`          | String | The ID of the project within the source platform            | Contentful space ID           |
| `projectEnvironment` | String | The environment within the source platform                  | Contentful space environment  |
| `createdAt`          | String | The ISO 8601 representation of the entry's creation date    | `2011-10-05T14:48:00.000Z`    |
| `updatedAt`          | String | The ISO 8601 representation of the entry's last update date | `2011-10-05T15:30:00.000Z`    |

Additionally, all content fields should be placed at the root level of the entry object with the ID field named `id`.

- 🚫

  ```json
  {
    "type": "blog",
    "meta": {
      "_id": "123456789",
      "created_at": "2011-10-05T14:48:00.000Z",
      "updated_at": "2011-10-05T15:30:00.000Z"
    },
    "fields": {
      "title": "Normalizing entries",
      "subtitle": "Because normal is good"
    }
  }
  ```

- ✅

  ```json
  {
    "id": "123456789",
    "title": "Normalizing entries",
    "subtitle": "Because normal is good",
    "__metadata": {
      "source": "source-source-contentful",
      "modelName": "blog",
      "modelLabel": "Blog posts",
      "projectId": "1q2w3e4r",
      "projectEnvironment": "master",
      "createdAt": "2011-10-05T14:48:00.000Z",
      "updatedAt": "2011-10-05T15:30:00.000Z"
    }
  }
  ```
