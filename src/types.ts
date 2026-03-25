// --- Geometry ---

export interface Point {
	x: number;
	y: number;
}

export interface Rectangle {
	x: number;
	y: number;
	width: number;
	height: number;
}

// --- Modifier keys ---

export interface ModifierKeys {
	alt: boolean;
	shift: boolean;
	ctrl: boolean;
	meta: boolean;
	altGraph?: boolean;
}

// --- Gesture recognizer ---

export interface GestureTemplate {
	name: string;
	points: Point[];
	vector?: number[];
}

export interface RecognitionResult {
	name: string;
	score: number;
	time: number;
}

// --- Gesture capture ---

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

// --- Plugin settings ---

export interface GestureMapping {
	id: string;
	gestureName: string;
	commandId: string;
	commandName: string;
	enabled: boolean;
	minScore: number;
	originalPoints?: Point[];
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

// --- Obsidian commands ---

export interface Command {
	id: string;
	name?: string;
}
