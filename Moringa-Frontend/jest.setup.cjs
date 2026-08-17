require('@testing-library/jest-dom');

jest.mock('next/image', () => {
  const React = require('react');

  function NextImage({ src, alt, width, height, ...rest }) {
    return React.createElement('img', {
      src,
      alt,
      width,
      height,
      ...rest,
    });
  }

  NextImage.displayName = 'NextImage';

  return NextImage;
});
