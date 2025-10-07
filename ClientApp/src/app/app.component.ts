import { AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, OnDestroy, ViewChild, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import Phaser from 'phaser';

import { InitialScene } from '../game/initial.scene';
import { PuzzleScene } from '../game/puzzle.scene';
import { UserService, UserData, Language, Salutation } from './user.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, HttpClientModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [UserService]
})
export class AppComponent implements AfterViewInit, OnDestroy, OnInit {
  @ViewChild('gameHost', { static: true }) private readonly gameHost?: ElementRef<HTMLDivElement>;

  readonly title = 'Christmas Puzzle';

  puzzleComplete = false;
  showDebug = false;
  useGlassStyle = false;
  menuOpen = false;
  showIntroOverlay = false;
  showInitialContinueButton = false;
  showUserInfo = true; // Show user info during initial scene
  showExplosionModal = false;
  showInstructions = false;
  coinTotal = 0;
  donationMessageVisible = false;
  hideRestartButton = false;
  private completionOverlayTimer?: ReturnType<typeof setTimeout>;
  private gameInitialized = false;
  private readonly mobileBreakpoint = 1035;
  private immersiveActive = false;
  completionTime?: number;

  // User validation and personalization
  userValidated = false;
  userGuid?: string;
  userData?: UserData;
  userErrorMessage?: string;

  private game?: Phaser.Game;
  private sceneEvents?: Phaser.Events.EventEmitter;
  private sceneStartHandler?: (scene: Phaser.Scene) => void;
  private readonly handleViewportResize = () => {
    if (!this.game) {
      return;
    }
    this.game.scale.refresh();
  };

  constructor(
    private readonly cdr: ChangeDetectorRef,
    private readonly userService: UserService
  ) {}

