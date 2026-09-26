import { createApp } from './app';
import { PORT, DEMO_REPO_PATH } from './config';

const app = createApp();

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`WhyBroke server listening on http://localhost:${PORT}`);
  // eslint-disable-next-line no-console
  console.log(`Demo repository: ${DEMO_REPO_PATH}`);
});
