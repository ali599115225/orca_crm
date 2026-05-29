const fs = require('fs');
const path = require('path');
const files = [
  'app/actions/agentSlots.ts',
  'app/actions/auth.ts',
  'app/actions/contract.ts',
  'app/actions/leads.ts',
  'app/actions/onboarding.ts',
  'app/actions/sanadAgent.ts',
  'app/components/SovereignSidebar.tsx',
  'app/login/LoginForm.tsx',
  'app/operations/onboarding/OnboardingForm.tsx',
  'app/operations/onboarding/page.tsx',
  'app/register/RegisterForm.tsx',
  'proxy.ts',
  'middleware.ts'
];

files.forEach(f => {
  const p = path.join(process.cwd(), f);
  if (fs.existsSync(p)) {
    let content = fs.readFileSync(p, 'utf8');
    content = content.replace(/\/operations\/analytics/g, '/operations');
    fs.writeFileSync(p, content);
    console.log('Updated ' + f);
  }
});
