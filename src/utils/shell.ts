export async function run(cmd: string, args: string[] = [], cwd?: string): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const process = Bun.spawn([cmd, ...args], {
    cwd,
    stderr: "pipe",
    stdout: "pipe",
  });

  const stdout = await new Response(process.stdout).text();
  const stderr = await new Response(process.stderr).text();
  const exitCode = await process.exited;

  return { stdout: stdout.trim(), stderr: stderr.trim(), exitCode };
}

export async function runInteractive(cmd: string, args: string[] = [], cwd?: string): Promise<number> {
  const process = Bun.spawn([cmd, ...args], {
    cwd,
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  });

  return await process.exited;
}