  formatTime(seconds?: number): string {
    if (seconds === undefined || seconds === null) {
      return '0:00';
    }
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  ngOnInit(): void {
    // Parse GUID from URL query parameter
    const urlParams = new URLSearchParams(window.location.search);
    const uid = urlParams.get('uid');

    if (uid) {
      this.userGuid = uid;
      this.validateUser(uid);
    }
    // If no UID, user can still play but won't have stats saved
  }

  private validateUser(uid: string): void {
    this.userService.getUserByGuid(uid).subscribe({
      next: (userData) => {
        this.userData = userData;
        this.userValidated = true;
        console.log('User data loaded:', userData);
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.userValidated = false;
        // Show info message but allow game to continue
        console.warn('User validation failed:', error.message);
        this.cdr.markForCheck();
      }
    });
  }

  getUserDisplayName(): string {
    return this.userData?.name ?? 'Puzzler';
  }

  getLanguageText(): string {
    if (!this.userData) {
      return '-';
    }
    return this.userData.language === Language.German ? 'Deutsch' : 'English';
  }

  ngAfterViewInit(): void {
    if (!this.gameHost) {
      return;
    }
    // Launch game immediately on all device sizes - use the same flow
    this.showIntroOverlay = false;
    this.launchGame();
    this.cdr.markForCheck();
  }

  private launchGame(): void {
    if (this.game || !this.gameHost) {
      return;
    }

    this.clearCompletionOverlayTimer();
    this.puzzleComplete = false;
    this.showInitialContinueButton = false;
    this.hideRestartButton = false;
    this.donationMessageVisible = false;
    const host = this.gameHost.nativeElement;
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

    this.game.scene.add('InitialScene', InitialScene, true, {
      emitter,
      showDebug: this.showDebug,
      useGlassStyle: this.useGlassStyle
    });

    this.game.scene.add('PuzzleScene', PuzzleScene, false);

    const handleSceneStart = (scene: Phaser.Scene) => {
      if (!this.game) {
        return;
      }
      if (scene.scene.key === 'PuzzleScene') {
        this.requestCoinTotal();
      }
    };
    this.game.events.on(Phaser.Scenes.Events.START, handleSceneStart);
    this.sceneStartHandler = handleSceneStart;


    emitter.on('puzzle-complete', (payload?: { elapsedSeconds?: number }) => {
      this.clearCompletionOverlayTimer();
      this.puzzleComplete = false;
      this.completionTime = payload?.elapsedSeconds;
      this.hideRestartButton = false;
      this.donationMessageVisible = false;
      this.requestCoinTotal();
      
      // Update user stats if validated
      if (this.userValidated && this.userGuid && payload?.elapsedSeconds !== undefined) {
        this.updateUserStats(payload.elapsedSeconds);
      }
      
      // Exit immersive mode on mobile so completion overlay is visible
      const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 0;
      if (viewportWidth <= this.mobileBreakpoint) {
        this.exitImmersiveMode();
      }
      
      this.completionOverlayTimer = setTimeout(() => {
        this.puzzleComplete = true;
        this.cdr.markForCheck();
      }, 1000);
      this.cdr.markForCheck();
    });

    emitter.on('puzzle-reset', () => {
      this.clearCompletionOverlayTimer();
      this.puzzleComplete = false;
      this.completionTime = undefined;
      this.showInitialContinueButton = false;
      this.donationMessageVisible = false;
      this.hideRestartButton = false;
      this.cdr.markForCheck();
    });

    emitter.on('initial-zoom-complete', () => {
      this.showInitialContinueButton = true;
      this.cdr.markForCheck();
    });

    emitter.on('explosion-complete', () => {
      this.showExplosionModal = true;
      // Show HUD elements (timer and coins) when modal appears
      const puzzleScene = this.game?.scene.getScene('PuzzleScene') as any;
      if (puzzleScene && typeof puzzleScene.showHudElements === 'function') {
        puzzleScene.showHudElements();
      }
      this.cdr.markForCheck();
    });

    emitter.on('coin-total-changed', (total: number) => {
      this.coinTotal = total ?? 0;
      this.cdr.markForCheck();
    });

    window.addEventListener('resize', this.handleViewportResize, { passive: true });
    window.addEventListener('orientationchange', this.handleViewportResize, { passive: true });
    this.game.scale.refresh();
    this.cdr.markForCheck();
    this.gameInitialized = true;
    this.requestCoinTotal();
  }

  ngOnDestroy(): void {
    if (this.sceneEvents) {
      this.sceneEvents.removeAllListeners();
      this.sceneEvents = undefined;
    }

    if (this.sceneStartHandler && this.game) {
      this.game.events.off(Phaser.Scenes.Events.START, this.sceneStartHandler);
      this.sceneStartHandler = undefined;
    }

    this.clearCompletionOverlayTimer();

    if (this.game) {
      this.game.destroy(true);
      this.game = undefined;
      this.gameInitialized = false;
    }

    window.removeEventListener('resize', this.handleViewportResize);
    window.removeEventListener('orientationchange', this.handleViewportResize);

    this.exitImmersiveMode();
  }

  toggleDebug(): void {
    this.showDebug = !this.showDebug;
    if (!this.game) {
      return;
    }

    if (this.game.scene.isActive('PuzzleScene')) {
      const scene = this.game.scene.getScene('PuzzleScene') as PuzzleScene | undefined;
      scene?.setDebugVisible(this.showDebug);
    } else {
      const initialScene = this.game.scene.getScene('InitialScene') as InitialScene | undefined;
      initialScene?.updatePreferences({ showDebug: this.showDebug });
    }
    this.menuOpen = false;
  }

  toggleGlassMode(): void {
    this.useGlassStyle = !this.useGlassStyle;
    if (!this.game) {
      return;
    }

    if (this.game.scene.isActive('PuzzleScene')) {
      const scene = this.game.scene.getScene('PuzzleScene') as PuzzleScene | undefined;
      scene?.setGlassMode(this.useGlassStyle);
    } else {
      const initialScene = this.game.scene.getScene('InitialScene') as InitialScene | undefined;
      initialScene?.updatePreferences({ useGlassStyle: this.useGlassStyle });
    }
    this.menuOpen = false;
  }

  toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
  }

  closeMenu(): void {
    this.menuOpen = false;
  }

  startPuzzle(): void {
    const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 0;
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
    const isLandscape = viewportWidth > viewportHeight;

    // Always hide the intro overlay and launch the game
    this.showIntroOverlay = false;
    
    if (!this.gameInitialized) {
      this.launchGame();
    }
    
    // Try to enter immersive mode on landscape mobile devices
    if (isLandscape && viewportWidth <= this.mobileBreakpoint) {
      this.enterImmersiveMode();
    }

    this.closeMenu();
    this.completionTime = undefined;
    this.cdr.markForCheck();
  }

  continueToPuzzle(): void {
    if (!this.gameInitialized) {
      this.launchGame();
    }

    this.showUserInfo = false; // Hide user info box
    this.showInitialContinueButton = false;
    this.sceneEvents?.emit('initial-go-on');
    this.cdr.markForCheck();
  }

