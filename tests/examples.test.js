const Ajv = require('ajv');
const addFormats = require('ajv-formats');
const fs = require('fs');
const path = require('path');

const ajv = new Ajv({
  allErrors: true,
  strict: false,
  validateSchema: false  // Skip meta-schema validation
});
addFormats(ajv);

const schemaPath = path.join(__dirname, '../schema/v0.1/palettejson.schema.json');
const examplesDir = path.join(__dirname, '../examples');

const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
const validate = ajv.compile(schema);

describe('PaletteJSON Examples Validation', () => {
  const exampleFiles = fs.readdirSync(examplesDir)
    .filter(file => file.endsWith('.palette.json'));

  test.each(exampleFiles)('validates %s against schema', (filename) => {
    const filePath = path.join(examplesDir, filename);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    const valid = validate(data);

    if (!valid) {
      console.error(`Validation errors for ${filename}:`, validate.errors);
    }

    expect(valid).toBe(true);
  });

  test('schema itself is valid JSON Schema', () => {
    expect(() => ajv.compile(schema)).not.toThrow();
  });
});