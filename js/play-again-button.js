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
import {state} from "./game";
/**
@brief Shootable button to restart the game. 

Resets spawner location, SFX, music, and scoreboard. Player position 
does not reset.

button.js from WastePaperBin-AR wasn't working properly. Changed 
implementation to have the button respond to collision events from the 
player's bullets.
*/

export class PlayAgainButton extends Component {
    static TypeName = "play-again-button";
    static Properties = {};
  
    start() {
      this.collision = this.object.getComponent("collision");
      this.soundPop = this.object.addComponent("howler-audio-source", {
        src: "sfx/pop-94319.mp3",
        volume: 1.9,
      });
  
      state.resetButton = this;
      this.unhide();
    }
  
    restart() {
      console.log("Restarting game");
      state.restart();
      this.hide();
    }
  
    hide() {
      console.log("Hiding button");
      if (this.object.children[0]) {
        const mesh = this.object.children[0].getComponent("mesh");
        if (mesh) mesh.active = false;
      }
      if (this.object.children[1]) {
        const text = this.object.children[1].getComponent("text");
        if (text) text.active = false;
      }
      this.active = false;
    }
  
    unhide() {
      console.log("Unhiding button");
      if (this.object.children[0]) {
        const mesh = this.object.children[0].getComponent("mesh");
        if (mesh) mesh.active = true;
      }
      if (this.object.children[1]) {
        const text = this.object.children[1].getComponent("text");
        if (text) text.active = true;
      }
      this.active = true;
    }
  
    update(dt) {
      if (!this.active) return;
      
      let overlaps = this.collision.queryOverlaps();
      for (let i = 0; i < overlaps.length; ++i) {
        let p = overlaps[i].object.getComponent("bullet-physics");
        if (p) {
          this.restart();
          this.soundPop.play();
          break;
        }
      }
    }
  };
