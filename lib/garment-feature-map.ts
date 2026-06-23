/** Map hero / generate UI option ids to POST /documents bodyData feature keys. */
export function mapGarmentOptionToApi(id: string): string {
  switch (id) {
    case "dimensions":
      return "physical_dimensions";
    case "try-on":
      return "ai_virtual_tryon";
    case "mannequin":
      return "mannequin";
    case "removal":
      return "background_removal";
    case "model":
      return "model";
    case "diagram":
      return "image_diagram";
    default:
      return id;
  }
}
