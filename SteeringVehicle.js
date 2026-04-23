// SteeringVehicle is Reynolds style steering behavior implementation for Babylon.js.
// It includes basic behaviors like seek, flee, arrive, pursue, evade, wander,
// as well as boid compatible style flocking with optional boundary avoidance.
// This class containns the core steering logic and is the basis for any game object that needs to move usng steering behaviors.
//  This should not be modified directly for specific game logic, but can be extended or used as a component in a larger game object class.
class SteeringVehicle {
  constructor(mesh) {
    this.mesh = mesh;
    this.position = mesh.position;
    this.velocity = new BABYLON.Vector3(0.1, 0, 0.1);
    this.steeringForce = new BABYLON.Vector3(0, 0, 0);

    this.maxSpeed = 50.0;
    this.maxForce = 200.0;
    this.mass = 1.0;
    this.slowingRadius = 32.0;

    this.wanderAngle = -Math.PI / 2;
    this.wanderDistance = 8.0;
    this.wanderRadius = 1.0;
    this.wanderJitter = 0.4;

    this.largeurEvitement = 2.0; // radius of the vehicle for collision avoidance
    this.hauteurEvitement = 5.0; // how far ahead the avoidance should look
    this.largeurZoneEvitementDevantVaisseau = this.largeurEvitement / 2;
    this.ahead1Factor = 0.5; // How far ahead to check for collisions (in seconds)
    this.ahead2Factor = 0.5; // Secondary ahead point for better collision detection (in seconds)

    // Attach the Behavior Manager
    // Central behavior blend manager used by flock and weighted steering
    this.behaviorManager = new BehaviorManager(this);
    // calculate the nose position for debugging purposes
    this.noseOffset = new BABYLON.Vector3(0, 0.5, 1);
    // holds Gatekeeper debug meshes for deterministic disposal
    this.debugMeshes = [];
  }

  update(dt) {
    // Adding gravity for physic jumps
    // We reduced the multiplier so that vehicles seeking an aerial target can overcome it
    if (window.physicJump) {
      this.steeringForce.y -= 9.81 * this.mass * 2.5;
    }

    // Integrate steering force into acceleration velocity then position
    let acceleration = this.steeringForce.scale(1 / this.mass);
    this.velocity.addInPlace(acceleration.scale(dt));
    this.velocity = this.clampToMax(this.velocity, this.maxSpeed);
    this.position.addInPlace(this.velocity.scale(dt));
    this.steeringForce.setAll(0);

    // Rotate mesh to follow travel direction when moving
    if (this.velocity.lengthSquared() > 0.001) {
      let lookAtPos = this.position.add(this.velocity);
      this.mesh.lookAt(lookAtPos);
    }
  }

  // Bonce the vehicle off the ground borders to keep them contained in the scene ground plane
  edges(groundWidth, groundHeight) {
    // Keep vehicle inside ground limits using bounce on x and z
    const halfWidth = groundWidth / 2;
    const halfHeight = groundHeight / 2;

    if (this.position.x > halfWidth) {
      this.position.x = halfWidth;
      this.velocity.x *= -1;
    } else if (this.position.x < -halfWidth) {
      this.position.x = -halfWidth;
      this.velocity.x *= -1;
    }

    if (this.position.z > halfHeight) {
      this.position.z = halfHeight;
      this.velocity.z *= -1;
    } else if (this.position.z < -halfHeight) {
      this.position.z = -halfHeight;
      this.velocity.z *= -1;
    }

    // Clamp y so vehicles do not sink below floor plane
    if (this.position.y < 0.5) {
      this.position.y = 0.5;
      if (this.velocity.y < 0) this.velocity.y = 0;
    }
  }

  // Apply all active behaviors dynamically based on weights
  applyComplexBehaviors(targetObj, debug = false) {
    let combinedForce = this.behaviorManager.calculate(targetObj);
    this.steeringForce.addInPlace(combinedForce);
  }

