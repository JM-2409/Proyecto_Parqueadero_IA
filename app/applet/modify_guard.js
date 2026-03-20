const fs = require('fs');
let content = fs.readFileSync('components/GuardDashboard.tsx', 'utf8');

// Add state
content = content.replace(
  'const [whatsappNumber, setWhatsappNumber] = useState("");',
  'const [whatsappNumber, setWhatsappNumber] = useState("");\n  const [whatsappCountryCode, setWhatsappCountryCode] = useState("+57");'
);

// Update handleWhatsAppShare
content = content.replace(
  '`https://wa.me/${whatsappNumber}?text=${encodedMessage}`',
  '`https://wa.me/${whatsappCountryCode.replace("+", "")}${whatsappNumber}?text=${encodedMessage}`'
);

// Update UI
content = content.replace(
  '<input\n                      type="tel"\n                      placeholder="Número (ej. 573001234567)"\n                      value={whatsappNumber}\n                      onChange={(e) => setWhatsappNumber(e.target.value)}\n                      className="flex-1 px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"\n                    />',
  `<div className="flex w-full gap-2">
                      <input
                        type="text"
                        value={whatsappCountryCode}
                        onChange={(e) => setWhatsappCountryCode(e.target.value)}
                        className="w-16 px-2 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-center"
                        placeholder="+57"
                      />
                      <input
                        type="tel"
                        placeholder="Número"
                        value={whatsappNumber}
                        onChange={(e) => setWhatsappNumber(e.target.value)}
                        className="flex-1 px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>`
);

fs.writeFileSync('components/GuardDashboard.tsx', content);
