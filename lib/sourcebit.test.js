const fs = require("fs");
const ora = require("ora");
const path = require("path");
const Sourcebit = require("./sourcebit");

const defaultCachePath = path.join(process.cwd(), ".sourcebit-cache.json");

let mockCache;

jest.mock("fs");

fs.readFileSync = jest.fn(filePath => {
  if (filePath === defaultCachePath) {
    return JSON.stringify(mockCache);
  }

  return "";
});

const mockOra = {
  succeed: jest.fn(),
  fail: jest.fn(),
  warn: jest.fn(),
  info: jest.fn()
};

jest.mock("ora", () => jest.fn(() => mockOra));

beforeEach(() => {
  mockCache = {};
});

afterEach(() => {
  jest.clearAllMocks();
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
    const sourcebit = new Sourcebit();

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

    sourcebit.loadPlugins(config.plugins);

    await sourcebit.bootstrapAll();
  });

  test("passes an `options` block plugins", async () => {
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

    sourcebit1.__id = Math.random();
    sourcebit2.__id = Math.random();
    sourcebit3.__id = Math.random();

    sourcebit1.loadPlugins(config1.plugins);
    sourcebit2.loadPlugins(config2.plugins);
    sourcebit3.loadPlugins(config3.plugins);

    await sourcebit1.bootstrapAll();
    await sourcebit2.bootstrapAll();
    await sourcebit3.bootstrapAll();
  });

  test("passes a `getPluginContext` method to plugins", async () => {
    mockCache = {
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

    sourcebit.loadPlugins(config.plugins);

    await sourcebit.bootstrapAll();
  });

  test("passes a `refresh` method to plugins", async () => {
    jest.useFakeTimers();

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

    sourcebit.loadPlugins(config.plugins);

    await sourcebit.bootstrapAll();

    expect(sourcebit.context[mockPlugin.name]).toEqual(mockContextData[0]);
    expect(transformSpy).not.toHaveBeenCalled();

    jest.runAllTimers();

    expect(sourcebit.context[mockPlugin.name]).toEqual(mockContextData[1]);
    expect(transformSpy).toHaveBeenCalledTimes(1);

    jest.useRealTimers();
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

    sourcebit.loadPlugins(config.plugins);

    await sourcebit.bootstrapAll();

    expect(sourcebit.context[mockPlugin1.name]).toEqual(mockContextData[0]);
    expect(sourcebit.context[mockPlugin2.name]).toEqual(mockContextData[1]);
  });
});

describe("cache", () => {
  describe("if `runtimeParameters.cache` is `false`", () => {
    test("does not populate context with cache file's contents", () => {
      mockCache = {
        "sourcebit-source-periodic-table": {
          elements: ["Hydrogen", "Helium"]
        }
      };

      const sourcebit = new Sourcebit({
        runtimeParameters: {
          cache: false
        }
      });

      sourcebit.loadContextFromCache();

      expect(sourcebit.context).toEqual({});
    });

    test("persists context to cache file", async () => {
      mockCache = {
        "sourcebit-source-periodic-table": {
          elements: ["Hydrogen", "Helium"]
        }
      };

      const plugins = [
        {
          module: {
            name: "sourcebit-test1",
            bootstrap: ({ setPluginContext }) => {
              setPluginContext({
                entries: [{ name: "A" }]
              });
            }
          }
        }
      ];
      const sourcebit = new Sourcebit({
        runtimeParameters: {
          cache: true
        }
      });

      sourcebit.loadPlugins(plugins);

      await sourcebit.bootstrapAll();

      const [filePath, fileContents] = fs.writeFileSync.mock.calls[0];

      expect(filePath).toBe(defaultCachePath);
      expect(fileContents).toEqual(JSON.stringify(sourcebit.context));
    });

    test("does not persist context to cache file", async () => {
      mockCache = {
        "sourcebit-source-periodic-table": {
          elements: ["Hydrogen", "Helium"]
        }
      };

      const plugins = [
        {
          module: {
            name: "sourcebit-test1",
            bootstrap: ({ setPluginContext }) => {
              setPluginContext({
                entries: [{ name: "A" }]
              });
            }
          }
        }
      ];
      const sourcebit = new Sourcebit({
        runtimeParameters: {
          cache: false
        }
      });

      sourcebit.loadPlugins(plugins);

      await sourcebit.bootstrapAll();

      expect(fs.writeFileSync).not.toHaveBeenCalled();
    });
  });

  describe("if `runtimeParameters.cache` is `true` or unset", () => {
    test("populates context with cache file's contents", () => {
      const sourcebit = new Sourcebit({
        runtimeParameters: {
          cache: true
        }
      });

      jest.mock(defaultCachePath, () => mockCache, { virtual: true });

      sourcebit.loadContextFromCache();

      expect(sourcebit.context).toEqual(mockCache);
    });
  });
});

