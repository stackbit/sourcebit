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
        const content = fileWriters.writeFrontmatterMarkdown(mockContent);

        expect(content).toBe(`---\nname: ${mockContent.frontmatter.name}\n---\n${mockContent.body}\n`);
    });

    test('converts body to string', () => {
        const mockContent = {
            body: [1, 2, 3],
            frontmatter: {
                name: 'John Doe'
            }
        };
        const content = fileWriters.writeFrontmatterMarkdown(mockContent);

        expect(content).toBe('---\nname: John Doe\n---\n1,2,3\n');
    });
});
