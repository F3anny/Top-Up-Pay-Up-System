const fs = require('fs');
const file = 'C:\\Users\\isama\\Downloads\\EdgeWallet-main\\EdgeWallet-main\\frontend\\style.css';
let css = fs.readFileSync(file, 'utf8');

// Replace standard colors
css = css.replace(/rgba\(99, 102, 241/g, 'rgba(255, 255, 255');  
css = css.replace(/rgba\(168, 85, 247/g, 'rgba(200, 200, 200'); 
css = css.replace(/rgba\(236, 72, 153/g, 'rgba(150, 150, 150');
css = css.replace(/rgba\(0, 212, 255/g, 'rgba(255, 255, 255');  
css = css.replace(/rgba\(0, 255, 136/g, 'rgba(255, 255, 255');  
css = css.replace(/rgba\(255, 45, 149/g, 'rgba(150, 150, 150'); 
css = css.replace(/rgba\(255, 107, 43/g, 'rgba(200, 200, 200'); 
css = css.replace(/rgba\(34, 211, 238/g, 'rgba(255, 255, 255'); 
css = css.replace(/rgba\(239, 68, 68/g, 'rgba(150, 150, 150');  
css = css.replace(/rgba\(235, 0, 27/g, 'rgba(60, 60, 60');         
css = css.replace(/rgba\(255, 159, 0/g, 'rgba(180, 180, 180');   

// Solid hex replacements
css = css.replace(/#6366f1/ig, '#555555');
css = css.replace(/#a855f7/ig, '#888888');
css = css.replace(/#ec4899/ig, '#aaaaaa');
css = css.replace(/#00d4ff/ig, '#ffffff');
css = css.replace(/#ff2d95/ig, '#cccccc');
css = css.replace(/#00ff88/ig, '#ffffff');
css = css.replace(/#ff6b2b/ig, '#dddddd');
css = css.replace(/#22d3ee/ig, '#eeeeee');

// Custom Gradients & specific elements
css = css.replace(/linear-gradient\(135deg, #0c1445 0%, #1a0a3e 30%, #0f2847 60%, #0a1628 100%\)/g, 'linear-gradient(135deg, #111 0%, #222 30%, #1a1a1a 60%, #0a0a0a 100%)');
css = css.replace(/linear-gradient\(135deg, #0a1628 0%, #0c1445 40%, #1a0a3e 100%\)/g, 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 40%, #222 100%)');

// Mastercard chip
css = css.replace(/rgba\(251, 191, 36/g, 'rgba(200, 200, 200'); 
css = css.replace(/rgba\(245, 158, 11/g, 'rgba(100, 100, 100'); 

// Button gradient
css = css.replace(/linear-gradient\(135deg, #00ff88, #00cc6a\)/g, 'linear-gradient(135deg, #fff, #ccc)');

// Update CSS variables
css = css.replace(/--bg-body: #050816;/g, '--bg-body: #050505;');
css = css.replace(/--bg-sidebar: rgba\(8, 12, 30, 0\.95\);/g, '--bg-sidebar: rgba(10, 10, 10, 0.95);');
css = css.replace(/--bg-card: rgba\(10, 15, 40, 0\.55\);/g, '--bg-card: rgba(15, 15, 15, 0.55);');
css = css.replace(/--bg-input: rgba\(8, 12, 30, 0\.7\);/g, '--bg-input: rgba(10, 10, 10, 0.7);');
css = css.replace(/--text-muted: #7c8db5;/g, '--text-muted: #999999;');
css = css.replace(/--text-dim: #4a5578;/g, '--text-dim: #666666;');

// Remove hue-rotate animations for Aurora to keep it grayscale
css = css.replace(/filter: hue-rotate\(([-\d]*)deg\);/g, '');
css = css.replace(/@keyframes auroraShift {[\s\S]*?}/g, `@keyframes auroraShift {
    0% { opacity: 1; }
    50% { opacity: 0.6; }
    100% { opacity: 1; }
}`);

fs.writeFileSync(file, css);
console.log("Replaced colors successfully.");
