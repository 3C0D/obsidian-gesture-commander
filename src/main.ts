import {
  Plugin,
  Notice
} from "obsidian";
import { DollarRecognizer } from './gesture-recognizer.js';
import { GestureCapture } from './gesture-capture.js';
import type { GestureStroke } from './gesture-capture.js';
import { GestureCommanderSettingTab, DEFAULT_SETTINGS } from './settings.js';
import type { GestureCommanderSettings, GestureMapping } from './settings.js';
import { GestureCreationModal } from './gesture-creation-modal.js';

export default class GestureCommanderPlugin extends Plugin {
  settings: GestureCommanderSettings;
  gestureRecognizer: DollarRecognizer;
  gestureCapture: GestureCapture;
  settingsTab: GestureCommanderSettingTab | null = null;

  async onload(): Promise<void> {
    console.log("Loading Gesture Commander plugin");
    await this.loadSettings();

    // Initialize gesture recognizer
    this.gestureRecognizer = new DollarRecognizer();

    // Reload saved gestures
    this.reloadGestures();

    // Initialize gesture capture
    this.initializeGestureCapture();

    // Add commands
    this.addCommand({
      id: 'gesture-commander-create-gesture',
      name: 'Create New Gesture',
      callback: () => this.openGestureCreationModal()
    });

    this.addCommand({
      id: 'gesture-commander-toggle',
      name: 'Toggle Gesture Recognition',
      callback: () => this.toggleGestureRecognition()
    });

    // Add settings tab
    this.settingsTab = new GestureCommanderSettingTab(this.app, this);
    this.addSettingTab(this.settingsTab);
  }

  onunload(): void {
    console.log("Unloading Gesture Commander plugin");
    if (this.gestureCapture) {
      this.gestureCapture.disable();
    }
  }

  private initializeGestureCapture(): void {
    const captureSettings = {
      modifierKeys: this.settings.modifierKeys,
      minStrokeLength: this.settings.minStrokeLength,
      maxStrokeTime: this.settings.maxStrokeTime,
      enableVisualFeedback: this.settings.enableVisualFeedback
    };

    this.gestureCapture = new GestureCapture(
      captureSettings,
      (stroke: GestureStroke) => this.handleGestureComplete(stroke)
    );

    this.gestureCapture.enable();
  }

  private handleGestureComplete(stroke: GestureStroke): void {
    const result = this.gestureRecognizer.recognize(stroke.points, this.settings.useProtractor);

    if (result.score >= this.settings.recognitionThreshold) {
      // Find mapping by gesture name (which is the command ID)
      const mapping = this.settings.gestureMappings.find(
        m => m.enabled && m.gestureName === result.name && result.score >= m.minScore
      );

      if (mapping) {
        this.executeCommand(mapping.commandId);
        new Notice(`Command executed: ${mapping.commandName} (${(result.score * 100).toFixed(1)}%)`);
      } else {
        new Notice(`Gesture recognized as "${result.name}" but no command mapped (${(result.score * 100).toFixed(1)}%)`);
      }
    } else {
      new Notice(`Gesture not recognized (best match: ${(result.score * 100).toFixed(1)}%)`);
    }
  }

  private executeCommand(commandId: string): void {
    const command = (this.app as any).commands.commands[commandId];
    if (command) {
      (this.app as any).commands.executeCommandById(commandId);
    } else {
      new Notice(`Command "${commandId}" not found`);
    }
  }

  openGestureCreationModal(existingMapping?: GestureMapping): void {
    new GestureCreationModal(this.app, this, existingMapping).open();
  }

  openGestureEditModal(mapping: GestureMapping): void {
    this.openGestureCreationModal(mapping);
  }

  private toggleGestureRecognition(): void {
    if (this.gestureCapture) {
      // For now, just show a notice. Could implement enable/disable functionality
      new Notice("Gesture recognition is active. Configure in settings to modify behavior.");
    }
  }

  updateGestureCapture(): void {
    if (this.gestureCapture) {
      this.gestureCapture.updateSettings({
        modifierKeys: this.settings.modifierKeys,
        minStrokeLength: this.settings.minStrokeLength,
        maxStrokeTime: this.settings.maxStrokeTime,
        enableVisualFeedback: this.settings.enableVisualFeedback
      });
    }
  }

  refreshSettingsTab(): void {
    if (this.settingsTab) {
      this.settingsTab.refreshGestureMappings();
    }
  }

  async loadSettings(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());

    // Reload gestures into recognizer after settings are loaded
    if (this.gestureRecognizer && this.settings.gestureMappings.length > 0) {
      this.reloadGestures();
    }
  }

  private reloadGestures(): void {
    // Clear existing templates (including any default ones)
    this.gestureRecognizer.deleteUserGestures();

    // Remove any default gestures that might interfere
    this.gestureRecognizer.removeTemplatesByName('circle');
    this.gestureRecognizer.removeTemplatesByName('triangle');

    // Reload all gestures from settings
    this.settings.gestureMappings.forEach(mapping => {
      if (mapping.originalPoints && mapping.originalPoints.length > 0) {
        this.gestureRecognizer.addGesture(mapping.gestureName, mapping.originalPoints);
      }
    });
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }
}
