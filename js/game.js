export const state = {
    shotCount: 0,
    /* Global function used to update the score display */
    updateCounter: null,
    updateScore: null,
    gameOver: true,
    score: 0,
    resetButton: null,
    bgMusic: null,
    victoryMusic: null,
    mouseSound: null,
    mouseSpawner: null,
    targetsSpawned: 0,
    maxTargets: 20, /* Overwritten by mouse-spawner */
    floorHeight: 0,
    getPlayerLocation: null,
    updateMoveDuration: null,
    bulletSpawner: null,
    hideLogo: null,
    despawnTarget: null,
    firstShot: false,
    launch: null,
    paused: false,

    // Wave system properties
    currentWave: 1,
    zombiesKilledInWave: 0,
    waveProperties: {
        baseZombies: 10,        // Starting number of zombies in wave 1
        zombiesIncrease: 5,     // How many more zombies per wave
        baseSpeed: 1.5,         // Starting speed in wave 1
        speedIncreasePercent: 20 // Speed increase percentage per wave (increased to 20%)
    },

    getCurrentWave() {
        return this.currentWave;
    },

    getWaveZombieCount() {
        return this.waveProperties.baseZombies + 
               (this.currentWave - 1) * this.waveProperties.zombiesIncrease;
    },

    getWaveSpeed() {
        const speedMultiplier = 1 + ((this.currentWave - 1) * this.waveProperties.speedIncreasePercent / 100);
        return this.waveProperties.baseSpeed * speedMultiplier;
    },

    getRemainingZombies() {
        return this.getWaveZombieCount() - this.zombiesKilledInWave;
    },

    updateWaveDisplay() {
        const remaining = this.getRemainingZombies();
        const nextWaveZombies = this.waveProperties.baseZombies + 
                               (this.currentWave) * this.waveProperties.zombiesIncrease;
        this.updateScore(
            `Wave ${this.currentWave} - Remaining: ${remaining} zombies - Next Wave: ${nextWaveZombies} zombies`
        );
    },

    zombieKilled() {
        this.zombiesKilledInWave++;
        this.score++;

        // Check if wave is complete
        if (this.zombiesKilledInWave >= this.getWaveZombieCount()) {
            this.nextWave();
        } else {
            this.updateWaveDisplay();
        }
    },

    nextWave() {
        this.currentWave++;
        this.zombiesKilledInWave = 0;
        
        // Update max targets for the new wave
        if (this.mouseSpawner) {
            this.mouseSpawner.maxTargets = this.getWaveZombieCount();
        }

        // Update display with new wave info
        this.updateWaveDisplay();
        
        console.log(`Starting Wave ${this.currentWave} - Speed multiplier: ${1 + ((this.currentWave - 1) * this.waveProperties.speedIncreasePercent / 100)}`);
    },

    loseGame() {
        console.log("Game Over triggered");
        this.gameOver = true;
        
        // Stop music first
        if (this.mouseSound) {
            this.mouseSound.stop();
        }

        // Clear all existing zombies
        if (this.mouseSpawner) {
            this.mouseSpawner.reset();
        }

        // Show reset button and ensure it's visible
        if (this.resetButton) {
            console.log("Showing reset button");
            this.resetButton.unhide();
            // Force button to be visible
            this.resetButton.object.children[0].getComponent("mesh").active = true;
            this.resetButton.object.children[1].getComponent("text").active = true;
            this.resetButton.active = true;
        } else {
            console.log("Reset button not found!");
        }

        // Update score display
        this.updateScore(`Game Over! You survived ${this.currentWave} waves and eliminated ${this.score} zombies!`);
    },

    restart() {
        if (this.mouseSpawner) {
            this.mouseSpawner.reset();
        }

        this.victoryMusic.stop();
        this.gameOver = false;
        this.shotCount = 0;
        this.score = 0;
        this.currentWave = 1;
        this.zombiesKilledInWave = 0;

        // Reset max targets for wave 1
        if (this.mouseSpawner) {
            this.mouseSpawner.maxTargets = this.getWaveZombieCount();
        }

        this.updateCounter();
        this.updateWaveDisplay();
    }
};
