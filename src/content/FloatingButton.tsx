import React from 'react';
import type { ScoreLevel } from '@/shared/types';
import Orb from './Orb';

interface FloatingButtonProps {
  score: ScoreLevel | null;
  isAssessing: boolean;
  onClick: () => void;
  isTrackerActive?: boolean; // Whether velocity tracker is running
  typingVelocity?: number; // Characters per second for orb intensity
}

export const FloatingButton: React.FC<FloatingButtonProps> = ({
  score,
  isAssessing,
  onClick,
  isTrackerActive = false,
  typingVelocity = 0,
}) => {
  const [bgColor, setBgColor] = React.useState('#ffffff');
  const [isOrbHovered, setIsOrbHovered] = React.useState(false);
  const [smoothedListeningIntensity, setSmoothedListeningIntensity] = React.useState(0.2);
  const listeningTargetRef = React.useRef(0.2);
  const [hasEnteredListening, setHasEnteredListening] = React.useState(false);
  const [tuning] = React.useState({
    buttonSize: 60,
    orbPadding: 40,
    generatingIntensity: 0.3,
    listeningMinIntensity: 0.2,
    listeningMaxIntensity: 0.3,
    completeGlowSize: 110,
    completeGlowBlur: 20,
    completeGlowOpacity: 0.6,
    rightOffset: 100,
    bottomOffset: 100,
    panelOffsetAbove: 16,
  });
  const iconSrc = React.useMemo(() => {
    if (typeof chrome !== 'undefined' && chrome.runtime?.getURL) {
      return chrome.runtime.getURL('icons/icon16-dark.png');
    }
    return '/icons/icon16-dark.png';
  }, []);

  // Detect page background color on mount
  React.useEffect(() => {
    const computedBg = window.getComputedStyle(document.body).backgroundColor;
    if (computedBg && computedBg !== 'rgba(0, 0, 0, 0)') {
      setBgColor(computedBg);
    }
  }, []);

  React.useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--floating-button-right', `${tuning.rightOffset}px`);
    root.style.setProperty('--floating-button-bottom', `${tuning.bottomOffset}px`);
    root.style.setProperty('--floating-button-size', `${tuning.buttonSize}px`);
  }, [tuning.rightOffset, tuning.bottomOffset, tuning.buttonSize]);

  // Determine current state
  // State 1 (Idle): No score, not assessing, tracker not active
  // State 2 (Generating): Currently assessing
  // State 3 (Complete): Has score, not assessing, user not typing
  // State 4 (Listening): Has score, not assessing, user typing

  const getState = (): 'idle' | 'generating' | 'complete' | 'listening' => {
    if (isAssessing) return 'generating';
    if (score) {
      const isTyping = isTrackerActive && typingVelocity > 0.1;
      if (hasEnteredListening || isTyping) return 'listening';
      return 'complete';
    }
    return 'idle';
  };

  const state = getState();

  // Get result color based on score (reserved for future use)
  // const getResultColor = (): string => {
  //   switch (score) {
  //     case 'green':
  //       return '#22c55e';
  //     case 'orange':
  //       return '#f59e0b';
  //     case 'red':
  //       return '#ef4444';
  //     default:
  //       return '#ccc';
  //   }
  // };

  const getResultHue = (): number => {
    switch (score) {
      case 'green':
        return 140;
      case 'orange':
        return 35;
      case 'red':
        return 0;
      default:
        return 0;
    }
  };

  // Calculate orb intensity for State 4 (Listening)
  // typingVelocity is chars/second, map to 0.2-0.3 range
  const getListeningIntensity = (): number => {
    // Assume max velocity of ~10 chars/sec maps to 0.3
    const normalized = getListeningNormalized();
    return (
      tuning.listeningMinIntensity +
      (normalized * (tuning.listeningMaxIntensity - tuning.listeningMinIntensity))
    );
  };

  const getListeningNormalized = (): number => Math.min(typingVelocity / 10, 1);

  React.useEffect(() => {
    listeningTargetRef.current = getListeningIntensity();
  }, [typingVelocity, tuning.listeningMinIntensity, tuning.listeningMaxIntensity]);

  React.useEffect(() => {
    if (!score || isAssessing) {
      setHasEnteredListening(false);
      return;
    }
    if (isTrackerActive && typingVelocity > 0.1) {
      setHasEnteredListening(true);
    }
  }, [score, isAssessing, isTrackerActive, typingVelocity]);

  React.useEffect(() => {
    let rafId = 0;
    const smooth = () => {
      setSmoothedListeningIntensity((prev) => {
        const target = listeningTargetRef.current;
        const next = prev + (target - prev) * 0.15;
        return Math.abs(next - target) < 0.001 ? target : next;
      });
      rafId = requestAnimationFrame(smooth);
    };
    rafId = requestAnimationFrame(smooth);
    return () => cancelAnimationFrame(rafId);
  }, []);

  const renderOrbOrBorder = () => {
    const orbSize = tuning.buttonSize + tuning.orbPadding;
    switch (state) {
      case 'idle':
        return (
          <div
            className="orb-wrapper"
            style={{ width: `${orbSize}px`, height: `${orbSize}px`, zIndex: 1 }}
          >
            <Orb
              hoverIntensity={isOrbHovered ? 0.1 : 0}
              rotateOnHover={true}
              forceHoverState={isOrbHovered}
              backgroundColor={bgColor}
              animate={isOrbHovered}
            />
          </div>
        );

      case 'generating':
        return (
          <div
            className="orb-wrapper orb-breathe-strong"
            style={{ width: `${orbSize}px`, height: `${orbSize}px`, zIndex: 1 }}
          >
            <Orb
              hoverIntensity={tuning.generatingIntensity}
              rotateOnHover={false}
              forceHoverState={true}
              backgroundColor={bgColor}
            />
          </div>
        );

      case 'complete':
        // Same behavior as idle, with result-based hue
        return (
          <div
            className="orb-wrapper"
            style={{ width: `${orbSize}px`, height: `${orbSize}px`, zIndex: 1 }}
          >
            <Orb
              hue={getResultHue()}
              hoverIntensity={isOrbHovered ? 0.1 : 0}
              rotateOnHover={true}
              forceHoverState={isOrbHovered}
              backgroundColor={bgColor}
              animate={isOrbHovered}
            />
          </div>
        );

      case 'listening':
        // Weak orb with typing velocity-based intensity
        {
          const normalized = Math.min(
            (smoothedListeningIntensity - tuning.listeningMinIntensity) /
              Math.max(tuning.listeningMaxIntensity - tuning.listeningMinIntensity, 0.001),
            1,
          );
          const listeningOpacity = 0.35 + (Math.max(normalized, 0) * 0.15);
          return (
            <div
              className="orb-wrapper orb-breathe-subtle"
              style={
                {
                  width: `${orbSize}px`,
                  height: `${orbSize}px`,
                  zIndex: 1,
                  '--orb-opacity': `${listeningOpacity}`,
                  '--orb-opacity-peak': `${listeningOpacity + 0.1}`,
                } as React.CSSProperties
              }
            >
              <Orb
                hoverIntensity={smoothedListeningIntensity}
                rotateOnHover={false}
                forceHoverState={true}
                backgroundColor={bgColor}
              />
            </div>
          );
        }

      default:
        return null;
    }
  };

  const renderIcon = () => {
    if (state === 'complete') {
      const checkSize = 40;
      return <span style={{ fontSize: `${checkSize}px`, lineHeight: 1 }}>✓</span>;
    }

    return (
      <img
        src={iconSrc}
        alt=""
        style={{ width: '40px', height: '40px', display: 'block' }}
      />
    );
  };

  // Debug logging
  React.useEffect(() => {
    console.log('[FloatingButton] State:', state, {
      score,
      isAssessing,
      isTrackerActive,
      typingVelocity,
    });
  }, [state, score, isAssessing, isTrackerActive, typingVelocity]);

  return (
    <>
      <div
        style={{
          position: 'fixed',
          bottom: `${tuning.bottomOffset}px`,
          right: `${tuning.rightOffset}px`,
          width: `${tuning.buttonSize}px`,
          height: `${tuning.buttonSize}px`,
          zIndex: 2147483647,
          pointerEvents: 'auto',
        }}
        onMouseEnter={() => setIsOrbHovered(true)}
        onMouseLeave={() => setIsOrbHovered(false)}
      >
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            padding: 0,
            margin: 0,
          }}
        >
          {renderOrbOrBorder()}
          <button
            onClick={onClick}
            style={{
              position: 'relative',
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              border: 'none',
              backgroundColor: bgColor,
              cursor: 'pointer',
              boxSizing: 'border-box',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
              overflow: 'visible',
              padding: 0,
              margin: 0,
              pointerEvents: 'auto',
            }}
          >
            <span
              style={{
                position: 'relative',
                zIndex: 1,
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                lineHeight: 1,
              }}
            >
              {renderIcon()}
            </span>
          </button>
        </div>
      </div>
    </>
  );
};
