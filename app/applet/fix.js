const fs = require('fs');
let content = fs.readFileSync('components/GuardDashboard.tsx', 'utf8');
content = content.replace('querySelectorAll("style, link[rel="stylesheet"]")', 'querySelectorAll("style, link[rel=\'stylesheet\']")');
fs.writeFileSync('components/GuardDashboard.tsx', content);
