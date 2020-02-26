const path = require("path");

const defaultCachePath = path.join(process.cwd(), ".sourcebit-cache.json");

jest.useFakeTimers();
jest.mock("fs");

beforeEach(() => {
  jest.resetModules();
});

describe("`bootstrapAll()`", () => {
  test("calls the `bootstrap` method of all plugins", async () => {
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
    const Sourcebit = require("./sourcebit");
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
    const Sourcebit = require("./sourcebit");
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
    const Sourcebit = require("./sourcebit");
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
    const Sourcebit = require("./sourcebit");
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
    const Sourcebit = require("./sourcebit");
    const sourcebit = new Sourcebit();
    const transformSpy = jest.spyOn(sourcebit, "transform");

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
    const Sourcebit = require("./sourcebit");
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
      const Sourcebit = require("./sourcebit");
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
      const Sourcebit = require("./sourcebit");
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

describe("`getContext()`", () => {
  test("returns a snapshot of the entire context object", async () => {
    const mockCache = {
      "sourcebit-mock-plugin1": {
        elements: ["Bohrium", "Hassium"]
      }
    };

    jest.mock(defaultCachePath, () => mockCache);

    const Sourcebit = require("./sourcebit");
    const sourcebit = new Sourcebit();

    await sourcebit.bootstrapAll();

    expect(sourcebit.context).toEqual(mockCache);

    const clonedContext = sourcebit.getContext();

    delete clonedContext["sourcebit-mock-plugin1"];

    expect(clonedContext).toEqual({});
    expect(sourcebit.context).toEqual(mockCache);
  });
});

describe("`getNameOfPluginAtIndex()`", () => {
  test("returns the value of the plugin's `name` property", () => {
    const mockPlugin = {
      name: "sourcebit-mock-plugin1"
    };
    const config = {
      plugins: [{ module: mockPlugin }]
    };
    const Sourcebit = require("./sourcebit");
    const sourcebit = new Sourcebit();

    sourcebit.loadPlugins(config.plugins);

    expect(sourcebit.getNameOfPluginAtIndex(0)).toEqual(mockPlugin.name);
  });

  test("returns a default name for a plugin if it does not export a `name` property", () => {
    const mockPlugin = {};
    const config = {
      plugins: [{ module: mockPlugin }]
    };
    const Sourcebit = require("./sourcebit");
    const sourcebit = new Sourcebit();

    sourcebit.loadPlugins(config.plugins);

    expect(sourcebit.getNameOfPluginAtIndex(0)).toEqual("plugin-0");
  });
});

describe("`log()`", () => {
  test("does not print a message to the console if `runtimeParameters.quiet` is `true`", async () => {
    const mockInfoFn = jest.fn();
    const mockedOra = jest.fn(() => ({
      info: mockInfoFn
    }));

    jest.mock("ora", () => mockedOra);

    const mockMessage = "The only two non-silvery metals are gold and copper";
    const mockPlugin = {
      bootstrap: jest.fn(({ log }) => {
        log(mockMessage);
      }),
      name: "sourcebit-mock-plugin1"
    };
    const config = {
      plugins: [{ module: mockPlugin }]
    };
    const Sourcebit = require("./sourcebit");
    const sourcebit = new Sourcebit({
      runtimeParameters: {
        quiet: true
      }
    });

    sourcebit.loadPlugins(config.plugins);

    await sourcebit.bootstrapAll();

    expect(mockedOra).not.toHaveBeenCalled();
    expect(mockInfoFn).not.toHaveBeenCalledTimes(2);
  });

  test("prints a message to the console with an info prompt style as default", async () => {
    const mockInfoFn = jest.fn();
    const mockedOra = jest.fn(() => ({
      info: mockInfoFn
    }));

    jest.mock("ora", () => mockedOra);

    const mockMessage = "The only two non-silvery metals are gold and copper";
    const mockPlugin = {
      bootstrap: jest.fn(({ log }) => {
        log(mockMessage);
        log(mockMessage, "unknownType");
      }),
      name: "sourcebit-mock-plugin1"
    };
    const config = {
      plugins: [{ module: mockPlugin }]
    };
    const Sourcebit = require("./sourcebit");
    const sourcebit = new Sourcebit();

    sourcebit.loadPlugins(config.plugins);

    await sourcebit.bootstrapAll();

    expect(mockedOra).toHaveBeenCalledTimes(2);
    expect(mockedOra.mock.calls[0][0]).toEqual(mockMessage);
    expect(mockedOra.mock.calls[1][0]).toEqual(mockMessage);
    expect(mockInfoFn).toHaveBeenCalledTimes(2);
  });

  test("prints a message to the console with the supplied prompt style", async () => {
    const mockSucceedFn = jest.fn();
    const mockFailFn = jest.fn();
    const mockWarnFn = jest.fn();
    const mockInfoFn = jest.fn();
    const mockedOra = jest.fn(() => ({
      succeed: mockSucceedFn,
      fail: mockFailFn,
      warn: mockWarnFn,
      info: mockInfoFn
    }));

    jest.mock("ora", () => mockedOra);

    const mockMessage = "The only two non-silvery metals are gold and copper";
    const mockPlugin = {
      bootstrap: jest.fn(({ log }) => {
        log(mockMessage, "succeed");

        setTimeout(() => {
          log(mockMessage, "fail");
        }, 500);

        setTimeout(() => {
          log(mockMessage, "warn");
        }, 1500);

        setTimeout(() => {
          log(mockMessage, "info");
        }, 2500);
      }),
      name: "sourcebit-mock-plugin1"
    };
    const config = {
      plugins: [{ module: mockPlugin }]
    };
    const Sourcebit = require("./sourcebit");
    const sourcebit = new Sourcebit();

    sourcebit.loadPlugins(config.plugins);

    await sourcebit.bootstrapAll();

    expect(mockSucceedFn).toHaveBeenCalledTimes(1);
    expect(mockFailFn).toHaveBeenCalledTimes(0);
    expect(mockWarnFn).toHaveBeenCalledTimes(0);
    expect(mockInfoFn).toHaveBeenCalledTimes(0);

    jest.advanceTimersByTime(1000);

    expect(mockSucceedFn).toHaveBeenCalledTimes(1);
    expect(mockFailFn).toHaveBeenCalledTimes(1);
    expect(mockWarnFn).toHaveBeenCalledTimes(0);
    expect(mockInfoFn).toHaveBeenCalledTimes(0);

    jest.advanceTimersByTime(1000);

    expect(mockSucceedFn).toHaveBeenCalledTimes(1);
    expect(mockFailFn).toHaveBeenCalledTimes(1);
    expect(mockWarnFn).toHaveBeenCalledTimes(1);
    expect(mockInfoFn).toHaveBeenCalledTimes(0);

    jest.advanceTimersByTime(1000);

    expect(mockSucceedFn).toHaveBeenCalledTimes(1);
    expect(mockFailFn).toHaveBeenCalledTimes(1);
    expect(mockWarnFn).toHaveBeenCalledTimes(1);
    expect(mockInfoFn).toHaveBeenCalledTimes(1);

    expect(mockedOra).toHaveBeenCalledTimes(4);
    expect(mockedOra.mock.calls[0][0]).toEqual(mockMessage);
    expect(mockedOra.mock.calls[1][0]).toEqual(mockMessage);
    expect(mockedOra.mock.calls[2][0]).toEqual(mockMessage);
    expect(mockedOra.mock.calls[3][0]).toEqual(mockMessage);
  });
});
