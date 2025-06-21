import type { Point } from './gesture-recognizer.js';

export interface ModifierKeys {
  alt: boolean;
  shift: boolean;
  ctrl: boolean;
  meta: boolean;
  altGraph?: boolean;
}

export interface GestureCaptureSettings {
  modifierKeys: ModifierKeys;
  minStrokeLength: number;
  maxStrokeTime: number;
  enableVisualFeedback: boolean;
}

export interface GestureStroke {
  points: Point[];
  startTime: number;
  endTime: number;
  modifiers: ModifierKeys;
}

export class GestureCapture {
  private isCapturing = false;
  private currentStroke: Point[] = [];
  private startTime = 0;
  private settings: GestureCaptureSettings;
  private onGestureComplete: (stroke: GestureStroke) => void;
  private visualElement: SVGSVGElement | null = null;
  private lastPoint: Point | null = null;
  private modifierPressed = false;
  private hasMovedWhilePressed = false;

  constructor(
    settings: GestureCaptureSettings,
    onGestureComplete: (stroke: GestureStroke) => void
  ) {
    this.settings = settings;
    this.onGestureComplete = onGestureComplete;
  }

  /**
   * Start listening for gesture events
   */
  enable(): void {
    document.addEventListener('keydown', this.handleKeyDown);
    document.addEventListener('keyup', this.handleKeyUp);
    document.addEventListener('mousemove', this.handleMouseMove);

    // Prevent context menu during gesture capture
    document.addEventListener('contextmenu', this.handleContextMenu);
  }

  /**
   * Stop listening for gesture events
   */
  disable(): void {
    document.removeEventListener('keydown', this.handleKeyDown);
    document.removeEventListener('keyup', this.handleKeyUp);
    document.removeEventListener('mousemove', this.handleMouseMove);
    document.removeEventListener('contextmenu', this.handleContextMenu);

    this.stopCapture();
  }

  /**
   * Update capture settings
   */
  updateSettings(settings: Partial<GestureCaptureSettings>): void {
    this.settings = { ...this.settings, ...settings };
  }

  private handleKeyDown = (event: KeyboardEvent): void => {
    // Check if required modifier keys are pressed
    if (this.areModifierKeysPressed(event)) {
      if (!this.modifierPressed) {
        this.modifierPressed = true;
        this.hasMovedWhilePressed = false;

        // Don't start capture yet, wait for mouse movement
        const target = event.target as HTMLElement;
        if (!this.shouldIgnoreTarget(target)) {
          // Set cursor to indicate gesture mode
          document.body.style.cursor = 'crosshair';
        }
      }
    }
  };

  private handleMouseMove = (event: MouseEvent): void => {
    // Only track movement if modifier keys are pressed
    if (!this.modifierPressed) {
      return;
    }

    // Check if we should ignore this target
    const target = event.target as HTMLElement;
    if (this.shouldIgnoreTarget(target)) {
      return;
    }

    const point: Point = {
      x: event.clientX,
      y: event.clientY
    };

    // Start capturing on first movement with modifier pressed
    if (!this.isCapturing) {
      this.startCapture(point);
      return;
    }

    // Add point if it's far enough from the last point (noise reduction)
    if (!this.lastPoint || this.getDistance(point, this.lastPoint) > 2) {
      this.currentStroke.push(point);
      this.lastPoint = point;
      this.hasMovedWhilePressed = true;

      if (this.settings.enableVisualFeedback) {
        this.updateVisualFeedback(point);
      }
    }

    // Check for maximum stroke time
    if (Date.now() - this.startTime > this.settings.maxStrokeTime) {
      this.stopCapture();
    }
  };

  private handleKeyUp = (event: KeyboardEvent): void => {
    // Check if modifier keys are no longer pressed
    if (!this.areModifierKeysPressed(event)) {
      this.modifierPressed = false;

      // Restore cursor
      document.body.style.cursor = '';

      // Complete capture if we were capturing and moved
      if (this.isCapturing && this.hasMovedWhilePressed) {
        this.completeCapture();
      } else if (this.isCapturing) {
        this.stopCapture();
      }
    }
  };

  private handleContextMenu = (event: Event): void => {
    if (this.isCapturing) {
      event.preventDefault();
      event.stopPropagation();
    }
  };

  private startCapture(startPoint: Point): void {
    this.isCapturing = true;
    this.currentStroke = [];
    this.startTime = Date.now();
    this.lastPoint = null;

    this.currentStroke.push(startPoint);
    this.lastPoint = startPoint;

    if (this.settings.enableVisualFeedback) {
      this.createVisualFeedback(startPoint);
    }

    // Cursor is already set to crosshair in handleKeyDown
  }

