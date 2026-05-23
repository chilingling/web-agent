import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import test from 'node:test';
import type { ChildProcessWithoutNullStreams } from 'node:child_process';
import type { AddressInfo, Server } from 'node:net';

const host = '127.0.0.1';

async function listen(server: Server, port: number, host: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      server.off('error', onError);
      server.off('listening', onListening);
    };
    const onError = (error: Error) => {
      cleanup();
      reject(error);
    };
    const onListening = () => {
      cleanup();
      resolve();
    };

    server.once('error', onError);
    server.once('listening', onListening);
    server.listen(port, host);
  });
}

async function closeServer(server: Server | undefined): Promise<void> {
  if (!server?.listening) {
    return;
  }

  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

async function canListen(port: number): Promise<boolean> {
  const probe = createServer();

  try {
    await listen(probe, port, host);
    return true;
  } catch {
    return false;
  } finally {
    await closeServer(probe);
  }
}

async function reservePortWithFreeNext(): Promise<{ blocker: Server; occupiedPort: number }> {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const blocker = createServer();
    await listen(blocker, 0, host);

    const occupiedPort = (blocker.address() as AddressInfo).port;
    if (occupiedPort < 65535 && (await canListen(occupiedPort + 1))) {
      return { blocker, occupiedPort };
    }

    await closeServer(blocker);
  }

  throw new Error('无法找到相邻可用端口用于测试');
}

function waitForStartup(child: ChildProcessWithoutNullStreams, expectedPort: number): Promise<string> {
  let output = '';

  return new Promise<string>((resolve, reject) => {
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error(`服务未在预期端口启动：${expectedPort}\n${output}`));
    }, 10_000);

    const cleanup = () => {
      clearTimeout(timeout);
      child.off('exit', onExit);
      child.off('error', onError);
      child.stdout.off('data', onData);
      child.stderr.off('data', onData);
    };
    const onError = (error: Error) => {
      cleanup();
      reject(error);
    };
    const onExit = (code: number | null, signal: NodeJS.Signals | null) => {
      cleanup();
      reject(new Error(`服务提前退出：code=${code ?? 'null'} signal=${signal ?? 'null'}\n${output}`));
    };
    const onData = (chunk: Buffer) => {
      output += chunk.toString();

      if (output.includes(`WebAgent server started on ${host}:${expectedPort}`)) {
        cleanup();
        resolve(output);
      }
    };

    child.once('error', onError);
    child.once('exit', onExit);
    child.stdout.on('data', onData);
    child.stderr.on('data', onData);
  });
}

async function stopChild(child: ChildProcessWithoutNullStreams | undefined): Promise<void> {
  if (!child || child.exitCode !== null || child.signalCode !== null) {
    return;
  }

  await new Promise<void>((resolve) => {
    const forceKill = setTimeout(() => {
      child.kill('SIGKILL');
    }, 2_000);

    child.once('exit', () => {
      clearTimeout(forceKill);
      resolve();
    });
    child.kill('SIGTERM');
  });
}

test('服务端口被占用时自动使用之后的第一个可用端口', async (t) => {
  const { blocker, occupiedPort } = await reservePortWithFreeNext();
  const child = spawn('pnpm', ['exec', 'tsx', 'src/server.ts'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      AGENT_HOST: host,
      AGENT_PORT: String(occupiedPort),
    },
  });

  t.after(async () => {
    await stopChild(child);
    await closeServer(blocker);
  });

  const output = await waitForStartup(child, occupiedPort + 1);

  assert.match(output, new RegExp(`Configured port ${occupiedPort} is in use, using ${occupiedPort + 1} instead`));
});
