const fs = require('fs');
let code = fs.readFileSync('app_v3.js', 'utf8');

const regexFilter = /\/\/ Helper: check if date string belongs to the currently navigated month\/year[\s\S]*?function isThisMonth\(dateStr\) \{[\s\S]*?return d\.getMonth\(\) === dashSelectedMonth && d\.getFullYear\(\) === dashSelectedYear;\r?\n    \}/;

const replacementFilter = `// Helper: check if date string belongs to the selected period
    function isDateInSelectedPeriod(dateStr) {
        if (!dateStr) return false;
        const d = new Date(dateStr + "T00:00:00");
        const today = new Date();
        today.setHours(0,0,0,0);
        
        if (dashPeriodType === 'month') {
            return d.getMonth() === dashSelectedMonth && d.getFullYear() === dashSelectedYear;
        } else if (dashPeriodType === 'day') {
            return d.getDate() === dashSelectedDate.getDate() && 
                   d.getMonth() === dashSelectedDate.getMonth() && 
                   d.getFullYear() === dashSelectedDate.getFullYear();
        } else {
            let daysToSubtract = 0;
            if (dashPeriodType === '7days') daysToSubtract = 7;
            if (dashPeriodType === '15days') daysToSubtract = 15;
            if (dashPeriodType === '30days') daysToSubtract = 30;
            
            const past = new Date(today);
            past.setDate(past.getDate() - daysToSubtract);
            return d >= past && d <= today;
        }
    }`;

code = code.replace(regexFilter, replacementFilter);

// Replace the label logic
const regexLabel = /\/\/ Update the main elegant navigator label[\s\S]*?if \(dashSelectedMonthLabel\) \{[\s\S]*?dashSelectedMonthLabel\.innerText = `\$\{monthLabel\} \$\{yearLabel\}`;\r?\n    \}/;

const replacementLabel = `// Update the main elegant navigator label
    const dashSelectedMonthLabel = document.getElementById("dash-selected-month-label");
    if (dashSelectedMonthLabel) {
        if (dashPeriodType === 'month') {
            dashSelectedMonthLabel.innerText = \`\$\{monthLabel\} \$\{yearLabel\}\`;
        } else if (dashPeriodType === 'day') {
            dashSelectedMonthLabel.innerText = dashSelectedDate.toLocaleDateString("pt-BR");
        } else {
            let daysToSubtract = 7;
            if (dashPeriodType === '15days') daysToSubtract = 15;
            if (dashPeriodType === '30days') daysToSubtract = 30;
            const past = new Date();
            past.setDate(past.getDate() - daysToSubtract);
            const fmt = (d) => d.toLocaleDateString("pt-BR", {day:'2-digit', month:'2-digit'});
            dashSelectedMonthLabel.innerText = \`\$\{fmt(past)\} a \$\{fmt(new Date())\}\`;
        }
    }`;

code = code.replace(regexLabel, replacementLabel);

// Replace isThisMonth usages with isDateInSelectedPeriod
code = code.replace(/isThisMonth\(/g, 'isDateInSelectedPeriod(');

// In the text, we have some dynamic texts that mention "em ${monthLabel}". We should replace those to "neste período".
// e.g. "Nenhum lançamento em ${monthLabel}." -> "Nenhum lançamento neste período."
code = code.replace(/em \$\{monthLabel\}/g, 'neste período');

fs.writeFileSync('app_v3.js', code);
console.log('Fixed renderDashboard date filters in app_v3.js');