  // Single behavior entry point used by UI and target controller
  applyBehavior(behaviorType, targetObj) {
    let force = BABYLON.Vector3.Zero();
    switch (behaviorType) {
      case "Seek":
        force = this.seek(targetObj.position);
        break;
      case "Flee":
        force = this.flee(targetObj.position);
        break;
      case "Arrive":
        force = this.arrive(targetObj.position);
        break;
      case "Pursue":
        force = this.pursue(targetObj);
        break;
      case "Evade":
        force = this.evade(targetObj);
        break;
      case "Avoid":
        if (targetObj && targetObj.obstacles) {
          force = this.avoid(targetObj.obstacles);
        }
        // Give it a tiny forward push so it doesn't freeze when no obstacles are around
        if (force.lengthSquared() < 0.001) {
          let forwardForward =
            this.velocity.lengthSquared() > 0.001
              ? this.velocity.clone().normalizeToNew()
              : new BABYLON.Vector3(0, 0, 1);
          force = forwardForward.scale(this.maxForce * 0.1);
        }
        break;
      case "Wander":
        force = this.wander();
        break;
      case "Align":
        if (targetObj && targetObj.boids) {
          force = this.align(targetObj.boids);
        }
        break;
      case "Separation":
        if (targetObj && targetObj.boids) {
          force = this.separation(targetObj.boids);
        }
        break;
      case "Cohesion":
        if (targetObj && targetObj.boids) {
          force = this.cohesion(targetObj.boids);
        }
        break;
    }
    // Accumulate force so multiple calls can compose in one frame
    this.steeringForce.addInPlace(force);
  }

  align(boids) {
    // Match heading with nearby neighbors
    let perceptionRadius = this.perceptionRadius || 10;
    let steering = new BABYLON.Vector3(0, 0, 0);
    let total = 0;

    for (let other of boids) {
      if (other !== this) {
        let d = BABYLON.Vector3.Distance(this.position, other.position);
        if (d < perceptionRadius) {
          steering.addInPlace(other.velocity);
          total++;
        }
      }
    }

    if (total > 0) {
      steering.scaleInPlace(1 / total);
      steering = steering.normalizeToNew().scale(this.maxSpeed);
      steering.subtractInPlace(this.velocity);
      steering = this.clampToMax(steering, this.maxForce);
    }

    return steering;
  }

  separation(boids) {
    // Push away from close neighbors to avoid overlap
    let perceptionRadius = this.perceptionRadius || 10;
    let steering = new BABYLON.Vector3(0, 0, 0);
    let total = 0;

    for (let other of boids) {
      if (other !== this) {
        let d = BABYLON.Vector3.Distance(this.position, other.position);
        if (d < perceptionRadius && d > 0.001) {
          let diff = this.position.subtract(other.position);
          diff.normalize();
          diff.scaleInPlace(1 / d);
          steering.addInPlace(diff);
          total++;
        }
      }
    }

    if (total > 0) {
      steering.scaleInPlace(1 / total);
      steering = steering.normalizeToNew().scale(this.maxSpeed);
      steering.subtractInPlace(this.velocity);
      steering = this.clampToMax(steering, this.maxForce);
    }

    return steering;
  }

  cohesion(boids) {
    // Pull toward local group center for flock coherence
    let perceptionRadius = (this.perceptionRadius || 10) * 2;
    let steering = new BABYLON.Vector3(0, 0, 0);
    let total = 0;

    for (let other of boids) {
      if (other !== this) {
        let d = BABYLON.Vector3.Distance(this.position, other.position);
        if (d < perceptionRadius) {
          steering.addInPlace(other.position);
          total++;
        }
      }
    }

    if (total > 0) {
      steering.scaleInPlace(1 / total);
      steering.subtractInPlace(this.position);
      // Inplace mutates the existing vector saving memory allocation
      steering.normalize().scaleInPlace(this.maxSpeed);
      steering.subtractInPlace(this.velocity);
      steering = this.clampToMax(steering, this.maxForce);
    }

    return steering;
  }

