export interface RunOptions {
  env?: Record<string, string | undefined>;
}

export async function run(
  cmd: string,
  args: string[] = [],
  cwd?: string,
  options?: RunOptions,
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const proc = Bun.spawn([cmd, ...args], {
    cwd,
    stderr: 'pipe',
    stdout: 'pipe',
    env: options?.env as Record<string, string> | undefined,
  });

  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  const exitCode = await proc.exited;

  return { stdout: stdout.trim(), stderr: stderr.trim(), exitCode };
}

export async function runInteractive(cmd: string, args: string[] = [], cwd?: string, options?: RunOptions): Promise<number> {
  const proc = Bun.spawn([cmd, ...args], {
    cwd,
    stdin: 'inherit',
    stdout: 'inherit',
    stderr: 'inherit',
    env: options?.env as Record<string, string> | undefined,
  });

  return await proc.exited;
}
