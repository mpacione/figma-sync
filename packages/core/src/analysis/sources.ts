export interface SourceFile {
  filePath: string;
  content: string;
}

export interface CssSourceFile extends SourceFile {}

export interface ComponentSourceFile extends SourceFile {}

export interface ScreenSourceFile extends SourceFile {}

