const fs = require('fs');

const filesToFix = [
  {
    file: 'app/clinicDash/features/staff/staffIdentity.ts',
    replacements: [
      { from: 'return typeof numeric === "number" && Number.isInteger(numeric) && numeric > 0', to: 'return !!numeric' }
    ]
  },
  {
    file: 'app/clinicDash/pending/page.tsx',
    replacements: [
      { from: 'if (!Number.isInteger(id) || id <= 0) {', to: 'if (!id) {' }
    ]
  },
  {
    file: 'app/clinicDash/staff/page.tsx',
    replacements: [
      { from: 'if (!Number.isInteger(id) || id <= 0) {', to: 'if (!id) {' }
    ]
  },
  {
    file: 'app/clinicDash/page.tsx',
    replacements: [
      { from: 'if (!Number.isInteger(id) || id <= 0) throw new Error("Invalid staff ID");', to: 'if (!id) throw new Error("Invalid staff ID");' }
    ]
  }
];

filesToFix.forEach(({ file, replacements }) => {
  try {
    let content = fs.readFileSync(file, 'utf8');
    replacements.forEach(({ from, to }) => {
      content = content.replace(new RegExp(from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), to);
    });
    fs.writeFileSync(file, content);
    console.log(`Fixed ${file}`);
  } catch (err) {
    console.error(`Error fixing ${file}:`, err.message);
  }
});
