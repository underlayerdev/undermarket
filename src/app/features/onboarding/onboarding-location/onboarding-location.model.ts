/**
 * The `<img>`-ready shape of a resolved location — this only exists to
 * satisfy that binding, so it lives here rather than in domain/location:
 * domain models (LocationArea, SearchLocation) are plain data, not shaped
 * for any particular UI control.
 */
export interface LocationMapPreview {
  url: string;
  label: string;
}