  private completeCapture(): void {
    if (this.currentStroke.length < 2) {
      this.stopCapture();
      return;
    }

    // Check minimum stroke length
    const strokeLength = this.calculateStrokeLength(this.currentStroke);
    if (strokeLength < this.settings.minStrokeLength) {
      this.stopCapture();
      return;
    }

    const endTime = Date.now();
    const modifiers = {
      alt: this.settings.modifierKeys.alt,
      shift: this.settings.modifierKeys.shift,
      ctrl: this.settings.modifierKeys.ctrl,
      meta: this.settings.modifierKeys.meta
    };

    const stroke: GestureStroke = {
      points: [...this.currentStroke],
      startTime: this.startTime,
      endTime: endTime,
      modifiers: modifiers
    };

    this.stopCapture();
    this.onGestureComplete(stroke);
  }

  private stopCapture(): void {
    this.isCapturing = false;
    this.currentStroke = [];
    this.lastPoint = null;

    // Restore cursor
    document.body.style.cursor = '';

    if (this.visualElement) {
      this.removeVisualFeedback();
    }
  }

  private areModifierKeysPressed(event: MouseEvent | KeyboardEvent): boolean {
    const required = this.settings.modifierKeys;

    // Check for AltGraph key (detected as key === 'AltGraph')
    // AltGraph should only trigger if both Alt and Ctrl are required
    const isAltGraph = 'key' in event && event.key === 'AltGraph';
    const altGraphMatches = isAltGraph && required.alt && required.ctrl;

    return (
      (!required.alt || event.altKey || altGraphMatches) &&
      (!required.shift || event.shiftKey) &&
      (!required.ctrl || event.ctrlKey || altGraphMatches) &&
      (!required.meta || event.metaKey)
    );
  }



  private shouldIgnoreTarget(target: HTMLElement): boolean {
    // Allow capture in main editor areas - be more permissive
    const editorElement = target.closest('.workspace-leaf-content, .cm-editor, .markdown-source-view, .markdown-preview-view, .view-content');
    if (editorElement) {
      return false;
    }

    // Allow capture in main workspace
    const workspaceElement = target.closest('.workspace-split, .workspace-tabs');
    if (workspaceElement) {
      return false;
    }

    // Ignore input elements, buttons, etc.
    const tagName = target.tagName.toLowerCase();
    const ignoredTags = ['input', 'textarea', 'button', 'select', 'option'];

    if (ignoredTags.includes(tagName)) {
      return true;
    }

    // Ignore settings and modal areas
    const uiElement = target.closest('.modal, .setting-tab-content, .menu, .suggestion-container');
    if (uiElement) {
      return true;
    }

    // Ignore elements with specific classes or data attributes
    if (target.classList.contains('gesture-ignore') ||
      target.hasAttribute('data-gesture-ignore')) {
      return true;
    }

    // Default: allow capture
    return false;
  }

  private createVisualFeedback(_startPoint: Point): void {
    // Create SVG for better line drawing
    this.visualElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.visualElement.style.position = 'fixed';
    this.visualElement.style.pointerEvents = 'none';
    this.visualElement.style.zIndex = '10000';
    this.visualElement.style.top = '0';
    this.visualElement.style.left = '0';
    this.visualElement.style.width = '100vw';
    this.visualElement.style.height = '100vh';
    this.visualElement.style.opacity = '0.8';

    // Create path element
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('stroke', getComputedStyle(document.body).getPropertyValue('--interactive-accent') || '#007acc');
    path.setAttribute('stroke-width', '3');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');
    path.setAttribute('fill', 'none');
    path.setAttribute('id', 'gesture-path');

    this.visualElement.appendChild(path);
    document.body.appendChild(this.visualElement);

    // Initialize path with starting point
    this.updateVisualPath();
  }

  private updateVisualFeedback(_point: Point): void {
    if (!this.visualElement) {
      return;
    }
    this.updateVisualPath();
  }

  private updateVisualPath(): void {
    if (!this.visualElement || this.currentStroke.length < 1) {
      return;
    }

    const path = this.visualElement.querySelector('#gesture-path');
    if (!path) return;

    let pathData = `M ${this.currentStroke[0].x} ${this.currentStroke[0].y}`;

    for (let i = 1; i < this.currentStroke.length; i++) {
      pathData += ` L ${this.currentStroke[i].x} ${this.currentStroke[i].y}`;
    }

    path.setAttribute('d', pathData);
  }

  private removeVisualFeedback(): void {
    if (this.visualElement) {
      document.body.removeChild(this.visualElement);
      this.visualElement = null;
    }
  }

  private calculateStrokeLength(points: Point[]): number {
    let length = 0;
    for (let i = 1; i < points.length; i++) {
      length += this.getDistance(points[i - 1], points[i]);
    }
    return length;
  }

  private getDistance(p1: Point, p2: Point): number {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
}
