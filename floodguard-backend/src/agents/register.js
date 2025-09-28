import { registerAgent } from '../a2a/bus.js';
import { A1_WeatherIngest } from './A1_weather.js';
import { A2_DrainGrid } from './A2_drain_grid.js';
import { A3_Social } from './A3_social.js';
import { A4_RiskFusion } from './A4_risk_fusion.js';
import { A6_Comms } from './A6_comms.js';

export function registerAllAgents() {
  registerAgent('A1', async (payload) => A1_WeatherIngest.run({}, { params: payload?.params }));
  registerAgent('A2', async (payload) => A2_DrainGrid.run({}, { params: payload?.params }));
  registerAgent('A3', async (payload) => A3_Social.run({}, { params: payload?.params }));
  registerAgent('A4', async (payload) => A4_RiskFusion.run(payload, { params: payload?.params })); // expects weather/incidents/social
  registerAgent('A6', async (payload) => A6_Comms.run(payload, { params: payload?.params }));      // expects scores
}
