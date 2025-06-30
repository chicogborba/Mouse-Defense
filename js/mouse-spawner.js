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
import { HowlerAudioSource } from "@wonderlandengine/components";
import { state } from "./game";
import { MouseMover } from "./mouse-mover";
import { ScoreTrigger } from "./score-trigger";
/**
@brief Spawns in mice at set intervals until maxTargets is reached.
*/

const tempQuat2 = new Float32Array(8);

export class MouseSpawner extends Component {
    static TypeName = "mouse-spawner";
    static Properties = {
        targetMesh: { type: Type.Mesh },
        targetMaterial: { type: Type.Material },
        spawnAnimation: { type: Type.Animation },
        particles: { type: Type.Object },
        initialSpawnInterval: { type: Type.Float, default: 2.0 },
        minSpawnInterval: { type: Type.Float, default: 0.5 },
        spawnIntervalDecreaseRate: { type: Type.Float, default: 0.95 },
        bulletMesh: { type: Type.Mesh },
        bulletMaterial: { type: Type.Material },
    };

    static onRegister(engine) {
        engine.registerComponent(ScoreTrigger);
        engine.registerComponent(HowlerAudioSource);
        // engine.registerComponent(MouseMover);
    }

    time = 0;
    spawnInterval = 2.0;
    targets = [];
    waveNumber = 1;

    init() {
        state.despawnTarget = function (obj) {
            for (let i = 0; i < this.targets.length; i++) {
                if (obj.objectId == this.targets[i].objectId) {
                    this.targets.splice(i,1);
                    break;
                }
            }
            obj.destroy();
        }.bind(this);
    }

    start() {
        state.mouseSpawner = this;
        this.spawnInterval = this.initialSpawnInterval;
        this.spawnTarget();
    }

    update(dt) {
        if (state.gameOver || state.paused) return;
        
        this.time += dt;
        if (this.time >= this.spawnInterval) {
            this.time = 0;
            this.spawnTarget();
            
            // Decrease spawn interval until it hits the minimum
            if (this.spawnInterval > this.minSpawnInterval) {
                this.spawnInterval *= this.spawnIntervalDecreaseRate;
            }
            
            // Increase wave number every 10 zombies
            if (this.targets.length % 10 === 0) {
                this.waveNumber++;
                state.updateScore(`Wave ${this.waveNumber} - Zombies: ${this.targets.length}`);
            }
        }
    }

    reset() {
        for (let i = 0; i < this.targets.length; i++) {
            this.targets[i].destroy();
        }
        this.targets = [];
        this.waveNumber = 1;
        this.spawnInterval = this.initialSpawnInterval;
        this.time = 0;
        this.object.resetPosition();
    }


    spawnTarget() {
        // cria o objeto no mesmo ponto do spawner
        const obj = this.engine.scene.addObject();
        obj.setTransformLocal(this.object.getTransformWorld(tempQuat2));
    
        // --- NOVO: calcula deslocamento aleatório no plano XZ ---
        const angle = Math.random() * 2 * Math.PI;
        const dist  = Math.random() * 5.0;
        const dx    = Math.cos(angle) * dist;
        const dz    = Math.sin(angle) * dist;
        // aplica ao objeto
        obj.translateLocal([dx, 0, dz]);
    
        // escala, mesh, material etc.
        obj.scaleLocal([1, 1, 1]);
        const mesh = obj.addComponent("mesh");
        mesh.mesh     = this.targetMesh;
        mesh.material = this.targetMaterial;
        mesh.active   = true;
    
        // movimento
        obj.addComponent(MouseMover);
    
        // corrige rotação
        obj.rotateAxisAngleDegLocal([1, 0, 0], 180);
    
        // animação de spawn
        if (this.spawnAnimation) {
            const anim = obj.addComponent("animation");
            anim.playCount = 1;
            anim.animation = this.spawnAnimation;
            anim.active    = true;
            anim.play();
        }
    
        // gatilho de pontuação
        const trigger = this.engine.scene.addObject(obj);
        trigger.addComponent("collision", {
            collider: WL.Collider.Sphere,
            extents:  [1.5, 1.5, 1.5],
            group:    1 << 0,
            active:   true,
        });
        trigger.translateLocal([0, 1, 0]);
        trigger.addComponent(ScoreTrigger, {
            particles: this.particles
        });
    
        obj.setDirty();
        this.targets.push(obj);
    }
    
};
