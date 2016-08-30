// Copyright 2016, EMC, Inc.

import Vector from 'src-graph-canvas/lib/Vector';

export default class PolarVector {

  fromCartesianVector(vector, y) {
    vector = new Vector(vector, y);
    return new PolarVector(
      Math.atan2(vector.y, vector.x),
      Math.sqrt(vector.x * vector.x, vector.y * vector.y)
    );
  }

  constructor(radians, distance) {
    if (radians && typeof radians === 'object') {
      distance = radians.distance || radians[1];
      radians = radians.radians || radians[0];
    }
    this.radians = radians || 0;
    this.distance = distance || 0;
  }

  toCartesianVector() {
    return new Vector(
      this.distance * Math.cos(this.radians),
      this.distance * Math.sin(this.radians)
    );
  }

  toArray() { return [this.radians, this.distance]; }

  toString() { return this.toArray().toString(); }

  get radians() { return this[0]; }
  set radians(v) { return this[0] = v; }

  get distance() { return this[1]; }
  set distance(v) { return this[2] = v; }

  get degrees() {
    return this.radians * (180 / Math.PI);
  }

}
