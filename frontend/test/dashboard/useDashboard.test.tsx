import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useDashboard } from '../../src/features/dashboard/hooks/useDashboard';

const robotApiMocks = vi.hoisted(() => ({
  getStatus: vi.fn(),
  getMap: vi.fn(),
  getSensors: vi.fn(),
  getCommandAuditLogs: vi.fn(),
  getStatusAuditLogs: vi.fn(),
  moveRobot: vi.fn(),
  resetRobot: vi.fn(),
  getTelemetrySocketUrl: vi.fn(),
}));

vi.mock('../../src/lib/api/robotApi', () => ({
  getStatus: robotApiMocks.getStatus,
  getMap: robotApiMocks.getMap,
  getSensors: robotApiMocks.getSensors,
  getCommandAuditLogs: robotApiMocks.getCommandAuditLogs,
  getStatusAuditLogs: robotApiMocks.getStatusAuditLogs,
  moveRobot: robotApiMocks.moveRobot,
  resetRobot: robotApiMocks.resetRobot,
  getTelemetrySocketUrl: robotApiMocks.getTelemetrySocketUrl,
}));

class MockWebSocket {
  static instances: MockWebSocket[] = [];

  static reset() {
    MockWebSocket.instances = [];
  }

  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;

  readyState = MockWebSocket.CONNECTING;
  onopen: (() => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: (() => void) | null = null;
  onclose: (() => void) | null = null;

  constructor(public url: string) {
    MockWebSocket.instances.push(this);
  }

  open() {
    this.readyState = MockWebSocket.OPEN;
    this.onopen?.();
  }

  message(data: string) {
    this.onmessage?.({ data } as MessageEvent);
  }

  error() {
    this.onerror?.();
  }

  close() {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.();
  }
}

describe('useDashboard', () => {
  beforeEach(() => {
    MockWebSocket.reset();
    vi.stubGlobal('WebSocket', MockWebSocket);
    robotApiMocks.getTelemetrySocketUrl.mockReturnValue('ws://localhost:4000/ws/telemetry?token=test');
    robotApiMocks.getStatus.mockResolvedValue({
      id: 'robot-1',
      position: { x: 1, y: 2 },
      battery: 90,
      status: 'IDLE',
    });
    robotApiMocks.getMap.mockResolvedValue({
      width: 3,
      height: 3,
      grid: [
        [0, 0, 0],
        [0, 1, 0],
        [0, 0, 0],
      ],
    });
    robotApiMocks.getSensors.mockResolvedValue({
      N: 1,
      S: 2,
      E: 3,
      W: 4,
      lidar: [1, 2, 3],
    });
    robotApiMocks.getCommandAuditLogs.mockResolvedValue({ items: [] });
    robotApiMocks.getStatusAuditLogs.mockResolvedValue({ items: [] });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('loads robot status, sensors, map, and audit history on startup', async () => {
    const { result } = renderHook(() => useDashboard());

    await waitFor(() => expect(result.current.status?.id).toBe('robot-1'));
    expect(result.current.map?.width).toBe(3);
    expect(result.current.sensors?.lidar).toHaveLength(3);
    expect(robotApiMocks.getCommandAuditLogs).toHaveBeenCalled();
    expect(robotApiMocks.getStatusAuditLogs).toHaveBeenCalled();
  });

  it('updates telemetry state and payload from the websocket stream', async () => {
    const { result } = renderHook(() => useDashboard());

    await waitFor(() => expect(MockWebSocket.instances).toHaveLength(1));

    const socket = MockWebSocket.instances[0];

    act(() => {
      socket.open();
      socket.message(JSON.stringify({ heading: 180, speed: 0.5 }));
    });

    await waitFor(() => expect(result.current.telemetryState).toBe('Live'));
    expect(result.current.telemetryPacketCount).toBe(1);
    expect(result.current.telemetry).toEqual({ heading: 180, speed: 0.5 });
  });

  it('enters reconnecting mode when the telemetry websocket closes after receiving data', async () => {
    const { result } = renderHook(() => useDashboard());

    await waitFor(() => expect(MockWebSocket.instances).toHaveLength(1));

    const socket = MockWebSocket.instances[0];

    act(() => {
      socket.open();
      socket.message(JSON.stringify({ heading: 180 }));
      socket.close();
    });

    await waitFor(() => expect(result.current.telemetryState).toBe('Reconnecting...'));
    expect(result.current.telemetryReconnectAttempt).toBe(1);
  });
});
