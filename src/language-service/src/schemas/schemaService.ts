import * as path from "path";
import * as fs from "fs";
import { JSONSchema } from "yaml-language-server/out/server/src/languageservice/jsonSchema";
import { HaFileInfo } from "../haConfig/dto";

export type SchemaCollection = Array<{
  uri: string;
  fileMatch?: string[];
  schema?: JSONSchema;
}>;

export class SchemaServiceForIncludes {
  private mappings: Array<PathToSchemaMapping & { schema: JSONSchema }>;

  constructor() {
    const jsonPathMappings = path.join(__dirname, "mappings.json");
    const mappingFileContents = fs.readFileSync(jsonPathMappings, "utf-8");
    this.mappings = JSON.parse(mappingFileContents);
    this.mappings.forEach((mapping) => {
      const jsonPath = path.join(__dirname, "json", mapping.file);
      const filecontents = fs.readFileSync(jsonPath, "utf-8");
      const schema = <JSONSchema>JSON.parse(filecontents);
      mapping.schema = schema;
    });
  }

  public getSchemaContributions(haFiles: HaFileInfo[]): SchemaCollection {
    const results: SchemaCollection = [];

    for (const [sourceFile, sourceFileMapping] of haFiles.entries()) {
      let sourceFileMappingPath = sourceFileMapping.path.replace(
        "homeassistant/packages/",
        ""
      );
      sourceFileMappingPath = sourceFileMappingPath.replace(
        /cards\/cards/g,
        "cards"
      );

      const relatedPathToSchemaMapping = this.mappings.find(
        (x) => x.path === sourceFileMappingPath
      );
      if (relatedPathToSchemaMapping) {
        const id = `http://schemas.home-assistant.io/${relatedPathToSchemaMapping.key}`;
        let relativePath = path.relative(
          process.cwd(),
          haFiles[sourceFile].filename
        );
        relativePath = relativePath.replace("\\", "/");
        const fileass = `**/${encodeURI(relativePath)}`;
        let resultEntry = results.find((x) => x.uri === id);

        if (!resultEntry) {
          resultEntry = {
            uri: id,
            fileMatch: [fileass],
            schema: JSON.parse(
              JSON.stringify(relatedPathToSchemaMapping.schema)
            ),
          };
          results.push(resultEntry);
        } else if (resultEntry.fileMatch !== undefined) {
          resultEntry.fileMatch.push(fileass);
        }
      }
    }
    return results;
  }
}

export interface PathToSchemaMapping {
  key: string;
  path: string;
  file: string;
  tsFile: string;
  fromType: string;
}
