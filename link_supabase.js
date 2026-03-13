const { execSync } = require('child_process');
try {
  execSync('npx -y supabase@latest link --project-ref rjazltihisvxosyzohuy', {
    env: { ...process.env, SUPABASE_ACCESS_TOKEN: 'sbp_2a3365320806f496cafb233002ec3dd75766e6b2' },
    stdio: 'inherit'
  });
} catch (e) {
  console.error(e);
}
