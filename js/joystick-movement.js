import { Component, Type } from "@wonderlandengine/api";
import { vec3 } from "gl-matrix";

/**
 * Basic movement with W/A/S/D keys and VR 'leafblower' push on trigger (left hand).
 * Fluid push with acceleration/deceleration, ground and gravity constraints.
 * Directional impulse follows cursor forward vector in any direction (including up/down).
 */
export class JoystickMovement extends Component {
    static TypeName = "joystick-movement";
    static Properties = {
        moveSpeed: { type: Type.Float, default: 0.1 },     // speed for joystick movement
        turnAngle: { type: Type.Float, default: 30.0 },     // turning speed deg/s
        headObject: { type: Type.Object },                 // object to move/rotate
        blowForce: { type: Type.Float, default: 1.0 },      // impulse magnitude (m/s)
        friction: { type: Type.Float, default: 0.95 },      // horizontal damping [0-1]
        gravity: { type: Type.Float, default: 9.81 },       // gravity m/s²
        cursorObject: { type: Type.Object },               // object containing `cursor` component
        blowDelay: { type: Type.Float, default: 0.5 },     // delay between blows in seconds
        turnSpeedMultiplier: { type: Type.Float, default: 1.0 }, // multiplier for turn speed
        maxAirJumps: { type: Type.Int, default: 3 },       // maximum number of air jumps
        horizontalForceMultiplier: { type: Type.Float, default: 10.0 }, // multiplier for horizontal force
        maxBlowDuration: { type: Type.Float, default: 3.0 } // maximum continuous blow duration in seconds
    }

    init() {
        this.lastTime = Date.now();
        this.velocity = vec3.fromValues(0, 0, 0);  // current velocity in m/s
        this.gamepadLeft = null;
        this.session = null;
        this.lastBlowTime = 0;
        this.continuousBlow = false;
        this.isGrounded = true;
        this.remainingAirJumps = this.maxAirJumps;
        this.blowStartTime = 0;
        this.currentBlowDuration = 0;
    }

    start() {
        this.headObject = this.headObject || this.object;
        this.engine.onXRSessionStart.push(this.setupVREvents.bind(this));
    }

    update() {
        const now = Date.now();
        const dt = (now - this.lastTime) / 1000;  // convert ms to seconds
        this.lastTime = now;

        // Check if player is grounded
        const worldPos = this.headObject.getTranslationWorld();
        const wasGrounded = this.isGrounded;
        this.isGrounded = worldPos[1] <= 0.01; // Consider grounded if very close to ground

        // Reset air jumps when touching ground
        if (!wasGrounded && this.isGrounded) {
            this.remainingAirJumps = this.maxAirJumps;
        }

        // Joystick: forward/back movement and rotation
        if (this.gamepadLeft?.axes) {
            const x = this.gamepadLeft.axes[2];
            const y = this.gamepadLeft.axes[3];
            let dir = vec3.fromValues(0, 0, 0);
            let angle = 0;

            // determine desired direction
            if (y < -0.1) dir[2] = -1;
            else if (y > 0.1) dir[2] = 1;
            
            // Apply turn speed multiplier to rotation
            if (x > 0.1) angle = -this.turnAngle * this.turnSpeedMultiplier;
            else if (x < -0.1) angle = this.turnAngle * this.turnSpeedMultiplier;

            // move or turn
            if (Math.abs(y) > Math.abs(x)) {
                vec3.normalize(dir, dir);
                vec3.scale(dir, dir, this.moveSpeed * dt);
                vec3.transformQuat(dir, dir, this.headObject.transformWorld);
                this.headObject.translate(dir);
            } else if (Math.abs(x) > 0.1) {
                this.headObject.rotateAxisAngleDegObject([0,1,0], angle * dt);
            }
        }

        // Handle continuous blow
        if (this.continuousBlow && this.gamepadLeft?.buttons[0].pressed) {
            if (this.blowStartTime === 0) {
                this.blowStartTime = now;
                this.currentBlowDuration = 0;
            }

            this.currentBlowDuration = (now - this.blowStartTime) / 1000;
            
            if (this.currentBlowDuration <= this.maxBlowDuration && 
                (this.isGrounded || this.remainingAirJumps > 0)) {
                this.applyBlowForce();
                
                // Add continuous haptic feedback
                if (this.gamepadLeft.hapticActuators) {
                    this.gamepadLeft.hapticActuators[0].pulse(0.3, 50);
                }
            }
        } else {
            this.blowStartTime = 0;
            this.currentBlowDuration = 0;
        }

        // apply gravity to vertical velocity
        if (!this.isGrounded) {
            this.velocity[1] -= this.gravity * dt;
        }

        // apply velocity movement
        const delta = vec3.clone(this.velocity);
        vec3.scale(delta, delta, dt);
        this.headObject.translate(delta);

        // ground clamp
        const newPos = this.headObject.getTranslationWorld();
        if (newPos[1] < 0) {
            newPos[1] = 0;
            this.headObject.setTranslationWorld(newPos);
            this.velocity[1] = 0;
            this.isGrounded = true;
            this.remainingAirJumps = this.maxAirJumps;
        }

        // horizontal friction - smoother deceleration
        const friction = Math.pow(this.friction, dt * 60); // Scale friction with frame rate
        this.velocity[0] *= friction;
        this.velocity[2] *= friction;
    }

