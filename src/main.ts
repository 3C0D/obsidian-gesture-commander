import { Plugin, Notice } from "obsidian";
import { DollarRecognizer } from "./gesture-recognizer.ts";
import { GestureCapture } from "./gesture-capture.ts";
import { GestureCommanderSettingTab } from "./settings.ts";
import { DEFAULT_SETTINGS } from "./constants.ts";
import { GestureCreationModal } from "./gesture-creation-modal.ts";
import { GestureManager } from "./gesture-manager.ts";
import type {
	GestureCommanderSettings,
	GestureMapping,
	GestureStroke,
} from "./types.ts";

export default class GestureCommanderPlugin extends Plugin {
	settings: GestureCommanderSettings;
	gestureRecognizer: DollarRecognizer;
	gestureCapture: GestureCapture;
	gestureManager: GestureManager;
	settingsTab: GestureCommanderSettingTab | null = null;

	async onload(): Promise<void> {
		await this.loadSettings();

		// Initialize gesture recognizer
		this.gestureRecognizer = new DollarRecognizer();

		// Initialize gesture manager
		this.gestureManager = new GestureManager(
			this.gestureRecognizer,
			this.settings,
			(commandId: string) => this.executeCommand(commandId),
		);

		// Reload saved gestures
		this.gestureManager.reloadGestures();

		// Initialize gesture capture
		this.initializeGestureCapture();

		// Add commands
		this.addCommand({
			id: "gesture-commander-create-gesture",
			name: "Create New Gesture",
			callback: () => this.openGestureCreationModal(),
		});

		this.addCommand({
			id: "gesture-commander-toggle",
			name: "Toggle Gesture Recognition",
			callback: () => this.toggleGestureRecognition(),
		});

		// Add settings tab
		this.settingsTab = new GestureCommanderSettingTab(this.app, this);
		this.addSettingTab(this.settingsTab);
	}

	onunload(): void {
		if (this.gestureCapture) {
			this.gestureCapture.disable();
		}
	}

	private initializeGestureCapture(): void {
		const captureSettings = {
			modifierKeys: this.settings.modifierKeys,
			minStrokeLength: this.settings.minStrokeLength,
			maxStrokeTime: this.settings.maxStrokeTime,
			enableVisualFeedback: this.settings.enableVisualFeedback,
		};

		this.gestureCapture = new GestureCapture(
			captureSettings,
			(stroke: GestureStroke) =>
				this.gestureManager.handleGestureComplete(stroke),
		);

		this.gestureCapture.enable();
	}

	/**
	 * Executes an Obsidian command by ID using the internal commands API
	 */
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

	/**
	 * Placeholder for future enable/disable gesture recognition functionality
	 */
	private toggleGestureRecognition(): void {
		if (this.gestureCapture) {
			new Notice(
				"Gesture recognition is active. Configure in settings to modify behavior.",
			);
		}
	}

	updateGestureCapture(): void {
		if (this.gestureCapture) {
			this.gestureCapture.updateSettings({
				modifierKeys: this.settings.modifierKeys,
				minStrokeLength: this.settings.minStrokeLength,
				maxStrokeTime: this.settings.maxStrokeTime,
				enableVisualFeedback: this.settings.enableVisualFeedback,
			});
		}
	}

	refreshSettingsTab(): void {
		if (this.settingsTab) {
			this.settingsTab.refreshGestureMappings();
		}
	}

	async loadSettings(): Promise<void> {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData(),
		);

		// Update gesture manager with new settings if it exists
		if (this.gestureManager) {
			this.gestureManager.updateSettings(this.settings);
			this.gestureManager.reloadGestures();
		}
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}
}
