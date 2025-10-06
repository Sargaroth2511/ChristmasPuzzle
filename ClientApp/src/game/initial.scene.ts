import Phaser from 'phaser';

import { SceneData } from './puzzle.types';
import {
  INITIAL_CAMERA_FOCUS_OFFSET,
  INITIAL_PARALLAX_RANGE,
  INITIAL_ZOOM_DELAY_MS,
  INITIAL_ZOOM_DURATION_MS,
  INITIAL_ZOOM_TARGET_SCALE
} from './initial.constants';

const LAYER_CONFIG = [
  { key: 'initial-layer-1', assetPath: 'assets/initalScene/layer_1.png', depth: 10 },
  { key: 'initial-layer-2', assetPath: 'assets/initalScene/layer_2.png', depth: 20 },
  { key: 'initial-layer-3', assetPath: 'assets/initalScene/layer_3.png', depth: 30 },
  { key: 'initial-layer-4', assetPath: 'assets/initalScene/layer_4.png', depth: 40 },
  { key: 'initial-stag-3d', assetPath: 'assets/initalScene/stag_3d.png', depth: 50 },
  { key: 'initial-layer-5', assetPath: 'assets/initalScene/layer_5.png', depth: 60 }
] as const;

type LayerRuntime = {
  key: string;
  image: Phaser.GameObjects.Image;
  baseScale: number;
  parallax: number;
};

export class InitialScene extends Phaser.Scene {
  private emitter?: Phaser.Events.EventEmitter;
  private scenePreferences: SceneData = {};
  private transitionInProgress = false;
  private layerRuntimes: LayerRuntime[] = [];
  private zoomTween?: Phaser.Tweens.Tween;
  private stagFocusPoint?: Phaser.Math.Vector2;
  private stagLayer?: Phaser.GameObjects.Image;
  private zoomOriginPoint?: Phaser.Math.Vector2;
  private zoomTargetPoint?: Phaser.Math.Vector2;
  private readonly handleExternalGoOn = () => this.startPuzzleScene();

  constructor() {
    super('InitialScene');
  }

  init(data: SceneData): void {
    this.emitter = data?.emitter;
    this.scenePreferences = {
      emitter: data?.emitter,
      showDebug: data?.showDebug,
      useGlassStyle: data?.useGlassStyle
    };
  }

  preload(): void {
    LAYER_CONFIG.forEach(({ key, assetPath }) => {
      this.load.image(key, assetPath);
    });
  }

  create(): void {
    this.addLayeredBackdrop();
    this.registerEmitterBridges();
    // this.scheduleZoomSequence(); // Commented out to prevent zoom for testing
  }

