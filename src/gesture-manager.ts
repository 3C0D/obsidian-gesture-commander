import { Notice } from "obsidian";
import type { DollarRecognizer } from "./gesture-recognizer.ts";
import type { GestureMapping, GestureStroke, GestureCommanderSettings } from "./types.ts";

/**
 * Manages gesture recognition and command execution
 */
export class GestureManager {
	private recognizer: DollarRecognizer;
	private settings: GestureCommanderSettings;
	private executeCommandCallback: (commandId: string) => void;

	constructor(
		recognizer: DollarRecognizer,
		settings: GestureCommanderSettings,
		executeCommandCallback: (commandId: string) => void
	) {
		this.recognizer = recognizer;
		this.settings = settings;
		this.executeCommandCallback = executeCommandCallback;
	}

	/**
	 * Updates the settings reference
	 */
	updateSettings(settings: GestureCommanderSettings): void {
		this.settings = settings;
	}

	/**
	 * Handles a completed gesture stroke by recognizing it and executing the mapped command
	 */
	handleGestureComplete(stroke: GestureStroke): void {
		const result = this.recognizer.recognize(stroke.points, this.settings.useProtractor);

		if (result.score >= this.settings.recognitionThreshold) {
			const mapping = this.findMatchingMapping(result.name, result.score);

			if (mapping) {
				this.executeCommandCallback(mapping.commandId);
				new Notice(`Command executed: ${mapping.commandName} (${(result.score * 100).toFixed(1)}%)`);
			} else {
				new Notice(
					`Gesture recognized as "${result.name}" but no command mapped (${(result.score * 100).toFixed(1)}%)`
				);
			}
		} else {
			new Notice(`Gesture not recognized (best match: ${(result.score * 100).toFixed(1)}%)`);
		}
	}

	/**
	 * Finds a gesture mapping that matches the recognized gesture name and score threshold
	 */
	private findMatchingMapping(gestureName: string, score: number): GestureMapping | undefined {
		return this.settings.gestureMappings.find(
			(m) => m.enabled && m.gestureName === gestureName && score >= m.minScore
		);
	}

	/**
	 * Reloads all gesture templates from settings into the recognizer
	 */
	reloadGestures(): void {
		// Clear existing templates
		this.recognizer.deleteUserGestures();

		// Remove any default gestures that might interfere
		this.recognizer.removeTemplatesByName("circle");
		this.recognizer.removeTemplatesByName("triangle");

		// Reload all gestures from settings
		this.settings.gestureMappings.forEach((mapping) => {
			if (mapping.originalPoints && mapping.originalPoints.length > 0) {
				this.recognizer.addGesture(mapping.gestureName, mapping.originalPoints);
			}
		});
	}
}
