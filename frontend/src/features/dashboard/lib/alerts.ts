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
  telemetryState: string;
  status: RobotStatusResponse | null;
};

export const buildDashboardAlerts = ({
  error,
  loading,
  busy,
  telemetryState,
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

  if (busy) {
    alerts.push({
      title: 'Command executing',
      message: 'A robot command is being sent. Control inputs are temporarily locked.',
      tone: 'info',
    });
  }

  if (telemetryState !== 'Live') {
    alerts.push({
      title: 'Telemetry degraded',
      message: `Telemetry stream is currently ${telemetryState.toLowerCase()}.`,
      tone: telemetryState === 'Unavailable' ? 'critical' : 'warning',
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
