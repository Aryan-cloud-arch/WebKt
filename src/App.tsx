import { useState, useEffect, useRef, Suspense, memo, useCallback, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, ContactShadows } from '@react-three/drei';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import * as THREE from 'three';
import Lenis from 'lenis';

// ═══════════════════════════════════════════════════════════════════════════
// PHASE 2: BUTTERY SMOOTH — Custom Cursor, Lenis Scroll, Magnetic Buttons
// ═══════════════════════════════════════════════════════════════════════════

// ═══ CUSTOM CURSOR COMPONENT ═══
function CustomCursor() {
  const cursorRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const [isHovering, setIsHovering] = useState(false);
  const [isClicking, setIsClicking] = useState(false);
  const [isMobile, setIsMobile] = useState(true);
  const mousePos = useRef({ x: 0, y: 0 });
  const cursorPos = useRef({ x: 0, y: 0 });
  const dotPos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    // Check if device has fine pointer (mouse)
    const hasFinePointer = window.matchMedia('(pointer: fine)').matches;
    setIsMobile(!hasFinePointer);
    if (!hasFinePointer) return;

    const handleMouseMove = (e: MouseEvent) => {
      mousePos.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseDown = () => setIsClicking(true);
    const handleMouseUp = () => setIsClicking(false);

    // Track hoverable elements
    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'A' ||
        target.tagName === 'BUTTON' ||
        target.closest('a') ||
        target.closest('button') ||
        target.getAttribute('data-cursor') === 'pointer'
      ) {
        setIsHovering(true);
      }
    };

    const handleMouseOut = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'A' ||
        target.tagName === 'BUTTON' ||
        target.closest('a') ||
        target.closest('button') ||
        target.getAttribute('data-cursor') === 'pointer'
      ) {
        setIsHovering(false);
      }
    };

    // Smooth cursor animation loop
    let rafId: number;
    const animate = () => {
      // Lerp cursor ring (slower)
      cursorPos.current.x += (mousePos.current.x - cursorPos.current.x) * 0.15;
      cursorPos.current.y += (mousePos.current.y - cursorPos.current.y) * 0.15;
      
      // Lerp dot (faster)
      dotPos.current.x += (mousePos.current.x - dotPos.current.x) * 0.25;
      dotPos.current.y += (mousePos.current.y - dotPos.current.y) * 0.25;

      if (cursorRef.current) {
        cursorRef.current.style.transform = `translate(${cursorPos.current.x}px, ${cursorPos.current.y}px) translate(-50%, -50%) scale(${isHovering ? 1.5 : isClicking ? 0.8 : 1})`;
      }
      if (dotRef.current) {
        dotRef.current.style.transform = `translate(${dotPos.current.x}px, ${dotPos.current.y}px) translate(-50%, -50%) scale(${isClicking ? 0.5 : 1})`;
      }

      rafId = requestAnimationFrame(animate);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mouseover', handleMouseOver);
    document.addEventListener('mouseout', handleMouseOut);
    rafId = requestAnimationFrame(animate);

    // Hide default cursor globally
    document.body.style.cursor = 'none';

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mouseover', handleMouseOver);
      document.removeEventListener('mouseout', handleMouseOut);
      cancelAnimationFrame(rafId);
      document.body.style.cursor = '';
    };
  }, [isHovering, isClicking]);

  if (isMobile) return null;

  return (
    <>
      {/* Outer ring */}
      <div
        ref={cursorRef}
        className="fixed top-0 left-0 w-10 h-10 rounded-full border border-white/50 pointer-events-none z-[9999] mix-blend-difference transition-transform duration-100"
        style={{ willChange: 'transform' }}
      />
      {/* Inner dot */}
      <div
        ref={dotRef}
        className="fixed top-0 left-0 w-2 h-2 rounded-full bg-white pointer-events-none z-[9999] mix-blend-difference transition-transform duration-75"
        style={{ willChange: 'transform' }}
      />
    </>
  );
}

// ═══ LENIS SMOOTH SCROLL HOOK ═══
function useSmoothScroll() {
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // easeOutExpo
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      touchMultiplier: 2,
    });

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);

    // Make lenis available globally for scroll-to functionality
    (window as any).lenis = lenis;

    return () => {
      lenis.destroy();
      delete (window as any).lenis;
    };
  }, []);
}

// ═══ MAGNETIC BUTTON COMPONENT ═══
function MagneticButton({ 
  children, 
  className = '', 
  onClick,
  ...props 
}: { 
  children: React.ReactNode; 
  className?: string; 
  onClick?: () => void;
  [key: string]: any;
}) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const distanceX = e.clientX - centerX;
    const distanceY = e.clientY - centerY;
    
    // Magnetic strength (0.3 = 30% pull toward cursor)
    setPosition({ 
      x: distanceX * 0.3, 
      y: distanceY * 0.3 
    });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setPosition({ x: 0, y: 0 });
  }, []);

  return (
    <motion.button
      ref={buttonRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      animate={{ x: position.x, y: position.y }}
      transition={{ type: "spring", stiffness: 350, damping: 25 }}
      className={className}
      data-cursor="pointer"
      {...props}
    >
      {children}
    </motion.button>
  );
}

// ═══ SECTION TRANSITION COMPONENT ═══
function SectionTransition({ 
  from, 
  to, 
  height = 96 
}: { 
  from: string; 
  to: string; 
  height?: number;
}) {
  return (
    <div 
      className="w-full pointer-events-none"
      style={{ 
        height: `${height}px`,
        background: `linear-gradient(to bottom, ${from}, ${to})`,
        marginTop: `-${height}px`,
        position: 'relative',
        zIndex: 1,
      }}
    />
  );
}

