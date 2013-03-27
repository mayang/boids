var Boid = function() {
    // World Information
    var _width = 500, _height = 500, _depth = 200, 
    _wallAvoid = false, _followMouse = false, _collisionDetect = false;
    var _goal;
    var _obstacles;
    
    // Properties
    var vec = new THREE.Vector3();
    var _neighborhoodRadius = 100, _maxSpeed = 3, _maxSteering = 0.1;
    var _acceleration;
    this.position = new THREE.Vector3();
    this.velocity = new THREE.Vector3();
    _acceleration = new THREE.Vector3();
    
    var _focusX, _focusY, _focusZ;
    var _ray;
    
    
    // flags
    this.setAvoidWalls = function(state) {
       _wallAvoid = state; 
       console.log(_wallAvoid);
    };
    
    this.setFollowMouse = function(state) {
        _followMouse = state;
    };
    
    this.setCollide = function(state) {
        _collisionDetect = state;
    };
    
    // set goal if there should be a goal
    this.setGoal = function(target) {
        _goal = target;
    };
    
    
    // get info about the world
    this.getWorldInfo = function(width, height, depth, obstacles) {
        _width = width;
        _height = height;
        _depth = depth;
        _obstacles = obstacles;
    };
    
    this.setRadius = function(radius) {
        _neighborhoodRadius = radius;
    };
    
    this.setFocus = function(rotY, rotZ) {
        var aheadX = Math.floor(Math.sin(rotY) * 100);
        var aheadY = Math.floor(Math.sin(rotZ) * 100);
        var aheadZ = Math.floor(Math.cos(rotY) * 100);
        
        _focusX = aheadX - this.position.x;
        _focusY = aheadY - this.position.y;
        _focusZ = aheadZ - this.position.z;
        
        var ray_dir = new THREE.Vector3(_focusX, _focusY, _focusZ);
        
        ray_dir = ray_dir.normalize();
        
        _ray = new THREE.Ray(this.position, ray_dir);
    };
    
    this.run = function(boids) {
        // Avoid walls or just come out the other side
        this.wallDetection();
        this.collisionDetection();
        
        if (Math.random() > 0.5) {
            this.flock(boids);
        }
        this.move();
    };
    
    
    // Collision detection for the boundries/walls
    this.wallDetection = function() {
        var avoidStrenth = 5;
        
        if (_wallAvoid) {
            
            // sides (x-axis) 
            vec.set(-_width, this.position.y, this.position.z);
            vec = this.avoid(vec);
            vec.multiplyScalar(avoidStrenth);
            _acceleration.addSelf(vec);
            
            vec.set(_width, this.position.y, this.position.z);
            vec = this.avoid(vec);
            vec.multiplyScalar(avoidStrenth);
            _acceleration.addSelf(vec);
            
            // top and bottom (y-axis)
            vec.set(this.position.x, _height, this.position.z);
            vec = this.avoid(vec);
            vec.multiplyScalar(avoidStrenth);
            _acceleration.addSelf(vec);
            
            vec.set(this.position.x, -_height, this.position.z);
            vec = this.avoid(vec);
            vec.multiplyScalar(avoidStrenth);
            _acceleration.addSelf(vec);
            
            // front and back (z-axis)
            vec.set(this.position.x, this.position.y, -_depth);
            vec = this.avoid(vec);
            vec.multiplyScalar(avoidStrenth);
            _acceleration.addSelf(vec);
            
            vec.set(this.position.x, this.position.y, _depth);
            vec = this.avoid(vec);
            vec.multiplyScalar(avoidStrenth);
            _acceleration.addSelf(vec);
            
        } else {
            if (this.position.x < -_width) 
                this.position.x = _width;
            if (this.position.x > _width) 
                this.position.x = -_width;
            if (this.position.y > _height)
                this.position.y = -_height;
            if (this.position.y < -_height)
                this.position.y = _height;
            if (this.position.z < -_depth)
                this.position.z = _depth;
            if (this.position.z > _depth) 
                this.position.z = -_depth;
        }
    };
    
    // Collision Detection for Obstacles
    this.collisionDetection = function() {
        if (_collisionDetect) {
            var intersects = _ray.intersectObjects(_obstacles);
            if (intersects.length > 0) {
                // Avoid this object!
                var vec;
                if (intersects[0].distance <= 50) {
                    vec = this.avoid(intersects[0].object.position);
                    vec.multiplyScalar(3);
                    _acceleration.addSelf(vec);
                }
            }
        }
    };
    
    
    // FLOCKING
    this.flock = function(boids) {
        if (_goal) {
            _acceleration.addSelf(this.attract(_goal, 0.005));
        }
        
        _acceleration.addSelf(this.alignment(boids));
      //  _acceleration.addSelf(this.cohesion(boids));
        _acceleration.addSelf(this.seperation(boids));
    };
    
    // update position
    this.move = function() {
        this.velocity.addSelf(_acceleration);
        
        var l_velocity = this.velocity.length();
        if (l_velocity > _maxSpeed) {
            this.velocity.divideScalar(_maxSpeed);
        }
        
        this.position.addSelf(this.velocity);
        _acceleration.set(0, 0, 0);
    };
    
    
    // Overall Behavoirs
    // this should avoid this thing
    this.avoid = function(obstacle) {
        var steer = new THREE.Vector3();
        
        steer.copy(this.position);
        steer.subSelf(obstacle);
        steer.multiplyScalar(1 / this.position.distanceToSquared(obstacle));
        
        return steer;
    };
    
    // go towards here
    this.attract = function(goal, strength) {
        var steer = new THREE.Vector3();
        
        steer.sub(goal, this.position);
        steer.multiplyScalar(strength);
        
        return steer;
    };
    
    // Flocking behavoirs
    // should all be in the same direction
    this.alignment = function(boids) {
        var boid, distance; 
        var velSum = new THREE.Vector3(); 
        velSum.set(0, 0, 0);
        
        var count = 0;
        for (var i = 0; i < boids.length; ++i) {
            if (Math.random() > 0.75) continue; // randomness

            // do i care about this boid, is it in my neihborhood area
            boid = boids[i];
            distance = boid.position.distanceTo(this.position);
            // sum of velocities
            if (distance > 0 && distance <= _neighborhoodRadius) {
                velSum.addSelf(boid.velocity);
                ++count;
            }
        }
        
        if (count > 0) {
            velSum.divideScalar(count);
            if (velSum.length > _maxSteering) {
                velSum.divideScalar(1 / _maxSteering);
            }
        }
        //velSum.subSelf(this.velocity);
       // velSum.normalize();
        return velSum;        
    };
    
    // should stay together
    this.cohesion = function(boids) {
        var boid, distance;
        
        var posSum = new THREE.Vector3();
        var count = 0;
        // sum of all positions near by
        for (var i = 0; i < boids.length; ++i) {
            if (Math.random() > 0.75) continue; // randomness
            
            // is this other boid within the area i care about
            boid = boids[i];
            distance = boid.position.distanceTo(this.position);
            if (distance > 0 && distance <= _neighborhoodRadius) {
                posSum.addSelf(boid.position);
                ++count;
            }           
        }
                   
        if (count > 0) {
            posSum.divideScalar(count);
        }
        
        var steer = new THREE.Vector3();
        steer.sub(posSum, this.position);
      //  steer.normalize();
        if (steer.length > _maxSteering) {
            steer.divideScalar(1 / _maxSteering);
        }
        
        return steer;
    };
    
    // but not too close  together
    this.seperation = function(boids) {
        var boid, distance;
        
        var posSum = new THREE.Vector3();
        var repulse = new THREE.Vector3();
        for (var i = 0; i < boids.length; ++i) {
            if (Math.random() > 0.75) continue;
            
            boid = boids[i];
            distance = boid.position.distanceTo(this.position);
            if (distance > 0 && distance <= _neighborhoodRadius) {
                repulse.sub(this.position, boid.position);
                repulse.normalize();
                repulse.divideScalar(distance);
                posSum.addSelf(repulse);
            }
        }
        return posSum;
    };
};