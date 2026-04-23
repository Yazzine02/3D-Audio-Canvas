// BehaviorManager manages steering behaviors for a vehicle, including
// weighted behavior activation, combined steering force calculation,
// and boid-style flocking with optional boundary avoidance.
class BehaviorManager {
  constructor(vehicle) {
    this.vehicle = vehicle;
    this.activeBehaviors = []; // array of { type: string, weight: number }

    // Flocking specific weights (modifiable on UI)
    this.alignWeight = 1.0;
    this.cohesionWeight = 1.0;
    this.separationWeight = 1.25;
    this.boundariesWeight = 1.0;
  }

  // Add or update a behavior with a specific weight
  // weight 0 or below removes the behavior
  setBehaviorWeight(type, weight) {
    // lookup existing behavior slot
    let existing = this.activeBehaviors.find((b) => b.type === type);
    if (existing) {
      if (weight <= 0) {
        this.removeBehavior(type);
      } else {
        existing.weight = weight;
      }
    } else if (weight > 0) {
      this.activeBehaviors.push({ type, weight });
    }
  }

  // Remove a behavior by type
  removeBehavior(type) {
    this.activeBehaviors = this.activeBehaviors.filter((b) => b.type !== type);
  }

  // Clear all behaviors
  clear() {
    this.activeBehaviors = [];
  }

  // Calculate the combined steering force based on weighted sum
  calculate(targetObj) {
    let totalForce = BABYLON.Vector3.Zero();

    // build force contribution for each active behavior
    for (let b of this.activeBehaviors) {
      let force = BABYLON.Vector3.Zero();

      // choose behavior function based on type
      switch (b.type) {
        case "Seek":
          if (targetObj) force = this.vehicle.seek(targetObj.position);
          break;
        case "Flee":
          if (targetObj) force = this.vehicle.flee(targetObj.position);
          break;
        case "Arrive":
          if (targetObj) force = this.vehicle.arrive(targetObj.position);
          break;
        case "Pursue":
          if (targetObj) force = this.vehicle.pursue(targetObj);
          break;
        case "Evade":
          if (targetObj) force = this.vehicle.evade(targetObj);
          break;
        case "Avoid":
          if (targetObj && targetObj.obstacles) {
            // ensure targetObj has obstacles set
            force = this.vehicle.avoid(targetObj.obstacles);
          }
          break;
        case "Wander":
          force = this.vehicle.wander();
          break;
        case "Align":
          if (targetObj && targetObj.boids) {
            // ensure targetObj has boids entities set
            force = this.vehicle.align(targetObj.boids);
          }
          break;
        case "Separation":
          if (targetObj && targetObj.boids) {
            // ensure targetObj has boids entities set
            force = this.vehicle.separation(targetObj.boids);
          }
          break;
        case "Cohesion":
          if (targetObj && targetObj.boids) {
            // ensure targetObj has boids entities set
            force = this.vehicle.cohesion(targetObj.boids);
          }
          break;
      }

      // Multiply the calculated force by its weight and add to total
      force.scaleInPlace(b.weight);
      totalForce.addInPlace(force);
    }

    // Truncate the combined sum so it never exceeds the vehicle's max force
    return this.vehicle.clampToMax(totalForce, this.vehicle.maxForce);
  }

  // Flocks the vehicle with the boids using the three core boids rules + optional boundary force
  flock(boids, boundaryConfig) {
    // compute boids steering components
    let alignment = this.vehicle.align(boids).scale(this.alignWeight);
    let cohesion = this.vehicle.cohesion(boids).scale(this.cohesionWeight);
    let separation = this.vehicle
      .separation(boids)
      .scale(this.separationWeight);

    // add boundary avoidance force if configured
    let boundaries = BABYLON.Vector3.Zero();
    if (boundaryConfig && typeof this.vehicle.boundaries === "function") {
      boundaries = this.vehicle
        .boundaries(
          boundaryConfig.x,
          boundaryConfig.y,
          boundaryConfig.width,
          boundaryConfig.height,
          boundaryConfig.distance,
        )
        .scale(this.boundariesWeight);
    }

    // combine flocking forces and apply to vehicle steering force
    let totalFlock = alignment.add(cohesion).add(separation).add(boundaries);
    this.vehicle.steeringForce.addInPlace(totalFlock);
  }
}
