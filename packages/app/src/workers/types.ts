export type CompilerError = {
  fileName?: string;
  lineNumber?: number;
  columnNumber?: number;
  message: string;
};
export type CompilerOutput = {
  dts?: string;
  js?: string;
  sourceMap?: string;
  errors: CompilerError[];
};
