import { render, type RenderOptions } from '@builder.io/qwik-city';
import { manifest } from '@qwik-client-manifest';
import Root from './root';

export default render(async (request, response) => {
  const options: RenderOptions = {
    ...response,
    ...request,
    manifest,
  };

  return render(options, <Root />);
});
