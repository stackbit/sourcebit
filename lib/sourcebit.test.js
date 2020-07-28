const fs = require('fs');
const ora = require('ora');
const path = require('path');
const util = require('util');
const yaml = require('yaml');

const defaultCachePath = path.join(process.cwd(), '.sourcebit-cache.json');

let mockCache;

jest.mock('fs');

fs.readFileSync = jest.fn(filePath => {
    if (filePath === defaultCachePath) {
        return JSON.stringify(mockCache);
    }

    return '';
});

const mockPromisifiedFunction = jest.fn();

util.promisify = jest.fn(() => mockPromisifiedFunction);

const mockOra = {
    succeed: jest.fn(),
    fail: jest.fn(),
    warn: jest.fn(),
    info: jest.fn()
};

jest.mock('ora', () => jest.fn(() => mockOra));

process.env.FORBIDDEN_ELEMENT = 'Cadmium';

const Sourcebit = require('./sourcebit');

beforeEach(() => {
    mockCache = {};
});

afterEach(() => {
    jest.clearAllMocks();
});

describe('`bootstrapAll()`', () => {
    test('calls the `bootstrap` method of all plugins', async () => {
        const mockPlugin1 = {
            bootstrap: jest.fn(),
            name: 'sourcebit-mock-plugin1'
        };
        const mockPlugin2 = {
            bootstrap: jest.fn(),
            name: 'sourcebit-mock-plugin2'
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

    test('passes a `debug` and `log` methods to plugins', async () => {
        const mockPlugin1 = {
            bootstrap: jest.fn(({ debug, log }) => {
                expect(debug).toBeInstanceOf(Function);
                expect(log).toBeInstanceOf(Function);
            }),
            name: 'sourcebit-mock-plugin1'
        };
        const mockPlugin2 = {
            bootstrap: jest.fn(({ debug, log }) => {
                expect(debug).toBeInstanceOf(Function);
                expect(log).toBeInstanceOf(Function);
            }),
            name: 'sourcebit-mock-plugin2'
        };
        const config = {
            plugins: [{ module: mockPlugin1 }, { module: mockPlugin2 }]
        };
        const sourcebit = new Sourcebit();

        sourcebit.loadPlugins(config.plugins);

        await sourcebit.bootstrapAll();
    });

    test('passes an `options` block to plugins', async () => {
        const mockPluginBase = {
            options: {
                forbiddenElement: {
                    default: 'Arsenic'
                },
                requiredElement: {
                    default: 'Oxygen',
                    runtimeParameter: 'require'
                }
            }
        };
        const mockPlugin1 = {
            ...mockPluginBase,
            name: 'sourcebit-mock-plugin1',
            bootstrap: jest.fn(({ options }) => {
                expect(options.forbiddenElement).toEqual(mockPluginBase.options.forbiddenElement.default);
                expect(options.requiredElement).toEqual(mockPluginBase.options.requiredElement.default);
            })
        };
        const mockPlugin2 = {
            ...mockPluginBase,
            name: 'sourcebit-mock-plugin2',
            bootstrap: jest.fn(({ options }) => {
                expect(options.forbiddenElement).toEqual('Cadmium');
                expect(options.requiredElement).toEqual('Calcium');
            })
        };
        const mockPlugin3 = {
            ...mockPluginBase,
            name: 'sourcebit-mock-plugin3',
            bootstrap: jest.fn(({ options }) => {
                expect(options.forbiddenElement).toEqual(mockPluginBase.options.forbiddenElement.default);
                expect(options.requiredElement).toEqual('Magnesium');
            })
        };
        const config1 = {
            plugins: [{ module: mockPlugin1 }]
        };
        const config2 = {
            plugins: [
                {
                    module: mockPlugin2,
                    options: { forbiddenElement: 'Cadmium', requiredElement: 'Calcium' }
                }
            ]
        };
        const config3 = {
            plugins: [{ module: mockPlugin3, options: { requiredElement: 'Calcium' } }]
        };
        const sourcebit1 = new Sourcebit();
        const sourcebit2 = new Sourcebit();
        const sourcebit3 = new Sourcebit({
            runtimeParameters: {
                require: 'Magnesium'
            }
        });

        sourcebit1.loadPlugins(config1.plugins);
        sourcebit2.loadPlugins(config2.plugins);
        sourcebit3.loadPlugins(config3.plugins);

        await sourcebit1.bootstrapAll();
        await sourcebit2.bootstrapAll();
        await sourcebit3.bootstrapAll();
    });

    test('uses the value of an environment variable named after the `env` option as a default value', async () => {
        const mockPluginBase = {
            options: {
                forbiddenElement: {
                    env: 'FORBIDDEN_ELEMENT',
                    default: 'Arsenic'
                }
            }
        };
        const mockPlugin1 = {
            ...mockPluginBase,
            name: 'sourcebit-mock-plugin1',
            bootstrap: jest.fn(({ options }) => {
                expect(options.forbiddenElement).toEqual(process.env.FORBIDDEN_ELEMENT);
            })
        };
        const mockPlugin2 = {
            ...mockPluginBase,
            name: 'sourcebit-mock-plugin2',
            bootstrap: jest.fn(({ options }) => {
                expect(options.forbiddenElement).toEqual('Einsteinium');
            })
        };
        const config1 = {
            plugins: [{ module: mockPlugin1 }]
        };
        const config2 = {
            plugins: [
                {
                    module: mockPlugin2,
                    options: { forbiddenElement: 'Einsteinium' }
                }
            ]
        };
        const sourcebit1 = new Sourcebit();
        const sourcebit2 = new Sourcebit();

        sourcebit1.loadPlugins(config1.plugins);
        sourcebit2.loadPlugins(config2.plugins);

        await sourcebit1.bootstrapAll();
        await sourcebit2.bootstrapAll();
    });

    test('passes a `getPluginContext` method to plugins', async () => {
        mockCache = {
            'sourcebit-mock-plugin1': {
                elements: ['Bohrium', 'Hassium']
            }
        };

        const mockPlugin1 = {
            bootstrap: jest.fn(({ getPluginContext }) => {
                const context = getPluginContext();

                expect(context).toEqual(mockCache['sourcebit-mock-plugin1']);
            }),
            name: 'sourcebit-mock-plugin1'
        };
        const mockPlugin2 = {
            bootstrap: jest.fn(({ getPluginContext }) => {
                const context = getPluginContext();

                expect(context).toEqual({});
            }),
            name: 'sourcebit-mock-plugin2'
        };
        const config = {
            plugins: [{ module: mockPlugin1 }, { module: mockPlugin2 }]
        };

        const sourcebit = new Sourcebit({
            runtimeParameters: {
                cache: true
            }
        });

        sourcebit.loadPlugins(config.plugins);

        await sourcebit.bootstrapAll();
    });

    test('passes a `refresh` method to plugins', async () => {
        jest.useFakeTimers();

        const mockContextData = [{ elements: ['Mercury', 'Cadmium'] }, { elements: ['Chromium', 'Iron'] }];
        const mockPlugin = {
            bootstrap: jest.fn(({ refresh, setPluginContext }) => {
                setPluginContext(mockContextData[0]);

                setTimeout(() => {
                    setPluginContext(mockContextData[1]);

                    refresh();
                }, 1000);
            }),
            name: 'sourcebit-mock-plugin1'
        };
        const config = {
            plugins: [{ module: mockPlugin }]
        };
        const sourcebit = new Sourcebit();
        const transformSpy = jest.spyOn(sourcebit, 'transform');

        sourcebit.loadPlugins(config.plugins);

        await sourcebit.bootstrapAll();

        expect(sourcebit.context[mockPlugin.name]).toEqual(mockContextData[0]);
        expect(transformSpy).not.toHaveBeenCalled();

        jest.runAllTimers();

        expect(sourcebit.context[mockPlugin.name]).toEqual(mockContextData[1]);
        expect(transformSpy).toHaveBeenCalledTimes(1);

        jest.useRealTimers();
    });

    test('passes a `setPluginContext` method to plugins, which sets the context for the given plugin', async () => {
        const mockContextData = [{ elements: ['Mercury', 'Cadmium'] }, { elements: ['Chromium', 'Iron'] }];
        const mockPlugin1 = {
            bootstrap: jest.fn(({ setPluginContext }) => {
                setPluginContext(mockContextData[0]);
            }),
            name: 'sourcebit-mock-plugin1'
        };
        const mockPlugin2 = {
            bootstrap: jest.fn(({ setPluginContext }) => {
                setPluginContext(mockContextData[1]);
            }),
            name: 'sourcebit-mock-plugin2'
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

describe('cache', () => {
    describe('if `runtimeParameters.cache` is `false` or unset', () => {
        test("does not populate context with cache file's contents", () => {
            mockCache = {
                'sourcebit-source-periodic-table': {
                    elements: ['Hydrogen', 'Helium']
                }
            };

            const sourcebit1 = new Sourcebit({
                runtimeParameters: {
                    cache: false
                }
            });
            const sourcebit2 = new Sourcebit();

            sourcebit1.loadContextFromCache();
            sourcebit2.loadContextFromCache();

            expect(sourcebit1.context).toEqual({});
            expect(sourcebit2.context).toEqual({});
        });

        test('does not persist context to cache file', async () => {
            mockCache = {
                'sourcebit-source-periodic-table': {
                    elements: ['Hydrogen', 'Helium']
                }
            };

            const plugins = [
                {
                    module: {
                        name: 'sourcebit-test1',
                        bootstrap: ({ setPluginContext }) => {
                            setPluginContext({
                                entries: [{ name: 'A' }]
                            });
                        }
                    }
                }
            ];
            const sourcebit1 = new Sourcebit({
                runtimeParameters: {
                    cache: false
                }
            });
            const sourcebit2 = new Sourcebit();

            sourcebit1.loadPlugins(plugins);
            sourcebit2.loadPlugins(plugins);

            await sourcebit1.bootstrapAll();
            await sourcebit2.bootstrapAll();

            expect(fs.writeFileSync).not.toHaveBeenCalled();
        });
    });

    describe('if `runtimeParameters.cache` or `runtimeParameters.watch` are `true`', () => {
        test("populates context with cache file's contents", () => {
            const sourcebit1 = new Sourcebit({
                runtimeParameters: {
                    cache: true
                }
            });
            const sourcebit2 = new Sourcebit({
                runtimeParameters: {
                    watch: true
                }
            });

            sourcebit1.loadContextFromCache();
            sourcebit2.loadContextFromCache();

            expect(sourcebit1.context).toEqual(mockCache);
            expect(sourcebit2.context).toEqual(mockCache);
        });

        test("fails gracefully if there's an error when reading/parsing the cache file", async () => {
            const readFileSync = fs.readFileSync;

            fs.readFileSync = () => {
                throw new Error();
            };

            const plugins = [
                {
                    module: {
                        name: 'sourcebit-test1',
                        bootstrap: ({ getPluginContext, setPluginContext }) => {
                            expect(getPluginContext()).toEqual({});
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

            fs.readFileSync = readFileSync;
        });

        test('persists context to cache file', async () => {
            mockCache = {
                'sourcebit-source-periodic-table': {
                    elements: ['Hydrogen', 'Helium']
                }
            };

            const plugins = [
                {
                    module: {
                        name: 'sourcebit-test1',
                        bootstrap: ({ setPluginContext }) => {
                            setPluginContext({
                                entries: [{ name: 'A' }]
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

        test("fails gracefully if there's an error when persisting the context to the cache file", async () => {
            mockCache = {
                'sourcebit-source-periodic-table': {
                    elements: ['Hydrogen', 'Helium']
                }
            };

            const plugins = [
                {
                    module: {
                        name: 'sourcebit-test1',
                        bootstrap: ({ setPluginContext }) => {
                            setPluginContext({
                                entries: [{ name: 'A' }]
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

            const writeFileSync = fs.writeFileSync;

            fs.writeFileSync = () => {
                throw new Error();
            };

            await sourcebit.bootstrapAll();

            fs.writeFileSync = writeFileSync;
        });
    });
});

describe('`getContext()`', () => {
    test('returns a snapshot of the entire context object', async () => {
        mockCache = {
            'sourcebit-mock-plugin1': {
                elements: ['Bohrium', 'Hassium']
            }
        };

        const sourcebit = new Sourcebit({
            runtimeParameters: {
                cache: true
            }
        });

        await sourcebit.bootstrapAll();

        expect(sourcebit.context).toEqual(mockCache);

        const clonedContext = sourcebit.getContext();

        delete clonedContext['sourcebit-mock-plugin1'];

        expect(clonedContext).toEqual({});
        expect(sourcebit.context).toEqual(mockCache);
    });
});

describe('`getNameOfPluginAtIndex()`', () => {
    test("returns the value of the plugin's `name` property", () => {
        const mockPlugin = {
            name: 'sourcebit-mock-plugin1'
        };
        const config = {
            plugins: [{ module: mockPlugin }]
        };
        const sourcebit = new Sourcebit();

        sourcebit.loadPlugins(config.plugins);

        expect(sourcebit.getNameOfPluginAtIndex(0)).toEqual(mockPlugin.name);
    });

    test('returns a default name for a plugin if it does not export a `name` property', () => {
        const mockPlugin = {};
        const config = {
            plugins: [{ module: mockPlugin }]
        };
        const sourcebit = new Sourcebit();

        sourcebit.loadPlugins(config.plugins);

        expect(sourcebit.getNameOfPluginAtIndex(0)).toEqual('plugin-0');
    });
});

describe('`log()`', () => {
    test('does not print a message to the console if `runtimeParameters.quiet` is `true`', async () => {
        const mockMessage = 'The only two non-silvery metals are gold and copper';
        const mockPlugin = {
            bootstrap: jest.fn(({ log }) => {
                log(mockMessage);
            }),
            name: 'sourcebit-mock-plugin1'
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

    test('prints a message to the console with an info prompt style as default', async () => {
        const mockMessage = 'The only two non-silvery metals are gold and copper';
        const mockPlugin = {
            bootstrap: jest.fn(({ log }) => {
                log(mockMessage);
                log(mockMessage, 'unknownType');
            }),
            name: 'sourcebit-mock-plugin1'
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

    test('prints a message to the console with the supplied prompt style', async () => {
        jest.useFakeTimers();

        const mockMessage = 'The only two non-silvery metals are gold and copper';
        const mockPlugin = {
            bootstrap: jest.fn(({ log }) => {
                log(mockMessage, 'succeed');

                setTimeout(() => {
                    log(mockMessage, 'fail');
                }, 500);

                setTimeout(() => {
                    log(mockMessage, 'warn');
                }, 1500);

                setTimeout(() => {
                    log(mockMessage, 'info');
                }, 2500);
            }),
            name: 'sourcebit-mock-plugin1'
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

describe('`setOptionsForPluginAtIndex()`', () => {
    test('sets the options block for the plugin at the given index', async () => {
        const mockPluginBase = {
            name: 'sourcebit-mock-plugin1',
            options: {
                forbiddenElement: {
                    default: 'Arsenic'
                }
            }
        };
        const mockPlugin1 = {
            ...mockPluginBase,
            bootstrap: jest.fn(({ options }) => {
                expect(options.forbiddenElement).toEqual('Cobalt');
            })
        };
        const mockPlugin2 = {
            ...mockPluginBase,
            bootstrap: jest.fn(({ options }) => {
                expect(options.forbiddenElement).toEqual('Ruthenium');
            })
        };
        const config = {
            plugins: [
                { module: mockPlugin1, options: { forbiddenElement: 'Cobalt' } },
                { module: mockPlugin2, options: { forbiddenElement: 'Cobalt' } }
            ]
        };
        const sourcebit = new Sourcebit();

        sourcebit.loadPlugins(config.plugins);
        sourcebit.setOptionsForPluginAtIndex(1, {
            forbiddenElement: 'Ruthenium'
        });

        await sourcebit.bootstrapAll();
    });
});

describe('`transform()`', () => {
    test('waits for one invokation to call all plugins before running another one', async () => {
        const plugins = [
            {
                module: {
                    name: 'sourcebit-test1',
                    bootstrap: ({ refresh, setPluginContext }) => {
                        setPluginContext({
                            entries: [{ name: 'A' }]
                        });
                        setTimeout(() => {
                            setPluginContext({
                                entries: [{ name: 'B' }]
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
                    name: 'sourcebit-test2',
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
                expect(data1.objects[0]).toEqual({ name: 'a' });

                expect(data2.objects.length).toBe(1);
                expect(data2.objects[0]).toEqual({ name: 'b' });

                resolve();
            }, 100);
        });
    });

    test("does not run a plugin's `transform()` method if the plugin hasn't been bootstrapped", async () => {
        const transformFn = jest.fn();
        const plugins = [
            {
                module: {
                    name: 'sourcebit-test1',
                    bootstrap: ({ setPluginContext }) => {
                        setPluginContext({
                            entries: [{ name: 'A' }]
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
                    name: 'sourcebit-test2',
                    transform: ({ data }) => {
                        return {
                            ...data,
                            objects: data.objects.concat([{ name: 'Hafnium' }])
                        };
                    }
                }
            },
            ({ data }) => ({
                ...data,
                objects: data.objects.concat([{ name: 'Yttrium' }])
            })
        ];
        const sourcebit = new Sourcebit();

        sourcebit.loadPlugins(plugins);

        await sourcebit.bootstrapAll();

        const data = await sourcebit.transform();

        expect(data.objects.length).toBe(2);
        expect(data.objects[0]).toEqual({ name: 'Hafnium' });
        expect(data.objects[1]).toEqual({ name: 'Yttrium' });
    });

    test('passes data buckets from one plugin to the next and returns the final data object', async () => {
        const plugins = [
            {
                module: {
                    name: 'sourcebit-test1',
                    transform: async ({ data }) => {
                        return {
                            ...data,
                            elements: [{ name: 'Lead' }]
                        };
                    }
                }
            },
            {
                module: {
                    name: 'sourcebit-test2',
                    transform: ({ data }) => {
                        expect(data.elements.length).toBe(1);
                        expect(data.elements[0]).toEqual({ name: 'Lead' });

                        return {
                            ...data,
                            elements: data.elements.concat({
                                name: 'Rhenium'
                            })
                        };
                    }
                }
            },
            {
                module: {
                    name: 'sourcebit-test3',
                    transform: ({ data }) => {
                        expect(data.elements.length).toBe(2);
                        expect(data.elements[0]).toEqual({ name: 'Lead' });
                        expect(data.elements[1]).toEqual({ name: 'Rhenium' });

                        return {
                            ...data,
                            elements: data.elements.concat({
                                name: 'Osmium'
                            })
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

        const data = await sourcebit.transform();

        expect(data.elements.length).toBe(3);
        expect(data.elements[0]).toEqual({ name: 'Lead' });
        expect(data.elements[1]).toEqual({ name: 'Rhenium' });
        expect(data.elements[2]).toEqual({ name: 'Osmium' });

        expect(callback).toHaveBeenCalledTimes(1);

        const [error, callbackData] = callback.mock.calls[0];

        expect(error).toBe(null);
        expect(callbackData.elements.length).toBe(3);
        expect(callbackData.elements[0]).toEqual({ name: 'Lead' });
        expect(callbackData.elements[1]).toEqual({ name: 'Rhenium' });
        expect(callbackData.elements[2]).toEqual({ name: 'Osmium' });
    });

    test('gracefully handles an error thrown by one of the plugins', async () => {
        const plugins = [
            {
                module: {
                    name: 'sourcebit-test1',
                    transform: async ({ data }) => {
                        return {
                            ...data,
                            elements: [{ name: 'Lead' }]
                        };
                    }
                }
            },
            {
                module: {
                    name: 'sourcebit-test2',
                    transform: ({ data }) => {
                        expect(data.elements.length).toBe(1);
                        expect(data.elements[0]).toEqual({ name: 'Lead' });

                        throw new Error('Oops!');
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

        expect(callback).toHaveBeenCalledTimes(1);

        const [error, callbackData] = callback.mock.calls[0];

        expect(error).toBeInstanceOf(Error);
        expect(callbackData).not.toBeDefined();
    });

    test('calls the `onTransformStart` and `onTransformEnd` callbacks of each plugin, if defined, when `transform` has finished running', async () => {
        const onTransformStartFn = jest.fn();
        const onTransformEndFn = jest.fn();
        const plugins = [
            {
                module: {
                    name: 'sourcebit-test1',
                    onTransformStart: onTransformStartFn,
                    onTransformEnd: onTransformEndFn,
                    transform: async ({ data }) => {
                        return {
                            ...data,
                            elements: [{ name: 'Lead' }]
                        };
                    }
                }
            },
            {
                module: {
                    name: 'sourcebit-test2',
                    onTransformEnd: onTransformEndFn,
                    transform: ({ data }) => {
                        return {
                            ...data,
                            elements: data.elements.concat({
                                name: 'Rhenium'
                            })
                        };
                    }
                }
            },
            {
                module: {
                    name: 'sourcebit-test3',
                    onTransformEnd: onTransformEndFn,
                    transform: ({ data }) => {
                        return {
                            ...data,
                            elements: data.elements.concat({
                                name: 'Osmium'
                            })
                        };
                    }
                }
            },
            {
                module: {
                    name: 'sourcebit-test4',
                    onTransformStart: onTransformStartFn,
                    onTransformEnd: onTransformEndFn
                }
            }
        ];
        const callback = jest.fn();
        const sourcebit = new Sourcebit();

        sourcebit.onTransform = callback;
        sourcebit.loadPlugins(plugins);

        await sourcebit.bootstrapAll();

        const data = await sourcebit.transform();

        expect(onTransformStartFn).toHaveBeenCalledTimes(2);
        expect(onTransformEndFn).toHaveBeenCalledTimes(4);

        onTransformStartFn.mock.calls.forEach(call => {
            expect(call[0].debug).toBeInstanceOf(Function);
            expect(call[0].getPluginContext).toBeInstanceOf(Function);
            expect(call[0].log).toBeInstanceOf(Function);
            expect(call[0].options).toEqual({});
        });

        onTransformEndFn.mock.calls.forEach(call => {
            expect(call[0].debug).toBeInstanceOf(Function);
            expect(call[0].getPluginContext).toBeInstanceOf(Function);
            expect(call[0].log).toBeInstanceOf(Function);
            expect(call[0].options).toEqual({});
            expect(call[0].data).toEqual(data);
        });
    });
});

describe('writing files', () => {
    test('writes JSON file', async () => {
        const mockContent = {
            group1: ['Hydrogen', 'Lithium', 'Sodium', 'Potassium', 'Rubidium', 'Caesium', 'Francium']
        };
        const mockPath = '/Users/foo/bar/baz.json';
        const plugins = [
            {
                module: {
                    name: 'sourcebit-test1',
                    transform: ({ data }) => {
                        return {
                            ...data,
                            files: data.files.concat({
                                path: mockPath,
                                format: 'json',
                                content: mockContent
                            })
                        };
                    }
                }
            }
        ];

        const sourcebit = new Sourcebit();

        sourcebit.loadPlugins(plugins);

        await sourcebit.bootstrapAll();
        await sourcebit.transform();

        expect(mockPromisifiedFunction).toHaveBeenCalledTimes(1);

        const [filePath, fileContents] = mockPromisifiedFunction.mock.calls[0];

        expect(filePath).toBe(mockPath);
        expect(fileContents).toBe(JSON.stringify(mockContent, null, 2));
    });

    test('writes Markdown file with frontmatter', async () => {
        const mockContent = {
            body:
                'All the Group 1 elements are very reactive. They must be stored under oil to keep air and water away from them. Group 1 elements form alkaline solutions when they react with water, which is why they are called alkali metals.',
            frontmatter: {
                elements: ['Hydrogen', 'Lithium', 'Sodium', 'Potassium', 'Rubidium', 'Caesium', 'Francium']
            }
        };
        const mockPath = '/Users/foo/bar/baz.md';
        const plugins = [
            {
                module: {
                    name: 'sourcebit-test1',
                    transform: ({ data }) => {
                        return {
                            ...data,
                            files: data.files.concat({
                                path: mockPath,
                                format: 'frontmatter-md',
                                content: mockContent
                            })
                        };
                    }
                }
            }
        ];

        const sourcebit = new Sourcebit();

        sourcebit.loadPlugins(plugins);

        await sourcebit.bootstrapAll();
        await sourcebit.transform();

        expect(mockPromisifiedFunction).toHaveBeenCalledTimes(1);

        const [filePath, fileContents] = mockPromisifiedFunction.mock.calls[0];

        expect(filePath).toBe(mockPath);
        expect(fileContents).toEqual(['---', yaml.stringify(mockContent.frontmatter).trim(), '---', mockContent.body, ''].join('\n'));
    });

    test('writes Markdown file with frontmatter and an empty body', async () => {
        const mockContent = {
            frontmatter: {
                elements: ['Hydrogen', 'Lithium', 'Sodium', 'Potassium', 'Rubidium', 'Caesium', 'Francium']
            }
        };
        const mockPath = '/Users/foo/bar/baz.md';
        const plugins = [
            {
                module: {
                    name: 'sourcebit-test1',
                    transform: ({ data }) => {
                        return {
                            ...data,
                            files: data.files.concat({
                                path: mockPath,
                                format: 'frontmatter-md',
                                content: mockContent
                            })
                        };
                    }
                }
            }
        ];

        const sourcebit = new Sourcebit();

        sourcebit.loadPlugins(plugins);

        await sourcebit.bootstrapAll();
        await sourcebit.transform();

        expect(mockPromisifiedFunction).toHaveBeenCalledTimes(1);

        const [filePath, fileContents] = mockPromisifiedFunction.mock.calls[0];

        expect(filePath).toBe(mockPath);
        expect(fileContents).toEqual(['---', yaml.stringify(mockContent.frontmatter).trim(), '---', '', ''].join('\n'));
    });

    test('writes YAML file', async () => {
        const mockContent = {
            group1: ['Hydrogen', 'Lithium', 'Sodium', 'Potassium', 'Rubidium', 'Caesium', 'Francium']
        };
        const mockPath = '/Users/foo/bar/baz.yaml';
        const plugins = [
            {
                module: {
                    name: 'sourcebit-test1',
                    transform: ({ data }) => {
                        return {
                            ...data,
                            files: data.files.concat({
                                path: mockPath,
                                format: 'yml',
                                content: mockContent
                            })
                        };
                    }
                }
            }
        ];

        const sourcebit = new Sourcebit();

        sourcebit.loadPlugins(plugins);

        await sourcebit.bootstrapAll();
        await sourcebit.transform();

        expect(mockPromisifiedFunction).toHaveBeenCalledTimes(1);

        const [filePath, fileContents] = mockPromisifiedFunction.mock.calls[0];

        expect(filePath).toBe(mockPath);
        expect(fileContents).toBe(yaml.stringify(mockContent));
    });

    test('gracefully handles an element in the `files` array without a valid format', async () => {
        const plugins = [
            {
                module: {
                    name: 'sourcebit-test1',
                    transform: ({ data }) => {
                        return {
                            ...data,
                            files: data.files.concat({
                                path: '/Users/foo/bar/baz.json',
                                format: 'json',
                                content: {
                                    name: 'Oxygen'
                                }
                            })
                        };
                    }
                }
            },
            {
                module: {
                    name: 'sourcebit-test2',
                    transform: ({ data }) => {
                        return {
                            ...data,
                            files: data.files.concat({
                                path: '/Users/foo/bar/baz.oopsie',
                                format: 'oopsie',
                                content: {
                                    name: 'Seaborgium'
                                }
                            })
                        };
                    }
                }
            }
        ];

        const sourcebit = new Sourcebit({
            cache: false
        });
        const logFn = jest.spyOn(sourcebit, 'log');

        sourcebit.loadPlugins(plugins);

        await sourcebit.bootstrapAll();
        await sourcebit.transform();

        expect(mockPromisifiedFunction).toHaveBeenCalledTimes(1);
        expect(logFn).toHaveBeenCalledTimes(2);
        expect(logFn.mock.calls[0][0]).toBe(`Could not create /Users/foo/bar/baz.oopsie. "oopsie" is not a supported format.`);
        expect(logFn.mock.calls[0][1]).toBe('fail');
    });

    test('gracefully handles an element in the `files` array without a valid path', async () => {
        const plugins = [
            {
                module: {
                    name: 'sourcebit-test1',
                    transform: ({ data }) => {
                        return {
                            ...data,
                            files: data.files.concat({
                                format: 'json',
                                content: 'uh oh'
                            })
                        };
                    }
                }
            },
            {
                module: {
                    name: 'sourcebit-test2',
                    transform: ({ data }) => {
                        return {
                            ...data,
                            files: data.files.concat({
                                format: 'yaml',
                                content: 'oops!'
                            })
                        };
                    }
                }
            }
        ];

        const sourcebit = new Sourcebit({
            cache: false
        });
        const logFn = jest.spyOn(sourcebit, 'log');

        sourcebit.loadPlugins(plugins);

        await sourcebit.bootstrapAll();
        await sourcebit.transform();

        expect(mockPromisifiedFunction).not.toHaveBeenCalled();
        expect(logFn).toHaveBeenCalledTimes(2);
        expect(logFn.mock.calls[0][0]).toBe(
            'One of the plugins tried to write a file but failed to provide a valid file path. Please check your configuration.'
        );
        expect(logFn.mock.calls[0][1]).toBe('warn');
        expect(logFn.mock.calls[1][0]).toBe(
            'One of the plugins tried to write a file but failed to provide a valid file path. Please check your configuration.'
        );
        expect(logFn.mock.calls[1][1]).toBe('warn');
    });

    test('gracefully handles an error in writing a file to disk', async () => {
        const mockContent = {
            group1: ['Hydrogen', 'Lithium', 'Sodium', 'Potassium', 'Rubidium', 'Caesium', 'Francium']
        };
        const mockPath = '/Users/foo/bar/baz.json';
        const plugins = [
            {
                module: {
                    name: 'sourcebit-test1',
                    transform: ({ data }) => {
                        return {
                            ...data,
                            files: data.files.concat({
                                path: mockPath,
                                format: 'json',
                                content: mockContent
                            })
                        };
                    }
                }
            }
        ];

        mockPromisifiedFunction.mockImplementationOnce((_path, _content, callback) => {
            callback(new Error());
        });

        const sourcebit = new Sourcebit({
            cache: false
        });
        const writeFilesFn = jest.spyOn(sourcebit, 'writeFiles');

        sourcebit.loadPlugins(plugins);

        await sourcebit.bootstrapAll();
        await sourcebit.transform();

        expect(mockPromisifiedFunction).toHaveBeenCalledTimes(1);

        const [filePath, fileContents] = mockPromisifiedFunction.mock.calls[0];

        expect(filePath).toBe(mockPath);
        expect(fileContents).toBe(JSON.stringify(mockContent, null, 2));

        const [writeFilesFnReturnValue] = await writeFilesFn.mock.results[0].value;

        expect(writeFilesFnReturnValue).toBe(false);
    });

    test('writes multiple objects to a file if the item in the `files` bucket contains `append: true`', async () => {
        const mockContent = [
            { name: 'Hydrogen' },
            { name: 'Lithium' },
            { name: 'Sodium' },
            { name: 'Potassium' },
            { name: 'Rubidium' },
            { name: 'Caesium' },
            { name: 'Francium' }
        ];
        const mockPath = '/Users/foo/bar/baz.json';
        const plugins = [
            {
                module: {
                    name: 'sourcebit-test1',
                    transform: ({ data }) => {
                        return {
                            ...data,
                            files: data.files.concat({
                                append: true,
                                path: mockPath,
                                format: 'json',
                                content: mockContent[0]
                            })
                        };
                    }
                }
            },
            {
                module: {
                    name: 'sourcebit-test2',
                    transform: ({ data }) => {
                        const newItems = mockContent.slice(1).map(item => ({
                            append: true,
                            path: mockPath,
                            format: 'json',
                            content: item
                        }));

                        return {
                            ...data,
                            files: data.files.concat(newItems)
                        };
                    }
                }
            }
        ];

        const sourcebit = new Sourcebit();

        sourcebit.loadPlugins(plugins);

        await sourcebit.bootstrapAll();
        await sourcebit.transform();

        expect(mockPromisifiedFunction).toHaveBeenCalledTimes(1);

        const [filePath, fileContents] = mockPromisifiedFunction.mock.calls[0];

        expect(filePath).toBe(mockPath);
        expect(fileContents).toBe(JSON.stringify(mockContent, null, 2));
    });

    test('deletes any files previously created that are no longer part of the `files` data bucket', async () => {
        jest.useRealTimers();

        const mockContent = {
            group1: ['Hydrogen', 'Lithium', 'Sodium', 'Potassium', 'Rubidium', 'Caesium', 'Francium']
        };
        const mockPaths = ['/Users/foo/bar/baz.json', '/Users/foo/bar/periodic-table.json'];
        const plugins = [
            {
                module: {
                    name: 'sourcebit-test1',
                    bootstrap: ({ refresh, setPluginContext }) => {
                        setPluginContext({
                            filePath: mockPaths[0]
                        });

                        setTimeout(() => {
                            setPluginContext({
                                filePath: mockPaths[1]
                            });

                            refresh();
                        }, 100);
                    },
                    transform: ({ data, getPluginContext }) => {
                        const { filePath } = getPluginContext();

                        return {
                            ...data,
                            files: data.files.concat({
                                path: filePath,
                                format: 'json',
                                content: mockContent
                            })
                        };
                    }
                }
            }
        ];

        const sourcebit = new Sourcebit({
            watch: true
        });
        const callback = jest.fn();
        const logFn = jest.spyOn(sourcebit, 'log');
        const fsUnlinkFn = jest.spyOn(fs, 'unlinkSync');

        sourcebit.loadPlugins(plugins);
        sourcebit.onTransform = callback;

        await sourcebit.bootstrapAll();
        await sourcebit.transform();

        await new Promise(resolve => {
            setTimeout(() => {
                expect(callback).toHaveBeenCalledTimes(2);

                callback.mock.calls.forEach(call => {
                    expect(call[0]).toBe(null);
                    expect(call[1].files.length).toBe(1);
                });

                expect(fsUnlinkFn).toHaveBeenCalledTimes(1);
                expect(fsUnlinkFn.mock.calls[0][0]).toEqual(mockPaths[0]);
                expect(logFn.mock.calls[1][0]).toBe('Deleted /Users/foo/bar/baz.json');
                expect(logFn.mock.calls[1][1]).toBe('info');

                resolve();
            }, 150);
        });

        jest.useFakeTimers();
    });

    test('gracefully handles an error when deleting any files previously created that are no longer part of the `files` data bucket', async () => {
        jest.useRealTimers();

        const mockContent = {
            group1: ['Hydrogen', 'Lithium', 'Sodium', 'Potassium', 'Rubidium', 'Caesium', 'Francium']
        };
        const mockPaths = ['/Users/foo/bar/baz.json', '/Users/foo/bar/periodic-table.json'];
        const plugins = [
            {
                module: {
                    name: 'sourcebit-test1',
                    bootstrap: ({ refresh, setPluginContext }) => {
                        setPluginContext({
                            filePath: mockPaths[0]
                        });

                        setTimeout(() => {
                            setPluginContext({
                                filePath: mockPaths[1]
                            });

                            refresh();
                        }, 100);
                    },
                    transform: ({ data, getPluginContext }) => {
                        const { filePath } = getPluginContext();

                        return {
                            ...data,
                            files: data.files.concat({
                                path: filePath,
                                format: 'json',
                                content: mockContent
                            })
                        };
                    }
                }
            }
        ];

        const sourcebit = new Sourcebit({
            watch: true
        });
        const callback = jest.fn();
        const logFn = jest.spyOn(sourcebit, 'log');
        const fsUnlinkFn = fs.unlinkSync;

        fs.unlinkSync = jest.fn(() => {
            throw new Error();
        });

        sourcebit.loadPlugins(plugins);
        sourcebit.onTransform = callback;

        await sourcebit.bootstrapAll();
        await sourcebit.transform();

        await new Promise(resolve => {
            setTimeout(() => {
                expect(callback).toHaveBeenCalledTimes(2);

                callback.mock.calls.forEach(call => {
                    expect(call[0]).toBe(null);
                    expect(call[1].files.length).toBe(1);
                });

                expect(fs.unlinkSync).toHaveBeenCalledTimes(1);
                expect(fs.unlinkSync.mock.calls[0][0]).toEqual(mockPaths[0]);

                expect(logFn.mock.calls[1][0]).toBe('Could not delete /Users/foo/bar/baz.json');
                expect(logFn.mock.calls[1][1]).toBe('fail');

                resolve();
            }, 150);
        });

        fs.unlinkSync = fsUnlinkFn;
        jest.useFakeTimers();
    });
});
