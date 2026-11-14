import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import gsap from 'gsap';
import * as THREE from 'three';
import {
  createForeEdgeTexture,
  createGiltEdgeTexture,
  createBindingTexture,
  createSpineTexture,
  createCoverTexture,
} from './textures';
import { uFromPage } from '@/lib/pageMath';
import { play } from '@/lib/sound';

/** The redesign's stage colour, behind the book. */
const STAGE = '#e6e3db';
/** The page marker: the redesign's crimson "you are here". */
const MARKER = '#a8283a';

/* --------------------------------------------------------------------------
 * Book dimensions, in world units.
 *
 *   x — through the thickness of the book. This is the axis the player sweeps.
 *   y — book height.
 *   z — spine (-z) to fore edge (+z).
 *
 * The book stands upright with its fore edge toward the camera, so the face
 * filling the screen is the stack of page edges: exactly what you would thumb
 * through to open a real Bible at roughly the right place.
 * ----------------------------------------------------------------------- */
const THICKNESS = 1.45;
const HEIGHT = 3.0;
const DEPTH = 2.05;
const COVER = 0.055;
const OVERHANG = 0.06;

/**
 * The camera never moves. It sits here and looks straight at the centre of the
 * book; the player turns the book instead, which keeps the framing stable and
 * makes the page edges behave predictably under the cursor.
 */
const CAMERA_POSITION = [-2.6, 1.15, 7.2];

/**
 * Yaw at which the fore edge faces the camera square-on.
 *
 * Derived from the camera position rather than hard-coded, so moving the camera
 * cannot silently leave the book pointing somewhere else.
 */
const FACING_YAW = Math.atan2(CAMERA_POSITION[0], CAMERA_POSITION[2]);

/** Radians of yaw per pixel dragged. A full turn takes roughly a screen width. */
const YAW_PER_PIXEL = 0.007;

/** Movement past this many pixels counts as turning the book. */
const DRAG_THRESHOLD = 5;

// ---------------------------------------------------------------------------
// Half of a split book block
// ---------------------------------------------------------------------------

/**
 * One stack of leaves, from `xStart` to `xEnd` across the book's thickness.
 *
 * Until the player opens it, a single half spanning the whole thickness renders
 * the intact book. On opening the block is rebuilt as two halves that meet
 * exactly at the chosen page — the fore-edge texture is sliced to match, so the
 * swap is invisible — and then swung open about the spine.
 */
function BookBlock({ xStart, xEnd, foreEdge, gilt }) {
  const width = xEnd - xStart;
  const centre = (xStart + xEnd) / 2;

  // Each half shows only its own slice of the fore-edge texture, mapped from
  // the same source so the grain runs continuously across the split.
  const materials = useMemo(() => {
    const u0 = (xStart + THICKNESS / 2) / THICKNESS;
    const u1 = (xEnd + THICKNESS / 2) / THICKNESS;

    const edge = foreEdge.clone();
    edge.needsUpdate = true;
    edge.repeat.set(u1 - u0, 1);
    edge.offset.set(u0, 0);

    const paper = new THREE.MeshStandardMaterial({ color: '#e6dbc2', roughness: 0.95 });
    const giltMaterial = new THREE.MeshStandardMaterial({
      map: gilt,
      roughness: 0.35,
      metalness: 0.55,
    });

    // BoxGeometry material order: +x, -x, +y, -y, +z, -z.
    return [
      paper,
      paper,
      giltMaterial,
      giltMaterial,
      new THREE.MeshStandardMaterial({ map: edge, roughness: 0.88 }),
      new THREE.MeshStandardMaterial({ color: '#c9b894', roughness: 0.95 }),
    ];
  }, [xStart, xEnd, foreEdge, gilt]);

  useEffect(() => () => materials.forEach((material) => material.dispose()), [materials]);

  return (
    <mesh position={[centre, 0, 0]} material={materials}>
      <boxGeometry args={[width, HEIGHT, DEPTH]} />
    </mesh>
  );
}

// ---------------------------------------------------------------------------
// Covers
// ---------------------------------------------------------------------------

function Cover({ side, binding, coverArt }) {
  const x = side * (THICKNESS / 2 + COVER / 2);

  const materials = useMemo(() => {
    const plain = new THREE.MeshStandardMaterial({ map: binding, roughness: 0.86 });

    // The back board is plain cloth all over, as a real binding is.
    if (side > 0) return [plain, plain, plain, plain, plain, plain];

    // Only the front board is blocked, and only on its outward (-x) face.
    // BoxGeometry material order: +x, -x, +y, -y, +z, -z.
    const printed = new THREE.MeshStandardMaterial({ map: coverArt, roughness: 0.8 });
    return [plain, printed, plain, plain, plain, plain];
  }, [binding, coverArt, side]);

  // The same material instance fills most slots, so dedupe before disposing.
  useEffect(() => () => new Set(materials).forEach((material) => material.dispose()), [materials]);

  return (
    <mesh position={[x, 0, OVERHANG / 2]} material={materials}>
      <boxGeometry args={[COVER, HEIGHT + OVERHANG * 2, DEPTH + OVERHANG]} />
    </mesh>
  );
}

