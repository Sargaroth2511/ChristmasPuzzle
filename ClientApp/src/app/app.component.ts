import { AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import Phaser from 'phaser';

import { PuzzleScene } from '../game/puzzle.scene';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent implements AfterViewInit, OnDestroy {
  @ViewChild('gameHost', { static: true }) private readonly gameHost?: ElementRef<HTMLDivElement>;

  readonly title = 'Christmas Puzzle';

  puzzleComplete = false;
  showDebug = false;

  private game?: Phaser.Game;
  private sceneEvents?: Phaser.Events.EventEmitter;

  constructor(private readonly cdr: ChangeDetectorRef) {}

  ngAfterViewInit(): void {
    if (!this.gameHost) {
      return;
    }

    this.launchGame();
  }

  private launchGame(): void {
    this.puzzleComplete = false;
    const host = this.gameHost!.nativeElement;
    const width = 960;
    const height = 640;

    this.game = new Phaser.Game({
      type: Phaser.AUTO,
      width,
      height,
      parent: host,
      backgroundColor: '#BEC6A8',
      banner: false,
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width,
        height
      }
    });

    const emitter = new Phaser.Events.EventEmitter();
    this.sceneEvents = emitter;

    this.game.scene.add('PuzzleScene', PuzzleScene, true, { emitter, showDebug: this.showDebug });

    emitter.on('puzzle-complete', () => {
      this.puzzleComplete = true;
      this.cdr.markForCheck();
    });

    emitter.on('puzzle-reset', () => {
      this.puzzleComplete = false;
      this.cdr.markForCheck();
    });

    this.cdr.markForCheck();
  }

  ngOnDestroy(): void {
    if (this.sceneEvents) {
      this.sceneEvents.removeAllListeners();
      this.sceneEvents = undefined;
    }

    if (this.game) {
      this.game.destroy(true);
      this.game = undefined;
    }
  }

  toggleDebug(): void {
    this.showDebug = !this.showDebug;
    if (!this.game) {
      return;
    }

    const scene = this.game.scene.getScene('PuzzleScene') as PuzzleScene | undefined;
    scene?.setDebugVisible(this.showDebug);
  }
}