describe("`getContext()`", () => {
  test("returns a snapshot of the entire context object", async () => {
    mockCache = {
      "sourcebit-mock-plugin1": {
        elements: ["Bohrium", "Hassium"]
      }
    };

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
    const sourcebit = new Sourcebit();

    sourcebit.loadPlugins(config.plugins);

    expect(sourcebit.getNameOfPluginAtIndex(0)).toEqual(mockPlugin.name);
  });

  test("returns a default name for a plugin if it does not export a `name` property", () => {
    const mockPlugin = {};
    const config = {
      plugins: [{ module: mockPlugin }]
    };
    const sourcebit = new Sourcebit();

    sourcebit.loadPlugins(config.plugins);

    expect(sourcebit.getNameOfPluginAtIndex(0)).toEqual("plugin-0");
  });
});

describe("`log()`", () => {
  test("does not print a message to the console if `runtimeParameters.quiet` is `true`", async () => {
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
    const sourcebit = new Sourcebit({
      runtimeParameters: {
        quiet: true
      }
    });

    sourcebit.loadPlugins(config.plugins);

    await sourcebit.bootstrapAll();

    expect(ora).not.toHaveBeenCalled();
    expect(mockOra.info).not.toHaveBeenCalledTimes(2);
  });

  test("prints a message to the console with an info prompt style as default", async () => {
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
    const sourcebit = new Sourcebit();

    sourcebit.loadPlugins(config.plugins);

    await sourcebit.bootstrapAll();

    expect(ora).toHaveBeenCalledTimes(2);
    expect(ora.mock.calls[0][0]).toEqual(mockMessage);
    expect(ora.mock.calls[1][0]).toEqual(mockMessage);
    expect(mockOra.info).toHaveBeenCalledTimes(2);
  });

  test("prints a message to the console with the supplied prompt style", async () => {
    jest.useFakeTimers();

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
    const sourcebit = new Sourcebit();

    sourcebit.loadPlugins(config.plugins);

    await sourcebit.bootstrapAll();

    expect(mockOra.succeed).toHaveBeenCalledTimes(1);
    expect(mockOra.fail).toHaveBeenCalledTimes(0);
    expect(mockOra.warn).toHaveBeenCalledTimes(0);
    expect(mockOra.info).toHaveBeenCalledTimes(0);

    jest.advanceTimersByTime(1000);

    expect(mockOra.succeed).toHaveBeenCalledTimes(1);
    expect(mockOra.fail).toHaveBeenCalledTimes(1);
    expect(mockOra.warn).toHaveBeenCalledTimes(0);
    expect(mockOra.info).toHaveBeenCalledTimes(0);

    jest.advanceTimersByTime(1000);

    expect(mockOra.succeed).toHaveBeenCalledTimes(1);
    expect(mockOra.fail).toHaveBeenCalledTimes(1);
    expect(mockOra.warn).toHaveBeenCalledTimes(1);
    expect(mockOra.info).toHaveBeenCalledTimes(0);

    jest.advanceTimersByTime(1000);

    expect(mockOra.succeed).toHaveBeenCalledTimes(1);
    expect(mockOra.fail).toHaveBeenCalledTimes(1);
    expect(mockOra.warn).toHaveBeenCalledTimes(1);
    expect(mockOra.info).toHaveBeenCalledTimes(1);

    expect(ora).toHaveBeenCalledTimes(4);
    expect(ora.mock.calls[0][0]).toEqual(mockMessage);
    expect(ora.mock.calls[1][0]).toEqual(mockMessage);
    expect(ora.mock.calls[2][0]).toEqual(mockMessage);
    expect(ora.mock.calls[3][0]).toEqual(mockMessage);

    jest.useRealTimers();
  });
});

