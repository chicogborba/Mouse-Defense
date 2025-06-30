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
@brief Spawns waves of 6 mice per side (±X, ±Z). Após 6 spawns, escolhe um novo lado aleatório.
*/

const tempQuat2 = new Float32Array(8);

export class MouseSpawner extends Component {
    static TypeName = "mouse-spawner";
    static Properties = {
        targetMesh:           { type: Type.Mesh },
        targetMaterial:       { type: Type.Material },
        spawnAnimation:       { type: Type.Animation },
        particles:            { type: Type.Object },
        initialSpawnInterval: { type: Type.Float, default: 2.0 },
        minSpawnInterval:     { type: Type.Float, default: 0.5 },
        spawnIntervalDecreaseRate: { type: Type.Float, default: 0.95 },
        // Raio mínimo/ máximo para spawn
        spawnRadiusMin:       { type: Type.Float, default: 15.0 },
        spawnRadiusMax:       { type: Type.Float, default: 30.0 },
    };

    time = 0;
    spawnInterval = 1.2;
    targets = [];

    // Para controle de waves por lado
    sides = ["+X", "-X", "+Z", "-Z"];
    currentSide = null;
    sideCount = 0;
    waveNumber = 1;

    static onRegister(engine) {
        engine.registerComponent(ScoreTrigger);
        engine.registerComponent(HowlerAudioSource);
        // engine.registerComponent(MouseMover);
    }

    init() {
        // Função global para despawn
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
        this.pickNewSide();     // escolhe o primeiro lado
        this.spawnTarget();
    }

    update(dt) {
        if (state.gameOver || state.paused) return;
        
        this.time += dt;
        if (this.time >= this.spawnInterval) {
            this.time = 0;
            this.spawnTarget();
            
            // Diminui o intervalo
            if (this.spawnInterval > this.minSpawnInterval) {
                this.spawnInterval *= this.spawnIntervalDecreaseRate;
            }
        }
    }

    reset() {
        // Destroi todos os alvos atuais
        for (let obj of this.targets) {
            obj.destroy();
        }
        this.targets = [];
        this.time = 0;
        this.spawnInterval = this.initialSpawnInterval;
        this.waveNumber = 1;
        this.sideCount = 0;
        this.pickNewSide();
        this.object.resetPosition();
    }

    pickNewSide() {
        // Escolhe um lado aleatório (pode repetir)
        const idx = Math.floor(Math.random() * this.sides.length);
        this.currentSide = this.sides[idx];
        this.sideCount = 0;
        // Atualiza texto de wave
        state.updateScore(`Wave ${this.waveNumber} – Lado ${this.currentSide}`);
    }

    spawnTarget() {
        // Se já geramos 6 no lado atual, passamos para o próximo
        if (this.sideCount >= 6) {
            this.waveNumber++;
            this.pickNewSide();
        }

        // Cria o objeto no ponto do spawner
        const obj = this.engine.scene.addObject();
        obj.setTransformLocal(this.object.getTransformWorld(tempQuat2));

        // Gera deslocamento com base no lado atual
        const minR = this.spawnRadiusMin;
        const maxR = this.spawnRadiusMax;
        let dx = 0, dz = 0;

        switch (this.currentSide) {
            case "+X":
                dx = minR + Math.random() * (maxR - minR);
                dz = (Math.random() * 2 - 1) * maxR;
                break;
            case "-X":
                dx = - (minR + Math.random() * (maxR - minR));
                dz = (Math.random() * 2 - 1) * maxR;
                break;
            case "+Z":
                dz = minR + Math.random() * (maxR - minR);
                dx = (Math.random() * 2 - 1) * maxR;
                break;
            case "-Z":
                dz = - (minR + Math.random() * (maxR - minR));
                dx = (Math.random() * 2 - 1) * maxR;
                break;
        }
        obj.translateLocal([dx, 0, dz]);

        // Configura mesh, material e escala
        obj.scaleLocal([1,1,1]);
        const mesh = obj.addComponent("mesh");
        mesh.mesh     = this.targetMesh;
        mesh.material = this.targetMaterial;
        mesh.active   = true;

        // Movimento
        obj.addComponent(MouseMover);

        // Corrige rotação
        obj.rotateAxisAngleDegLocal([1,0,0], 180);

        // Animação de spawn
        if (this.spawnAnimation) {
            const anim = obj.addComponent("animation");
            anim.playCount = 1;
            anim.animation = this.spawnAnimation;
            anim.active    = true;
            anim.play();
        }

        // Gatilho de pontuação
        const trigger = this.engine.scene.addObject(obj);
        trigger.addComponent("collision", {
            collider: WL.Collider.Sphere,
            extents:  [1.5,1.5,1.5],
            group:    1 << 0,
            active:   true,
        });
        trigger.translateLocal([0,1,0]);
        trigger.addComponent(ScoreTrigger, {
            particles: this.particles
        });

        obj.setDirty();
        this.targets.push(obj);

        // Incrementa contador deste lado
        this.sideCount++;
    }
}
