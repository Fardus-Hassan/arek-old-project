import { normalizeStanValue, stanForShopifyCsv, STAN_OPTIONS } from "../lib/shopify-field-options.ts";
import { buildShopifyProductImportCsv } from "../lib/csv/shopify-product-csv.ts";

console.log("STAN_OPTIONS:", STAN_OPTIONS);
console.log("Very good ->", normalizeStanValue("Very good"));
console.log("Uzywany ->", normalizeStanValue("Używany"));
console.log("empty ->", stanForShopifyCsv(""));

const sample = {
  title: "Test",
  description: "Desc",
  images: [
    { url: "https://a.com/1.jpg", label: "1", sku: "" },
    { url: "https://a.com/2.jpg", label: "2", sku: "" },
    { url: "https://a.com/3.jpg", label: "3", sku: "" },
  ],
  mainImage: "",
  details: { category: "Apparel", brand: "Brand", sleeveLength: "—", dressType: "—", ageGroup: "—", gender: "female" },
  variants: { sizes: ["M"], colors: ["Navy"], condition: "used", feature: "" },
  metafields: { productCode: "", fabric: "Wiskoza", chestWidth: "", backLength: "", waistWidth: "", sleeveLength: "", underBust: "", dressLength: "" },
  storage: { googleDriveFolder: "", autoListingStatus: false, lastProcessed: "" },
  tags: ["tag"],
  sku: "",
  price: "",
  careInstructions: "—",
  keyFeatures: [],
  selectedFeatures: [],
  sizeGuide: "—",
  availableSizesFromDimensions: "—",
  dimensionConfidence: "—",
  hasRulerReference: "—",
  batchItemStatus: "—",
  documentId: "doc-1",
  catalogProductId: "—",
  aiRunStatus: "—",
  aiRunMessage: "",
  productCondition: "Very good",
  published: true,
  shopifyStatus: "Active",
  selectedSize: "M",
  selectedColor: "Navy",
  weightGrams: "100",
  inventoryQty: "1",
};

const csv = buildShopifyProductImportCsv(sample, { sku: "SKU1", price: "44", published: true, shopifyStatus: "Active" });
const lines = csv.replace(/^\uFEFF/, "").split("\r\n").filter(Boolean);
const stanCol = lines[0].split(",").findIndex((h) => h.includes("stan"));
const stanValues = lines.slice(1).map((line) => line.split(",")[stanCol]?.replace(/"/g, ""));
console.log("CSV rows:", lines.length - 1);
console.log("Stan on each row:", stanValues);
