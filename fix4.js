const fs = require('fs');
let code = fs.readFileSync('app_v3.js', 'utf8');

const target = `    safeBind("btn-dash-current-month", "click", () => {
        const today = new Date();
        dashSelectedMonth = today.getMonth();
        dashSelectedYear = today.getFullYear();
        renderDashboard();
    });`;

const replacement = `    safeBind("btn-dash-current-month", "click", () => {
        const today = new Date();
        dashSelectedMonth = today.getMonth();
        dashSelectedYear = today.getFullYear();
        dashSelectedDate = new Date();
        renderDashboard();
    });`;

code = code.replace(target, replacement);

fs.writeFileSync('app_v3.js', code);
console.log('Fixed btn-dash-current-month');
