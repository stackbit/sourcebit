const fs = require("fs");
const path = require("path");
const Sourcebit = require("./sourcebit");

const defaultCachePath = path.join(process.cwd(), ".sourcebit-cache.json");

jest.mock("fs");

beforeEach(() => {
  jest.resetModules();
});

describe("bootstrapping", () => {
  test("calls the `bootstrap` method of all plugins", async () => {
    const sourcebit = new Sourcebit();
    const mockContextData = [
      { elements: ["Mercury", "Cadmium"] },
      { elements: ["Chromium", "Iron"] }
    ];
    const mockPlugin1 = {
      bootstrap: jest.fn(({ setPluginContext }) => {
        setPluginContext(mockContextData[0]);
      }),
      name: "sourcebit-mock-plugin1"
    };
    const mockPlugin2 = {
      bootstrap: jest.fn(({ setPluginContext }) => {
        setPluginContext(mockContextData[1]);
      }),
      name: "sourcebit-mock-plugin2"
    };
    const config = {
      plugins: [
        {
          module: mockPlugin1
        },
        {
          module: mockPlugin2
        }
      ]
    };

    jest.mock(defaultCachePath, () => ({}));

    sourcebit.loadPlugins(config.plugins);

    await sourcebit.bootstrapAll();

    expect(sourcebit.context[mockPlugin1.name]).toEqual(mockContextData[0]);
    expect(sourcebit.context[mockPlugin2.name]).toEqual(mockContextData[1]);
  });
});

describe("cache", () => {
  const mockCache = {
    "sourcebit-source-periodic-table": {
      elements: ["Hydrogen", "Helium"]
    }
  };

  describe("if `runtimeParameters.cache` is `false`", () => {
    test("does not populate context with cache file's contents", () => {
      const sourcebit = new Sourcebit({
        runtimeParameters: {
          cache: false
        }
      });

      jest.mock(defaultCachePath, () => mockCache);

      sourcebit.loadContextFromCache();

      expect(sourcebit.context).toEqual({});
    });
  });

  describe("if `runtimeParameters.cache` is `true` or unset", () => {
    test("populates context with cache file's contents", () => {
      const sourcebit = new Sourcebit({
        runtimeParameters: {
          cache: true
        }
      });

      jest.mock(defaultCachePath, () => mockCache);

      sourcebit.loadContextFromCache();

      expect(sourcebit.context).toEqual(mockCache);
    });
  });
});
