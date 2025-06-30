import { Component, Type } from "@wonderlandengine/api";
import { vec3 } from "gl-matrix";
/**
 * Basic movement with W/A/S/D keys, with boundary limits relative to initial center.
 */
export class WasdControlsCustom extends Component {
    static TypeName = "wasd-controls-custom";
    static Properties = {
        /** Movement speed in m/s. */
        speed: { type: Type.Float, default: 0.1 },
        /** Object of which the orientation is used to determine forward direction */
        headObject: { type: Type.Object },
        /** Maximum distance from center on X and Z axes */
        boundaryLimit: { type: Type.Float, default: 12.0 }
    }

    init() {
        this.up = false;
        this.right = false;
        this.down = false;
        this.left = false;

        // Store initial center position in local space
        this.centerPos = vec3.create();
        if (this.headObject) {
            this.headObject.getPositionLocal(this.centerPos);
        }

        window.addEventListener('keydown', this.press.bind(this));
        window.addEventListener('keyup', this.release.bind(this));
    }

    update() {
        if (!this.headObject) return;

        if (this.up || this.right || this.down || this.left) {
            const direction = vec3.create();

            // Calculate forward/back vectors
            const forward = vec3.fromValues(0,0,0);
            this.object.getForward(forward);
            forward[1] = 0;
            const back = vec3.create();

            if (vec3.equals(forward, [0, 0, 1])) {
                vec3.set(forward, 0, 0, this.speed);
                vec3.set(back,    0, 0, -this.speed);
            } else if (vec3.equals(forward, [0, 0, -1])) {
                vec3.set(forward, 0, 0, -this.speed);
                vec3.set(back,    0, 0,  this.speed);
            } else {
                const angleF = vec3.angle([0, 0, -1], forward);
                const xPolF = forward[0] > 0 ? 1 : -1;
                const zPolF = forward[2] > 0 ? 1 : -1;
                forward[0] = xPolF * Math.abs(Math.sin(angleF)) * this.speed;
                forward[2] = zPolF * Math.abs(Math.cos(angleF)) * this.speed;
                back[0] = -forward[0];
                back[2] = -forward[2];
            }

            // Calculate right/left vectors
            const rightV = vec3.fromValues(0,0,0);
            this.object.getRight(rightV);
            rightV[1] = 0;
            const leftV = vec3.create();

            if (vec3.equals(rightV, [1, 0, 0])) {
                vec3.set(rightV, this.speed, 0, 0);
                vec3.set(leftV, -this.speed, 0, 0);
            } else if (vec3.equals(rightV, [-1, 0, 0])) {
                vec3.set(rightV, -this.speed, 0, 0);
                vec3.set(leftV,  this.speed, 0, 0);
            } else {
                const angleR = vec3.angle([-1, 0, 0], rightV);
                const xPolR = rightV[0] > 0 ? 1 : -1;
                const zPolR = rightV[2] > 0 ? 1 : -1;
                rightV[0] = xPolR * Math.abs(Math.cos(angleR)) * this.speed;
                rightV[2] = zPolR * Math.abs(Math.sin(angleR)) * this.speed;
                leftV[0] = -rightV[0];
                leftV[2] = -rightV[2];
            }

            if (this.up)    vec3.add(direction, direction, forward);
            if (this.down)  vec3.add(direction, direction, back);
            if (this.left)  vec3.add(direction, direction, leftV);
            if (this.right) vec3.add(direction, direction, rightV);

            // Compute new position and clamp within boundaries
            const newPos = vec3.create();
            this.headObject.getPositionLocal(newPos);
            vec3.add(newPos, newPos, direction);

            // Clamp X and Z relative to center
            const minX = this.centerPos[0] - this.boundaryLimit;
            const maxX = this.centerPos[0] + this.boundaryLimit;
            const minZ = this.centerPos[2] - this.boundaryLimit;
            const maxZ = this.centerPos[2] + this.boundaryLimit;

            newPos[0] = Math.min(Math.max(newPos[0], minX), maxX);
            newPos[2] = Math.min(Math.max(newPos[2], minZ), maxZ);

            // Apply clamped position
            this.headObject.setPositionLocal(newPos);
        }
    }

    press(e) {
        if (e.keyCode === 38 /* up */ || e.keyCode === 87 /* w */ || e.keyCode === 90 /* z */) {
            this.up = true;
        } else if (e.keyCode === 39 /* right */ || e.keyCode === 68 /* d */) {
            this.right = true;
        } else if (e.keyCode === 40 /* down */ || e.keyCode === 83 /* s */) {
            this.down = true;
        } else if (e.keyCode === 37 /* left */ || e.keyCode === 65 /* a */ || e.keyCode === 81 /* q */) {
            this.left = true;
        }
    }

    release(e) {
        if (e.keyCode === 38 || e.keyCode === 87 || e.keyCode === 90) {
            this.up = false;
        } else if (e.keyCode === 39 || e.keyCode === 68) {
            this.right = false;
        } else if (e.keyCode === 40 || e.keyCode === 83) {
            this.down = false;
        } else if (e.keyCode === 37 || e.keyCode === 65 || e.keyCode === 81) {
            this.left = false;
        }
    }
};
