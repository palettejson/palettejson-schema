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

  describe("Color grouping validation", () => {
    /**
     * Validates color grouping constraints that cannot be expressed in JSON Schema.
     *
     * Business rule: At most one color with referenceInGroup=true per unique groupId.
     *
     * @param {object} palette - A palette object conforming to PaletteJSON schema
     * @returns {object} { valid: boolean, errors: string[] }
     */
    function validateGroupingConstraint(palette) {
      const errors = [];

      // Group colors by groupId
      const groupMap = new Map();

      palette.colors.forEach((color, index) => {
        if (color.groupId) {
          if (!groupMap.has(color.groupId)) {
            groupMap.set(color.groupId, []);
          }
          groupMap.get(color.groupId).push({ color, index });
        }
      });

      // Check each group for multiple references
      groupMap.forEach((colorsInGroup, groupId) => {
        const referencesInGroup = colorsInGroup.filter(
          ({ color }) => color.referenceInGroup === true
        );

        if (referencesInGroup.length > 1) {
          const indices = referencesInGroup.map(({ index }) => index).join(', ');
          errors.push(
            `Group "${groupId}" has ${referencesInGroup.length} colors with referenceInGroup=true (at indices: ${indices}). Maximum allowed is 1.`
          );
        }
      });

      return {
        valid: errors.length === 0,
        errors
      };
    }

    describe("Schema validation - Positive cases", () => {
      test("accepts colors with valid groupId and no referenceInGroup", () => {
        const data = {
          palettes: [{
            name: "Complementary Harmony",
            slug: "complementary",
            type: "categorical",
            colors: [
              { hex: "#0066CC", groupId: "ocean-harmony" },
              { hex: "#FF8800", groupId: "ocean-harmony" },
              { hex: "#00CC66", groupId: "ocean-harmony" }
            ]
          }]
        };
        expect(validate(data)).toBe(true);
      });

      test("accepts colors with valid groupId and one referenceInGroup", () => {
        const data = {
          palettes: [{
            name: "Blue Scale",
            slug: "blue-scale",
            type: "sequential",
            colors: [
              { hex: "#93C5FD", groupId: "blue-scale" },
              { hex: "#60A5FA", groupId: "blue-scale" },
              { hex: "#3B82F6", groupId: "blue-scale", referenceInGroup: true },
              { hex: "#2563EB", groupId: "blue-scale" }
            ]
          }]
        };
        expect(validate(data)).toBe(true);
      });

      test("accepts partial grouping (some colors grouped, others not)", () => {
        const data = {
          palettes: [{
            name: "Mixed Palette",
            slug: "mixed",
            type: "categorical",
            colors: [
              { hex: "#FF0000", groupId: "reds" },
              { hex: "#FF6666", groupId: "reds", referenceInGroup: true },
              { hex: "#0000FF" },
              { hex: "#00FF00" }
            ]
          }]
        };
        expect(validate(data)).toBe(true);
      });

      test("accepts multiple groups with one reference each", () => {
        const data = {
          palettes: [{
            name: "Brand Kit",
            slug: "brand",
            type: "categorical",
            colors: [
              { hex: "#0066CC", groupId: "primary-family", referenceInGroup: true },
              { hex: "#99CCFF", groupId: "primary-family" },
              { hex: "#003366", groupId: "primary-family" },
              { hex: "#9933CC", groupId: "secondary-family", referenceInGroup: true },
              { hex: "#CC99FF", groupId: "secondary-family" },
              { hex: "#661A99", groupId: "secondary-family" }
            ]
          }]
        };
        expect(validate(data)).toBe(true);
      });

      test("accepts groupId with dot notation", () => {
        const data = {
          palettes: [{
            name: "Hierarchical Groups",
            slug: "hierarchical",
            type: "categorical",
            colors: [
              { hex: "#FF0000", groupId: "brand.primary.tints" },
              { hex: "#00FF00", groupId: "brand.secondary.shades" }
            ]
          }]
        };
        expect(validate(data)).toBe(true);
      });

      test("accepts groupId with underscore and hyphen", () => {
        const data = {
          palettes: [{
            name: "Complex IDs",
            slug: "complex",
            type: "categorical",
            colors: [
              { hex: "#FF0000", groupId: "blue_scale-v2" },
              { hex: "#00FF00", groupId: "red-family_2024" }
            ]
          }]
        };
        expect(validate(data)).toBe(true);
      });

      test("accepts referenceInGroup=false explicitly set", () => {
        const data = {
          palettes: [{
            name: "Explicit False",
            slug: "explicit",
            type: "categorical",
            colors: [
              { hex: "#FF0000", groupId: "reds", referenceInGroup: false },
              { hex: "#00FF00", groupId: "reds", referenceInGroup: true }
            ]
          }]
        };
        expect(validate(data)).toBe(true);
      });

      test("accepts referenceInGroup without groupId (edge case)", () => {
        const data = {
          palettes: [{
            name: "Orphaned Reference",
            slug: "orphaned",
            type: "categorical",
            colors: [
              { hex: "#FF0000", referenceInGroup: true },
              { hex: "#00FF00" }
            ]
          }]
        };
        expect(validate(data)).toBe(true);
      });

      test("accepts groupId starting with number", () => {
        const data = {
          palettes: [{
            name: "Numeric Start",
            slug: "numeric",
            type: "categorical",
            colors: [
              { hex: "#FF0000", groupId: "50-shades" },
              { hex: "#00FF00", groupId: "100-hues" }
            ]
          }]
        };
        expect(validate(data)).toBe(true);
      });
    });

    describe("Schema validation - Negative cases", () => {
      test("rejects groupId with leading hyphen", () => {
        const data = {
          palettes: [{
            name: "Invalid",
            slug: "invalid",
            type: "categorical",
            colors: [
              { hex: "#FF0000", groupId: "-blue-scale" },
              { hex: "#00FF00" }
            ]
          }]
        };
        expect(validate(data)).toBe(false);
      });

      test("rejects groupId with spaces", () => {
        const data = {
          palettes: [{
            name: "Invalid",
            slug: "invalid",
            type: "categorical",
            colors: [
              { hex: "#FF0000", groupId: "blue scale" },
              { hex: "#00FF00" }
            ]
          }]
        };
        expect(validate(data)).toBe(false);
      });

      test("rejects groupId with invalid characters", () => {
        const data = {
          palettes: [{
            name: "Invalid",
            slug: "invalid",
            type: "categorical",
            colors: [
              { hex: "#FF0000", groupId: "blue@scale!" },
              { hex: "#00FF00" }
            ]
          }]
        };
        expect(validate(data)).toBe(false);
      });

      test("rejects groupId as empty string", () => {
        const data = {
          palettes: [{
            name: "Invalid",
            slug: "invalid",
            type: "categorical",
            colors: [
              { hex: "#FF0000", groupId: "" },
              { hex: "#00FF00" }
            ]
          }]
        };
        expect(validate(data)).toBe(false);
      });

      test("rejects referenceInGroup as non-boolean (number)", () => {
        const data = {
          palettes: [{
            name: "Invalid",
            slug: "invalid",
            type: "categorical",
            colors: [
              { hex: "#FF0000", groupId: "reds", referenceInGroup: 1 },
              { hex: "#00FF00" }
            ]
          }]
        };
        expect(validate(data)).toBe(false);
      });

      test("rejects referenceInGroup as string", () => {
        const data = {
          palettes: [{
            name: "Invalid",
            slug: "invalid",
            type: "categorical",
            colors: [
              { hex: "#FF0000", groupId: "reds", referenceInGroup: "true" },
              { hex: "#00FF00" }
            ]
          }]
        };
        expect(validate(data)).toBe(false);
      });

      test("rejects unknown properties alongside groupId", () => {
        const data = {
          palettes: [{
            name: "Invalid",
            slug: "invalid",
            type: "categorical",
            colors: [
              { hex: "#FF0000", groupId: "reds", unknownProperty: "fail" },
              { hex: "#00FF00" }
            ]
          }]
        };
        expect(validate(data)).toBe(false);
      });
    });

    describe("External validation - Custom constraint enforcement", () => {
      test("FAILS: multiple referenceInGroup=true in same groupId", () => {
        const palette = {
          name: "Invalid Multi-Reference",
          slug: "invalid",
          type: "sequential",
          colors: [
            { hex: "#93C5FD", groupId: "blue-scale" },
            { hex: "#60A5FA", groupId: "blue-scale", referenceInGroup: true },
            { hex: "#3B82F6", groupId: "blue-scale", referenceInGroup: true },
            { hex: "#2563EB", groupId: "blue-scale" }
          ]
        };

        const result = validateGroupingConstraint(palette);
        expect(result.valid).toBe(false);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0]).toContain('Group "blue-scale"');
        expect(result.errors[0]).toContain('2 colors with referenceInGroup=true');
      });

      test("FAILS: three referenceInGroup=true in same groupId", () => {
        const palette = {
          name: "Invalid Triple-Reference",
          slug: "invalid",
          type: "sequential",
          colors: [
            { hex: "#93C5FD", groupId: "blue-scale", referenceInGroup: true },
            { hex: "#60A5FA", groupId: "blue-scale", referenceInGroup: true },
            { hex: "#3B82F6", groupId: "blue-scale", referenceInGroup: true },
            { hex: "#2563EB", groupId: "blue-scale" }
          ]
        };

        const result = validateGroupingConstraint(palette);
        expect(result.valid).toBe(false);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0]).toContain('3 colors with referenceInGroup=true');
      });

      test("PASSES: one referenceInGroup=true per group across multiple groups", () => {
        const palette = {
          name: "Multi-Group Valid",
          slug: "valid",
          type: "categorical",
          colors: [
            { hex: "#0066CC", groupId: "primary-family", referenceInGroup: true },
            { hex: "#99CCFF", groupId: "primary-family" },
            { hex: "#9933CC", groupId: "secondary-family", referenceInGroup: true },
            { hex: "#CC99FF", groupId: "secondary-family" }
          ]
        };

        const result = validateGroupingConstraint(palette);
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      test("PASSES: zero referenceInGroup=true in a group (peer group)", () => {
        const palette = {
          name: "Peer Group",
          slug: "peer",
          type: "categorical",
          colors: [
            { hex: "#0066CC", groupId: "ocean-harmony" },
            { hex: "#FF8800", groupId: "ocean-harmony" },
            { hex: "#00CC66", groupId: "ocean-harmony" }
          ]
        };

        const result = validateGroupingConstraint(palette);
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      test("PASSES: referenceInGroup=true with no groupId (orphaned)", () => {
        const palette = {
          name: "Orphaned Reference",
          slug: "orphaned",
          type: "categorical",
          colors: [
            { hex: "#FF0000", referenceInGroup: true },
            { hex: "#00FF00" }
          ]
        };

        const result = validateGroupingConstraint(palette);
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      test("PASSES: palette with no groupId at all (backward compatibility)", () => {
        const palette = {
          name: "No Groups",
          slug: "no-groups",
          type: "categorical",
          colors: [
            { hex: "#FF0000" },
            { hex: "#00FF00" },
            { hex: "#0000FF" }
          ]
        };

        const result = validateGroupingConstraint(palette);
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      test("PASSES: mixed grouped and ungrouped colors", () => {
        const palette = {
          name: "Mixed",
          slug: "mixed",
          type: "categorical",
          colors: [
            { hex: "#FF0000", groupId: "reds", referenceInGroup: true },
            { hex: "#FF6666", groupId: "reds" },
            { hex: "#0000FF" },
            { hex: "#00FF00", groupId: "greens", referenceInGroup: true }
          ]
        };

        const result = validateGroupingConstraint(palette);
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      test("FAILS: multiple groups each with multiple references", () => {
        const palette = {
          name: "Multi-Violation",
          slug: "multi-violation",
          type: "categorical",
          colors: [
            { hex: "#0066CC", groupId: "primary-family", referenceInGroup: true },
            { hex: "#99CCFF", groupId: "primary-family", referenceInGroup: true },
            { hex: "#9933CC", groupId: "secondary-family", referenceInGroup: true },
            { hex: "#CC99FF", groupId: "secondary-family", referenceInGroup: true }
          ]
        };

        const result = validateGroupingConstraint(palette);
        expect(result.valid).toBe(false);
        expect(result.errors).toHaveLength(2);
        expect(result.errors[0]).toContain('primary-family');
        expect(result.errors[1]).toContain('secondary-family');
      });
    });
  });
});
