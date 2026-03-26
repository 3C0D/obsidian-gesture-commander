import { deg2Rad } from "./utils.ts";

// $1 Recognizer

// Number of points each gesture is resampled to before comparison.
// 64 is the value from the original paper — enough resolution for smooth shapes
// without being too expensive to compute.
export const NUM_POINTS = 64;

// All gestures are scaled to fit inside a 250x250 virtual square before comparison.
// This makes recognition size-invariant — a small circle and a large circle match the same template.
// 250 is arbitrary but large enough to preserve shape detail after integer rounding.
export const SQUARE_SIZE = 250.0;

// The origin point used to center all gestures after normalization.
// translateTo() moves each gesture's centroid to this point, so all gestures
// share the same coordinate space (roughly -125 to +125 on each axis).
// The value (0,0) is arbitrary — (125,125) would work equally well.
export const ORIGIN = { x: 0, y: 0 };

// The diagonal of the 250x250 square (≈ 353.5).
// Used to normalize the path distance into a 0-1 score:
// a gesture perfectly matching its template has distance 0 → score 1,
// a gesture as far as possible (diagonal) has distance HALF_DIAGONAL → score 0.
export const DIAGONAL = Math.sqrt(SQUARE_SIZE * SQUARE_SIZE + SQUARE_SIZE * SQUARE_SIZE);
export const HALF_DIAGONAL = 0.5 * DIAGONAL;

// The angle range searched during recognition: ±45° around the gesture's indicative angle.
// Wider = more rotation-invariant but slower. 45° is the paper's recommended value.
export const ANGLE_RANGE = deg2Rad(45.0);

// The precision of the golden section search within the angle range.
// 2° gives a good balance between accuracy and performance.
export const ANGLE_PRECISION = deg2Rad(2.0);

// The golden ratio, used by the golden section search algorithm to efficiently
// narrow down the best matching angle without testing every possible value.
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
