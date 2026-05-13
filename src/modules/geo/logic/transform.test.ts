import { describe, expect, it } from 'vitest';
import {
  applyMgTransform,
  computeResiduals,
  fitAnchorTransform,
  fitBestAnchorTransform,
  mgLatLngToVec2,
  type AnchorPair,
} from './transform';

describe('mgLatLngToVec2', () => {
  it('maps longitude through identity and latitude through Web Mercator forward', () => {
    const out = mgLatLngToVec2({ latitude: 66.73, longitude: -135.09 });
    expect(out.x).toBe(-135.09);
    // y = log(tan(π/4 + lat·π/360)) ≈ log(tan(78.365°)) ≈ 1.576
    expect(out.y).toBeCloseTo(1.576, 2);
  });

  it('different latitudes have non-linear y differences (Mercator scaling)', () => {
    const y60 = mgLatLngToVec2({ latitude: 60, longitude: 0 }).y;
    const y70 = mgLatLngToVec2({ latitude: 70, longitude: 0 }).y;
    const y80 = mgLatLngToVec2({ latitude: 80, longitude: 0 }).y;
    // Going from 60→70 spans less Mercator-y than 70→80 (Mercator stretches near poles).
    expect(y70 - y60).toBeGreaterThan(0);
    expect(y80 - y70).toBeGreaterThan(y70 - y60);
  });
});

describe('fitAnchorTransform (4-param) + applyMgTransform round trip', () => {
  // Anchors picked so the y values match a Web Mercator projection of the lats:
  // mercator(60) ≈ 1.317, mercator(80) ≈ 2.436; we use ourY tied to mercator(lat).
  const anchors: AnchorPair[] = [
    {
      mgLocationId: 1,
      mgLatLng: { latitude: 60.0, longitude: -140.0 },
      ourCoord: { x: 0.1, y: 0.95 },
    },
    {
      mgLocationId: 2,
      mgLatLng: { latitude: 80.0, longitude: -140.0 },
      ourCoord: { x: 0.1, y: 0.05 },
    },
    {
      mgLocationId: 3,
      mgLatLng: { latitude: 60.0, longitude: -100.0 },
      ourCoord: { x: 0.9, y: 0.95 },
    },
    {
      mgLocationId: 4,
      mgLatLng: { latitude: 80.0, longitude: -100.0 },
      ourCoord: { x: 0.9, y: 0.05 },
    },
  ];

  it('fits a 4-param transform mapping each anchor back within tolerance', () => {
    const t = { kind: 'affine4' as const, t: fitAnchorTransform(anchors) };
    for (const a of anchors) {
      const got = applyMgTransform(a.mgLatLng, t);
      expect(got.x).toBeCloseTo(a.ourCoord.x, 5);
      expect(got.y).toBeCloseTo(a.ourCoord.y, 5);
    }
  });

  it('produces near-zero residuals for the fit anchors', () => {
    const t = { kind: 'affine4' as const, t: fitAnchorTransform(anchors) };
    const residuals = computeResiduals(anchors, t);
    for (const r of residuals) {
      expect(r.distance).toBeLessThan(1e-6);
    }
  });
});

describe('fitBestAnchorTransform — picks affine6 when ≥3 anchors', () => {
  it('returns null with <2 anchors', () => {
    expect(fitBestAnchorTransform([])).toBeNull();
    expect(
      fitBestAnchorTransform([
        {
          mgLocationId: 1,
          mgLatLng: { latitude: 60, longitude: -140 },
          ourCoord: { x: 0, y: 1 },
        },
      ]),
    ).toBeNull();
  });

  it('returns affine4 with exactly 2 anchors (translate + per-axis scale only)', () => {
    const t = fitBestAnchorTransform([
      {
        mgLocationId: 1,
        mgLatLng: { latitude: 60, longitude: -140 },
        ourCoord: { x: 0.1, y: 0.9 },
      },
      {
        mgLocationId: 2,
        mgLatLng: { latitude: 80, longitude: -100 },
        ourCoord: { x: 0.9, y: 0.1 },
      },
    ]);
    expect(t?.kind).toBe('affine4');
  });

  it('returns affine6 with 3+ non-collinear anchors', () => {
    const t = fitBestAnchorTransform([
      {
        mgLocationId: 1,
        mgLatLng: { latitude: 60, longitude: -140 },
        ourCoord: { x: 0.1, y: 0.9 },
      },
      {
        mgLocationId: 2,
        mgLatLng: { latitude: 80, longitude: -100 },
        ourCoord: { x: 0.9, y: 0.1 },
      },
      {
        mgLocationId: 3,
        mgLatLng: { latitude: 75, longitude: -135 },
        ourCoord: { x: 0.15, y: 0.3 },
      },
    ]);
    expect(t?.kind).toBe('affine6');
  });

  it('6-param fit handles arbitrary linear distortion via 3 non-collinear anchors', () => {
    // Synthetic anchors with a known 6-param transform applied to lat/lng (after Mercator).
    // Pick 3 non-collinear MG points and target coords; verify residual is zero.
    const anchors: AnchorPair[] = [
      {
        mgLocationId: 1,
        mgLatLng: { latitude: 60, longitude: -140 },
        ourCoord: { x: 0.1, y: 0.9 },
      },
      {
        mgLocationId: 2,
        mgLatLng: { latitude: 80, longitude: -100 },
        ourCoord: { x: 0.9, y: 0.1 },
      },
      {
        mgLocationId: 3,
        mgLatLng: { latitude: 75, longitude: -135 },
        ourCoord: { x: 0.15, y: 0.3 },
      },
    ];
    const t = fitBestAnchorTransform(anchors)!;
    expect(t.kind).toBe('affine6');
    const residuals = computeResiduals(anchors, t);
    for (const r of residuals) {
      expect(r.distance).toBeLessThan(1e-9);
    }
  });
});
