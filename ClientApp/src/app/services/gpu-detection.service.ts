import { Injectable } from '@angular/core';

export interface GpuDetectionResult {
  hasIssue: boolean;
  issueType?: 'software-renderer' | 'no-webgl' | 'blocked-gpu';
  renderer?: string;
  vendor?: string;
  message?: string;
  settingsUrl?: string;
}

@Injectable({
  providedIn: 'root'
})
export class GpuDetectionService {

  /**
   * Silently detect GPU/WebGL issues that may cause poor performance.
   * Only reports actual problems - does not show false positives.
   */
  async detectPerformanceIssues(): Promise<GpuDetectionResult> {
    // Check if user has already dismissed the warning
    if (localStorage.getItem('gpu-warning-dismissed') === 'true') {
      return { hasIssue: false };
    }

    const canvas = document.createElement('canvas');
    
    // Try to get WebGL 2 context first, then WebGL 1
    const gl = canvas.getContext('webgl2', { powerPreference: 'high-performance' })
            || canvas.getContext('webgl', { powerPreference: 'high-performance' });

    // Critical issue: No WebGL support at all
    if (!gl) {
      return {
        hasIssue: true,
        issueType: 'no-webgl',
        message: 'WebGL is not available in your browser.',
        settingsUrl: this.getBrowserSettingsUrl()
      };
    }

    // Get renderer and vendor information
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    let vendor = '';
    let renderer = '';
    
    if (debugInfo) {
      vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || '';
      renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || '';
    }
    
    // Fallback: Use standard WebGL parameters if extension is blocked (Firefox privacy settings)
    if (!renderer) {
      renderer = gl.getParameter(gl.RENDERER) || '';
      vendor = gl.getParameter(gl.VENDOR) || '';
    }

    const vendorLower = vendor.toLowerCase();
    const rendererLower = renderer.toLowerCase();
    const combined = `${vendorLower} ${rendererLower}`.trim();

    console.log('GPU Detection - Vendor:', vendor, 'Renderer:', renderer);

    // Check for software rendering (the most common cause of poor performance)
    const softwareIndicators = [
      'swiftshader',
      'llvmpipe',
      'software',
      'angle (swiftshader)',
      'microsoft basic render driver',
      'mesa',              // Linux software rendering
      'chromium',          // Generic Chromium software rendering
      'opengl es 2.0',     // Often used for software rendering
      'webgl 1.0',         // Check for basic/fallback WebGL
      'basic render'       // Windows basic render driver
    ];

    const isSoftwareRenderer = softwareIndicators.some(indicator => 
      combined.includes(indicator)
    );

    // Additional check: Firefox-specific software rendering detection
    const isFirefox = navigator.userAgent.toLowerCase().includes('firefox');
    
    // Performance benchmark fallback: If we can't get renderer info, test actual performance
    let slowPerformance = false;
    if (!renderer || renderer === 'webgl' || renderer === 'webkit webgl' || renderer === 'moz webgl') {
      console.log('⚠️ Renderer info unavailable (privacy settings?), running performance test...');
      slowPerformance = await this.testWebGLPerformance(gl);
    }
    
    const isFirefoxSoftware = isFirefox && (
      !rendererLower.includes('nvidia') &&
      !rendererLower.includes('amd') &&
      !rendererLower.includes('intel') &&
      !rendererLower.includes('radeon') &&
      !rendererLower.includes('geforce') &&
      (rendererLower.includes('mesa') || rendererLower.includes('llvmpipe') || rendererLower === '' || slowPerformance)
    );

    if (isSoftwareRenderer || isFirefoxSoftware || slowPerformance) {
      console.warn('🔴 Software renderer detected:', renderer || '(unknown)', '(vendor:', vendor || '(unknown)', ')');
      return {
        hasIssue: true,
        issueType: 'software-renderer',
        renderer: renderer || 'Unknown (privacy settings may be blocking detection)',
        vendor: vendor || 'Unknown',
        message: 'Your browser is using software rendering instead of your graphics card.',
        settingsUrl: this.getBrowserSettingsUrl()
      };
    }

    // Check if GPU is blocked or blacklisted
    const isBlocked = combined.includes('angle') && combined.includes('d3d11');
    if (isBlocked && !combined.includes('nvidia') && !combined.includes('amd') && !combined.includes('intel')) {
      console.warn('🟡 Possible GPU block detected:', renderer);
      return {
        hasIssue: true,
        issueType: 'blocked-gpu',
        renderer,
        vendor,
        message: 'Hardware acceleration may be disabled.',
        settingsUrl: this.getBrowserSettingsUrl()
      };
    }

    // No issues detected - GPU is working properly
    console.log('✅ GPU detection passed:', renderer);
    return { 
      hasIssue: false,
      renderer,
      vendor
    };
  }

