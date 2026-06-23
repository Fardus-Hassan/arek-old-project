import { readFileSync } from "fs";
import { buildShopifyProductImportCsv } from "../lib/csv/shopify-product-csv.ts";
import { SHOPIFY_PRODUCT_IMPORT_COLUMNS } from "../lib/csv/shopify-csv-columns.ts";

const sample = {
  title: "Women's Navy Dress",
  description: "Elevate your wardrobe with this stunning dress.",
  images: [{ url: "https://example.com/img.jpg", label: "Main", sku: "" }],
  mainImage: "https://example.com/img.jpg",
  details: {
    category: "Apparel & Accessories",
    brand: "Modern Vintage",
    sleeveLength: "—",
    dressType: "—",
    ageGroup: "—",
    gender: "female",
  },
  variants: {
    sizes: ["M"],
    colors: ["Navy"],
    condition: "used",
    feature: "Geometric",
  },
  metafields: {
    productCode: "FC-060626173256-AJ",
    fabric: "Wiskoza",
    chestWidth: "46.5 cm",
    backLength: "120 cm",
    waistWidth: "38 cm",
    sleeveLength: "59.5 cm",
    underBust: "40 cm",
    dressLength: "120 cm",
  },
  storage: {
    googleDriveFolder: "/AutoList",
    autoListingStatus: true,
    lastProcessed: "Today",
  },
  tags: ["maxi dress", "geometric print"],
  sku: "",
  price: "",
  careInstructions: "Machine wash cold.",
  keyFeatures: ["Flattering V-neck", "Soft breathable fabric"],
  selectedFeatures: [],
  sizeGuide: "Fits true to size for US 8-12.",
  availableSizesFromDimensions: "M",
  dimensionConfidence: "—",
  hasRulerReference: "—",
  batchItemStatus: "—",
  documentId: "doc-1234567890",
  catalogProductId: "—",
  aiRunStatus: "—",
  aiRunMessage: "",
  productCondition: "Bardzo dobry",
  published: true,
  shopifyStatus: "Active",
  selectedSize: "M",
  selectedColor: "Navy",
  weightGrams: "100",
  inventoryQty: "1",
};

const csv = buildShopifyProductImportCsv(sample, {
  sku: "1967650000004",
  price: "44.00",
  published: true,
  shopifyStatus: "Active",
});

const headerLine = csv.replace(/^\uFEFF/, "").split("\r\n")[0];
const headers = headerLine.split(",").map((h) => h.replace(/^"|"$/g, ""));

const templatePath = String.raw`C:\Users\LA'AM Ltd\Downloads\product_template.csv`;
const templateHeader = readFileSync(templatePath, "utf8")
  .split("\n")[0]
  .trim()
  .split(",")
  .map((h) => h.replace(/^"|"$/g, ""));

const missingFromTemplate = templateHeader.filter((h) => !headers.includes(h));
const oldHeaders = ["Handle", "Body (HTML)", "Variant SKU", "Variant Price", "Image Src"];
const hasOld = oldHeaders.filter((h) => headers.includes(h));

console.log("Generated column count:", headers.length);
console.log("Expected column count:", SHOPIFY_PRODUCT_IMPORT_COLUMNS.length);
console.log("Has new URL handle:", headers.includes("URL handle"));
console.log("Has Description:", headers.includes("Description"));
console.log("Has Polish Rozmiar:", headers.some((h) => h.includes("rozmiar")));
console.log("Old headers still present:", hasOld.length ? hasOld.join(", ") : "none");
console.log("Template base columns missing:", missingFromTemplate.length ? missingFromTemplate.join(" | ") : "none");
console.log("Description contains care:", csv.includes("Machine wash cold"));
console.log("Description contains size guide:", csv.includes("Size guide"));
