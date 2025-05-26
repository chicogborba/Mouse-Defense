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
        zombiesIncrease: 10,     // How many more zombies per wave
        baseSpeed: 2.5,         // Starting speed in wave 1 (increased from 1.5)
        speedIncreasePercent: 50 // Speed increase percentage per wave (increased to 50%)
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
        const speed = this.waveProperties.baseSpeed * speedMultiplier;
        console.log(`Wave ${this.currentWave} speed: ${speed.toFixed(2)} (multiplier: ${speedMultiplier.toFixed(2)})`);
        return speed;
    },

    getRemainingZombies() {
        const total = this.getWaveZombieCount();
        const killed = this.zombiesKilledInWave;
        console.log(`Wave ${this.currentWave}: ${killed}/${total} zombies killed`);
        return total - killed;
    },

    updateWaveDisplay() {
        const remaining = this.getRemainingZombies();
        const nextWaveZombies = this.waveProperties.baseZombies + 
                               (this.currentWave) * this.waveProperties.zombiesIncrease;
        const speed = this.getWaveSpeed();
        this.updateScore(
            `Wave ${this.currentWave} - Remaining: ${remaining} zombies - Speed: ${speed.toFixed(1)} - Next Wave: ${nextWaveZombies} zombies`
        );
    },

    zombieKilled() {
        this.zombiesKilledInWave++;
        this.score++;

        // Check if wave is complete
        const remaining = this.getRemainingZombies();
        if (remaining <= 0) {
            console.log(`Wave ${this.currentWave} complete! Starting next wave...`);
            this.nextWave();
        } else {
            this.updateWaveDisplay();
        }
    },

    nextWave() {
        this.currentWave++;
        this.zombiesKilledInWave = 0;
        
        // Update max targets for the new wave
        const newZombieCount = this.getWaveZombieCount();
        if (this.mouseSpawner) {
            console.log(`Setting new wave ${this.currentWave} with ${newZombieCount} zombies`);
            this.mouseSpawner.maxTargets = newZombieCount;
            this.mouseSpawner.reset(); // Clear existing zombies and start new wave
        }

        // Update display with new wave info
        this.updateWaveDisplay();
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
            const initialZombies = this.getWaveZombieCount();
            console.log(`Restarting game with ${initialZombies} zombies in wave 1`);
            this.mouseSpawner.maxTargets = initialZombies;
        }

        this.updateCounter();
        this.updateWaveDisplay();
    }
};
