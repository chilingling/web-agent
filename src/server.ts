import type { Server } from 'node:http';
import type { Application } from 'express';
import { detect } from 'detect-port';
import { logger } from './Logger';
import { createApp } from './app';
import { config } from './config';

interface ListenResult {
  server: Server;
  port: number;
}

function isAddressInUseError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && (error as NodeJS.ErrnoException).code === 'EADDRINUSE';
}

function listenOnce(app: Application, port: number, host: string): Promise<Server> {
  return new Promise<Server>((resolve, reject) => {
    const onError = (error: NodeJS.ErrnoException) => {
      server.off('error', onError);
      reject(error);
    };

    const server = app.listen(port, host, () => {
      server.off('error', onError);
      resolve(server);
    });
    server.once('error', onError);
  });
}

/**
 * 使用 detect-port 从首选端口开始探测，并启动 HTTP 服务。
 *
 * @param app Express 应用实例。
 * @param host 监听地址。
 * @param preferredPort 首选监听端口。
 * @returns 实际启动的 HTTP server 与端口。
 * @throws 当探测或监听过程遇到非端口占用错误时抛出。
 */
async function listenOnAvailablePort(app: Application, host: string, preferredPort: number): Promise<ListenResult> {
  let port = preferredPort;

  while (port <= 65535) {
    const availablePort = await detect({ port, hostname: host });

    try {
      return {
        server: await listenOnce(app, availablePort, host),
        port: availablePort,
      };
    } catch (error) {
      // 探测与真实监听之间仍可能出现竞争，端口被抢占时继续尝试下一个端口。
      if (isAddressInUseError(error)) {
        port = Math.max(availablePort + 1, port + 1);
        continue;
      }

      throw error;
    }
  }

  throw new Error(`No available port found from ${preferredPort} to 65535`);
}

/**
 * 初始化应用并启动 HTTP 服务。
 *
 * @returns 实际监听的 HTTP server。
 * @throws 初始化或监听失败时记录错误并退出进程，不向调用方返回。
 */
async function startServer() {
  try {
    const application = createApp();
    await application.initialize();

    const app = application.getApp();
    const preferredPort = config.app.port;
    const host = config.app.host;

    const { server, port } = await listenOnAvailablePort(app, host, preferredPort);

    if (port !== preferredPort) {
      logger.warn(`Configured port ${preferredPort} is in use, using ${port} instead`);
    }

    logger.info(`WebAgent server started on ${host}:${port}`);
    logger.info(`Environment: ${config.app.env}`);

    // 如果是 PM2 启动，发送 ready 信号
    if (process.send) {
      process.send('ready');
    }

    // Graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received, shutting down gracefully');
      server.close(() => {
        logger.info('Process terminated');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      logger.info('SIGINT received, shutting down gracefully');
      server.close(() => {
        logger.info('Process terminated');
        process.exit(0);
      });
    });

    return server;
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start server if this file is run directly
if (require.main === module) {
  startServer();
}

export { startServer };
