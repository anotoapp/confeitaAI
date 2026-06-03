const fs = require('fs');
const css = fs.readFileSync('style.css', 'utf8');
const lines = css.split(/\r?\n/);

lines.forEach((line, idx) => {
    if (line.includes('overflow: hidden') || line.includes('overflow-y: hidden') || line.includes('overflow:hidden')) {
        console.log(`Line ${idx + 1}: ${line.trim()}`);
        console.log("Context:");
        const start = Math.max(0, idx - 8);
        for (let i = start; i <= idx; i++) {
            console.log(`  ${i + 1}: ${lines[i]}`);
        }
        console.log("-----------------------------------------");
    }
});
