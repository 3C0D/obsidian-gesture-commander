import { App, PluginSettingTab, Setting, Notice } from 'obsidian';
import GestureCommanderPlugin from './main.js';
import type { ModifierKeys } from './gesture-capture.js';

export interface GestureMapping {
  id: string;
  gestureName: string;
  commandId: string;
  commandName: string;
  enabled: boolean;
  minScore: number;
  originalPoints?: Point[];
}

interface Point {
  x: number;
  y: number;
}

export interface GestureCommanderSettings {
  modifierKeys: ModifierKeys;
  minStrokeLength: number;
  maxStrokeTime: number;
  enableVisualFeedback: boolean;
  gestureMappings: GestureMapping[];
  recognitionThreshold: number;
  useProtractor: boolean;
}

export const DEFAULT_SETTINGS: GestureCommanderSettings = {
  modifierKeys: {
    alt: true,
    shift: false,
    ctrl: false,
    meta: false
  },
  minStrokeLength: 50,
  maxStrokeTime: 3000,
  enableVisualFeedback: true,
  gestureMappings: [],
  recognitionThreshold: 0.60,
  useProtractor: false
};

export class GestureCommanderSettingTab extends PluginSettingTab {
  plugin: GestureCommanderPlugin;
  private gestureMappingsContainer: HTMLElement | null = null;

  constructor(app: App, plugin: GestureCommanderPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl('h2', { text: 'Gesture Commander Settings' });

    this.addModifierKeysSettings(containerEl);
    this.addCaptureSettings(containerEl);
    this.addRecognitionSettings(containerEl);
    this.addGestureMappingsSettings(containerEl);
    this.addImportExportSettings(containerEl);
  }

