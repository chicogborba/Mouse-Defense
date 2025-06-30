import { Component, Type } from "@wonderlandengine/api";
import { vec3 } from "gl-matrix";

export class WasdControlsCustom extends Component {
    static TypeName = "wasd-controls-custom";
    static Properties = {
        speed: { type: Type.Float, default: 0.1 },
        headObject: { type: Type.Object },
        boundaryLimit: { type: Type.Float, default: 12.0 },
        gravity: { type: Type.Float, default: 9.8 },
        jumpForce: { type: Type.Float, default: 8.0 },
        groundLevel: { type: Type.Float, default: 0.0 },
        maxJumps: { type: Type.Int, default: 2 } // número de pulos extras permitidos no ar
    }

    init() {
        this.up = false;
        this.right = false;
        this.down = false;
        this.left = false;

        this.verticalVelocity = 0;
        this.isJumping = false;
        this.jumpsRemaining = this.maxJumps + 1; // 1 do chão + extras

        this.centerPos = vec3.create();
        if (this.headObject) {
            this.headObject.getPositionLocal(this.centerPos);
        }

        window.addEventListener('keydown', this.press.bind(this));
        window.addEventListener('keyup', this.release.bind(this));
    }

    update(dt) {
        if (!this.headObject) return;

        const direction = vec3.create();

        // Movimento horizontal
        if (this.up || this.right || this.down || this.left) {
            const forward = vec3.fromValues(0, 0, 0);
            this.object.getForward(forward);
            forward[1] = 0;
            vec3.normalize(forward, forward);
            vec3.scale(forward, forward, this.speed);

            const rightV = vec3.fromValues(0, 0, 0);
            this.object.getRight(rightV);
            rightV[1] = 0;
            vec3.normalize(rightV, rightV);
            vec3.scale(rightV, rightV, this.speed);

            if (this.up) vec3.add(direction, direction, forward);
            if (this.down) vec3.sub(direction, direction, forward);
            if (this.right) vec3.add(direction, direction, rightV);
            if (this.left) vec3.sub(direction, direction, rightV);
        }

        const newPos = vec3.create();
        this.headObject.getPositionLocal(newPos);
        vec3.add(newPos, newPos, direction);

        // Gravidade
        this.verticalVelocity -= this.gravity * dt;
        newPos[1] += this.verticalVelocity * dt;

        // Chegou no chão
        if (newPos[1] <= this.groundLevel) {
            newPos[1] = this.groundLevel;
            this.verticalVelocity = 0;
            this.jumpsRemaining = this.maxJumps + 1; // reset ao tocar o chão
            this.isJumping = false;
        } else {
            this.isJumping = true;
        }

        // Clamping X/Z
        const minX = this.centerPos[0] - this.boundaryLimit;
        const maxX = this.centerPos[0] + this.boundaryLimit;
        const minZ = this.centerPos[2] - this.boundaryLimit;
        const maxZ = this.centerPos[2] + this.boundaryLimit;
        newPos[0] = Math.min(Math.max(newPos[0], minX), maxX);
        newPos[2] = Math.min(Math.max(newPos[2], minZ), maxZ);

        this.headObject.setPositionLocal(newPos);
    }

    press(e) {
        if (e.keyCode === 38 || e.keyCode === 87 || e.keyCode === 90) this.up = true;
        else if (e.keyCode === 39 || e.keyCode === 68) this.right = true;
        else if (e.keyCode === 40 || e.keyCode === 83) this.down = true;
        else if (e.keyCode === 37 || e.keyCode === 65 || e.keyCode === 81) this.left = true;
        else if (e.keyCode === 32 && this.jumpsRemaining > 0) {
            // Executa o pulo imediatamente se houver pulos disponíveis
            this.verticalVelocity = this.jumpForce;
            this.jumpsRemaining--;
        }
    }

    release(e) {
        if (e.keyCode === 38 || e.keyCode === 87 || e.keyCode === 90) this.up = false;
        else if (e.keyCode === 39 || e.keyCode === 68) this.right = false;
        else if (e.keyCode === 40 || e.keyCode === 83) this.down = false;
        else if (e.keyCode === 37 || e.keyCode === 65 || e.keyCode === 81) this.left = false;
    }
};
