const fs = require('fs');
let content = fs.readFileSync('components/GuardDashboard.tsx', 'utf8');

const target1 = `        \`*Tiempo Total:* \${totalMinutes} minutos\\n\` +
        \`*Tarifa Aplicada:* \${completedSession.rate?.name || "N/A"}\\n\` +`;
const replacement1 = `        \`*Tiempo Total:* \${totalMinutes} minutos\\n\` +`;

content = content.replace(target1, replacement1);

const target2 = `                  <div className="flex justify-between">
                    <span>Tarifa:</span>
                    <span className="truncate max-w-[150px] text-right">
                      {completedSession.rate?.name || "N/A"}
                    </span>
                  </div>`;
const replacement2 = ``;

content = content.replace(target2, replacement2);

fs.writeFileSync('components/GuardDashboard.tsx', content);