    setupVREvents(session) {
        this.session = session;
        session.addEventListener('end', () => { this.gamepadLeft = null; this.session = null; });
        for (const src of session.inputSources || []) {
            if (src.handedness === 'left') this.gamepadLeft = src.gamepad;
        }
        session.addEventListener('inputsourceschange', e => {
            for (const src of e.added || []) {
                if (src.handedness === 'left') this.gamepadLeft = src.gamepad;
            }
        });
        session.addEventListener('selectstart', this.onTriggerDown.bind(this));
        session.addEventListener('selectend', this.onTriggerUp.bind(this));
    }

    onTriggerDown(event) {
        const src = event.inputSource;
        if (src.handedness !== 'left' || !this.gamepadLeft) return;
        
        this.continuousBlow = true;
        this.blowStartTime = Date.now();
        this.currentBlowDuration = 0;
        
        // Only apply initial blow if grounded or has remaining air jumps
        if (this.isGrounded || this.remainingAirJumps > 0) {
            this.applyBlowForce();
            if (!this.isGrounded) {
                this.remainingAirJumps--;
            }
        }
    }

    onTriggerUp(event) {
        const src = event.inputSource;
        if (src.handedness !== 'left') return;
        
        this.continuousBlow = false;
        this.blowStartTime = 0;
        this.currentBlowDuration = 0;
    }

    applyBlowForce() {
        if (!this.cursorObject) return;
        const cursor = this.cursorObject.getComponent('cursor');
        if (!cursor) return;
        const rayObj = cursor.cursorRayObject || cursor.object;
        const dir = vec3.create();
        rayObj.getForward(dir);

        // Normalize the direction vector
        vec3.normalize(dir, dir);

        // Calculate the horizontal component (XZ plane)
        const horizontalDir = vec3.fromValues(dir[0], 0, dir[2]);
        vec3.normalize(horizontalDir, horizontalDir);

        // Calculate the vertical component
        const verticalDir = vec3.fromValues(0, dir[1], 0);

        // Combine horizontal and vertical components with different weights
        const finalDir = vec3.create();
        vec3.scale(horizontalDir, horizontalDir, this.horizontalForceMultiplier); // Increased horizontal force
        vec3.scale(verticalDir, verticalDir, 1.0);    // Keep vertical force as is
        vec3.add(finalDir, horizontalDir, verticalDir);
        vec3.normalize(finalDir, finalDir);

        // Apply the impulse in the opposite direction
        vec3.scale(finalDir, finalDir, -this.blowForce);
        vec3.add(this.velocity, this.velocity, finalDir);
    }
}
