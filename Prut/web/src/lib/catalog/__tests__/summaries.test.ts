import { describe, it, expect } from "vitest";
import { toCatalogItem, CATALOG_PREVIEW_CHARS, type CatalogRow } from "../summaries";
import { CapabilityMode } from "@/lib/capability-mode";

const row = (over: Partial<CatalogRow> = {}): CatalogRow => ({
  id: "p1",
  title: "מייל ללקוח",
  use_case: "התנצלות על עיכוב",
  prompt: "כתוב מייל ל{שם הלקוח} על {נושא}. ".repeat(20),
  variables: ["שם הלקוח", "נושא"],
  category_id: "marketing",
  preview_image_url: null,
  capability_mode: "STANDARD",
  ...over,
});

describe("toCatalogItem", () => {
  it("resolves a lowercase category_id to the label key and the URL slug", () => {
    const item = toCatalogItem(row());
    expect(item.category).toBe("Marketing");
    expect(item.categorySlug).toBe("marketing");
  });

  it("recomputes the fillable fields with the strict tokenizer, not the stored column", () => {
    const item = toCatalogItem(row({ variables: ["stale"], prompt: 'JSON: {"a": 1} ו{שדה אחד}' }));
    expect(item.variables).toEqual(["שדה אחד"]);
  });

  it("ships the whole body by default and a bounded preview on request", () => {
    const full = toCatalogItem(row());
    const preview = toCatalogItem(row(), { preview: true });
    expect(full.textIsPreview).toBe(false);
    expect(full.text.length).toBeGreaterThan(CATALOG_PREVIEW_CHARS);
    expect(preview.textIsPreview).toBe(true);
    expect(preview.text.length).toBe(CATALOG_PREVIEW_CHARS);
  });

  it("parses the capability mode and keeps null slugs for unknown categories", () => {
    const item = toCatalogItem(row({ capability_mode: "IMAGE_GENERATION", category_id: "nope" }));
    expect(item.capabilityMode).toBe(CapabilityMode.IMAGE_GENERATION);
    expect(item.categorySlug).toBeNull();
  });
});
