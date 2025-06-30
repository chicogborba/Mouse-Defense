/*
    Copyright 2021. Futurewei Technologies Inc. All rights reserved.
    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at
    http:  www.apache.org/licenses/LICENSE-2.0
    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
*/
import { Component, Type } from "@wonderlandengine/api";
import { vec3 } from "gl-matrix";
import { state } from "./game";

/**
@brief Moves the mouse directly towards the player each frame.
*/
export class MouseMover extends Component {
    static TypeName = "mouse-mover";
    static Properties = {};

    init() {
        // nothing needed here for direct follow
    }

    update(dt) {
        if (isNaN(dt)) return;
        if(state.gameOver || state.paused) return; // skip if game is over or paused

        // Get current speed from wave system
        const currentSpeed = state.getWaveSpeed() ;

        // get current and player positions
        const currentPos = vec3.create();
        this.object.getPositionLocal(currentPos);
        const playerPos = state.getPlayerLocation();

        // Check if zombie is close enough to player to trigger game over
        if (vec3.dist(currentPos, playerPos) < 0.5) {
            console.log("Zombie reached player, game over");
            state.loseGame();
            return;
        }

        // compute direction vector in XZ plane
        const dir = vec3.fromValues(
            playerPos[0] - currentPos[0],
            0,
            playerPos[2] - currentPos[2]
        );
        if (vec3.len(dir) < 0.01) return; // already at player
        vec3.normalize(dir, dir);

        // move towards player with wave-adjusted speed
        const moveVec = vec3.scale(vec3.create(), dir, currentSpeed * dt);
        // update position
        vec3.add(currentPos, currentPos, moveVec);
        this.object.setPositionLocal(currentPos);
        // ensure Y position is at floor height
        currentPos[1] = state.floorHeight;
        this.object.setPositionLocal(currentPos);
        // update the object position again to ensure Y is set
        this.object.setPositionLocal(currentPos);
        // update the collider position
        this.object.getComponent("collision").setPositionLocal(currentPos);
        // ensure the collider is at the correct height
        this.object.getComponent("collision").setHeight(state.floorHeight);

        // rotate to face the player (Y-axis rotation)
        const angleDeg = Math.atan2(dir[0], dir[2]) * (180 / Math.PI);
        this.object.resetRotation();
        this.object.rotateAxisAngleDegLocal([0, 1, 0], angleDeg);
    }
}