  boundaries(x, y, width, height, distance) {
    // Build corrective steering when approaching rectangle borders
    let desired = new BABYLON.Vector3(0, 0, 0);

    if (this.position.x < x + distance) {
      desired.x = this.maxSpeed;
    } else if (this.position.x > x + width - distance) {
      desired.x = -this.maxSpeed;
    }

    if (this.position.z < y + distance) {
      desired.z = this.maxSpeed;
    } else if (this.position.z > y + height - distance) {
      desired.z = -this.maxSpeed;
    }

    if (desired.lengthSquared() > 0.0001) {
      desired.normalize().scaleInPlace(this.maxSpeed);
      let steer = desired.subtract(this.velocity);
      return this.clampToMax(steer, this.maxForce);
    }

    return BABYLON.Vector3.Zero();
  }

  clearDebugMeshes() {
    if (this.debugMeshes) {
      this.debugMeshes.forEach((m) => {
        if (m.mesh && !m.mesh.isDisposed()) {
          m.mesh.dispose();
        }
      });
      this.debugMeshes = [];
    }
  }

  // Dispose debug meshes that have expired to prevent memory leaks and visual clutter
  pruneDebugMeshes(forceDispose = false) {
    // if forceDispose is true dispose all immediately (we use it when switching behaviors)
    if (forceDispose) {
      this.clearDebugMeshes();
      return;
    }

    const now = performance.now();
    this.debugMeshes = this.debugMeshes.filter((entry) => {
      if (entry.expireAt <= now) {
        if (entry.mesh && !entry.mesh.isDisposed()) {
          entry.mesh.dispose();
        }
        return false;
      }
      return true;
    });
  }

  // Draw debug traces only for currently active weighted behaviors
  drawComplexBehaviorDebug(targetObj) {
    this.pruneDebugMeshes(false);
    this.behaviorManager.activeBehaviors.forEach((b) => {
      this.drawDebug(b.type, targetObj);
    });
  }

