// import { Component, Type } from "@wonderlandengine/api";
// import { vec3 } from "gl-matrix";

// /**
//  * Basic movement with W/A/S/D keys and VR 'leafblower' push on trigger (left hand).
//  * Fluid push with acceleration/deceleration, ground and gravity constraints.
//  * Retains original cursor-based direction retrieval for leafblower.
//  */
// export class JoystickMovement extends Component {
//     static TypeName = "joystick-movement";
//     static Properties = {
//         moveSpeed: { type: Type.Float, default: 0.1 },
//         turnAngle: { type: Type.Float, default: 30.0 },
//         headObject: { type: Type.Object },
//         blowForce: { type: Type.Float, default: 2.0 },
//         friction: { type: Type.Float, default: 0.4 },
//         gravity: { type: Type.Float, default: 4.0 },
//         cursorObject: { type: Type.Object }
//     }

//     init() {
//         this.lastTime = Date.now();
//         this.velocity = vec3.fromValues(0, 0, 0);
//         this.gamepadLeft = null;
//         this.session = null;
//         this.lastBlowTime = 0;
//     }

//     start() {
//         this.headObject = this.headObject || this.object;
//         this.engine.onXRSessionStart.push(this.setupVREvents.bind(this));
//     }

//     update() {
//         const now = Date.now();
//         const dt = (now - this.lastTime) / 1000;
//         this.lastTime = now;

//         // Movement via left joystick
//         if (this.gamepadLeft?.axes) {
//             const x = this.gamepadLeft.axes[2];
//             const y = this.gamepadLeft.axes[3];
//             let dir = vec3.fromValues(0, 0, 0);
//             let angle = 0;
//             if (y < -0.1) dir[2] = -1;
//             else if (y > 0.1) dir[2] = 1;
//             if (x > 0.1) angle = -this.turnAngle;
//             else if (x < -0.1) angle = this.turnAngle;

//             if (Math.abs(y) > Math.abs(x)) {
//                 vec3.normalize(dir, dir);
//                 vec3.scale(dir, dir, this.moveSpeed * dt);
//                 vec3.transformQuat(dir, dir, this.headObject.transformWorld);
//                 this.headObject.translate(dir);
//             } else if (Math.abs(x) > 0.1) {
//                 this.headObject.rotateAxisAngleDegObject([0, 1, 0], angle * dt);
//             }
//         }

//         // Gravity
//         const pos = this.headObject.getTranslationWorld();
//         if (pos[1] > 0) this.velocity[1] -= this.gravity * dt;

//         // Apply velocity
//         const deltaV = vec3.clone(this.velocity);
//         vec3.scale(deltaV, deltaV, dt);
//         this.headObject.translate(deltaV);

//         // Ground clamp
//         const newPos = this.headObject.getTranslationWorld();
//         if (newPos[1] < 0) {
//             newPos[1] = 0;
//             this.headObject.setTranslationWorld(newPos);
//             this.velocity[1] = 0;
//         }

//         // Friction horizontal
//         this.velocity[0] *= this.friction;
//         this.velocity[2] *= this.friction;
//     }

//     setupVREvents(session) {
//         this.session = session;
//         session.addEventListener('end', () => { this.gamepadLeft = null; this.session = null; });
//         for (const src of session.inputSources || []) if (src.handedness === 'left') this.gamepadLeft = src.gamepad;
//         session.addEventListener('inputsourceschange', e => {
//             for (const src of e.added || []) if (src.handedness === 'left') this.gamepadLeft = src.gamepad;
//         });
//         session.addEventListener('selectstart', this.onTriggerDown.bind(this));
//     }

//     onTriggerDown(event) {
//         const src = event.inputSource;
//         if (src.handedness !== 'left' || !this.gamepadLeft) return;
//         const now = Date.now();
//         if (now - this.lastBlowTime < 300) return;

//         // Retrieve original cursor-based forward
//         if (!this.cursorObject) return;
//         const cursor = this.cursorObject.getComponent('cursor');
//         if (!cursor) return;
//         const rayObj = cursor.cursorRayObject || cursor.object;
//         const dir = vec3.create();
//         rayObj.getForward(dir);

//         // Add impulse opposite direction
//         vec3.normalize(dir, dir);
//         vec3.scale(dir, dir, -this.blowForce);
//         vec3.add(this.velocity, this.velocity, dir);
//         this.lastBlowTime = now;
//     }
// }

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
        blowForce: { type: Type.Float, default: 5.0 },      // impulse magnitude (m/s)
        friction: { type: Type.Float, default: 0.8 },       // horizontal damping [0-1]
        gravity: { type: Type.Float, default: 9.81 },       // gravity m/s²
        cursorObject: { type: Type.Object }                // object containing `cursor` component
    }

    init() {
        this.lastTime = Date.now();
        this.velocity = vec3.fromValues(0, 0, 0);  // current velocity in m/s
        this.gamepadLeft = null;
        this.session = null;
        this.lastBlowTime = 0;
    }

    start() {
        this.headObject = this.headObject || this.object;
        this.engine.onXRSessionStart.push(this.setupVREvents.bind(this));
    }

    update() {
        const now = Date.now();
        const dt = (now - this.lastTime) / 1000;  // convert ms to seconds
        this.lastTime = now;

        // Joystick: forward/back movement and rotation
        if (this.gamepadLeft?.axes) {
            const x = this.gamepadLeft.axes[2];
            const y = this.gamepadLeft.axes[3];
            let dir = vec3.fromValues(0, 0, 0);
            let angle = 0;

            // determine desired direction
            if (y < -0.1) dir[2] = -1;
            else if (y > 0.1) dir[2] = 1;
            if (x > 0.1) angle = -this.turnAngle;
            else if (x < -0.1) angle = this.turnAngle;

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

        // apply gravity to vertical velocity
        const worldPos = this.headObject.getTranslationWorld();
        if (worldPos[1] > 0) {
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
        }

        // horizontal friction
        this.velocity[0] *= this.friction;
        this.velocity[2] *= this.friction;
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
    }

    onTriggerDown(event) {
        const src = event.inputSource;
        if (src.handedness !== 'left' || !this.gamepadLeft) return;
        const now = Date.now();
        if (now - this.lastBlowTime < 300) return;

        // get cursor forward (including y) for fluid directional impulse
        if (!this.cursorObject) return;
        const cursor = this.cursorObject.getComponent('cursor');
        if (!cursor) return;
        const rayObj = cursor.cursorRayObject || cursor.object;
        const dir = vec3.create();
        rayObj.getForward(dir);

        vec3.normalize(dir, dir);
        // add impulse opposite to pointing direction
        vec3.scale(dir, dir, -this.blowForce);
        vec3.add(this.velocity, this.velocity, dir);

        this.lastBlowTime = now;
    }
}
