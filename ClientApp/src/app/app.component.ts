import { AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, OnDestroy, ViewChild, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import Phaser from 'phaser';

import { InitialScene } from '../game/initial.scene';
import { PuzzleScene } from '../game/puzzle.scene';
import { UserService, UserData, Language, Salutation, RecordPieceSnapRequest, StartGameSessionResponse, CompleteGameSessionResponse } from './user.service';
import { GpuDetectionService, GpuDetectionResult } from './services/gpu-detection.service';

// ⚠️ TESTING MODE - Set to true to skip InitialScene and go directly to PuzzleScene
// TODO: Set to false before production deployment
const TESTING_VIDEO_MODE = false;

type PuzzlePiecePlacedPayload = {
  pieceId: string;
  placedCount: number;
  totalPieces: number;
  anchorX: number;
  anchorY: number;
  distance: number;
  tolerance: number;
};
import { LanguageSwitcherComponent } from './language-switcher/language-switcher.component';
import { ModalComponent } from './shared/modal.component';

@Component({
  selector: 'app-puzzle',
  standalone: true,
  imports: [CommonModule, HttpClientModule, TranslateModule, LanguageSwitcherComponent, ModalComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [UserService]
})
export class AppComponent implements AfterViewInit, OnDestroy, OnInit {
  @ViewChild('gameHost', { static: true }) private readonly gameHost?: ElementRef<HTMLDivElement>;

  readonly title = 'oh22 Xmas';

  puzzleComplete = false;
  hasCompletedPuzzle = false; // Track if user has completed and closed the thank you modal
  menuOpen = false;
  showIntroOverlay = false;
  showInitialContinueButton = false;
  showUserInfo = false; // Only show user info after puzzle start
  showExplosionModal = false;
  showGreetingModal = false;
  greetingHeadline = '';
  greetingNamePart = '';
  greetingMessagePart = '';
  showInstructions = false;
  coinTotal = 0;
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

  activeSessionId?: string;
  sessionPuzzleVersion?: string;
  sessionStartInFlight = false;
  sessionPiecesAcknowledged = 0;
  sessionErrorMessage?: string;

  showThankYouModal = false;
  thankYouErrorMessage?: string;
  salutationVariant: 'informal' | 'formal' = 'informal';

  // Unsaved completed session modal
  showUnsavedSessionModal = false;
  unsavedSessionId?: string;
  unsavedSessionDuration?: number;

  // Session expired modal
  showSessionExpiredModal = false;

  // GPU Performance Detection
  showPerformanceWarning = false;
  performanceIssue?: GpuDetectionResult;

  private pendingSnapQueue: RecordPieceSnapRequest[] = [];
  private processingSnap = false;

  private readonly STORAGE_KEY_USER_GUID = 'userGuid';
  private readonly COOKIE_KEY_USER_GUID = 'oh22_user_guid';
  private readonly COOKIE_MAX_AGE_DAYS = 365; // 1 year

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
    private readonly userService: UserService,
    private readonly translate: TranslateService,
    private readonly gpuDetection: GpuDetectionService
  ) {
    // Setup available languages
    this.translate.addLangs(['de', 'en']);
    this.translate.setDefaultLang('de');
    this.greetingHeadline = this.translate.instant('greeting.generic');
    
    // Subscribe to language changes to update greeting
    this.translate.onLangChange.subscribe(() => {
      // Re-set greeting when language changes
      if (this.userData) {
        this.setGreetingMessage(true);
      } else if (this.userGuid) {
        this.setGreetingMessage(false);
      }
    });
  }

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
    const uidFromUrl = urlParams.get('uid');
    
    // Priority: URL parameter > localStorage
    const uid = uidFromUrl || this.getStoredUserGuid();

    if (uid) {
      this.userGuid = uid;
      this.validateUser(uid, !!uidFromUrl);
    } else {
      // Set default greeting for users without UID
      this.setGreetingMessage(false);
    }
    // If no UID, user can still play but won't have stats saved

    // Silently detect GPU/performance issues (but don't show modal yet)
    this.detectPerformanceIssues();

    // Debug: Add test function to window for manual testing
    if (typeof window !== 'undefined') {
      (window as any).testPerformanceWarning = () => {
        this.performanceIssue = {
          hasIssue: true,
          issueType: 'software-renderer',
          renderer: 'Test Renderer',
          vendor: 'Test Vendor',
          message: 'Test message',
          settingsUrl: 'chrome://settings/system'
        };
        this.showPerformanceWarning = true;
        this.cdr.markForCheck();
      };
    }
  }

  private async detectPerformanceIssues(): Promise<void> {
    try {
      const result = await this.gpuDetection.detectPerformanceIssues();
      
      if (result.hasIssue) {
        this.performanceIssue = result;
        // Don't show modal yet - wait until puzzle scene starts
      }
    } catch (error) {
      // Silently fail - don't show false positives
    }
  }

  private validateUser(uid: string, fromUrl: boolean = false): void {
    this.userService.getUserByGuid(uid).subscribe({
      next: (userData) => {
        this.userData = userData;
        this.userValidated = true;
        
        // Save GUID to localStorage on successful validation (if it came from URL)
        if (fromUrl) {
          this.saveUserGuidToStorage(uid);
          this.cleanUrlFromGuid();
        }
        
        // Set language based on user preference
        const userLang = userData.language === Language.English ? 'en' : 'de';
        
        // Check if user has manually selected a different language
        const savedLang = localStorage.getItem('preferredLanguage');
        const langToUse = savedLang || userLang;
        
        this.translate.use(langToUse);
        
        // Set greeting AFTER language is changed (will be called by onLangChange subscription)
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.userValidated = false;
        this.userData = undefined;
        
        // If validation fails and this was from localStorage, clear it
        if (!fromUrl && this.getStoredUserGuid() === uid) {
          this.clearStoredUserGuid();
        }
        
        // Silently fall back to generic greeting
        this.setGreetingMessage(false);
        this.cdr.markForCheck();
      }
    });
  }

  private getStoredUserGuid(): string | null {
    // Priority: localStorage > cookie (for cross-device sync support)
    try {
      const localValue = localStorage.getItem(this.STORAGE_KEY_USER_GUID);
      if (localValue) {
        return localValue;
      }
    } catch (error) {
      // Silently handle storage error
    }
    
    // Fallback to cookie (may be synced across devices by browser)
    try {
      const cookieValue = this.getCookie(this.COOKIE_KEY_USER_GUID);
      if (cookieValue) {
        // Also save to localStorage for faster future access
        this.saveToLocalStorage(cookieValue);
        return cookieValue;
      }
    } catch (error) {
      // Silently handle cookie error
    }
    
    return null;
  }

  private saveUserGuidToStorage(uid: string): void {
    this.saveToLocalStorage(uid);
    this.saveToCookie(uid);
  }

  private saveToLocalStorage(uid: string): void {
    try {
      localStorage.setItem(this.STORAGE_KEY_USER_GUID, uid);
    } catch (error) {
      // Silently handle storage error
    }
  }

  private saveToCookie(uid: string): void {
    try {
      const maxAge = this.COOKIE_MAX_AGE_DAYS * 24 * 60 * 60; // Convert days to seconds
      // Use SameSite=Lax to allow the cookie to be sent with top-level navigations
      // Secure flag is set if we're on HTTPS
      const secure = window.location.protocol === 'https:' ? '; Secure' : '';
      document.cookie = `${this.COOKIE_KEY_USER_GUID}=${encodeURIComponent(uid)}; max-age=${maxAge}; path=/; SameSite=Lax${secure}`;
    } catch (error) {
      // Silently handle cookie error
    }
  }

  private getCookie(name: string): string | null {
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [cookieName, cookieValue] = cookie.trim().split('=');
      if (cookieName === name) {
        return decodeURIComponent(cookieValue);
      }
    }
    return null;
  }

  private clearStoredUserGuid(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY_USER_GUID);
    } catch (error) {
      // Silently handle storage error
    }
    
    // Also clear the cookie
    try {
      document.cookie = `${this.COOKIE_KEY_USER_GUID}=; max-age=0; path=/`;
    } catch (error) {
      // Silently handle cookie error
    }
  }

  private cleanUrlFromGuid(): void {
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('uid');
      const cleanUrl = url.pathname + (url.search ? url.search : '') + (url.hash ? url.hash : '');
      window.history.replaceState({}, '', cleanUrl);
    } catch (error) {
      // Silently handle URL error
    }
  }

  private setGreetingMessage(userFound: boolean): void {
    if (userFound && this.userData) {
      const isFormal = this.userData.salutation === Salutation.Formal;
      this.salutationVariant = isFormal ? 'formal' : 'informal';
      this.cdr.markForCheck();
      const fullName = `${this.userData.firstName} ${this.userData.lastName}`;
      
      // Set name part (CompanySans)
      this.translate.get('greeting.namePart', { name: fullName }).subscribe(namePart => {
        this.greetingNamePart = namePart;
        this.cdr.markForCheck();
      });
      
      // Set message part (Lausanne)
      const messageKey = isFormal ? 'greeting.messageFormal' : 'greeting.messageInformal';
      this.translate.get(messageKey).subscribe(messagePart => {
        this.greetingMessagePart = messagePart;
        this.cdr.markForCheck();
      });
      
      // Keep full greeting for backwards compatibility
      const key = isFormal ? 'greeting.personalFormal' : 'greeting.personalInformal';
      this.translate.get(key, { name: fullName }).subscribe(translation => {
        this.greetingHeadline = translation;
        this.cdr.markForCheck();
      });
    } else {
      this.salutationVariant = 'informal';
      this.cdr.markForCheck();
      // Generic greeting - split by exclamation mark
      this.translate.get('greeting.namePart', { name: '' }).subscribe(namePart => {
        // For generic, use the generic message parts
        this.translate.get('greeting.generic').subscribe(fullGreeting => {
          // Split "Willkommen! Viel Spaß beim Puzzle!" 
          const parts = fullGreeting.split('!');
          if (parts.length >= 2) {
            this.greetingNamePart = parts[0] + '!'; // "Willkommen!"
            this.greetingMessagePart = parts.slice(1).join('!').trim(); // "Viel Spaß beim Puzzle!"
          } else {
            this.greetingNamePart = fullGreeting;
            this.greetingMessagePart = '';
          }
          
          this.greetingHeadline = fullGreeting;
          this.cdr.markForCheck();
        });
      });
    }
  }

  getUserDisplayName(): string {
    if (!this.userData) {
      return 'Puzzler';
    }
    return `${this.userData.firstName} ${this.userData.lastName}`;
  }

  getLanguageText(): string {
    if (!this.userData) {
      return '-';
    }
    const key = this.userData.language === Language.German ? 'language.german' : 'language.english';
    return this.translate.instant(key);
  }

  getSalutationPronoun(): string {
    return this.userData?.salutation === Salutation.Formal ? 'Sie' : 'du';
  }

  getSalutationVerb(): string {
    return this.userData?.salutation === Salutation.Formal ? 'sind' : 'bist';
  }

  private getSalutationKey(baseKey: string): string {
    return `${baseKey}.${this.salutationVariant}`;
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
    this.showGreetingModal = false;
    this.hideRestartButton = false;
    this.showThankYouModal = false;
    this.thankYouErrorMessage = undefined;
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
      },
      physics: {
        default: 'matter',
        matter: {
          gravity: {
            x: 0,
            y: 0
          },
          debug: false,
          enableSleeping: true,
          // Increased iterations to prevent fast-moving bodies from tunneling through each other
          positionIterations: 15,  // Default is 6, increased for high-velocity collision accuracy
          velocityIterations: 12,  // Default is 4, increased to handle fast drag movements
          constraintIterations: 6  // Default is 2, increased for more stable constraints
        }
      }
    });

    const emitter = new Phaser.Events.EventEmitter();
    this.sceneEvents = emitter;

    // ⚠️ TESTING MODE - Skip InitialScene and start PuzzleScene directly
    if (TESTING_VIDEO_MODE) {
      this.game.scene.add('InitialScene', InitialScene, false, {
        emitter
      });
      this.game.scene.add('PuzzleScene', PuzzleScene, true, {
        emitter
      });
    } else {
      this.game.scene.add('InitialScene', InitialScene, true, {
        emitter
      });
      this.game.scene.add('PuzzleScene', PuzzleScene, false);
    }

    const handleSceneStart = (scene: Phaser.Scene) => {
      if (!this.game) {
        return;
      }
      if (scene.scene.key === 'PuzzleScene') {
        if (!this.showUserInfo) {
          this.showUserInfo = true;
        }
        this.requestCoinTotal();
        this.cdr.markForCheck();
      }
    };
    this.game.events.on(Phaser.Scenes.Events.START, handleSceneStart);
    this.sceneStartHandler = handleSceneStart;

    emitter.on('puzzle-scene-active', () => {
      this.cdr.markForCheck();
    });

    emitter.on('puzzle-complete', (payload?: { elapsedSeconds?: number }) => {
      this.clearCompletionOverlayTimer();
      this.puzzleComplete = false;
      this.completionTime = payload?.elapsedSeconds;
      this.hideRestartButton = false;
      this.requestCoinTotal();
      
      // Note: Stats are now only updated when user clicks "Münzen senden"
      // This gives users control over when to submit their results
      
      // Exit immersive mode on mobile so completion overlay is visible
      const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 0;
      if (viewportWidth <= this.mobileBreakpoint) {
        this.exitImmersiveMode();
      }
      
      // In testing mode, don't show the completion overlay
      // The video will play when user clicks "Münzen senden"
      // After video, the thank you modal shows instead
      if (!TESTING_VIDEO_MODE) {
        this.completionOverlayTimer = setTimeout(() => {
          this.puzzleComplete = true;
          this.cdr.markForCheck();
        }, 1000);
      } else {
        // In testing mode, show the overlay immediately so user can click "Münzen senden"
        this.puzzleComplete = true;
      }
      this.cdr.markForCheck();
    });

    emitter.on('puzzle-reset', () => {
      this.clearCompletionOverlayTimer();
      this.puzzleComplete = false;
      this.completionTime = undefined;
      this.showInitialContinueButton = false;
      this.showGreetingModal = false;
      this.hideRestartButton = false;
      this.showThankYouModal = false;
      this.thankYouErrorMessage = undefined;
      this.resetSessionProgress();
      this.activeSessionId = undefined;
      this.sessionPuzzleVersion = undefined;
      this.sessionErrorMessage = undefined;
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

    emitter.on('video-playback-started', () => {
      // Hide completion overlay when video starts playing
      this.puzzleComplete = false;
      this.cdr.markForCheck();
    });

    emitter.on('completion-video-ended', () => {
      // Video has finished playing, now show the thank you modal
      this.openThankYouModal();
    });

    emitter.on('puzzle-piece-placed', (payload: PuzzlePiecePlacedPayload) => {
      this.handlePiecePlaced(payload);
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
    if (!this.sceneEvents) {
      return;
    }

    this.showInitialContinueButton = false;
    this.sceneEvents.emit('initial-go-on');

    // Show performance warning modal AFTER user continues to puzzle (if issue was detected)
    if (this.performanceIssue && !this.showPerformanceWarning) {
      setTimeout(() => {
        this.showPerformanceWarning = true;
        this.cdr.markForCheck();
      }, 2000); // 2 second delay after scene transition
    }
  }

  closeExplosionModal(): void {
    this.showExplosionModal = false;
    this.showInstructions = true;
    this.showUserInfo = true;

    if (this.userValidated && this.userGuid) {
      // Check for existing session - this will show modal if one exists
      // If no existing session, it will start the game and timer
      this.checkForExistingSessionOrStart();
    } else {
      this.resetSessionProgress();
      this.startGameTimer();
    }
    
    // Enter immersive mode on small devices when starting the puzzle
    const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 0;
    if (viewportWidth <= this.mobileBreakpoint) {
      this.enterImmersiveMode();
    }

    this.cdr.markForCheck();
  }

  private checkForExistingSessionOrStart(): void {
    if (this.sessionStartInFlight) {
      return;
    }

    this.sessionStartInFlight = true;
    this.userService.startGameSession(this.userGuid!).subscribe({
      next: (response: StartGameSessionResponse) => {
        this.sessionStartInFlight = false;

        if (response.success && response.sessionId) {
          // New session created - start the game
          this.activeSessionId = response.sessionId;
          this.sessionPuzzleVersion = response.puzzleVersion;
          this.sessionErrorMessage = undefined;
          this.sessionPiecesAcknowledged = 0;
          this.startGameTimer();
          this.flushPendingSnaps();
          this.cdr.markForCheck();
          return;
        }

        // User has an existing completed session - show modal WITHOUT starting timer
        if (response.existingCompletedSessionId) {
          this.unsavedSessionId = response.existingCompletedSessionId;
          this.unsavedSessionDuration = response.existingSessionDurationSeconds;
          this.showUnsavedSessionModal = true;
          // Timer will NOT be started - user must save or discard first
          this.cdr.markForCheck();
          return;
        }

        // Should never happen
        this.sessionErrorMessage = response.message ?? 'Spielsitzung konnte nicht gestartet werden.';
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.sessionStartInFlight = false;
        this.sessionErrorMessage = error?.message ?? 'Verbindungsfehler';
        this.cdr.markForCheck();
      }
    });
  }

  private startGameTimer(): void {
    // Start the timer in the puzzle scene
    if (this.game) {
      const scene = this.game.scene.getScene('PuzzleScene') as any;
      if (scene && typeof scene.startTimer === 'function') {
        scene.startTimer();
      }
    }
  }

  restartPuzzle(): void {
    this.clearCompletionOverlayTimer();
    this.hideRestartButton = false;
    this.puzzleComplete = false;
    this.hasCompletedPuzzle = false;
    this.showInitialContinueButton = false;
    this.showExplosionModal = false;
    this.showInstructions = false;
    this.showUserInfo = false;
    this.showThankYouModal = false;
    this.thankYouErrorMessage = undefined;
    this.sceneEvents?.emit('puzzle-reset');

    this.resetSessionProgress();
    this.sessionErrorMessage = undefined;
    this.activeSessionId = undefined;
    this.sessionPuzzleVersion = undefined;

    if (!this.game) {
      this.launchGame();
      this.cdr.markForCheck();
      return;
    }

    const sceneManager = this.game.scene;
    sceneManager.stop('PuzzleScene');
    sceneManager.stop('InitialScene');
    sceneManager.start('PuzzleScene', {
      emitter: this.sceneEvents
    });
    this.requestCoinTotal();
    this.cdr.markForCheck();
  }

  donateCoins(): void {
    this.hideRestartButton = true;
    this.hasCompletedPuzzle = true; // Hide header when starting video
    
    // Immediately hide the completion overlay
    this.puzzleComplete = false;
    this.cdr.markForCheck();

    if (!this.userValidated || !this.userGuid || !this.completionTime) {
      this.sessionErrorMessage = undefined;
      const message = this.translate.instant(this.getSalutationKey('completion.thankYouNotStored'));
      // Play video even without valid session (testing mode)
      this.playCompletionVideoThenShowModal(message);
      return;
    }

    if (!this.activeSessionId) {
      const message = this.translate.instant(this.getSalutationKey('completion.thankYouNoSession'));
      this.sessionErrorMessage = message;
      // Play video even without active session (testing mode)
      this.playCompletionVideoThenShowModal(message);
      return;
    }

    if (this.pendingSnapQueue.length > 0 || this.processingSnap) {
      this.flushPendingSnaps();
      const message = this.translate.instant(this.getSalutationKey('completion.thankYouSyncing'));
      this.sessionErrorMessage = message;
      // Play video even while syncing
      this.playCompletionVideoThenShowModal(message);
      return;
    }

    this.userService.completeGameSession(this.userGuid, this.activeSessionId).subscribe({
      next: (response: CompleteGameSessionResponse) => {
        if (response.userData) {
          this.userData = response.userData;
          this.salutationVariant = this.userData.salutation === Salutation.Formal ? 'formal' : 'informal';
        }

        this.sessionErrorMessage = undefined;
        this.resetSessionProgress();
        this.activeSessionId = undefined;
        this.sessionPuzzleVersion = undefined;

        // Play completion video in the game scene (success case)
        this.sceneEvents?.emit('play-completion-video');
      },
      error: (error) => {
        // Check if it's a session-not-found error (expired/removed/multi-tab)
        if (this.isSessionNotFoundError(error)) {
          this.handleSessionExpired();
          return;
        }
        
        const message = this.translate.instant(this.getSalutationKey('completion.thankYouError'));
        this.sessionErrorMessage = message;
        // Play video even on error
        this.playCompletionVideoThenShowModal(message);
      }
    });
  }

  private playCompletionVideoThenShowModal(errorMessage?: string): void {
    // Store the error message to show after video
    this.thankYouErrorMessage = errorMessage;
    
    // Play the video
    this.sceneEvents?.emit('play-completion-video');
  }

  private openThankYouModal(message?: string): void {
    this.thankYouErrorMessage = message;
    this.showThankYouModal = true;
    this.cdr.markForCheck();
  }

  closeThankYouModal(): void {
    this.showThankYouModal = false;
    this.puzzleComplete = false; // Hide the completion modal so user can see finished puzzle
    this.showInstructions = false; // Hide instructions - puzzle is complete
    this.showUserInfo = false; // Hide user info box
    this.thankYouErrorMessage = undefined;
    this.cdr.markForCheck();
  }

  startNextRound(): void {
    this.closeThankYouModal();
    this.restartPuzzle();
  }

  // Unsaved session modal methods
  saveUnsavedSession(): void {
    if (!this.userGuid || !this.unsavedSessionId) {
      return;
    }

    // Call complete endpoint for the existing session
    this.userService.completeGameSession(this.userGuid, this.unsavedSessionId).subscribe({
      next: (response: CompleteGameSessionResponse) => {
        if (response.userData) {
          this.userData = response.userData;
          this.salutationVariant = this.userData.salutation === Salutation.Formal ? 'formal' : 'informal';
        }

        // Close modal and now start the new session with timer
        this.closeUnsavedSessionModal();
        this.beginBackendSession();
        this.startGameTimer();
      },
      error: (error) => {
        // Show error but allow user to try again or discard
        this.sessionErrorMessage = error?.message ?? 'Fehler beim Speichern der Sitzung.';
        this.cdr.markForCheck();
      }
    });
  }

  discardUnsavedSession(): void {
    if (!this.userGuid || !this.unsavedSessionId) {
      return;
    }

    // Call discard endpoint
    this.userService.discardSession(this.userGuid, this.unsavedSessionId).subscribe({
      next: () => {
        // Close modal and now start the new session with timer
        this.closeUnsavedSessionModal();
        this.beginBackendSession();
        this.startGameTimer();
      },
      error: (error) => {
        // Show error but allow user to try again
        this.sessionErrorMessage = error?.message ?? 'Fehler beim Verwerfen der Sitzung.';
        this.cdr.markForCheck();
      }
    });
  }

  closeUnsavedSessionModal(): void {
    this.showUnsavedSessionModal = false;
    this.unsavedSessionId = undefined;
    this.unsavedSessionDuration = undefined;
    this.cdr.markForCheck();
  }

  formatDuration(seconds?: number): string {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  // Session expired modal methods
  private isSessionNotFoundError(error: any): boolean {
    // Check if it's a 404 AND the error message indicates session not found
    // This distinguishes session errors from user-not-found errors
    if (error?.status !== 404) {
      return false;
    }
    
    const errorMessage = error?.error?.error || error?.message || '';
    return errorMessage.toLowerCase().includes('session');
  }

  private handleSessionExpired(): void {
    // Clear any pending operations
    this.processingSnap = false;
    this.pendingSnapQueue = [];
    
    // Clear active session
    this.activeSessionId = undefined;
    this.sessionPuzzleVersion = undefined;
    this.sessionErrorMessage = undefined;
    
    // Show the expired modal
    this.showSessionExpiredModal = true;
    this.cdr.markForCheck();
  }

  startNewGameAfterExpired(): void {
    this.showSessionExpiredModal = false;
    this.cdr.markForCheck();
    
    // Restart the puzzle - this will create a new session
    this.restartPuzzle();
  }

  get showGreetingHeader(): boolean {
    return !this.showInstructions;
  }

  private handlePiecePlaced(payload: PuzzlePiecePlacedPayload): void {
    if (!payload || !payload.pieceId) {
      return;
    }

    if (!this.userValidated || !this.userGuid) {
      return;
    }

    if (!this.activeSessionId && !this.sessionStartInFlight) {
      this.beginBackendSession();
    }

    const request: RecordPieceSnapRequest = {
      pieceId: payload.pieceId,
      anchorX: payload.anchorX,
      anchorY: payload.anchorY,
      clientDistance: payload.distance,
      clientTolerance: payload.tolerance
    };

    this.pendingSnapQueue.push(request);
    this.flushPendingSnaps();
  }

  private beginBackendSession(): void {
    if (!this.userValidated || !this.userGuid) {
      return;
    }

    if (this.sessionStartInFlight) {
      return;
    }

    this.resetSessionProgress();
    this.activeSessionId = undefined;
    this.sessionPuzzleVersion = undefined;

    this.sessionStartInFlight = true;
    this.userService.startGameSession(this.userGuid).subscribe({
      next: (response: StartGameSessionResponse) => {
        this.sessionStartInFlight = false;

        if (response.success && response.sessionId) {
          this.activeSessionId = response.sessionId;
          this.sessionPuzzleVersion = response.puzzleVersion;
          this.sessionErrorMessage = undefined;
          this.sessionPiecesAcknowledged = 0;
          this.flushPendingSnaps();
          this.cdr.markForCheck();
          return;
        }

        // User has an existing completed session - show modal
        if (response.existingCompletedSessionId) {
          this.unsavedSessionId = response.existingCompletedSessionId;
          this.unsavedSessionDuration = response.existingSessionDurationSeconds;
          this.showUnsavedSessionModal = true;
          this.cdr.markForCheck();
          return;
        }

        // Should never happen
        this.sessionErrorMessage = response.message ?? 'Spielsitzung konnte nicht gestartet werden.';
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.sessionStartInFlight = false;
        this.sessionErrorMessage = error?.message ?? 'Fehler beim Starten der Spielsitzung.';
        this.cdr.markForCheck();
      }
    });
  }

  private resetSessionProgress(): void {
    this.pendingSnapQueue = [];
    this.processingSnap = false;
    this.sessionPiecesAcknowledged = 0;
  }

  private flushPendingSnaps(): void {
    if (!this.userGuid || !this.activeSessionId) {
      return;
    }

    if (this.processingSnap) {
      return;
    }

    const next = this.pendingSnapQueue.shift();
    if (!next) {
      return;
    }

    this.processingSnap = true;
    this.userService.recordPieceSnap(this.userGuid, this.activeSessionId, next).subscribe({
      next: (response) => {
        if (response && (response.status === 'Accepted' || response.status === 'Duplicate')) {
          this.sessionPiecesAcknowledged = response.placedPieces;
        }
        this.processingSnap = false;
        this.flushPendingSnaps();
        this.cdr.markForCheck();
      },
      error: (error) => {
        // Check if it's a session-not-found error (expired/removed/multi-tab)
        if (this.isSessionNotFoundError(error)) {
          this.handleSessionExpired();
          return;
        }
        
        this.sessionErrorMessage = error?.message ?? 'Fehler bei der Validierung des Puzzleteils.';
        this.processingSnap = false;
        this.flushPendingSnaps();
        this.cdr.markForCheck();
      }
    });
  }

  private requestCoinTotal(): void {
    this.sceneEvents?.emit('coin-total-request');
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

  closePerformanceWarning(): void {
    this.showPerformanceWarning = false;
    this.cdr.markForCheck();
  }

  dismissPerformanceWarning(): void {
    this.gpuDetection.dismissWarning();
    this.showPerformanceWarning = false;
    this.cdr.markForCheck();
  }

  getBrowserName(): string {
    return this.gpuDetection.getBrowserName();
  }

  getSettingsUrl(): string {
    return this.performanceIssue?.settingsUrl || 'chrome://settings/system';
  }

  getBrowserSpecificInstructions(): string[] {
    return this.gpuDetection.getBrowserInstructions();
  }

  usesBrowserSpecificInstructions(): boolean {
    return this.getBrowserSpecificInstructions().length > 0;
  }
}