  drawDebug(behaviorType, targetObj) {
    let disposeTime = 24; // Increased dispose time so it doesn't flicker out on low framerates

    const makeLine = (points, color) => {
      let line = BABYLON.MeshBuilder.CreateLines(
        "line_" + Math.random().toString(36).substr(2, 9),
        { points },
        this.mesh.getScene(),
      );
      line.color = color;

      this.debugMeshes.push({
        mesh: line,
        expireAt: performance.now() + disposeTime,
      });
      return line;
    };

    // console.log("behaviorType", behaviorType, "targetObj", targetObj);

    if (this.velocity.lengthSquared() > 0.001) {
      let pos = new BABYLON.Vector3(
        this.position.x,
        this.position.y + this.noseOffset.y,
        this.position.z,
      );
      makeLine(
        [pos, pos.add(this.velocity.scale(1))],
        new BABYLON.Color3(1, 0, 0),
      );
    }

    // if seeking or fleeing, draw a line to the target
    if (["Seek", "Flee", "Arrive"].includes(behaviorType)) {
      let targetPos = targetObj.position;
      makeLine([this.position, targetPos], new BABYLON.Color3(0, 0, 1));
    }

    // if arriving, draw the slowing radius
    if (behaviorType === "Arrive") {
      makeLine(
        Array.from({ length: 21 }, (_, i) => {
          let angle = (i / 20) * Math.PI * 2;
          return targetObj.position.add(
            new BABYLON.Vector3(
              Math.cos(angle) * this.slowingRadius,
              0,
              Math.sin(angle) * this.slowingRadius,
            ),
          );
        }),
        new BABYLON.Color3(0, 0, 1),
      );
    }

    // if avoid behavior, draw detection rectangle + ahead points
    if (["Avoid"].includes(behaviorType)) {
      let forward =
        this.velocity.lengthSquared() > 0.001
          ? this.velocity.clone().normalizeToNew()
          : new BABYLON.Vector3(0, 0, 1);

      // ahead must scale with velocity not just forward
      let aheadOffset = this.velocity.scale(this.ahead1Factor);
      let aheadPoint = this.position.add(aheadOffset);

      // detection rectangle in front of vehicle
      let halfWidth = this.largeurEvitement / 2;
      let right = new BABYLON.Vector3(
        -forward.z,
        0,
        forward.x,
      ).normalizeToNew();

      // Calculate the 4 corners of the ahead1 rectangle:
      // Base of the rectangle (Back corners at the vehicle's position)
      let r1p1 = this.position.subtract(right.scale(halfWidth)); // Back Left
      let r1p2 = this.position.add(right.scale(halfWidth)); // Back Right

      // Front of the rectangle (Front corners at the furthest look-ahead point)
      let r1p3 = aheadPoint.subtract(right.scale(halfWidth)); // Front Left
      let r1p4 = aheadPoint.add(right.scale(halfWidth)); // Front Right

      makeLine([r1p1, r1p3, r1p4, r1p2, r1p1], new BABYLON.Color3(0, 1, 1));

      // Calculate the 4 corners of the ahead2 rectangle:
      let ahead2Offset = aheadOffset.scale(this.ahead2Factor);
      let aheadPoint2 = this.position.add(ahead2Offset);
      let halfWidthInner = this.largeurEvitement / 2;

      // Build the points using the vehicle's position and the new aheadPoint2
      let r2p1 = this.position.subtract(right.scale(halfWidthInner)); // Back Left
      let r2p2 = this.position.add(right.scale(halfWidthInner)); // Back Right
      let r2p3 = aheadPoint2.subtract(right.scale(halfWidthInner)); // Front Left
      let r2p4 = aheadPoint2.add(right.scale(halfWidthInner)); // Front Right

      makeLine([r2p1, r2p3, r2p4, r2p2, r2p1], new BABYLON.Color3(1, 0, 1));
    }

    // if pursuing or evading, draw the ahead point and line to the predicted position
    if (["Pursue", "Evade"].includes(behaviorType)) {
      let aheadPoint = this.position.add(
        this.velocity.normalizeToNew().scale(10),
      );
      makeLine([this.position, aheadPoint], new BABYLON.Color3(1, 1, 0));
    }

    // if wandering, draw the wander circle and target point
    if (behaviorType === "Wander") {
      let forward =
        this.velocity.lengthSquared() > 0.001
          ? this.velocity.clone().normalizeToNew()
          : new BABYLON.Vector3(0, 0, 1);

      let circleCenter = this.position.add(forward.scale(this.wanderDistance));
      let heading = Math.atan2(this.velocity.z, this.velocity.x);

      // Line from vehicle to the circle's center for wander distance
      makeLine([this.position, circleCenter], new BABYLON.Color3(1, 1, 1));

      // Wander Radius is the circle drawn
      makeLine(
        Array.from({ length: 21 }, (_, i) => {
          let angle = (i / 20) * Math.PI * 2;
          return circleCenter.add(
            new BABYLON.Vector3(
              Math.cos(angle) * this.wanderRadius,
              0,
              Math.sin(angle) * this.wanderRadius,
            ),
          );
        }),
        new BABYLON.Color3(0, 1, 0),
      );
      // Wander Angle for the specific target point on the circle
      let theta = this.wanderAngle + heading;
      let targetPoint = circleCenter.add(
        new BABYLON.Vector3(
          Math.cos(theta) * this.wanderRadius,
          0,
          Math.sin(theta) * this.wanderRadius,
        ),
      );

      makeLine([circleCenter, targetPoint], new BABYLON.Color3(1, 0, 0));

      // Wander Jitter is an arc showing the possible random displacement range
      makeLine(
        Array.from({ length: 11 }, (_, i) => {
          // Jitter is max +/- wanderJitter draw an arc of this range
          let fraction = (i / 10) * 2 - 1; // Maps 0-10 to -1 to +1
          let arcAngle = theta + fraction * this.wanderJitter;
          return circleCenter.add(
            new BABYLON.Vector3(
              Math.cos(arcAngle) * this.wanderRadius,
              0,
              Math.sin(arcAngle) * this.wanderRadius,
            ),
          );
        }),
        new BABYLON.Color3(1, 1, 0),
      );

      // Line showing the actual steering target mapped from the vehicle
      makeLine([this.position, targetPoint], new BABYLON.Color3(0, 1, 1));
    }
  }

