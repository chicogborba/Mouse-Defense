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
@brief Controls the bullet trajectory

Deactivates bullet updates to preserve performance. Bullets collision is also
deactivated when the bullet is on the ground. This is done to prevent the 
score-trigger going off when the mice run over the bullets.

*/

let newDir = new Float32Array(3);

export class BulletPhysics extends Component {
    static TypeName = "bullet-physics";
    static Properties = {
        speed: { type: Type.Float, default: 1.0 },
    }

    init() {
        this.dir = new Float32Array(3);
        this.position = [0, 0, 0];
        this.object.getPositionWorld(this.position);
        this.correctedSpeed = this.speed / 6;

        this.collision = this.object.getComponent('collision', 0);
        if (!this.collision) {
            console.warn(
                "'bullet-physics' component on object",
                this.object.name,
                "requires a collision component"
            );
        }
    }
    update(dt) {
        if (isNaN(dt)) {
            console.log("dt is NaN");
            return;
        }

        // Se já marcou ponto, não faz mais nada
        if (this.scored) return;

        //update position
        this.object.getPositionWorld(this.position);
        //deactivate bullet if through the floor
        if (this.position[1] <= state.floorHeight + this.collision.extents[0]) {
            this.destroyBullet(0);
            return;
        }
        //deactivate bullet if travel distance too far
        if (vec3.length(this.position) > 175) {
            this.destroyBullet(0);
            return;
        }

        newDir.set(this.dir);
        vec3.scale(newDir, newDir, this.correctedSpeed);
        vec3.add(this.position, this.position, newDir);
        this.object.setPositionLocal(this.position);

        let overlaps = this.collision.queryOverlaps();

        for (let i = 0; i < overlaps.length; ++i) {
            let t = overlaps[i].object.getComponent("score-trigger");

            // this.destroyBullet(0);
            // se eu movo this.destroyBullet(0); pra aqui funciona e ele desaparece quando bate em algo mas n funciona o hit tipo o tiro n ativa botões nem mata bichos

            if (t) {
                t.onHit(() => this.destroyBullet(0));                  // Ativar ação do alvo (ponto, morte, etc)
                this.destroyBullet(0);      // Só então destruir
                break;
            }
        }
    }
    destroyBullet(time) {
        // 1) desativa render e colisão na hora
        const meshComp = this.object.getComponent("mesh", 0);
        if (meshComp) meshComp.active = false;
        if (this.collision) this.collision.active = false;
    
        // 2) opcional: desativa o próprio objeto pra sair da árvore imediatamente
        this.object.active = false;
    
        // 3) destrói de fato (ou remove da cena)
        if (time === 0) {
            // remove imediatamente
            this.engine.scene.removeObject(this.object);
            // ou: this.object.destroy();
        } else {
            setTimeout(() => {
                this.engine.scene.removeObject(this.object);
            }, time);
        }
    }
};
