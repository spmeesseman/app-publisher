export const fields: {
  author: {
    date: {
      key: string;
      type: Function;
    };
    email: string;
    name: string;
  };
  body: string;
  commit: {
    long: string;
    short: string;
  };
  committer: {
    date: {
      key: string;
      type: Function;
    };
    email: string;
    name: string;
  };
  subject: string;
  tree: {
    long: string;
    short: string;
  };
};
export function parse(config: any, options: any): any;