function Spine({ cloth }) {
  return (
    <mesh position={[0, 0, -(DEPTH / 2 + COVER / 2)]}>
      <boxGeometry args={[THICKNESS + COVER * 2, HEIGHT + OVERHANG * 2, COVER]} />
      <meshStandardMaterial map={cloth} roughness={0.86} />
    </mesh>
  );
}

// ---------------------------------------------------------------------------
// The book
// ---------------------------------------------------------------------------

function Book({ totalPages, onOpen, yawRef, controls, sliderPage, openRequest }) {
  const baseRef = useRef();
  const leftRef = useRef();
  const rightRef = useRef();

  const [splitU, setSplitU] = useState(null);
  const opening = splitU !== null;

  // The marker follows the slider beneath the book.
  const markerU = sliderPage ? uFromPage(sliderPage, totalPages) : null;

  const foreEdge = useMemo(() => createForeEdgeTexture(), []);
  const gilt = useMemo(() => createGiltEdgeTexture(), []);
  const binding = useMemo(() => createBindingTexture(), []);
  const spineCloth = useMemo(() => createSpineTexture(), []);
  const coverArt = useMemo(() => createCoverTexture(), []);

  useEffect(
    () => () => [foreEdge, gilt, binding, spineCloth, coverArt].forEach((t) => t.dispose()),
    [foreEdge, gilt, binding, spineCloth, coverArt]
  );

  // The book opens on request (the "Open at page" button), at the slider's page.
  useEffect(() => {
    if (!openRequest || opening) return;
    controls.current.locked = true;
    play('bookOpen');
    setSplitU(uFromPage(openRequest.page, totalPages));
    // Keyed on the request object: each press is a fresh request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openRequest]);

  // Hand the yaw group up so the wrapper's drag handler can turn it directly,
  // without a re-render per pointer move.
  useEffect(() => {
    yawRef.current = baseRef.current;
  }, [yawRef]);

  // Settle-in animation on first render.
  useEffect(() => {
    const target = baseRef.current;
    if (!target) return undefined;
    const tween = gsap.from(target.rotation, {
      y: FACING_YAW - 0.85,
      duration: 1.1,
      ease: 'power3.out',
    });
    return () => tween.kill();
  }, []);

  // Deliberately no idle motion: the book holds still unless the player turns
  // it, so the marker on the page edges stays where the slider put it.

  /**
   * The opening itself: both halves pivot about the spine, at the exact page the
   * player picked, until they lie flat facing the camera — the same motion your
   * hands make splitting a book at your thumb.
   */
  useEffect(() => {
    if (!opening || !leftRef.current || !rightRef.current) return undefined;

    // However far the player has spun the book, it squares up to the camera as
    // it opens — you have to be facing the pages to read them. The turn takes
    // the short way round rather than unwinding every rotation they made.
    const current = baseRef.current.rotation.y;
    const turns = Math.round((current - FACING_YAW) / (Math.PI * 2));
    const squareUp = FACING_YAW + turns * Math.PI * 2;

    const timeline = gsap.timeline({
      defaults: { duration: 0.85, ease: 'power2.inOut' },
      // The requested page itself, not one recovered from the split position,
      // so the book always opens exactly where the slider said.
      onComplete: () => onOpen(openRequest.page),
    });

    timeline
      .to(leftRef.current.rotation, { y: -Math.PI / 2 }, 0)
      .to(rightRef.current.rotation, { y: Math.PI / 2 }, 0)
      .to(baseRef.current.rotation, { y: squareUp, duration: 0.5, ease: 'power2.out' }, 0)
      .to(baseRef.current.scale, { x: 1.12, y: 1.12, z: 1.12, duration: 0.85 }, 0);

    return () => timeline.kill();
    // openRequest is read for its page only; the split it set is what keys this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opening, splitU, totalPages, onOpen]);

  const splitX = splitU === null ? 0 : -THICKNESS / 2 + splitU * THICKNESS;
  const pivotZ = -DEPTH / 2;

  return (
    <group>
      {/* Yaw only — the book stays upright and level however far it is turned. */}
      <group ref={baseRef} rotation={[0, FACING_YAW, 0]}>
        {!opening ? (
          <>
            <BookBlock
              xStart={-THICKNESS / 2}
              xEnd={THICKNESS / 2}
              foreEdge={foreEdge}
              gilt={gilt}
            />
            <Cover side={-1} binding={binding} coverArt={coverArt} />
            <Cover side={1} binding={binding} coverArt={coverArt} />
            <Spine cloth={spineCloth} />

            {markerU !== null && (
              <mesh position={[-THICKNESS / 2 + markerU * THICKNESS, 0, DEPTH / 2 + 0.012]}>
                <boxGeometry args={[0.02, HEIGHT * 1.04, 0.02]} />
                <meshStandardMaterial
                  color={MARKER}
                  emissive={MARKER}
                  emissiveIntensity={0.35}
                  toneMapped={false}
                />
              </mesh>
            )}
          </>
        ) : (
          <>
            {/* Each half is parented to a pivot sitting on the spine at the
                chosen page, so both swing open from the same hinge. */}
            <group ref={leftRef} position={[splitX, 0, pivotZ]}>
              <group position={[-splitX, 0, -pivotZ]}>
                <BookBlock
                  xStart={-THICKNESS / 2}
                  xEnd={splitX}
                  foreEdge={foreEdge}
                  gilt={gilt}
                />
                <Cover side={-1} binding={binding} coverArt={coverArt} />
              </group>
            </group>

            <group ref={rightRef} position={[splitX, 0, pivotZ]}>
              <group position={[-splitX, 0, -pivotZ]}>
                <BookBlock
                  xStart={splitX}
                  xEnd={THICKNESS / 2}
                  foreEdge={foreEdge}
                  gilt={gilt}
                />
                <Cover side={1} binding={binding} coverArt={coverArt} />
              </group>
            </group>
          </>
        )}
      </group>
    </group>
  );
}

// ---------------------------------------------------------------------------

/**
 * Phase 1 of the game: the closed Bible, seen edge-on.
 *
 * The book can be turned by dragging, to look at it, but never pointed at:
 * the page comes from the slider beneath it (`sliderPage`, shown as a marker on
 * the page edges), and it opens when `openRequest` changes. The same on every
 * screen size.
 *
 * @param {number} totalPages
 * @param {(page: number) => void} onOpen fires once the opening animation lands
 * @param {number} [sliderPage]       the page the slider is on, for the marker
 * @param {{page: number}} [openRequest] a fresh object per "open here" press
 */
export default function ClosedBible3D({ totalPages, onOpen, sliderPage = null, openRequest = null }) {
  const yawRef = useRef(null);
  const controls = useRef({ dragged: false, locked: false });
  const dragRef = useRef(null);

  function onPointerDown(event) {
    if (controls.current.locked || event.button !== 0) return;
    controls.current.dragged = false;
    dragRef.current = {
      startX: event.clientX,
      lastX: event.clientX,
      pointerId: event.pointerId,
      target: event.currentTarget,
      captured: false,
    };
    // Pointer capture waits until the movement threshold below proves this is a
    // deliberate turn, so a stray tap on the book does nothing at all.
  }

  function onPointerMove(event) {
    const state = dragRef.current;
    if (!state || controls.current.locked) return;

    if (!controls.current.dragged && Math.abs(event.clientX - state.startX) > DRAG_THRESHOLD) {
      controls.current.dragged = true;
      // Now it is unambiguously a rotation: take the pointer so the drag keeps
      // tracking past the edge of the frame, and drop the settle-in tween that
      // would otherwise fight the player for rotation.y.
      if (yawRef.current) gsap.killTweensOf(yawRef.current.rotation);
      try {
        state.target?.setPointerCapture?.(state.pointerId);
        state.captured = true;
      } catch {
        /* capture is an optimisation, not a requirement */
      }
    }

    const dx = event.clientX - state.lastX;
    state.lastX = event.clientX;
    // Applied straight to the object rather than through state: this runs on
    // every pointer move and must not cost a React render.
    if (yawRef.current) yawRef.current.rotation.y += dx * YAW_PER_PIXEL;
  }

  function onPointerUp() {
    const state = dragRef.current;
    dragRef.current = null;
    if (!state?.captured) return;
    try {
      state.target?.releasePointerCapture?.(state.pointerId);
    } catch {
      /* already released */
    }
  }

  return (
    <div
      className="h-full w-full cursor-grab touch-none select-none active:cursor-grabbing"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onDragStart={(event) => event.preventDefault()}
    >
      <Canvas
        dpr={[1, 2]}
        // The camera is fixed and aimed at the centre of the book. Framing is
        // changed by turning the book, never by moving the camera.
        camera={{ position: CAMERA_POSITION, fov: 34 }}
        onCreated={({ camera }) => camera.lookAt(0, 0, 0)}
        gl={{ antialias: true }}
        // No filmic tone mapping: it brightens and saturates every colour, so
        // the navy cloth came out a different, punchier blue from the navy in
        // the page around it. Flat output keeps the textures' real colours.
        flat
      >
        {/* A daylit stage in the page's own stone colour, so the canvas sits
            flush with the layout around it instead of as a dark box. */}
        <color attach="background" args={[STAGE]} />
        <fog attach="fog" args={[STAGE, 12, 20]} />

        {/* Balanced so the faces turned toward the light sum to about full
            strength — the cover reads as the site's navy rather than blown out
            — while the faces turned away still fall into shade. Neutral white
            throughout, so no light tints the cloth. */}
        <ambientLight intensity={0.62} />
        <directionalLight position={[-3, 4, 6]} intensity={0.78} color="#ffffff" />
        <directionalLight position={[4, 2, 3]} intensity={0.18} color="#ffffff" />


        <Book
          totalPages={totalPages}
          onOpen={onOpen}
          yawRef={yawRef}
          controls={controls}
          sliderPage={sliderPage}
          openRequest={openRequest}
        />
      </Canvas>
    </div>
  );
}
