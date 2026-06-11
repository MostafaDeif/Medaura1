const fs = require('fs');

const filesToFix = [
  {
    file: 'app/dashboard/pages/doctors/requests/page.tsx',
    replacements: [
      { from: 'doctor_id: number;', to: 'doctor_id: number | string;' },
      { from: 'user_id?: number;', to: 'user_id?: number | string;' },
      { from: 'id?: number;', to: 'id?: number | string;' },
      { from: 'doctor_id: Number(doctor.doctor_id ?? doctor.id),', to: 'doctor_id: doctor.doctor_id ?? doctor.id ?? "",' }
    ]
  },
  {
    file: 'app/dashboard/pages/staff/page.tsx',
    replacements: [
      { from: 'admin_id: number;', to: 'admin_id: number | string;' },
      { from: 'user_id?: number;', to: 'user_id?: number | string;' },
      { from: 'id?: number;', to: 'id?: number | string;' },
      { from: 'admin_id: Number(r.admin_id ?? r.id ?? 0),', to: 'admin_id: r.admin_id ?? r.id ?? "",' },
      { from: 'user_id: Number(r.user_id ?? r.id ?? 0),', to: 'user_id: r.user_id ?? r.id ?? "",' }
    ]
  },
  {
    file: 'app/(site)/clinics/page.tsx',
    replacements: [
      { from: 'const clinicId = toNumber(clinic.clinic_id ?? clinic.id, index + 1);', to: 'const clinicId = clinic.clinic_id ?? clinic.id ?? index + 1;' }
    ]
  },
  {
    file: 'app/(site)/clinics/[id]/page.tsx',
    replacements: [
      { from: 'const clinicId = Number(params.id);', to: 'const clinicId = params.id;' }
    ]
  },
  {
    file: 'app/(site)/doctors/[id]/page.tsx',
    replacements: [
      { from: 'const doctorId = Number(params.id);', to: 'const doctorId = params.id;' },
      { from: 'rating_id: Number(entry.rating_id ?? entry.id ?? index + 1),', to: 'rating_id: entry.rating_id ?? entry.id ?? index + 1,' }
    ]
  },
  {
    file: 'app/api/admin/clinics/route.ts',
    replacements: [
      { from: 'const clinicId = Number(id);', to: 'const clinicId = id;' }
    ]
  },
  {
    file: 'app/clinicDash/features/staff/staffIdentity.ts',
    replacements: [
      { from: 'const numeric = typeof value === "string" ? Number(value) : value;', to: 'const numeric = value;' }
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
