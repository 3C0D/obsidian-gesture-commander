/**
 * $1 Unistroke Recognizer (TypeScript adaptation for Obsidian)
 * Based on the original JavaScript implementation by Jacob O. Wobbrock, Andrew D. Wilson, and Yang Li
 * 
 * Academic publication:
 * Wobbrock, J.O., Wilson, A.D. and Li, Y. (2007). Gestures without libraries, toolkits or training: 
 * A $1 recognizer for user interface prototypes. Proceedings of the ACM Symposium on User Interface 
 * Software and Technology (UIST '07). Newport, Rhode Island (October 7-10, 2007). New York: ACM Press, pp. 159-168.
 */

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

export interface GestureTemplate {
  name: string;
  points: Point[];
  vector?: number[]; // for Protractor enhancement
}

export interface RecognitionResult {
  name: string;
  score: number;
  time: number;
}

// Constants
const NUM_POINTS = 64;
const SQUARE_SIZE = 250.0;
const ORIGIN: Point = { x: 0, y: 0 };
const DIAGONAL = Math.sqrt(SQUARE_SIZE * SQUARE_SIZE + SQUARE_SIZE * SQUARE_SIZE);
const HALF_DIAGONAL = 0.5 * DIAGONAL;
const ANGLE_RANGE = deg2Rad(45.0);
const ANGLE_PRECISION = deg2Rad(2.0);
const PHI = 0.5 * (-1.0 + Math.sqrt(5.0)); // Golden Ratio

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

    if (points.length < 2) {
      return { name: "No match", score: 0.0, time: Date.now() - startTime };
    }

    const candidate = this.createTemplate("", points);
    let bestMatch = -1;
    let bestDistance = Infinity;

    for (let i = 0; i < this.templates.length; i++) {
      let distance: number;

      if (useProtractor && candidate.vector && this.templates[i].vector) {
        distance = this.optimalCosineDistance(this.templates[i].vector!, candidate.vector!);
      } else {
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
      return { name: "No match", score: 0.0, time: endTime - startTime };
    }

    const score = useProtractor ? (1.0 - bestDistance) : (1.0 - bestDistance / HALF_DIAGONAL);
    return {
      name: this.templates[bestMatch].name,
      score: Math.max(0, score),
      time: endTime - startTime
    };
  }

  /**
   * Add a new gesture template
   */
  addGesture(name: string, points: Point[]): number {
    const template = this.createTemplate(name, points);
    this.templates.push(template);

    // Count how many templates with this name exist
    return this.templates.filter(t => t.name === name).length;
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
    return [...new Set(this.templates.map(t => t.name))];
  }

  /**
   * Get templates by name
   */
  getTemplatesByName(name: string): GestureTemplate[] {
    return this.templates.filter(t => t.name === name);
  }

  /**
   * Remove templates by name
   */
  removeTemplatesByName(name: string): void {
    this.templates = this.templates.filter(t => t.name !== name);
  }

  /**
   * Export all templates
   */
  exportTemplates(): GestureTemplate[] {
    return JSON.parse(JSON.stringify(this.templates));
  }

  /**
   * Import templates
   */
  importTemplates(templates: GestureTemplate[]): void {
    this.templates = [];
    this.loadDefaultTemplates();

    templates.forEach(template => {
      if (template.name && template.points && Array.isArray(template.points)) {
        this.addGesture(template.name, template.points);
      }
    });
  }

  private createTemplate(name: string, points: Point[]): GestureTemplate {
    // Resample to fixed number of points
    let processedPoints = this.resample(points, NUM_POINTS);

    // Rotate based on indicative angle
    const radians = this.indicativeAngle(processedPoints);
    processedPoints = this.rotateBy(processedPoints, -radians);

    // Scale to square
    processedPoints = this.scaleTo(processedPoints, SQUARE_SIZE);

    // Translate to origin
    processedPoints = this.translateTo(processedPoints, ORIGIN);

    // Create vector for Protractor
    const vector = this.vectorize(processedPoints);

    return {
      name,
      points: processedPoints,
      vector
    };
  }

  private loadDefaultTemplates(): void {
    // No default templates - only user-defined gestures
    // This prevents interference with user's custom gestures
  }

  // Private helper methods
  private resample(points: Point[], n: number): Point[] {
    const interval = this.pathLength(points) / (n - 1);
    let distance = 0.0;
    const newPoints: Point[] = [points[0]];

    for (let i = 1; i < points.length; i++) {
      const d = this.distance(points[i - 1], points[i]);
      if ((distance + d) >= interval) {
        const qx = points[i - 1].x + ((interval - distance) / d) * (points[i].x - points[i - 1].x);
        const qy = points[i - 1].y + ((interval - distance) / d) * (points[i].y - points[i - 1].y);
        const q: Point = { x: qx, y: qy };
        newPoints.push(q);
        points.splice(i, 0, q);
        distance = 0.0;
      } else {
        distance += d;
      }
    }

    if (newPoints.length === n - 1) {
      newPoints.push({ x: points[points.length - 1].x, y: points[points.length - 1].y });
    }

    return newPoints;
  }

  private indicativeAngle(points: Point[]): number {
    const c = this.centroid(points);
    return Math.atan2(c.y - points[0].y, c.x - points[0].x);
  }

  private rotateBy(points: Point[], radians: number): Point[] {
    const c = this.centroid(points);
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    const newPoints: Point[] = [];

    for (const point of points) {
      const qx = (point.x - c.x) * cos - (point.y - c.y) * sin + c.x;
      const qy = (point.x - c.x) * sin + (point.y - c.y) * cos + c.y;
      newPoints.push({ x: qx, y: qy });
    }

    return newPoints;
  }

  private scaleTo(points: Point[], size: number): Point[] {
    const boundingBox = this.boundingBox(points);
    const newPoints: Point[] = [];

    for (const point of points) {
      const qx = point.x * (size / boundingBox.width);
      const qy = point.y * (size / boundingBox.height);
      newPoints.push({ x: qx, y: qy });
    }

    return newPoints;
  }

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

  private vectorize(points: Point[]): number[] {
    let sum = 0.0;
    const vector: number[] = [];

    for (const point of points) {
      vector.push(point.x, point.y);
      sum += point.x * point.x + point.y * point.y;
    }

    const magnitude = Math.sqrt(sum);
    for (let i = 0; i < vector.length; i++) {
      vector[i] /= magnitude;
    }

    return vector;
  }

  private optimalCosineDistance(v1: number[], v2: number[]): number {
    let a = 0.0;
    let b = 0.0;

    for (let i = 0; i < v1.length; i += 2) {
      a += v1[i] * v2[i] + v1[i + 1] * v2[i + 1];
      b += v1[i] * v2[i + 1] - v1[i + 1] * v2[i];
    }

    const angle = Math.atan(b / a);
    return Math.acos(a * Math.cos(angle) + b * Math.sin(angle));
  }

  private distanceAtBestAngle(points: Point[], template: GestureTemplate, a: number, b: number, threshold: number): number {
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

  private distanceAtAngle(points: Point[], template: GestureTemplate, radians: number): number {
    const newPoints = this.rotateBy(points, radians);
    return this.pathDistance(newPoints, template.points);
  }

  private centroid(points: Point[]): Point {
    let x = 0.0;
    let y = 0.0;

    for (const point of points) {
      x += point.x;
      y += point.y;
    }

    return { x: x / points.length, y: y / points.length };
  }

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

  private pathDistance(pts1: Point[], pts2: Point[]): number {
    let d = 0.0;
    for (let i = 0; i < pts1.length; i++) {
      d += this.distance(pts1[i], pts2[i]);
    }
    return d / pts1.length;
  }

  private pathLength(points: Point[]): number {
    let d = 0.0;
    for (let i = 1; i < points.length; i++) {
      d += this.distance(points[i - 1], points[i]);
    }
    return d;
  }

  private distance(p1: Point, p2: Point): number {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
}

function deg2Rad(d: number): number {
  return (d * Math.PI / 180.0);
}
