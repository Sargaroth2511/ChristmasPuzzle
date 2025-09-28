"use strict";
(self["webpackChunkchristmas_puzzle"] = self["webpackChunkchristmas_puzzle"] || []).push([["main"],{

/***/ 92:
/*!**********************************!*\
  !*** ./src/app/app.component.ts ***!
  \**********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   AppComponent: () => (/* binding */ AppComponent)
/* harmony export */ });
/* harmony import */ var _angular_common__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! @angular/common */ 4460);
/* harmony import */ var phaser__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! phaser */ 8140);
/* harmony import */ var phaser__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(phaser__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _game_puzzle_scene__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../game/puzzle.scene */ 8051);
/* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @angular/core */ 7580);




const _c0 = ["gameHost"];
class AppComponent {
  constructor(cdr) {
    this.cdr = cdr;
    this.title = 'Christmas Puzzle';
    this.puzzleComplete = false;
    this.showDebug = true;
  }
  ngAfterViewInit() {
    if (!this.gameHost) {
      return;
    }
    this.launchGame();
  }
  launchGame() {
    this.puzzleComplete = false;
    const host = this.gameHost.nativeElement;
    const width = 960;
    const height = 640;
    this.game = new (phaser__WEBPACK_IMPORTED_MODULE_0___default().Game)({
      type: (phaser__WEBPACK_IMPORTED_MODULE_0___default().AUTO),
      width,
      height,
      parent: host,
      backgroundColor: '#BEC6A8',
      banner: false,
      scale: {
        mode: (phaser__WEBPACK_IMPORTED_MODULE_0___default().Scale).FIT,
        autoCenter: (phaser__WEBPACK_IMPORTED_MODULE_0___default().Scale).CENTER_BOTH,
        width,
        height
      }
    });
    const emitter = new (phaser__WEBPACK_IMPORTED_MODULE_0___default().Events).EventEmitter();
    this.sceneEvents = emitter;
    this.game.scene.add('PuzzleScene', _game_puzzle_scene__WEBPACK_IMPORTED_MODULE_1__.PuzzleScene, true, {
      emitter,
      showDebug: this.showDebug
    });
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
  ngOnDestroy() {
    if (this.sceneEvents) {
      this.sceneEvents.removeAllListeners();
      this.sceneEvents = undefined;
    }
    if (this.game) {
      this.game.destroy(true);
      this.game = undefined;
    }
  }
  toggleDebug() {
    this.showDebug = !this.showDebug;
    if (!this.game) {
      return;
    }
    const scene = this.game.scene.getScene('PuzzleScene');
    scene?.setDebugVisible(this.showDebug);
  }
  static {
    this.ɵfac = function AppComponent_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || AppComponent)(_angular_core__WEBPACK_IMPORTED_MODULE_2__["ɵɵdirectiveInject"](_angular_core__WEBPACK_IMPORTED_MODULE_2__.ChangeDetectorRef));
    };
  }
  static {
    this.ɵcmp = /*@__PURE__*/_angular_core__WEBPACK_IMPORTED_MODULE_2__["ɵɵdefineComponent"]({
      type: AppComponent,
      selectors: [["app-root"]],
      viewQuery: function AppComponent_Query(rf, ctx) {
        if (rf & 1) {
          _angular_core__WEBPACK_IMPORTED_MODULE_2__["ɵɵviewQuery"](_c0, 7);
        }
        if (rf & 2) {
          let _t;
          _angular_core__WEBPACK_IMPORTED_MODULE_2__["ɵɵqueryRefresh"](_t = _angular_core__WEBPACK_IMPORTED_MODULE_2__["ɵɵloadQuery"]()) && (ctx.gameHost = _t.first);
        }
      },
      decls: 12,
      vars: 2,
      consts: [["gameHost", ""], [1, "shell"], [1, "hero"], [1, "board"], [1, "controls"], ["type", "button", 3, "click"], ["aria-label", "Puzzle board", 1, "game-host"]],
      template: function AppComponent_Template(rf, ctx) {
        if (rf & 1) {
          const _r1 = _angular_core__WEBPACK_IMPORTED_MODULE_2__["ɵɵgetCurrentView"]();
          _angular_core__WEBPACK_IMPORTED_MODULE_2__["ɵɵelementStart"](0, "main", 1)(1, "header", 2)(2, "h1");
          _angular_core__WEBPACK_IMPORTED_MODULE_2__["ɵɵtext"](3);
          _angular_core__WEBPACK_IMPORTED_MODULE_2__["ɵɵelementEnd"]();
          _angular_core__WEBPACK_IMPORTED_MODULE_2__["ɵɵelementStart"](4, "p");
          _angular_core__WEBPACK_IMPORTED_MODULE_2__["ɵɵtext"](5, "Drag the shards into place to restore the festive star.");
          _angular_core__WEBPACK_IMPORTED_MODULE_2__["ɵɵelementEnd"]()();
          _angular_core__WEBPACK_IMPORTED_MODULE_2__["ɵɵelementStart"](6, "section", 3)(7, "div", 4)(8, "button", 5);
          _angular_core__WEBPACK_IMPORTED_MODULE_2__["ɵɵlistener"]("click", function AppComponent_Template_button_click_8_listener() {
            _angular_core__WEBPACK_IMPORTED_MODULE_2__["ɵɵrestoreView"](_r1);
            return _angular_core__WEBPACK_IMPORTED_MODULE_2__["ɵɵresetView"](ctx.toggleDebug());
          });
          _angular_core__WEBPACK_IMPORTED_MODULE_2__["ɵɵtext"](9);
          _angular_core__WEBPACK_IMPORTED_MODULE_2__["ɵɵelementEnd"]()();
          _angular_core__WEBPACK_IMPORTED_MODULE_2__["ɵɵelement"](10, "div", 6, 0);
          _angular_core__WEBPACK_IMPORTED_MODULE_2__["ɵɵelementEnd"]()();
        }
        if (rf & 2) {
          _angular_core__WEBPACK_IMPORTED_MODULE_2__["ɵɵadvance"](3);
          _angular_core__WEBPACK_IMPORTED_MODULE_2__["ɵɵtextInterpolate"](ctx.title);
          _angular_core__WEBPACK_IMPORTED_MODULE_2__["ɵɵadvance"](6);
          _angular_core__WEBPACK_IMPORTED_MODULE_2__["ɵɵtextInterpolate1"](" ", ctx.showDebug ? "Hide" : "Show", " Guides ");
        }
      },
      dependencies: [_angular_common__WEBPACK_IMPORTED_MODULE_3__.CommonModule],
      styles: [".shell[_ngcontent-%COMP%] {\n  display: grid;\n  gap: 2rem;\n  padding: 2rem;\n  max-width: 1080px;\n  margin: 0 auto;\n}\n\n.hero[_ngcontent-%COMP%] {\n  text-align: center;\n}\n\n.hero[_ngcontent-%COMP%]   h1[_ngcontent-%COMP%] {\n  font-size: clamp(2.5rem, 4vw, 3.5rem);\n  margin-bottom: 0.25rem;\n}\n\n.hero[_ngcontent-%COMP%]   p[_ngcontent-%COMP%] {\n  margin: 0;\n  color: rgba(247, 252, 255, 0.75);\n}\n\n.board[_ngcontent-%COMP%] {\n  position: relative;\n  display: flex;\n  gap: 1.5rem;\n  justify-content: center;\n}\n\n.controls[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  gap: 0.75rem;\n  align-items: center;\n}\n\n.controls[_ngcontent-%COMP%]   button[_ngcontent-%COMP%] {\n  padding: 0.6rem 1.2rem;\n  border-radius: 999px;\n  border: none;\n  background: rgba(12, 27, 42, 0.8);\n  color: #f7fcff;\n  font-weight: 600;\n  letter-spacing: 0.05em;\n  cursor: pointer;\n  transition: background 0.2s ease;\n}\n\n.controls[_ngcontent-%COMP%]   button[_ngcontent-%COMP%]:hover {\n  background: rgba(12, 27, 42, 0.95);\n}\n\n.game-host[_ngcontent-%COMP%] {\n  width: min(100%, 960px);\n  aspect-ratio: 3/2;\n  border-radius: 18px;\n  background: rgba(12, 27, 42, 0.85);\n  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.45);\n  overflow: hidden;\n}\n\n.overlay[_ngcontent-%COMP%] {\n  position: absolute;\n  inset: 0;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  text-align: center;\n  padding: 1.5rem;\n  font-size: 1.4rem;\n  font-weight: 600;\n  letter-spacing: 0.08em;\n  background: rgba(12, 27, 42, 0.88);\n  color: #f7fcff;\n}\n\n.overlay.error[_ngcontent-%COMP%] {\n  background: rgba(110, 32, 32, 0.9);\n}\n\n.overlay.success[_ngcontent-%COMP%] {\n  background: rgba(30, 87, 52, 0.8);\n  color: #f1ffe2;\n}\n/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly8uL3NyYy9hcHAvYXBwLmNvbXBvbmVudC5zY3NzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0VBQ0UsYUFBQTtFQUNBLFNBQUE7RUFDQSxhQUFBO0VBQ0EsaUJBQUE7RUFDQSxjQUFBO0FBQ0Y7O0FBRUE7RUFDRSxrQkFBQTtBQUNGOztBQUVBO0VBQ0UscUNBQUE7RUFDQSxzQkFBQTtBQUNGOztBQUVBO0VBQ0UsU0FBQTtFQUNBLGdDQUFBO0FBQ0Y7O0FBRUE7RUFDRSxrQkFBQTtFQUNBLGFBQUE7RUFDQSxXQUFBO0VBQ0EsdUJBQUE7QUFDRjs7QUFFQTtFQUNFLGFBQUE7RUFDQSxzQkFBQTtFQUNBLFlBQUE7RUFDQSxtQkFBQTtBQUNGOztBQUVBO0VBQ0Usc0JBQUE7RUFDQSxvQkFBQTtFQUNBLFlBQUE7RUFDQSxpQ0FBQTtFQUNBLGNBQUE7RUFDQSxnQkFBQTtFQUNBLHNCQUFBO0VBQ0EsZUFBQTtFQUNBLGdDQUFBO0FBQ0Y7O0FBRUE7RUFDRSxrQ0FBQTtBQUNGOztBQUVBO0VBQ0UsdUJBQUE7RUFDQSxpQkFBQTtFQUNBLG1CQUFBO0VBQ0Esa0NBQUE7RUFDQSwyQ0FBQTtFQUNBLGdCQUFBO0FBQ0Y7O0FBRUE7RUFDRSxrQkFBQTtFQUNBLFFBQUE7RUFDQSxhQUFBO0VBQ0EsbUJBQUE7RUFDQSx1QkFBQTtFQUNBLGtCQUFBO0VBQ0EsZUFBQTtFQUNBLGlCQUFBO0VBQ0EsZ0JBQUE7RUFDQSxzQkFBQTtFQUNBLGtDQUFBO0VBQ0EsY0FBQTtBQUNGOztBQUVBO0VBQ0Usa0NBQUE7QUFDRjs7QUFFQTtFQUNFLGlDQUFBO0VBQ0EsY0FBQTtBQUNGIiwic291cmNlc0NvbnRlbnQiOlsiLnNoZWxsIHtcbiAgZGlzcGxheTogZ3JpZDtcbiAgZ2FwOiAycmVtO1xuICBwYWRkaW5nOiAycmVtO1xuICBtYXgtd2lkdGg6IDEwODBweDtcbiAgbWFyZ2luOiAwIGF1dG87XG59XG5cbi5oZXJvIHtcbiAgdGV4dC1hbGlnbjogY2VudGVyO1xufVxuXG4uaGVybyBoMSB7XG4gIGZvbnQtc2l6ZTogY2xhbXAoMi41cmVtLCA0dncsIDMuNXJlbSk7XG4gIG1hcmdpbi1ib3R0b206IDAuMjVyZW07XG59XG5cbi5oZXJvIHAge1xuICBtYXJnaW46IDA7XG4gIGNvbG9yOiByZ2JhKDI0NywgMjUyLCAyNTUsIDAuNzUpO1xufVxuXG4uYm9hcmQge1xuICBwb3NpdGlvbjogcmVsYXRpdmU7XG4gIGRpc3BsYXk6IGZsZXg7XG4gIGdhcDogMS41cmVtO1xuICBqdXN0aWZ5LWNvbnRlbnQ6IGNlbnRlcjtcbn1cblxuLmNvbnRyb2xzIHtcbiAgZGlzcGxheTogZmxleDtcbiAgZmxleC1kaXJlY3Rpb246IGNvbHVtbjtcbiAgZ2FwOiAwLjc1cmVtO1xuICBhbGlnbi1pdGVtczogY2VudGVyO1xufVxuXG4uY29udHJvbHMgYnV0dG9uIHtcbiAgcGFkZGluZzogMC42cmVtIDEuMnJlbTtcbiAgYm9yZGVyLXJhZGl1czogOTk5cHg7XG4gIGJvcmRlcjogbm9uZTtcbiAgYmFja2dyb3VuZDogcmdiYSgxMiwgMjcsIDQyLCAwLjgpO1xuICBjb2xvcjogI2Y3ZmNmZjtcbiAgZm9udC13ZWlnaHQ6IDYwMDtcbiAgbGV0dGVyLXNwYWNpbmc6IDAuMDVlbTtcbiAgY3Vyc29yOiBwb2ludGVyO1xuICB0cmFuc2l0aW9uOiBiYWNrZ3JvdW5kIDAuMnMgZWFzZTtcbn1cblxuLmNvbnRyb2xzIGJ1dHRvbjpob3ZlciB7XG4gIGJhY2tncm91bmQ6IHJnYmEoMTIsIDI3LCA0MiwgMC45NSk7XG59XG5cbi5nYW1lLWhvc3Qge1xuICB3aWR0aDogbWluKDEwMCUsIDk2MHB4KTtcbiAgYXNwZWN0LXJhdGlvOiAzIC8gMjtcbiAgYm9yZGVyLXJhZGl1czogMThweDtcbiAgYmFja2dyb3VuZDogcmdiYSgxMiwgMjcsIDQyLCAwLjg1KTtcbiAgYm94LXNoYWRvdzogMCAyNHB4IDQ4cHggcmdiYSgwLCAwLCAwLCAwLjQ1KTtcbiAgb3ZlcmZsb3c6IGhpZGRlbjtcbn1cblxuLm92ZXJsYXkge1xuICBwb3NpdGlvbjogYWJzb2x1dGU7XG4gIGluc2V0OiAwO1xuICBkaXNwbGF5OiBmbGV4O1xuICBhbGlnbi1pdGVtczogY2VudGVyO1xuICBqdXN0aWZ5LWNvbnRlbnQ6IGNlbnRlcjtcbiAgdGV4dC1hbGlnbjogY2VudGVyO1xuICBwYWRkaW5nOiAxLjVyZW07XG4gIGZvbnQtc2l6ZTogMS40cmVtO1xuICBmb250LXdlaWdodDogNjAwO1xuICBsZXR0ZXItc3BhY2luZzogMC4wOGVtO1xuICBiYWNrZ3JvdW5kOiByZ2JhKDEyLCAyNywgNDIsIDAuODgpO1xuICBjb2xvcjogI2Y3ZmNmZjtcbn1cblxuLm92ZXJsYXkuZXJyb3Ige1xuICBiYWNrZ3JvdW5kOiByZ2JhKDExMCwgMzIsIDMyLCAwLjkpO1xufVxuXG4ub3ZlcmxheS5zdWNjZXNzIHtcbiAgYmFja2dyb3VuZDogcmdiYSgzMCwgODcsIDUyLCAwLjgpO1xuICBjb2xvcjogI2YxZmZlMjtcbn1cbiJdLCJzb3VyY2VSb290IjoiIn0= */"],
      changeDetection: 0
    });
  }
}

