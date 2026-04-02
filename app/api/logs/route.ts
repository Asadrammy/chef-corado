import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logger } from '@/lib/logger';

interface LogEntry {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  requestId?: string;
  userId?: string;
  route?: string;
  status?: number;
  duration?: number;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  metadata?: Record<string, any>;
}

// In production, this would write to a persistent service like Logtail, Datadog, etc.
// For now, we'll store in memory with a circular buffer
const logBuffer: LogEntry[] = [];
const MAX_LOGS = 10000;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const log: LogEntry = body;

    // Validate log entry
    if (!log.timestamp || !log.level || !log.message) {
      return NextResponse.json(
        { error: 'Invalid log entry' },
        { status: 400 }
      );
    }

    // Add to buffer
    logBuffer.push(log);

    // Keep buffer size manageable
    if (logBuffer.length > MAX_LOGS) {
      logBuffer.shift();
    }

    // In production, send to external logging service
    if (process.env.NODE_ENV === 'production') {
      // Example: Send to Logtail
      if (process.env.LOGTAIL_TOKEN) {
        await fetch('https://in.logtail.com/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.LOGTAIL_TOKEN}`,
          },
          body: JSON.stringify(log),
        }).catch(() => {
          // Silently fail
        });
      }

      // Example: Send to Datadog
      if (process.env.DATADOG_API_KEY) {
        await fetch('https://http-intake.logs.datadoghq.com/v1/input', {
          method: 'POST',
          headers: {
            'DD-API-KEY': process.env.DATADOG_API_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(log),
        }).catch(() => {
          // Silently fail
        });
      }
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    logger.error('Error processing log entry', error);
    return NextResponse.json(
      { error: 'Failed to process log' },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve logs (admin only)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // Only admins can view logs
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const level = searchParams.get('level');
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 1000);
    const offset = parseInt(searchParams.get('offset') || '0');

    let filtered = logBuffer;

    if (level) {
      filtered = filtered.filter((log) => log.level === level);
    }

    // Return paginated results
    const results = filtered.slice(-offset - limit, -offset || undefined).reverse();

    return NextResponse.json({
      logs: results,
      total: filtered.length,
      limit,
      offset,
    });
  } catch (error) {
    logger.error('Error retrieving logs', error);
    return NextResponse.json(
      { error: 'Failed to retrieve logs' },
      { status: 500 }
    );
  }
}
