const fs = require('fs');
let code = fs.readFileSync('app_v3.js', 'utf8');

const regex = /const profit = income - expense;[\s\S]*?const profitColor = profit >= 0 \? colorPurple : colorDanger;/;

const replacement = `const profit = income - expense;
    const ctx = document.getElementById('dashboardChart').getContext('2d');
    
    if (dashboardChartInstance) {
        dashboardChartInstance.destroy();
    }
    
    const rootStyles = getComputedStyle(document.body);
    const colorSuccess = rootStyles.getPropertyValue('--color-success').trim() || '#10b981';
    const colorDanger = rootStyles.getPropertyValue('--color-danger').trim() || '#ef4444';
    const colorPurple = rootStyles.getPropertyValue('--color-purple').trim() || '#8b5cf6';
    const textColor = rootStyles.getPropertyValue('--color-text-main').trim() || '#334155';
    
    const profitColor = profit >= 0 ? colorPurple : colorDanger;`;

code = code.replace(regex, replacement);
fs.writeFileSync('app_v3.js', code);
console.log('Fixed app_v3.js');
