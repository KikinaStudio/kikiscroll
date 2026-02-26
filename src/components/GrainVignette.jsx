import { forwardRef, useMemo } from 'react';
import { GrainVignetteEffect } from './GrainVignetteEffect';

const GrainVignette = forwardRef(function GrainVignette(
  { grainAmount, grainSpeed, vignetteStrength, vignetteOffset },
  ref
) {
  const effect = useMemo(
    () =>
      new GrainVignetteEffect({
        grainAmount,
        grainSpeed,
        vignetteStrength,
        vignetteOffset,
      }),
    [] // eslint-disable-line react-hooks/exhaustive-deps
  );
  return <primitive ref={ref} object={effect} dispose={null} />;
});

export default GrainVignette;