/***/ }),

/***/ 4429:
/*!*********************!*\
  !*** ./src/main.ts ***!
  \*********************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _angular_platform_browser__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @angular/platform-browser */ 9736);
/* harmony import */ var _angular_platform_browser_animations__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @angular/platform-browser/animations */ 3835);
/* harmony import */ var _angular_router__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! @angular/router */ 8431);
/* harmony import */ var _angular_common_http__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! @angular/common/http */ 9648);
/* harmony import */ var _app_app_component__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./app/app.component */ 92);





(0,_angular_platform_browser__WEBPACK_IMPORTED_MODULE_1__.bootstrapApplication)(_app_app_component__WEBPACK_IMPORTED_MODULE_0__.AppComponent, {
  providers: [(0,_angular_platform_browser_animations__WEBPACK_IMPORTED_MODULE_2__.provideAnimations)(), (0,_angular_router__WEBPACK_IMPORTED_MODULE_3__.provideRouter)([]), (0,_angular_common_http__WEBPACK_IMPORTED_MODULE_4__.provideHttpClient)()]
}).catch(err => console.error(err));

/***/ }),

/***/ 8051:
/*!**********************************!*\
  !*** ./src/game/puzzle.scene.ts ***!
  \**********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   PuzzleScene: () => (/* binding */ PuzzleScene)
