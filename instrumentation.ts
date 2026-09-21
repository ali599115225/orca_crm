export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  const { validateStartupSecrets } = await import(
    './lib/startup-validation'
  );

  validateStartupSecrets();
}