  seek(target) {
    // Basic Reynolds seek toward a world target
    let desired = target.subtract(this.position);
    desired.normalize().scaleInPlace(this.maxSpeed);
    let steer = desired.subtract(this.velocity);
    return this.clampToMax(steer, this.maxForce);
  }

  flee(target) {
    // Inverse of seek moving away from a world target
    let desired = this.position.subtract(target);
    desired.normalize().scaleInPlace(this.maxSpeed);
    let steer = desired.subtract(this.velocity);
    return this.clampToMax(steer, this.maxForce);
  }

  map(value, start1, stop1, start2, stop2) {
    return ((value - start1) / (stop1 - start1)) * (stop2 - start2) + start2;
  }

  arrive(target) {
    // Seek with speed falloff inside slowing radius
    let desired = target.subtract(this.position);
    let distance = desired.length();

    // // Stop exactly on target if close enough
    // if (distance < 0.1) {
    //   this.velocity.setAll(0);
    //   return BABYLON.Vector3.Zero();
    // }

    let m = this.maxSpeed;
    if (distance < this.slowingRadius) {
      m = this.map(distance, 0, this.slowingRadius, 0, this.maxSpeed);
      // console.log("distance", distance, "speed", m, "max speed", this.maxSpeed);
    }
    desired.normalize().scaleInPlace(m);
    let steer = desired.subtract(this.velocity);
    return this.clampToMax(steer, this.maxForce);
  }

  pursue(targetObj) {
    // Predict future target position then seek prediction
    // Look-ahead to predict where the target will be in the future and seek that position
    let distance = BABYLON.Vector3.Distance(this.position, targetObj.position);
    // Look-ahead time is proportional to distance and inversely proportional to velocities
    // A simple approximation is T = distance / maxSpeed
    let T = distance / this.maxSpeed;

    // Predict future position
    let predictedPos = targetObj.position.add(targetObj.velocity.scale(T));
    return this.seek(predictedPos);
  }

  evade(targetObj) {
    // Predict future target position then flee prediction
    // Inverse of pursue: predict future position and flee from it
    let distance = BABYLON.Vector3.Distance(this.position, targetObj.position);
    let T = distance / this.maxSpeed;
    let predictedPos = targetObj.position.add(targetObj.velocity.scale(T));
    return this.flee(predictedPos);
  }

  getObstacleLePlusProche(obstacles) {
    let plusPetiteDistance = Infinity;
    let obstacleLePlusProche = undefined;

    if (!obstacles) return undefined;

    obstacles.forEach((o) => {
      // Je calcule la distance entre le vaisseau et l'obstacle
      const distance = BABYLON.Vector3.Distance(this.position, o.position);
      if (distance < plusPetiteDistance) {
        plusPetiteDistance = distance;
        obstacleLePlusProche = o;
      }
    });

    return obstacleLePlusProche;
  }