/* harmony export */ });
/* harmony import */ var phaser__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! phaser */ 8140);
/* harmony import */ var phaser__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(phaser__WEBPACK_IMPORTED_MODULE_0__);

const FROST_BASE_COLOR = 0xffffff;
const SNAP_ANIMATION_DURATION = 180;
const SNAP_BASE_FACTOR = 0.09;
const SNAP_DEBUG_MULTIPLIER = 2.6;
const INTRO_HOLD_DURATION = 1200;
const EXPLOSION_STAGGER = 60;
const EXPLOSION_GRAVITY = 2200;
const EXPLOSION_TRAVEL_TIME = {
  min: 0.72,
  max: 0.95
};
const EXPLOSION_RADIAL_BOOST = {
  min: 260,
  max: 420
};
const EXPLOSION_SPIN_RANGE = {
  min: -2.4,
  max: 2.4
};
const EXPLOSION_BOUNCE_DAMPING = 0.36;
const EXPLOSION_GROUND_FRICTION = 0.82;
const EXPLOSION_SPIN_DAMPING = 0.7;
const EXPLOSION_MIN_REST_SPEED = 40;
const EXPLOSION_REST_DELAY = 220;
const EXPLOSION_WALL_MARGIN = 64;
const EXPLOSION_WALL_DAMPING = 0.42;
const calculateSnapTolerance = (shape, multiplier = 1) => {
  const bounds = shape.getBounds();
  const maxAxis = Math.max(bounds.width, bounds.height) || 0;
  const dynamicTolerance = maxAxis * SNAP_BASE_FACTOR * multiplier;
  return phaser__WEBPACK_IMPORTED_MODULE_0___default().Math.Clamp(dynamicTolerance, 18, 120);
};
class PuzzleScene extends (phaser__WEBPACK_IMPORTED_MODULE_0___default().Scene) {
  resetDragState(piece) {
    piece.isDragging = false;
    piece.dragOffset = undefined;
    piece.dragPointer = undefined;
    piece.dragStartRotation = undefined;
  }
  updateScatterTargetFromShape(piece) {
    piece.scatterTarget = new (phaser__WEBPACK_IMPORTED_MODULE_0___default().Math).Vector2(piece.shape.x - piece.origin.x, piece.shape.y - piece.origin.y);
  }
  stylePieceForBurst(piece, depth) {
    piece.shape.disableInteractive();
    piece.shape.setDepth(120 + depth);
    piece.shape.setFillStyle(FROST_BASE_COLOR, 0);
    piece.shape.setStrokeStyle(2.6, 0x000000, 0.85);
    piece.shape.setAlpha(1);
    piece.shape.setScale(1);
    piece.shape.rotation = 0;
    piece.snapTolerance = 0;
    piece.velocity = undefined;
    piece.angularVelocity = undefined;
    piece.exploding = false;
    piece.hasLaunched = false;
    piece.restPosition = undefined;
    piece.restRotation = undefined;
    this.resetDragState(piece);
  }
  stylePieceForPuzzle(piece, depth) {
    piece.shape.setDepth(30 + depth);
    piece.shape.setFillStyle(FROST_BASE_COLOR, 0);
    piece.shape.setStrokeStyle(2.5, 0x000000, 0.9);
    piece.shape.setAlpha(1);
    piece.shape.setInteractive(new (phaser__WEBPACK_IMPORTED_MODULE_0___default().Geom).Polygon(piece.hitArea), (phaser__WEBPACK_IMPORTED_MODULE_0___default().Geom).Polygon.Contains);
    if (piece.shape.input) {
      piece.shape.input.cursor = 'grab';
    }
    piece.placed = false;
    piece.exploding = false;
    piece.hasLaunched = false;
    piece.velocity = undefined;
    piece.angularVelocity = undefined;
    this.resetDragState(piece);
  }
  recordRestingState(piece) {
    piece.restPosition = new (phaser__WEBPACK_IMPORTED_MODULE_0___default().Math).Vector2(piece.shape.x, piece.shape.y);
    piece.restRotation = piece.shape.rotation;
    this.updateScatterTargetFromShape(piece);
  }
  constructor() {
    super('PuzzleScene');
    this.pieces = [];
    this.placedCount = 0;
    this.startTime = 0;
    this.debugEnabled = true;
    this.explosionActive = false;
    this.explosionComplete = false;
  }
  preload() {
    this.load.text('puzzle-svg', 'assets/pieces/Zeichnung.svg');
  }
  init(data) {
    this.emitter = data?.emitter;
    this.debugEnabled = data.showDebug ?? true;
  }
  create() {
    const svgText = this.cache.text.get('puzzle-svg');
    if (!svgText) {
      throw new Error('Puzzle SVG data missing.');
    }
    this.config = this.createConfigFromSvg(svgText);
    this.pieces = [];
    this.placedCount = 0;
    this.cameras.main.setBackgroundColor('#BEC6A8');
    this.drawGuide();
    this.setupDragHandlers();
    this.initializePiecesAtTarget();
    this.helpLabel = this.add.text(this.scale.width * 0.5, this.scale.height - 28, 'Snap pieces inside the glowing outline', {
      color: '#b7c7ff',
      fontSize: '20px',
      fontFamily: 'Segoe UI, Roboto, sans-serif'
    }).setOrigin(0.5, 0.5).setVisible(false);
    this.time.delayedCall(INTRO_HOLD_DURATION, () => this.beginIntroExplosion());
  }
  drawGuide() {
    const outlinePoints = this.config.outline.map(point => this.toCanvasPoint(point));
    this.guideOverlay?.destroy();
    const guide = this.add.graphics();
    guide.fillStyle(0xffffff, 0.08);
    guide.lineStyle(2, 0xffffff, 0.35);
    guide.beginPath();
    guide.moveTo(outlinePoints[0].x, outlinePoints[0].y);
    for (let i = 1; i < outlinePoints.length; i++) {
      guide.lineTo(outlinePoints[i].x, outlinePoints[i].y);
    }
    guide.closePath();
    guide.fillPath();
    guide.strokePath();
    guide.setDepth(-20);
    guide.setVisible(true);
    guide.name = 'guide-overlay';
    this.guideOverlay = guide;
  }
  initializePiecesAtTarget() {
    const config = this.config;
    config.pieces.forEach(piece => {
      const actualPoints = piece.points.map(pt => this.toCanvasPoint(pt));
      const anchor = this.toCanvasPoint(piece.anchor);
      const geometry = this.buildPieceGeometry(actualPoints, anchor);
      const shape = this.add.polygon(anchor.x, anchor.y, geometry.coords, 0x000000, 0);
      shape.setDepth(10 + this.pieces.length);
      shape.setFillStyle(FROST_BASE_COLOR, 1);
      shape.setAlpha(1);
      shape.setStrokeStyle(1.6, 0x142031, 0.6);
      const index = this.pieces.length;
      shape.setData('pieceIndex', index);
      shape.on('pointerover', () => {
        if (!shape.input?.enabled) {
          return;
        }
        shape.setStrokeStyle(3.5, 0x000000, 0.9);
      });
      shape.on('pointerout', () => {
        if (!shape.input?.enabled) {
          return;
        }
        shape.setStrokeStyle(2.5, 0x000000, 0.9);
      });
      const origin = new (phaser__WEBPACK_IMPORTED_MODULE_0___default().Math).Vector2(shape.displayOriginX, shape.displayOriginY);
      shape.setPosition(anchor.x + origin.x, anchor.y + origin.y);
      this.pieces.push({
        id: piece.id,
        target: geometry.target,
        shape,
        footprint: actualPoints,
        shapePoints: piece.points,
        placed: false,
        snapTolerance: 0,
        origin,
        hitArea: geometry.hitArea,
        scatterTarget: anchor.clone(),
        restPosition: new (phaser__WEBPACK_IMPORTED_MODULE_0___default().Math).Vector2(anchor.x + origin.x, anchor.y + origin.y),
        restRotation: 0
      });
    });
  }
  beginIntroExplosion() {
    if (this.pieces.length === 0) {
      this.preparePiecesForPuzzle();
      return;
    }
    const scatterPositions = [];
    this.explosionActive = true;
    this.explosionComplete = false;
    this.pieces.forEach((piece, index) => {
      const scatterAnchor = this.generateGroundScatterPosition(scatterPositions);
      scatterPositions.push(scatterAnchor);
      piece.scatterTarget = scatterAnchor;
      this.stylePieceForBurst(piece, index);
      const launchDelay = index * EXPLOSION_STAGGER;
      this.time.delayedCall(launchDelay, () => this.launchPieceExplosion(piece));
    });
  }
  launchPieceExplosion(piece) {
    const start = new (phaser__WEBPACK_IMPORTED_MODULE_0___default().Math).Vector2(piece.target.x + piece.origin.x, piece.target.y + piece.origin.y);
    piece.shape.setPosition(start.x, start.y);
    piece.shape.setScale(phaser__WEBPACK_IMPORTED_MODULE_0___default().Math.FloatBetween(0.96, 1.04));
    piece.shape.rotation = phaser__WEBPACK_IMPORTED_MODULE_0___default().Math.FloatBetween(-0.12, 0.12);
    const travelTime = phaser__WEBPACK_IMPORTED_MODULE_0___default().Math.FloatBetween(EXPLOSION_TRAVEL_TIME.min, EXPLOSION_TRAVEL_TIME.max);
    const floorWorld = piece.scatterTarget.y + piece.origin.y;
    const dx = piece.scatterTarget.x - piece.target.x;
    const dy = floorWorld - start.y;
    const baseVx = dx / travelTime;
    const baseVy = (dy - 0.5 * EXPLOSION_GRAVITY * travelTime * travelTime) / travelTime;
    const horizontalBias = Math.sign(dx || phaser__WEBPACK_IMPORTED_MODULE_0___default().Math.FloatBetween(-1, 1));
    const spreadAngle = phaser__WEBPACK_IMPORTED_MODULE_0___default().Math.FloatBetween(-Math.PI * 0.25, Math.PI * 0.25);
    const burstAngle = spreadAngle + horizontalBias * Math.PI * 0.5;
    const burstMagnitude = phaser__WEBPACK_IMPORTED_MODULE_0___default().Math.Between(EXPLOSION_RADIAL_BOOST.min, EXPLOSION_RADIAL_BOOST.max);
    const burst = new (phaser__WEBPACK_IMPORTED_MODULE_0___default().Math).Vector2(Math.cos(burstAngle), Math.sin(burstAngle)).scale(burstMagnitude);
    const downwardLift = phaser__WEBPACK_IMPORTED_MODULE_0___default().Math.Between(120, 220);
    const velocity = new (phaser__WEBPACK_IMPORTED_MODULE_0___default().Math).Vector2(baseVx + burst.x, baseVy - downwardLift + burst.y * 0.15);
    piece.velocity = velocity;
    piece.angularVelocity = phaser__WEBPACK_IMPORTED_MODULE_0___default().Math.FloatBetween(EXPLOSION_SPIN_RANGE.min, EXPLOSION_SPIN_RANGE.max);
    piece.exploding = true;
    piece.hasLaunched = true;
  }
  generateGroundScatterPosition(existing) {
    const minX = EXPLOSION_WALL_MARGIN + 12;
    const maxX = this.scale.width - EXPLOSION_WALL_MARGIN - 12;
    const minY = Math.max(this.scale.height - 140, 120);
    const maxY = this.scale.height - 54;
    const pickCandidate = () => new (phaser__WEBPACK_IMPORTED_MODULE_0___default().Math).Vector2(phaser__WEBPACK_IMPORTED_MODULE_0___default().Math.Between(minX, maxX), phaser__WEBPACK_IMPORTED_MODULE_0___default().Math.Between(minY, maxY));
    for (let attempt = 0; attempt < 12; attempt++) {
      const candidate = pickCandidate();
      const tooClose = existing.some(pos => phaser__WEBPACK_IMPORTED_MODULE_0___default().Math.Distance.Between(pos.x, pos.y, candidate.x, candidate.y) < 72);
      if (!tooClose) {
        return candidate;
      }
      if (attempt === 11) {
        return candidate;
      }
    }
    return pickCandidate();
  }
  preparePiecesForPuzzle() {
    this.guideOverlay?.setVisible(true);
    this.helpLabel?.setVisible(true);
    this.pieces.forEach((piece, index) => {
      const restPosition = piece.restPosition ?? new (phaser__WEBPACK_IMPORTED_MODULE_0___default().Math).Vector2(piece.shape.x, piece.shape.y);
      const clampedX = phaser__WEBPACK_IMPORTED_MODULE_0___default().Math.Clamp(restPosition.x, EXPLOSION_WALL_MARGIN, this.scale.width - EXPLOSION_WALL_MARGIN);
      const clampedY = phaser__WEBPACK_IMPORTED_MODULE_0___default().Math.Clamp(restPosition.y, 96, this.scale.height - 40);
      piece.shape.setPosition(clampedX, clampedY);
      const startRotation = piece.restRotation ?? 0;
      piece.shape.rotation = startRotation;
      piece.shape.setScale(1);
      this.recordRestingState(piece);
      piece.shape.setData('pieceIndex', index);
      this.stylePieceForPuzzle(piece, index);
      this.input.setDraggable(piece.shape);
    });
    this.placedCount = 0;
    this.startTime = this.time.now;
    this.refreshSnapToleranceForAll();
    this.emitter?.emit('puzzle-reset');
    this.explosionComplete = true;
    this.explosionActive = false;
  }
  refreshSnapToleranceForAll() {
    const multiplier = this.debugEnabled ? SNAP_DEBUG_MULTIPLIER : 1;
    this.pieces.forEach(piece => {
      if (piece.placed) {
        return;
      }
      piece.snapTolerance = calculateSnapTolerance(piece.shape, multiplier);
    });
  }
  update(_time, delta) {
    if (this.explosionActive && !this.explosionComplete) {
      this.updateExplosion(delta);
    }
  }
  updateExplosion(delta) {
    const dt = delta / 1000;
    if (dt <= 0) {
      return;
    }
    let settledCount = 0;
    let launchedCount = 0;
    this.pieces.forEach(piece => {
      if (!piece.hasLaunched) {
        return;
      }
      launchedCount += 1;
      if (!piece.exploding || !piece.velocity) {
        settledCount += 1;
        return;
      }
      const velocity = piece.velocity;
      velocity.y += EXPLOSION_GRAVITY * dt;
      piece.shape.x += velocity.x * dt;
      piece.shape.y += velocity.y * dt;
      if (piece.angularVelocity) {
        piece.shape.rotation += piece.angularVelocity * dt;
      }
      const bounds = piece.shape.getBounds();
      const leftLimit = EXPLOSION_WALL_MARGIN;
      const rightLimit = this.scale.width - EXPLOSION_WALL_MARGIN;
      const floorLimit = Math.min(this.scale.height - 40, piece.scatterTarget.y + piece.origin.y);
      if (bounds.left < leftLimit) {
        const overlap = leftLimit - bounds.left;
        piece.shape.x += overlap;
        if (velocity.x < 0) {
          velocity.x = -velocity.x * EXPLOSION_WALL_DAMPING;
        }
      }
      if (bounds.right > rightLimit) {
        const overlap = bounds.right - rightLimit;
        piece.shape.x -= overlap;
        if (velocity.x > 0) {
          velocity.x = -velocity.x * EXPLOSION_WALL_DAMPING;
        }
      }
      const adjustedBounds = piece.shape.getBounds();
      if (adjustedBounds.bottom > floorLimit) {
        const overlap = adjustedBounds.bottom - floorLimit;
        piece.shape.y -= overlap;
        if (velocity.y > 0) {
          velocity.y = -velocity.y * EXPLOSION_BOUNCE_DAMPING;
          velocity.x *= EXPLOSION_GROUND_FRICTION;
          if (piece.angularVelocity) {
            piece.angularVelocity *= EXPLOSION_SPIN_DAMPING;
          }
          if (Math.abs(velocity.y) < EXPLOSION_MIN_REST_SPEED) {
            piece.exploding = false;
            piece.velocity = undefined;
            piece.angularVelocity = undefined;
            this.recordRestingState(piece);
            settledCount += 1;
            return;
          }
        }
      }
      const currentBounds = piece.shape.getBounds();
      const speed = Math.hypot(velocity.x, velocity.y);
      if (speed < EXPLOSION_MIN_REST_SPEED && currentBounds.bottom >= floorLimit - 0.5) {
        piece.exploding = false;
        piece.velocity = undefined;
        piece.angularVelocity = undefined;
        const correction = currentBounds.bottom - floorLimit;
        if (correction > 0) {
          piece.shape.y -= correction;
        }
        this.recordRestingState(piece);
        settledCount += 1;
      }
    });
    if (launchedCount > 0 && settledCount === launchedCount) {
      this.explosionComplete = true;
      this.explosionActive = false;
      this.time.delayedCall(EXPLOSION_REST_DELAY, () => this.preparePiecesForPuzzle());
    }
  }
  updateDraggingPieceTransform(piece, pointer) {
    if (!piece.dragOffset) {
      return;
    }
    let pointerPosition;
    if (pointer) {
      if ('worldX' in pointer) {
        pointerPosition = piece.dragPointer ?? new (phaser__WEBPACK_IMPORTED_MODULE_0___default().Math).Vector2();
        pointerPosition.set(pointer.worldX ?? pointer.x, pointer.worldY ?? pointer.y);
      } else {
        pointerPosition = piece.dragPointer ?? new (phaser__WEBPACK_IMPORTED_MODULE_0___default().Math).Vector2();
        pointerPosition.set(pointer.x, pointer.y);
      }
      piece.dragPointer = pointerPosition;
    } else if (piece.dragPointer) {
      pointerPosition = piece.dragPointer;
    }
    if (!pointerPosition) {
      return;
    }
    const startRotation = piece.dragStartRotation ?? 0;
    const delta = piece.shape.rotation - startRotation;
    const rotatedOffset = piece.dragOffset.clone().rotate(delta);
    piece.shape.setPosition(pointerPosition.x + rotatedOffset.x, pointerPosition.y + rotatedOffset.y);
  }
  setupDragHandlers() {
    this.input.on('dragstart', (pointer, gameObject) => {
      const index = gameObject.getData('pieceIndex');
      if (index == null) {
        return;
      }
      const piece = this.pieces[index];
      if (!piece || piece.placed) {
        return;
      }
      piece.isDragging = true;
      const pointerWorldX = pointer.worldX ?? pointer.x;
      const pointerWorldY = pointer.worldY ?? pointer.y;
      piece.dragStartRotation = piece.shape.rotation;
      piece.dragOffset = new (phaser__WEBPACK_IMPORTED_MODULE_0___default().Math).Vector2(piece.shape.x - pointerWorldX, piece.shape.y - pointerWorldY);
      piece.dragPointer = new (phaser__WEBPACK_IMPORTED_MODULE_0___default().Math).Vector2(pointerWorldX, pointerWorldY);
      this.updateDraggingPieceTransform(piece, pointer);
      const rotationTweenDuration = Math.max(260, Math.abs(piece.shape.rotation) * 380);
      const rotationTween = Math.abs(piece.shape.rotation) > 0.001 ? this.tweens.add({
        targets: piece.shape,
        rotation: 0,
        duration: rotationTweenDuration,
        ease: (phaser__WEBPACK_IMPORTED_MODULE_0___default().Math).Easing.Cubic.Out
      }) : null;
      piece.restRotation = 0;
      if (rotationTween) {
        rotationTween.setCallback('onUpdate', () => {
          if (!piece.isDragging) {
            return;
          }
          this.updateDraggingPieceTransform(piece);
        });
      } else {
        piece.shape.rotation = 0;
        this.updateDraggingPieceTransform(piece, pointer);
      }
      piece.shape.setDepth(50 + index);
      piece.shape.input.cursor = 'grabbing';
      if (this.debugEnabled) {
        this.showDebugOutline(piece);
      }
    });
    this.input.on('drag', (pointer, gameObject, dragX, dragY) => {
      const index = gameObject.getData('pieceIndex');
      if (index == null) {
        return;
      }
      const piece = this.pieces[index];
      if (!piece || piece.placed) {
        return;
      }
      if (!piece.dragOffset) {
        piece.shape.setPosition(dragX, dragY);
        return;
      }
      this.updateDraggingPieceTransform(piece, pointer);
    });
    this.input.on('dragend', (_pointer, gameObject) => {
      const index = gameObject.getData('pieceIndex');
      if (index == null) {
        return;
      }
      const piece = this.pieces[index];
      if (!piece || piece.placed) {
        return;
      }
      piece.isDragging = false;
      piece.dragOffset = undefined;
      piece.dragPointer = undefined;
      piece.dragStartRotation = undefined;
      const snapped = this.trySnapPiece(piece);
      if (!snapped) {
        piece.shape.input.cursor = 'grab';
        piece.shape.setDepth(30 + index);
      }
      if (this.debugEnabled) {
        this.hideDebugOutline();
      }
    });
    this.input.on('pointerup', () => this.debugEnabled && this.hideDebugOutline());
    this.input.on('pointerupoutside', () => this.debugEnabled && this.hideDebugOutline());
  }
  trySnapPiece(piece) {
    const anchorX = piece.shape.x - piece.origin.x;
    const anchorY = piece.shape.y - piece.origin.y;
    const distance = phaser__WEBPACK_IMPORTED_MODULE_0___default().Math.Distance.Between(anchorX, anchorY, piece.target.x, piece.target.y);
    if (distance > piece.snapTolerance) {
      return false;
    }
    this.placePiece(piece);
    return true;
  }
  placePiece(piece) {
    if (piece.placed) {
      return;
    }
    piece.isDragging = false;
    piece.dragOffset = undefined;
    piece.dragPointer = undefined;
    piece.dragStartRotation = undefined;
    piece.placed = true;
    piece.shape.disableInteractive();
    piece.shape.setDepth(100 + this.placedCount);
    const targetPosition = new (phaser__WEBPACK_IMPORTED_MODULE_0___default().Math).Vector2(piece.target.x + piece.origin.x, piece.target.y + piece.origin.y);
    const tween = this.tweens.add({
      targets: piece.shape,
      x: targetPosition.x,
      y: targetPosition.y,
      duration: SNAP_ANIMATION_DURATION,
      ease: (phaser__WEBPACK_IMPORTED_MODULE_0___default().Math).Easing.Cubic.Out
    });
    if (!tween) {
      piece.shape.setPosition(targetPosition.x, targetPosition.y);
    }
    piece.shape.setStrokeStyle(1.4, 0x1d2f52, 0.7);
    piece.shape.setFillStyle(FROST_BASE_COLOR, 0.18);
    this.placedCount += 1;
    this.emitter?.emit('puzzle-piece-placed', {
      pieceId: piece.id,
      placedCount: this.placedCount,
      totalPieces: this.pieces.length
    });
    if (this.placedCount === this.pieces.length) {
      const elapsedSeconds = (this.time.now - this.startTime) / 1000;
      this.showCompletionBanner(elapsedSeconds);
      this.emitter?.emit('puzzle-complete');
    }
  }
  showCompletionBanner(totalSeconds) {
    const banner = this.add.rectangle(this.scale.width * 0.5, 72, 480, 96, 0x183d2f, 0.82);
    banner.setStrokeStyle(2, 0x8ddfcb, 0.9);
    const message = this.add.text(this.scale.width * 0.5, 72, `Star restored in ${totalSeconds.toFixed(1)}s`, {
      color: '#e3fff5',
      fontSize: '30px',
      fontFamily: 'Segoe UI, Roboto, sans-serif'
    });
    message.setOrigin(0.5, 0.5);
  }
  toCanvasPoint(point) {
    if (!this.config) {
      return new (phaser__WEBPACK_IMPORTED_MODULE_0___default().Math).Vector2(point.x, point.y);
    }
    const bounds = this.config.bounds;
    const spanX = Math.max(bounds.width, 1e-6);
    const spanY = Math.max(bounds.height, 1e-6);
    const uniformScale = Math.min(this.scale.width / spanX, this.scale.height / spanY);
    const offsetX = (this.scale.width - spanX * uniformScale) * 0.5;
    const offsetY = (this.scale.height - spanY * uniformScale) * 0.5;
    const x = offsetX + (point.x - bounds.minX) * uniformScale;
    const y = offsetY + (point.y - bounds.minY) * uniformScale;
    return new (phaser__WEBPACK_IMPORTED_MODULE_0___default().Math).Vector2(x, y);
  }
  computeCentroid(points) {
    if (points.length === 0) {
      return {
        x: 0,
        y: 0
      };
    }
    let area = 0;
    let cx = 0;
    let cy = 0;
    for (let i = 0; i < points.length; i++) {
      const current = points[i];
      const next = points[(i + 1) % points.length];
      const cross = current.x * next.y - next.x * current.y;
      area += cross;
      cx += (current.x + next.x) * cross;
      cy += (current.y + next.y) * cross;
    }
    if (Math.abs(area) < 1e-6) {
      const sum = points.reduce((acc, pt) => ({
        x: acc.x + pt.x,
        y: acc.y + pt.y
      }), {
        x: 0,
        y: 0
      });
      return {
        x: sum.x / points.length,
        y: sum.y / points.length
      };
    }
    area *= 0.5;
    const factor = 1 / (6 * area);
    return {
      x: cx * factor,
      y: cy * factor
    };
  }
  round(value) {
    const factor = 1_000_000;
    if (value === 0) {
      return 0;
    }
    return Math.sign(value) * Math.round(Math.abs(value) * factor) / factor;
  }
  buildPieceGeometry(points, anchor) {
    if (points.length === 0) {
      return {
        coords: [],
        hitArea: [],
        target: anchor.clone()
      };
    }
    const coords = [];
    const hitArea = [];
    const sanitized = [...points];
    if (sanitized.length > 1) {
      const first = sanitized[0];
      const last = sanitized[sanitized.length - 1];
      if (Math.abs(first.x - last.x) < 1e-6 && Math.abs(first.y - last.y) < 1e-6) {
        sanitized.pop();
      }
    }
    sanitized.forEach(point => {
      const localX = point.x - anchor.x;
      const localY = point.y - anchor.y;
      coords.push(localX, localY);
      hitArea.push(new (phaser__WEBPACK_IMPORTED_MODULE_0___default().Geom).Point(localX, localY));
    });
    return {
      coords,
      hitArea,
      target: anchor.clone()
    };
  }
  showDebugOutline(piece) {
    if (!this.debugOverlay) {
      this.debugOverlay = this.add.graphics();
      this.debugOverlay.setDepth(150);
    }
    const overlay = this.debugOverlay;
    overlay.clear();
    overlay.setVisible(true);
    overlay.lineStyle(4, 0x9efcff, 0.9);
    overlay.fillStyle(0x9efcff, 0.12);
    const points = piece.footprint;
    if (points.length === 0) {
      return;
    }
    overlay.beginPath();
    overlay.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      overlay.lineTo(points[i].x, points[i].y);
    }
    overlay.closePath();
    overlay.strokePath();
    overlay.fillPath();
  }
  hideDebugOutline() {
    if (!this.debugOverlay) {
      return;
    }
    this.debugOverlay.clear();
    this.debugOverlay.setVisible(false);
  }
  createConfigFromSvg(svgContent) {
    const parser = new DOMParser();
    const documentNode = parser.parseFromString(svgContent, 'image/svg+xml');
    const root = documentNode.documentElement;
    const viewBoxRaw = root.getAttribute('viewBox');
    if (!viewBoxRaw) {
      throw new Error('SVG viewBox is required to normalise coordinates.');
    }
    const viewBoxValues = viewBoxRaw.split(/[\s,]+/).map(Number);
    if (viewBoxValues.length !== 4 || viewBoxValues.some(value => Number.isNaN(value))) {
      throw new Error('SVG viewBox is invalid.');
    }
    const [minX, minY, width, height] = viewBoxValues;
    const outlineElement = documentNode.querySelector('#outline');
    if (!outlineElement) {
      throw new Error('SVG outline path not found.');
    }
    const outlinePoints = this.samplePath(outlineElement);
    const pieceElements = Array.from(documentNode.querySelectorAll('[id^="piece_"]'));
    if (pieceElements.length === 0) {
      throw new Error('No puzzle pieces found in SVG.');
    }
    const pieces = pieceElements.map(element => {
      const id = element.id;
      const d = element.getAttribute('d');
      if (!d) {
        return null;
      }
      const points = this.samplePath(element);
      if (points.length < 3) {
        return null;
      }
      const anchor = this.computeCentroid(points);
      return {
        id,
        points,
        anchor
      };
    }).filter(piece => piece !== null).sort((a, b) => {
      const numericA = parseInt(a.id.replace(/[^0-9]/g, ''), 10);
      const numericB = parseInt(b.id.replace(/[^0-9]/g, ''), 10);
      if (Number.isNaN(numericA) || Number.isNaN(numericB)) {
        return a.id.localeCompare(b.id);
      }
      return numericA - numericB;
    });
    const bounds = this.computeBounds(outlinePoints, pieces);
    return {
      outline: outlinePoints,
      pieces,
      bounds
    };
  }
  samplePath(pathElement) {
    const pathData = pathElement.getAttribute('d');
    if (!pathData) {
      return [];
    }
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', pathData);
    const totalLength = path.getTotalLength();
    if (!Number.isFinite(totalLength) || totalLength === 0) {
      return [];
    }
    const steps = Math.max(Math.ceil(totalLength / 4), 64);
    const points = [];
    for (let i = 0; i <= steps; i++) {
      const distance = i / steps * totalLength;
      const {
        x,
        y
      } = path.getPointAtLength(distance);
      points.push({
        x: this.round(x),
        y: this.round(y)
      });
    }
    return this.compactPoints(points);
  }
  compactPoints(points, epsilon = 1e-4) {
    if (points.length === 0) {
      return points;
    }
    const compacted = [points[0]];
    for (let i = 1; i < points.length; i++) {
      const prev = compacted[compacted.length - 1];
      const current = points[i];
      const dx = Math.abs(prev.x - current.x);
      const dy = Math.abs(prev.y - current.y);
      if (dx > epsilon || dy > epsilon) {
        compacted.push(current);
      }
    }
    if (compacted.length > 2) {
      const first = compacted[0];
      const last = compacted[compacted.length - 1];
      if (Math.abs(first.x - last.x) > epsilon || Math.abs(first.y - last.y) > epsilon) {
        compacted.push({
          ...first
        });
      }
    }
    return compacted;
  }
  computeBounds(outline, pieces) {
    const allPoints = [...outline];
    pieces.forEach(piece => {
      allPoints.push(...piece.points);
    });
    if (allPoints.length === 0) {
      return {
        minX: 0,
        minY: 0,
        maxX: 1,
        maxY: 1,
        width: 1,
        height: 1
      };
    }
    let minX = allPoints[0].x;
    let maxX = allPoints[0].x;
    let minY = allPoints[0].y;
    let maxY = allPoints[0].y;
    for (let i = 1; i < allPoints.length; i++) {
      const point = allPoints[i];
      if (point.x < minX) minX = point.x;
      if (point.x > maxX) maxX = point.x;
      if (point.y < minY) minY = point.y;
      if (point.y > maxY) maxY = point.y;
    }
    return {
      minX,
      minY,
      maxX,
      maxY,
      width: maxX - minX,
      height: maxY - minY
    };
  }
  setDebugVisible(show) {
    this.debugEnabled = show;
    if (!show) {
      this.hideDebugOutline();
    }
    this.refreshSnapToleranceForAll();
  }
}

/***/ })

},
/******/ __webpack_require__ => { // webpackRuntimeModules
/******/ var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
/******/ __webpack_require__.O(0, ["vendor"], () => (__webpack_exec__(4429)));
/******/ var __webpack_exports__ = __webpack_require__.O();
/******/ }
]);
//# sourceMappingURL=main.js.map