const util = require('util');

const mockPromisifiedFunction = jest.fn();

util.promisify = jest.fn(() => mockPromisifiedFunction);

jest.mock('fs');

const fileWriters = require('./file-writers');

afterEach(() => {
    jest.clearAllMocks();
});

describe('`writeFrontmatterMarkdown()`', () => {
    test('writes Markdown files with frontmatter', () => {
        const mockContent = {
            body: 'This is the body',
            frontmatter: {
                name: 'John Doe'
            }
        };
        const mockPath = '/Users/johndoe/file.md';

        fileWriters.writeFrontmatterMarkdown(mockPath, mockContent);

        expect(mockPromisifiedFunction).toHaveBeenCalledTimes(1);

        const [filePath, content] = mockPromisifiedFunction.mock.calls[0];

        expect(filePath).toBe(mockPath);
        expect(content).toBe(`---\nname: ${mockContent.frontmatter.name}\n---\n${mockContent.body}\n`);
    });

    test('converts body to string', () => {
        const mockContent = {
            body: [1, 2, 3],
            frontmatter: {
                name: 'John Doe'
            }
        };
        const mockPath = '/Users/johndoe/file.md';

        fileWriters.writeFrontmatterMarkdown(mockPath, mockContent);

        expect(mockPromisifiedFunction).toHaveBeenCalledTimes(1);

        const [filePath, content] = mockPromisifiedFunction.mock.calls[0];

        expect(filePath).toBe(mockPath);
        expect(content).toBe('---\nname: John Doe\n---\n1,2,3\n');
    });
});