  avoid(obstacles) {
    // Probe ahead points and steer away from nearest threat
    // calcul d'un vecteur ahead devant le véhicule
    // il regarde par exemple 50 frames devant lui
    // on utilise un facteur proportionnel pour scale le vecteur vitesse
    // let aheadFrameCount = 30; // Equivalent à 30 frames

    // On scale velocity (units per sec) pour simuler la distance parcourue
    // 30 frames a 60fps = 0.5 sec
    let ahead = this.velocity.scale(this.ahead1Factor || 0.5);

    // on calcue ahead2 deux fois plus petit
    let ahead2 = ahead.scale(this.ahead2Factor || 0.5);

    // Calcul des coordonnées du point au bout de ahead
    let pointAuBoutDeAhead = this.position.add(ahead);
    let pointAuBoutDeAhead2 = this.position.add(ahead2);

    // Detection de l'obstacle le plus proche
    let obstacleLePlusProche = this.getObstacleLePlusProche(obstacles);

    // Si pas d'obstacle, on renvoie un vecteur nul
    if (!obstacleLePlusProche) {
      return BABYLON.Vector3.Zero();
    }

    // On calcule la distance entre le centre de l'obstacle et les points
    let distance1 = BABYLON.Vector3.Distance(
      pointAuBoutDeAhead,
      obstacleLePlusProche.position,
    );
    let distance2 = BABYLON.Vector3.Distance(
      pointAuBoutDeAhead2,
      obstacleLePlusProche.position,
    );
    let distance = Math.min(distance1, distance2);

    let obstacleRadius = obstacleLePlusProche.radius || 2.0; // pour le moment on suppose que les obstacles ont un radius

    // si la distance est < rayon de l'obstacle + zone d'evitement
    // il y a collision possible

    let force;

    if (distance < obstacleRadius + this.hauteurEvitement) {
      // collision possible
      if (distance1 < distance2) {
        force = pointAuBoutDeAhead.subtract(obstacleLePlusProche.position);
      } else {
        force = pointAuBoutDeAhead2.subtract(obstacleLePlusProche.position);
      }

      force.normalize().scaleInPlace(this.maxSpeed);
      force.subtractInPlace(this.velocity);

      return this.clampToMax(force, this.maxForce);
    }

    if (distance < obstacleRadius + this.largeurEvitement) {
      // zone d'évitement élargie, on peut faire un petit ajustement pour éviter de se rapprocher trop de l'obstacle
      if (distance1 < distance2) {
        force = pointAuBoutDeAhead.subtract(obstacleLePlusProche.position);
      } else {
        force = pointAuBoutDeAhead2.subtract(obstacleLePlusProche.position);
      }

      force.normalize().scaleInPlace(this.maxSpeed * 0.5); // Moins fort que la force d'évitement principale
      force.subtractInPlace(this.velocity);

      return this.clampToMax(force, this.maxForce * 0.5);
    }

    // pas de collision possible
    return BABYLON.Vector3.Zero();
  }

  wander() {
    // Random wander on a projected circle pour wander "naturel"
    let forward =
      this.velocity.lengthSquared() > 0.001
        ? this.velocity.clone().normalizeToNew()
        : new BABYLON.Vector3(0, 0, 1);

    let pointDevant = this.position.add(forward.scale(this.wanderDistance));

    let heading = Math.atan2(this.velocity.z, this.velocity.x);
    let theta = this.wanderAngle + heading;

    let pointSurLeCercle = new BABYLON.Vector3(
      Math.cos(theta) * this.wanderRadius,
      0,
      Math.sin(theta) * this.wanderRadius,
    ).add(pointDevant);

    this.wanderAngle += (Math.random() - 0.5) * 2 * this.wanderJitter;

    let force = pointSurLeCercle.subtract(this.position);
    return force.normalizeToNew().scale(this.maxForce);
  }

  // Hard cap for force and velocity vectors
  clampToMax(vector, max) {
    if (vector.lengthSquared() > max * max) {
      return vector.normalizeToNew().scale(max);
    }
    return vector;
  }

  dispose() {
    this.clearDebugMeshes();
    if (this.mesh && !this.mesh.isDisposed()) {
      this.mesh.dispose();
    }
  }
}
