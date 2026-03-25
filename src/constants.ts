import { deg2Rad } from "./utils.ts";

// $1 Recognizer
export const NUM_POINTS = 64;
export const SQUARE_SIZE = 250.0;
export const ORIGIN = { x: 0, y: 0 };
export const DIAGONAL = Math.sqrt(SQUARE_SIZE * SQUARE_SIZE + SQUARE_SIZE * SQUARE_SIZE);
export const HALF_DIAGONAL = 0.5 * DIAGONAL;
export const ANGLE_RANGE = deg2Rad(45.0);
export const ANGLE_PRECISION = deg2Rad(2.0);
export const PHI = 0.5 * (-1.0 + Math.sqrt(5.0));

// Plugin defaults
export const DEFAULT_SETTINGS = {
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
	recognitionThreshold: 0.6,
	useProtractor: false
};
