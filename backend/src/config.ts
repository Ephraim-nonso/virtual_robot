import 'dotenv/config';

const portValue = Number.parseInt(process.env.PORT ?? '4000', 10);

export const config = {
  port: Number.isNaN(portValue) ? 4000 : portValue,
  robotSimUrl: (process.env.ROBOT_SIM_URL ?? 'http://127.0.0.1:5001').replace(/\/$/, ''),
};
