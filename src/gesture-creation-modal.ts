import { App, Modal, Setting, Notice } from 'obsidian';
import GestureCommanderPlugin from './main.js';
import type { Point } from './gesture-recognizer.js';
import type { GestureMapping } from './settings.js';
import { CommandSuggest, type Command } from './command-suggester.js';

export class GestureCreationModal extends Modal {
  plugin: GestureCommanderPlugin;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  isDrawing = false;
  points: Point[] = [];
  gestureName = '';
  selectedCommand: Command | null = null;
  existingMapping: GestureMapping | null = null;
  commandSuggest: CommandSuggest | null = null;

  constructor(app: App, plugin: GestureCommanderPlugin, existingMapping?: GestureMapping) {
    super(app);
    this.plugin = plugin;
    this.existingMapping = existingMapping || null;

    if (this.existingMapping) {
      this.gestureName = this.existingMapping.gestureName;
      this.selectedCommand = this.findCommandById(this.existingMapping.commandId);
    }
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();

    contentEl.createEl('h2', {
      text: this.existingMapping ? 'Edit Gesture' : 'Create New Gesture'
    });

    this.createCommandSelector(contentEl);
    this.createDrawingCanvas(contentEl);
    this.createActionButtons(contentEl);

    if (this.existingMapping) {
      this.loadExistingGesture();
    }
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }

