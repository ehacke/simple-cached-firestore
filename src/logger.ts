import bunyan from 'bunyan';
import PrettyStream from 'bunyan-prettystream';

import pjson from '../package.json';

// eslint-disable-next-line no-process-env
const logLevel = process.env.LOG_LEVEL || 'info';

// eslint-disable-next-line no-process-env
const showColors = process.env.LOG_COLORS === 'true';

const prettyStdOut = new PrettyStream({ mode: 'dev', useColor: showColors });
prettyStdOut.pipe(process.stdout);
export default bunyan.createLogger({
  name: pjson.name.replace(/^@[\d-AZa-z-]+\//g, ''),
  streams: [
    {
      type: 'raw',
      level: logLevel,
      stream: prettyStdOut,
    },
  ],
});
