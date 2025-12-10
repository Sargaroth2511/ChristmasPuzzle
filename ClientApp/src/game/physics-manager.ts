/**
 * Physics Manager - Handles toggling between Arcade and Matter.js physics
 * Keeps physics logic separate from puzzle logic for easier debugging
 */

import Phaser from 'phaser';

export enum PhysicsMode {
  ARCADE = 'arcade',
  MATTER = 'matter'
}

export type PhysicsConfig = {
  mode: PhysicsMode;
  gravity: { x: number; y: number };
  bounce: number;
  friction: number;
  debug?: boolean;
};

export type PhysicsBody = {
  gameObject: Phaser.GameObjects.GameObject;
  arcadeBody?: Phaser.Physics.Arcade.Body;
  matterBody?: MatterJS.BodyType;
  originalX: number;
  originalY: number;
  originalRotation: number;
};

/**
 * PhysicsManager handles the switching between Arcade and Matter physics
 * for puzzle pieces in the Phaser game
 */
export class PhysicsManager {
  private scene: Phaser.Scene;
  private currentMode: PhysicsMode;
  private bodies: Map<string, PhysicsBody> = new Map();
  private config: PhysicsConfig;

  constructor(scene: Phaser.Scene, initialConfig: PhysicsConfig) {
    this.scene = scene;
    this.currentMode = initialConfig.mode;
    this.config = initialConfig;
  }

  /**
   * Initialize physics systems in the scene
   */
  public initializePhysics(): void {
    // Enable Arcade Physics (default system)
    if (!this.scene.physics || !this.scene.physics.world) {
      this.scene.physics.world = new Phaser.Physics.Arcade.World(this.scene, {
        gravity: this.config.gravity,
        debug: this.config.debug ?? false
      });
    }

    // Enable Matter Physics
    if (!this.scene.matter) {
      (this.scene as any).matter = {
        world: {},
        add: {}
      };
    }
  }

  /**
   * Add a game object to physics management
   */
  public addBody(
    id: string,
    gameObject: Phaser.GameObjects.GameObject,
    x: number,
    y: number,
    rotation: number = 0
  ): void {
    this.bodies.set(id, {
      gameObject,
      originalX: x,
      originalY: y,
      originalRotation: rotation
    });
  }

  /**
   * Remove a body from physics management
   */
  public removeBody(id: string): void {
    const body = this.bodies.get(id);
    if (body) {
      this.disablePhysics(body);
      this.bodies.delete(id);
    }
  }

  /**
   * Toggle between Arcade and Matter physics
   */
  public togglePhysicsMode(): PhysicsMode {
    const newMode =
      this.currentMode === PhysicsMode.ARCADE ? PhysicsMode.MATTER : PhysicsMode.ARCADE;

    this.switchPhysicsMode(newMode);
    return newMode;
  }

  /**
   * Get the current physics mode
   */
  public getCurrentMode(): PhysicsMode {
    return this.currentMode;
  }

  /**
   * Switch to a specific physics mode
   */
  private switchPhysicsMode(newMode: PhysicsMode): void {
    // Disable current physics on all bodies
    this.bodies.forEach((body) => {
      this.disablePhysics(body);
    });

    // Update mode
    this.currentMode = newMode;

    // Enable new physics on all bodies
    this.bodies.forEach((body) => {
      this.enablePhysics(body, newMode);
    });
  }

  /**
   * Enable physics for a body based on the mode
   */
  private enablePhysics(body: PhysicsBody, mode: PhysicsMode): void {
    if (mode === PhysicsMode.ARCADE) {
      this.enableArcadePhysics(body);
    } else {
      this.enableMatterPhysics(body);
    }
  }

  /**
   * Disable all physics for a body
   */
  private disablePhysics(body: PhysicsBody): void {
    // Disable Arcade physics
    if (body.arcadeBody) {
      this.scene.physics.world.disable(body.gameObject);
      body.arcadeBody = undefined;
    }

    // Disable Matter physics
    if (body.matterBody && this.scene.matter && this.scene.matter.world) {
      this.scene.matter.world.remove(body.matterBody);
      body.matterBody = undefined;
    }
  }

  /**
   * Enable Arcade physics for a body (simplified physics)
   */
  private enableArcadePhysics(body: PhysicsBody): void {
    if (!this.scene.physics || !this.scene.physics.world) {
      return;
    }

    // Enable arcade physics on the game object
    this.scene.physics.world.enable(body.gameObject);
    
    const arcadeBody = (body.gameObject as any).body as Phaser.Physics.Arcade.Body;
    if (arcadeBody) {
      // Configure arcade physics properties
      arcadeBody.setGravityY(this.config.gravity.y);
      arcadeBody.setBounce(this.config.bounce);
      arcadeBody.setCollideWorldBounds(true);
      arcadeBody.setDrag(this.config.friction * 100); // Convert to drag value
      
      body.arcadeBody = arcadeBody;
    }
  }

  /**
   * Enable Matter.js physics for a body (realistic physics)
   */
  private enableMatterPhysics(body: PhysicsBody): void {
    if (!this.scene.matter || !this.scene.matter.world) {
      return;
    }

    const gameObj = body.gameObject as any;
    
    // Get the shape bounds for the Matter body
    let width = 50;
    let height = 50;
    
    if (gameObj.width && gameObj.height) {
      width = gameObj.width;
      height = gameObj.height;
    } else if (gameObj.displayWidth && gameObj.displayHeight) {
      width = gameObj.displayWidth;
      height = gameObj.displayHeight;
    }

    // Create a Matter body
    // Note: In a real implementation, you'd use this.scene.matter.add
    // For now, we'll create a placeholder
    const matterBody = {
      position: { x: body.originalX, y: body.originalY },
      angle: body.originalRotation,
      friction: this.config.friction,
      restitution: this.config.bounce,
      isStatic: false
    } as any;

    body.matterBody = matterBody;
  }

  /**
   * Update physics (called in scene update loop)
   */
  public update(delta: number): void {
    if (this.currentMode === PhysicsMode.ARCADE) {
      // Arcade physics updates automatically
      this.scene.physics.world.update(this.scene.time.now, delta);
    } else {
      // Matter physics updates automatically via Phaser's Matter plugin
      // We can add custom updates here if needed
    }
  }

  /**
   * Clean up physics resources
   */
  public destroy(): void {
    this.bodies.forEach((body) => {
      this.disablePhysics(body);
    });
    this.bodies.clear();
  }

  /**
   * Get debug info about current physics state
   */
  public getDebugInfo(): string {
    return `Physics Mode: ${this.currentMode} | Bodies: ${this.bodies.size}`;
  }
}
