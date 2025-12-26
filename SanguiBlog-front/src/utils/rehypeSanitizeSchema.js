import rehypeSanitize, { defaultSchema } from "rehype-sanitize";

const MATHML_TAGS = [
  "math",
  "semantics",
  "annotation",
  "mrow",
  "mi",
  "mn",
  "mo",
  "mtext",
  "ms",
  "mspace",
  "mphantom",
  "mpadded",
  "mstyle",
  "merror",
  "mfrac",
  "msqrt",
  "mroot",
  "msub",
  "msup",
  "msubsup",
  "munder",
  "mover",
  "munderover",
  "mtable",
  "mtr",
  "mtd",
  "mlabeledtr",
  "menclose",
];

export const SG_REHYPE_SANITIZE_SCHEMA = {
  ...defaultSchema,
  tagNames: Array.from(new Set([...(defaultSchema.tagNames || []), ...MATHML_TAGS])),
  attributes: {
    ...(defaultSchema.attributes || {}),
    "*": Array.from(new Set([...(defaultSchema.attributes?.["*"] || []), "className"])),
    a: Array.from(new Set([...(defaultSchema.attributes?.a || []), "target", "rel"])),
    code: Array.from(new Set([...(defaultSchema.attributes?.code || []), "className"])),
    pre: Array.from(new Set([...(defaultSchema.attributes?.pre || []), "className"])),
    span: Array.from(new Set([...(defaultSchema.attributes?.span || []), "className", "style"])),
    div: Array.from(new Set([...(defaultSchema.attributes?.div || []), "className"])),
    img: Array.from(new Set([...(defaultSchema.attributes?.img || []), "className"])),
    math: Array.from(new Set([...(defaultSchema.attributes?.math || []), "xmlns"])),
    annotation: Array.from(new Set([...(defaultSchema.attributes?.annotation || []), "encoding"])),
  },
  protocols: {
    ...(defaultSchema.protocols || {}),
    href: ["http", "https", "mailto", "tel"],
    src: ["http", "https"],
  },
};

export { rehypeSanitize };

