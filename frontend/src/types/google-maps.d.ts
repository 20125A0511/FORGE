/**
 * Minimal type declarations for Google Maps JavaScript API.
 * The API is loaded at runtime via script tag; these types allow the build to pass.
 */
declare namespace google {
  namespace maps {
    class Map {
      constructor(el: HTMLElement, opts?: Record<string, unknown>);
      fitBounds(bounds: LatLngBounds, padding?: number): void;
    }
    class Marker {
      constructor(opts?: Record<string, unknown>);
      setPosition(pos: { lat: number; lng: number }): void;
      setMap(map: Map | null): void;
    }
    class LatLngBounds {
      constructor();
      extend(point: { lat: number; lng: number }): void;
    }
    namespace SymbolPath {
      const CIRCLE: number;
    }
  }
}
