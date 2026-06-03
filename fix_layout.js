const fs = require('fs');
let code = fs.readFileSync('app_v3.js', 'utf8');

const regex = /const items = state\.recipes\.map\(r => \{[\s\S]*?\} /;

// I'll replace the whole block from "const items =" up to the end of the if statement.
// Wait, I can just use string replacement on the block since I can copy-paste it from view_file output.

const target = `    if (capacityPanel && state.recipes.length > 0) {
        const items = state.recipes.map(r => {
            const cap = calcProductionCapacity(r);
            const color = cap === 0 ? 'var(--color-danger)' : cap < 3 ? '#f59e0b' : 'var(--color-success)';
            return \`<div style="display:flex;align-items:center;gap:10px;padding:8px 14px;background:white;border-radius:8px;border:1px solid #e2e8f0;">
                <span style="font-size:22px;">🎂</span>
                <div>
                    <div style="font-weight:600;font-size:14px;">\${r.name}</div>
                    <div style="font-size:12px;color:\${color};font-weight:700;">\${cap === 0 ? 'Estoque insuficiente' : \`Consegue produzir \${cap} unidade\${cap > 1 ? 's' : ''}\`}</div>
                </div>
            </div>\`;
        }).join('');
        capacityPanel.innerHTML = \`
            <div class="panel-card glass" style="padding:16px;">
                <h3 style="margin-bottom:14px;font-size:15px;">⚡ Capacidade de Produção Atual</h3>
                <div style="display:flex;flex-wrap:wrap;gap:10px;">\${items}</div>
            </div>\`;
    }`;

const replacement = `    if (capacityPanel && state.recipes.length > 0) {
        const items = state.recipes.map(r => {
            const cap = calcProductionCapacity(r);
            const color = cap === 0 ? 'var(--color-danger)' : cap < 3 ? '#f59e0b' : 'var(--color-success)';
            return \`<div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:var(--color-surface);border-radius:12px;border:1px solid #e2e8f0; min-width: 260px; box-shadow: 0 1px 2px rgba(0,0,0,0.02);">
                <span style="font-size:20px; background: #f8fafc; padding: 6px; border-radius: 8px;">🎂</span>
                <div>
                    <div style="font-weight:600;font-size:13px;color:var(--color-text-main); margin-bottom:2px;">\${r.name}</div>
                    <div style="font-size:12px;color:\${color};font-weight:700;">\${cap === 0 ? 'Estoque insuficiente' : \`Rende \${cap} unidade\${cap > 1 ? 's' : ''}\`}</div>
                </div>
            </div>\`;
        }).join('');
        capacityPanel.innerHTML = \`
            <div style="margin-bottom: 24px;">
                <div style="display:flex; align-items:center; gap:6px; margin-bottom:12px;">
                    <span style="font-size:16px;">⚡</span>
                    <h3 style="font-size:14px; font-weight:600; color:var(--color-text-main); margin:0;">Capacidade de Produção Atual</h3>
                </div>
                <div style="display:flex; flex-wrap:nowrap; gap:12px; overflow-x:auto; padding-bottom:8px; scrollbar-width: thin; -webkit-overflow-scrolling: touch;">
                    \${items}
                </div>
            </div>\`;
    }`;

code = code.replace(target, replacement);
fs.writeFileSync('app_v3.js', code);
console.log('Capacity layout fixed.');
