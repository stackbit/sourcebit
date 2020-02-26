const fs = require("fs");
const path = require("path");
const Sourcebit = require("./sourcebit");

const defaultCachePath = path.join(process.cwd(), ".sourcebit-cache.json");

jest.mock("fs");

beforeEach(() => {
  jest.resetModules();
});

describe("`bootstrapAll()`", () => {
  test("calls the `bootstrap` method of all plugins", async () => {
    const mockContextData = [
      { elements: ["Mercury", "Cadmium"] },
      { elements: ["Chromium", "Iron"] }
    ];
    const mockPlugin1 = {
      bootstrap: jest.fn(),
      name: "sourcebit-mock-plugin1"
    };
    const mockPlugin2 = {
      bootstrap: jest.fn(),
      name: "sourcebit-mock-plugin2"
    };
    const config = {
      plugins: [{ module: mockPlugin1 }, { module: mockPlugin2 }]
    };
    const sourcebit = new Sourcebit();

    jest.mock(defaultCachePath, () => ({}));

    sourcebit.loadPlugins(config.plugins);

    await sourcebit.bootstrapAll();

    expect(mockPlugin1.bootstrap).toHaveBeenCalledTimes(1);
    expect(mockPlugin2.bootstrap).toHaveBeenCalledTimes(1);
  });

  test("passes a `debug` and `log` methods to plugins", async () => {
    const mockPlugin1 = {
      bootstrap: jest.fn(({ debug, log }) => {
        expect(debug).toBeInstanceOf(Function);
        expect(log).toBeInstanceOf(Function);
      }),
      name: "sourcebit-mock-plugin1"
    };
    const mockPlugin2 = {
      bootstrap: jest.fn(({ debug, log }) => {
        expect(debug).toBeInstanceOf(Function);
        expect(log).toBeInstanceOf(Function);
      }),
      name: "sourcebit-mock-plugin2"
    };
    const config = {
      plugins: [{ module: mockPlugin1 }, { module: mockPlugin2 }]
    };
    const sourcebit = new Sourcebit();

    jest.mock(defaultCachePath, () => ({}));

    sourcebit.loadPlugins(config.plugins);

    await sourcebit.bootstrapAll();
  });

  test("passes an `options` block plugins", async () => {
    jest.mock(defaultCachePath, () => mockCache);

    const mockPluginBase = {
      name: "sourcebit-mock-plugin1",
      options: {
        forbiddenElement: {
          default: "Arsenic"
        },
        requiredElement: {
          default: "Oxygen",
          runtimeParameter: "require"
        }
      }
    };
    const mockPlugin1 = {
      ...mockPluginBase,
      bootstrap: jest.fn(({ options }) => {
        expect(options.forbiddenElement).toEqual(
          mockPluginBase.options.forbiddenElement.default
        );
        expect(options.requiredElement).toEqual(
          mockPluginBase.options.requiredElement.default
        );
      })
    };
    const mockPlugin2 = {
      ...mockPluginBase,
      bootstrap: jest.fn(({ options }) => {
        expect(options.forbiddenElement).toEqual("Cadmium");
        expect(options.requiredElement).toEqual("Calcium");
      })
    };
    const mockPlugin3 = {
      ...mockPluginBase,
      bootstrap: jest.fn(({ options }) => {
        expect(options.forbiddenElement).toEqual(
          mockPluginBase.options.forbiddenElement.default
        );
        expect(options.requiredElement).toEqual("Magnesium");
      })
    };
    const config1 = {
      plugins: [{ module: mockPlugin1 }]
    };
    const config2 = {
      plugins: [
        {
          module: mockPlugin2,
          options: { forbiddenElement: "Cadmium", requiredElement: "Calcium" }
        }
      ]
    };
    const config3 = {
      plugins: [
        { module: mockPlugin3, options: { requiredElement: "Calcium" } }
      ]
    };
    const sourcebit1 = new Sourcebit();
    const sourcebit2 = new Sourcebit();
    const sourcebit3 = new Sourcebit({
      runtimeParameters: {
        require: "Magnesium"
      }
    });

    sourcebit1.loadPlugins(config1.plugins);
    sourcebit2.loadPlugins(config2.plugins);
    sourcebit3.loadPlugins(config3.plugins);

    await sourcebit1.bootstrapAll();
    await sourcebit2.bootstrapAll();
    await sourcebit3.bootstrapAll();
  });

  test("passes a `getPluginContext` method to plugins", async () => {
    const mockCache = {
      "sourcebit-mock-plugin1": {
        elements: ["Bohrium", "Hassium"]
      }
    };
    const mockPlugin1 = {
      bootstrap: jest.fn(({ getPluginContext }) => {
        const context = getPluginContext();

        expect(context).toEqual(mockCache["sourcebit-mock-plugin1"]);
      }),
      name: "sourcebit-mock-plugin1"
    };
    const mockPlugin2 = {
      bootstrap: jest.fn(({ getPluginContext }) => {
        const context = getPluginContext();

        expect(context).toEqual({});
      }),
      name: "sourcebit-mock-plugin2"
    };
    const config = {
      plugins: [{ module: mockPlugin1 }, { module: mockPlugin2 }]
    };
    const sourcebit = new Sourcebit();

    jest.mock(defaultCachePath, () => mockCache);

    sourcebit.loadPlugins(config.plugins);

    await sourcebit.bootstrapAll();
  });

  test("passes a `refresh` method to plugins", async () => {
    const mockContextData = [
      { elements: ["Mercury", "Cadmium"] },
      { elements: ["Chromium", "Iron"] }
    ];
    const mockPlugin = {
      bootstrap: jest.fn(({ refresh, setPluginContext }) => {
        setPluginContext(mockContextData[0]);

        setTimeout(() => {
          setPluginContext(mockContextData[1]);

          refresh();
        }, 1000);
      }),
      name: "sourcebit-mock-plugin1"
    };
    const config = {
      plugins: [{ module: mockPlugin }]
    };
    const sourcebit = new Sourcebit();
    const transformSpy = jest.spyOn(sourcebit, "transform");

    jest.useFakeTimers();
    jest.mock(defaultCachePath, () => ({}));

    sourcebit.loadPlugins(config.plugins);

    await sourcebit.bootstrapAll();

    expect(sourcebit.context[mockPlugin.name]).toEqual(mockContextData[0]);
    expect(transformSpy).not.toHaveBeenCalled();

    jest.runAllTimers();

    expect(sourcebit.context[mockPlugin.name]).toEqual(mockContextData[1]);
    expect(transformSpy).toHaveBeenCalledTimes(1);
  });

  test("passes a `setPluginContext` method to plugins, which sets the context for the given plugin", async () => {
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
      plugins: [{ module: mockPlugin1 }, { module: mockPlugin2 }]
    };
    const sourcebit = new Sourcebit();

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
