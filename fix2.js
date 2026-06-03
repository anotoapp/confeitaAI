const fs = require('fs');
let code = fs.readFileSync('index.html', 'utf8');

// 1. Add LGPD to setup form
code = code.replace(
    '<div id="setup-error-msg" style="display: none; color: var(--color-danger); font-size: 12px; font-weight: 600; margin-bottom: 14px; text-align: center; padding: 8px; background: var(--color-danger-light); border-radius: var(--border-radius-sm);">\r\n                    </div>\r\n                    <button type="submit" class="btn btn-primary btn-block"',
    `<div id="setup-error-msg" style="display: none; color: var(--color-danger); font-size: 12px; font-weight: 600; margin-bottom: 14px; text-align: center; padding: 8px; background: var(--color-danger-light); border-radius: var(--border-radius-sm);">\r\n                    </div>\r\n                    <div style="font-size: 11px; color: var(--color-text-muted); margin-bottom: 15px; text-align: center; line-height: 1.4;">\r\n                        Ao criar sua conta, você concorda com nossos Termos de Uso e <br> <a href="privacidade.html" target="_blank" style="color: var(--color-primary); font-weight: 600;">Política de Privacidade (LGPD)</a>.\r\n                    </div>\r\n                    <button type="submit" class="btn btn-primary btn-block"`
);

// 2. Add LGPD to phone checkout
code = code.replace(
    '<div class="phone-cart-footer" id="phone-cart-footer-actions">\r\n                        <button type="button" class="phone-btn-checkout" id="btn-phone-submit-order">\r\n                            Confirmar Encomenda ✨\r\n                        </button>\r\n                    </div>',
    `<div class="phone-cart-footer" id="phone-cart-footer-actions">\r\n                        <button type="button" class="phone-btn-checkout" id="btn-phone-submit-order">\r\n                            Confirmar Encomenda ✨\r\n                        </button>\r\n                        <div style="font-size: 10px; color: #64748b; text-align: center; margin-top: 12px; line-height: 1.4;">\r\n                            Seus dados estão seguros e protegidos conforme a LGPD e nossa <a href="privacidade.html" target="_blank" style="color: #ff7eb9; text-decoration: none; font-weight: 500;">Política de Privacidade</a>.\r\n                        </div>\r\n                    </div>`
);

// 3. Bump css version
code = code.replace(
    '<link rel="stylesheet" href="style.css">',
    '<link rel="stylesheet" href="style.css?v=20260526_2148">'
);

// 4. Bump js version
code = code.replace(
    '<script src="app_v3.js?v=20260521_1840"></script>',
    '<script src="app_v3.js?v=20260526_2148"></script>'
);

fs.writeFileSync('index.html', code);
console.log('Fixed index.html');