describe("`setOptionsForPluginAtIndex()`", () => {
  test("sets the options block for the plugin at the given index", async () => {
    const mockPluginBase = {
      name: "sourcebit-mock-plugin1",
      options: {
        forbiddenElement: {
          default: "Arsenic"
        }
      }
    };
    const mockPlugin1 = {
      ...mockPluginBase,
      bootstrap: jest.fn(({ options }) => {
        expect(options.forbiddenElement).toEqual("Cobalt");
      })
    };
    const mockPlugin2 = {
      ...mockPluginBase,
      bootstrap: jest.fn(({ options }) => {
        expect(options.forbiddenElement).toEqual("Ruthenium");
      })
    };
    const config = {
      plugins: [
        { module: mockPlugin1, options: { forbiddenElement: "Cobalt" } },
        { module: mockPlugin2, options: { forbiddenElement: "Cobalt" } }
      ]
    };
    const sourcebit = new Sourcebit();

    sourcebit.loadPlugins(config.plugins);
    sourcebit.setOptionsForPluginAtIndex(1, {
      forbiddenElement: "Ruthenium"
    });

    await sourcebit.bootstrapAll();
  });
});

describe("`transform()`", () => {
  test("waits for one invokation to call all plugins before running another one", async () => {
    const plugins = [
      {
        module: {
          name: "sourcebit-test1",
          bootstrap: ({ refresh, setPluginContext }) => {
            setPluginContext({
              entries: [{ name: "A" }]
            });
            setTimeout(() => {
              setPluginContext({
                entries: [{ name: "B" }]
              });
              refresh();
            }, 20);
          },
          transform: async ({ data, getPluginContext }) => {
            await new Promise(resolve => {
              setTimeout(resolve, 50);
            });
            const context = getPluginContext();

            return {
              ...data,
              objects: context.entries
            };
          }
        }
      },
      {
        module: {
          name: "sourcebit-test2",
          transform: ({ data }) => {
            return {
              ...data,
              objects: data.objects.map(entry => ({
                ...entry,
                name: entry.name.toLowerCase()
              }))
            };
          }
        }
      }
    ];

    const callback = jest.fn();
    const sourcebit = new Sourcebit();

    sourcebit.onTransform = callback;
    sourcebit.loadPlugins(plugins);

    await sourcebit.bootstrapAll();
    await sourcebit.transform();

    await new Promise(resolve => {
      setTimeout(() => {
        expect(callback).toHaveBeenCalledTimes(2);

        const data1 = callback.mock.calls[0][1];
        const data2 = callback.mock.calls[1][1];

        expect(data1.objects.length).toBe(1);
        expect(data1.objects[0]).toEqual({ name: "a" });

        expect(data2.objects.length).toBe(1);
        expect(data2.objects[0]).toEqual({ name: "b" });

        resolve();
      }, 100);
    });
  });

  test("does not run a plugin's `transform()` method if the plugin hasn't been bootstrapped", async () => {
    const transformFn = jest.fn();
    const plugins = [
      {
        module: {
          name: "sourcebit-test1",
          bootstrap: ({ setPluginContext }) => {
            setPluginContext({
              entries: [{ name: "A" }]
            });
          },
          transform: transformFn
        }
      }
    ];
    const callback = jest.fn();
    const sourcebit = new Sourcebit();

    sourcebit.onTransform = callback;
    sourcebit.loadPlugins(plugins);

    await sourcebit.transform();

    expect(transformFn).not.toHaveBeenCalled();
  });

  test("infers a plugin to be a transform method when it's declared as a function, rather than an object, in the `plugins` array", async () => {
    const plugins = [
      {
        module: {
          name: "sourcebit-test2",
          transform: ({ data }) => {
            return {
              ...data,
              objects: data.objects.concat([{ name: "Hafnium" }])
            };
          }
        }
      },
      ({ data }) => ({
        ...data,
        objects: data.objects.concat([{ name: "Yttrium" }])
      })
    ];
    const sourcebit = new Sourcebit();

    sourcebit.loadPlugins(plugins);

    await sourcebit.bootstrapAll();

    const data = await sourcebit.transform();

    expect(data.objects.length).toBe(2);
    expect(data.objects[0]).toEqual({ name: "Hafnium" });
    expect(data.objects[1]).toEqual({ name: "Yttrium" });
  });
});
