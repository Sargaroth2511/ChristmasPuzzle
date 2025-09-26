import { AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import Phaser from 'phaser';
import { firstValueFrom } from 'rxjs';

import { PuzzleScene } from '../game/puzzle.scene';
import { PuzzleConfig } from './shared/puzzle-config.model';
import { PuzzleConfigService } from './shared/puzzle-config.service';

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

  loadingMessage = 'Fetching puzzle blueprint…';
  errorMessage = '';
  puzzleComplete = false;

  private game?: Phaser.Game;
  private sceneEvents?: Phaser.Events.EventEmitter;

  constructor(private readonly configService: PuzzleConfigService, private readonly cdr: ChangeDetectorRef) {}

  async ngAfterViewInit(): Promise<void> {
    if (!this.gameHost) {
      return;
    }

    try {
      const config = await firstValueFrom(this.configService.loadConfig());
      this.loadingMessage = '';
      this.launchGame(config);
    } catch (error) {
      console.error('Unable to load puzzle configuration', error);
      this.loadingMessage = '';
      this.errorMessage = 'Failed to reach the backend. Ensure the ASP.NET host is running.';
      this.cdr.markForCheck();
    }
  }

  private launchGame(config: PuzzleConfig): void {
    this.errorMessage = '';
    this.puzzleComplete = false;
    const host = this.gameHost!.nativeElement;
    const width = 960;
    const height = 640;

    this.game = new Phaser.Game({
      type: Phaser.AUTO,
      width,
      height,
      parent: host,
      backgroundColor: '#0c1b2a',
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

    this.game.scene.add('PuzzleScene', PuzzleScene, true, { config, emitter });

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
}
