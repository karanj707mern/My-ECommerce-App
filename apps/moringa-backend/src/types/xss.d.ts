declare module 'xss' {
  interface IFilterXSSOptions {
    whiteList?: Record<string, string[]>;
    stripIgnoreTag?: boolean;
    stripIgnoreTagBody?: string[];
    allowCommentTag?: boolean;
    css?: boolean | Record<string, unknown>;
  }

  class FilterXSS {
    constructor(options?: IFilterXSSOptions);
    process(value: string): string;
  }

  function xss(value: string, options?: IFilterXSSOptions): string;

  export = xss;
}
