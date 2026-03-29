/**
 * $1 Unistroke Recognizer (TypeScript adaptation for Obsidian)
 * Based on the original JavaScript implementation by Jacob O. Wobbrock, Andrew D. Wilson, and Yang Li
 *
 * Academic publication:
 * Wobbrock, J.O., Wilson, A.D. and Li, Y. (2007). Gestures without libraries, toolkits or training:
 * A $1 recognizer for user interface prototypes. Proceedings of the ACM Symposium on User Interface
 * Software and Technology (UIST '07). Newport, Rhode Island (October 7-10, 2007). New York: ACM Press, pp. 159-168.
 */

import type { Point, Rectangle, GestureTemplate, RecognitionResult } from './types.ts';
import {
	NUM_POINTS,
	SQUARE_SIZE,
	ORIGIN,
	HALF_DIAGONAL,
	ANGLE_RANGE,
	ANGLE_PRECISION,
	PHI
} from './constants.ts';

export type { Point, Rectangle, GestureTemplate, RecognitionResult };

/**
 * Implementation of the $1 Unistroke Recognizer algorithm.
 *
 * Recognizes single-stroke gestures by normalizing them (resample, rotate, scale, translate)
 * and comparing them against stored templates using path distance or the faster Protractor variant.
 *
 * Each gesture is stored as a normalized template. Recognition returns the closest match
 * and a confidence score between 0 and 1.
 */
export class DollarRecognizer {
	private templates: GestureTemplate[] = [];

	constructor() {
		this.loadDefaultTemplates();
	}

	/**
	 * Recognize a gesture from a series of points
	 */
	recognize(points: Point[], useProtractor = false): RecognitionResult {
		const startTime = Date.now();

		// Need at least 2 points to form a path
		if (points.length < 2) {
			return {
				name: 'No match',
				score: 0.0,
				time: Date.now() - startTime
			};
		}

		// Normalize the input the same way templates were normalized
		const candidate = this.createTemplate('', points);
		let bestMatch = -1;
		let bestDistance = Infinity;

		for (let i = 0; i < this.templates.length; i++) {
			let distance: number;

			if (useProtractor && candidate.vector && this.templates[i].vector) {
				// Protractor: faster cosine-based comparison
				distance = this.optimalCosineDistance(
					this.templates[i].vector!,
					candidate.vector!
				);
			} else {
				// Default $1: try all angles within ±45° to find best match
				distance = this.distanceAtBestAngle(
					candidate.points,
					this.templates[i],
					-ANGLE_RANGE,
					ANGLE_RANGE,
					ANGLE_PRECISION
				);
			}

			if (distance < bestDistance) {
				bestDistance = distance;
				bestMatch = i;
			}
		}

		const endTime = Date.now();

		if (bestMatch === -1) {
			return { name: 'No match', score: 0.0, time: endTime - startTime };
		}

		// Convert distance to a 0-1 score — 0 = no match, 1 = perfect match
		const score = useProtractor
			? 1.0 - bestDistance
			: 1.0 - bestDistance / HALF_DIAGONAL;
		return {
			name: this.templates[bestMatch].name,
			score: Math.max(0, score), // clamp to 0 in case of floating point drift
			time: endTime - startTime
		};
	}

	/**
	 * Add a new gesture template
	 */
	addGesture(name: string, points: Point[]): number {
		const template = this.createTemplate(name, points);
		this.templates.push(template);
		return this.templates.filter((t) => t.name === name).length;
	}

	/**
	 * Remove all user-defined gestures (keep only defaults)
	 */
	deleteUserGestures(): void {
		this.templates = [];
		this.loadDefaultTemplates();
	}

	/**
	 * Get all template names
	 */
	getTemplateNames(): string[] {
		return [...new Set(this.templates.map((t) => t.name))];
	}

	/**
	 * Get templates by name
	 */
	getTemplatesByName(name: string): GestureTemplate[] {
		return this.templates.filter((t) => t.name === name);
	}

	/**
	 * Remove templates by name
	 */
	removeTemplatesByName(name: string): void {
		this.templates = this.templates.filter((t) => t.name !== name);
	}

	/**
	 * Export all templates
	 */
	exportTemplates(): GestureTemplate[] {
		// Deep clone to avoid external mutation of internal state
		return JSON.parse(JSON.stringify(this.templates));
	}

