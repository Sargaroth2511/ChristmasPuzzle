import Phaser from 'phaser';

import { SceneData } from './puzzle.types';

const LAYER_CONFIG = [
  { key: 'initial-layer-1', assetPath: 'assets/initalScene/layer_1.png', depth: 10 },
  { key: 'initial-layer-2', assetPath: 'assets/initalScene/layer_2.png', depth: 20 },
  { key: 'initial-layer-3', assetPath: 'assets/initalScene/layer_3.png', depth: 30 },
  { key: 'initial-layer-4', assetPath: 'assets/initalScene/layer_4.png', depth: 40 },
  { key: 'initial-stag-3d', assetPath: 'assets/initalScene/stag_3d.png', depth: 50 },
  { key: 'initial-layer-5', assetPath: 'assets/initalScene/layer_5.png', depth: 60 }
] as const;

const BUTTON_TEXT = 'Go On';
const BUTTON_WIDTH = 220;
const BUTTON_HEIGHT = 56;
const BUTTON_BACKGROUND_COLOR = 0x142031;
const BUTTON_HOVER_COLOR = 0x234255;
const BUTTON_TEXT_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
  fontFamily: 'Montserrat, sans-serif',
  fontSize: '28px',
  color: '#ffffff'
};

export class InitialScene extends Phaser.Scene {
  private emitter?: Phaser.Events.EventEmitter;
  private scenePreferences: SceneData = {};
  private buttonBackground?: Phaser.GameObjects.Rectangle;
  private transitionInProgress = false;

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
    this.addCallToAction();
  }

  private addLayeredBackdrop(): void {
    const centerX = this.scale.width * 0.5;
    const centerY = this.scale.height * 0.5;

    LAYER_CONFIG.forEach(({ key, depth }) => {
      const layer = this.add.image(centerX, centerY, key);
      const scale = Math.max(this.scale.width / layer.width, this.scale.height / layer.height);
      layer.setScale(scale);
      layer.setDepth(depth);
      layer.setScrollFactor(0);
    });
  }

  private addCallToAction(): void {
    const centerX = this.scale.width * 0.5;
    const buttonY = this.scale.height - 80;

    this.buttonBackground = this.add
      .rectangle(centerX, buttonY, BUTTON_WIDTH, BUTTON_HEIGHT, BUTTON_BACKGROUND_COLOR, 0.92)
      .setOrigin(0.5)
      .setDepth(120)
      .setStrokeStyle(2, 0xffffff, 0.4)
      .setInteractive({ useHandCursor: true });

    const buttonLabel = this.add
      .text(centerX, buttonY, BUTTON_TEXT, BUTTON_TEXT_STYLE)
      .setOrigin(0.5)
      .setDepth(121);

    this.buttonBackground.on('pointerover', () => {
      this.buttonBackground?.setFillStyle(BUTTON_HOVER_COLOR, 0.92);
    });

    this.buttonBackground.on('pointerout', () => {
      this.buttonBackground?.setFillStyle(BUTTON_BACKGROUND_COLOR, 0.92);
    });

    this.buttonBackground.on('pointerdown', () => {
      this.startPuzzleScene();
    });

    buttonLabel.setInteractive({ useHandCursor: true });
    buttonLabel.on('pointerover', () => {
      this.buttonBackground?.setFillStyle(BUTTON_HOVER_COLOR, 0.92);
    });

    buttonLabel.on('pointerout', () => {
      this.buttonBackground?.setFillStyle(BUTTON_BACKGROUND_COLOR, 0.92);
    });

    buttonLabel.on('pointerdown', () => {
      this.startPuzzleScene();
    });
  }

  private startPuzzleScene(): void {
    if (this.transitionInProgress) {
      return;
    }

    this.transitionInProgress = true;
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