  /**
   * Performance benchmark fallback test for when renderer info is unavailable.
   * Tests actual WebGL draw performance to detect software rendering.
   * Returns true if performance is suspiciously slow (indicating software rendering).
   */
  private async testWebGLPerformance(gl: WebGLRenderingContext | WebGL2RenderingContext): Promise<boolean> {
    try {
      // Create a simple shader program
      const vertexShader = gl.createShader(gl.VERTEX_SHADER);
      const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
      
      if (!vertexShader || !fragmentShader) return false;

      gl.shaderSource(vertexShader, `
        attribute vec2 position;
        void main() {
          gl_Position = vec4(position, 0.0, 1.0);
        }
      `);
      gl.shaderSource(fragmentShader, `
        precision mediump float;
        void main() {
          gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
        }
      `);

      gl.compileShader(vertexShader);
      gl.compileShader(fragmentShader);

      const program = gl.createProgram();
      if (!program) return false;

      gl.attachShader(program, vertexShader);
      gl.attachShader(program, fragmentShader);
      gl.linkProgram(program);
      gl.useProgram(program);

      // Create a simple triangle buffer
      const buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, 0, 1]), gl.STATIC_DRAW);

      const position = gl.getAttribLocation(program, 'position');
      gl.enableVertexAttribArray(position);
      gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

      // Benchmark: Draw many triangles and measure time
      const iterations = 1000;
      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      }

      gl.finish(); // Wait for all draw calls to complete
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Clean up
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
      gl.deleteProgram(program);
      gl.deleteBuffer(buffer);

      console.log(`WebGL Performance Test: ${iterations} draws in ${duration.toFixed(2)}ms`);

      // If it takes more than 100ms for 1000 simple draws, it's likely software rendering
      // Hardware GPU should complete this in <10ms
      const isSlow = duration > 100;
      
      if (isSlow) {
        console.warn(`⚠️ Slow performance detected (${duration.toFixed(2)}ms) - likely software rendering`);
      }

      return isSlow;
    } catch (error) {
      console.error('Performance test failed:', error);
      return false; // Don't show warning if test fails
    }
  }

  /**
   * Get browser-specific settings URL for hardware acceleration
   */
  private getBrowserSettingsUrl(): string {
    const userAgent = navigator.userAgent.toLowerCase();
    
    if (userAgent.includes('edg')) {
      return 'edge://settings/?search=hardware'; // Direct search for hardware acceleration
    } else if (userAgent.includes('opr') || userAgent.includes('opera')) {
      return 'opera://settings';
    } else if (userAgent.includes('brave')) {
      return 'brave://settings/system';
    } else if (userAgent.includes('chrome')) {
      return 'chrome://settings/system';
    } else if (userAgent.includes('firefox')) {
      return 'about:preferences#general';
    } else if (userAgent.includes('safari')) {
      return ''; // Safari uses system preferences
    }
    
    return 'chrome://settings/system'; // Default to Chrome format
  }

  /**
   * Get human-readable browser name
   */
  getBrowserName(): string {
    const userAgent = navigator.userAgent.toLowerCase();
    
    if (userAgent.includes('edg')) {
      return 'Edge';
    } else if (userAgent.includes('opr') || userAgent.includes('opera')) {
      return 'Opera';
    } else if (userAgent.includes('brave')) {
      return 'Brave';
    } else if (userAgent.includes('chrome')) {
      return 'Chrome';
    } else if (userAgent.includes('firefox')) {
      return 'Firefox';
    } else if (userAgent.includes('safari')) {
      return 'Safari';
    }
    
    return 'your browser';
  }

  /**
   * Get browser-specific instructions
   */
  getBrowserInstructions(): string[] {
    const userAgent = navigator.userAgent.toLowerCase();
    
    if (userAgent.includes('safari') && !userAgent.includes('chrome')) {
      // Safari uses system preferences, not browser settings
      return [
        'Open System Preferences on your Mac',
        'Go to "Displays"',
        'Click on "Advanced" or check display settings',
        'Ensure hardware acceleration is enabled in system settings'
      ];
    } else if (userAgent.includes('edg')) {
      // Edge has search built into URL
      return [
        'Copy this address: <strong>edge://settings/?search=hardware</strong>',
        'Paste it into your browser\'s address bar',
        'Look for "Use hardware acceleration when available" in the search results',
        'Enable the toggle switch',
        'Click "Restart" button to apply changes'
      ];
    } else if (userAgent.includes('firefox')) {
      return [
        'Copy this address: <strong>about:preferences#general</strong>',
        'Paste it into your browser\'s address bar',
        'Scroll to "Performance" section',
        'Uncheck "Use recommended performance settings"',
        'Check "Use hardware acceleration when available"',
        'Restart your browser'
      ];
    } else if (userAgent.includes('opr') || userAgent.includes('opera')) {
      return [
        'Copy this address: <strong>opera://settings</strong>',
        'Paste it into your browser\'s address bar',
        'Click "Advanced" in the left sidebar',
        'Go to "Browser" section',
        'Enable "Use hardware acceleration when available"',
        'Restart your browser'
      ];
    } else {
      // Chrome, Brave - use similar Chromium settings
      return []; // Will use default translation keys
    }
  }

  /**
   * Mark the warning as dismissed
   */
  dismissWarning(): void {
    localStorage.setItem('gpu-warning-dismissed', 'true');
  }

  /**
   * Clear dismissed state (for testing)
   */
  resetWarning(): void {
    localStorage.removeItem('gpu-warning-dismissed');
  }
}