  private generateGestureName(): string {
    // Use the selected command ID as the gesture name if available
    if (this.selectedCommand) {
      return this.selectedCommand.id;
    }

    // Fallback to timestamp-based name
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 5);
    return `gesture-${timestamp}-${randomSuffix}`;
  }

  private createCommandSelector(containerEl: HTMLElement): void {
    const commandSetting = new Setting(containerEl)
      .setName('Command')
      .setDesc('Search and select the command to execute when this gesture is recognized')
      .addText(text => {
        text.setPlaceholder('Type to search commands...');

        // Set initial value if editing
        if (this.selectedCommand) {
          text.setValue(this.selectedCommand.name || this.selectedCommand.id);
        }

        // Create and attach the command suggester
        this.commandSuggest = new CommandSuggest(this.app, text.inputEl);

        // Listen for changes to update selected command and auto-generate gesture name
        text.inputEl.addEventListener('input', () => {
          this.selectedCommand = this.commandSuggest?.getSelectedCommand() || null;

          // Auto-generate gesture name when command is selected
          if (this.selectedCommand) {
            this.gestureName = this.selectedCommand.id;
          }
        });
      });
  }



  private createDrawingCanvas(containerEl: HTMLElement): void {
    const canvasContainer = containerEl.createDiv('gesture-canvas-container');
    canvasContainer.style.border = '2px solid var(--background-modifier-border)';
    canvasContainer.style.borderRadius = '8px';
    canvasContainer.style.padding = '10px';
    canvasContainer.style.marginTop = '20px';
    canvasContainer.style.marginBottom = '20px';

    canvasContainer.createEl('h4', { text: 'Draw your gesture:' });
    canvasContainer.createEl('p', {
      text: 'Click and drag to draw the gesture. The drawing will be used as a template for recognition.',
      cls: 'setting-item-description'
    });

    this.canvas = canvasContainer.createEl('canvas');
    this.canvas.width = 400;
    this.canvas.height = 300;
    this.canvas.style.border = '1px solid var(--background-modifier-border)';
    this.canvas.style.backgroundColor = 'var(--background-primary)';
    this.canvas.style.cursor = 'crosshair';
    this.canvas.style.display = 'block';
    this.canvas.style.margin = '10px auto';

    this.ctx = this.canvas.getContext('2d')!;
    this.ctx.strokeStyle = 'var(--text-accent)';
    this.ctx.lineWidth = 3;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    this.setupCanvasEvents();

    // Clear button
    new Setting(canvasContainer)
      .addButton(button => button
        .setButtonText('Clear Canvas')
        .onClick(() => {
          this.clearCanvas();
        }));
  }

  private createActionButtons(containerEl: HTMLElement): void {
    const buttonContainer = containerEl.createDiv('gesture-modal-buttons');
    buttonContainer.style.display = 'flex';
    buttonContainer.style.justifyContent = 'flex-end';
    buttonContainer.style.gap = '10px';
    buttonContainer.style.marginTop = '20px';

    // Cancel button
    const cancelButton = buttonContainer.createEl('button', { text: 'Cancel' });
    cancelButton.onclick = () => this.close();

    // Save button
    const saveButton = buttonContainer.createEl('button', {
      text: this.existingMapping ? 'Update' : 'Create',
      cls: 'mod-cta'
    });
    saveButton.onclick = () => {
      this.saveGesture().catch(error => {
        new Notice('Error saving gesture: ' + error.message);
      });
    };
  }

  private setupCanvasEvents(): void {
    this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
    this.canvas.addEventListener('mouseleave', this.handleMouseUp.bind(this));

    // Touch events for mobile support
    this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this));
    this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this));
    this.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this));
  }

  private handleMouseDown(event: MouseEvent): void {
    this.isDrawing = true;
    this.points = [];

    const rect = this.canvas.getBoundingClientRect();
    const point: Point = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };

    this.points.push(point);
    this.ctx.beginPath();
    this.ctx.moveTo(point.x, point.y);
  }

  private handleMouseMove(event: MouseEvent): void {
    if (!this.isDrawing) return;

    const rect = this.canvas.getBoundingClientRect();
    const point: Point = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };

    this.points.push(point);
    this.ctx.lineTo(point.x, point.y);
    this.ctx.stroke();
  }

  private handleMouseUp(): void {
    this.isDrawing = false;
  }

  private handleTouchStart(event: TouchEvent): void {
    event.preventDefault();
    const touch = event.touches[0];
    const mouseEvent = new MouseEvent('mousedown', {
      clientX: touch.clientX,
      clientY: touch.clientY
    });
    this.handleMouseDown(mouseEvent);
  }

  private handleTouchMove(event: TouchEvent): void {
    event.preventDefault();
    const touch = event.touches[0];
    const mouseEvent = new MouseEvent('mousemove', {
      clientX: touch.clientX,
      clientY: touch.clientY
    });
    this.handleMouseMove(mouseEvent);
  }

  private handleTouchEnd(event: TouchEvent): void {
    event.preventDefault();
    this.handleMouseUp();
  }

  private clearCanvas(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.points = [];
  }

  private async saveGesture(): Promise<void> {
    if (!this.selectedCommand) {
      new Notice('Please select a command');
      return;
    }

    // Auto-generate gesture name from command ID
    this.gestureName = this.generateGestureName();

    if (this.points.length < 5) {
      new Notice('Please draw a gesture on the canvas');
      return;
    }

    try {
      // Remove existing templates with the same name if updating
      if (this.existingMapping) {
        this.plugin.gestureRecognizer.removeTemplatesByName(this.existingMapping.gestureName);
      }

      // Add gesture to recognizer with original canvas points
      this.plugin.gestureRecognizer.addGesture(this.gestureName, this.points);

      // Create or update mapping with original points for preview
      const mapping: GestureMapping = {
        id: this.existingMapping?.id || this.generateId(),
        gestureName: this.gestureName,
        commandId: this.selectedCommand.id,
        commandName: this.selectedCommand.name || this.selectedCommand.id,
        enabled: true,
        minScore: 0.55,
        originalPoints: [...this.points] // Store original points for preview
      };

      if (this.existingMapping) {
        // Update existing mapping
        const index = this.plugin.settings.gestureMappings.findIndex(m => m.id === this.existingMapping!.id);
        if (index !== -1) {
          this.plugin.settings.gestureMappings[index] = mapping;
        }
      } else {
        // Add new mapping
        this.plugin.settings.gestureMappings.push(mapping);
      }

      await this.plugin.saveSettings();

      // Refresh settings tab if it's open
      this.plugin.refreshSettingsTab();

      new Notice(this.existingMapping ? 'Gesture updated successfully' : 'Gesture created successfully');
      this.close();
    } catch (error) {
      new Notice('Error saving gesture: ' + error.message);
    }
  }

  private loadExistingGesture(): void {
    if (!this.existingMapping) return;

    // Use original points if available, otherwise fall back to template points
    if (this.existingMapping.originalPoints && this.existingMapping.originalPoints.length > 0) {
      this.drawTemplateOnCanvas(this.existingMapping.originalPoints);
    } else {
      // Fallback to template points
      const templates = this.plugin.gestureRecognizer.getTemplatesByName(this.existingMapping.gestureName);
      if (templates.length > 0) {
        const template = templates[0];
        this.drawTemplateOnCanvas(template.points);
      }
    }
  }

  private drawTemplateOnCanvas(points: Point[]): void {
    if (points.length === 0) return;

    this.clearCanvas();

    // Check if points are already canvas-sized (original points) or need scaling (template points)
    const bounds = this.getBounds(points);
    const needsScaling = bounds.width > this.canvas.width || bounds.height > this.canvas.height ||
      bounds.minX < 0 || bounds.minY < 0;

    if (needsScaling) {
      // Scale points to fit canvas (template points)
      const scale = Math.min(
        (this.canvas.width - 40) / bounds.width,
        (this.canvas.height - 40) / bounds.height
      );

      const offsetX = (this.canvas.width - bounds.width * scale) / 2 - bounds.minX * scale;
      const offsetY = (this.canvas.height - bounds.height * scale) / 2 - bounds.minY * scale;

      this.ctx.beginPath();
      this.ctx.moveTo(points[0].x * scale + offsetX, points[0].y * scale + offsetY);

      for (let i = 1; i < points.length; i++) {
        this.ctx.lineTo(points[i].x * scale + offsetX, points[i].y * scale + offsetY);
      }

      this.ctx.stroke();

      // Set scaled points for editing
      this.points = points.map(p => ({
        x: p.x * scale + offsetX,
        y: p.y * scale + offsetY
      }));
    } else {
      // Use points as-is (original canvas points)
      this.ctx.beginPath();
      this.ctx.moveTo(points[0].x, points[0].y);

      for (let i = 1; i < points.length; i++) {
        this.ctx.lineTo(points[i].x, points[i].y);
      }

      this.ctx.stroke();

      // Set original points for editing
      this.points = [...points];
    }
  }

  private getBounds(points: Point[]): { minX: number, minY: number, width: number, height: number } {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    for (const point of points) {
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      maxX = Math.max(maxX, point.x);
      maxY = Math.max(maxY, point.y);
    }

    return {
      minX,
      minY,
      width: maxX - minX,
      height: maxY - minY
    };
  }

  private getAvailableCommands(): Command[] {
    return Object.values((this.app as any).commands.commands);
  }

  private findCommandById(commandId: string): Command | null {
    const commands = this.getAvailableCommands();
    return commands.find(cmd => cmd.id === commandId) || null;
  }

  private generateId(): string {
    return 'gesture-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  }
}
