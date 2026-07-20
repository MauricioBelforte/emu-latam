import fs from "fs"

export interface DepItem {
  name: string
  path: string
}

export interface DepResult {
  name: string
  path: string
  exists: boolean
}

export function validateBinaries(deps: DepItem[]): DepResult[] {
  return deps.map((d) => ({
    name: d.name,
    path: d.path,
    exists: fs.existsSync(d.path),
  }))
}

export function validateFile(filePath: string): boolean {
  return fs.existsSync(filePath)
}
