// Copyright 2016, EMC, Inc.

import Vector from 'src-graph-canvas/lib/Vector';
import Rectangle from 'src-graph-canvas/lib/Rectangle';

export default class Circle {

  fromRectangle(rectangle, max, x, y) {
    rectangle = new Rectangle(rectangle, max, x, y);
    let center = rectangle.center,
        radius = rectangle.largestSide;
    return new Circle(center.x, center.y, radius);
  }

  constructor(x, y, radius) {
    if (x && !y && !radius) {
      switch (typeof x) {
        case 'number':
          radius = x;
          x = 0;
          y = 0;
          break;
        case 'object':
          radius = x.radius || x[2];
          y = x.y || y[1];
          x = x.x || x[0];
          break;
      }
    }
    else if (x && y && !radius) {
      radius = y;
      x = new Vector(x);
      y = x.y;
      x = x.x;
    }
    this.x = x || 0;
    this.y = y || 0;
    this.radius = radius || 1;
  }

  toArray() { return [this.x, this.y, this.radius]; }

  toString() { return this.toArray().toString(); }

  get x() { return this[0]; }
  set x(v) { return this[0] = v; }

  get y() { return this[1]; }
  set y(v) { return this[1] = v; }

  get radius() { return this[2]; }
  set radius(v) { return this[2] = v; }

  get diameter() { return this.radius * 2; }
  get circumference() { return Math.PI * this.diameter; }

  getStepSize(length) {
    return new Rectangle(
      this.getStep(2, length),
      this.getStep(1, length)
    );
  }

  getStep(index, length) {
    return new Vector(
      this.x + this.radius * Math.cos(2 * Math.PI * index / length),
      this.y + this.radius * Math.sin(2 * Math.PI * index / length)
    );
  }

  getSteps(length) {
    // debugger;
    const skip = 2,
          count = length + (skip * 2 * 2),
          quarter = Math.round(count / 4),
          subquarter = count - quarter,
          steps = [];
    let index = 0;
    for (; index < count; index += 1) {
      if (index >= (quarter - skip) && index < (quarter + skip)) continue;
      if (index > (subquarter - skip) && index <= (subquarter + skip)) continue;
      steps.push(this.getStep(index, count));
    }
    // console.log(steps);
    return steps;
  }
}