  closeExplosionModal(): void {
    this.showExplosionModal = false;
    this.showInstructions = true;
    
    // Start the timer in the puzzle scene
    if (this.game) {
      const scene = this.game.scene.getScene('PuzzleScene') as any;
      if (scene && typeof scene.startTimer === 'function') {
        scene.startTimer();
      }
    }
    
    // Enter immersive mode on small devices when starting the puzzle
    const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 0;
    if (viewportWidth <= this.mobileBreakpoint) {
      this.enterImmersiveMode();
    }
    
    this.cdr.markForCheck();
  }

  restartPuzzle(): void {
    this.clearCompletionOverlayTimer();
    this.donationMessageVisible = false;
    this.hideRestartButton = false;
    this.puzzleComplete = false;
    this.showInitialContinueButton = false;
    this.showExplosionModal = false;
    this.showInstructions = false;
    this.sceneEvents?.emit('puzzle-reset');

    if (!this.game) {
      this.launchGame();
      this.cdr.markForCheck();
      return;
    }

    const sceneManager = this.game.scene;
    sceneManager.stop('PuzzleScene');
    sceneManager.stop('InitialScene');
    sceneManager.start('PuzzleScene', {
      emitter: this.sceneEvents,
      showDebug: this.showDebug,
      useGlassStyle: this.useGlassStyle
    });
    this.requestCoinTotal();
    this.cdr.markForCheck();
  }

  donateCoins(): void {
    this.hideRestartButton = true;
    this.donationMessageVisible = true;
    this.cdr.markForCheck();
    setTimeout(() => {
      this.donationMessageVisible = false;
      this.cdr.markForCheck();
    }, 2000);
  }

  private requestCoinTotal(): void {
    this.sceneEvents?.emit('coin-total-request');
  }

  private updateUserStats(completionTimeSeconds: number): void {
    if (!this.userGuid) {
      return;
    }

    // Get the number of pieces from the puzzle config (assuming 12 pieces for now)
    // TODO: Get actual piece count from the game
    const piecesAchieved = 12;

    this.userService.updateUserStats(this.userGuid, {
      piecesAchieved,
      completionTimeSeconds,
      puzzleCompleted: true
    }).subscribe({
      next: (updatedData) => {
        this.userData = updatedData;
        console.log('User stats updated successfully:', updatedData);
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('Failed to update user stats:', error);
      }
    });
  }

  private clearCompletionOverlayTimer(): void {
    if (this.completionOverlayTimer) {
      clearTimeout(this.completionOverlayTimer);
      this.completionOverlayTimer = undefined;
    }
  }

  private async exitImmersiveMode(): Promise<void> {
    if (typeof document === 'undefined') {
      return;
    }

    const exitFullscreen =
      document.exitFullscreen ||
      (document as any).webkitExitFullscreen ||
      (document as any).msExitFullscreen ||
      (document as any).mozCancelFullScreen;

    if (exitFullscreen && document.fullscreenElement) {
      try {
        await exitFullscreen.call(document);
        this.immersiveActive = false;
      } catch {
        /* ignore fullscreen errors */
      }
    }

    const orientation: any = typeof screen !== 'undefined' ? (screen.orientation || (screen as any).mozOrientation || (screen as any).msOrientation) : undefined;
    if (orientation && typeof orientation.unlock === 'function') {
      try {
        orientation.unlock();
      } catch {
        /* ignore orientation unlock errors */
      }
    }
  }

  private async enterImmersiveMode(): Promise<void> {
    if (typeof window === 'undefined') {
      return;
    }

    const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 0;
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
    const isMobileViewport = viewportWidth <= this.mobileBreakpoint;
    const isLandscape = viewportWidth > viewportHeight;

    if (!isMobileViewport || !isLandscape || this.immersiveActive) {
      return;
    }

    const host = this.gameHost?.nativeElement;
    if (!host) {
      return;
    }

    const requestFullscreen =
      host.requestFullscreen ||
      (host as any).webkitRequestFullscreen ||
      (host as any).msRequestFullscreen ||
      (host as any).mozRequestFullScreen;
    if (requestFullscreen) {
      try {
        await requestFullscreen.call(host);
        this.immersiveActive = true;
      } catch {
        /* ignore fullscreen errors */
      }
    }

    const orientation: any = typeof screen !== 'undefined' ? (screen.orientation || (screen as any).mozOrientation || (screen as any).msOrientation) : undefined;
    if (orientation && typeof orientation.lock === 'function') {
      try {
        await orientation.lock('landscape');
      } catch {
        /* ignore orientation errors */
      }
    }
  }
}
