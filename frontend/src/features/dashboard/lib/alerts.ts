import type { RobotStatusResponse } from '../../../types/robot';

export type DashboardAlertTone = 'info' | 'warning' | 'critical';

export type DashboardAlert = {
  title: string;
  message: string;
  tone: DashboardAlertTone;
};

type BuildDashboardAlertsInput = {
  error: string | null;
  loading: boolean;
  busy: boolean;
  backendStatus: 'syncing' | 'healthy' | 'degraded' | 'unavailable';
  backendIssueMessage: string | null;
  telemetryState: string;
  telemetryStatus: 'connecting' | 'live' | 'reconnecting' | 'signal_lost' | 'unavailable';
  telemetryIssueMessage: string | null;
  telemetryReconnectAttempt: number;
  status: RobotStatusResponse | null;
};

export const buildDashboardAlerts = ({
  error,
  loading,
  busy,
  backendStatus,
  backendIssueMessage,
  telemetryState,
  telemetryStatus,
  telemetryIssueMessage,
  telemetryReconnectAttempt,
  status,
}: BuildDashboardAlertsInput): DashboardAlert[] => {
  const alerts: DashboardAlert[] = [];

  if (error) {
    alerts.push({
      title: 'Backend response issue',
      message: error,
      tone: 'critical',
    });
  }

  if (loading) {
    alerts.push({
      title: 'Sync in progress',
      message: 'Ground control is refreshing robot state from the backend.',
      tone: 'info',
    });
  }

  if (backendStatus === 'unavailable') {
    alerts.push({
      title: 'Backend unavailable',
      message: backendIssueMessage ?? 'The backend API is currently unreachable.',
      tone: 'critical',
    });
  }

  if (backendStatus === 'degraded') {
    alerts.push({
      title: 'Backend degraded',
      message: backendIssueMessage ?? 'The simulator or backend is responding slowly.',
      tone: 'warning',
    });
  }

  if (busy) {
    alerts.push({
      title: 'Command executing',
      message: 'A robot command is being sent. Control inputs are temporarily locked.',
      tone: 'info',
    });
  }

  if (telemetryStatus === 'reconnecting') {
    alerts.push({
      title: 'Telemetry reconnecting',
      message: `Attempt ${telemetryReconnectAttempt}: re-establishing the websocket stream.`,
      tone: 'warning',
    });
  }

  if (telemetryStatus === 'signal_lost') {
    alerts.push({
      title: 'Telemetry signal lost',
      message: telemetryIssueMessage ?? 'No telemetry packets have arrived recently. A reconnect is in progress.',
      tone: 'critical',
    });
  }

  if (telemetryStatus === 'unavailable') {
    alerts.push({
      title: 'Telemetry unavailable',
      message: telemetryIssueMessage ?? `Telemetry stream is currently ${telemetryState.toLowerCase()}.`,
      tone: 'critical',
    });
  }

  if (telemetryStatus === 'connecting') {
    alerts.push({
      title: 'Telemetry connecting',
      message: 'Waiting for the initial websocket telemetry stream to open.',
      tone: 'info',
    });
  }

  if (status?.battery !== undefined && status.battery < 25) {
    alerts.push({
      title: 'Low battery reserve',
      message: `Battery is at ${status.battery.toFixed(1)}%. Consider reset or return-to-safe-state flow.`,
      tone: status.battery < 10 ? 'critical' : 'warning',
    });
  }

  if (status?.status === 'STUCK') {
    alerts.push({
      title: 'Robot movement blocked',
      message: 'The simulator reports the robot is stuck and may need operator intervention.',
      tone: 'critical',
    });
  }

  if (status?.status === 'LOW_BATTERY') {
    alerts.push({
      title: 'Power-saving mode active',
      message: 'Robot entered low battery mode and may reject some commands.',
      tone: 'warning',
    });
  }

  return alerts;
};