	/**
	 * Import templates
	 */
	importTemplates(templates: GestureTemplate[]): void {
		this.templates = [];
		this.loadDefaultTemplates();

		templates.forEach((template) => {
			// Skip malformed entries
			if (template.name && template.points && Array.isArray(template.points)) {
				this.addGesture(template.name, template.points);
			}
		});
	}

	/**
	 * Creates a normalized gesture template from raw points using the $1 algorithm:
	 * 1. Resamples to fixed number of points
	 * 2. Rotates based on indicative angle
	 * 3. Scales to a square
	 * 4. Translates to origin
	 * 5. Creates vector representation for Protractor
	 */
	private createTemplate(name: string, points: Point[]): GestureTemplate {
		let processedPoints = this.resample(points, NUM_POINTS);
		const radians = this.indicativeAngle(processedPoints);
		processedPoints = this.rotateBy(processedPoints, -radians);
		processedPoints = this.scaleTo(processedPoints, SQUARE_SIZE);
		processedPoints = this.translateTo(processedPoints, ORIGIN);
		const vector = this.vectorize(processedPoints);

		return { name, points: processedPoints, vector };
	}

	/**
	 * Loads default gesture templates (currently empty to avoid interference)
	 */
	private loadDefaultTemplates(): void {
		// Intentionally empty — all gestures are user-defined
		// The original $1 library ships with built-in shapes (circle, triangle...)
		// which would interfere with user recognition
	}

	/**
	 * Resamples a path to have exactly n evenly-spaced points
	 */
	private resample(points: Point[], n: number): Point[] {
		const interval = this.pathLength(points) / (n - 1); // target spacing between points
		let distance = 0.0;
		const newPoints: Point[] = [points[0]];

		for (let i = 1; i < points.length; i++) {
			const d = this.distance(points[i - 1], points[i]);
			if (distance + d >= interval) {
				// Interpolate a new point exactly at the interval boundary
				const qx =
					points[i - 1].x +
					((interval - distance) / d) * (points[i].x - points[i - 1].x);
				const qy =
					points[i - 1].y +
					((interval - distance) / d) * (points[i].y - points[i - 1].y);
				const q: Point = { x: qx, y: qy };
				newPoints.push(q);
				// Insert q back into points so it becomes the new starting point
				points.splice(i, 0, q);
				distance = 0.0;
			} else {
				distance += d;
			}
		}

		// Floating point rounding can leave us one point short — pad with last point
		if (newPoints.length === n - 1) {
			newPoints.push({
				x: points[points.length - 1].x,
				y: points[points.length - 1].y
			});
		}

		return newPoints;
	}

	/**
	 * Calculates the indicative angle from centroid to first point
	 */
	private indicativeAngle(points: Point[]): number {
		const c = this.centroid(points);
		return Math.atan2(c.y - points[0].y, c.x - points[0].x);
	}

	/**
	 * Rotates all points by the given angle (in radians) around their centroid
	 */
	private rotateBy(points: Point[], radians: number): Point[] {
		const c = this.centroid(points);
		const cos = Math.cos(radians);
		const sin = Math.sin(radians);
		const newPoints: Point[] = [];

		for (const point of points) {
			// Standard 2D rotation matrix around centroid
			const qx = (point.x - c.x) * cos - (point.y - c.y) * sin + c.x;
			const qy = (point.x - c.x) * sin + (point.y - c.y) * cos + c.y;
			newPoints.push({ x: qx, y: qy });
		}

		return newPoints;
	}

	/**
	 * Scales all points to fit within a square of the given size
	 */
	private scaleTo(points: Point[], size: number): Point[] {
		const boundingBox = this.boundingBox(points);
		const newPoints: Point[] = [];

		for (const point of points) {
			// Scale each axis independently to fill the square
			const qx = point.x * (size / boundingBox.width);
			const qy = point.y * (size / boundingBox.height);
			newPoints.push({ x: qx, y: qy });
		}

		return newPoints;
	}

	/**
	 * Translates all points so their centroid is at the given point
	 */
	private translateTo(points: Point[], pt: Point): Point[] {
		const c = this.centroid(points);
		const newPoints: Point[] = [];

		for (const point of points) {
			const qx = point.x + pt.x - c.x;
			const qy = point.y + pt.y - c.y;
			newPoints.push({ x: qx, y: qy });
		}

		return newPoints;
	}

