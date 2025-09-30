const Ajv = require("ajv");
const addFormats = require("ajv-formats");
const fs = require("fs");
const path = require("path");

const ajv = new Ajv({
  allErrors: true,
  strict: false,
  validateSchema: false, // Skip meta-schema validation
});
addFormats(ajv);

const schemaPath = path.join(
  __dirname,
  "../schema/v0.1/palettejson.schema.json"
);
const schema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));
const validate = ajv.compile(schema);

describe("PaletteJSON Edge Cases and Negative Tests", () => {
  describe("Required fields validation", () => {
    test("rejects missing palettes array", () => {
      const data = {};
      expect(validate(data)).toBe(false);
      expect(validate.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            instancePath: "",
            keyword: "required",
            params: { missingProperty: "palettes" },
          }),
        ])
      );
    });

    test("rejects empty palettes array", () => {
      const data = { palettes: [] };
      expect(validate(data)).toBe(false);
    });

    test("rejects palette without required fields", () => {
      const data = {
        palettes: [
          {
            name: "Test",
            // missing slug, type, colors
          },
        ],
      };
      expect(validate(data)).toBe(false);
    });
  });

  describe("Color validation", () => {
    test("rejects invalid hex format", () => {
      const data = {
        palettes: [
          {
            name: "Test",
            slug: "test",
            type: "categorical",
            colors: [
              { hex: "#ZZZZZZ" }, // invalid hex
              { hex: "#FF0000" },
            ],
          },
        ],
      };
      expect(validate(data)).toBe(false);
    });

    test("rejects color with neither hex nor components", () => {
      const data = {
        palettes: [
          {
            name: "Test",
            slug: "test",
            type: "categorical",
            colors: [
              { name: "Red" }, // no hex or components
              { hex: "#FF0000" },
            ],
          },
        ],
      };
      expect(validate(data)).toBe(false);
    });

    test("rejects too few colors in palette", () => {
      const data = {
        palettes: [
          {
            name: "Test",
            slug: "test",
            type: "categorical",
            colors: [
              { hex: "#FF0000" }, // only 1 color, minimum is 2
            ],
          },
        ],
      };
      expect(validate(data)).toBe(false);
    });
  });

  describe("Color representation validation", () => {
    test("rejects OKLCH components out of bounds", () => {
      const data = {
        palettes: [
          {
            name: "Test",
            slug: "test",
            type: "categorical",
            colorRepresentation: "OKLCH",
            colors: [
              { components: [0.5, 0.2, 180] },
              { components: [1.5, 0.2, 180] }, // L > 1 (invalid)
            ],
          },
        ],
      };
      expect(validate(data)).toBe(false);
    });

    test("accepts HSL with 3 components (no alpha)", () => {
      const data = {
        palettes: [
          {
            name: "Test",
            slug: "test",
            type: "categorical",
            colorRepresentation: "HSL",
            colors: [
              { hex: "#FF0000", components: [0, 1, 0.5] },
              { hex: "#00FF00", components: [120, 1, 0.5] },
            ],
          },
        ],
      };
      expect(validate(data)).toBe(true);
    });

    test("accepts HSL with 4 components (with alpha)", () => {
      const data = {
        palettes: [
          {
            name: "Test",
            slug: "test",
            type: "categorical",
            colorRepresentation: "HSL",
            colors: [
              { hex: "#FF0000", components: [0, 1, 0.5, 0.8] },
              { hex: "#00FF00", components: [120, 1, 0.5, 1] },
            ],
          },
        ],
      };
      expect(validate(data)).toBe(true);
    });

    test("rejects HSL hue >= 360", () => {
      const data = {
        palettes: [
          {
            name: "Test",
            slug: "test",
            type: "categorical",
            colorRepresentation: "HSL",
            colors: [
              { components: [180, 0.5, 0.5] },
              { components: [360, 0.5, 0.5] }, // H >= 360 (invalid)
            ],
          },
        ],
      };
      expect(validate(data)).toBe(false);
    });

    test("rejects Lab L component out of bounds", () => {
      const data = {
        palettes: [
          {
            name: "Test",
            slug: "test",
            type: "categorical",
            colorRepresentation: "Lab",
            colors: [
              { components: [50, 20, -30] },
              { components: [150, 20, -30] }, // L > 100 (invalid)
            ],
          },
        ],
      };
      expect(validate(data)).toBe(false);
    });

    test("rejects HSL with too few components", () => {
      const data = {
        palettes: [
          {
            name: "Test",
            slug: "test",
            type: "categorical",
            colorRepresentation: "HSL",
            colors: [
              { components: [0, 1, 0.5] },
              { components: [180, 0.5] }, // only 2 components (invalid)
            ],
          },
        ],
      };
      expect(validate(data)).toBe(false);
    });

    test("rejects HSL with too many components", () => {
      const data = {
        palettes: [
          {
            name: "Test",
            slug: "test",
            type: "categorical",
            colorRepresentation: "HSL",
            colors: [
              { components: [0, 1, 0.5] },
              { components: [180, 0.5, 0.5, 1, 0.5] }, // 5 components (invalid)
            ],
          },
        ],
      };
      expect(validate(data)).toBe(false);
    });

    test("rejects HSL with invalid component values in 3-element array", () => {
      const data = {
        palettes: [
          {
            name: "Test",
            slug: "test",
            type: "categorical",
            colorRepresentation: "HSL",
            colors: [
              { components: [0, 1, 0.5] },
              { components: [180, 1.5, 0.5] }, // S > 1 (invalid)
            ],
          },
        ],
      };
      expect(validate(data)).toBe(false);
    });

    test("rejects HSL with invalid alpha in 4-element array", () => {
      const data = {
        palettes: [
          {
            name: "Test",
            slug: "test",
            type: "categorical",
            colorRepresentation: "HSL",
            colors: [
              { components: [0, 1, 0.5, 1] },
              { components: [180, 0.5, 0.5, 1.5] }, // alpha > 1 (invalid)
            ],
          },
        ],
      };
      expect(validate(data)).toBe(false);
    });
  });

  describe("Position consistency validation", () => {
    test("rejects mixed position/no-position colors", () => {
      const data = {
        palettes: [
          {
            name: "Test",
            slug: "test",
            type: "categorical",
            colors: [
              { hex: "#FF0000", position: 1 },
              { hex: "#00FF00" }, // missing position when others have it
            ],
          },
        ],
      };
      expect(validate(data)).toBe(false);
    });
  });

  describe("Slug format validation", () => {
    test("rejects invalid slug format", () => {
      const data = {
        palettes: [
          {
            name: "Test Palette",
            slug: "Test_Palette!", // invalid characters
            type: "categorical",
            colors: [{ hex: "#FF0000" }, { hex: "#00FF00" }],
          },
        ],
      };
      expect(validate(data)).toBe(false);
    });

    test("accepts valid kebab-case slug", () => {
      const data = {
        palettes: [
          {
            name: "Test Palette",
            slug: "test-palette-123",
            type: "categorical",
            colors: [{ hex: "#FF0000" }, { hex: "#00FF00" }],
          },
        ],
      };
      expect(validate(data)).toBe(true);
    });
  });

  describe("Additional properties validation", () => {
    test("rejects unknown properties in palette", () => {
      const data = {
        palettes: [
          {
            name: "Test",
            slug: "test",
            type: "categorical",
            unknownProperty: "should fail", // not allowed
            colors: [{ hex: "#FF0000" }, { hex: "#00FF00" }],
          },
        ],
      };
      expect(validate(data)).toBe(false);
    });

    test("rejects unknown properties in color", () => {
      const data = {
        palettes: [
          {
            name: "Test",
            slug: "test",
            type: "categorical",
            colors: [
              { hex: "#FF0000", unknownProperty: "fail" }, // not allowed
              { hex: "#00FF00" },
            ],
          },
        ],
      };
      expect(validate(data)).toBe(false);
    });
  });

  describe("altRepresentations validation", () => {
    test("accepts valid altRepresentations with sRGB", () => {
      const data = {
        palettes: [
          {
            name: "Test",
            slug: "test",
            type: "categorical",
            colorRepresentation: "HSL",
            colors: [
              {
                hex: "#FF0000",
                components: [0, 1, 0.5],
                altRepresentations: [
                  {
                    colorRepresentation: "sRGB",
                    components: [1, 0, 0],
                  },
                ],
              },
              { hex: "#00FF00" },
            ],
          },
        ],
      };
      expect(validate(data)).toBe(true);
    });

    test("rejects altRepresentation without colorRepresentation", () => {
      const data = {
        palettes: [
          {
            name: "Test",
            slug: "test",
            type: "categorical",
            colorRepresentation: "HSL",
            colors: [
              {
                hex: "#FF0000",
                components: [0, 1, 0.5],
                altRepresentations: [
                  {
                    components: [1, 0, 0], // missing colorRepresentation
                  },
                ],
              },
              { hex: "#00FF00" },
            ],
          },
        ],
      };
      expect(validate(data)).toBe(false);
    });

    test("rejects altRepresentation without components", () => {
      const data = {
        palettes: [
          {
            name: "Test",
            slug: "test",
            type: "categorical",
            colorRepresentation: "HSL",
            colors: [
              {
                hex: "#FF0000",
                components: [0, 1, 0.5],
                altRepresentations: [
                  {
                    colorRepresentation: "sRGB", // missing components
                  },
                ],
              },
              { hex: "#00FF00" },
            ],
          },
        ],
      };
      expect(validate(data)).toBe(false);
    });

    test("rejects OKLCH altRepresentation with L > 1", () => {
      const data = {
        palettes: [
          {
            name: "Test",
            slug: "test",
            type: "categorical",
            colors: [
              {
                hex: "#FF0000",
                altRepresentations: [
                  {
                    colorRepresentation: "OKLCH",
                    components: [1.5, 0.3, 30], // L > 1 (invalid)
                  },
                ],
              },
              { hex: "#00FF00" },
            ],
          },
        ],
      };
      expect(validate(data)).toBe(false);
    });

    test("rejects HSL altRepresentation with H >= 360", () => {
      const data = {
        palettes: [
          {
            name: "Test",
            slug: "test",
            type: "categorical",
            colors: [
              {
                hex: "#FF0000",
                altRepresentations: [
                  {
                    colorRepresentation: "HSL",
                    components: [360, 1, 0.5], // H >= 360 (invalid)
                  },
                ],
              },
              { hex: "#00FF00" },
            ],
          },
        ],
      };
      expect(validate(data)).toBe(false);
    });

    test("rejects Lab altRepresentation with L > 100", () => {
      const data = {
        palettes: [
          {
            name: "Test",
            slug: "test",
            type: "categorical",
            colors: [
              {
                hex: "#FF0000",
                altRepresentations: [
                  {
                    colorRepresentation: "Lab",
                    components: [150, 80, 70], // L > 100 (invalid)
                  },
                ],
              },
              { hex: "#00FF00" },
            ],
          },
        ],
      };
      expect(validate(data)).toBe(false);
    });

    test("rejects unknown properties in altRepresentation", () => {
      const data = {
        palettes: [
          {
            name: "Test",
            slug: "test",
            type: "categorical",
            colors: [
              {
                hex: "#FF0000",
                altRepresentations: [
                  {
                    colorRepresentation: "sRGB",
                    components: [1, 0, 0],
                    unknownProperty: "fail", // not allowed
                  },
                ],
              },
              { hex: "#00FF00" },
            ],
          },
        ],
      };
      expect(validate(data)).toBe(false);
    });

    test("rejects invalid colorRepresentation in altRepresentation", () => {
      const data = {
        palettes: [
          {
            name: "Test",
            slug: "test",
            type: "categorical",
            colors: [
              {
                hex: "#FF0000",
                altRepresentations: [
                  {
                    colorRepresentation: "InvalidSpace",
                    components: [1, 0, 0],
                  },
                ],
              },
              { hex: "#00FF00" },
            ],
          },
        ],
      };
      expect(validate(data)).toBe(false);
    });
  });
});