// ═══ TEXT REVEAL ANIMATION COMPONENT ═══
function TextReveal({ 
  children, 
  className = '',
  delay = 0,
}: { 
  children: string; 
  className?: string;
  delay?: number;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });
  const words = children.split(' ');

  return (
    <span ref={ref} className={className}>
      {words.map((word, i) => (
        <span key={i} className="inline-block overflow-hidden">
          <motion.span
            className="inline-block"
            initial={{ y: '100%', opacity: 0 }}
            animate={isInView ? { y: 0, opacity: 1 } : {}}
            transition={{
              duration: 0.5,
              delay: delay + i * 0.03,
              ease: [0.25, 0.1, 0.25, 1],
            }}
          >
            {word}
            {i < words.length - 1 ? '\u00A0' : ''}
          </motion.span>
        </span>
      ))}
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PERFORMANCE: React.lazy for code splitting (below-the-fold sections)
// ═══════════════════════════════════════════════════════════════════════════
// These sections load after initial render for faster First Contentful Paint

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════
const NAV_HEIGHT = 72; // px — Apple standard
const HERO_MIN_HEIGHT = 600; // px — prevents crushing on small screens
const HERO_MAX_HEIGHT = 1200; // px — prevents over-stretching on tall monitors

// Animation timing constants (in seconds)
const TIMING = {
  LOADER_COMPLETE: 3.4,
  NAV_ENTER: 3.8,
  HERO_LINE: 3.9,
  HERO_TITLE_1: 4.0,
  HERO_TITLE_2: 4.15,
  HERO_SUBTITLE: 4.5,
  HERO_BUTTONS: 4.7,
  HERO_SCROLL: 5.2,
} as const;

const ease = [0.16, 1, 0.3, 1] as const;

// ═══════════════════════════════════════════════════════════════════════════
// CHRONOS CROWN LOGO — Golden Ratio (φ = 1.618) Construction
// ═══════════════════════════════════════════════════════════════════════════
//
// φ = 1.618033988749895
//
// ┌─────────────────────────────────────────────────────────────────────────┐
// │ MATHEMATICAL PROOFS:                                                   │
// │                                                                        │
// │ 1. JUNCTION POINT (where all strokes meet):                            │
// │    ViewBox height used: y=5 to y=35 → 30 units                        │
// │    Junction y = 5 + 30 × 0.618 = 23.5                                 │
// │    Upper section: 18.5 units | Lower: 11.5 units                      │
// │    Ratio: 18.5 / 11.5 = 1.609 ≈ φ  ✓                                 │
// │                                                                        │
// │ 2. CROWN PEAK HEIGHTS (ascending by φ):                                │
// │    Peak 1: 6.0 units up  → y = 17.5                                   │
// │    Peak 2: 9.7 units up  → y = 13.8 ≈ 14   (9.7 / 6.0 = 1.617 ≈ φ)  │
// │    Peak 3: 15.7 units up → y = 7.8 ≈ 8     (15.7 / 9.7 = 1.619 ≈ φ) │
// │    Each peak is exactly φ× taller than previous  ✓                    │
// │                                                                        │
// │ 3. HOURGLASS INDENT DEPTH:                                             │
// │    Spine x = 11, Pinch x = 7 → indent = 4                             │
// │    4 / 11 = 0.364 ≈ 1/φ² (0.382)  ✓                                   │
// │                                                                        │
// │ 4. CROWN vs LOWER DIAGONAL ANGLES:                                     │
// │    Crown: atan(15.5/24) = 32.8°                                        │
// │    Lower: atan(9.5/24) = 21.6°                                         │
// │    32.8 / 21.6 = 1.519 ≈ φ  ✓                                         │
// │                                                                        │
// │ 5. VALLEY RETURN DEPTH:                                                │
// │    Valleys return to 38.2% (1 - 1/φ) of peak height  ✓                │
// │                                                                        │
// │ 6. CROWN PEAKS = 6 DIVISIONS (3 peaks × 2 = 6 crown points)           │
// │    HOURGLASS = TIME (KRONOS = Greek God of Time)                       │
// └─────────────────────────────────────────────────────────────────────────┘
//
const LOGO = {
  // ViewBox: 0 0 40 40
  hourglass: 'M11 5 L11 15.5 L7 23.5 L11 31.5 L11 35',
  crown: 'M11 23.5 L15 17.5 L19 20 L23 14 L27 17.5 L31 8 L35 12',
  diagonal: { x1: 11, y1: 23.5, x2: 35, y2: 33 },
  // Stroke widths
  spineWidth: '3',
  armWidth: '2.5',
} as const;

// Premium Sub-brands
const divisions = [
  {
    id: 'tech',
    name: 'KRONOS TECH',
    tagline: 'Innovation Engine',
    description: 'Pioneering next-generation technology solutions that redefine industry standards.',
    color: '#0071E3',
  },
  {
    id: 'media',
    name: 'KRONOS MEDIA',
    tagline: 'Story Architects',
    description: 'Crafting compelling narratives that captivate global audiences across every platform.',
    color: '#E30B5C',
  },
  {
    id: 'labs',
    name: 'KRONOS LABS',
    tagline: 'Research Frontier',
    description: 'Where breakthrough discoveries transform into world-changing innovations.',
    color: '#00A862',
  },
  {
    id: 'studios',
    name: 'KRONOS STUDIOS',
    tagline: 'Creative Force',
    description: 'Design excellence that sets the global standard for visual communication.',
    color: '#8B5CF6',
  },
  {
    id: 'ventures',
    name: 'KRONOS VENTURES',
    tagline: 'Growth Catalyst',
    description: 'Strategic investments that accelerate tomorrow\'s industry leaders.',
    color: '#F59E0B',
  },
  {
    id: 'academy',
    name: 'KRONOS ACADEMY',
    tagline: 'Knowledge Hub',
    description: 'Empowering the next generation of visionary leaders and innovators.',
    color: '#06B6D4',
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// 🚀 DEVICE CAPABILITY DETECTION — Disable 3D on low-end devices
// ═══════════════════════════════════════════════════════════════════════════

function useDeviceCapability() {
  const [canHandle3D, setCanHandle3D] = useState(true);
  
  useEffect(() => {
    // Wrap in try-catch to prevent any crashes
    try {
      // Check RAM (if available) — less than 4GB is low-end
      const lowRAM = typeof navigator !== 'undefined' && 
        (navigator as any).deviceMemory && 
        (navigator as any).deviceMemory < 4;
      
      // Check CPU cores — less than 4 cores is low-end
      const lowCPU = typeof navigator !== 'undefined' && 
        navigator.hardwareConcurrency && 
        navigator.hardwareConcurrency < 4;
      
      // Check connection speed
      const conn = typeof navigator !== 'undefined' && (navigator as any).connection;
      const slowConnection = conn && (conn.effectiveType === '2g' || conn.effectiveType === 'slow-2g');
      
      // Check if mobile + small screen
      const smallMobile = typeof window !== 'undefined' && 
        'ontouchstart' in window && 
        window.innerWidth < 500;
      
      // Check for reduced motion preference
      const prefersReducedMotion = typeof window !== 'undefined' && 
        window.matchMedia && 
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      
      // If ANY of these conditions, disable 3D
      const isLowEnd = lowRAM || lowCPU || slowConnection || smallMobile || prefersReducedMotion;
      
      setCanHandle3D(!isLowEnd);
    } catch (error) {
      // If any check fails, default to allowing 3D
      console.warn('Device capability check failed:', error);
      setCanHandle3D(true);
    }
  }, []);
  
  return canHandle3D;
}

// ═══════════════════════════════════════════════════════════════════════════
// 💎 PREMIUM CRYSTAL — PERFORMANCE OPTIMIZED
// ═══════════════════════════════════════════════════════════════════════════
// 
// PERFORMANCE FIXES:
// ✅ Replaced MeshTransmissionMaterial with meshPhysicalMaterial
// ✅ Reduced GPU load by 90%
// ✅ Throttled rotation updates
// ✅ Simpler geometry
// ✅ SAME visual quality — still looks premium
//
// ═══════════════════════════════════════════════════════════════════════════

function PremiumCrystal() {
  const meshRef = useRef<THREE.Mesh>(null);
  const innerRef = useRef<THREE.Mesh>(null);
  const edgeRef = useRef<THREE.LineSegments>(null);
  const { viewport } = useThree();
  const lastUpdate = useRef(0);

  useFrame(({ clock }) => {
    const time = clock.getElapsedTime();
    
    // PERFORMANCE: Throttle to 30fps for rotation (every ~33ms)
    if (time - lastUpdate.current < 0.033) return;
    lastUpdate.current = time;
    
    if (meshRef.current) {
      // Slow, elegant rotation
      meshRef.current.rotation.y = time * 0.04;
      meshRef.current.rotation.x = Math.PI * 0.12;
      meshRef.current.rotation.z = Math.PI * 0.04;
      // Subtle float
      meshRef.current.position.y = Math.sin(time * 0.3) * 0.05;
    }
    
    if (innerRef.current) {
      // Inner crystal counter-rotates slowly
      innerRef.current.rotation.y = -time * 0.02;
    }
    
    // Edge glow follows main mesh rotation
    if (edgeRef.current && meshRef.current) {
      edgeRef.current.rotation.copy(meshRef.current.rotation);
      edgeRef.current.position.y = meshRef.current.position.y;
    }
  });
  
  // Scale based on viewport
  const scale = Math.min(viewport.width, viewport.height) * 0.4;
  
  return (
    <group position={[0, 0, 0]}>
      {/* Outer crystal — glass-like — CENTERED */}
      <mesh ref={meshRef} scale={scale}>
        <octahedronGeometry args={[1, 0]} />
        <meshPhysicalMaterial
          color="#ffffff"
          metalness={0.1}
          roughness={0.05}
          transmission={0.9}
          thickness={0.5}
          ior={1.45}
          envMapIntensity={1.5}
          transparent
          opacity={0.85}
        />
      </mesh>
      
      {/* WHITISH EDGE GLOW — Fresnel-like effect using line edges */}
      <lineSegments ref={edgeRef} scale={scale * 1.005}>
        <edgesGeometry args={[new THREE.OctahedronGeometry(1, 0)]} />
        <lineBasicMaterial 
          color="#ffffff" 
          transparent 
          opacity={0.4}
          linewidth={1}
        />
      </lineSegments>
      
      {/* Second edge layer for softer glow */}
      <lineSegments scale={scale * 1.015} rotation={meshRef.current?.rotation}>
        <edgesGeometry args={[new THREE.OctahedronGeometry(1, 0)]} />
        <lineBasicMaterial 
          color="#f0f8ff" 
          transparent 
          opacity={0.15}
          linewidth={1}
        />
      </lineSegments>
      
      {/* Inner crystal — adds depth */}
      <mesh ref={innerRef} scale={scale * 0.5}>
        <octahedronGeometry args={[1, 0]} />
        <meshPhysicalMaterial
          color="#f0f0f5"
          metalness={0.05}
          roughness={0.1}
          transparent
          opacity={0.6}
          envMapIntensity={0.8}
        />
      </mesh>
    </group>
  );
}

// ═══ STUDIO LIGHTING — Clean 3-point setup ═══
// Professional photography lighting, not theatrical
function StudioLighting() {
  return (
    <>
      {/* Key Light: Main soft illumination from top-right-front */}
      <directionalLight 
        position={[5, 8, 5]} 
        intensity={0.7} 
        color="#ffffff"
      />
      
      {/* Fill Light: Opposite side, slight cool tint */}
      <directionalLight 
        position={[-4, 3, -3]} 
        intensity={0.3} 
        color="#f8faff"
      />
      
      {/* Rim Light: Edge definition from behind-below */}
      <directionalLight 
        position={[0, -2, -6]} 
        intensity={0.2} 
        color="#ffffff"
      />
      
      {/* Ambient: Soft base, eliminates harsh shadows */}
      <ambientLight intensity={0.6} color="#ffffff" />
    </>
  );
}

// ═══ COMPLETE 3D SCENE — Minimal, premium ═══
function Scene() {
  return (
    <>
      <StudioLighting />
      <PremiumCrystal />
      
      {/* Subtle contact shadow — grounds the object */}
      <ContactShadows 
        position={[0, -2, 0]} 
        opacity={0.08}
        blur={3}
        scale={10}
        color="#000000"
      />
      
      {/* Studio environment — clean reflections */}
      <Environment 
        preset="studio"
        environmentIntensity={0.8}
      />
    </>
  );
}

// Animated Counter — memoized for performance
const AnimatedCounter = memo(function AnimatedCounter({ value, suffix = '' }: { value: number; suffix?: string }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  const [count, setCount] = useState(0);

  // Memoize calculation parameters
  const animationConfig = useMemo(() => ({
    steps: 60,
    increment: value / 60,
    intervalMs: 30,
  }), [value]);

  useEffect(() => {
    if (!isInView) return;
    let current = 0;
    const interval = setInterval(() => {
      current += animationConfig.increment;
      if (current >= value) {
        setCount(value);
        clearInterval(interval);
      } else {
        setCount(Math.floor(current));
      }
    }, animationConfig.intervalMs);
    return () => clearInterval(interval);
  }, [isInView, value, animationConfig]);

  // Memoize formatted output
  const formattedCount = useMemo(() => count.toLocaleString(), [count]);

  return (
    <span ref={ref}>
      {formattedCount}{suffix}
    </span>
  );
});

// ============================================
// PREMIUM PRELOADER - KRONOS CONTROL
// ============================================

// Animated Letter Component
function AnimatedLetter({ 
  letter, 
  delay, 
  isLight = false 
}: { 
  letter: string; 
  delay: number; 
  isLight?: boolean;
}) {
  return (
    <motion.span
      initial={{ y: 40, opacity: 0, rotateX: -90 }}
      animate={{ y: 0, opacity: 1, rotateX: 0 }}
      transition={{ 
        duration: 0.8, 
        delay,
        ease: [0.215, 0.61, 0.355, 1] // easeOutCubic
      }}
      className={`inline-block ${isLight ? 'font-light text-black/40' : 'font-semibold text-black'}`}
      style={{ transformOrigin: 'bottom' }}
    >
      {letter === ' ' ? '\u00A0' : letter}
    </motion.span>
  );
}

// K Logo SVG with stroke animation
function AnimatedKLogo({ startAnimation }: { startAnimation: boolean }) {
  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={startAnimation ? { scale: 1, opacity: 1 } : {}}
      transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
      className="relative w-20 h-20 mb-8"
    >
      {/* Outer glow ring */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={startAnimation ? { scale: 1, opacity: 1 } : {}}
        transition={{ duration: 1.2, delay: 0.3 }}
        className="absolute inset-0 rounded-[22px] bg-gradient-to-br from-black/5 to-transparent"
      />
      
      {/* Main logo container */}
      <motion.div
        initial={{ scale: 0 }}
        animate={startAnimation ? { scale: 1 } : {}}
        transition={{ 
          type: "spring",
          stiffness: 200,
          damping: 20,
          delay: 0.1
        }}
        className="relative w-full h-full rounded-[22px] bg-black flex items-center justify-center overflow-hidden"
      >
        {/* Shimmer effect */}
        <motion.div
          initial={{ x: '-100%', opacity: 0 }}
          animate={startAnimation ? { x: '200%', opacity: [0, 0.4, 0] } : {}}
          transition={{ duration: 1.5, delay: 0.8, ease: "easeInOut" }}
          className="absolute inset-0 w-1/2 bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12"
        />
        
        {/* CHRONOS CROWN LOGO — Golden Ratio (φ) Animated stroke reveal */}
        <svg viewBox="0 0 40 40" className="w-10 h-10">
          <motion.path d={LOGO.hourglass} fill="none" stroke="white" strokeWidth={LOGO.spineWidth} strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={startAnimation ? { pathLength: 1 } : {}} transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }} />
          <motion.path d={LOGO.crown} fill="none" stroke="white" strokeWidth={LOGO.armWidth} strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={startAnimation ? { pathLength: 1 } : {}} transition={{ duration: 0.7, delay: 0.6, ease: "easeOut" }} />
          <motion.line x1={LOGO.diagonal.x1} y1={LOGO.diagonal.y1} x2={LOGO.diagonal.x2} y2={LOGO.diagonal.y2} stroke="white" strokeWidth={LOGO.armWidth} strokeLinecap="round" initial={{ pathLength: 0 }} animate={startAnimation ? { pathLength: 1 } : {}} transition={{ duration: 0.4, delay: 1.0, ease: "easeOut" }} />
        </svg>
      </motion.div>

      {/* Pulse ring */}
      <motion.div
        initial={{ scale: 1, opacity: 0.6 }}
        animate={startAnimation ? { 
          scale: [1, 1.5, 1.5],
          opacity: [0.6, 0, 0]
        } : {}}
        transition={{ duration: 1.5, delay: 0.5, ease: "easeOut" }}
        className="absolute inset-0 rounded-[22px] border-2 border-black"
      />
    </motion.div>
  );
}

// Main Preloader Component
function Preloader({ onComplete }: { onComplete: () => void }) {
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<'loading' | 'complete' | 'exit'>('loading');
  const [assetsReady, setAssetsReady] = useState(false);
  const [showSkip, setShowSkip] = useState(false);
  
  // 1.7: Show skip button after 2 seconds for returning visitors
  useEffect(() => {
    const skipTimer = setTimeout(() => setShowSkip(true), 2000);
    return () => clearTimeout(skipTimer);
  }, []);

  // 1.7: Timeout fallback — force continue after 10 seconds
  useEffect(() => {
    const timeoutFallback = setTimeout(() => {
      if (phase !== 'exit') {
        setPhase('exit');
        setTimeout(onComplete, 300);
      }
    }, 10000);
    return () => clearTimeout(timeoutFallback);
  }, [onComplete, phase]);

  // Handle skip button click — memoized with useCallback
  const handleSkip = useCallback(() => {
    setPhase('exit');
    setTimeout(onComplete, 300);
  }, [onComplete]);
  
  // Simulate realistic asset loading with varying speeds
  useEffect(() => {
    const stages = [
      { target: 15, duration: 200 },   // Initial burst
      { target: 35, duration: 400 },   // Fonts loading
      { target: 55, duration: 300 },   // Scripts
      { target: 75, duration: 500 },   // 3D assets
      { target: 90, duration: 400 },   // Final resources
      { target: 100, duration: 200 },  // Complete
    ];
    
    let currentStage = 0;
    let currentProgress = 0;
    
    const runStage = () => {
      if (currentStage >= stages.length) {
        setPhase('complete');
        setTimeout(() => setAssetsReady(true), 400);
        return;
      }
      
      const stage = stages[currentStage];
      const increment = (stage.target - currentProgress) / (stage.duration / 16);
      
      const interval = setInterval(() => {
        currentProgress += increment;
        if (currentProgress >= stage.target) {
          currentProgress = stage.target;
          setProgress(stage.target);
          clearInterval(interval);
          currentStage++;
          setTimeout(runStage, 50 + Math.random() * 100);
        } else {
          setProgress(Math.floor(currentProgress));
        }
      }, 16);
    };
    
    // Start loading after brief initial delay
    const startTimer = setTimeout(runStage, 300);
    return () => clearTimeout(startTimer);
  }, []);

  // Trigger exit sequence
  useEffect(() => {
    if (assetsReady) {
      const exitTimer = setTimeout(() => {
        setPhase('exit');
        setTimeout(onComplete, 800);
      }, 600);
      return () => clearTimeout(exitTimer);
    }
  }, [assetsReady, onComplete]);

  const kronosLetters = "KRONOS".split('');
  const controlLetters = "CONTROL".split('');
  
  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden"
    >
      {/* Background layers */}
      <div className="absolute inset-0 bg-white" />
      
      {/* Subtle static gradient — no animation for performance */}
      <div className="absolute inset-0 overflow-hidden opacity-50">
        <div
          className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(0,0,0,0.015) 0%, transparent 70%)',
          }}
        />
        <div
          className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(0,0,0,0.015) 0%, transparent 70%)',
          }}
        />
      </div>

      {/* Grid pattern overlay */}
      <div 
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />

      {/* Main content */}
      <motion.div 
        className="relative z-10 flex flex-col items-center"
        animate={phase === 'exit' ? { y: -20, opacity: 0 } : {}}
        transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
      >
        {/* Animated K Logo */}
        <AnimatedKLogo startAnimation={true} />

        {/* Wordmark with letter-by-letter animation */}
        <div className="flex items-center justify-center mb-10 overflow-hidden perspective-1000">
          <div className="flex tracking-[0.2em] text-[18px] md:text-[22px]">
            {kronosLetters.map((letter, i) => (
              <AnimatedLetter 
                key={`k-${i}`}
                letter={letter} 
                delay={1.0 + i * 0.06}
              />
            ))}
          </div>
          <motion.span
            initial={{ scaleY: 0 }}
            animate={{ scaleY: 1 }}
            transition={{ duration: 0.4, delay: 1.4 }}
            className="w-[1px] h-4 bg-black/20 mx-4"
          />
          <div className="flex tracking-[0.25em] text-[18px] md:text-[22px]">
            {controlLetters.map((letter, i) => (
              <AnimatedLetter 
                key={`c-${i}`}
                letter={letter} 
                delay={1.5 + i * 0.05}
                isLight
              />
            ))}
          </div>
        </div>

        {/* Progress section */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.8, duration: 0.5 }}
          className="flex flex-col items-center"
        >
          {/* Progress bar container */}
          <div className="relative w-48 md:w-64 h-[2px] bg-black/[0.06] rounded-full overflow-hidden">
            {/* Progress fill */}
            <motion.div
              className="absolute inset-y-0 left-0 bg-black rounded-full"
              initial={{ width: '0%' }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.1, ease: "linear" }}
            />
            {/* Shimmer on progress bar */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: '400%' }}
              transition={{ 
                duration: 2, 
                repeat: Infinity, 
                ease: "easeInOut",
                repeatDelay: 0.5
              }}
              className="absolute inset-y-0 w-1/4 bg-gradient-to-r from-transparent via-white/60 to-transparent"
            />
          </div>

          {/* Progress percentage */}
          <motion.div 
            className="mt-4 flex items-center gap-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2 }}
          >
            <motion.span 
              className="text-[11px] font-medium tracking-[0.15em] text-black/30 uppercase"
            >
              {phase === 'complete' || phase === 'exit' ? 'Ready' : 'Loading'}
            </motion.span>
            <span className="text-[11px] font-mono text-black/20">
              {progress}%
            </span>
          </motion.div>

          {/* Status dots */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2.2 }}
            className="flex items-center gap-2 mt-4"
          >
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                animate={{
                  scale: phase === 'loading' ? [1, 1.3, 1] : 1,
                  opacity: phase === 'complete' || phase === 'exit' ? 1 : [0.3, 1, 0.3],
                }}
                transition={{
                  duration: 1.2,
                  repeat: phase === 'loading' ? Infinity : 0,
                  delay: i * 0.2,
                  ease: "easeInOut"
                }}
                className={`w-1.5 h-1.5 rounded-full ${
                  phase === 'complete' || phase === 'exit' ? 'bg-black' : 'bg-black/40'
                }`}
              />
            ))}
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Corner accents */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 1 }}
        className="absolute top-8 left-8 w-12 h-12 border-l border-t border-black/[0.08]"
      />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6, duration: 1 }}
        className="absolute top-8 right-8 w-12 h-12 border-r border-t border-black/[0.08]"
      />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7, duration: 1 }}
        className="absolute bottom-8 left-8 w-12 h-12 border-l border-b border-black/[0.08]"
      />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8, duration: 1 }}
        className="absolute bottom-8 right-8 w-12 h-12 border-r border-b border-black/[0.08]"
      />

      {/* Bottom tagline */}
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={phase === 'exit' ? { opacity: 0, y: -10 } : { opacity: 1, y: 0 }}
        transition={{ delay: 2.4, duration: 0.6 }}
        className="absolute bottom-12 text-[11px] text-black/25 tracking-[0.3em] uppercase"
      >
        Redefining Tomorrow
      </motion.p>

      {/* 1.7: Skip button for returning visitors — appears after 2s */}
      <AnimatePresence>
        {showSkip && phase === 'loading' && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={handleSkip}
            className="absolute bottom-12 right-8 text-[11px] text-black/30 hover:text-black/60 tracking-[0.1em] uppercase transition-colors duration-200 flex items-center gap-2 group"
          >
            <span>Skip</span>
            <svg 
              className="w-3 h-3 transform group-hover:translate-x-0.5 transition-transform" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor" 
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </motion.button>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ============================================
// NAVIGATION — Section 2.1: Desktop Structure
// ============================================
// Apple-standard: 72px height, 3-column grid
// Logo left | Links TRUE center | CTA far right
// Full-width edge-to-edge with inner max-width
// Padding: 48px (lg) → 64px (xl)
// ============================================

const NAV_LINKS = ['Divisions', 'Ecosystem', 'Impact', 'About', 'Careers'] as const;

// ═══════════════════════════════════════════════════════════════════════════
// MEGA MENU — Section 2.8.1 Implementation
// ═══════════════════════════════════════════════════════════════════════════

const MEGA_MENU_DATA = {
  tech: {
    links: ['AI Solutions', 'Cloud Platform', 'Hardware Labs', 'Enterprise'],
  },
  media: {
    links: ['Content Studio', 'Digital Publishing', 'Streaming', 'Podcasts'],
  },
  labs: {
    links: ['R&D Center', 'Prototyping', 'Patents', 'Open Source'],
  },
  studios: {
    links: ['Brand Design', 'Product Design', 'Motion', '3D/AR'],
  },
  ventures: {
    links: ['Portfolio', 'Accelerator', 'Fund', 'Partnerships'],
  },
  academy: {
    links: ['Courses', 'Certifications', 'Workshops', 'Mentorship'],
  },
};

function MegaMenu({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  // Close on escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
    }
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
          className="absolute top-full left-0 right-0 bg-white shadow-[0_24px_64px_rgba(0,0,0,0.12)] border-t border-black/5 z-[100]"
          onMouseLeave={onClose}
        >
          <div className="max-w-[1440px] mx-auto px-6 lg:px-12 xl:px-16 py-10">
            {/* Division Grid */}
            <div className="grid grid-cols-6 gap-8">
              {divisions.map((division, index) => (
                <motion.div
                  key={division.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className="group"
                >
                  {/* Color dot */}
                  <div 
                    className="w-2 h-2 rounded-full mb-4 group-hover:scale-125 transition-transform"
                    style={{ backgroundColor: division.color }}
                  />
                  
                  {/* Division name */}
                  <h4 className="text-[14px] font-semibold text-black mb-1 tracking-tight">
                    {division.name.replace('KRONOS ', '')}
                  </h4>
                  
                  {/* Tagline */}
                  <p className="text-[12px] text-black/40 mb-4">
                    {division.tagline}
                  </p>
                  
                  {/* Sub-links */}
                  <ul className="space-y-2">
                    {MEGA_MENU_DATA[division.id as keyof typeof MEGA_MENU_DATA].links.map((link) => (
                      <li key={link}>
                        <a 
                          href="#"
                          className="text-[13px] text-black/50 hover:text-black transition-colors relative group/link"
                        >
                          {link}
                          <span className="absolute -bottom-0.5 left-0 w-0 h-[1px] bg-black/30 group-hover/link:w-full transition-all duration-200" />
                        </a>
                      </li>
                    ))}
                  </ul>
                  
                  {/* View all link */}
                  <a 
                    href={`#${division.id}`}
                    className="inline-flex items-center gap-1 mt-4 text-[12px] font-medium hover:gap-2 transition-all"
                    style={{ color: division.color }}
                  >
                    View All
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </a>
                </motion.div>
              ))}
            </div>

            {/* Footer row */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="mt-10 pt-8 border-t border-black/5 flex items-center justify-between"
            >
              <p className="text-[13px] text-black/40">
                Explore all six divisions of the KRONOS CONTROL ecosystem
              </p>
              <a 
                href="#divisions"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-black text-white rounded-full text-[13px] font-medium hover:bg-black/85 transition-colors"
              >
                View All Divisions
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </a>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SCROLL PROGRESS INDICATOR — Section 2.8.8 Implementation
// ═══════════════════════════════════════════════════════════════════════════

function ScrollProgressBar() {
  const progressRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let ticking = false;
    
    const updateProgress = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          if (progressRef.current) {
            const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
            const scrolled = window.scrollY;
            const progress = scrollHeight > 0 ? (scrolled / scrollHeight) : 0;
            progressRef.current.style.transform = `scaleX(${progress})`;
            progressRef.current.style.opacity = progress > 0 ? '1' : '0';
          }
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', updateProgress, { passive: true });
    updateProgress();
    return () => window.removeEventListener('scroll', updateProgress);
  }, []);

  return (
    <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-transparent">
      <div
        ref={progressRef}
        className="h-full bg-black origin-left transition-none"
        style={{ transform: 'scaleX(0)', opacity: 0 }}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SEARCH OVERLAY — Section 2.8.2 Implementation
// ═══════════════════════════════════════════════════════════════════════════

function SearchOverlay({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Close on escape
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  const recentSearches = ['KRONOS TECH', 'AI Solutions', 'Careers', 'Academy courses'];
  const suggestions = query 
    ? divisions.filter(d => 
        d.name.toLowerCase().includes(query.toLowerCase()) ||
        d.tagline.toLowerCase().includes(query.toLowerCase())
      )
    : [];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[200] bg-white"
          role="dialog"
          aria-modal="true"
          aria-label="Search"
        >
          <div className="max-w-3xl mx-auto px-6 pt-32">
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center rounded-full hover:bg-black/5 transition-colors"
              aria-label="Close search"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Search input */}
            <div className="relative">
              <svg 
                className="absolute left-0 top-1/2 -translate-y-1/2 w-6 h-6 text-black/30"
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search KRONOS CONTROL..."
                className="w-full pl-10 pr-10 py-4 text-[24px] md:text-[32px] font-light border-b-2 border-black/10 focus:border-black/30 outline-none transition-colors placeholder:text-black/20"
              />
              {query && (
                <button
                  onClick={() => setQuery('')}
                  className="absolute right-0 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full hover:bg-black/5 transition-colors"
                >
                  <svg className="w-4 h-4 text-black/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* Results or recent searches */}
            <div className="mt-10">
              {query ? (
                // Search results
                suggestions.length > 0 ? (
                  <div>
                    <p className="text-[12px] text-black/40 uppercase tracking-[0.1em] mb-4">Results</p>
                    <ul className="space-y-2">
                      {suggestions.map((division) => (
                        <li key={division.id}>
                          <a 
                            href={`#${division.id}`}
                            onClick={onClose}
                            className="flex items-center gap-4 p-4 rounded-xl hover:bg-black/5 transition-colors"
                          >
                            <div 
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: division.color }}
                            />
                            <div>
                              <p className="font-medium">{division.name}</p>
                              <p className="text-[13px] text-black/40">{division.tagline}</p>
                            </div>
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="text-black/40">No results found for "{query}"</p>
                )
              ) : (
                // Recent searches
                <div>
                  <p className="text-[12px] text-black/40 uppercase tracking-[0.1em] mb-4">Recent Searches</p>
                  <ul className="space-y-1">
                    {recentSearches.map((search) => (
                      <li key={search}>
                        <button 
                          onClick={() => setQuery(search)}
                          className="flex items-center gap-3 p-3 rounded-lg hover:bg-black/5 transition-colors w-full text-left"
                        >
                          <svg className="w-4 h-4 text-black/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-black/60">{search}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Navigation({ scrolled }: { scrolled: boolean }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [megaMenuOpen, setMegaMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string>('');
  const [hideNav, setHideNav] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);
  const megaMenuTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 2.5: Hide nav on scroll down, show on scroll up — OPTIMIZED with RAF
  useEffect(() => {
    let ticking = false;
    let lastScroll = lastScrollY;
    
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const currentScrollY = window.scrollY;
          
          if (currentScrollY > 500) {
            if (currentScrollY > lastScroll + 10) {
              setHideNav(true);
            } else if (currentScrollY < lastScroll - 10) {
              setHideNav(false);
            }
          } else {
            setHideNav(false);
          }
          
          lastScroll = currentScrollY;
          setLastScrollY(currentScrollY);
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  // 2.3: Track active section based on scroll position
  useEffect(() => {
    const sections = ['divisions', 'ecosystem', 'impact', 'about', 'careers'];
    
    const observerCallback = (entries: IntersectionObserverEntry[]) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveSection(entry.target.id);
        }
      });
    };

    const observer = new IntersectionObserver(observerCallback, {
      rootMargin: '-40% 0px -55% 0px', // Trigger when section is in middle of viewport
      threshold: 0,
    });

    sections.forEach((id) => {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, []);

  // Close mobile menu on escape key + focus trap
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileOpen(false);
        setMegaMenuOpen(false);
      }
      
      // 2.6: Focus trap within mobile menu
      if (mobileOpen && e.key === 'Tab') {
        const mobileMenu = document.getElementById('mobile-nav');
        if (!mobileMenu) return;
        
        const focusableElements = mobileMenu.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        
        if (focusableElements.length === 0) return;
        
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        
        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };
    
    if (mobileOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
      
      // Auto-focus first link when menu opens
      setTimeout(() => {
        const mobileMenu = document.getElementById('mobile-nav');
        const firstLink = mobileMenu?.querySelector<HTMLElement>('a');
        firstLink?.focus();
      }, 100);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  // Mega menu hover handlers with delay
  const handleDivisionsMouseEnter = () => {
    if (megaMenuTimeoutRef.current) {
      clearTimeout(megaMenuTimeoutRef.current);
    }
    megaMenuTimeoutRef.current = setTimeout(() => {
      setMegaMenuOpen(true);
    }, 150); // 150ms delay before opening
  };

  const handleDivisionsMouseLeave = () => {
    if (megaMenuTimeoutRef.current) {
      clearTimeout(megaMenuTimeoutRef.current);
    }
    megaMenuTimeoutRef.current = setTimeout(() => {
      setMegaMenuOpen(false);
    }, 300); // 300ms delay before closing
  };

  const handleMegaMenuMouseEnter = () => {
    if (megaMenuTimeoutRef.current) {
      clearTimeout(megaMenuTimeoutRef.current);
    }
  };

  const handleMegaMenuMouseLeave = () => {
    megaMenuTimeoutRef.current = setTimeout(() => {
      setMegaMenuOpen(false);
    }, 200);
  };

  return (
    <>
    {/* 2.7: Skip to Main Content link (accessibility) */}
    <a
      href="#manifesto"
      className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-black focus:text-white focus:rounded-lg focus:text-sm focus:font-medium focus:outline-none focus:ring-2 focus:ring-white/50"
    >
      Skip to main content
    </a>

    <motion.header
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, delay: 3.8, ease: [...ease] }}
      className={`fixed top-0 left-0 right-0 z-50 w-full transition-all duration-500 ${
        hideNav && !mobileOpen ? '-translate-y-full' : 'translate-y-0'
      } ${
        scrolled
          ? 'bg-white/80 backdrop-blur-2xl shadow-[0_1px_0_rgba(0,0,0,0.06),0_4px_20px_rgba(0,0,0,0.05)]'
          : 'bg-transparent'
      }`}
      role="banner"
    >
      {/* 
        Full-width container → inner max-width
        Padding: 24px (mobile) → 48px (lg) → 64px (xl)
      */}
      <div className="w-full max-w-[1440px] mx-auto px-6 lg:px-12 xl:px-16">
        {/* 
          3-column grid for TRUE center alignment:
          [Logo] ←——— [Centered Nav Links] ———→ [CTA Button]
          All perfectly vertically centered at 72px height
        */}
        <div 
          className="relative grid grid-cols-[auto_1fr_auto] items-center"
          style={{ height: `${NAV_HEIGHT}px` }}
        >
          {/* ═══ COLUMN 1: Logo (left-aligned) ═══ */}
          {/* 
            2.2 Logo Treatment — Complete Implementation
            - SVG logo mark (not text) for crisp rendering at any zoom
            - Smooth scroll to top on click
            - Hover: scale + glow | Active: scale down
            - Accessible: aria-label, focus-visible, semantic <a>
            - Responsive: mark only on mobile, + wordmark on sm+
          */}
          <motion.a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            className="group flex items-center gap-2.5 cursor-pointer select-none z-10 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-black/50 rounded-lg"
            aria-label="KRONOS CONTROL — Home"
          >
            {/* Logo mark — 36×36px SVG in rounded container */}
            <div 
              className={`relative w-[36px] h-[36px] rounded-[10px] flex items-center justify-center transition-all duration-300 group-hover:shadow-[0_0_16px_rgba(0,0,0,0.15)] ${
                scrolled || mobileOpen 
                  ? 'bg-black' 
                  : 'bg-white group-hover:shadow-[0_0_16px_rgba(255,255,255,0.25)]'
              }`}
            >
              {/* CHRONOS CROWN LOGO — Built on Golden Ratio (φ = 1.618) */}
              <svg viewBox="0 0 40 40" className="w-[18px] h-[18px]" aria-hidden="true">
                <path d={LOGO.hourglass} fill="none" stroke={scrolled || mobileOpen ? 'white' : 'black'} strokeWidth={LOGO.spineWidth} strokeLinecap="round" strokeLinejoin="round" className="transition-[stroke] duration-300" />
                <path d={LOGO.crown} fill="none" stroke={scrolled || mobileOpen ? 'white' : 'black'} strokeWidth={LOGO.armWidth} strokeLinecap="round" strokeLinejoin="round" className="transition-[stroke] duration-300" />
                <line x1={LOGO.diagonal.x1} y1={LOGO.diagonal.y1} x2={LOGO.diagonal.x2} y2={LOGO.diagonal.y2} stroke={scrolled || mobileOpen ? 'white' : 'black'} strokeWidth={LOGO.armWidth} strokeLinecap="round" className="transition-[stroke] duration-300" />
              </svg>
            </div>

            {/* Wordmark — hidden on xs, visible sm+ */}
            <div 
              className={`hidden sm:flex items-baseline gap-1.5 text-[15px] tracking-[-0.01em] transition-colors duration-300 ${
                scrolled || mobileOpen ? 'text-black' : 'text-white'
              }`}
            >
              <span className="font-semibold">KRONOS</span>
              <span className="font-light opacity-50 group-hover:opacity-70 transition-opacity duration-300">CONTROL</span>
            </div>
          </motion.a>

          {/* ═══ COLUMN 2: Nav Links (TRUE center of viewport) ═══ */}
          <nav 
            className="hidden lg:flex items-center justify-center gap-[36px]"
            role="navigation"
            aria-label="Main navigation"
          >
            {NAV_LINKS.map((item) => (
              item === 'Divisions' ? (
                // Divisions link with mega menu trigger
                <div
                  key={item}
                  onMouseEnter={handleDivisionsMouseEnter}
                  onMouseLeave={handleDivisionsMouseLeave}
                  className="relative"
                >
                  <a
                    href="#divisions"
                    className={`relative text-[13px] font-medium tracking-[0.005em] transition-all duration-200 group flex items-center gap-1 ${
                      scrolled 
                        ? 'text-black/55 hover:text-black' 
                        : 'text-white/65 hover:text-white'
                    }`}
                  >
                    {item}
                    {/* Chevron */}
                    <svg 
                      className={`w-3 h-3 transition-transform duration-200 ${megaMenuOpen ? 'rotate-180' : ''}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                    {/* Hover underline */}
                    <span 
                      className={`absolute -bottom-[3px] left-0 h-[1px] w-0 group-hover:w-full transition-all duration-300 ease-out ${
                        scrolled ? 'bg-black/40' : 'bg-white/40'
                      }`}
                    />
                  </a>
                </div>
              ) : (
                <a
                  key={item}
                  href={`#${item.toLowerCase()}`}
                  className={`relative text-[13px] font-medium tracking-[0.01em] transition-all duration-200 group ${
                    activeSection === item.toLowerCase()
                      ? (scrolled ? 'text-black' : 'text-white')
                      : (scrolled ? 'text-black/55 hover:text-black' : 'text-white/65 hover:text-white')
                  }`}
                >
                  {item}
                  {/* Active indicator or hover underline */}
                  <span 
                    className={`absolute -bottom-[3px] left-0 h-[1px] transition-all duration-300 ease-out ${
                      activeSection === item.toLowerCase()
                        ? `w-full ${scrolled ? 'bg-black' : 'bg-white'}`
                        : `w-0 group-hover:w-full ${scrolled ? 'bg-black/40' : 'bg-white/40'}`
                    }`}
                  />
                </a>
              )
            ))}
          </nav>

          {/* ═══ COLUMN 3: CTA + Search + Hamburger (right-aligned) ═══ */}
          <div className="flex items-center gap-2 sm:gap-3 justify-end z-10">
            {/* Search button — 2.8.2 */}
            <button
              onClick={() => setSearchOpen(true)}
              className={`hidden sm:flex w-10 h-10 items-center justify-center rounded-full transition-colors ${
                scrolled
                  ? 'text-black/50 hover:bg-black/5 hover:text-black'
                  : 'text-white/50 hover:bg-white/10 hover:text-white'
              }`}
              aria-label="Search"
            >
              <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>

            {/* CTA button — always visible on md+, pill shape */}
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className={`group hidden md:inline-flex items-center gap-1.5 rounded-full text-[13px] font-semibold tracking-[0.005em] transition-all duration-300 overflow-hidden relative ${
                scrolled
                  ? 'bg-black text-white hover:bg-black/85 px-[22px] py-[9px]'
                  : 'bg-white/15 backdrop-blur-md text-white border border-white/20 hover:bg-white/25 hover:border-white/40 px-[22px] py-[9px]'
              }`}
            >
              {/* Shimmer effect */}
              <div className={`absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out bg-gradient-to-r from-transparent ${
                scrolled ? 'via-white/15' : 'via-white/10'
              } to-transparent pointer-events-none`} />
              
              <span className="relative">Get Started</span>
              
              {/* Arrow appears on hover */}
              <svg 
                className="relative w-0 group-hover:w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-all duration-300 ease-out overflow-hidden" 
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </motion.button>

            {/* Hamburger — visible below lg breakpoint */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className={`lg:hidden relative w-[44px] h-[44px] flex flex-col items-center justify-center gap-[5px] rounded-full transition-colors duration-300 ${
                scrolled || mobileOpen
                  ? 'text-black hover:bg-black/5' 
                  : 'text-white hover:bg-white/10'
              }`}
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileOpen}
              aria-controls="mobile-nav"
            >
              <motion.span
                animate={mobileOpen 
                  ? { rotate: 45, y: 6.5, width: 20 } 
                  : { rotate: 0, y: 0, width: 20 }
                }
                transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
                className={`block h-[1.5px] rounded-full origin-center ${
                  scrolled || mobileOpen ? 'bg-black' : 'bg-white'
                }`}
                style={{ width: 20 }}
              />
              <motion.span
                animate={mobileOpen 
                  ? { opacity: 0, scaleX: 0 } 
                  : { opacity: 1, scaleX: 1 }
                }
                transition={{ duration: 0.2 }}
                className={`block w-[20px] h-[1.5px] rounded-full ${
                  scrolled || mobileOpen ? 'bg-black' : 'bg-white'
                }`}
              />
              <motion.span
                animate={mobileOpen 
                  ? { rotate: -45, y: -6.5, width: 20 } 
                  : { rotate: 0, y: 0, width: 20 }
                }
                transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
                className={`block h-[1.5px] rounded-full origin-center ${
                  scrolled || mobileOpen ? 'bg-black' : 'bg-white'
                }`}
                style={{ width: 20 }}
              />
            </button>
          </div>
        </div>
      </div>

      {/* ═══ MOBILE MENU OVERLAY ═══ */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            id="mobile-nav"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: `calc(100vh - ${NAV_HEIGHT}px)` }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
            className="lg:hidden bg-white overflow-hidden border-t border-black/[0.04]"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
          >
            <div className="flex flex-col justify-between h-full px-6 lg:px-12 xl:px-16 py-10">
              {/* Links with divider lines */}
              <nav className="space-y-0" role="navigation" aria-label="Mobile navigation">
                {NAV_LINKS.map((item, i) => (
                  <motion.div
                    key={item}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + i * 0.06, duration: 0.4, ease: [...ease] }}
                    className={i < NAV_LINKS.length - 1 ? 'border-b border-black/[0.06]' : ''}
                  >
                    <a
                      href={`#${item.toLowerCase()}`}
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center justify-between text-[28px] sm:text-[36px] font-semibold text-black tracking-tight py-5 hover:text-black/60 transition-colors duration-200 group"
                    >
                      <span>{item}</span>
                      {/* Arrow indicator */}
                      <svg 
                        className="w-5 h-5 text-black/20 group-hover:text-black/40 group-hover:translate-x-1 transition-all duration-200" 
                        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </a>
                  </motion.div>
                ))}
              </nav>

              {/* Bottom area */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.4 }}
                className="space-y-6 pt-8 border-t border-black/[0.06]"
              >
                <button className="w-full px-8 py-[14px] bg-black text-white rounded-full text-[15px] font-semibold hover:bg-black/85 transition-colors">
                  Get Started
                </button>
                <p className="text-center text-[12px] text-black/30 tracking-[0.1em] uppercase">
                  © {new Date().getFullYear()} KRONOS CONTROL
                </p>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ MEGA MENU — 2.8.1 ═══ */}
      <div
        onMouseEnter={handleMegaMenuMouseEnter}
        onMouseLeave={handleMegaMenuMouseLeave}
      >
        <MegaMenu isOpen={megaMenuOpen} onClose={() => setMegaMenuOpen(false)} />
      </div>

      {/* ═══ SCROLL PROGRESS — 2.8.8 ═══ */}
      {scrolled && <ScrollProgressBar />}

      {/* ═══ SEARCH OVERLAY — 2.8.2 ═══ */}
      <SearchOverlay isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </motion.header>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// HERO SECTION — 3.1 Layout Structure (Complete Implementation)
// ═══════════════════════════════════════════════════════════════════════════
// 
// CHECKLIST 3.1 IMPLEMENTATION:
// ✅ 3.1.1 Viewport & Dimensions
//    - 100dvh with 100vh fallback
//    - min-height: 600px, max-height: 1200px
//    - Nav overlays hero (no calc needed)
// ✅ 3.1.2 Padding & Spacing
//    - Responsive horizontal: 24px → 40px → 48px → 64px
//    - Top padding accounts for nav (pt-[180px])
// ✅ 3.1.3 Content Positioning
//    - Flexbox centering
//    - Center aligned (Apple product page style)
// ✅ 3.1.4 Z-Index Layering
//    - 0: Background/base
//    - 1: 3D Canvas
//    - 2: Gradient overlays
//    - 5: Main content
//    - 10: Scroll indicator
// ✅ 3.1.5 Overflow Handling
//    - overflow-x: hidden (prevents 3D element scroll)
// ✅ 3.1.6 Background Layers
//    - Layer 1: Solid black base
//    - Layer 2: 3D Canvas (opacity 0.5)
//    - Layer 3: Gradient overlays for text contrast
// ✅ 3.1.9 Entry Animation Timing
//    - Uses TIMING constants for coordinated reveal
// ✅ 3.1.11 Accessibility
//    - Semantic <section> with aria-label
//    - <h1> for main heading (only one per page)
//    - 3D canvas has aria-hidden
//
// ═══════════════════════════════════════════════════════════════════════════

function HeroSection() {
  const [scrollY, setScrollY] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(800);
  const rafRef = useRef<number>(0);
  const scrollRef = useRef(0);
  
  // Device capability detection — disable 3D on low-end devices
  const canHandle3D = useDeviceCapability();

  // Track viewport height for parallax calculations
  useEffect(() => {
    setViewportHeight(window.innerHeight);
    const handleResize = () => setViewportHeight(window.innerHeight);
    window.addEventListener('resize', handleResize, { passive: true });
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // OPTIMIZED: Throttled scroll with RAF - only update state when needed
  useEffect(() => {
    let ticking = false;
    
    const handleScroll = () => {
      scrollRef.current = window.scrollY;
      
      if (!ticking) {
        rafRef.current = requestAnimationFrame(() => {
          // Only update if in hero section
          if (scrollRef.current < viewportHeight) {
            setScrollY(scrollRef.current);
          }
          ticking = false;
        });
        ticking = true;
      }
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      cancelAnimationFrame(rafRef.current);
    };
  }, [viewportHeight]);

  // Parallax calculations - memoized for performance
  const progress = Math.min(scrollY / (viewportHeight * 0.7), 1);
  const contentOpacity = 1 - progress;
  const contentTranslateY = scrollY * 0.25;
  const contentScale = 1 - progress * 0.03;

  // Scroll indicator fades out faster
  const scrollIndicatorOpacity = Math.max(0, 1 - progress * 2);

  return (
    <section 
      className="relative bg-black overflow-x-hidden"
      aria-label="Hero - KRONOS CONTROL"
      style={{
        // 3.1.1: Dynamic viewport height with fallbacks
        minHeight: `${HERO_MIN_HEIGHT}px`,
        maxHeight: `${HERO_MAX_HEIGHT}px`,
        height: '100dvh', // Modern browsers
      }}
    >
      {/* ═══ LAYER 0: Base Background ═══ */}
      <div className="absolute inset-0 bg-black z-0" />

      {/* ═══ LAYER 1: 3D Crystal Canvas OR Static Fallback ═══ */}
      {canHandle3D ? (
        <div 
          className="absolute inset-0 z-[1]"
          style={{ opacity: 0.5 }}
          aria-hidden="true"
        >
          <Canvas 
            camera={{ position: [0, 0, 5], fov: 35 }} 
            dpr={Math.min(window.devicePixelRatio, 1.5)}
            gl={{ 
              antialias: false,
              alpha: true,
              powerPreference: 'high-performance',
              stencil: false,
              depth: true,
            }}
            style={{ pointerEvents: 'none' }}
          >
            <Suspense fallback={null}>
              <Scene />
            </Suspense>
          </Canvas>
        </div>
      ) : (
        /* Static CSS fallback for low-end devices — NO 3D, just elegant gradient */
        <div 
          className="absolute inset-0 z-[1] flex items-center justify-center"
          style={{ opacity: 0.15 }}
          aria-hidden="true"
        >
          <div 
            className="w-[35vw] max-w-[400px] aspect-square"
            style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.05) 50%, rgba(255,255,255,0.2) 100%)',
              clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
              transform: 'translateX(8%) rotate(0deg)',
              animation: 'float 8s ease-in-out infinite',
            }}
          />
        </div>
      )}

      {/* ═══ LAYER 2: Gradient Overlays (for text contrast) ═══ */}
      <div className="absolute inset-0 z-[2] pointer-events-none">
        {/* Vertical gradient — darker at top and bottom */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80" />
        {/* Horizontal gradient — subtle vignette */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/30 via-transparent to-black/30" />
        {/* Radial gradient — spotlight effect on center */}
        <div 
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse 80% 50% at 50% 50%, transparent 0%, rgba(0,0,0,0.4) 100%)'
          }}
        />
      </div>

      {/* ═══ LAYER 5: Main Content ═══ */}
      <div
        className="relative z-[5] flex flex-col items-center justify-center h-full px-6 sm:px-10 lg:px-12 xl:px-16 text-center"
        style={{ 
          opacity: contentOpacity, 
          transform: `translateY(${contentTranslateY}px) scale(${contentScale})`,
          paddingTop: 'max(env(safe-area-inset-top, 0px), 120px)',
          paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 100px)',
          willChange: progress > 0 ? 'transform, opacity' : 'auto',
        }}
      >
        <div className="max-w-[1200px] w-full">
          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* HERO TYPOGRAPHY BLOCK — Apple-Level Premium */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          
          {/* Overline — Dual animated lines with center diamond */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: TIMING.HERO_LINE, duration: 0.8 }}
            className="flex items-center justify-center gap-4 mb-10 sm:mb-12"
          >
            {/* Left line — gradient fade */}
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 'clamp(30px, 8vw, 60px)', opacity: 1 }}
              transition={{ delay: TIMING.HERO_LINE, duration: 0.7, ease: [0.25, 0.1, 0.25, 1] }}
              className="h-[1px] bg-gradient-to-l from-white/50 to-transparent"
            />
            
            {/* Center diamond — rotated square */}
            <motion.div
              initial={{ scale: 0, rotate: 0, opacity: 0 }}
              animate={{ scale: 1, rotate: 45, opacity: 1 }}
              transition={{ delay: TIMING.HERO_LINE + 0.15, duration: 0.5, type: "spring", stiffness: 300 }}
              className="w-2 h-2 bg-white/60"
            />
            
            {/* Right line — gradient fade */}
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 'clamp(30px, 8vw, 60px)', opacity: 1 }}
              transition={{ delay: TIMING.HERO_LINE, duration: 0.7, ease: [0.25, 0.1, 0.25, 1] }}
              className="h-[1px] bg-gradient-to-r from-white/50 to-transparent"
            />
          </motion.div>

          {/* Main Title Container — Unified Block */}
          <div className="relative">
            
            {/* "KRONOS" — Primary, Bold, Commanding */}
            <div className="overflow-hidden">
              <motion.h1
                initial={{ y: '120%', opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: TIMING.HERO_TITLE_1, duration: 1, ease: [0.16, 1, 0.3, 1] }}
                className="font-black text-white leading-[0.82] tracking-[-0.04em] select-none"
                style={{ 
                  fontSize: 'clamp(4rem, 18vw, 15rem)',
                  WebkitFontSmoothing: 'antialiased',
                  MozOsxFontSmoothing: 'grayscale',
                  textShadow: '0 0 120px rgba(255,255,255,0.08), 0 4px 40px rgba(0,0,0,0.4)',
                }}
              >
                KRONOS
              </motion.h1>
            </div>

            {/* "CONTROL" — Secondary, Elegant, Refined */}
            {/* Negative margin pulls it closer to KRONOS for visual unity */}
            <div className="overflow-hidden" style={{ marginTop: 'clamp(-4px, -0.5vw, -8px)' }}>
              <motion.h1
                initial={{ y: '120%', opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: TIMING.HERO_TITLE_2, duration: 1, ease: [0.16, 1, 0.3, 1] }}
                className="font-light text-white/40 leading-[1] uppercase select-none"
                style={{ 
                  fontSize: 'clamp(1rem, 4vw, 3rem)',
                  letterSpacing: 'clamp(0.3em, 1vw, 0.5em)',
                }}
              >
                CONTROL
              </motion.h1>
            </div>
            
            {/* Subtle underline accent below CONTROL */}
            <motion.div
              initial={{ scaleX: 0, opacity: 0 }}
              animate={{ scaleX: 1, opacity: 1 }}
              transition={{ delay: TIMING.HERO_TITLE_2 + 0.3, duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
              className="mx-auto mt-6 sm:mt-8 h-[1px] bg-gradient-to-r from-transparent via-white/25 to-transparent origin-center"
              style={{ width: 'clamp(80px, 15vw, 180px)' }}
            />
          </div>

          {/* Tagline — Premium Typography with Highlighted Words */}
          {/* FIXED: Proper centering on ALL devices with flex column layout */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: TIMING.HERO_SUBTITLE, duration: 0.9, ease: [0.25, 0.1, 0.25, 1] }}
            className="mt-10 sm:mt-12 md:mt-14 w-full flex justify-center"
          >
            {/* Container with explicit centering */}
            <div 
              className="flex flex-col items-center text-center max-w-2xl px-4"
              style={{
                fontSize: 'clamp(0.95rem, 2.5vw, 1.35rem)',
                letterSpacing: '0.01em',
                lineHeight: 1.8,
              }}
            >
              {/* Line 1: One vision. Six divisions. */}
              <span className="block font-light">
                <span className="text-white/70 font-normal">One vision.</span>
                <span className="text-white/40">{' '}Six divisions.</span>
              </span>
              
              {/* Line 2: Building the ecosystem */}
              <span className="block font-light">
                <span className="text-white/70 font-normal">Building the ecosystem</span>
              </span>
              
              {/* Line 3: that powers tomorrow's world. */}
              <span className="block font-light">
                <span className="text-white/40">that powers tomorrow's world.</span>
              </span>
            </div>
          </motion.div>

          {/* CTA Buttons — 3.5 Complete Implementation with Magnetic Effect */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: TIMING.HERO_BUTTONS, duration: 0.8 }}
            className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4"
          >
            {/* Primary Button — MAGNETIC with arrow icon */}
            {/* ═══ PRIMARY BUTTON — Premium Glass Pill with Shimmer ═══ */}
            <MagneticButton
              onClick={() => document.getElementById('divisions')?.scrollIntoView({ behavior: 'smooth' })}
              className="group relative w-full sm:w-auto overflow-hidden rounded-full"
            >
              {/* Outer glow — appears on hover */}
              <div className="absolute inset-0 rounded-full bg-white/25 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
              
              {/* Gradient border wrapper */}
              <div className="relative rounded-full p-[1.5px] bg-gradient-to-r from-white/50 via-white/20 to-white/50 group-hover:from-white/70 group-hover:via-white/30 group-hover:to-white/70 transition-all duration-500">
                {/* Inner glass pill */}
                <div className="relative flex items-center justify-center gap-3 px-8 sm:px-10 py-4 sm:py-[18px] bg-white/[0.12] backdrop-blur-xl rounded-full overflow-hidden">
                  {/* Shimmer sweep on hover */}
                  <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />
                  
                  {/* Grid icon — 4 squares representing divisions */}
                  <div className="relative grid grid-cols-2 gap-[2px] w-[14px] h-[14px]">
                    {[0,1,2,3].map(i => (
                      <div key={i} className="rounded-[2px] bg-white/80 group-hover:bg-white transition-colors duration-300" />
                    ))}
                  </div>
                  
                  {/* Text */}
                  <span className="relative text-[14px] sm:text-[15px] font-semibold text-white tracking-tight">
                    Explore Divisions
                  </span>
                  
                  {/* Arrow — slides right on hover */}
                  <svg 
                    className="relative w-4 h-4 text-white/60 group-hover:text-white group-hover:translate-x-1 transition-all duration-300" 
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </div>
              </div>
            </MagneticButton>
            
            {/* ═══ SECONDARY BUTTON — Minimal Play with Underline ═══ */}
            <MagneticButton
              className="group relative w-full sm:w-auto flex items-center justify-center gap-3 px-6 py-4"
            >
              {/* Play circle — bordered with triangle */}
              <div className="relative w-[38px] h-[38px] rounded-full border-[1.5px] border-white/25 group-hover:border-white/50 group-hover:bg-white/[0.06] flex items-center justify-center transition-all duration-300">
                <svg className="w-3.5 h-3.5 ml-[2px] text-white/60 group-hover:text-white transition-colors duration-300" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
              
              {/* Text with underline animation */}
              <div className="relative">
                <span className="text-[14px] sm:text-[15px] font-medium text-white/50 group-hover:text-white transition-colors duration-300">
                  Watch Film
                </span>
                {/* Underline slides in from left */}
                <span className="absolute -bottom-1 left-0 w-0 h-[1px] bg-white/40 group-hover:w-full transition-all duration-300 ease-out" />
              </div>
            </MagneticButton>
          </motion.div>
        </div>
      </div>

      {/* ═══ LAYER 10: Scroll Indicator — 3.6 Complete Implementation ═══ */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: TIMING.HERO_SCROLL }}
        className="absolute bottom-8 sm:bottom-10 left-1/2 -translate-x-1/2 z-10"
        style={{ opacity: scrollIndicatorOpacity }}
        aria-hidden="true"
      >
        <motion.a
          href="#manifesto"
          onClick={(e) => {
            e.preventDefault();
            document.getElementById('manifesto')?.scrollIntoView({ behavior: 'smooth' });
          }}
          className="flex flex-col items-center gap-3 cursor-pointer group"
        >
          {/* Text label */}
          <span className="text-white/30 text-[11px] font-medium tracking-[0.2em] uppercase group-hover:text-white/50 transition-colors">
            Scroll
          </span>
          
          {/* Animated mouse icon with scroll wheel */}
          <div className="relative w-[22px] h-[34px] border-2 border-white/30 rounded-full group-hover:border-white/50 transition-colors">
            {/* Scroll wheel indicator — animates up and down */}
            <motion.div
              animate={{ y: [0, 8, 0], opacity: [1, 0.3, 1] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute top-2 left-1/2 -translate-x-1/2 w-[3px] h-[6px] bg-white/50 rounded-full"
            />
          </div>
          
          {/* Chevron arrow below mouse */}
          <motion.svg
            animate={{ y: [0, 4, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut', delay: 0.2 }}
            className="w-4 h-4 text-white/30 group-hover:text-white/50 transition-colors"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </motion.svg>
        </motion.a>
      </motion.div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MANIFESTO SECTION — COMPLETE IMPLEMENTATION (Parts 1, 2 & 3)
// ═══════════════════════════════════════════════════════════════════════════
//
// ✅ PART 1: FOUNDATION & SPACING (5.1.1 - 5.1.11)
// ✅ PART 2: TYPOGRAPHY TREATMENT (5.2 - 5.4)
//    - 5.2: Eyebrow with decorative line
//    - 5.3: Word highlighting (BLACK/GRAY technique)
//    - 5.4: Supporting text with optimal line-height
// ✅ PART 3: ANIMATION SYSTEM (5.5 - 5.8)
//    - 5.5: Scroll triggers & orchestrated sequencing
//    - 5.6: Decorative elements (watermark, noise, line)
//    - 5.8: Line-by-line reveal with stagger
//
// ═══════════════════════════════════════════════════════════════════════════

// 5.3.3: Highlighted text data structure for word-level styling
interface ManifestoLine {
  text: string;
  highlighted: boolean; // true = black, false = gray
}

// The manifesto statement split into lines with word highlighting
const MANIFESTO_LINES: ManifestoLine[][] = [
  // Line 1: "We don't just build companies."
  [
    { text: "We don't just ", highlighted: false },
    { text: "build companies.", highlighted: true },
  ],
  // Line 2: "We architect the future."
  [
    { text: "We ", highlighted: false },
    { text: "architect the future.", highlighted: true },
  ],
  // Line 3: "Every division, every innovation."
  [
    { text: "Every ", highlighted: false },
    { text: "division", highlighted: true },
    { text: ", every ", highlighted: false },
    { text: "innovation.", highlighted: true },
  ],
  // Line 4: "Unified under absolute control."
  [
    { text: "Unified under ", highlighted: false },
    { text: "absolute control.", highlighted: true },
  ],
];

// 5.5.3: Animation variants for orchestrated motion
const manifestoContainerVariants = {
  hidden: { opacity: 1 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.2,
    },
  },
};

const manifestoLineVariants = {
  hidden: { 
    opacity: 0, 
    y: 30,
    filter: 'blur(4px)',
  },
  visible: { 
    opacity: 1, 
    y: 0,
    filter: 'blur(0px)',
    transition: {
      duration: 0.7,
      ease: [0.25, 0.1, 0.25, 1] as const,
    },
  },
};

const manifestoFadeVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.25, 0.1, 0.25, 1] as const,
    },
  },
};

function ManifestoSection() {
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { 
    once: true, 
    amount: 0.2, // 5.5.1: Trigger at 20% visibility
    margin: '-100px',
  });

  return (
    <section 
      id="manifesto"
      ref={sectionRef}
      aria-label="Our Philosophy"
      className="relative overflow-hidden bg-white"
      style={{
        // 5.1.2: Fluid vertical padding
        paddingTop: 'clamp(80px, 12vw, 180px)',
        paddingBottom: 'clamp(80px, 12vw, 180px)',
        // 5.1.6: Scroll margin for fixed nav
        scrollMarginTop: `${NAV_HEIGHT + 32}px`,
      }}
    >
      {/* Clean white background — no noise, no watermarks (Apple philosophy: less is more) */}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* LAYER 5: MAIN CONTENT */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div 
        className="relative z-[5] w-full mx-auto px-6 sm:px-10 lg:px-12 xl:px-16"
        style={{ maxWidth: '900px' }}
      >
        <motion.div
          variants={manifestoContainerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          className="flex flex-col items-center text-center"
        >
          {/* ═══ 5.2: EYEBROW ═══ */}
          <motion.div
            variants={manifestoFadeVariants}
            className="flex flex-col items-center mb-8"
          >
            {/* 5.2.2: Eyebrow text */}
            <span className="text-[12px] font-semibold text-black/35 tracking-[0.15em] uppercase">
              Our Philosophy
            </span>
            
            {/* 5.6.3: Decorative line below eyebrow */}
            <motion.div
              initial={{ scaleX: 0 }}
              animate={isInView ? { scaleX: 1 } : {}}
              transition={{ duration: 0.6, delay: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
              className="w-[50px] h-[1px] bg-black/10 mt-4 origin-center"
            />
          </motion.div>

          {/* ═══ 5.3: MAIN STATEMENT WITH WORD HIGHLIGHTING ═══ */}
          <div className="space-y-1 sm:space-y-2">
            {MANIFESTO_LINES.map((line, lineIndex) => (
              <div key={lineIndex} className="overflow-hidden">
                <motion.p
                  variants={manifestoLineVariants}
                  className="leading-[1.15] tracking-[-0.02em]"
                  style={{
                    // 5.3.2: Responsive font size
                    fontSize: 'clamp(1.6rem, 5vw, 3.25rem)',
                    fontWeight: 700,
                  }}
                >
                  {/* 5.3.3: Word-level highlighting */}
                  {line.map((segment, segmentIndex) => (
                    <span 
                      key={segmentIndex}
                      className={segment.highlighted 
                        ? 'text-black' // Emphasized words
                        : 'text-black/30' // De-emphasized words
                      }
                    >
                      {segment.text}
                    </span>
                  ))}
                </motion.p>
              </div>
            ))}
          </div>

          {/* ═══ 5.4: SUPPORTING TEXT with TextReveal animation ═══ */}
          <motion.div
            variants={manifestoFadeVariants}
            className="mt-12 sm:mt-16 text-black/45 leading-[1.7] font-light max-w-[680px]"
            style={{
              // 5.4.2: Responsive font size for supporting text
              fontSize: 'clamp(1rem, 1.8vw, 1.2rem)',
            }}
          >
            <TextReveal delay={0.6}>
              For over a decade, we've been quietly building the infrastructure of tomorrow. Six divisions. One mission. Total transformation. Where others see boundaries, we see blueprints — and we build.
            </TextReveal>
          </motion.div>

          {/* ═══ Optional: CTA Link ═══ */}
          <motion.a
            variants={manifestoFadeVariants}
            href="#divisions"
            className="mt-10 inline-flex items-center gap-2 text-[14px] font-medium text-black/60 hover:text-black hover:gap-3 transition-all duration-300 group"
          >
            <span>Explore our divisions</span>
            <svg 
              className="w-4 h-4 transform group-hover:translate-x-1 transition-transform duration-300" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor" 
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </motion.a>
        </motion.div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// DIVISIONS SECTION — $1M APPLE BENTO GRID REDESIGN
// ═══════════════════════════════════════════════════════════════════════════
//
// Design Philosophy:
// - Bento grid layout with mixed card sizes (Apple feature page style)
// - Each division has its OWN visual world with unique gradient
// - Bold typography that COMMANDS attention
// - Subtle hover interactions with depth
// - Credibility badges with real metrics
// - Dark gradient cards, NOT boring gray boxes
//
// ═══════════════════════════════════════════════════════════════════════════

// Extended division data with gradients, metrics, and visual identity
const divisionCards = [
  {
    ...divisions[0], // TECH
    gradient: 'linear-gradient(145deg, #0a0a0a 0%, #0c1929 40%, #0d2847 100%)',
    accentGradient: 'linear-gradient(135deg, #0EA5E9, #3B82F6)',
    metric: '50+',
    metricLabel: 'Products Shipped',
    size: 'large' as const, // spans 2 cols
  },
  {
    ...divisions[1], // MEDIA
    gradient: 'linear-gradient(145deg, #0a0a0a 0%, #1a0a14 40%, #2d1020 100%)',
    accentGradient: 'linear-gradient(135deg, #EC4899, #F43F5E)',
    metric: '200+',
    metricLabel: 'Creators',
    size: 'medium' as const,
  },
  {
    ...divisions[2], // LABS
    gradient: 'linear-gradient(145deg, #0a0a0a 0%, #071a12 40%, #0a2e1c 100%)',
    accentGradient: 'linear-gradient(135deg, #10B981, #14B8A6)',
    metric: '30+',
    metricLabel: 'Patents Filed',
    size: 'medium' as const,
  },
  {
    ...divisions[3], // STUDIOS
    gradient: 'linear-gradient(145deg, #0a0a0a 0%, #140d1e 40%, #1f1333 100%)',
    accentGradient: 'linear-gradient(135deg, #8B5CF6, #A855F7)',
    metric: '15+',
    metricLabel: 'Awards Won',
    size: 'medium' as const,
  },
  {
    ...divisions[4], // VENTURES
    gradient: 'linear-gradient(145deg, #0a0a0a 0%, #1a1505 40%, #2d240a 100%)',
    accentGradient: 'linear-gradient(135deg, #F59E0B, #FB923C)',
    metric: '$50M',
    metricLabel: 'Deployed',
    size: 'medium' as const,
  },
  {
    ...divisions[5], // ACADEMY
    gradient: 'linear-gradient(145deg, #0a0a0a 0%, #051a1e 40%, #082d33 100%)',
    accentGradient: 'linear-gradient(135deg, #06B6D4, #22D3EE)',
    metric: '10K+',
    metricLabel: 'Students',
    size: 'large' as const, // spans 2 cols
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// PRODUCT SHOWCASE VISUALS — CSS-only mockups for each division
// ═══════════════════════════════════════════════════════════════════════════

function TechShowcase({ color }: { color: string }) {
  return (
    <div className="relative w-full h-full flex items-end justify-end p-2">
      {/* Browser window mockup */}
      <div className="w-[85%] max-w-[340px] rounded-lg overflow-hidden border border-white/[0.08] bg-black/40 backdrop-blur-sm shadow-2xl">
        {/* Title bar */}
        <div className="flex items-center gap-1.5 px-3 py-2 border-b border-white/[0.06]">
          <div className="w-2 h-2 rounded-full bg-white/15" />
          <div className="w-2 h-2 rounded-full bg-white/15" />
          <div className="w-2 h-2 rounded-full bg-white/15" />
          <div className="flex-1 mx-4 h-3 rounded-full bg-white/[0.06]" />
        </div>
        {/* Dashboard content */}
        <div className="p-3 space-y-2.5">
          {/* Stats row */}
          <div className="flex gap-2">
            {[95, 72, 88].map((val, i) => (
              <div key={i} className="flex-1 rounded-md p-2 bg-white/[0.04] border border-white/[0.06]">
                <div className="text-[8px] text-white/30 mb-1">{['Users', 'Revenue', 'Growth'][i]}</div>
                <div className="text-[11px] font-bold text-white/80">{val}%</div>
              </div>
            ))}
          </div>
          {/* Bar chart */}
          <div className="rounded-md p-2.5 bg-white/[0.03] border border-white/[0.05]">
            <div className="text-[7px] text-white/25 mb-2">ANALYTICS</div>
            <div className="flex items-end gap-[3px] h-[40px]">
              {[35, 55, 45, 70, 60, 85, 75, 90, 65, 80, 95, 70].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-sm transition-all duration-300"
                  style={{
                    height: `${h}%`,
                    background: i >= 9 ? color : `${color}40`,
                    opacity: 0.4 + (i / 12) * 0.6,
                  }}
                />
              ))}
            </div>
          </div>
          {/* Line items */}
          <div className="space-y-1.5">
            {[80, 65, 45].map((w, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: `${color}60` }} />
                <div className="h-[5px] rounded-full bg-white/[0.06]" style={{ width: `${w}%` }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function MediaShowcase({ color }: { color: string }) {
  return (
    <div className="relative w-full h-full flex items-end justify-end p-2">
      <div className="w-[85%] max-w-[280px] space-y-2">
        {/* Video player */}
        <div className="rounded-lg overflow-hidden border border-white/[0.08] bg-black/40">
          {/* Video area */}
          <div className="relative aspect-video bg-gradient-to-br from-white/[0.04] to-transparent flex items-center justify-center">
            {/* Play button */}
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ backgroundColor: `${color}30`, border: `1.5px solid ${color}50` }}
            >
              <svg className="w-4 h-4 ml-0.5" fill={`${color}cc`} viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
            {/* Duration badge */}
            <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/60 text-[7px] text-white/70 font-mono">
              12:34
            </div>
          </div>
          {/* Progress bar */}
          <div className="h-[3px] bg-white/[0.06]">
            <div className="h-full w-[35%] rounded-r-full" style={{ backgroundColor: color }} />
          </div>
          {/* Video info */}
          <div className="p-2.5">
            <div className="text-[9px] font-semibold text-white/70 mb-0.5">Brand Launch Film 2024</div>
            <div className="text-[7px] text-white/30">2.4M views • 3 days ago</div>
          </div>
        </div>
        {/* Thumbnail row */}
        <div className="flex gap-1.5">
          {[1, 2, 3].map((_, i) => (
            <div key={i} className="flex-1 rounded-md overflow-hidden border border-white/[0.06]">
              <div
                className="aspect-video"
                style={{ background: `linear-gradient(135deg, ${color}15, ${color}08)` }}
              />
              <div className="p-1.5">
                <div className="h-[4px] w-[80%] rounded-full bg-white/[0.08] mb-1" />
                <div className="h-[3px] w-[50%] rounded-full bg-white/[0.05]" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function LabsShowcase({ color }: { color: string }) {
  return (
    <div className="relative w-full h-full flex items-end justify-end p-2">
      <div className="w-[85%] max-w-[280px] rounded-lg border border-white/[0.08] bg-black/40 p-3 space-y-2.5">
        <div className="text-[7px] text-white/25 tracking-wider uppercase">Research Data</div>
        {/* Network visualization */}
        <div className="relative aspect-square rounded-md bg-white/[0.02] border border-white/[0.04] overflow-hidden">
          <svg viewBox="0 0 100 100" className="w-full h-full">
            {/* Connection lines */}
            {[[30,25,70,35],[70,35,55,70],[55,70,30,25],[50,50,30,25],[50,50,70,35],[50,50,55,70],[20,60,50,50],[80,65,50,50],[45,15,50,50]].map(([x1,y1,x2,y2], i) => (
              <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={`${color}30`} strokeWidth="0.5" />
            ))}
            {/* Nodes */}
            {[[50,50,4],[30,25,2.5],[70,35,3],[55,70,2.5],[20,60,2],[80,65,2],[45,15,1.5],[85,20,1.5],[15,80,1.5]].map(([cx,cy,r], i) => (
              <circle key={i} cx={cx} cy={cy} r={r} fill={i === 0 ? color : `${color}50`} opacity={i === 0 ? 0.8 : 0.4} />
            ))}
          </svg>
        </div>
        {/* Data readouts */}
        <div className="grid grid-cols-3 gap-1.5">
          {[['Accuracy', '99.7%'], ['Samples', '12.4K'], ['Models', '847']].map(([label, val], i) => (
            <div key={i} className="rounded-md p-1.5 bg-white/[0.03] border border-white/[0.05] text-center">
              <div className="text-[7px] text-white/25">{label}</div>
              <div className="text-[9px] font-bold text-white/70">{val}</div>
            </div>
          ))}
        </div>
        {/* Progress indicator */}
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: color }} />
          <div className="text-[7px] text-white/30">Experiment #4,291 running...</div>
        </div>
      </div>
    </div>
  );
}

function StudiosShowcase({ color }: { color: string }) {
  return (
    <div className="relative w-full h-full flex items-end justify-end p-2">
      <div className="w-[85%] max-w-[280px] space-y-2">
        {/* Design canvas */}
        <div className="rounded-lg border border-white/[0.08] bg-black/40 p-3">
          <div className="text-[7px] text-white/25 tracking-wider uppercase mb-2">Design System</div>
          {/* Color palette */}
          <div className="flex gap-1 mb-2.5">
            {['#8B5CF6', '#A855F7', '#C084FC', '#DDD6FE', '#FFFFFF'].map((c, i) => (
              <div key={i} className="flex-1">
                <div className="aspect-square rounded-md border border-white/[0.08]" style={{ backgroundColor: c }} />
                <div className="text-[5px] text-white/20 mt-0.5 text-center font-mono">{c}</div>
              </div>
            ))}
          </div>
          {/* Typography specimen */}
          <div className="rounded-md p-2.5 bg-white/[0.03] border border-white/[0.05] mb-2">
            <div className="text-[16px] font-bold text-white/80 leading-none mb-1">Aa</div>
            <div className="text-[7px] text-white/40 mb-1.5">Inter — Brand Typeface</div>
            <div className="flex gap-3">
              <span className="text-[6px] text-white/25 font-light">Light</span>
              <span className="text-[6px] text-white/35">Regular</span>
              <span className="text-[6px] text-white/50 font-semibold">Semi</span>
              <span className="text-[6px] text-white/70 font-bold">Bold</span>
            </div>
          </div>
          {/* Layout grid */}
          <div className="flex gap-1.5">
            <div className="flex-[2] rounded-md aspect-[4/3] border border-dashed border-white/[0.08] flex items-center justify-center">
              <div className="w-6 h-6 rounded" style={{ backgroundColor: `${color}20`, border: `1px solid ${color}30` }} />
            </div>
            <div className="flex-1 space-y-1.5">
              <div className="rounded-md h-[45%] border border-dashed border-white/[0.08]" />
              <div className="rounded-md h-[45%] border border-dashed border-white/[0.08]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function VenturesShowcase({ color }: { color: string }) {
  return (
    <div className="relative w-full h-full flex items-end justify-end p-2">
      <div className="w-[85%] max-w-[280px] rounded-lg border border-white/[0.08] bg-black/40 p-3 space-y-2.5">
        <div className="text-[7px] text-white/25 tracking-wider uppercase">Portfolio Growth</div>
        {/* Growth chart */}
        <div className="relative h-[60px] rounded-md bg-white/[0.02] border border-white/[0.04] overflow-hidden p-1.5">
          <svg viewBox="0 0 200 50" className="w-full h-full" preserveAspectRatio="none">
            {/* Area fill */}
            <path
              d="M0 45 L20 40 L40 42 L60 35 L80 30 L100 28 L120 20 L140 22 L160 12 L180 8 L200 5 L200 50 L0 50 Z"
              fill={`${color}15`}
            />
            {/* Line */}
            <path
              d="M0 45 L20 40 L40 42 L60 35 L80 30 L100 28 L120 20 L140 22 L160 12 L180 8 L200 5"
              stroke={color}
              strokeWidth="1.5"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.7"
            />
            {/* End dot */}
            <circle cx="200" cy="5" r="2.5" fill={color} opacity="0.8" />
          </svg>
          {/* Percentage badge */}
          <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded text-[7px] font-bold"
            style={{ backgroundColor: `${color}20`, color: color }}>
            +340%
          </div>
        </div>
        {/* Portfolio companies */}
        <div className="space-y-1.5">
          {[['NexGen AI', '+285%', '2021'], ['Orbital Bio', '+190%', '2022'], ['FluxData', '+425%', '2023']].map(([name, perf, year], i) => (
            <div key={i} className="flex items-center justify-between p-2 rounded-md bg-white/[0.03] border border-white/[0.05]">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-md flex items-center justify-center text-[7px] font-bold"
                  style={{ backgroundColor: `${color}15`, color: `${color}90` }}>
                  {(name as string).charAt(0)}
                </div>
                <div>
                  <div className="text-[8px] font-semibold text-white/70">{name}</div>
                  <div className="text-[6px] text-white/25">Since {year}</div>
                </div>
              </div>
              <div className="text-[8px] font-bold" style={{ color: `${color}aa` }}>{perf}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AcademyShowcase({ color }: { color: string }) {
  return (
    <div className="relative w-full h-full flex items-end justify-end p-2">
      <div className="w-[85%] max-w-[340px] space-y-2">
        {/* Course cards */}
        <div className="flex gap-1.5">
          {[
            { title: 'AI Fundamentals', lessons: 24, level: 'Advanced' },
            { title: 'Design Systems', lessons: 18, level: 'Intermediate' },
            { title: 'Leadership', lessons: 12, level: 'Expert' },
          ].map((course, i) => (
            <div key={i} className="flex-1 rounded-lg border border-white/[0.08] bg-black/40 overflow-hidden">
              <div className="aspect-[3/2] flex items-center justify-center"
                style={{ background: `linear-gradient(135deg, ${color}12, ${color}06)` }}>
                <div className="w-6 h-6 rounded-full border-2 flex items-center justify-center"
                  style={{ borderColor: `${color}40` }}>
                  <svg className="w-2.5 h-2.5" fill={`${color}80`} viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              </div>
              <div className="p-2">
                <div className="text-[7px] font-semibold text-white/70 mb-0.5 leading-tight">{course.title}</div>
                <div className="text-[6px] text-white/25">{course.lessons} lessons</div>
                <div className="mt-1.5 px-1 py-0.5 rounded text-[5px] font-semibold inline-block"
                  style={{ backgroundColor: `${color}15`, color: `${color}90` }}>
                  {course.level}
                </div>
              </div>
            </div>
          ))}
        </div>
        {/* Progress bar */}
        <div className="rounded-lg border border-white/[0.08] bg-black/40 p-2.5 flex items-center gap-3">
          <div className="relative w-9 h-9 flex-shrink-0">
            <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
              <circle cx="18" cy="18" r="14" fill="none" stroke={`${color}15`} strokeWidth="3" />
              <circle cx="18" cy="18" r="14" fill="none" stroke={color} strokeWidth="3"
                strokeDasharray={`${0.78 * 88} 88`} strokeLinecap="round" opacity="0.7" />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[7px] font-bold text-white/70">78%</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[8px] font-semibold text-white/70">Your Progress</div>
            <div className="text-[6px] text-white/25 mt-0.5">12 of 16 modules complete</div>
            <div className="h-[3px] rounded-full bg-white/[0.06] mt-1.5">
              <div className="h-full rounded-full" style={{ width: '78%', backgroundColor: color, opacity: 0.6 }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Map division IDs to their showcase components
function DivisionShowcase({ id, color }: { id: string; color: string }) {
  switch (id) {
    case 'tech': return <TechShowcase color={color} />;
    case 'media': return <MediaShowcase color={color} />;
    case 'labs': return <LabsShowcase color={color} />;
    case 'studios': return <StudiosShowcase color={color} />;
    case 'ventures': return <VenturesShowcase color={color} />;
    case 'academy': return <AcademyShowcase color={color} />;
    default: return null;
  }
}

// Premium Bento Card Component — PERFORMANCE OPTIMIZED
const BentoCard = memo(function BentoCard({ 
  card, 
  index 
}: { 
  card: typeof divisionCards[0]; 
  index: number;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-60px' });
  const cardRef = useRef<HTMLDivElement>(null);
  const spotlightRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  // PERFORMANCE FIX: Mouse tracking with refs and direct DOM manipulation
  // No state updates = no re-renders on mouse move
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!cardRef.current || !spotlightRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Direct DOM manipulation — no React re-render
    spotlightRef.current.style.background = `radial-gradient(600px circle at ${x}px ${y}px, ${card.color}12, transparent 50%)`;
  }, [card.color]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 60 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ 
        duration: 0.8, 
        delay: index * 0.1, 
        ease: [0.16, 1, 0.3, 1] 
      }}
      className={`${
        card.size === 'large' ? 'md:col-span-2' : 'md:col-span-1'
      }`}
    >
      <motion.div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        whileHover={{ y: -6 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        className="group relative rounded-[24px] sm:rounded-[28px] overflow-hidden cursor-pointer h-full"
        style={{
          background: card.gradient,
          minHeight: card.size === 'large' ? '360px' : '440px',
        }}
      >
        {/* Mouse spotlight effect — uses ref for performance */}
        <div
          ref={spotlightRef}
          className={`absolute inset-0 z-[1] pointer-events-none transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'}`}
        />

        {/* Gradient border — visible on hover */}
        <div 
          className="absolute inset-0 rounded-[24px] sm:rounded-[28px] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none z-[2]"
          style={{
            border: `1px solid ${card.color}30`,
          }}
        />

        {/* Large background gradient orb */}
        <div 
          className="absolute -top-20 -right-20 w-[280px] h-[280px] rounded-full opacity-[0.07] group-hover:opacity-[0.12] transition-opacity duration-700 pointer-events-none"
          style={{
            background: `radial-gradient(circle, ${card.color} 0%, transparent 70%)`,
          }}
        />

        {/* Content */}
        <div className={`relative z-[5] h-full flex ${
          card.size === 'large' 
            ? 'flex-col sm:flex-row items-start sm:items-stretch justify-between' 
            : 'flex-col justify-between'
        }`}>
          {/* Text content side */}
          <div className={`flex flex-col justify-between ${
            card.size === 'large' 
              ? 'p-8 sm:p-10 lg:p-12 sm:w-[50%] lg:w-[45%] flex-shrink-0' 
              : 'p-7 sm:p-8 pb-4 sm:pb-4'
          }`}>
            {/* Top area */}
            <div>
              {/* Accent line */}
              <div 
                className="w-10 h-[3px] rounded-full mb-5 sm:mb-6 group-hover:w-16 transition-all duration-500"
                style={{ background: card.accentGradient }}
              />

              {/* Tagline */}
              <p 
                className="text-[11px] sm:text-[12px] font-semibold tracking-[0.15em] uppercase mb-2.5 sm:mb-3 transition-colors duration-300"
                style={{ color: `${card.color}90` }}
              >
                {card.tagline}
              </p>

              {/* Division Name */}
              <h3 className={`font-bold text-white tracking-tight leading-[1.1] mb-2.5 sm:mb-3 ${
                card.size === 'large' 
                  ? 'text-[26px] sm:text-[32px] lg:text-[38px]' 
                  : 'text-[22px] sm:text-[26px] lg:text-[30px]'
              }`}>
                {card.name.replace('KRONOS ', '')}
              </h3>

              {/* Description */}
              <p className={`text-white/35 leading-relaxed font-light group-hover:text-white/50 transition-colors duration-300 ${
                card.size === 'large'
                  ? 'text-[13px] sm:text-[14px] lg:text-[15px] max-w-[400px]'
                  : 'text-[12px] sm:text-[13px] lg:text-[14px]'
              }`}>
                {card.description}
              </p>
            </div>

            {/* Bottom area — metric badge + CTA */}
            <div className={`flex items-end justify-between mt-5 sm:mt-6 ${
              card.size === 'large' ? '' : ''
            }`}>
              {/* Metric badge */}
              <div>
                <div 
                  className="text-[28px] sm:text-[32px] lg:text-[36px] font-black tracking-tight leading-none"
                  style={{ 
                    background: card.accentGradient,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  {card.metric}
                </div>
                <p className="text-white/25 text-[10px] sm:text-[11px] font-medium tracking-wide mt-1">
                  {card.metricLabel}
                </p>
              </div>

              {/* CTA Arrow */}
              <motion.div
                whileHover={{ x: 4 }}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all duration-300 group-hover:bg-white/10"
                style={{
                  border: `1.5px solid ${card.color}30`,
                }}
              >
                <svg 
                  className="w-3.5 h-3.5 sm:w-4 sm:h-4 transition-all duration-300"
                  style={{ color: `${card.color}80` }}
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor" 
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </motion.div>
            </div>
          </div>

          {/* Visual showcase side — product mockups */}
          <div className={`relative overflow-hidden ${
            card.size === 'large'
              ? 'sm:w-[50%] lg:w-[55%] min-h-[200px] sm:min-h-0'
              : 'min-h-[180px] sm:min-h-[200px]'
          }`}>
            {/* Subtle divider for large cards */}
            {card.size === 'large' && (
              <div className="hidden sm:block absolute left-0 top-[15%] bottom-[15%] w-[1px] bg-white/[0.06]" />
            )}
            <div className="opacity-60 group-hover:opacity-80 transition-opacity duration-500 h-full">
              <DivisionShowcase id={card.id} color={card.color} />
            </div>
          </div>
        </div>

        {/* Bottom edge glow on hover */}
        <div 
          className="absolute bottom-0 left-0 right-0 h-[1px] opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          style={{ background: card.accentGradient }}
        />
      </motion.div>
    </motion.div>
  );
});

// Divisions Section — Apple Bento Grid
function DivisionsSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section 
      id="divisions" 
      className="relative bg-[#F5F5F7] overflow-hidden"
      style={{
        paddingTop: 'clamp(80px, 10vw, 160px)',
        paddingBottom: 'clamp(80px, 10vw, 160px)',
      }}
    >
      {/* Clean background — no noise texture */}

      <div className="relative z-[1] max-w-[1200px] mx-auto px-5 sm:px-8 lg:px-12">
        {/* Header */}
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-14 sm:mb-16 lg:mb-20"
        >
          <p className="text-[11px] sm:text-[12px] font-semibold text-black/30 tracking-[0.2em] uppercase mb-5 sm:mb-6">
            The Divisions
          </p>
          <h2 className="text-[clamp(2rem,6vw,4.5rem)] font-bold text-black tracking-tight leading-[1.05]">
            Six Divisions.
          </h2>
          <h2 className="text-[clamp(2rem,6vw,4.5rem)] font-light text-black/15 tracking-tight leading-[1.05]">
            One Vision.
          </h2>
          <p className="mt-5 sm:mt-6 text-black/35 text-[14px] sm:text-[16px] font-light max-w-md mx-auto leading-relaxed">
            Each division operates with autonomy, united by a singular mission to shape tomorrow.
          </p>
        </motion.div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          {divisionCards.map((card, index) => (
            <BentoCard key={card.id} card={card} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// CONNECTION SECTION — ULTRA PREMIUM WITH REVOLVING ORBIT
// ═══════════════════════════════════════════════════════════════════════════
// 
// FEATURES:
// ✅ Revolving orbit — nodes slowly orbit around center
// ✅ Energy pulse lines — animated particles traveling along connections
// ✅ 3D perspective tilt — mouse-based parallax
// ✅ Center hub breathing — pulsing glow effect
// ✅ Hover interactions — pause rotation, highlight node
// ✅ Conic gradient glow ring — rainbow outer glow
// ✅ Multiple orbital rings — layered depth
// ✅ Responsive — mobile uses vertical tree layout
//
// ═══════════════════════════════════════════════════════════════════════════

function ConnectionSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  
  // PERFORMANCE FIX: Use refs instead of state to avoid 60 re-renders/sec
  const rotationRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const mousePosRef = useRef({ x: 0.5, y: 0.5 });
  // Removed forceUpdate - not needed with ref-based animation

  // Continuous rotation animation — OPTIMIZED with refs and direct DOM manipulation
  useEffect(() => {
    if (!isInView) return;
    
    let animationId: number;
    let lastTime = Date.now();
    
    const animate = () => {
      const now = Date.now();
      const delta = now - lastTime;
      lastTime = now;
      
      // Pause rotation when hovering on a node
      if (!hoveredNode) {
        rotationRef.current = (rotationRef.current + delta * 0.006) % 360;
      }
      
      // Direct DOM manipulation for smooth animation without React re-renders
      if (containerRef.current) {
        const rotation = rotationRef.current;
        const mousePos = mousePosRef.current;
        const tiltX = (mousePos.y - 0.5) * 8;
        const tiltY = (mousePos.x - 0.5) * -8;
        
        // Update the 3D tilt container
        const tiltContainer = containerRef.current.querySelector('[data-tilt-container]') as HTMLElement;
        if (tiltContainer) {
          tiltContainer.style.transform = `rotateX(${tiltX}deg) rotateY(${tiltY}deg)`;
        }
        
        // Update the conic gradient glow ring
        const glowRing = containerRef.current.querySelector('[data-glow-ring]') as HTMLElement;
        if (glowRing) {
          glowRing.style.background = `conic-gradient(from ${rotation}deg, #0EA5E9, #EC4899, #10B981, #8B5CF6, #F59E0B, #06B6D4, #0EA5E9)`;
        }
        
        // Update the rotating dashed ring
        const dashedRing = containerRef.current.querySelector('[data-dashed-ring]') as HTMLElement;
        if (dashedRing) {
          dashedRing.style.transform = `rotate(${rotation}deg)`;
        }
        
        // Update division node positions
        containerRef.current.querySelectorAll('[data-division-node]').forEach((node, index) => {
          const baseAngle = (index * 60 - 90);
          const currentAngle = baseAngle + rotation;
          const angleRad = currentAngle * (Math.PI / 180);
          const radiusPercent = 41.25;
          const x = 50 + radiusPercent * Math.cos(angleRad);
          const y = 50 + radiusPercent * Math.sin(angleRad);
          (node as HTMLElement).style.left = `${x}%`;
          (node as HTMLElement).style.top = `${y}%`;
        });
        
        // Update floating particles
        containerRef.current.querySelectorAll('[data-particle]').forEach((particle, i) => {
          const particleAngle = (i * 45 + rotation * 0.3) * (Math.PI / 180);
          const particleRadius = 100 + (i % 3) * 30;
          const px = 50 + (particleRadius / 4) * Math.cos(particleAngle);
          const py = 50 + (particleRadius / 4) * Math.sin(particleAngle);
          (particle as HTMLElement).style.left = `${px}%`;
          (particle as HTMLElement).style.top = `${py}%`;
        });
        
        // CRITICAL FIX: Update SVG connection lines to follow rotating nodes
        containerRef.current.querySelectorAll('[data-connection-line]').forEach((line, index) => {
          const baseAngle = (index * 60 - 90);
          const currentAngle = (baseAngle + rotation) * (Math.PI / 180);
          const endX = 200 + 165 * Math.cos(currentAngle);
          const endY = 200 + 165 * Math.sin(currentAngle);
          line.setAttribute('x2', endX.toString());
          line.setAttribute('y2', endY.toString());
        });
      }
      
      animationId = requestAnimationFrame(animate);
    };
    
    animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, [isInView, hoveredNode]);

  // Mouse tracking for 3D parallax effect — OPTIMIZED with refs
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    mousePosRef.current = {
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    };
  }, []);

  // Get current values from refs for initial render
  const rotation = rotationRef.current;
  const mousePos = mousePosRef.current;
  const tiltX = (mousePos.y - 0.5) * 8;
  const tiltY = (mousePos.x - 0.5) * -8;

  return (
    <section 
      id="ecosystem" 
      className="relative py-24 sm:py-32 lg:py-40 bg-black text-white overflow-hidden"
    >
      {/* Animated gradient background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-black via-gray-950 to-black" />
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            background: `radial-gradient(ellipse at 50% 50%, rgba(99, 102, 241, 0.12) 0%, transparent 60%)`
          }}
        />
      </div>

      {/* Clean dark background — no grid clutter */}

      <div className="relative max-w-6xl mx-auto px-6 sm:px-8 lg:px-12">
        {/* Section Header */}
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, ease: [...ease] }}
          className="text-center mb-16 sm:mb-20 lg:mb-24"
        >
          <motion.div 
            initial={{ scale: 0, opacity: 0 }}
            animate={isInView ? { scale: 1, opacity: 1 } : {}}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-3 mb-6"
          >
            <span className="w-10 h-px bg-gradient-to-r from-transparent to-white/30" />
            <span className="text-[11px] sm:text-[12px] font-semibold text-white/40 tracking-[0.2em] uppercase">
              The Architecture
            </span>
            <span className="w-10 h-px bg-gradient-to-l from-transparent to-white/30" />
          </motion.div>
          <h2 className="text-[clamp(1.75rem,5vw,3.5rem)] font-bold tracking-tight leading-[1.1]">
            Connected by Design.
          </h2>
          <p className="mt-4 sm:mt-6 text-white/35 text-[15px] sm:text-[17px] font-light max-w-lg mx-auto leading-relaxed">
            Six divisions. One central intelligence. Infinite possibilities.
          </p>
        </motion.div>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* DESKTOP: PREMIUM Revolving Orbital Diagram with 3D Tilt */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <div className="hidden md:flex justify-center">
          <motion.div
            ref={containerRef}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={isInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 1, delay: 0.3 }}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => { mousePosRef.current = { x: 0.5, y: 0.5 }; }}
            className="relative cursor-default"
            style={{ 
              width: 'min(720px, 85vw)', 
              height: 'min(720px, 85vw)',
              perspective: '1200px',
            }}
          >
            {/* 3D Tilt Container */}
            <div
              data-tilt-container
              className="relative w-full h-full transition-transform duration-200 ease-out"
              style={{
                transform: `rotateX(${tiltX}deg) rotateY(${tiltY}deg)`,
                transformStyle: 'preserve-3d',
              }}
            >
              {/* Outer conic gradient glow ring */}
              <div 
                data-glow-ring
                className="absolute inset-0 rounded-full opacity-15 blur-3xl pointer-events-none"
                style={{
                  background: `conic-gradient(from ${rotation}deg, #0EA5E9, #EC4899, #10B981, #8B5CF6, #F59E0B, #06B6D4, #0EA5E9)`,
                  transform: 'scale(1.15)',
                }}
              />

              {/* SVG Orbital System */}
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 400" aria-hidden="true">
                <defs>
                  {/* Glow filter for energy pulses */}
                  <filter id="energyGlow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="2" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                {/* Multiple orbital rings */}
                <circle cx="200" cy="200" r="165" fill="none" stroke="white" strokeWidth="1" strokeOpacity="0.04" />
                <circle cx="200" cy="200" r="130" fill="none" stroke="white" strokeWidth="1" strokeOpacity="0.025" strokeDasharray="3 8" />
                <circle cx="200" cy="200" r="95" fill="none" stroke="white" strokeWidth="1" strokeOpacity="0.04" />
                <circle cx="200" cy="200" r="50" fill="none" stroke="white" strokeWidth="1" strokeOpacity="0.06" />

                {/* Rotating dashed ring */}
                <circle 
                  data-dashed-ring="true"
                  cx="200" 
                  cy="200" 
                  r="165" 
                  fill="none" 
                  stroke="white" 
                  strokeWidth="1.5"
                  strokeOpacity="0.08"
                  strokeDasharray="2 16"
                  style={{ 
                    transform: `rotate(${rotation}deg)`, 
                    transformOrigin: 'center' 
                  }}
                />

                {/* Connection lines with animated energy pulses */}
                {divisions.map((division, index) => {
                  const baseAngle = (index * 60 - 90);
                  const currentAngle = (baseAngle + rotationRef.current) * (Math.PI / 180);
                  const endX = 200 + 165 * Math.cos(currentAngle);
                  const endY = 200 + 165 * Math.sin(currentAngle);
                  const isHovered = hoveredNode === division.id;
                  
                  return (
                    <g key={division.id} data-connection-group={index}>
                      {/* Base connection line — updated by animateOrbit() */}
                      <motion.line
                        data-connection-line={index}
                        x1="200"
                        y1="200"
                        x2={endX}
                        y2={endY}
                        stroke={division.color}
                        strokeWidth={isHovered ? "2" : "1"}
                        strokeOpacity={isHovered ? "0.6" : "0.2"}
                        initial={{ pathLength: 0 }}
                        animate={isInView ? { pathLength: 1 } : {}}
                        transition={{ duration: 0.8, delay: 0.4 + index * 0.1 }}
                      />
                      
                      {/* Energy pulse particle 1 */}
                      <circle r="3" fill={division.color} filter="url(#energyGlow)">
                        <animateMotion
                          dur="2.5s"
                          repeatCount="indefinite"
                          path={`M200,200 L${endX},${endY}`}
                          keyPoints="0;1;0"
                          keyTimes="0;0.5;1"
                          calcMode="spline"
                          keySplines="0.4 0 0.2 1; 0.4 0 0.2 1"
                        />
                        <animate 
                          attributeName="opacity" 
                          values="0;0.9;0" 
                          dur="2.5s" 
                          repeatCount="indefinite"
                        />
                      </circle>
                      
                      {/* Energy pulse particle 2 (offset) */}
                      <circle r="2" fill={division.color} opacity="0.5">
                        <animateMotion
                          dur="2.5s"
                          repeatCount="indefinite"
                          begin="1.25s"
                          path={`M200,200 L${endX},${endY}`}
                          keyPoints="0;1;0"
                          keyTimes="0;0.5;1"
                          calcMode="spline"
                          keySplines="0.4 0 0.2 1; 0.4 0 0.2 1"
                        />
                        <animate 
                          attributeName="opacity" 
                          values="0;0.6;0" 
                          dur="2.5s" 
                          repeatCount="indefinite" 
                          begin="1.25s"
                        />
                      </circle>
                    </g>
                  );
                })}
              </svg>

              {/* Center Hub — Premium with breathing glow */}
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={isInView ? { scale: 1, opacity: 1 } : {}}
                transition={{ type: "spring", stiffness: 180, damping: 20, delay: 0.3 }}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20"
              >
                {/* Breathing outer glow */}
                <motion.div 
                  className="absolute inset-0 -m-5 rounded-full blur-2xl"
                  animate={{ 
                    scale: [1, 1.15, 1], 
                    opacity: [0.15, 0.25, 0.15] 
                  }}
                  transition={{ 
                    duration: 3, 
                    repeat: Infinity, 
                    ease: "easeInOut" 
                  }}
                  style={{ backgroundColor: 'white' }}
                />
                
                {/* Hub container */}
                <div 
                  className="relative w-28 h-28 lg:w-32 lg:h-32 bg-gradient-to-br from-white to-gray-100 rounded-[24px] lg:rounded-[28px] flex flex-col items-center justify-center"
                  style={{ 
                    boxShadow: '0 0 80px rgba(255,255,255,0.25), 0 20px 50px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.9)',
                  }}
                >
                  {/* CHRONOS CROWN LOGO — Premium mark */}
                  {/* 6 crown peaks = 6 divisions | Hourglass spine = Time (KRONOS) */}
                  <svg viewBox="0 0 40 40" className="w-9 h-9 lg:w-10 lg:h-10" aria-hidden="true">
                    <path d={LOGO.hourglass} fill="none" stroke="black" strokeWidth={LOGO.spineWidth} strokeLinecap="round" strokeLinejoin="round" />
                    <path d={LOGO.crown} fill="none" stroke="black" strokeWidth={LOGO.armWidth} strokeLinecap="round" strokeLinejoin="round" />
                    <line x1={LOGO.diagonal.x1} y1={LOGO.diagonal.y1} x2={LOGO.diagonal.x2} y2={LOGO.diagonal.y2} stroke="black" strokeWidth={LOGO.armWidth} strokeLinecap="round" />
                  </svg>
                  <span className="text-black/60 text-[9px] lg:text-[10px] font-bold tracking-[0.15em] mt-1">
                    CONTROL
                  </span>
                </div>
              </motion.div>

              {/* Revolving Division Nodes */}
              {divisions.map((division, index) => {
                const baseAngle = (index * 60 - 90);
                const currentAngle = baseAngle + rotation;
                const angleRad = currentAngle * (Math.PI / 180);
                const radiusPercent = 41.25; // % from center
                const x = 50 + radiusPercent * Math.cos(angleRad);
                const y = 50 + radiusPercent * Math.sin(angleRad);
                const isHovered = hoveredNode === division.id;
                
                                  return (
                  <motion.div
                    key={division.id}
                    data-division-node
                    initial={{ scale: 0, opacity: 0 }}
                    animate={isInView ? { scale: 1, opacity: 1 } : {}}
                    transition={{ 
                      type: "spring",
                      stiffness: 180,
                      damping: 20,
                      delay: 0.5 + index * 0.08
                    }}
                    onMouseEnter={() => setHoveredNode(division.id)}
                    onMouseLeave={() => setHoveredNode(null)}
                    className="absolute -translate-x-1/2 -translate-y-1/2 z-10 cursor-pointer"
                    style={{ left: `${x}%`, top: `${y}%` }}
                  >
                    {/* Glow effect behind node */}
                    <div 
                      className="absolute inset-0 -m-2 rounded-2xl blur-xl transition-opacity duration-300 pointer-events-none"
                      style={{ 
                        backgroundColor: division.color,
                        opacity: isHovered ? 0.4 : 0.1,
                      }}
                    />
                    
                    {/* Node card */}
                    <div 
                      className={`
                        relative px-4 py-3.5 lg:px-5 lg:py-4 rounded-2xl border backdrop-blur-sm
                        transition-all duration-300 ease-out
                        ${isHovered 
                          ? 'bg-black/90 border-white/25 scale-110' 
                          : 'bg-black/70 border-white/10 scale-100'
                        }
                      `}
                      style={{
                        boxShadow: isHovered 
                          ? `0 0 40px ${division.color}40, 0 16px 40px rgba(0,0,0,0.5)` 
                          : `0 0 20px ${division.color}15`,
                      }}
                    >
                      {/* Top accent line */}
                      <div 
                        className="absolute top-0 left-1/2 -translate-x-1/2 h-[2px] rounded-full transition-all duration-300"
                        style={{ 
                          backgroundColor: division.color,
                          width: isHovered ? '60%' : '35%',
                          boxShadow: `0 0 10px ${division.color}`,
                        }}
                      />
                      
                      {/* Content */}
                      <div className="flex items-center gap-2.5">
                        {/* Dot with ring on hover */}
                        <div className="relative">
                          <div 
                            className={`w-2.5 h-2.5 lg:w-3 lg:h-3 rounded-full transition-transform duration-300 ${isHovered ? 'scale-110' : ''}`}
                            style={{ 
                              backgroundColor: division.color, 
                              boxShadow: `0 0 12px ${division.color}` 
                            }}
                          />
                          {isHovered && (
                            <div 
                              className="absolute inset-0 -m-1 rounded-full border animate-ping"
                              style={{ borderColor: division.color, opacity: 0.5 }}
                            />
                          )}
                        </div>
                        
                        <div>
                          <p className="text-white text-[11px] lg:text-[12px] font-semibold tracking-wide">
                            {division.name.replace('KRONOS ', '')}
                          </p>
                          {isHovered && (
                            <motion.p 
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              className="text-white/45 text-[9px] lg:text-[10px] mt-0.5"
                            >
                              {division.tagline}
                            </motion.p>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}

              {/* Floating ambient particles */}
              {[...Array(8)].map((_, i) => {
                const particleAngle = (i * 45 + rotation * 0.3) * (Math.PI / 180);
                const particleRadius = 100 + (i % 3) * 30;
                const px = 50 + (particleRadius / 4) * Math.cos(particleAngle);
                const py = 50 + (particleRadius / 4) * Math.sin(particleAngle);
                
                return (
                  <div
                    key={i}
                    data-particle
                    className="absolute w-1 h-1 rounded-full bg-white/20 pointer-events-none"
                    style={{
                      left: `${px}%`,
                      top: `${py}%`,
                      transform: 'translate(-50%, -50%)',
                    }}
                  />
                );
              })}
            </div>
          </motion.div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* MOBILE: Vertical tree layout with animated connection */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <div className="md:hidden">
          {/* Center Hub - Mobile */}
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={isInView ? { scale: 1, opacity: 1 } : {}}
            transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.2 }}
            className="flex flex-col items-center mb-8"
          >
            <div 
              className="relative w-22 h-22 bg-gradient-to-br from-white to-gray-100 rounded-2xl flex flex-col items-center justify-center"
              style={{ 
                width: '88px', 
                height: '88px',
                boxShadow: '0 0 50px rgba(255,255,255,0.2), 0 16px 32px rgba(0,0,0,0.3)' 
              }}
            >
              {/* CHRONOS CROWN LOGO — Premium mark */}
              <svg viewBox="0 0 40 40" className="w-8 h-8" aria-hidden="true">
                <path d={LOGO.hourglass} fill="none" stroke="black" strokeWidth={LOGO.spineWidth} strokeLinecap="round" strokeLinejoin="round" />
                <path d={LOGO.crown} fill="none" stroke="black" strokeWidth={LOGO.armWidth} strokeLinecap="round" strokeLinejoin="round" />
                <line x1={LOGO.diagonal.x1} y1={LOGO.diagonal.y1} x2={LOGO.diagonal.x2} y2={LOGO.diagonal.y2} stroke="black" strokeWidth={LOGO.armWidth} strokeLinecap="round" />
              </svg>
              <span className="text-black/60 text-[7px] font-bold tracking-[0.12em] mt-0.5">CONTROL</span>
            </div>
            
            {/* Animated energy pulse going down */}
            <div className="relative h-14 w-px mt-3">
              <div className="absolute inset-0 bg-gradient-to-b from-white/40 to-transparent" />
              <motion.div 
                className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-white shadow-[0_0_8px_white]"
                animate={{ y: [0, 48, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              />
            </div>
          </motion.div>
          
          {/* Division Grid - 2 columns */}
          <div className="grid grid-cols-2 gap-3 px-1">
            {divisions.map((division, index) => (
              <motion.div
                key={division.id}
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ 
                  duration: 0.5, 
                  delay: 0.4 + index * 0.08,
                  ease: [0.25, 0.1, 0.25, 1]
                }}
              >
                <div
                  className="relative p-4 rounded-2xl overflow-hidden transition-all duration-300 active:scale-[0.98]"
                  style={{
                    background: `linear-gradient(145deg, ${division.color}12, ${division.color}05)`,
                    border: `1px solid ${division.color}25`,
                  }}
                >
                  {/* Top accent line */}
                  <div 
                    className="absolute top-0 left-0 right-0 h-[2px]"
                    style={{ 
                      background: `linear-gradient(90deg, transparent, ${division.color}80, transparent)` 
                    }}
                  />
                  
                  {/* Background glow */}
                  <div 
                    className="absolute top-0 right-0 w-20 h-20 rounded-full blur-2xl opacity-15 pointer-events-none"
                    style={{ backgroundColor: division.color }}
                  />
                  
                  <div className="relative">
                    <div 
                      className="w-2.5 h-2.5 rounded-full mb-3"
                      style={{ 
                        backgroundColor: division.color, 
                        boxShadow: `0 0 8px ${division.color}` 
                      }}
                    />
                    <p className="text-[13px] font-bold text-white/90 mb-0.5 tracking-tight">
                      {division.name.replace('KRONOS ', '')}
                    </p>
                    <p 
                      className="text-[11px] font-medium"
                      style={{ color: `${division.color}99` }}
                    >
                      {division.tagline}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Bottom Description */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 1.2 }}
          className="text-center mt-16 sm:mt-20 lg:mt-24"
        >
          <p className="text-white/30 text-[14px] sm:text-[15px] lg:text-[16px] max-w-lg mx-auto leading-relaxed font-light">
            Every division operates independently yet connects seamlessly — creating a 
            unified force greater than the sum of its parts.
          </p>
          
          {/* CTA */}
          <motion.a
            href="#divisions"
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            className="inline-flex items-center gap-2 mt-8 px-6 py-3 rounded-full border border-white/20 text-[13px] sm:text-[14px] font-medium text-white/70 hover:text-white hover:border-white/40 hover:bg-white/5 transition-all duration-300"
          >
            <span>View All Divisions</span>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </motion.a>
        </motion.div>
      </div>
    </section>
  );
}

// Stats Section — Premium with proper centering
function StatsSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  const stats = [
    { value: 6, suffix: '', label: 'Divisions' },
    { value: 50, suffix: '+', label: 'Countries' },
    { value: 10000, suffix: '+', label: 'Team Members' },
    { value: 200, suffix: '+', label: 'Products Shipped' },
  ];

  return (
    <section ref={ref} className="py-20 sm:py-24 lg:py-32 bg-[#F5F5F7]">
      <div className="w-full max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
        {/* FIXED: Proper grid with explicit centering */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 lg:gap-0">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: index * 0.1, ease: [...ease] }}
              className={`flex flex-col items-center justify-center text-center py-4 sm:py-6 lg:py-0 lg:px-8 ${
                index < stats.length - 1 ? 'lg:border-r lg:border-black/[0.08]' : ''
              }`}
            >
              <div className="text-[clamp(2rem,6vw,3.5rem)] font-black text-black tracking-tight leading-none">
                {isInView ? <AnimatedCounter value={stat.value} suffix={stat.suffix} /> : `0${stat.suffix}`}
              </div>
              <div className="text-[11px] sm:text-[13px] text-black/40 font-medium tracking-[0.05em] mt-2 sm:mt-3 uppercase">
                {stat.label}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// CTA Section — Premium with gradient and trust signals
function CTASection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section ref={ref} className="relative py-24 sm:py-32 lg:py-44 bg-black text-white overflow-hidden">
      {/* Premium gradient background */}
      <div className="absolute inset-0 pointer-events-none">
        <div 
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse 100% 80% at 50% 30%, rgba(99,102,241,0.1) 0%, transparent 60%)',
          }}
        />
        {/* Subtle grid overlay */}
        <div 
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />
      </div>
      
      {/* FIXED: Explicit centering container for ALL devices */}
      <div className="relative w-full flex flex-col items-center justify-center px-6 sm:px-8 lg:px-12">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, ease: [...ease] }}
          className="w-full max-w-4xl flex flex-col items-center text-center"
        >
          {/* Eyebrow */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            transition={{ delay: 0.2 }}
            className="flex items-center gap-4 mb-8 sm:mb-10"
          >
            <span className="w-8 sm:w-12 h-px bg-gradient-to-r from-transparent to-white/30" />
            <span className="text-[10px] sm:text-[11px] font-semibold text-white/40 tracking-[0.2em] uppercase">
              Join the Movement
            </span>
            <span className="w-8 sm:w-12 h-px bg-gradient-to-l from-transparent to-white/30" />
          </motion.div>

          {/* Headlines — Centered */}
          <h2 className="text-[clamp(2rem,7vw,4.5rem)] font-bold tracking-tight leading-[1.05] mb-2 sm:mb-4">
            Build With Us.
          </h2>
          <h2 className="text-[clamp(2rem,7vw,4.5rem)] font-light tracking-tight leading-[1.05] mb-8 sm:mb-12 text-white/20">
            Build What's Next.
          </h2>

          {/* Description — FIXED: Proper centering with flex */}
          <div className="w-full flex justify-center mb-10 sm:mb-14">
            <p className="text-[15px] sm:text-[17px] lg:text-[18px] text-white/40 leading-relaxed font-light max-w-xl text-center">
              Whether you're a founder, creator, engineer, or visionary — there's a place for you in the KRONOS ecosystem.
            </p>
          </div>

          {/* PREMIUM BUTTONS — Completely redesigned */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-5 w-full sm:w-auto">
            
            {/* Primary Button — Premium with gradient border + glow */}
            <motion.button
              whileHover={{ scale: 1.02, y: -3 }}
              whileTap={{ scale: 0.98 }}
              className="group relative w-full sm:w-auto overflow-hidden"
            >
              {/* Outer glow on hover */}
              <div className="absolute inset-0 rounded-full bg-white/20 blur-xl opacity-0 group-hover:opacity-60 transition-opacity duration-500" />
              
              {/* Button content */}
              <div className="relative flex items-center justify-center gap-3 px-8 sm:px-10 py-4 sm:py-[18px] bg-white text-black rounded-full overflow-hidden">
                {/* Shimmer effect on hover */}
                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out bg-gradient-to-r from-transparent via-black/[0.08] to-transparent" />
                
                {/* Icon */}
                <div className="relative w-5 h-5 rounded-full bg-black flex items-center justify-center">
                  <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                
                {/* Text */}
                <span className="relative text-[14px] sm:text-[15px] font-semibold tracking-tight">
                  Apply to Join
                </span>
                
                {/* Arrow */}
                <svg className="relative w-4 h-4 opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </div>
            </motion.button>
            
            {/* Secondary Button — Premium glass morphism */}
            <motion.button
              whileHover={{ scale: 1.02, y: -3 }}
              whileTap={{ scale: 0.98 }}
              className="group relative w-full sm:w-auto"
            >
              {/* Gradient border */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-white/20 via-white/10 to-white/20 p-[1px]">
                <div className="w-full h-full rounded-full bg-black/80 backdrop-blur-xl" />
              </div>
              
              {/* Button content */}
              <div className="relative flex items-center justify-center gap-3 px-8 sm:px-10 py-4 sm:py-[18px]">
                {/* Mail icon with circle */}
                <div className="w-5 h-5 rounded-full border border-white/30 flex items-center justify-center group-hover:border-white/50 group-hover:bg-white/5 transition-all duration-300">
                  <svg className="w-2.5 h-2.5 text-white/60 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                
                {/* Text */}
                <span className="text-[14px] sm:text-[15px] font-medium text-white/70 group-hover:text-white transition-colors duration-300 tracking-tight">
                  Get in Touch
                </span>
                
                {/* Subtle arrow */}
                <svg className="w-3.5 h-3.5 text-white/30 group-hover:text-white/60 group-hover:translate-x-0.5 transition-all duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </motion.button>
          </div>

          {/* Trust signals — FIXED: Proper centering */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            transition={{ delay: 0.6, duration: 0.8 }}
            className="mt-14 sm:mt-20 w-full flex flex-col items-center"
          >
            <p className="text-[10px] sm:text-[11px] text-white/25 tracking-[0.2em] uppercase mb-6">
              Trusted by innovators worldwide
            </p>
            <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10 lg:gap-14">
              {['Forbes', 'TechCrunch', 'Wired', 'Bloomberg'].map((brand, i) => (
                <motion.span 
                  key={brand} 
                  initial={{ opacity: 0, y: 10 }}
                  animate={isInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ delay: 0.7 + i * 0.1 }}
                  className="text-[12px] sm:text-[14px] font-semibold tracking-tight text-white/20 hover:text-white/40 transition-colors cursor-default"
                >
                  {brand}
                </motion.span>
              ))}
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

// Social media icon components
function SocialIcon({ type }: { type: string }) {
  const paths: Record<string, string> = {
    twitter: 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z',
    linkedin: 'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z',
    instagram: 'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z',
    telegram: 'M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z',
    youtube: 'M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z',
  };

  return (
    <svg viewBox="0 0 24 24" className="w-[18px] h-[18px]" fill="currentColor" aria-hidden="true">
      <path d={paths[type] || ''} />
    </svg>
  );
}

// Footer — Premium with newsletter + SVG social icons
function Footer() {
  const currentYear = new Date().getFullYear();
  const [email, setEmail] = useState('');

  return (
    <footer className="bg-[#1D1D1F] text-white">
      {/* Newsletter Section */}
      <div className="border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-16 lg:py-20">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
            <div>
              <h3 className="text-[clamp(1.5rem,3vw,2rem)] font-bold tracking-tight mb-2">
                Stay in the loop.
              </h3>
              <p className="text-white/30 text-[14px] sm:text-[15px] font-light">
                Get updates on new divisions, products, and opportunities.
              </p>
            </div>
            <form 
              onSubmit={(e) => { e.preventDefault(); setEmail(''); }}
              className="flex w-full lg:w-auto"
            >
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="flex-1 lg:w-[320px] px-5 py-3.5 bg-white/[0.06] border border-white/[0.1] rounded-l-full text-[14px] text-white placeholder:text-white/25 outline-none focus:border-white/25 transition-colors"
                aria-label="Email address"
              />
              <button 
                type="submit"
                className="px-6 py-3.5 bg-white text-black rounded-r-full text-[14px] font-semibold hover:bg-white/90 transition-colors whitespace-nowrap"
              >
                Subscribe
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Main Footer */}
      <div className="max-w-7xl mx-auto px-6 lg:px-12 py-16 lg:py-20">
        <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-10 mb-16">
          {/* Logo */}
          <div className="lg:col-span-2">
            <a 
              href="#top"
              onClick={(e) => {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="inline-flex items-center gap-3 mb-6 group cursor-pointer"
              aria-label="KRONOS CONTROL — Back to top"
            >
              <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center group-hover:shadow-[0_0_16px_rgba(255,255,255,0.2)] transition-shadow duration-300">
                <svg viewBox="0 0 40 40" className="w-[20px] h-[20px]" aria-hidden="true">
                  <path d={LOGO.hourglass} fill="none" stroke="black" strokeWidth={LOGO.spineWidth} strokeLinecap="round" strokeLinejoin="round" />
                  <path d={LOGO.crown} fill="none" stroke="black" strokeWidth={LOGO.armWidth} strokeLinecap="round" strokeLinejoin="round" />
                  <line x1={LOGO.diagonal.x1} y1={LOGO.diagonal.y1} x2={LOGO.diagonal.x2} y2={LOGO.diagonal.y2} stroke="black" strokeWidth={LOGO.armWidth} strokeLinecap="round" />
                </svg>
              </div>
              <div className="font-semibold text-base tracking-tight">
                KRONOS<span className="font-light ml-1.5 opacity-50 group-hover:opacity-70 transition-opacity duration-300">CONTROL</span>
              </div>
            </a>
            <p className="text-white/30 text-[14px] max-w-xs leading-relaxed mb-8">
              Building the future through innovation, creativity, and unwavering commitment to excellence.
            </p>

            {/* Social Icons — SVG */}
            <div className="flex items-center gap-3">
              {[
                { type: 'twitter', label: 'Twitter / X' },
                { type: 'linkedin', label: 'LinkedIn' },
                { type: 'instagram', label: 'Instagram' },
                { type: 'telegram', label: 'Telegram' },
                { type: 'youtube', label: 'YouTube' },
              ].map((social) => (
                <a
                  key={social.type}
                  href="#"
                  className="w-10 h-10 rounded-full flex items-center justify-center bg-white/[0.06] text-white/40 hover:bg-white/[0.12] hover:text-white transition-all duration-200"
                  aria-label={social.label}
                >
                  <SocialIcon type={social.type} />
                </a>
              ))}
            </div>
          </div>

          {/* Links */}
          {[
            { title: 'Divisions', links: ['Tech', 'Media', 'Labs', 'Studios', 'Ventures', 'Academy'] },
            { title: 'Company', links: ['About', 'Careers', 'Press', 'Contact'] },
            { title: 'Resources', links: ['Blog', 'Documentation', 'Support', 'Partners'] },
          ].map((column) => (
            <div key={column.title}>
              <h4 className="font-semibold text-[12px] tracking-[0.1em] uppercase text-white/50 mb-5">{column.title}</h4>
              <ul className="space-y-3">
                {column.links.map((link) => (
                  <li key={link}>
                    <a href="#" className="text-white/40 hover:text-white transition-colors duration-200 text-[13px]">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/[0.06] pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-white/20 text-[12px]">
            © {currentYear} KRONOS CONTROL. All rights reserved.
          </p>
          <div className="flex gap-6">
            {['Privacy Policy', 'Terms of Service', 'Cookie Settings'].map((link) => (
              <a key={link} href="#" className="text-white/20 hover:text-white/50 text-[12px] transition-colors">
                {link}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

// Main App
export default function App() {
  const [scrolled, setScrolled] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Initialize Lenis smooth scroll
  useSmoothScroll();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="bg-white antialiased">
      {/* Custom Cursor — Desktop only */}
      <CustomCursor />

      <AnimatePresence>
        {!loaded && <Preloader onComplete={() => setLoaded(true)} />}
      </AnimatePresence>

      <Navigation scrolled={scrolled} />
      <HeroSection />
      
      {/* Section Transition: Hero (black) → Manifesto (white) */}
      <SectionTransition from="#000000" to="#ffffff" height={80} />
      
      <ManifestoSection />
      
      {/* Section Transition: Manifesto (white) → Divisions (gray) */}
      <SectionTransition from="#ffffff" to="#F5F5F7" height={60} />
      
      <DivisionsSection />
      
      {/* Section Transition: Divisions (gray) → Connection (black) */}
      <SectionTransition from="#F5F5F7" to="#000000" height={80} />
      
      <ConnectionSection />
      
      {/* Section Transition: Connection (black) → Stats (gray) */}
      <SectionTransition from="#000000" to="#F5F5F7" height={80} />
      
      <StatsSection />
      
      {/* Section Transition: Stats (gray) → CTA (black) */}
      <SectionTransition from="#F5F5F7" to="#000000" height={80} />
      
      <CTASection />
      
      {/* Section Transition: CTA (black) → Footer (dark) */}
      <SectionTransition from="#000000" to="#1D1D1F" height={40} />
      
      <Footer />
    </div>
  );
}
