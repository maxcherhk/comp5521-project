"use client"; // if using App Router

import { useEffect } from "react";

export default function BackgroundAnimation() {
	useEffect(() => {
		const canvas = document.getElementById("bgCanvas");
		const ctx = canvas.getContext("2d");

		let width = window.innerWidth;
		let height = window.innerHeight;
		canvas.width = width;
		canvas.height = height;

		let points = [];
		for (let i = 0; i < 100; i++) {
			points.push({
				x: Math.random() * width,
				y: Math.random() * height,
				vx: Math.random() * 2 - 1,
				vy: Math.random() * 2 - 1,
			});
		}

		const animate = () => {
			ctx.clearRect(0, 0, width, height);

			for (let i = 0; i < points.length; i++) {
				let p = points[i];
				p.x += p.vx;
				p.y += p.vy;

				if (p.x < 0 || p.x > width) p.vx *= -1;
				if (p.y < 0 || p.y > height) p.vy *= -1;

				ctx.beginPath();
				ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
				ctx.fillStyle = "rgba(255,255,255,0.7)";
				ctx.fill();

				for (let j = i + 1; j < points.length; j++) {
					let p2 = points[j];
					let dist = Math.hypot(p.x - p2.x, p.y - p2.y);
					if (dist < 100) {
						ctx.beginPath();
						ctx.moveTo(p.x, p.y);
						ctx.lineTo(p2.x, p2.y);
						ctx.strokeStyle = "rgba(255,255,255,0.1)";
						ctx.stroke();
					}
				}
			}

			requestAnimationFrame(animate);
		};

		animate();

		const handleResize = () => {
			width = window.innerWidth;
			height = window.innerHeight;
			canvas.width = width;
			canvas.height = height;
		};

		window.addEventListener("resize", handleResize);
		return () => window.removeEventListener("resize", handleResize);
	}, []);

	return (
		<canvas
			id="bgCanvas"
			style={{
				position: "fixed",
				top: 0,
				left: 0,
				width: "100%",
				height: "100%",
				zIndex: -1,
				background: "#0f2027",
			}}
		/>
	);
}