  private addModifierKeysSettings(containerEl: HTMLElement): void {
    containerEl.createEl('h3', { text: 'Modifier Keys' });
    containerEl.createEl('p', {
      text: 'Select which modifier keys must be held while drawing gestures:',
      cls: 'setting-item-description'
    });

    new Setting(containerEl)
      .setName('Alt key')
      .setDesc('Require Alt key to be pressed')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.modifierKeys.alt)
        .onChange(async (value) => {
          this.plugin.settings.modifierKeys.alt = value;
          await this.plugin.saveSettings();
          this.plugin.updateGestureCapture();
        }));

    new Setting(containerEl)
      .setName('Shift key')
      .setDesc('Require Shift key to be pressed')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.modifierKeys.shift)
        .onChange(async (value) => {
          this.plugin.settings.modifierKeys.shift = value;
          await this.plugin.saveSettings();
          this.plugin.updateGestureCapture();
        }));

    new Setting(containerEl)
      .setName('Ctrl key')
      .setDesc('Require Ctrl key to be pressed')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.modifierKeys.ctrl)
        .onChange(async (value) => {
          this.plugin.settings.modifierKeys.ctrl = value;
          await this.plugin.saveSettings();
          this.plugin.updateGestureCapture();
        }));

    new Setting(containerEl)
      .setName('Meta key (Cmd/Win)')
      .setDesc('Require Meta key to be pressed')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.modifierKeys.meta)
        .onChange(async (value) => {
          this.plugin.settings.modifierKeys.meta = value;
          await this.plugin.saveSettings();
          this.plugin.updateGestureCapture();
        }));

    containerEl.createEl('p', {
      text: 'Note: AltGraph (Alt Gr) is automatically detected when both Alt and Ctrl keys are enabled.',
      cls: 'setting-item-description'
    });
  }

  private addCaptureSettings(containerEl: HTMLElement): void {
    containerEl.createEl('h3', { text: 'Capture Settings' });

    new Setting(containerEl)
      .setName('Minimum stroke length')
      .setDesc('Minimum length in pixels for a gesture to be recognized')
      .addSlider(slider => slider
        .setLimits(10, 200, 10)
        .setValue(this.plugin.settings.minStrokeLength)
        .setDynamicTooltip()
        .onChange(async (value) => {
          this.plugin.settings.minStrokeLength = value;
          await this.plugin.saveSettings();
          this.plugin.updateGestureCapture();
        }));

    new Setting(containerEl)
      .setName('Maximum stroke time')
      .setDesc('Maximum time in milliseconds for drawing a gesture')
      .addSlider(slider => slider
        .setLimits(1000, 10000, 500)
        .setValue(this.plugin.settings.maxStrokeTime)
        .setDynamicTooltip()
        .onChange(async (value) => {
          this.plugin.settings.maxStrokeTime = value;
          await this.plugin.saveSettings();
          this.plugin.updateGestureCapture();
        }));

    new Setting(containerEl)
      .setName('Visual feedback')
      .setDesc('Show visual feedback while drawing gestures')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.enableVisualFeedback)
        .onChange(async (value) => {
          this.plugin.settings.enableVisualFeedback = value;
          await this.plugin.saveSettings();
          this.plugin.updateGestureCapture();
        }));
  }

  private addRecognitionSettings(containerEl: HTMLElement): void {
    containerEl.createEl('h3', { text: 'Recognition Settings' });

    new Setting(containerEl)
      .setName('Recognition threshold')
      .setDesc('Minimum confidence score (0-1) for gesture recognition')
      .addSlider(slider => slider
        .setLimits(0.1, 1.0, 0.05)
        .setValue(this.plugin.settings.recognitionThreshold)
        .setDynamicTooltip()
        .onChange(async (value) => {
          this.plugin.settings.recognitionThreshold = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Use Protractor enhancement')
      .setDesc('Use faster Protractor algorithm for recognition (experimental)')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.useProtractor)
        .onChange(async (value) => {
          this.plugin.settings.useProtractor = value;
          await this.plugin.saveSettings();
        }));
  }

  private addGestureMappingsSettings(containerEl: HTMLElement): void {
    containerEl.createEl('h3', { text: 'Gesture Mappings' });

    this.gestureMappingsContainer = containerEl.createDiv('gesture-mappings-container');

    // Add new gesture button
    new Setting(containerEl)
      .setName('Add new gesture')
      .setDesc('Create a new gesture mapping')
      .addButton(button => button
        .setButtonText('Add Gesture')
        .setCta()
        .onClick(() => {
          this.plugin.openGestureCreationModal();
        }));

    this.refreshGestureMappingsInternal(this.gestureMappingsContainer);
  }

  refreshGestureMappings(): void {
    if (this.gestureMappingsContainer) {
      this.refreshGestureMappingsInternal(this.gestureMappingsContainer);
    }
  }

  private refreshGestureMappingsInternal(container: HTMLElement): void {
    container.empty();

    if (this.plugin.settings.gestureMappings.length === 0) {
      container.createEl('p', {
        text: 'No gesture mappings configured. Add a new gesture to get started.',
        cls: 'setting-item-description'
      });
      return;
    }

    this.plugin.settings.gestureMappings.forEach((mapping, index) => {
      const mappingEl = container.createDiv('gesture-mapping-item');

      // Create gesture preview
      const preview = this.createGesturePreview(mapping);

      const setting = new Setting(mappingEl);

      // Add preview to the name element
      const nameContainer = setting.nameEl.createDiv();
      nameContainer.appendChild(preview);

      const gestureInfo = nameContainer.createDiv('gesture-info');
      gestureInfo.createDiv().textContent = `${mapping.gestureName} → ${mapping.commandName}`;
      gestureInfo.createDiv('gesture-score').textContent = `Min score: ${(mapping.minScore * 100).toFixed(0)}%`;

      setting
        .setDesc(`Command: ${mapping.commandName}`)
        .addToggle(toggle => toggle
          .setValue(mapping.enabled)
          .onChange(async (value) => {
            mapping.enabled = value;
            await this.plugin.saveSettings();
          }))
        .addButton(button => button
          .setButtonText('Edit')
          .onClick(() => {
            this.plugin.openGestureEditModal(mapping);
          }))
        .addButton(button => button
          .setButtonText('Delete')
          .setWarning()
          .onClick(async () => {
            // Remove from recognizer
            this.plugin.gestureRecognizer.removeTemplatesByName(mapping.gestureName);
            // Remove from settings
            this.plugin.settings.gestureMappings.splice(index, 1);
            await this.plugin.saveSettings();
            this.refreshGestureMappingsInternal(container);
            new Notice('Gesture mapping deleted');
          }));
    });
  }

  private createGesturePreview(mapping: GestureMapping): HTMLElement {
    const previewContainer = document.createElement('div');
    previewContainer.className = 'gesture-preview';

    if (mapping.originalPoints && mapping.originalPoints.length > 0) {
      const canvas = previewContainer.createEl('canvas');
      canvas.width = 32;
      canvas.height = 32;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        this.drawGesturePreview(ctx, mapping.originalPoints, 32, 32);
      }
    } else {
      const placeholder = previewContainer.createDiv('gesture-preview-placeholder');
      placeholder.textContent = '?';
    }

    return previewContainer;
  }

  private drawGesturePreview(ctx: CanvasRenderingContext2D, points: Point[], width: number, height: number): void {
    if (points.length < 2) return;

    // Calculate bounds
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const point of points) {
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      maxX = Math.max(maxX, point.x);
      maxY = Math.max(maxY, point.y);
    }

    const gestureWidth = maxX - minX;
    const gestureHeight = maxY - minY;

    if (gestureWidth === 0 || gestureHeight === 0) return;

    // Calculate scale and offset to fit in preview
    const padding = 4;
    const scale = Math.min(
      (width - padding * 2) / gestureWidth,
      (height - padding * 2) / gestureHeight
    );

    const offsetX = (width - gestureWidth * scale) / 2 - minX * scale;
    const offsetY = (height - gestureHeight * scale) / 2 - minY * scale;

    // Draw gesture
    ctx.strokeStyle = getComputedStyle(document.body).getPropertyValue('--interactive-accent') || '#007acc';
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(points[0].x * scale + offsetX, points[0].y * scale + offsetY);

    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x * scale + offsetX, points[i].y * scale + offsetY);
    }

    ctx.stroke();
  }

  private addImportExportSettings(containerEl: HTMLElement): void {
    containerEl.createEl('h3', { text: 'Import/Export' });

    new Setting(containerEl)
      .setName('Export gestures')
      .setDesc('Export all gesture mappings to a JSON file')
      .addButton(button => button
        .setButtonText('Export')
        .onClick(() => {
          this.exportGestures();
        }));

    new Setting(containerEl)
      .setName('Import gestures')
      .setDesc('Import gesture mappings from a JSON file')
      .addButton(button => button
        .setButtonText('Import')
        .onClick(() => {
          this.importGestures();
        }));

    new Setting(containerEl)
      .setName('Reset to defaults')
      .setDesc('Reset all settings to default values')
      .addButton(button => button
        .setButtonText('Reset')
        .setWarning()
        .onClick(async () => {
          if (confirm('Are you sure you want to reset all settings? This cannot be undone.')) {
            this.plugin.settings = { ...DEFAULT_SETTINGS };
            await this.plugin.saveSettings();
            this.plugin.updateGestureCapture();
            this.display();
            new Notice('Settings reset to defaults');
          }
        }));
  }

  private exportGestures(): void {
    const data = {
      version: '1.0.0',
      gestureMappings: this.plugin.settings.gestureMappings,
      gestureTemplates: this.plugin.gestureRecognizer.exportTemplates()
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'gesture-commander-export.json';
    a.click();

    URL.revokeObjectURL(url);
    new Notice('Gestures exported successfully');
  }

  private importGestures(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const data = JSON.parse(text);

        if (data.gestureMappings) {
          this.plugin.settings.gestureMappings = data.gestureMappings;
        }

        if (data.gestureTemplates) {
          this.plugin.gestureRecognizer.importTemplates(data.gestureTemplates);
        }

        await this.plugin.saveSettings();
        this.display();
        new Notice('Gestures imported successfully');
      } catch (error) {
        new Notice('Error importing gestures: ' + error.message);
      }
    };

    input.click();
  }
}
