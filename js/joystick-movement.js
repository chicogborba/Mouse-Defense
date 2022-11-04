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

/**
 * Basic movement with W/A/S/D keys.
 */
WL.registerComponent('joystick-movement', {
    /** Movement speed in m/s. */
    speed: { type: WL.Type.Float, default: 0.1 },
    /** Object of which the orientation is used to determine forward direction */
    headObject: { type: WL.Type.Object }
}, {
    init: function() {
        this.up = false;
        this.right = false;
        this.down = false;
        this.left = false;

        window.addEventListener('keydown', this.press.bind(this));
        window.addEventListener('keyup', this.release.bind(this));
    },

    start: function() {
        this.headObject = this.headObject || this.object;
    },

    update: function() {
        let direction = [0, 0, 0];

        if (this.up) direction[2] -= 1.0;
        if (this.down) direction[2] += 1.0;
        if (this.left) direction[0] -= 1.0;
        if (this.right) direction[0] += 1.0;

        glMatrix.vec3.normalize(direction, direction);
        direction[0] *= this.speed;
        direction[2] *= this.speed;
        glMatrix.vec3.transformQuat(direction, direction, this.headObject.transformWorld);
        this.object.translate(direction);
    },

    press: function(e) {
        if (e.keyCode === 38 /* up */ || e.keyCode === 87 /* w */ || e.keyCode === 90 /* z */ ) {
            this.up = true
        } else if (e.keyCode === 39 /* right */ || e.keyCode === 68 /* d */ ) {
            this.right = true
        } else if (e.keyCode === 40 /* down */ || e.keyCode === 83 /* s */ ) {
            this.down = true
        } else if (e.keyCode === 37 /* left */ || e.keyCode === 65 /* a */ || e.keyCode === 81 /* q */ ) {
            this.left = true
        }
    },

    release: function(e) {
        if (e.keyCode === 38 /* up */ || e.keyCode === 87 /* w */ || e.keyCode === 90 /* z */ ) {
            this.up = false
        } else if (e.keyCode === 39 /* right */ || e.keyCode === 68 /* d */ ) {
            this.right = false
        } else if (e.keyCode === 40 /* down */ || e.keyCode === 83 /* s */ ) {
            this.down = false
        } else if (e.keyCode === 37 /* left */ || e.keyCode === 65 /* a */ || e.keyCode === 81 /* q */ ) {
            this.left = false
        }
    }
});