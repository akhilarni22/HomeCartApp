import * as rudderanalytics from 'rudder-sdk-js';

const WRITE_KEY = process.env.REACT_APP_RUDDER_WRITE_KEY || '';
const DATA_PLANE_URL =
  process.env.REACT_APP_RUDDER_DATA_PLANE_URL || 'https://hosted.rudderlabs.com';

if (WRITE_KEY) {
  rudderanalytics.load(WRITE_KEY, DATA_PLANE_URL, { logLevel: 'ERROR' });
} else {
  // eslint-disable-next-line no-console
  console.warn(
    '[Analytics] REACT_APP_RUDDER_WRITE_KEY is not set — RudderStack tracking disabled.'
  );
}

export default rudderanalytics;