  private registerEmitterBridges(): void {
    if (!this.emitter) {
      return;
    }

    this.emitter.on('initial-go-on', this.handleExternalGoOn);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.emitter?.off('initial-go-on', this.handleExternalGoOn);
    });
  }

  private addLayeredBackdrop(): void {
    const centerX = this.scale.width * 0.5;
    const centerY = this.scale.height * 0.5;
    const compositeLayer = this.add.layer();
    const sortedLayers = [...LAYER_CONFIG].sort((a, b) => a.depth - b.depth);
    const minDepth = sortedLayers[0]?.depth ?? 0;
    const maxDepth = sortedLayers[sortedLayers.length - 1]?.depth ?? 1;
    const depthRange = Math.max(maxDepth - minDepth, 1);

    this.layerRuntimes = [];

    sortedLayers.forEach(({ key, depth }) => {
      const image = this.add.image(centerX, centerY, key);
      const baseScale = Math.max(this.scale.width / image.width, this.scale.height / image.height);
      image.setScale(baseScale);
      image.setDepth(depth);
      image.setName(key);
      compositeLayer.add(image);

      const normalized = (depth - minDepth) / depthRange;
      const parallax = Phaser.Math.Linear(INITIAL_PARALLAX_RANGE.near, INITIAL_PARALLAX_RANGE.far, normalized);
      image.setScrollFactor(0.8 + normalized * 0.2);

      if (key === 'initial-stag-3d') {
        this.stagLayer = image;
      }

      this.layerRuntimes.push({
        key,
        image,
        baseScale,
        parallax
      });
    });

    compositeLayer.setDepth(sortedLayers[sortedLayers.length - 1]?.depth ?? 0);
    this.stagFocusPoint = this.resolveFocusPoint();
  }

  private scheduleZoomSequence(): void {
    this.time.delayedCall(INITIAL_ZOOM_DELAY_MS, () => this.beginZoomSequence());
  }

  private beginZoomSequence(): void {
    if (this.zoomTween || this.layerRuntimes.length === 0) {
      return;
    }

    this.zoomOriginPoint = new Phaser.Math.Vector2(this.scale.width * 0.5, this.scale.height * 0.5);
    this.stagFocusPoint = this.resolveFocusPoint();
    this.zoomTargetPoint = this.stagFocusPoint.clone();

    const progress = { value: 0 };
    const camera = this.cameras.main;

    camera.setZoom(1);
    camera.centerOn(this.zoomOriginPoint.x, this.zoomOriginPoint.y);

    this.zoomTween = this.tweens.add({
      targets: progress,
      value: 1,
      duration: INITIAL_ZOOM_DURATION_MS,
      delay: 0,
      ease: 'Sine.easeInOut',
      onUpdate: () => this.applyZoomProgress(progress.value, this.zoomTargetPoint!),
      onComplete: () => {
        this.zoomTween = undefined;
        this.emitter?.emit('initial-zoom-complete');
      }
    });
  }

  private resolveFocusPoint(): Phaser.Math.Vector2 {
    if (this.stagLayer) {
      return new Phaser.Math.Vector2(
        this.stagLayer.x + INITIAL_CAMERA_FOCUS_OFFSET.x,
        this.stagLayer.y + INITIAL_CAMERA_FOCUS_OFFSET.y
      );
    }

    return new Phaser.Math.Vector2(
      this.scale.width * 0.5 + INITIAL_CAMERA_FOCUS_OFFSET.x,
      this.scale.height * 0.5 + INITIAL_CAMERA_FOCUS_OFFSET.y
    );
  }

  private applyZoomProgress(progress: number, focusPoint: Phaser.Math.Vector2): void {
    const clamped = Phaser.Math.Clamp(progress, 0, 1);
    const camera = this.cameras.main;
    const startX = this.zoomOriginPoint?.x ?? this.scale.width * 0.5;
    const startY = this.zoomOriginPoint?.y ?? this.scale.height * 0.5;
    const zoom = Phaser.Math.Linear(1, INITIAL_ZOOM_TARGET_SCALE, clamped);

    camera.setZoom(zoom);
    const targetX = Phaser.Math.Linear(startX, focusPoint.x, clamped);
    const targetY = Phaser.Math.Linear(startY, focusPoint.y, clamped);
    camera.centerOn(targetX, targetY);

    for (const runtime of this.layerRuntimes) {
      const scaleMultiplier = 1 + (INITIAL_ZOOM_TARGET_SCALE - 1) * runtime.parallax * clamped;
      runtime.image.setScale(runtime.baseScale * scaleMultiplier);
    }
  }

  private startPuzzleScene(): void {
    if (this.transitionInProgress) {
      return;
    }

    this.transitionInProgress = true;

    if (this.zoomTween) {
      this.zoomTween.remove();
      this.zoomTween = undefined;
    }

    this.zoomOriginPoint = undefined;
    this.zoomTargetPoint = undefined;

    this.scene.start('PuzzleScene', {
      emitter: this.emitter,
      showDebug: this.scenePreferences.showDebug,
      useGlassStyle: this.scenePreferences.useGlassStyle
    });
  }

  updatePreferences(preferences: Pick<SceneData, 'showDebug' | 'useGlassStyle'>): void {
    this.scenePreferences = {
      ...this.scenePreferences,
      ...preferences
    };
  }
}
