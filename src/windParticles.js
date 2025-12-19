export class WindParticles {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.particles = [];
        this.particleCount = 1500;
        this.speedMultiplier = 0.5;
        this.windSpeed = 0; // km/h
        this.windDeg = 0; // degrees (0 is north, 90 is east)

        this.vx = 0;
        this.vy = 0;

        this.resize();
        window.addEventListener('resize', () => this.resize());

        this.init();
        this.animate();
    }

    init() {
        this.particles = [];
        for (let i = 0; i < this.particleCount; i++) {
            this.particles.push(this.createParticle());
        }
    }

    createParticle() {
        return {
            x: Math.random() * this.canvas.width,
            y: Math.random() * this.canvas.height,
            age: Math.floor(Math.random() * 100),
            maxAge: 30 + Math.random() * 40, // Life span for trails
            opacity: 0.3 + Math.random() * 0.5
        };
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.init();
    }

    updateWind(speed, deg) {
        this.windSpeed = speed;
        this.windDeg = deg;

        // Convert wind degree to radians
        // Weather degree: 0 is North (wind from North blows South), 90 is East (blows West)
        // Canvas angles: 0 is Right, 90 is Down.
        // To blow South (Down) when deg=0: rad = 90 deg
        // To blow West (Left) when deg=90: rad = 180 deg
        const rad = (deg + 90) * (Math.PI / 180);

        // Magnitude based on wind speed
        const magnitude = Math.max(1, speed) * this.speedMultiplier;

        this.vx = Math.cos(rad) * magnitude;
        this.vy = Math.sin(rad) * magnitude;
    }

    animate() {
        // Use destination-out to gradually fade out the existing drawing
        this.ctx.globalCompositeOperation = 'destination-out';
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.globalCompositeOperation = 'source-over';

        const speedFactor = 0.2;

        // Orange color matching the brand (#fa6533)
        const particleColor = '250, 101, 51';

        for (let i = 0; i < this.particles.length; i++) {
            const p = this.particles[i];

            const oldX = p.x;
            const oldY = p.y;

            // Add a bit of local movement variation
            const noiseX = (Math.random() - 0.5) * 0.5;
            const noiseY = (Math.random() - 0.5) * 0.5;

            // Move particle
            p.x += (this.vx + noiseX) * speedFactor;
            p.y += (this.vy + noiseY) * speedFactor;
            p.age++;

            // Draw line
            this.ctx.strokeStyle = `rgba(${particleColor}, ${p.opacity})`;
            this.ctx.lineWidth = 1.2;
            this.ctx.lineCap = 'round';
            this.ctx.beginPath();
            this.ctx.moveTo(oldX, oldY);
            this.ctx.lineTo(p.x, p.y);
            this.ctx.stroke();

            // Wrap around or respawn
            if (p.age > p.maxAge) {
                Object.assign(p, this.createParticle());
                p.age = 0;
            } else {
                // Wrap around edges
                if (p.x < -20) p.x = this.canvas.width + 20;
                else if (p.x > this.canvas.width + 20) p.x = -20;

                if (p.y < -20) p.y = this.canvas.height + 20;
                else if (p.y > this.canvas.height + 20) p.y = -20;
            }
        }

        requestAnimationFrame(() => this.animate());
    }
}