	/**
	 * Creates a normalized vector representation of the points for Protractor algorithm
	 */
	private vectorize(points: Point[]): number[] {
		let sum = 0.0;
		const vector: number[] = [];

		for (const point of points) {
			vector.push(point.x, point.y);
			sum += point.x * point.x + point.y * point.y;
		}

		// Normalize to unit vector so comparison is angle-based, not magnitude-based
		const magnitude = Math.sqrt(sum);
		for (let i = 0; i < vector.length; i++) {
			vector[i] /= magnitude;
		}

		return vector;
	}

	/**
	 * Calculates the optimal cosine distance between two vectors (Protractor algorithm)
	 */
	private optimalCosineDistance(v1: number[], v2: number[]): number {
		let a = 0.0;
		let b = 0.0;

		for (let i = 0; i < v1.length; i += 2) {
			a += v1[i] * v2[i] + v1[i + 1] * v2[i + 1];
			b += v1[i] * v2[i + 1] - v1[i + 1] * v2[i];
		}

		// Find the optimal rotation angle then compute the cosine distance
		const angle = Math.atan(b / a);
		return Math.acos(a * Math.cos(angle) + b * Math.sin(angle));
	}

	/**
	 * Uses golden section search to find the angle that minimizes distance between gestures
	 */
	private distanceAtBestAngle(
		points: Point[],
		template: GestureTemplate,
		a: number,
		b: number,
		threshold: number
	): number {
		// Golden section search — narrows the angle range until precision threshold is reached
		let x1 = PHI * a + (1.0 - PHI) * b;
		let f1 = this.distanceAtAngle(points, template, x1);
		let x2 = (1.0 - PHI) * a + PHI * b;
		let f2 = this.distanceAtAngle(points, template, x2);

		while (Math.abs(b - a) > threshold) {
			if (f1 < f2) {
				b = x2;
				x2 = x1;
				f2 = f1;
				x1 = PHI * a + (1.0 - PHI) * b;
				f1 = this.distanceAtAngle(points, template, x1);
			} else {
				a = x1;
				x1 = x2;
				f1 = f2;
				x2 = (1.0 - PHI) * a + PHI * b;
				f2 = this.distanceAtAngle(points, template, x2);
			}
		}

		return Math.min(f1, f2);
	}

	/**
	 * Calculates the distance between points and template at a specific rotation angle
	 */
	private distanceAtAngle(
		points: Point[],
		template: GestureTemplate,
		radians: number
	): number {
		const newPoints = this.rotateBy(points, radians);
		return this.pathDistance(newPoints, template.points);
	}

	/**
	 * Calculates the geometric center (centroid) of a set of points
	 */
	private centroid(points: Point[]): Point {
		let x = 0.0;
		let y = 0.0;

		for (const point of points) {
			x += point.x;
			y += point.y;
		}

		return { x: x / points.length, y: y / points.length };
	}

	/**
	 * Calculates the bounding box that contains all points
	 */
	private boundingBox(points: Point[]): Rectangle {
		let minX = Infinity;
		let maxX = -Infinity;
		let minY = Infinity;
		let maxY = -Infinity;

		for (const point of points) {
			minX = Math.min(minX, point.x);
			minY = Math.min(minY, point.y);
			maxX = Math.max(maxX, point.x);
			maxY = Math.max(maxY, point.y);
		}

		return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
	}

	/**
	 * Calculates the average distance between corresponding points in two paths
	 */
	private pathDistance(pts1: Point[], pts2: Point[]): number {
		let d = 0.0;
		for (let i = 0; i < pts1.length; i++) {
			d += this.distance(pts1[i], pts2[i]);
		}
		return d / pts1.length;
	}

	/**
	 * Calculates the total length of a path by summing distances between consecutive points
	 */
	private pathLength(points: Point[]): number {
		let d = 0.0;
		for (let i = 1; i < points.length; i++) {
			d += this.distance(points[i - 1], points[i]);
		}
		return d;
	}

	/**
	 * Calculates the Euclidean distance between two points
	 */
	private distance(p1: Point, p2: Point): number {
		const dx = p2.x - p1.x;
		const dy = p2.y - p1.y;
		return Math.sqrt(dx * dx + dy * dy);
	}
}
